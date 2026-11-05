"""
Web app data export for the Logistics Readiness dashboard.

Writes the same dataset twice:
  output/webapp/logistics_readiness_data.js    window.LOGISTICS_READINESS_DATA = {...};
                                               (loads with a <script> tag, works from file://)
  output/webapp/logistics_readiness_data.json  (for the dashboard's "Load data file" button / HTTP fetch)

Tables are columnar ({"cols": [...], "rows": [[...]]}) to keep the file small. Items reference
their detail package by array index ("d"). All values come from the SQLite database written by
the ETL, so the dashboard shows exactly what the database holds.
"""

import json
import logging
import sqlite3
from pathlib import Path

from . import __version__ as ETL_VERSION

log = logging.getLogger("lpl.webapp")

PKG_SQL = """
SELECT pm.package_id, pm.batch_id, pm.category, pm.source_sn, pm.package_number_original, pm.package_group,
       pm.equipment_number, pm.description_en, pm.description_cn, pm.package_quantity, pm.package_type,
       pm.length_mm, pm.width_mm, pm.height_mm, pm.volume_m3, pm.net_weight_kg, pm.gross_weight_kg,
       pm.mdr_number, pm.mdr_status, pm.rfs_material_receiving, pm.inspection_date_original, pm.received_quantity,
       pm.remark, pm.site_annotation, pm.source_document_id, pm.source_sheet, pm.source_row,
       r.system_group, r.pl_verified, r.linked_detail_packages, r.split_sub_packages, r.mdr_state, r.mdr_state_label,
       r.mdr_credit, r.rfs_raised, r.inspected, r.on_site, r.on_site_evidence, r.site_location, r.receiving_date,
       r.inspection_dates, r.open_issue_count, r.blocking_issue_count, r.max_open_severity, r.gate_pl_score,
       r.gate_mdr_score, r.gate_site_score, r.gate_inspection_score, r.readiness_score, r.readiness_status,
       r.next_action, v.material_items, v.package_mapping_status
FROM PACKAGE_MASTER pm
JOIN PACKAGE_READINESS r ON r.package_id = pm.package_id
JOIN v_package_list v ON v.package_id = pm.package_id
ORDER BY pm.batch_id, pm.category, pm.source_sn
"""

DPK_SQL = """
SELECT dp.detail_package_id, dp.package_id, dp.parent_detail_package_id, dp.batch_id, dp.category,
       dp.package_number_original, dp.sub_package_suffix, dp.package_type, dp.length_mm, dp.width_mm, dp.height_mm,
       dp.volume_m3, dp.net_weight_kg, dp.gross_weight_kg, dp.invoice_number_original, dp.item_count,
       dp.item_weight_sum_kg, dp.is_split_parent, dp.is_split_child, dp.mapping_status, dp.source_document_id,
       dp.source_sheet, dp.source_header_row, dp.source_block_start_row, dp.source_block_end_row
FROM DETAIL_PACKAGES dp
ORDER BY dp.source_document_id, dp.source_sheet, dp.source_header_row
"""

ITEM_SQL = """
SELECT it.detail_package_id, it.line_seq, it.source_sn, it.description_en, it.description_cn, it.specification,
       it.quantity, COALESCE(it.unit_of_quantity_normalized, it.unit_of_quantity) AS unit, it.unit_weight_kg,
       it.total_weight_kg, it.equipment_number, it.drawing_number, it.remark, it.item_type, it.source_row, it.dq_flags
FROM PACKAGE_DETAIL it
ORDER BY it.detail_package_id, it.line_seq
"""

ISSUE_SQL = """
SELECT i.issue_id, i.severity, i.issue_type, i.issue_subtype, i.issue_scope, i.batch_id, i.category, i.package_number,
       i.package_id, i.detail_package_id, i.description, i.proposed_resolution, i.resolution_status,
       i.source_document_id, i.source_sheet, i.source_row
FROM MAPPING_ISSUES i
ORDER BY CASE i.severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END, i.issue_type
"""


def _table(con, sql):
    cur = con.execute(sql)
    cols = [d[0] for d in cur.description]
    return cols, [list(r) for r in cur.fetchall()]


def write_webapp_data(ctx, db_path, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    try:
        pc, pr = _table(con, PKG_SQL)
        dc, dr = _table(con, DPK_SQL)
        ic, ir = _table(con, ITEM_SQL)
        sc, sr = _table(con, ISSUE_SQL)
        didx = {row[0]: i for i, row in enumerate(dr)}
        items_cols = ["d"] + ic[1:]
        items_rows = [[didx[r[0]]] + r[1:] for r in ir]
        status_ref = [dict(zip(("code", "label", "short", "color", "sort", "rule", "action"), r)) for r in
                      con.execute("SELECT status_code, label, short_label, color, sort_order, rule, action "
                                  "FROM REFERENCE_READINESS_STATUS ORDER BY sort_order")]
        docs = [dict(zip(("id", "name", "batch", "category", "invoice"), r)) for r in con.execute(
            "SELECT source_document_id, source_document_name, batch_id, category, summary_invoice_number "
            "FROM SOURCE_DOCUMENTS ORDER BY source_document_id")]
        project = con.execute("SELECT project_name_original, COUNT(*) n FROM DETAIL_PACKAGES WHERE project_name_original "
                              "IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 1").fetchone()
        hist = con.execute("SELECT import_id, finished_at, status FROM IMPORT_HISTORY ORDER BY started_at DESC LIMIT 1").fetchone()
        checks = dict(con.execute("SELECT status, COUNT(*) FROM DATA_QUALITY_CHECKS GROUP BY status").fetchall())
    finally:
        con.close()
    rules = ctx["readiness_rules"]
    data = dict(
        meta=dict(title="Logistics Readiness", project_name=project[0] if project else None,
                  generated_at=ctx["imported_at"], import_id=ctx["import_id"], etl_version=ETL_VERSION,
                  import_status=hist[2] if hist else None, source_fingerprint=ctx["fingerprint"][:16],
                  data_quality=checks, documents=docs,
                  counts=dict(packages=len(pr), detail_packages=len(dr), items=len(items_rows), issues=len(sr))),
        rules=dict(version=rules["version"], gates=rules["gates"], mdr_credit=rules["mdr_credit"],
                   mdr_state_labels=rules["mdr_state_labels"], blocking_issue_types=rules["blocking_issue_types"]),
        status_ref=status_ref,
        packages=dict(cols=pc, rows=pr),
        detail_packages=dict(cols=dc, rows=dr),
        items=dict(cols=items_cols, rows=items_rows),
        issues=dict(cols=sc, rows=sr),
    )
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"), default=str)
    (out_dir / "logistics_readiness_data.json").write_text(payload, encoding="utf-8")
    (out_dir / "logistics_readiness_data.js").write_text(
        "/* Generated by the Logistics ETL - confidential project data, do not commit. */\n"
        f"window.LOGISTICS_READINESS_DATA = {payload};\n", encoding="utf-8")
    log.info("web app data written: %s (%.1f MB)", out_dir, len(payload.encode("utf-8")) / 1e6)
    return data
