#!/usr/bin/env python3
"""
Logistics Packing List ETL  -  Batch 4 / Batch 5, P3 / P5
=========================================================

Reads the four original packing-list workbooks, audits and normalises them,
builds the relational Logistics Master Database, maps Summary packages to
Detail package blocks, logs every exception and exports:

    output/MASTER_LOGISTICS_DATABASE.sqlite
    output/MASTER_LOGISTICS_PACKING_LIST_CLEAN.xlsx
    output/LOGISTICS_DATA_RECONCILIATION_REPORT.xlsx
    output/csv/<TABLE>.csv            (UTF-8 with BOM, one file per table)
    docs/LOGISTICS_DATA_DICTIONARY.md (generated)
    docs/LOGISTICS_SOURCE_AUDIT_REPORT.md (generated)

Safe to re-run:
  * source workbooks are opened read-only and never written;
  * all ids are deterministic (hash of business keys) -> same input, same ids;
  * the SQLite file is rebuilt in a temp file and swapped in atomically;
    IMPORT_HISTORY and AUDIT_LOG rows of previous runs are carried over;
  * manual mapping decisions live in config/mapping_overrides.csv.

Usage:
    python3 -I etl/run_etl.py                     # defaults relative to project root
    python3 -I etl/run_etl.py --source-dir /path/to/workbooks --output-dir /path/out
    python3 -I etl/run_etl.py --skip-excel        # database + csv only
"""

import argparse
import csv
import datetime as dt
import hashlib
import json
import logging
import sys
import time
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # allows running with `python -I`

from lpl import __version__ as ETL_VERSION  # noqa: E402
from lpl import controls, export, parse, schema  # noqa: E402
from lpl.mapping import STATUS_REF, run_mapping  # noqa: E402
from lpl.normalize import ChangeLog, h, is_meaningful, label  # noqa: E402

log = logging.getLogger("lpl")
PROJECT = HERE.parent


# ----------------------------------------------------------------------------- setup


def utcnow(keep_ms=False):
    now = dt.datetime.now(dt.timezone.utc)
    return now if keep_ms else now.replace(microsecond=0)


def sha256(path):
    d = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            d.update(chunk)
    return d.hexdigest()


def locate_sources(source_dir, manifest):
    files = [p for p in Path(source_dir).iterdir() if p.suffix.lower() == ".xlsx" and not p.name.startswith("~$")]
    found = {}
    for d in manifest["documents"]:
        toks = [t.lower() for t in d["match_tokens"]]
        hits = [p for p in files if all(t in p.name.lower().replace("_", " ").replace("-", " ") for t in toks)]
        if len(hits) != 1:
            raise SystemExit(f"Source for {d['source_document_id']} not uniquely found in {source_dir} "
                             f"(tokens {toks}; matches: {[p.name for p in hits]})")
        found[d["source_document_id"]] = hits[0]
    return found


def load_overrides(path):
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if (r.get("detail_package_number") or "").strip()]
    for r in rows:
        if r["decision"].strip().upper() not in ("CONFIRMED_ALIAS", "REJECTED"):
            raise SystemExit(f"mapping_overrides.csv: invalid decision '{r['decision']}'")
    return rows


def register_change_rules(cl):
    cl.register("N-PKG-01", "PACKAGE_MASTER / DETAIL_PACKAGES", "package_number_normalized",
                "Unicode NFKC: full-width characters to ASCII, e.g. '（3）' -> '(3)'. Original kept.", 1)
    cl.register("N-PKG-02", "PACKAGE_MASTER / DETAIL_PACKAGES", "package_number_normalized",
                "All whitespace removed from the matching key. Original kept.", 1)
    cl.register("N-PKG-03", "PACKAGE_MASTER / DETAIL_PACKAGES", "package_number_normalized",
                "Upper-case and dash variants (– — −) unified to '-'. Original kept.", 1)
    cl.register("N-TXT-01", "PACKAGE_MASTER / PACKAGE_DETAIL", "text fields",
                "Trim, exotic spaces (NBSP, ideographic) -> space, internal line breaks/runs of spaces collapsed. "
                "Raw value kept in STG_*_ROWS.raw_values_json.")
    cl.register("N-NUM-01", "all numeric fields", "dimensions / volume / weights / quantity",
                "Floating-point artefacts rounded to 6 decimals (e.g. 13530.370000000003 -> 13530.37).")
    cl.register("N-DAT-01", "PACKAGE_MASTER", "inspection_date", "Excel date/time -> ISO date YYYY-MM-DD.")
    cl.register("N-MDR-01", "PACKAGE_MASTER", "mdr_number",
                "Multi-line MDR cell joined with ' | '; each MDR also stored in PACKAGE_MDR.")
    cl.register("N-MDR-02", "PACKAGE_MASTER", "mdr_status_code",
                "MDR status code extracted from label, e.g. 'Approved (APV)' -> APV ('No MDR...' -> NO_MDR).")
    cl.register("N-PTY-01", "PACKAGE_MASTER / DETAIL_PACKAGES", "package_type_normalized",
                "Package type standardised (e.g. 'U型架U-shaped frame.' -> U-FRAME, '铁箱IRON CASE' -> IRON CASE).")
    cl.register("N-UNT-01", "PACKAGE_DETAIL", "unit_of_quantity_normalized",
                "Unit standardised (e.g. 'piece', '个PCS' -> PCS; '套', 'set' -> SET).")
    cl.register("N-ERR-01", "PACKAGE_DETAIL", "text fields",
                "Source cell holding an Excel error value (NAME, REF ...) is not text: field set to NULL, error encoded "
                "as EXCEL_ERROR:<CODE> in extra_values_json, raw cell kept in STG_DETAIL_ROWS, issue logged (R12).")
    cl.register("N-ID-01", "all core tables", "*_id",
                "Deterministic surrogate ids from business keys (no random ids).")


# ----------------------------------------------------------------------------- independent recount


def independent_recount(path):
    """Counts taken with simple fixed-column logic, independent from the parser, for reconciliation."""
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out = dict(summary_rows=0, summary_nonblank_rows=0, blocks={}, item_candidates={}, detail_nonblank_rows=0)
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(max_col=parse.MAX_SCAN_COLS, values_only=True))
        nonblank = [r for r in rows if any(v is not None and str(v).strip() != "" for v in r)]
        if ws.title.strip() == parse.SUMMARY_SHEET:
            out["summary_nonblank_rows"] = len(nonblank)
            hdr = next(i for i, r in enumerate(rows) if label(r[0]) in ("s/n", "s/n."))
            pcol = next(c for c, v in enumerate(rows[hdr]) if "package no" in label(v))
            out["summary_rows"] = sum(1 for r in rows[hdr + 1:] if r[pcol] is not None and str(r[pcol]).strip())
            continue
        heads = [r for r in rows if label(r[0]).startswith("package no")]
        has_items = any(label(r[0]).startswith("s/n") for r in rows)
        if not heads or not has_items:      # shipping-mark templates also say 'PACKAGE NO:'
            continue
        out["detail_nonblank_rows"] += len(nonblank)
        out["blocks"][ws.title] = len(heads)
        n, region = 0, False
        for r in rows:
            a = label(r[0])
            if a.startswith("package no"):
                region = "pkg"
                continue
            if region == "pkg":
                if any(v is not None and str(v).strip() for v in r):
                    region = "items"          # this was the package row
                continue
            if a.startswith(("s/n", "detailed packing list", "project name", "shipper", "total", "总计", "合计")):
                region = "items" if a.startswith("s/n") else False
                continue
            if region == "items":
                cells = [r[i] for i in (1, 2, 3, 5, 8, 9, 10, 11) if i < len(r)]   # B C D F I J K L
                if any(is_meaningful(v) for v in cells) or (len(r) > 4 and isinstance(r[4], str) and is_meaningful(r[4])):
                    n += 1
        out["item_candidates"][ws.title] = n
    wb.close()
    return out


# ----------------------------------------------------------------------------- build


def build(source_dir, config_dir, started):
    manifest = json.loads((config_dir / "source_manifest.json").read_text(encoding="utf-8"))
    overrides = load_overrides(config_dir / "mapping_overrides.csv")
    import_id = "IMP-" + started.strftime("%Y%m%dT%H%M%S") + f"{started.microsecond // 1000:03d}Z"
    imported_at = started.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    audit_rows = []

    def audit(event, entity, detail):
        audit_rows.append(dict(audit_id=f"{import_id}-{len(audit_rows) + 1:04d}", import_id=import_id,
                               event_time=utcnow().isoformat().replace("+00:00", "Z"),
                               event_type=event, entity=entity, detail=detail))

    cl = ChangeLog()
    register_change_rules(cl)
    ctx = dict(changelog=cl, docs={}, packages=[], blocks=[], items=[], summary_stg=[], detail_stg=[],
               annotations=[], sheets=[], import_id=import_id, imported_at=imported_at, audit=audit,
               manifest=manifest, overrides=overrides, _audit_source=lambda: audit_rows)
    batch_no = {b["batch_id"]: b for b in manifest["batches"]}
    files = locate_sources(source_dir, manifest)
    recount = {}

    for d in manifest["documents"]:
        path = files[d["source_document_id"]]
        t0 = time.time()
        res = parse.parse_workbook(path, d, ctx)
        recount[d["source_document_id"]] = independent_recount(path)
        s = res["summary"]
        doc = dict(source_document_id=d["source_document_id"], source_document_name=d["source_document_name"],
                   source_file_name=path.name, batch_id=d["batch_id"], category=d["category"],
                   batch_no=batch_no[d["batch_id"]]["batch_no"], batch_name=batch_no[d["batch_id"]]["batch_name"],
                   file_sha256=sha256(path), file_size_bytes=path.stat().st_size, sheet_count=len(res["sheets"]),
                   summary_sheet=parse.SUMMARY_SHEET,
                   detail_sheet_count=sum(1 for x in res["sheets"] if x["sheet_role"] == "DETAIL"),
                   summary_title=s["title"], po_number=s["po_number"], summary_invoice_number=s["invoice_number"],
                   shipper=s["shipper"], consignee=s["consignee"], port_of_loading=s["port_of_loading"],
                   port_of_discharge=s["port_of_discharge"], summary_note=s["note"], imported_at=imported_at,
                   import_version=ETL_VERSION, import_id=import_id,
                   _summary_total=s["total_row"], _import=res["import_pl"], _summary=s)
        ctx["docs"][d["source_document_id"]] = doc
        ctx["sheets"].extend(res["sheets"])
        ctx["summary_stg"].extend(s["stg"])
        ctx["detail_stg"].extend(res["detail_stg"])
        _assign_ids(doc, s["packages"], res["blocks"], ctx)
        ctx["packages"].extend(s["packages"])
        ctx["blocks"].extend(res["blocks"])
        for a in s["annotations"]:
            a["_doc"] = doc
        ctx["annotations"].extend(s["annotations"])
        audit("SOURCE_READ", d["source_document_id"],
              f"{path.name} sha256={doc['file_sha256'][:16]}… sheets={len(res['sheets'])} "
              f"summary={len(s['packages'])} blocks={len(res['blocks'])} "
              f"items={sum(len(b['_items']) for b in res['blocks'])} ({time.time() - t0:.1f}s)")
        log.info("%s: %d summary packages, %d detail blocks, %d items", d["source_document_id"],
                 len(s["packages"]), len(res["blocks"]), sum(len(b["_items"]) for b in res["blocks"]))

    # ---- mapping
    ctx["mappings"], unused = run_mapping(ctx["packages"], ctx["blocks"], overrides, audit)
    _post_mapping(ctx)

    # ---- controls
    ctx["issues"] = controls.build_issues(ctx)
    ctx["checks"] = controls.build_checks(ctx, recount)
    if unused:
        ctx["checks"].append(dict(check_id="C50", check_group="MAPPING", check_name="Unused manual overrides",
                                  scope="ALL", expected_value="0", actual_value=str(len(unused)), status="WARN",
                                  note="; ".join(f"{a}:{b}" for a, b in unused)))
    ctx["invoices"] = _invoice_register(ctx)
    ctx["recount"] = recount
    ctx["fingerprint"] = hashlib.sha256("".join(sorted(d["file_sha256"] for d in ctx["docs"].values())).encode()).hexdigest()
    ctx["reference"] = dict(
        REFERENCE_BATCH=[{k: b[k] for k in ("batch_id", "batch_no", "batch_name", "description")} for b in manifest["batches"]],
        REFERENCE_CATEGORY=manifest["categories"],
        REFERENCE_MAPPING_STATUS=[dict(status_code=s, is_linked=l, sort_order=o, description=d) for s, l, o, d in STATUS_REF],
        REFERENCE_MDR_STATUS=_mdr_ref(ctx["packages"]),
    )
    return ctx


def _assign_ids(doc, packages, blocks, ctx):
    tag = f"{doc['batch_id']}{doc['category']}"
    for p in packages:
        p["package_id"] = f"PKG-{tag}-{h(p['package_number_normalized'], p['_occurrence'], n=8)}"
        p["_stg"]["package_id"] = p["package_id"]
        p["imported_at"], p["import_version"] = ctx["imported_at"], ETL_VERSION
    occ = Counter()
    for b in blocks:
        key = b.get("package_number_normalized") or f"NO-NUMBER-R{b['source_header_row']}"
        occ[(b["source_sheet"], key)] += 1
        b["detail_package_id"] = f"DPK-{tag}-{h(b['source_sheet'], key, occ[(b['source_sheet'], key)], n=8)}"
        b["imported_at"], b["import_version"] = ctx["imported_at"], ETL_VERSION
        b.setdefault("package_number_normalized", None)
        for s in b["_stg"]:
            s["detail_package_id"] = b["detail_package_id"]
        for i, it in enumerate(b["_items"], 1):
            it["line_seq"] = i
            it["item_id"] = f"ITM-{tag}-{h(b['detail_package_id'], i, n=10)}"
            it["_stg"]["item_id"] = it["item_id"]
    for coll, key in ((packages, "package_id"), (blocks, "detail_package_id")):
        ids = Counter(x[key] for x in coll)
        dup = [k for k, v in ids.items() if v > 1]
        if dup:
            raise RuntimeError(f"Deterministic id collision in {doc['source_document_id']}: {dup[:5]}")


def _post_mapping(ctx):
    import re
    import unicodedata
    by_doc_norm = {}
    for b in ctx["blocks"]:
        by_doc_norm.setdefault((b["source_document_id"], b["package_number_normalized"]), b)
    pk_by_norm = {}
    for p in ctx["packages"]:
        pk_by_norm.setdefault(p["package_number_normalized"], p)
    items = []
    for b in ctx["blocks"]:
        mats = [i for i in b["_items"] if i["item_type"] == "MATERIAL"]
        b["item_count"] = len(b["_items"])
        b["item_weight_sum_kg"] = round(sum(i["total_weight_kg"] or 0 for i in mats), 6) if mats else None
        own = f"{b.get('package_seq')}{b.get('sub_package_suffix') or ''}" if b.get("sub_package_suffix") else None
        for it in b["_items"]:
            it.update(detail_package_id=b["detail_package_id"], package_id=b.get("package_id"),
                      batch_id=b["batch_id"], category=b["category"],
                      package_number_original=b["package_number_original"],
                      source_document_id=b["source_document_id"], source_sheet=b["source_sheet"],
                      imported_at=b["imported_at"], import_version=b["import_version"])
            ref = it.get("_ref_pkg_norm")
            tgt = by_doc_norm.get((b["source_document_id"], ref)) if ref else None
            it["referenced_detail_package_id"] = tgt["detail_package_id"] if tgt else None
            if own and it.get("source_sn"):
                tok = re.sub(r"\s+", "", unicodedata.normalize("NFKC", it["source_sn"]))
                if re.fullmatch(r"\d+(\(\d+\)|\.\d+)", tok) and tok != own:
                    it["_flags"].append("SN_SUBPACKAGE_TOKEN_MISMATCH")
            it["dq_flags"] = ";".join(it["_flags"]) or None
            items.append(it)
    ctx["items"] = items
    # annotations -> package links / site_annotation
    for a in ctx["annotations"]:
        rp = a.get("row_package")
        a["row_package_id"] = rp["package_id"] if rp else None
        ref = None
        from lpl.normalize import PKG_LIKE, norm_package_number
        m = PKG_LIKE.search(unicodedata.normalize("NFKC", a["value"] or ""))
        if m:
            p = pk_by_norm.get(norm_package_number(m.group(0)))
            ref = p["package_id"] if p else None
        a["referenced_package_id"] = ref
    tags = {}
    for a in ctx["annotations"]:
        if a["context"] == "PACKAGE_ROW_TAG":
            tags.setdefault(a["row_package_id"], []).append(f"{a['cell_ref']}: {a['value']}")
    for p in ctx["packages"]:
        p["site_annotation"] = "; ".join(tags.get(p["package_id"], [])) or None


def _mdr_ref(packages):
    seen = {}
    desc = dict(APV="Approved", RES="Resubmit required", NO_MDR="No MDR submitted (stated in MDR No. column)",
                BLANK="MDR status not filled in")
    for p in packages:
        c = p["mdr_status_code"]
        if c not in seen:
            seen[c] = dict(mdr_status_code=c, label=p["mdr_status"] or "(blank)", description=desc.get(c))
    return sorted(seen.values(), key=lambda r: r["mdr_status_code"])


def _invoice_register(ctx):
    rows = []
    for doc_id, d in ctx["docs"].items():
        ps = [p for p in ctx["packages"] if p["source_document_id"] == doc_id]
        comp = dict(computed_packages=len(ps),
                    computed_volume_m3=round(sum(p["volume_m3"] or 0 for p in ps), 4),
                    computed_net_weight_kg=round(sum(p["net_weight_kg"] or 0 for p in ps), 4),
                    computed_gross_weight_kg=round(sum(p["gross_weight_kg"] or 0 for p in ps), 4))
        tr = d["_summary_total"] or {}
        base = dict(source_document_id=doc_id, batch_id=d["batch_id"], category=d["category"])
        rows.append(dict(base, invoice_register_id=f"INV-{doc_id}-SUMMARY", invoice_source="SUMMARY_HEADER",
                         source_sheet=d["summary_sheet"], invoice_number=d["summary_invoice_number"],
                         invoice_issue_date=None, po_number=d["po_number"], port_of_loading=d["port_of_loading"],
                         port_of_discharge=d["port_of_discharge"], block_count=None,
                         declared_packages=tr.get("package_quantity"), declared_volume_m3=tr.get("volume_m3"),
                         declared_net_weight_kg=tr.get("net_weight_kg"), declared_gross_weight_kg=tr.get("gross_weight_kg"),
                         matches_summary_invoice=1,
                         note=None if tr else "Summary sheet has no total row; declared totals unavailable.", **comp))
        imp = d["_import"]
        if imp:
            meta = imp["meta"]
            g = lambda k: next((v for kk, v in meta.items() if kk.startswith(k)), None)  # noqa: E731
            from lpl.normalize import to_date
            t = imp.get("totals") or {}
            inv = g("invoice no")
            rows.append(dict(base, invoice_register_id=f"INV-{doc_id}-IMPORT", invoice_source="IMPORT_PACKING_LIST",
                             source_sheet=imp["sheet"], invoice_number=inv,
                             invoice_issue_date=to_date(g("invoice issue date"))[0], po_number=g("p.o. no"),
                             port_of_loading=g("port of loading"), port_of_discharge=g("port of discharge"),
                             block_count=None, declared_packages=t.get("packages"), declared_volume_m3=t.get("volume_m3"),
                             declared_net_weight_kg=t.get("net_weight_kg"), declared_gross_weight_kg=t.get("gross_weight_kg"),
                             matches_summary_invoice=1 if inv == d["summary_invoice_number"] else 0,
                             note="; ".join(f"line {ln.get('sn')}: {ln.get('description')} qty {ln.get('quantity')} {ln.get('unit') or ''}".strip()
                                            for ln in imp["lines"]) or None, **comp))
        cnt = Counter((b["source_sheet"], b.get("invoice_number_original")) for b in ctx["blocks"]
                      if b["source_document_id"] == doc_id)
        for (sheet, inv), n in sorted(cnt.items(), key=lambda x: (x[0][0], str(x[0][1]))):
            bl = [b for b in ctx["blocks"] if b["source_document_id"] == doc_id and b["source_sheet"] == sheet
                  and b.get("invoice_number_original") == inv]
            rows.append(dict(base, invoice_register_id=f"INV-{doc_id}-{h(sheet, inv, n=8)}",
                             invoice_source="DETAIL_BLOCK_HEADER", source_sheet=sheet, invoice_number=inv,
                             invoice_issue_date=None, po_number=None, port_of_loading=None, port_of_discharge=None,
                             block_count=n, declared_packages=None, declared_volume_m3=None,
                             declared_net_weight_kg=None, declared_gross_weight_kg=None,
                             computed_packages=n,
                             computed_volume_m3=round(sum(b.get("volume_m3") or 0 for b in bl), 4),
                             computed_net_weight_kg=round(sum(b.get("net_weight_kg") or 0 for b in bl), 4),
                             computed_gross_weight_kg=round(sum(b.get("gross_weight_kg") or 0 for b in bl), 4),
                             matches_summary_invoice=1 if inv == d["summary_invoice_number"] else 0,
                             note=None if inv == d["summary_invoice_number"] else
                             f"Differs from Summary invoice {d['summary_invoice_number']}"))
    return rows


# ----------------------------------------------------------------------------- main


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source-dir", type=Path, default=PROJECT / "source")
    ap.add_argument("--output-dir", type=Path, default=PROJECT / "output")
    ap.add_argument("--config-dir", type=Path, default=PROJECT / "config")
    ap.add_argument("--docs-dir", type=Path, default=PROJECT / "docs")
    ap.add_argument("--skip-excel", action="store_true", help="only SQLite + CSV")
    ap.add_argument("--log-level", default="INFO")
    a = ap.parse_args(argv)
    logging.basicConfig(level=a.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    started = utcnow(keep_ms=True)
    a.output_dir.mkdir(parents=True, exist_ok=True)
    db_path = a.output_dir / "MASTER_LOGISTICS_DATABASE.sqlite"
    try:
        ctx = build(a.source_dir, a.config_dir, started)
        ctx["changelog_rows"] = ctx["changelog"].rows()
        ctx["changelog_rows"].append(dict(change_id="N-ID-01", table_name="all core tables", field_name="*_id",
                                          rule_description="Deterministic surrogate ids from business keys (no random ids).",
                                          identity_affecting=0, records_affected=len(ctx["packages"]) + len(ctx["blocks"]) + len(ctx["items"]),
                                          example_original=ctx["packages"][0]["package_number_original"],
                                          example_result=ctx["packages"][0]["package_id"]))
        ctx["changelog_rows"] = [r for r in ctx["changelog_rows"] if r["change_id"] != "N-ID-01" or r["records_affected"]]
        fails = [c for c in ctx["checks"] if c["status"] == "FAIL"]
        status = "SUCCESS" if not fails else "SUCCESS_WITH_WARNINGS"
        export.write_sqlite(ctx, db_path, started, status)
        export.write_csvs(ctx, db_path, a.output_dir / "csv")
        export.write_markdown(ctx, db_path, a.docs_dir)
        export.write_schema_sql(PROJECT / "sql" / "schema.sql")
        if not a.skip_excel:
            from lpl import excel
            excel.write_master(ctx, db_path, a.output_dir / "MASTER_LOGISTICS_PACKING_LIST_CLEAN.xlsx")
            excel.write_recon(ctx, db_path, a.output_dir / "LOGISTICS_DATA_RECONCILIATION_REPORT.xlsx")
        log.info("done: %d packages, %d detail blocks, %d items, %d issues, %d failed checks",
                 len(ctx["packages"]), len(ctx["blocks"]), len(ctx["items"]), len(ctx["issues"]), len(fails))
        for c in fails:
            log.warning("FAILED CHECK %s %s: expected %s actual %s", c["check_id"], c["check_name"],
                        c["expected_value"], c["actual_value"])
        return 0 if not fails else 2
    except Exception as e:  # record failed run in the existing database, then re-raise
        log.exception("ETL failed")
        export.record_failure(db_path, started, ETL_VERSION, repr(e))
        raise


if __name__ == "__main__":
    sys.exit(main())
