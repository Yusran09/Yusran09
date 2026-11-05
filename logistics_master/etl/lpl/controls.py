"""
Exception register (MAPPING_ISSUES) and data-quality / reconciliation checks.

Every rule only *reports*; no source value is corrected here.
"""

import re
import unicodedata
from collections import Counter, defaultdict

from .mapping import compare_attrs
from .normalize import equipment_tokens, h, series_key

SEV_ORDER = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}

# Reference figures quoted in the assignment brief (previous processing attempt).
REFERENCE_FIGURES = dict(summary_packages=1151, detail_blocks=1163, material_items=17140,
                         exact_matches=1150, candidate_mappings=11, unmatched_detail=2)


class IssueLog:
    def __init__(self, docs):
        self.rows = []
        self.docs = docs
        self._seen = set()

    def add(self, rule_id, issue_type, severity, scope, description, *, subtype=None, doc_id=None,
            batch_id=None, category=None, package_number=None, package_id=None, detail_package_id=None,
            item_id=None, sheet=None, row=None, original=None, comparison=None, resolution=None,
            status="OPEN", key=None):
        k = (rule_id, subtype, key or (package_id, detail_package_id, item_id, doc_id, sheet, row, package_number))
        if k in self._seen:
            return
        self._seen.add(k)
        d = self.docs.get(doc_id) if doc_id else None
        self.rows.append(dict(
            issue_id=f"ISS-{h(*map(str, k), n=12)}", rule_id=rule_id, issue_type=issue_type,
            issue_subtype=subtype, severity=severity, issue_scope=scope,
            batch_id=batch_id or (d["batch_id"] if d else None), category=category or (d["category"] if d else None),
            package_number=package_number, package_id=package_id, detail_package_id=detail_package_id,
            item_id=item_id, source_document_id=doc_id, source_document=d["source_document_name"] if d else None,
            source_sheet=sheet, source_row=row, original_value=None if original is None else str(original),
            comparison_value=None if comparison is None else str(comparison), description=description,
            proposed_resolution=resolution, resolution_status=status))

    def sorted_rows(self):
        return sorted(self.rows, key=lambda r: (SEV_ORDER[r["severity"]], r["rule_id"], r["source_document_id"] or "",
                                                r["source_sheet"] or "", r["source_row"] or 0))


def _fmt(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def build_issues(ctx):
    docs, packages, blocks, mappings = ctx["docs"], ctx["packages"], ctx["blocks"], ctx["mappings"]
    L = IssueLog(docs)
    pk_by_id = {p["package_id"]: p for p in packages}
    bl_by_id = {b["detail_package_id"]: b for b in blocks}

    # ---------------- R01/R02 mapping outcomes
    for m in mappings:
        b = bl_by_id.get(m["detail_package_id"]) if m["detail_package_id"] else None
        p = pk_by_id.get(m["package_id"]) if m["package_id"] else None
        st = m["mapping_status"]
        common = dict(doc_id=m["source_document_id"], package_id=p["package_id"] if (p and m["is_linked"]) else None)
        if b:
            common.update(detail_package_id=b["detail_package_id"], sheet=b["source_sheet"], row=b["source_package_row"])
        if st in ("CANDIDATE_MATCH", "MANUAL_REVIEW"):
            L.add("R01", "PACKAGE_NUMBER_MISMATCH", "HIGH", "DETAIL_PACKAGE",
                  f"Detail Package No. '{b['package_number_original']}' does not exist in the Summary. "
                  f"Closest Summary package: '{p['package_number_original']}' ({m['mapping_note']})",
                  subtype="CANDIDATE_ALIAS" if st == "CANDIDATE_MATCH" else "AMBIGUOUS_CANDIDATES",
                  package_number=b["package_number_original"], original=b["package_number_original"],
                  comparison=p["package_number_original"],
                  resolution="Verify physical package marking / shipper confirmation. If the same package, add a "
                             "CONFIRMED_ALIAS row to config/mapping_overrides.csv; otherwise add REJECTED and request a "
                             "corrected packing list.", **common)
        elif st == "UNMATCHED_DETAIL":
            L.add("R01", "DETAIL_WITHOUT_SUMMARY", "HIGH", "DETAIL_PACKAGE",
                  f"Detail block '{b['package_number_original']}' has no Summary package and no candidate.",
                  package_number=b["package_number_original"], original=b["package_number_original"],
                  resolution="Confirm whether the package was shipped; request Summary correction.", **common)
        elif st == "SPLIT_PACKAGE":
            L.add("R01", "SPLIT_PACKAGE", "INFO", "DETAIL_PACKAGE",
                  f"Detail block '{b['package_number_original']}' is a sub-package of Summary package "
                  f"'{p['package_number_original']}' (listed in the parent manifest block).",
                  subtype="SUB_PACKAGE_LINKED", package_number=b["package_number_original"],
                  original=b["package_number_original"], comparison=p["package_number_original"],
                  package_id=p["package_id"], resolution="No correction. Track sub-package marks individually at receiving.",
                  status="ACCEPTED_AS_IS",
                  **{k: v for k, v in common.items() if k != "package_id"})
        elif st == "NORMALIZED_MATCH":
            L.add("R01", "PACKAGE_NUMBER_FORMAT_VARIANT", "LOW", "DETAIL_PACKAGE",
                  "Package numbers equal only after normalisation (case / width / spacing).",
                  package_number=b["package_number_original"], original=b["package_number_original"],
                  comparison=p["package_number_original"], resolution="Align spelling in the source documents.", **common)
        elif st == "CONFIRMED_ALIAS":
            L.add("R01", "PACKAGE_NUMBER_MISMATCH", "MEDIUM", "DETAIL_PACKAGE",
                  f"Alias confirmed by review: '{b['package_number_original']}' = '{p['package_number_original']}'.",
                  subtype="CONFIRMED_ALIAS", package_number=b["package_number_original"],
                  original=b["package_number_original"], comparison=p["package_number_original"],
                  resolution="Resolved by manual review (mapping_overrides.csv).", status="RESOLVED", **common)
        elif st == "UNMATCHED_SUMMARY":
            prop = "; ".join(f"{x['package_number_original']} ({x['mapping_status']})" for x in p.get("_proposals", []))
            L.add("R02", "SUMMARY_WITHOUT_DETAIL", "HIGH", "PACKAGE",
                  "Summary package has no linked Detail block." + (f" Proposed counterpart: {prop}." if prop else ""),
                  doc_id=p["source_document_id"], package_id=p["package_id"], sheet=p["source_sheet"],
                  row=p["source_row"], package_number=p["package_number_original"],
                  original=p["package_number_original"], comparison=prop or None,
                  resolution="Review the proposed counterpart (see R01) or obtain the missing detail packing list.")

    # ---------------- R03 duplicates
    for doc_id in docs:
        c = Counter(p["package_number_normalized"] for p in packages if p["source_document_id"] == doc_id)
        for k, n in c.items():
            if n > 1:
                for p in packages:
                    if p["source_document_id"] == doc_id and p["package_number_normalized"] == k:
                        L.add("R03", "DUPLICATE_PACKAGE_NUMBER", "HIGH", "PACKAGE", f"{n} Summary rows share this package number.",
                              subtype="WITHIN_SUMMARY", doc_id=doc_id, package_id=p["package_id"], sheet=p["source_sheet"],
                              row=p["source_row"], package_number=p["package_number_original"], original=n,
                              resolution="Confirm whether these are distinct packages; correct numbering.")
        c = Counter(b["package_number_normalized"] for b in blocks if b["source_document_id"] == doc_id)
        for k, n in c.items():
            if n > 1:
                for b in blocks:
                    if b["source_document_id"] == doc_id and b["package_number_normalized"] == k:
                        L.add("R03", "DUPLICATE_PACKAGE_NUMBER", "HIGH", "DETAIL_PACKAGE", f"{n} Detail blocks share this package number.",
                              subtype="WITHIN_DETAIL", doc_id=doc_id, detail_package_id=b["detail_package_id"],
                              sheet=b["source_sheet"], row=b["source_package_row"],
                              package_number=b["package_number_original"], original=n,
                              resolution="Check for a duplicated block or a split package without suffix.")
    by_norm = defaultdict(set)
    for p in packages:
        by_norm[p["package_number_normalized"]].add(p["source_document_id"])
    for k, ds in by_norm.items():
        if len(ds) > 1:
            for p in packages:
                if p["package_number_normalized"] == k:
                    L.add("R03", "DUPLICATE_PACKAGE_NUMBER", "HIGH", "PACKAGE",
                          f"Package number appears in several workbooks: {', '.join(sorted(ds))}.",
                          subtype="ACROSS_DOCUMENTS", doc_id=p["source_document_id"], package_id=p["package_id"],
                          sheet=p["source_sheet"], row=p["source_row"], package_number=p["package_number_original"],
                          resolution="Confirm whether the package was re-shipped or double-listed.")

    # ---------------- R04 missing identifiers
    for b in blocks:
        if not b.get("package_number_original"):
            L.add("R04", "MISSING_PACKAGE_NUMBER", "HIGH", "DETAIL_PACKAGE", "Detail block without a package number.",
                  doc_id=b["source_document_id"], detail_package_id=b["detail_package_id"], sheet=b["source_sheet"],
                  row=b["source_header_row"], resolution="Obtain the package number from the shipper.")
    for s in ctx["summary_stg"]:
        if s["row_class"] == "OTHER":
            L.add("R04", "MISSING_PACKAGE_NUMBER", "MEDIUM", "PACKAGE",
                  "Summary row with values but no Package No.", doc_id=s["source_document_id"], sheet=s["source_sheet"],
                  row=s["source_row"], original=s["raw_values_json"][:200], resolution="Review the row in the source.")

    # ---------------- R05 invoice mismatch
    for b in blocks:
        d = docs[b["source_document_id"]]
        inv, ref = b.get("invoice_number_original"), d.get("summary_invoice_number")
        if inv == ref:
            continue
        common = dict(doc_id=b["source_document_id"], detail_package_id=b["detail_package_id"],
                      package_id=b.get("package_id"), sheet=b["source_sheet"],
                      row=b["source_block_start_row"], package_number=b["package_number_original"],
                      original=inv, comparison=ref)
        cat = re.match(r"^(P\d+)-", inv or "")
        if not inv:
            L.add("R05", "INVOICE_MISMATCH", "MEDIUM", "DETAIL_PACKAGE", "Detail block header has no Invoice No.",
                  subtype="MISSING", resolution="Request completed detail packing list.", **common)
        elif re.search(r"00X$", inv, re.I) or inv.endswith("-"):
            other = bool(cat and cat.group(1) != d["category"])
            L.add("R05", "INVOICE_MISMATCH", "HIGH" if other else "MEDIUM", "DETAIL_PACKAGE",
                  f"Detail block prints placeholder/incomplete invoice '{inv}' instead of '{ref}'"
                  + (f" (and of category {cat.group(1)} inside a {d['category']} workbook)." if other else "."),
                  subtype="PLACEHOLDER_OTHER_CATEGORY" if other else "PLACEHOLDER",
                  resolution="Treat Summary invoice as governing; request re-issued detail packing list.", **common)
        elif cat and cat.group(1) != d["category"]:
            L.add("R05", "INVOICE_MISMATCH", "HIGH", "DETAIL_PACKAGE",
                  f"Detail block prints invoice of category {cat.group(1)} ('{inv}') inside a {d['category']} workbook.",
                  subtype="CATEGORY", resolution="Confirm customs invoice allocation with shipper.", **common)
        else:
            L.add("R05", "INVOICE_MISMATCH", "MEDIUM", "DETAIL_PACKAGE",
                  f"Detail block prints invoice '{inv}' but the Summary invoice is '{ref}'.",
                  subtype="DIFFERENT_INVOICE", resolution="Confirm which invoice covers the package (carry-over or copy error).",
                  **common)

    # ---------------- R06 attribute consistency (identifier-linked blocks only)
    type_pairs = defaultdict(list)
    for b in blocks:
        if b.get("mapping_status") not in ("EXACT_MATCH", "NORMALIZED_MATCH", "CONFIRMED_ALIAS"):
            continue
        p = pk_by_id[b["package_id"]]
        cmp = compare_attrs(p, b)
        for f, c in cmp.items():
            if c["status"] != "MISMATCH":
                continue
            if f in ("length_mm", "width_mm", "height_mm"):
                t, sev = "DIMENSION_MISMATCH", "MEDIUM"
            elif f == "volume_m3":
                t, sev = "VOLUME_MISMATCH", "LOW" if c["rel"] <= 0.02 else "MEDIUM"
            elif f in ("net_weight_kg", "gross_weight_kg"):
                t, sev = "WEIGHT_MISMATCH", "HIGH" if c["rel"] > 0.10 else "MEDIUM"
            else:
                type_pairs[(b["source_document_id"], p.get("package_type"), b.get("package_type"))].append((p, b))
                continue
            L.add("R06", t, sev, "DETAIL_PACKAGE",
                  f"{f}: Summary {_fmt(c['summary'])} vs Detail {_fmt(c['detail'])}"
                  + (f" (diff {c['diff']:+g}, {c['rel']:.1%})" if 'diff' in c else ""),
                  subtype=f.upper(), doc_id=b["source_document_id"], package_id=p["package_id"],
                  detail_package_id=b["detail_package_id"], sheet=b["source_sheet"], row=b["source_package_row"],
                  package_number=b["package_number_original"], original=_fmt(c["summary"]), comparison=_fmt(c["detail"]),
                  resolution="Confirm against weighing/measurement certificate; Summary and Detail must agree.")

    for (doc_id, st, dt_), pairs in sorted(type_pairs.items(), key=lambda x: (x[0][0], -len(x[1]))):
        p0, b0 = pairs[0]
        L.add("R06", "PACKAGE_TYPE_MISMATCH", "LOW", "DOCUMENT",
              f"{len(pairs)} linked package(s) typed '{st}' in the Summary but '{dt_}' in the Detail list "
              f"(e.g. {', '.join(x[0]['package_number_original'] for x in pairs[:3])}). Per-package comparison in "
              f"PACKAGE_MAPPING.evidence_json.", subtype="SYSTEMATIC" if len(pairs) > 3 else "ISOLATED",
              doc_id=doc_id, sheet=b0["source_sheet"], row=b0["source_package_row"],
              package_number=p0["package_number_original"] if len(pairs) == 1 else None,
              package_id=p0["package_id"] if len(pairs) == 1 else None,
              detail_package_id=b0["detail_package_id"] if len(pairs) == 1 else None,
              original=st, comparison=f"{dt_} (x{len(pairs)})", key=(doc_id, st, dt_),
              resolution="Agree one package-type vocabulary between Summary and Detail lists.")

    # ---------------- R07 equipment consistency
    items_by_block = defaultdict(list)
    for it in ctx["items"]:
        items_by_block[it["detail_package_id"]].append(it)
    for p in packages:
        st = equipment_tokens(p.get("equipment_number"))
        if not st:
            continue
        linked = [b for b in blocks if b.get("package_id") == p["package_id"]]
        it_tok, it_raw = set(), set()
        for b in linked:
            for it in items_by_block[b["detail_package_id"]]:
                if it["item_type"] == "MATERIAL" and it.get("equipment_number"):
                    it_tok |= equipment_tokens(it["equipment_number"])
                    it_raw.add(it["equipment_number"])
        if not it_tok or (st & it_tok):
            continue

        def compact(x):
            return re.sub(r"[^A-Z0-9]", "", unicodedata.normalize("NFKC", x).upper())
        compact_items = {compact(x) for x in it_raw} | {compact(t) for t in it_tok}
        compact_sum = {compact(t) for t in st} | {compact(p["equipment_number"])}
        # same tag written with different separators / prefixes (e.g. 'LAB' vs 'LA B', 'MESD' in 'A3MESD')
        if any(c and x and (c == x or (len(c) >= 3 and c in x) or (len(x) >= 3 and x in c))
               for c in compact_sum for x in compact_items):
            continue
        typo = any(len(a) >= 3 and sorted(a) == sorted(b) for a in compact_sum for b in compact_items)
        if True:
            L.add("R07", "EQUIPMENT_MISMATCH", "LOW", "PACKAGE",
                  f"Summary equipment '{p['equipment_number']}' shares no token with item equipment numbers "
                  f"({', '.join(sorted(it_tok))[:150]})" + (" - same letters transposed (probable typo)." if typo else "."),
                  subtype="PROBABLE_TYPO" if typo else "NO_OVERLAP", doc_id=p["source_document_id"],
                  package_id=p["package_id"], sheet=p["source_sheet"], row=p["source_row"],
                  package_number=p["package_number_original"], original=p["equipment_number"],
                  comparison=", ".join(sorted(it_tok))[:250],
                  resolution="Check for typos (e.g. OCL2 vs OLC2) and align equipment tags.")

    # ---------------- R08 batch code vs shipment batch (series level)
    grp = defaultdict(list)
    for p in packages:
        bc = p.get("package_batch_code")
        if bc and bc != str(docs[p["source_document_id"]]["batch_no"]):
            grp[(p["source_document_id"], p["package_group"], bc, p.get("package_seq_total"))].append(p)
    for (doc_id, g, bc, tot), ps in grp.items():
        d = docs[doc_id]
        L.add("R08", "BATCH_CODE_MISMATCH", "INFO", "SERIES",
              f"{len(ps)} package(s) of series {g}-{bc}-x/{tot} carry batch code {bc} but are listed in the "
              f"{d['batch_name']} Summary (carry-over / re-allocated packages).",
              subtype="CARRY_OVER", doc_id=doc_id, package_number=f"{ps[0]['package_number_original'].rsplit('-', 1)[0]}-*/{tot}",
              sheet=ps[0]["source_sheet"], row=ps[0]["source_row"], original=f"batch code {bc}",
              comparison=f"shipment batch {d['batch_no']}", key=(doc_id, g, bc, tot),
              resolution="No correction; package numbers are kept as marked. Report under the shipping batch.",
              status="ACCEPTED_AS_IS")

    # ---------------- R09 non-standard package number formats
    for p in packages:
        if p["package_number_format"] != "STANDARD":
            L.add("R09", "NONSTANDARD_PACKAGE_FORMAT", "LOW", "PACKAGE",
                  f"Package number format {p['package_number_format']} (expected <cat>-HHI-<proj>-<group>-<batch>-<seq>/<total>).",
                  subtype=p["package_number_format"], doc_id=p["source_document_id"], package_id=p["package_id"],
                  sheet=p["source_sheet"], row=p["source_row"], package_number=p["package_number_original"],
                  original=p["package_number_original"],
                  resolution="Kept as written (identity not altered). Ask shipper to use the standard mark format.")

    # ---------------- R10 series completeness (across all workbooks)
    series = defaultdict(list)
    for p in packages:
        k = series_key(p["_parsed"])
        if k:
            series[k].append(p)
    ctx["series"] = []
    for k, ps in sorted(series.items()):
        tot = ps[0]["package_seq_total"]
        seqs = Counter(p["package_seq"] for p in ps)
        missing = [i for i in range(1, (tot or 0) + 1) if i not in seqs]
        over = [s for s in seqs if tot and s > tot]
        dup = [s for s, n in seqs.items() if n > 1]
        docs_in = sorted({p["source_document_id"] for p in ps})
        ctx["series"].append(dict(series_key=k, declared_total=tot, packages_listed=len(ps),
                                  distinct_seq=len(seqs), missing_count=len(missing),
                                  missing_seq=",".join(map(str, missing)), duplicate_seq=",".join(map(str, dup)),
                                  out_of_range_seq=",".join(map(str, over)), documents=", ".join(docs_in)))
        if missing:
            L.add("R10", "SERIES_GAP", "INFO", "SERIES",
                  f"Series declares {tot} packages; {len(seqs)} listed across {', '.join(docs_in)}; missing seq: "
                  f"{','.join(map(str, missing))[:200]}.", subtype="MISSING_SEQUENCE", doc_id=docs_in[-1],
                  package_number=k, original=len(seqs), comparison=tot, key=k,
                  resolution="Confirm whether the missing packages were shipped in another batch or are outstanding.")
        if dup:
            L.add("R10", "SERIES_GAP", "HIGH", "SERIES", f"Sequence numbers listed more than once: {dup}.",
                  subtype="DUPLICATE_SEQUENCE", doc_id=docs_in[-1], package_number=k, key=(k, "dup"),
                  resolution="Check for duplicate package marks.")

    # ---------------- R11..R15 block / item content
    for b in blocks:
        its = items_by_block[b["detail_package_id"]]
        common = dict(doc_id=b["source_document_id"], detail_package_id=b["detail_package_id"],
                      package_id=b.get("package_id"), sheet=b["source_sheet"],
                      package_number=b["package_number_original"])
        if b["total_row_type"] == "MISSING":
            L.add("R11", "BLOCK_TOTAL_MISSING", "LOW", "DETAIL_PACKAGE", "Detail block has no TOTAL row.",
                  row=b["source_block_end_row"], resolution="Informational; totals recomputed from items.", **common)
        mats = [i for i in its if i["item_type"] == "MATERIAL"]
        if mats and not b["is_split_parent"]:
            s = round(sum(i["total_weight_kg"] or 0 for i in mats), 4)
            nw = b.get("net_weight_kg")
            if nw:
                diff = s - nw
                if abs(diff) > max(1.0, 0.005 * nw):
                    L.add("R11", "ITEM_WEIGHT_SUM_MISMATCH", "LOW", "DETAIL_PACKAGE",
                          f"Sum of item Total Weight {s:g} kg vs package N.W. {nw:g} kg (diff {diff:+.2f} kg, "
                          f"{diff / nw:+.1%}); block TOTAL row shows {_fmt(b.get('block_total_weight_kg'))}.",
                          subtype="ITEMS_VS_PACKAGE_NW", row=b["source_package_row"], original=s, comparison=nw,
                          resolution="Check TOTAL formula ranges / missing item weights in the detail list.", **common)
        if not b["has_item_header"]:
            L.add("R13", "MISSING_ITEM_HEADER", "LOW", "DETAIL_PACKAGE",
                  "Block has no 'S/N.' item header row; items read with the sheet's previous column layout.",
                  row=b["source_package_row"], resolution="Informational.", **common)
        if not its:
            L.add("R15", "EMPTY_DETAIL_BLOCK", "MEDIUM", "DETAIL_PACKAGE", "Detail block contains no material items.",
                  row=b["source_package_row"], resolution="Request the item list for this package.", **common)
        flags = Counter()
        rows_by_flag = defaultdict(list)
        for it in its:
            for f in (it["dq_flags"] or "").split(";"):
                if f:
                    flags[f] += 1
                    rows_by_flag[f].append(it["source_row"])
        for f, n in flags.items():
            if f == "SOURCE_ERROR_VALUE":
                continue
            if f.startswith("SN_"):
                continue
            L.add("R12", "ITEM_DATA_INCOMPLETE", "LOW", "DETAIL_PACKAGE",
                  f"{n} item row(s) flagged {f} (rows {', '.join(map(str, rows_by_flag[f][:15]))}"
                  f"{'...' if n > 15 else ''}).", subtype=f, row=rows_by_flag[f][0], original=n,
                  resolution="Values kept as written; complete in source if required for receiving.", **common)
        sn_bad = [it for it in its if "SN_SUBPACKAGE_TOKEN_MISMATCH" in (it["dq_flags"] or "")]
        if sn_bad:
            L.add("R14", "SN_PATTERN_ANOMALY", "LOW", "DETAIL_PACKAGE",
                  f"{len(sn_bad)} item S/N value(s) carry a different sub-package token than the block "
                  f"({', '.join(sorted({i['source_sn'] for i in sn_bad}))[:150]}). Items are assigned by block position.",
                  subtype="SN_SUBPACKAGE_TOKEN_MISMATCH", row=sn_bad[0]["source_row"],
                  original=", ".join(sorted({i['source_sn'] for i in sn_bad}))[:250],
                  comparison=f"{b.get('package_seq')}{b.get('sub_package_suffix') or ''}",
                  resolution="Likely Excel fill-down error; no change made.", **common)
    for it in ctx["items"]:
        if "SOURCE_ERROR_VALUE" in (it["dq_flags"] or ""):
            L.add("R12", "SOURCE_ERROR_VALUE", "MEDIUM", "ITEM",
                  "Source cell holds an Excel error value instead of text (description lost upstream). Field stored as "
                  "NULL; error code in extra_values_json; raw cell in STG_DETAIL_ROWS.",
                  doc_id=it["source_document_id"], item_id=it["item_id"], detail_package_id=it["detail_package_id"],
                  package_id=it.get("package_id"), sheet=it["source_sheet"], row=it["source_row"],
                  package_number=it["package_number_original"], original=it.get("extra_values_json"),
                  comparison=it.get("drawing_number"),
                  resolution="Recover description from drawing / masterlist; request corrected list.")

    # ---------------- R16/R17 document totals & metadata
    for doc_id, d in docs.items():
        ps = [p for p in packages if p["source_document_id"] == doc_id]
        comp = dict(package_quantity=sum(p["package_quantity"] or 0 for p in ps),
                    volume_m3=round(sum(p["volume_m3"] or 0 for p in ps), 4),
                    net_weight_kg=round(sum(p["net_weight_kg"] or 0 for p in ps), 4),
                    gross_weight_kg=round(sum(p["gross_weight_kg"] or 0 for p in ps), 4))
        tr = d.get("_summary_total")
        if tr is None:
            L.add("R16", "SUMMARY_TOTAL_MISSING", "INFO", "DOCUMENT", "Summary sheet has no total row.",
                  doc_id=doc_id, sheet=d["summary_sheet"], key=(doc_id, "nototal"),
                  resolution="Totals computed by ETL (see INVOICE_REGISTER).")
        else:
            for f, v in comp.items():
                dv = tr.get(f)
                if dv is None:
                    continue
                if abs(dv - v) > max(0.01, 0.0001 * max(abs(v), 1)):
                    L.add("R16", "SUMMARY_TOTAL_MISMATCH", "MEDIUM", "DOCUMENT",
                          f"Summary total row {f} = {dv:g} but sum of package rows = {v:g}.", subtype=f.upper(),
                          doc_id=doc_id, sheet=d["summary_sheet"], row=tr["row"], original=dv, comparison=v,
                          key=(doc_id, f), resolution="Check total formula range.")
        imp = d.get("_import")
        if imp and imp.get("totals"):
            for f, src in (("packages", None), ("volume_m3", "volume_m3"), ("net_weight_kg", "net_weight_kg"),
                           ("gross_weight_kg", "gross_weight_kg")):
                dv = imp["totals"].get(f)
                v = len(ps) if f == "packages" else comp[src]
                if dv is not None and abs(dv - v) > max(0.01, 0.0001 * max(abs(v), 1)):
                    L.add("R16", "IMPORT_TOTAL_MISMATCH", "MEDIUM", "DOCUMENT",
                          f"IMPORT packing list {f} = {dv:g} but Summary computed = {v:g}.", subtype=f.upper(),
                          doc_id=doc_id, sheet=imp["sheet"], row=imp.get("totals_row"), original=dv, comparison=v,
                          key=(doc_id, "imp", f), resolution="Reconcile commercial packing list with Summary.")
            for lab, a, bkey in (("Port of loading", d.get("port_of_loading"), "port of loading"),
                                 ("Port of discharge", d.get("port_of_discharge"), "port of discharge")):
                bval = next((v for k, v in imp["meta"].items() if k.startswith(bkey)), None)
                if a and bval and a.strip().upper() != str(bval).strip().upper():
                    L.add("R17", "METADATA_INCONSISTENCY", "INFO", "DOCUMENT",
                          f"{lab} differs: Summary '{a}' vs IMPORT packing list '{bval}'.", subtype=lab.upper().replace(" ", "_"),
                          doc_id=doc_id, sheet=imp["sheet"], original=a, comparison=bval, key=(doc_id, lab),
                          resolution="Informational (commercial vs logistics document wording).")
        for fld, lab in (("project_name_original", "Project name"), ("shipper_original", "Shipper")):
            vals = Counter(b.get(fld) for b in blocks if b["source_document_id"] == doc_id)
            if len(vals) > 1:
                L.add("R17", "METADATA_INCONSISTENCY", "LOW", "DOCUMENT",
                      f"{lab} varies across detail blocks: {dict(vals)}", subtype=fld.upper(), doc_id=doc_id,
                      key=(doc_id, fld), resolution="Informational.")

    # ---------------- R18 non-numeric summary values
    for p in packages:
        for f, v in p["_nonnumeric"].items():
            L.add("R18", "MALFORMED_VALUE", "MEDIUM", "PACKAGE", f"Non-numeric / unparseable value in {f}: '{v}'.",
                  subtype=f.upper(), doc_id=p["source_document_id"], package_id=p["package_id"], sheet=p["source_sheet"],
                  row=p["source_row"], package_number=p["package_number_original"], original=v,
                  resolution="Value kept in STG raw layer; field left NULL.")
    for p in packages:
        if p.get("_multi_dates"):
            L.add("R18", "MULTIPLE_VALUES_IN_CELL", "LOW", "PACKAGE",
                  f"Inspection Date cell holds {len(p['_multi_dates'])} dates ({', '.join(p['_multi_dates'])}); "
                  f"inspection_date left NULL, text kept in inspection_date_original.",
                  subtype="INSPECTION_DATE", doc_id=p["source_document_id"], package_id=p["package_id"],
                  sheet=p["source_sheet"], row=p["source_row"], package_number=p["package_number_original"],
                  original=p["inspection_date_original"], comparison=", ".join(p["_multi_dates"]),
                  resolution="Confirm which inspection applies (partial inspections?). A year that differs from the "
                             "others may be a typing error.")
    for b in blocks:
        for f, v in b["_nonnumeric"].items():
            L.add("R18", "MALFORMED_VALUE", "MEDIUM", "DETAIL_PACKAGE", f"Non-numeric value in {f}: '{v}'.",
                  subtype=f.upper(), doc_id=b["source_document_id"], detail_package_id=b["detail_package_id"],
                  sheet=b["source_sheet"], row=b["source_package_row"], package_number=b["package_number_original"],
                  original=v, resolution="Value kept in STG raw layer; field left NULL.")
    return L.sorted_rows()


# =============================================================================== checks


def build_checks(ctx, recount):
    """recount = independent counts straight from the workbooks (see run_etl.independent_recount)."""
    C = []

    def add(cid, group, name, scope, expected, actual, status=None, note=None):
        if status is None:
            status = "PASS" if str(expected) == str(actual) else "FAIL"
        C.append(dict(check_id=cid, check_group=group, check_name=name, scope=scope,
                      expected_value=None if expected is None else str(expected),
                      actual_value=None if actual is None else str(actual), status=status, note=note))

    packages, blocks, items, mappings = ctx["packages"], ctx["blocks"], ctx["items"], ctx["mappings"]
    n = 0
    for doc_id, d in ctx["docs"].items():
        rc = recount[doc_id]
        n += 1
        add(f"C01-{doc_id}", "COUNT_RECON", "Summary package rows: independent recount vs PACKAGE_MASTER", doc_id,
            rc["summary_rows"], sum(1 for p in packages if p["source_document_id"] == doc_id))
        tr = d.get("_summary_total")
        if tr and tr.get("package_quantity") is not None:
            add(f"C02-{doc_id}", "COUNT_RECON", "Summary total row package qty vs PACKAGE_MASTER rows", doc_id,
                int(tr["package_quantity"]), sum(1 for p in packages if p["source_document_id"] == doc_id))
        else:
            add(f"C02-{doc_id}", "COUNT_RECON", "Summary total row package qty vs PACKAGE_MASTER rows", doc_id,
                "n/a (no qty on total row)", sum(1 for p in packages if p["source_document_id"] == doc_id), "INFO",
                "Summary total row missing or has no package quantity.")
        imp = d.get("_import")
        if imp and imp.get("totals"):
            add(f"C03-{doc_id}", "COUNT_RECON", "IMPORT packing list 'In Total' packages vs PACKAGE_MASTER rows", doc_id,
                int(imp["totals"]["packages"]), sum(1 for p in packages if p["source_document_id"] == doc_id))
        for sheet, cnt in rc["blocks"].items():
            add(f"C04-{doc_id}-{sheet.strip()}", "COUNT_RECON", "'Package No.' headers: independent recount vs DETAIL_PACKAGES",
                f"{doc_id}/{sheet}", cnt,
                sum(1 for b in blocks if b["source_document_id"] == doc_id and b["source_sheet"] == sheet))
        for sheet, cnt in rc["item_candidates"].items():
            got = sum(1 for i in items if i["source_document_id"] == doc_id and i["source_sheet"] == sheet)
            add(f"C05-{doc_id}-{sheet.strip()}", "COUNT_RECON",
                "Rows with item content (desc/unit/equipment/drawing/remark/masterlist text) between item header and TOTAL: independent recount vs PACKAGE_DETAIL",
                f"{doc_id}/{sheet}", cnt, got)
        add(f"C06-{doc_id}", "COUNT_RECON", "Non-blank detail rows = sum of all row classes (nothing dropped)", doc_id,
            rc["detail_nonblank_rows"], sum(1 for s in ctx["detail_stg"] if s["source_document_id"] == doc_id))
        add(f"C07-{doc_id}", "COUNT_RECON", "Non-blank summary rows staged in STG_SUMMARY_ROWS", doc_id,
            rc["summary_nonblank_rows"], sum(1 for s in ctx["summary_stg"] if s["source_document_id"] == doc_id))

    # integrity
    ids = Counter(p["package_id"] for p in packages)
    add("C10", "INTEGRITY", "PACKAGE_MASTER.package_id unique", "ALL", 0, sum(1 for v in ids.values() if v > 1))
    ids = Counter(b["detail_package_id"] for b in blocks)
    add("C11", "INTEGRITY", "DETAIL_PACKAGES.detail_package_id unique", "ALL", 0, sum(1 for v in ids.values() if v > 1))
    ids = Counter(i["item_id"] for i in items)
    add("C12", "INTEGRITY", "PACKAGE_DETAIL.item_id unique", "ALL", 0, sum(1 for v in ids.values() if v > 1))
    blk = {b["detail_package_id"]: b for b in blocks}
    add("C13", "INTEGRITY", "Orphan material items (detail_package_id missing or unknown)", "ALL", 0,
        sum(1 for i in items if i["detail_package_id"] not in blk))
    add("C14", "INTEGRITY", "Items whose package_id differs from their block's package_id", "ALL", 0,
        sum(1 for i in items if i.get("package_id") != blk[i["detail_package_id"]].get("package_id")))
    from .mapping import LINKED
    add("C15", "INTEGRITY", "Linked-status blocks without package_id", "ALL", 0,
        sum(1 for b in blocks if b["mapping_status"] in LINKED and not b.get("package_id")))
    add("C16", "INTEGRITY", "Unlinked-status blocks carrying a package_id", "ALL", 0,
        sum(1 for b in blocks if b["mapping_status"] not in LINKED and b.get("package_id")))
    add("C17", "INTEGRITY", "STG MATERIAL_ITEM rows without item_id", "ALL", 0,
        sum(1 for s in ctx["detail_stg"] if s["row_class"] == "MATERIAL_ITEM" and not s.get("item_id")))
    add("C18", "INTEGRITY", "Mapping rows = detail blocks + unmatched summaries", "ALL",
        len(blocks) + sum(1 for p in packages if p.get("_unmatched")), len(mappings))
    add("C19", "INTEGRITY", "Every block appears exactly once in PACKAGE_MAPPING", "ALL", len(blocks),
        len({m["detail_package_id"] for m in mappings if m["detail_package_id"]}))

    # mapping distribution
    dist = Counter(m["mapping_status"] for m in mappings)
    for st, cnt in sorted(dist.items()):
        add(f"C20-{st}", "MAPPING", f"Mapping rows with status {st}", "ALL", None, cnt, "INFO")
    unmatched_s = sum(1 for p in packages if p.get("_unmatched"))
    add("C21", "MAPPING", "Summary packages with no linked detail", "ALL", 0, unmatched_s,
        "PASS" if unmatched_s == 0 else "WARN", "See MAPPING_ISSUES R02.")
    unl = sum(1 for b in blocks if not b.get("package_id"))
    add("C22", "MAPPING", "Detail blocks not linked to a Summary package", "ALL", 0, unl,
        "PASS" if unl == 0 else "WARN", "See MAPPING_ISSUES R01.")
    add("C23", "MAPPING", "Material items without resolved Summary package", "ALL", 0,
        sum(1 for i in items if not i.get("package_id")),
        "PASS" if all(i.get("package_id") for i in items) else "WARN", "Items stay attached to their detail block.")

    # content
    bad = re.compile(r"^(project name|shipper|invoice no|package no|s/n|total|总计|合计|detailed packing list)", re.I)
    leak = sum(1 for i in items if bad.match(i.get("source_sn") or "") or bad.match(i.get("description_en") or ""))
    add("C30", "CONTENT", "Metadata/header/total labels appearing as material items", "ALL", 0, leak)
    for f in ("MISSING_SN", "MISSING_DESCRIPTION", "MISSING_QUANTITY", "MISSING_UNIT", "SOURCE_ERROR_VALUE",
              "DESCRIPTION_IN_MASTERLIST_COLUMN", "NON_NUMERIC_QUANTITY", "NON_NUMERIC_UNIT_WEIGHT_KG",
              "NON_NUMERIC_TOTAL_WEIGHT_KG", "SN_SUBPACKAGE_TOKEN_MISMATCH"):
        cnt = sum(1 for i in items if f in (i["dq_flags"] or "").split(";"))
        add(f"C31-{f}", "CONTENT", f"Items flagged {f}", "ALL", 0, cnt, "PASS" if cnt == 0 else "WARN")
    for f in ("length_mm", "width_mm", "height_mm", "volume_m3", "net_weight_kg", "gross_weight_kg"):
        cnt = sum(1 for p in packages if p.get(f) is None)
        add(f"C32-{f}", "CONTENT", f"Summary packages with blank {f}", "ALL", 0, cnt, "PASS" if cnt == 0 else "WARN")
    for f in ("mdr_number", "equipment_number", "inspection_date", "rfs_material_receiving"):
        cnt = sum(1 for p in packages if not p.get(f))
        add(f"C33-{f}", "CONTENT", f"Summary packages with blank {f}", "ALL", None, cnt, "INFO",
            "Business completeness (not an error).")
    cnt = sum(1 for p in packages if p["package_number_format"] == "UNPARSED")
    add("C34", "CONTENT", "Summary package numbers that match no known format", "ALL", 0, cnt,
        "PASS" if cnt == 0 else "WARN")
    cnt = sum(len(p["_nonnumeric"]) for p in packages) + sum(len(b["_nonnumeric"]) for b in blocks)
    add("C35", "CONTENT", "Malformed numeric/date values in package fields", "ALL", 0, cnt, "PASS" if cnt == 0 else "WARN")
    sub = sum(1 for i in items if i["item_type"] == "SUB_PACKAGE_REFERENCE")
    add("C36", "CONTENT", "Manifest lines referencing sub-packages (excluded from material sums)", "ALL", None, sub, "INFO")
    unres = sum(1 for i in items if i["item_type"] == "SUB_PACKAGE_REFERENCE" and not i.get("referenced_detail_package_id"))
    add("C37", "CONTENT", "Sub-package reference lines whose target block was not found", "ALL", 0, unres)

    # reference figures from the brief
    linked_exact = dist.get("EXACT_MATCH", 0)
    cand = dist.get("CANDIDATE_MATCH", 0) + dist.get("MANUAL_REVIEW", 0)
    ref = REFERENCE_FIGURES
    add("C40", "REFERENCE_FIGURES", "Summary packages (brief: ~1,151)", "ALL", ref["summary_packages"], len(packages), "INFO",
        "Brief figure assumed B4-P5 = 585 and B5-P3 = 291; source contains 586 and 292 numbered rows.")
    add("C41", "REFERENCE_FIGURES", "Detail package blocks (brief: ~1,163)", "ALL", ref["detail_blocks"], len(blocks), "INFO")
    add("C42", "REFERENCE_FIGURES", "Material item rows (brief: ~17,140)", "ALL", ref["material_items"], len(items), "INFO",
        "Count here excludes empty pre-numbered template rows, TOTAL and unlabelled subtotal rows.")
    add("C43", "REFERENCE_FIGURES", "Exact matches (brief: ~1,150)", "ALL", ref["exact_matches"], linked_exact, "INFO")
    add("C44", "REFERENCE_FIGURES", "Candidate mappings (brief: ~11)", "ALL", ref["candidate_mappings"],
        f"{dist.get('SPLIT_PACKAGE', 0)} split + {cand} candidate", "INFO",
        "Previous outputs were not available to verify. 10 split sub-packages + 1 K/KA alias = 11, which is consistent "
        "with the brief; split sub-packages are now linked (SPLIT_PACKAGE) on manifest evidence, the alias stays a candidate.")
    add("C45", "REFERENCE_FIGURES", "Unmatched detail blocks (brief: ~2)", "ALL", ref["unmatched_detail"],
        dist.get("UNMATCHED_DETAIL", 0), "INFO",
        "No detail block is left without a Summary match or candidate. Previous outputs were not available to verify "
        "which 2 blocks the brief counted as unmatched.")
    return C
