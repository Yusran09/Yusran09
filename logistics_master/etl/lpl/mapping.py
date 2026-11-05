"""
Package mapping engine: Summary package  <->  Detail package blocks.

Hierarchy (applied per source document, i.e. same Batch + Category):
  L1  EXACT_MATCH        package_number_original identical
  L2  NORMALIZED_MATCH   package_number_normalized identical (case / width / spacing only)
  L3  SPLIT_PACKAGE      detail number = summary number + sub-package suffix '(n)' or '.n'
                         AND the parent (manifest) block lists the child as a line item.
                         Without manifest evidence the child is only a CANDIDATE_MATCH.
  L4  CANDIDATE_MATCH /  similar identifier (same seq/total/batch code, group within edit
      MANUAL_REVIEW      distance 2) – proposed, never linked automatically.
  --  UNMATCHED_DETAIL / UNMATCHED_SUMMARY when nothing applies.

Manual decisions are applied from config/mapping_overrides.csv (CONFIRMED_ALIAS / REJECTED),
so review outcomes survive re-runs.
"""

import json

from .normalize import edit_distance

TOL = dict(dim_mm=1.0, vol_abs=0.01, vol_rel=0.005, wt_abs=1.0, wt_rel=0.001)
ATTRS = [("length_mm", "dim"), ("width_mm", "dim"), ("height_mm", "dim"), ("volume_m3", "vol"),
         ("net_weight_kg", "wt"), ("gross_weight_kg", "wt"), ("package_type_normalized", "txt")]

STATUS_REF = [
    ("EXACT_MATCH", 1, 1, "Level 1: Detail Package No. identical to Summary Package No. (same batch & category)."),
    ("NORMALIZED_MATCH", 1, 2, "Level 2: identical after controlled normalisation (case, full-width characters, whitespace, dash variants)."),
    ("SPLIT_PACKAGE", 1, 3, "Level 3: Detail block is a sub-package '(n)' / '.n' of a Summary package and is listed in the parent manifest block."),
    ("CONFIRMED_ALIAS", 1, 4, "Level 4: different identifier confirmed as the same package by manual review (mapping_overrides.csv)."),
    ("CANDIDATE_MATCH", 0, 5, "Level 4: machine-proposed link with a similar identifier; NOT linked until confirmed."),
    ("MANUAL_REVIEW", 0, 6, "Level 4: ambiguous - several or weak candidates; needs review."),
    ("UNMATCHED_DETAIL", 0, 7, "Detail block with no Summary package and no candidate."),
    ("UNMATCHED_SUMMARY", 0, 8, "Summary package with no linked Detail block."),
]
LINKED = {s for s, l, _o, _d in STATUS_REF if l}


def compare_attrs(s, d):
    """Attribute-by-attribute comparison of a Summary package and a Detail block."""
    out = {}
    for f, kind in ATTRS:
        a, b = s.get(f), d.get(f)
        if a is None or b is None:
            out[f] = dict(summary=a, detail=b, status="MISSING")
            continue
        if kind == "txt":
            out[f] = dict(summary=a, detail=b, status="MATCH" if a == b else "MISMATCH")
            continue
        diff = abs(float(a) - float(b))
        base = max(abs(float(a)), abs(float(b)), 1e-9)
        if diff == 0:
            st = "MATCH"
        elif kind == "dim":
            st = "WITHIN_TOLERANCE" if diff <= TOL["dim_mm"] else "MISMATCH"
        elif kind == "vol":
            st = "WITHIN_TOLERANCE" if diff <= TOL["vol_abs"] or diff / base <= TOL["vol_rel"] else "MISMATCH"
        else:
            st = "WITHIN_TOLERANCE" if diff <= TOL["wt_abs"] or diff / base <= TOL["wt_rel"] else "MISMATCH"
        out[f] = dict(summary=a, detail=b, status=st, diff=round(float(b) - float(a), 6),
                      rel=round(diff / base, 6))
    return out


def attr_score(cmp):
    usable = [v for v in cmp.values() if v["status"] != "MISSING"]
    if not usable:
        return 0.0
    return sum(1 for v in usable if v["status"] in ("MATCH", "WITHIN_TOLERANCE")) / len(usable)


def _conf(score):
    return "HIGH" if score >= 0.85 else "MEDIUM" if score >= 0.6 else "LOW"


def run_mapping(packages, blocks, overrides, audit):
    """Mutates blocks (package_id, status, parent links) and returns mapping rows."""
    by_doc_pk = {}
    for p in packages:
        by_doc_pk.setdefault(p["source_document_id"], []).append(p)
    by_doc_bl = {}
    for b in blocks:
        by_doc_bl.setdefault(b["source_document_id"], []).append(b)
    ov_index = {(o["source_document_id"], o["detail_package_number"].strip()): o for o in overrides}
    used_overrides = set()

    rows = []
    for doc_id, bls in by_doc_bl.items():
        pks = by_doc_pk.get(doc_id, [])
        by_orig = {}
        by_norm = {}
        for p in pks:
            by_orig.setdefault(p["package_number_original"], []).append(p)
            by_norm.setdefault(p["package_number_normalized"], []).append(p)
        blocks_by_norm = {}
        for b in bls:
            blocks_by_norm.setdefault(b["package_number_normalized"], []).append(b)

        linked_pk = {}
        # ---- pass 1: L1 / L2
        for b in bls:
            b.update(package_id=None, parent_detail_package_id=None, is_split_parent=0, is_split_child=0)
            b["_map"] = None
            hits = by_orig.get(b["package_number_original"])
            if hits:
                p = hits[0]
                _link(b, p, "EXACT_MATCH", 1, "L1_EXACT_PACKAGE_NO", linked_pk, multi=len(hits))
                continue
            hits = by_norm.get(b["package_number_normalized"])
            if hits:
                p = hits[0]
                _link(b, p, "NORMALIZED_MATCH", 2, "L2_NORMALIZED_PACKAGE_NO", linked_pk, multi=len(hits))

        # ---- pass 2: overrides, L3 split, L4 candidates
        for b in bls:
            if b["_map"]:
                continue
            key = (doc_id, (b["package_number_original"] or "").strip())
            ov = ov_index.get(key)
            if ov:
                used_overrides.add(key)
                tgt = by_orig.get(ov["summary_package_number"].strip()) or by_norm.get(ov["summary_package_number"].strip().upper())
                if ov["decision"].upper() == "CONFIRMED_ALIAS" and tgt:
                    _link(b, tgt[0], "CONFIRMED_ALIAS", 4, "L4_MANUAL_REVIEW_CONFIRMED", linked_pk)
                    b["_map"]["review"] = ov
                    audit("OVERRIDE_APPLIED", "PACKAGE_MAPPING",
                          f"{doc_id}: {b['package_number_original']} -> {ov['summary_package_number']} CONFIRMED_ALIAS")
                    continue
                if ov["decision"].upper() == "CONFIRMED_ALIAS" and not tgt:
                    audit("OVERRIDE_INVALID", "PACKAGE_MAPPING",
                          f"{doc_id}: target {ov['summary_package_number']} not found; override ignored")
            p = b.get("_parsed", {})
            if p.get("sub") and p.get("base") in by_norm:
                parent_pkg = by_norm[p["base"]][0]
                parent_blocks = blocks_by_norm.get(p["base"], [])
                evidence = [pb for pb in parent_blocks
                            if any(it.get("_ref_pkg_norm") == b["package_number_normalized"] for it in pb["_items"])]
                if evidence:
                    pb = evidence[0]
                    _link(b, parent_pkg, "SPLIT_PACKAGE", 3, "L3_SUBPACKAGE_SUFFIX_WITH_PARENT_MANIFEST",
                          linked_pk, confidence="HIGH", score=1.0)
                    b["parent_detail_package_id"] = pb["detail_package_id"]
                    b["is_split_child"] = 1
                    pb["is_split_parent"] = 1
                    b["_map"]["note"] = (f"Sub-package {p['sub']} of {parent_pkg['package_number_original']}; "
                                         f"listed as a line item of parent block "
                                         f"{pb['source_sheet']}!R{pb['source_header_row']}.")
                    continue
                _propose(b, parent_pkg, "CANDIDATE_MATCH", 3, "L3_SUBPACKAGE_SUFFIX_NO_MANIFEST", 0.7,
                         "Sub-package suffix matches a Summary package but the parent manifest does not list it.")
                continue
            # L4 candidates
            cands = []
            for s in pks:
                sp = s["_parsed"]
                if sp.get("format") == "UNPARSED" or p.get("format") == "UNPARSED":
                    continue
                if sp.get("seq") != p.get("seq") or sp.get("total") != p.get("total") or sp.get("bcode") != p.get("bcode"):
                    continue
                dist = edit_distance(sp.get("group"), p.get("group"))
                if dist == 0 or dist > 2:
                    continue
                cmp = compare_attrs(s, b)
                id_score = 1 - dist / max(len(sp.get("group") or ""), len(p.get("group") or ""), 1)
                score = round(0.4 * id_score + 0.6 * attr_score(cmp), 4)
                cands.append(dict(pkg=s, dist=dist, score=score, cmp=cmp, already_linked=s["package_id"] in linked_pk))
            # alternatives with same group but different series total (evidence only)
            alts = []
            for s in pks:
                sp = s["_parsed"]
                if sp.get("group") == p.get("group") and sp.get("seq") == p.get("seq") and sp.get("total") != p.get("total"):
                    alts.append(dict(package_number=s["package_number_original"], package_id=s["package_id"],
                                     already_linked=s["package_id"] in linked_pk,
                                     attribute_score=round(attr_score(compare_attrs(s, b)), 4)))
            free = [c for c in cands if not c["already_linked"]]
            free.sort(key=lambda c: -c["score"])
            if len(free) == 1 and free[0]["score"] >= 0.6:
                c = free[0]
                _propose(b, c["pkg"], "CANDIDATE_MATCH", 4, "L4_SIMILAR_IDENTIFIER_ATTRIBUTES_AGREE", c["score"],
                         f"Detail '{b['package_number_original']}' vs Summary '{c['pkg']['package_number_original']}': "
                         f"package group differs ({p.get('group')} vs {c['pkg']['_parsed'].get('group')}, edit distance {c['dist']}); "
                         f"same sequence {p.get('seq')}/{p.get('total')}; attribute agreement "
                         f"{attr_score(c['cmp']):.0%}. Not linked until confirmed.",
                         evidence=dict(attributes=c["cmp"], other_candidates=[
                             dict(package_number=x["pkg"]["package_number_original"], score=x["score"],
                                  already_linked=x["already_linked"]) for x in cands if x is not c],
                             same_group_other_series=alts))
            elif free:
                c = free[0]
                _propose(b, c["pkg"], "MANUAL_REVIEW", 4, "L4_AMBIGUOUS_OR_WEAK_CANDIDATES", c["score"],
                         f"{len(free)} candidate(s); best score {c['score']}. Review required.",
                         evidence=dict(candidates=[dict(package_number=x["pkg"]["package_number_original"],
                                                        score=x["score"]) for x in free],
                                       same_group_other_series=alts))
            else:
                b["mapping_status"], b["mapping_method"] = "UNMATCHED_DETAIL", "NO_CANDIDATE"
                b["_map"] = dict(package=None, status="UNMATCHED_DETAIL", level=0, method="NO_CANDIDATE",
                                 confidence="NONE", score=None, linked=0,
                                 note="No Summary package with an equal, normalised, sub-package or similar number.",
                                 evidence=dict(same_group_other_series=alts) if alts else None)
            # rejected override keeps the block unlinked but records the review
            if ov and ov["decision"].upper() == "REJECTED":
                b["_map"]["review"] = ov

        # ---- mapping rows for blocks
        for b in bls:
            m = b["_map"]
            pkg = m["package"]
            review = m.get("review") or {}
            rows.append(dict(
                mapping_id=f"MAP-{b['detail_package_id']}", package_id=pkg["package_id"] if pkg else None,
                detail_package_id=b["detail_package_id"], batch_id=b["batch_id"], category=b["category"],
                source_document_id=doc_id,
                source_package_number=pkg["package_number_original"] if pkg else None,
                target_package_number=b["package_number_original"], matching_level=m["level"],
                matching_method=m["method"], confidence_level=m["confidence"], confidence_score=m["score"],
                mapping_status=m["status"], is_linked=m["linked"], mapping_note=m.get("note"),
                evidence_json=json.dumps(m.get("evidence"), ensure_ascii=False, default=str) if m.get("evidence") else None,
                reviewed_by=review.get("reviewed_by"), reviewed_at=review.get("reviewed_at"),
                review_decision=review.get("decision", "PENDING" if not m["linked"] else None)))

        # ---- unmatched summaries
        proposals = {}
        for b in bls:
            if b["_map"]["package"] is not None and not b["_map"]["linked"]:
                proposals.setdefault(b["_map"]["package"]["package_id"], []).append(b)
        for p in pks:
            if p["package_id"] in linked_pk:
                continue
            props = proposals.get(p["package_id"], [])
            note = "No Detail block carries this package number."
            if props:
                note += " Proposed counterpart: " + ", ".join(
                    f"{x['package_number_original']} ({x['source_sheet']}!R{x['source_header_row']}, {x['mapping_status']})"
                    for x in props)
            rows.append(dict(
                mapping_id=f"MAP-{p['package_id']}", package_id=p["package_id"], detail_package_id=None,
                batch_id=p["batch_id"], category=p["category"], source_document_id=doc_id,
                source_package_number=p["package_number_original"],
                target_package_number=props[0]["package_number_original"] if props else None,
                matching_level=0, matching_method="NO_DETAIL_BLOCK", confidence_level="NONE",
                confidence_score=None, mapping_status="UNMATCHED_SUMMARY", is_linked=0, mapping_note=note,
                evidence_json=None, reviewed_by=None, reviewed_at=None, review_decision="PENDING"))
            p["_unmatched"] = True
            p["_proposals"] = props

    # summaries in documents without any detail sheet
    docs_with_blocks = set(by_doc_bl)
    for doc_id, pks in by_doc_pk.items():
        if doc_id in docs_with_blocks:
            continue
        for p in pks:
            rows.append(dict(mapping_id=f"MAP-{p['package_id']}", package_id=p["package_id"], detail_package_id=None,
                             batch_id=p["batch_id"], category=p["category"], source_document_id=doc_id,
                             source_package_number=p["package_number_original"], target_package_number=None,
                             matching_level=0, matching_method="NO_DETAIL_SHEET", confidence_level="NONE",
                             confidence_score=None, mapping_status="UNMATCHED_SUMMARY", is_linked=0,
                             mapping_note="Workbook has no detail sheet.", evidence_json=None,
                             reviewed_by=None, reviewed_at=None, review_decision="PENDING"))
            p["_unmatched"] = True
            p["_proposals"] = []

    unused = [k for k in ov_index if k not in used_overrides]
    for k in unused:
        audit("OVERRIDE_UNUSED", "PACKAGE_MAPPING", f"{k[0]}: no detail block '{k[1]}' found")
    return rows, unused


def _link(b, p, status, level, method, linked_pk, multi=1, confidence="HIGH", score=None):
    b["package_id"] = p["package_id"]
    b["mapping_status"], b["mapping_method"] = status, method
    cmp = compare_attrs(p, b)
    sc = score if score is not None else round(attr_score(cmp), 4)
    note = None
    if multi > 1:
        note = f"{multi} Summary rows share this number; linked to the first (S/N {p.get('source_sn')})."
    b["_map"] = dict(package=p, status=status, level=level, method=method, confidence=confidence,
                     score=sc, linked=1, note=note, evidence=dict(attributes=cmp))
    b["_cmp"] = cmp
    linked_pk.setdefault(p["package_id"], []).append(b)


def _propose(b, p, status, level, method, score, note, evidence=None):
    b["package_id"] = None
    b["mapping_status"], b["mapping_method"] = status, method
    b["_map"] = dict(package=p, status=status, level=level, method=method, confidence=_conf(score),
                     score=score, linked=0, note=note, evidence=evidence)
