"""
Workbook parsing: source audit + Summary + Detail blocks + IMPORT packing list.

Nothing here decides relationships – it only extracts what is physically in the
workbook, classifies every row, and keeps raw values for lineage.
"""

import json
import logging
import re
import warnings

import openpyxl
from openpyxl.utils import get_column_letter

import unicodedata

from .normalize import (PKG_LIKE, clean_text, find_dates, is_meaningful, label, norm_mdr_status,
                        norm_package_number, norm_package_type, norm_unit, parse_package_number,
                        raw_text, split_mdr, to_date, to_int, to_number)

warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")
log = logging.getLogger("lpl.parse")

MAX_SCAN_COLS = 40          # used ranges are inflated to XFD by formatting; data never exceeds AN
SUMMARY_SHEET = "Summary Packing List"
ERROR_VALUES = {"#REF!", "#VALUE!", "#DIV/0!", "#N/A", "#NAME?", "#NUM!", "#NULL!"}

# ----------------------------------------------------------------------------- helpers


def _row_values(ws, r, maxc):
    return [ws.cell(r, c).value for c in range(1, maxc + 1)]


def _is_blank(vals):
    for v in vals:
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        return False
    return True


def _raw_json(vals):
    d = {}
    for i, v in enumerate(vals, 1):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            continue
        d[get_column_letter(i)] = raw_text(v)
    return json.dumps(d, ensure_ascii=False)


def _label_value_pairs(vals):
    """('Invoice No.:', 'P3-HHI-004') style pairs on a metadata row."""
    out = {}
    for i, v in enumerate(vals):
        s = clean_text(v)
        if not s or not re.search(r"[:：]\s*$", s):
            continue
        key = label(s).rstrip(":：").strip()
        val = None
        for w in vals[i + 1:]:
            t = clean_text(w)
            if t is None:
                continue
            if re.search(r"[:：]\s*$", t):
                break
            val = w
            break
        out[key] = val
    return out


def classify_sheet(ws):
    name = ws.title
    lname = name.lower()
    if name.strip() == SUMMARY_SHEET:
        return "SUMMARY"
    if "import" in lname:
        return "IMPORT_PACKING_LIST"
    if "出口合同" in name or label(ws.cell(2, 1).value) == "sales contract":
        return "LEGACY_SALES_CONTRACT"
    if "shipping mark" in lname:
        return "SHIPPING_MARK_TEMPLATE"
    for r in range(1, min(ws.max_row, 60) + 1):
        if label(ws.cell(r, 1).value).startswith("package no"):
            return "DETAIL"
    return "OTHER"


# ----------------------------------------------------------------------------- summary

SUMMARY_RULES = [
    ("source_sn", lambda l: l.startswith("s/n")),
    ("masterlist_sub_item_no", lambda l: "sub-item" in l),
    ("masterlist_item_no", lambda l: "masterlist item" in l),
    ("package_number", lambda l: "package no" in l),
    ("equipment_number", lambda l: "equipment" in l),
    ("description_en", lambda l: "english" in l),
    ("description_cn", lambda l: "chinese" in l),
    ("package_quantity", lambda l: re.search(r"\bqty\b", l) is not None),
    ("package_type", lambda l: re.search(r"\btype\b", l) is not None),
    ("length_mm", lambda l: "l(mm)" in l),
    ("width_mm", lambda l: "w(mm)" in l),
    ("height_mm", lambda l: "h(mm)" in l),
    ("volume_m3", lambda l: "volume" in l),
    ("net_weight_kg", lambda l: "n.w" in l),
    ("gross_weight_kg", lambda l: "g.w" in l),
    ("mdr_status", lambda l: "mdr status" in l),
    ("mdr_number", lambda l: "mdr no" in l),
    ("rfs_material_receiving", lambda l: "rfs" in l),
    ("inspection_date", lambda l: "inspection" in l),
    ("received_quantity", lambda l: "quantity" in l),
    ("remark", lambda l: "remark" in l),
]
SUMMARY_NUMERIC = ["package_quantity", "length_mm", "width_mm", "height_mm", "volume_m3",
                   "net_weight_kg", "gross_weight_kg", "received_quantity"]


def _map_columns(labels, rules):
    """labels: {col_idx: label}. Each field -> first matching column, each column used once."""
    mapping, used = {}, set()
    for field, rule in rules:
        for c in sorted(labels):
            if c in used or not labels[c]:
                continue
            if rule(labels[c]):
                mapping[field] = c
                used.add(c)
                break
    return mapping


def parse_summary(ws, doc, ctx):
    maxc = min(ws.max_column, MAX_SCAN_COLS)
    hdr = next((r for r in range(1, 25) if label(ws.cell(r, 1).value) in ("s/n", "s/n.")), None)
    if hdr is None:
        raise ValueError(f"{doc['source_document_id']}: Summary header row (S/N) not found")

    # data start = first row after header with a value under any 'package no' labelled column
    hdr_labels = {c: label(ws.cell(hdr, c).value) for c in range(1, maxc + 1)}
    pkg_col = next((c for c, l in hdr_labels.items() if "package no" in l), 4)
    data_start = next(r for r in range(hdr + 1, ws.max_row + 1) if clean_text(ws.cell(r, pkg_col).value))
    header_rows = [hdr] + list(range(hdr + 1, data_start))
    prev = hdr - 1
    if prev >= 1 and not any(re.search(r"[:：]\s*$", clean_text(v) or "") for v in _row_values(ws, prev, maxc)) \
            and not _is_blank(_row_values(ws, prev, maxc)):
        header_rows = [prev] + header_rows
    combined = {}
    for c in range(1, maxc + 1):
        parts = [label(ws.cell(r, c).value) for r in header_rows]
        combined[c] = " ".join(p for p in parts if p)
    cmap = _map_columns(combined, SUMMARY_RULES)
    last_col = max(cmap.values())

    # metadata rows above the header
    meta, title = {}, None
    for r in range(1, min(header_rows)):
        vals = _row_values(ws, r, maxc)
        if r == 1:
            title = clean_text(vals[0])
        meta.update(_label_value_pairs(vals))

    def mget(*keys):
        for k in keys:
            for mk, mv in meta.items():
                if mk.startswith(k):
                    return clean_text(mv)
        return None

    summary = dict(
        header_row=hdr, header_rows=header_rows, data_start_row=data_start, column_map=cmap,
        column_labels={f: combined[c] for f, c in cmap.items()}, last_mapped_col=last_col,
        title=title, po_number=mget("p.o. no"), invoice_number=mget("invoice no"),
        shipper=mget("shipper"), consignee=mget("consignee"),
        port_of_loading=mget("port of loading"), port_of_discharge=mget("port of discharge"),
        packages=[], stg=[], annotations=[], total_row=None, note=None, data_end_row=None,
    )

    occurrence = {}
    pkg_rows = {}
    for r in range(1, ws.max_row + 1):
        vals = _row_values(ws, r, maxc)
        if _is_blank(vals):
            continue
        table_vals = vals[:last_col]
        if r == 1:
            rc = "TITLE"
        elif r < min(header_rows):
            rc = "METADATA"
        elif r in header_rows:
            rc = "HEADER"
        elif clean_text(vals[cmap["package_number"] - 1]):
            rc = "PACKAGE"
        elif label(vals[0]).startswith("note"):
            rc = "NOTE"
            summary["note"] = clean_text(vals[0])
        elif _is_blank(table_vals):
            rc = "ANNOTATION_ONLY"
        elif summary["total_row"] is None and any(isinstance(v, (int, float)) for v in table_vals):
            rc = "TOTAL"
        else:
            rc = "OTHER"
        stg = dict(stg_id=f"{doc['source_document_id']}::{ws.title}::R{r}",
                   source_document_id=doc["source_document_id"], source_sheet=ws.title,
                   source_row=r, row_class=rc, package_id=None, raw_values_json=_raw_json(vals))
        summary["stg"].append(stg)

        if rc == "TOTAL":
            summary["total_row"] = dict(
                row=r, **{f: to_number(vals[cmap[f] - 1])[0] for f in
                          ("package_quantity", "volume_m3", "net_weight_kg", "gross_weight_kg") if f in cmap})
        if rc == "PACKAGE":
            pkg = _summary_package(vals, cmap, doc, ws.title, r, ctx)
            k = pkg["package_number_normalized"]
            occurrence[k] = occurrence.get(k, 0) + 1
            pkg["_occurrence"] = occurrence[k]
            pkg["_stg"] = stg
            summary["packages"].append(pkg)
            pkg_rows[r] = pkg
            summary["data_end_row"] = r

        # cells right of the formal table -> annotations
        for c in range(last_col + 1, maxc + 1):
            v = vals[c - 1]
            if v is None or not clean_text(v):
                continue
            summary["annotations"].append(dict(row=r, col=c, cell_ref=f"{get_column_letter(c)}{r}",
                                               value=raw_text(v)))

    _classify_annotations(summary, pkg_rows)
    return summary


def _summary_package(vals, cmap, doc, sheet, r, ctx):
    cl = ctx["changelog"]
    g = lambda f: vals[cmap[f] - 1] if f in cmap else None  # noqa: E731
    pno_raw = raw_text(g("package_number"))
    pno_norm = norm_package_number(pno_raw, cl)
    parsed = parse_package_number(pno_norm)
    rec = dict(
        batch_id=doc["batch_id"], category=doc["category"], source_document_id=doc["source_document_id"],
        source_sheet=sheet, source_row=r, source_sn=to_int(g("source_sn")),
        masterlist_item_no=clean_text(g("masterlist_item_no")),
        masterlist_sub_item_no=clean_text(g("masterlist_sub_item_no")),
        package_number_original=pno_raw, package_number_normalized=pno_norm,
        package_group=parsed.get("group"), package_batch_code=parsed.get("bcode"),
        package_seq=parsed.get("seq"), package_seq_total=parsed.get("total"),
        package_number_format=parsed["format"], _parsed=parsed,
        equipment_number=_clean_tracked(g("equipment_number"), cl, "N-TXT-01"),
        description_en=_clean_tracked(g("description_en"), cl, "N-TXT-01"),
        description_cn=_clean_tracked(g("description_cn"), cl, "N-TXT-01"),
        package_type=clean_text(g("package_type")),
        package_type_normalized=norm_package_type(g("package_type")),
        mdr_status=clean_text(g("mdr_status")),
        rfs_material_receiving=clean_text(g("rfs_material_receiving")),
        remark=_clean_tracked(g("remark"), cl, "N-TXT-01"),
        _nonnumeric={}, _raw=vals,
    )
    if rec["package_type"] and rec["package_type_normalized"] != rec["package_type"]:
        cl.hit("N-PTY-01", rec["package_type"], rec["package_type_normalized"])
    for f in SUMMARY_NUMERIC:
        n, ok = to_number(g(f))
        if not ok:
            rec["_nonnumeric"][f] = raw_text(g(f))
        elif isinstance(g(f), float) and n is not None and n != g(f):
            cl.hit("N-NUM-01", g(f), n)
        rec[f] = n
    mdr_lines = split_mdr(g("mdr_number"))
    mdr_clean = clean_text(g("mdr_number"), keep_newlines=True)
    rec["mdr_number"] = " | ".join(mdr_lines) if mdr_lines else mdr_clean
    if mdr_clean and "\n" in mdr_clean:
        cl.hit("N-MDR-01", mdr_clean, rec["mdr_number"])
    rec["_mdr_list"] = mdr_lines
    rec["mdr_status_code"] = norm_mdr_status(g("mdr_status"), g("mdr_number"))
    if rec["mdr_status"]:
        cl.hit("N-MDR-02", rec["mdr_status"], rec["mdr_status_code"])
    d, ok = to_date(g("inspection_date"))
    rec["inspection_date"] = d
    rec["inspection_date_original"] = raw_text(g("inspection_date"))
    rec["_multi_dates"] = None
    if not ok:
        found = find_dates(g("inspection_date"))
        if len(found) > 1:
            rec["_multi_dates"] = found          # several dates in one cell: kept as text, not guessed
        else:
            rec["_nonnumeric"]["inspection_date"] = raw_text(g("inspection_date"))
    elif d is not None:
        cl.hit("N-DAT-01", raw_text(g("inspection_date")), d)
    return rec


def _clean_tracked(v, cl, rule):
    out = clean_text(v)
    if v is not None and isinstance(v, str) and out != v:
        cl.hit(rule, v, out)
    return out


def _classify_annotations(summary, pkg_rows):
    anns = summary["annotations"]
    by_cell = {(a["row"], a["col"]): a for a in anns}
    pivot = set()
    for a in anns:
        if label(a["value"]) == "grand total":
            r = a["row"]
            while (r - 1, a["col"]) in by_cell:
                r -= 1
            for rr in range(r, a["row"] + 1):
                for cc in range(a["col"], a["col"] + 4):
                    pivot.add((rr, cc))
    for a in anns:
        if (a["row"], a["col"]) in pivot:
            a["context"] = "PIVOT_TABLE"
        elif a["row"] in pkg_rows:
            a["context"] = "PACKAGE_ROW_TAG"
            a["row_package"] = pkg_rows[a["row"]]
        elif PKG_LIKE.search(a["value"] or "") or label(a["value"]) in ("sama", "enggak"):
            a["context"] = "COMPARISON_LIST"
        else:
            a["context"] = "OTHER"


# ----------------------------------------------------------------------------- detail

PKG_HEADER_RULES = [
    ("package_number", lambda l: "package no" in l),
    ("package_type", lambda l: "package type" in l),
    ("length_mm", lambda l: "length" in l),
    ("width_mm", lambda l: "width" in l),
    ("height_mm", lambda l: "height" in l),
    ("volume_m3", lambda l: "volume" in l),
    ("net_weight_kg", lambda l: "net weight" in l),
    ("gross_weight_kg", lambda l: "gross weight" in l),
]
ITEM_HEADER_RULES = [
    ("source_sn", lambda l: l.startswith("s/n")),
    ("masterlist_sub_item_no", lambda l: "masterlist" in l),
    ("description_en", lambda l: "english" in l),
    ("description_cn", lambda l: "chinese" in l),
    ("specification", lambda l: "specification" in l),
    ("unit_of_quantity", lambda l: "unit of qty" in l),
    ("unit_weight_kg", lambda l: "unit weight" in l),
    ("total_weight_kg", lambda l: "total weight" in l),
    ("quantity", lambda l: "quantity" in l),
    ("equipment_number", lambda l: "equipment" in l),
    ("drawing_number", lambda l: "drawing" in l),
    ("remark", lambda l: "remark" in l or l == "r"),
]
DEFAULT_ITEM_MAP = dict(source_sn=1, masterlist_sub_item_no=2, description_en=3, description_cn=4,
                        quantity=5, unit_of_quantity=6, unit_weight_kg=7, total_weight_kg=8,
                        equipment_number=9, drawing_number=10, remark=11)
DEFAULT_PKG_MAP = dict(package_number=1, package_type=3, length_mm=4, width_mm=5, height_mm=6,
                       volume_m3=7, net_weight_kg=8, gross_weight_kg=9)
TOTAL_LABELS = ("total", "总计", "合计", "小计", "sub total", "subtotal")
CONTENT_FIELDS = ["description_en", "description_cn", "specification", "unit_of_quantity",
                  "equipment_number", "drawing_number", "remark", "masterlist_sub_item_no"]
ITEM_NUMERIC = ["quantity", "unit_weight_kg", "total_weight_kg"]
PKG_NUMERIC = ["length_mm", "width_mm", "height_mm", "volume_m3", "net_weight_kg", "gross_weight_kg"]


def _is_total_label(a):
    return any(a.startswith(t) for t in TOTAL_LABELS)


def _num_nonzero(v):
    n, _ = to_number(v)
    return n not in (None, 0, 0.0)


def parse_detail_sheet(ws, doc, ctx):
    maxc = min(ws.max_column, MAX_SCAN_COLS)
    blocks, stg_rows = [], []
    state = "pre"
    pending_meta = []          # staged meta rows waiting for the next block
    cur = None
    item_map = dict(DEFAULT_ITEM_MAP)
    counts = dict(metadata_rows=0, empty_template_rows=0, total_rows=0, unlabelled_total_rows=0,
                  material_item_rows=0, other_rows=0)

    for r in range(1, ws.max_row + 1):
        vals = _row_values(ws, r, maxc)
        if _is_blank(vals):
            continue
        a = label(vals[0])
        lab_cells = [label(v) for v in vals]
        stg = dict(stg_id=f"{doc['source_document_id']}::{ws.title}::R{r}",
                   source_document_id=doc["source_document_id"], source_sheet=ws.title, source_row=r,
                   block_seq=None, detail_package_id=None, row_class=None, item_id=None,
                   raw_values_json=_raw_json(vals), _vals=vals)
        stg_rows.append(stg)

        if a.startswith("detailed packing list"):
            stg["row_class"] = "BLOCK_TITLE"
        elif a.startswith("project name"):
            stg["row_class"] = "PROJECT_META"
        elif a.startswith("shipper") or any(l.startswith("invoice no") for l in lab_cells):
            stg["row_class"] = "SHIPPER_INVOICE_META"
        elif a.startswith("package no"):
            stg["row_class"] = "PACKAGE_HEADER"
        elif a.startswith("s/n"):
            stg["row_class"] = "ITEM_HEADER"
        elif _is_total_label(a):
            stg["row_class"] = "TOTAL"

        rc = stg["row_class"]
        if rc in ("BLOCK_TITLE", "PROJECT_META", "SHIPPER_INVOICE_META"):
            counts["metadata_rows"] += 1
            if state != "meta":
                pending_meta = []
            pending_meta.append(stg)
            state = "meta"
            continue

        if rc == "PACKAGE_HEADER":
            counts["metadata_rows"] += 1
            cur = _new_block(ws, doc, len(blocks) + 1, r, vals, pending_meta, maxc)
            blocks.append(cur)
            for m in pending_meta:
                m["block_seq"] = cur["source_block_number"]
            stg["block_seq"] = cur["source_block_number"]
            cur["_stg"].extend(pending_meta + [stg])
            pending_meta = []
            state = "expect_pkg"
            continue

        if cur is not None:
            stg["block_seq"] = cur["source_block_number"]
            cur["_stg"].append(stg)
            cur["source_block_end_row"] = r

        if rc == "ITEM_HEADER":
            counts["metadata_rows"] += 1
            labels = {c: label(vals[c - 1]) for c in range(1, maxc + 1)}
            m = _map_columns(labels, ITEM_HEADER_RULES)
            if "remark" not in m and "drawing_number" in m:
                m["remark"] = m["drawing_number"] + 1
            item_map = m if "description_en" in m or "quantity" in m else dict(DEFAULT_ITEM_MAP)
            if cur is not None:
                cur["has_item_header"] = 1
                cur["_item_map"] = item_map
            state = "items"
            continue

        if rc == "TOTAL":
            counts["total_rows"] += 1
            if cur is not None:
                im = cur.get("_item_map") or item_map
                cur["total_row_type"] = "LABELLED"
                cur["block_total_quantity"] = to_number(vals[im["quantity"] - 1])[0] if "quantity" in im else None
                cur["block_total_weight_kg"] = to_number(vals[im["total_weight_kg"] - 1])[0] if "total_weight_kg" in im else None
                cur["_total_row"] = r
            state = "post_total"
            continue

        if cur is None:
            stg["row_class"] = "OTHER"
            counts["other_rows"] += 1
            continue

        if state == "expect_pkg":
            stg["row_class"] = "PACKAGE_ROW"
            _fill_package_row(cur, vals, ctx)
            cur["source_package_row"] = r
            state = "pre_items"
            continue

        if state == "pre_items":
            # rows directly after the package row without an 'S/N.' header
            cur["has_item_header"] = 0
            cur["_item_map"] = item_map
            state = "items"

        if state == "items":
            im = cur.get("_item_map") or item_map
            cls = _classify_item_row(vals, im)
            stg["row_class"] = cls
            if cls == "MATERIAL_ITEM":
                counts["material_item_rows"] += 1
                cur["_items"].append(_item_record(vals, im, maxc, r, cur, ctx, stg))
            elif cls == "UNLABELLED_TOTAL":
                counts["unlabelled_total_rows"] += 1
                if cur["total_row_type"] != "LABELLED":
                    cur["total_row_type"] = "UNLABELLED"
                    cur["block_total_quantity"] = to_number(vals[im["quantity"] - 1])[0] if "quantity" in im else None
                    cur["block_total_weight_kg"] = to_number(vals[im["total_weight_kg"] - 1])[0] if "total_weight_kg" in im else None
                    cur["_total_row"] = r
            else:
                counts["empty_template_rows"] += 1
            continue

        # post_total or anything else inside a block
        stg["row_class"] = "POST_TOTAL_OTHER" if state == "post_total" else "OTHER"
        counts["other_rows"] += 1

    return blocks, stg_rows, counts


def _new_block(ws, doc, seq, hdr_row, hdr_vals, pending_meta, maxc):
    labels = {c: label(hdr_vals[c - 1]) for c in range(1, maxc + 1)}
    pmap = _map_columns(labels, PKG_HEADER_RULES)
    for k, v in DEFAULT_PKG_MAP.items():
        pmap.setdefault(k, v)
    invoice = project = shipper = None
    for m in pending_meta:
        pairs = _label_value_pairs(m["_vals"])
        for k, v in pairs.items():
            if k.startswith("invoice no"):
                invoice = raw_text(v).strip() if v is not None else None
            elif k.startswith("project name"):
                project = clean_text(v)
            elif k.startswith("shipper"):
                shipper = clean_text(v)
    start = min([m["source_row"] for m in pending_meta] + [hdr_row])
    return dict(
        batch_id=doc["batch_id"], category=doc["category"], source_document_id=doc["source_document_id"],
        source_sheet=ws.title, source_block_number=seq, source_header_row=hdr_row, source_package_row=None,
        source_block_start_row=start, source_block_end_row=hdr_row,
        invoice_number_original=invoice, project_name_original=project, shipper_original=shipper,
        has_item_header=0, total_row_type="MISSING", block_total_quantity=None, block_total_weight_kg=None,
        package_number_original=None, _pmap=pmap, _items=[], _stg=[], _item_map=None, _total_row=None,
        _nonnumeric={},
    )


def _fill_package_row(cur, vals, ctx):
    cl = ctx["changelog"]
    pmap = cur["_pmap"]
    g = lambda f: vals[pmap[f] - 1] if pmap.get(f) and pmap[f] <= len(vals) else None  # noqa: E731
    pno_raw = raw_text(g("package_number"))
    cur["package_number_original"] = pno_raw
    cur["package_number_normalized"] = norm_package_number(pno_raw, cl)
    p = parse_package_number(cur["package_number_normalized"])
    cur["_parsed"] = p
    cur["package_group"] = p.get("group")
    cur["package_seq"] = p.get("seq")
    cur["package_seq_total"] = p.get("total")
    cur["sub_package_suffix"] = p.get("sub")
    cur["package_base_number_normalized"] = p.get("base") if p.get("sub") else None
    cur["package_type"] = clean_text(g("package_type"))
    cur["package_type_normalized"] = norm_package_type(g("package_type"))
    if cur["package_type"] and cur["package_type_normalized"] != cur["package_type"]:
        cl.hit("N-PTY-01", cur["package_type"], cur["package_type_normalized"])
    for f in PKG_NUMERIC:
        n, ok = to_number(g(f))
        if not ok:
            cur["_nonnumeric"][f] = raw_text(g(f))
        elif isinstance(g(f), float) and n is not None and n != g(f):
            cl.hit("N-NUM-01", g(f), n)
        cur[f] = n
    used = set(pmap.values())
    extra = {get_column_letter(i): raw_text(v) for i, v in enumerate(vals, 1)
             if i not in used and v is not None and clean_text(v)}
    cur["package_extra_json"] = json.dumps(extra, ensure_ascii=False) if extra else None


def _classify_item_row(vals, im):
    g = lambda f: vals[im[f] - 1] if f in im and im[f] <= len(vals) else None  # noqa: E731
    if any(is_meaningful(g(f)) for f in CONTENT_FIELDS):
        return "MATERIAL_ITEM"
    if _num_nonzero(g("quantity")) or _num_nonzero(g("total_weight_kg")):
        return "UNLABELLED_TOTAL"
    return "EMPTY_TEMPLATE"


def _item_record(vals, im, maxc, r, cur, ctx, stg):
    cl = ctx["changelog"]
    g = lambda f: vals[im[f] - 1] if f in im and im[f] <= len(vals) else None  # noqa: E731
    flags, extra = [], {}
    rec = dict(source_row=r, _stg=stg)
    sn = g("source_sn")
    rec["source_sn"] = clean_text(raw_text(sn)) if sn is not None else None
    for f in ["masterlist_sub_item_no", "description_en", "description_cn", "specification",
              "equipment_number", "drawing_number", "remark"]:
        v = g(f)
        if isinstance(v, str) and v.strip() in ERROR_VALUES:
            # an Excel error is not a value: field -> NULL, error encoded, raw cell kept in STG
            code = "EXCEL_ERROR:" + v.strip().strip("#!?").replace("/", "")
            extra[f] = code
            cl.hit("N-ERR-01", f"Excel error value ({code.split(':')[1]}) in {f}", f"NULL + extra_values_json.{f}={code}")
            if "SOURCE_ERROR_VALUE" not in flags:
                flags.append("SOURCE_ERROR_VALUE")
            rec[f] = None
            continue
        rec[f] = _clean_tracked(v, cl, "N-TXT-01")
    rec["unit_of_quantity"] = clean_text(g("unit_of_quantity"))
    rec["unit_of_quantity_normalized"] = norm_unit(g("unit_of_quantity"))
    if rec["unit_of_quantity"] and rec["unit_of_quantity_normalized"] != rec["unit_of_quantity"]:
        cl.hit("N-UNT-01", rec["unit_of_quantity"], rec["unit_of_quantity_normalized"])
    for f in ITEM_NUMERIC:
        n, ok = to_number(g(f))
        if not ok:
            extra[f"nonnumeric_{f}"] = raw_text(g(f))
            flags.append(f"NON_NUMERIC_{f.upper()}")
        elif isinstance(g(f), float) and n is not None and n != g(f):
            cl.hit("N-NUM-01", g(f), n)
        rec[f] = n
    used = set(v for v in im.values())
    for i, v in enumerate(vals, 1):
        if i not in used and v is not None and clean_text(v):
            extra[get_column_letter(i)] = raw_text(v)
    # data-quality flags (row level; never alter values)
    if not rec["source_sn"]:
        flags.append("MISSING_SN")
    if not is_meaningful(rec["description_en"]) and not is_meaningful(rec["description_cn"]) \
            and not ("description_en" in extra or "description_cn" in extra):
        flags.append("MISSING_DESCRIPTION")
        if is_meaningful(rec["masterlist_sub_item_no"]) and not re.fullmatch(r"[\d.\-]+", rec["masterlist_sub_item_no"]):
            flags.append("DESCRIPTION_IN_MASTERLIST_COLUMN")
    if rec["quantity"] is None and "NON_NUMERIC_QUANTITY" not in flags:
        flags.append("MISSING_QUANTITY")
    if not rec["unit_of_quantity_normalized"]:
        flags.append("MISSING_UNIT")
    ref = None
    for f in ("drawing_number", "description_en"):
        m = PKG_LIKE.search(unicodedata.normalize("NFKC", rec.get(f) or ""))
        if m:
            ref = norm_package_number(m.group(0))
            break
    rec["item_type"] = "SUB_PACKAGE_REFERENCE" if ref else "MATERIAL"
    rec["_ref_pkg_norm"] = ref
    rec["_flags"] = flags
    rec["extra_values_json"] = json.dumps(extra, ensure_ascii=False) if extra else None
    return rec


# ----------------------------------------------------------------------------- IMPORT packing list


def parse_import_sheet(ws):
    maxc = min(ws.max_column, 15)
    meta = {}
    hdr = None
    for r in range(1, ws.max_row + 1):
        vals = _row_values(ws, r, maxc)
        if label(vals[0]) in ("s/n", "s/n."):
            hdr = r
            break
        meta.update(_label_value_pairs(vals))
    out = dict(meta={k: raw_text(v) for k, v in meta.items()}, lines=[], totals=None, header_row=hdr)
    if hdr is None:
        return out
    labels = {c: label(ws.cell(hdr, c).value) for c in range(1, maxc + 1)}
    rules = [("sn", lambda l: l.startswith("s/n")), ("sub_item", lambda l: "sub-item" in l),
             ("item", lambda l: l == "item"), ("description", lambda l: "description" in l),
             ("quantity", lambda l: "quantity" in l), ("packages", lambda l: l == "package"),
             ("volume_m3", lambda l: "volume" in l), ("net_weight_kg", lambda l: "n.w" in l),
             ("gross_weight_kg", lambda l: "g.w" in l)]
    cm = _map_columns(labels, rules)
    for r in range(hdr + 1, ws.max_row + 1):
        vals = _row_values(ws, r, maxc)
        if _is_blank(vals):
            continue
        if any(label(v) == "in total" for v in vals):
            out["totals"] = {k: to_number(vals[c - 1])[0] for k, c in cm.items()
                             if k in ("packages", "volume_m3", "net_weight_kg", "gross_weight_kg")}
            out["totals_row"] = r
            break
        line = {k: raw_text(vals[c - 1]) for k, c in cm.items()}
        line["unit"] = raw_text(vals[cm["quantity"]]) if "quantity" in cm else None
        line["row"] = r
        out["lines"].append(line)
    return out


# ----------------------------------------------------------------------------- workbook


def audit_formulas(path, sheet_names):
    """Formula and error-value counts (first 30 columns) – separate read-only passes."""
    res = {}
    wf = openpyxl.load_workbook(path, read_only=True)
    wv = openpyxl.load_workbook(path, read_only=True, data_only=True)
    for name in sheet_names:
        nf = ne = 0
        for rf, rv in zip(wf[name].iter_rows(max_col=30), wv[name].iter_rows(max_col=30)):
            for cf, cv in zip(rf, rv):
                if isinstance(cf.value, str) and cf.value.startswith("="):
                    nf += 1
                if isinstance(cv.value, str) and cv.value.strip() in ERROR_VALUES:
                    ne += 1
        res[name] = (nf, ne)
    wf.close()
    wv.close()
    return res


def parse_workbook(path, doc, ctx):
    log.info("reading %s", path.name)
    wb = openpyxl.load_workbook(path, data_only=True)
    formulas = audit_formulas(path, wb.sheetnames)
    result = dict(sheets=[], summary=None, blocks=[], detail_stg=[], import_pl=None)
    for idx, ws in enumerate(wb.worksheets, 1):
        role = classify_sheet(ws)
        nf, ne = formulas.get(ws.title, (None, None))
        sheet = dict(source_sheet_id=f"{doc['source_document_id']}::{ws.title}",
                     source_document_id=doc["source_document_id"], sheet_name=ws.title, sheet_index=idx,
                     sheet_state=ws.sheet_state, sheet_role=role,
                     in_scope=1 if role in ("SUMMARY", "DETAIL", "IMPORT_PACKING_LIST") else 0,
                     used_range=ws.dimensions, max_row=ws.max_row, max_column=ws.max_column,
                     merged_ranges=len(ws.merged_cells.ranges), formula_cells=nf, error_value_cells=ne,
                     header_row=None, data_start_row=None, data_end_row=None, summary_package_rows=None,
                     detail_blocks=None, material_item_rows=None, empty_template_rows=None,
                     total_rows=None, unlabelled_total_rows=None, metadata_rows=None, notes=None)
        notes = []
        if ws.max_column > 100:
            notes.append(f"Used range inflated to column {ws.max_column} by formatting; scanned first {MAX_SCAN_COLS} columns.")
        if role == "SUMMARY":
            s = parse_summary(ws, doc, ctx)
            result["summary"] = s
            sheet.update(header_row=s["header_row"], data_start_row=s["data_start_row"],
                         data_end_row=s["data_end_row"], summary_package_rows=len(s["packages"]))
            if s["annotations"]:
                notes.append(f"{len(s['annotations'])} cells outside the formal table preserved in SOURCE_ANNOTATIONS.")
        elif role == "DETAIL":
            blocks, stg, counts = parse_detail_sheet(ws, doc, ctx)
            result["blocks"].extend(blocks)
            result["detail_stg"].extend(stg)
            sheet.update(header_row=blocks[0]["source_header_row"] if blocks else None,
                         data_start_row=blocks[0]["source_block_start_row"] if blocks else None,
                         data_end_row=blocks[-1]["source_block_end_row"] if blocks else None,
                         detail_blocks=len(blocks), material_item_rows=counts["material_item_rows"],
                         empty_template_rows=counts["empty_template_rows"], total_rows=counts["total_rows"],
                         unlabelled_total_rows=counts["unlabelled_total_rows"],
                         metadata_rows=counts["metadata_rows"])
            if counts["other_rows"]:
                notes.append(f"{counts['other_rows']} rows outside any block region (staged as OTHER/POST_TOTAL_OTHER).")
        elif role == "IMPORT_PACKING_LIST":
            result["import_pl"] = parse_import_sheet(ws)
            result["import_pl"]["sheet"] = ws.title
            sheet.update(header_row=result["import_pl"]["header_row"])
            notes.append("Invoice-level commercial packing list; feeds INVOICE_REGISTER only.")
        elif role == "LEGACY_SALES_CONTRACT":
            notes.append("Hidden legacy sales-contract template (Invoice HHI-001; all formulas return reference errors). Out of scope.")
        elif role == "SHIPPING_MARK_TEMPLATE":
            notes.append("Hidden shipping-mark template from an earlier shipment. Out of scope.")
        sheet["notes"] = " ".join(notes) or None
        result["sheets"].append(sheet)
    wb.close()
    if result["summary"] is None:
        raise ValueError(f"{doc['source_document_id']}: no '{SUMMARY_SHEET}' sheet")
    return result
