"""
Writers: SQLite (atomic rebuild, history carried over), CSV, generated Markdown.
"""

import csv
import datetime as dt
import json
import logging
import os
import sqlite3
from collections import Counter
from pathlib import Path

from . import __version__ as ETL_VERSION
from . import schema

log = logging.getLogger("lpl.export")

# ----------------------------------------------------------------------------- views
# Portable SQL (SQLite + PostgreSQL): no GROUP_CONCAT/STRING_AGG, no SQLite-only functions.
VIEWS = {
    "v_dashboard_kpi": """
SELECT
  (SELECT COUNT(*) FROM PACKAGE_MASTER)                                        AS total_packages,
  (SELECT COUNT(*) FROM DETAIL_PACKAGES)                                       AS total_detail_packages,
  (SELECT COUNT(*) FROM PACKAGE_DETAIL WHERE item_type = 'MATERIAL')           AS total_material_items,
  (SELECT COUNT(*) FROM PACKAGE_DETAIL WHERE item_type <> 'MATERIAL')          AS total_manifest_lines,
  (SELECT ROUND(SUM(volume_m3), 3) FROM PACKAGE_MASTER)                        AS total_volume_m3,
  (SELECT ROUND(SUM(net_weight_kg), 3) FROM PACKAGE_MASTER)                    AS total_net_weight_kg,
  (SELECT ROUND(SUM(gross_weight_kg), 3) FROM PACKAGE_MASTER)                  AS total_gross_weight_kg,
  (SELECT COUNT(*) FROM DETAIL_PACKAGES WHERE package_id IS NOT NULL)          AS linked_detail_packages,
  (SELECT COUNT(*) FROM DETAIL_PACKAGES WHERE package_id IS NULL)              AS unlinked_detail_packages,
  (SELECT COUNT(*) FROM PACKAGE_MAPPING WHERE mapping_status = 'UNMATCHED_SUMMARY') AS unmatched_summary_packages,
  (SELECT COUNT(*) FROM MAPPING_ISSUES WHERE resolution_status = 'OPEN')       AS open_issues,
  (SELECT COUNT(*) FROM MAPPING_ISSUES WHERE resolution_status = 'OPEN' AND severity = 'HIGH') AS open_issues_high
""",
    "v_batch_category_summary": """
SELECT pm.batch_id, rb.batch_name, pm.category,
       COUNT(*)                              AS packages,
       ROUND(SUM(pm.volume_m3), 3)           AS volume_m3,
       ROUND(SUM(pm.net_weight_kg), 3)       AS net_weight_kg,
       ROUND(SUM(pm.gross_weight_kg), 3)     AS gross_weight_kg,
       COALESCE(MAX(dp.detail_packages), 0)  AS detail_packages,
       COALESCE(MAX(dp.split_children), 0)   AS split_sub_packages,
       COALESCE(MAX(dp.unlinked), 0)         AS unlinked_detail_packages,
       COALESCE(MAX(it.material_items), 0)   AS material_items,
       SUM(CASE WHEN pm.mdr_status_code = 'APV' THEN 1 ELSE 0 END) AS mdr_approved,
       SUM(CASE WHEN pm.inspection_date IS NOT NULL OR pm.inspection_date_original IS NOT NULL THEN 1 ELSE 0 END) AS inspected_packages
FROM PACKAGE_MASTER pm
JOIN REFERENCE_BATCH rb ON rb.batch_id = pm.batch_id
LEFT JOIN (SELECT batch_id, category, COUNT(*) AS detail_packages,
                  SUM(is_split_child) AS split_children,
                  SUM(CASE WHEN package_id IS NULL THEN 1 ELSE 0 END) AS unlinked
           FROM DETAIL_PACKAGES GROUP BY batch_id, category) dp
       ON dp.batch_id = pm.batch_id AND dp.category = pm.category
LEFT JOIN (SELECT batch_id, category, COUNT(*) AS material_items
           FROM PACKAGE_DETAIL WHERE item_type = 'MATERIAL' GROUP BY batch_id, category) it
       ON it.batch_id = pm.batch_id AND it.category = pm.category
GROUP BY pm.batch_id, rb.batch_name, pm.category
""",
    "v_mdr_status_distribution": """
SELECT pm.batch_id, pm.category, pm.mdr_status_code, ms.label AS mdr_status_label, COUNT(*) AS packages
FROM PACKAGE_MASTER pm LEFT JOIN REFERENCE_MDR_STATUS ms ON ms.mdr_status_code = pm.mdr_status_code
GROUP BY pm.batch_id, pm.category, pm.mdr_status_code, ms.label
""",
    "v_mapping_status_distribution": """
SELECT m.batch_id, m.category, m.mapping_status, rs.is_linked, rs.sort_order, COUNT(*) AS mapping_rows
FROM PACKAGE_MAPPING m JOIN REFERENCE_MAPPING_STATUS rs ON rs.status_code = m.mapping_status
GROUP BY m.batch_id, m.category, m.mapping_status, rs.is_linked, rs.sort_order
""",
    "v_package_list": """
SELECT pm.package_id, pm.batch_id, pm.category, pm.source_sn, pm.package_number_original,
       pm.package_number_normalized, pm.package_group, pm.equipment_number, pm.description_en, pm.description_cn,
       pm.package_quantity, pm.package_type, pm.length_mm, pm.width_mm, pm.height_mm, pm.volume_m3,
       pm.net_weight_kg, pm.gross_weight_kg, pm.mdr_number, pm.mdr_status, pm.mdr_status_code,
       pm.rfs_material_receiving, pm.inspection_date, pm.inspection_date_original, pm.received_quantity, pm.remark,
       pm.site_annotation, pm.source_document_id, pm.source_sheet, pm.source_row,
       COALESCE(d.linked_detail_packages, 0) AS linked_detail_packages,
       COALESCE(d.split_sub_packages, 0)     AS split_sub_packages,
       COALESCE(i.material_items, 0)         AS material_items,
       CASE WHEN COALESCE(d.linked_detail_packages, 0) = 0 THEN 'UNMATCHED_SUMMARY'
            WHEN COALESCE(d.split_sub_packages, 0) > 0 THEN 'SPLIT_PACKAGE'
            WHEN COALESCE(d.alias_links, 0) > 0 THEN 'CONFIRMED_ALIAS'
            WHEN COALESCE(d.normalized_links, 0) > 0 THEN 'NORMALIZED_MATCH'
            ELSE 'EXACT_MATCH' END           AS package_mapping_status,
       COALESCE(x.open_issues, 0)            AS open_issues,
       COALESCE(x.open_high, 0)              AS open_issues_high
FROM PACKAGE_MASTER pm
LEFT JOIN (SELECT package_id, COUNT(*) AS linked_detail_packages, SUM(is_split_child) AS split_sub_packages,
                  SUM(CASE WHEN mapping_status = 'CONFIRMED_ALIAS' THEN 1 ELSE 0 END) AS alias_links,
                  SUM(CASE WHEN mapping_status = 'NORMALIZED_MATCH' THEN 1 ELSE 0 END) AS normalized_links
           FROM DETAIL_PACKAGES WHERE package_id IS NOT NULL GROUP BY package_id) d ON d.package_id = pm.package_id
LEFT JOIN (SELECT package_id, COUNT(*) AS material_items FROM PACKAGE_DETAIL
           WHERE item_type = 'MATERIAL' AND package_id IS NOT NULL GROUP BY package_id) i ON i.package_id = pm.package_id
LEFT JOIN (SELECT package_id, COUNT(*) AS open_issues,
                  SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) AS open_high
           FROM MAPPING_ISSUES WHERE resolution_status = 'OPEN' AND package_id IS NOT NULL GROUP BY package_id) x
       ON x.package_id = pm.package_id
""",
    "v_detail_package_list": """
SELECT dp.detail_package_id, dp.package_id, pm.package_number_original AS summary_package_number,
       dp.parent_detail_package_id, par.package_number_original AS parent_detail_package_number,
       dp.batch_id, dp.category, dp.package_number_original, dp.sub_package_suffix, dp.package_type,
       dp.length_mm, dp.width_mm, dp.height_mm, dp.volume_m3, dp.net_weight_kg, dp.gross_weight_kg,
       dp.invoice_number_original, dp.item_count, dp.item_weight_sum_kg, dp.block_total_weight_kg,
       dp.is_split_parent, dp.is_split_child, dp.mapping_status, dp.mapping_method,
       dp.source_document_id, dp.source_sheet, dp.source_block_number, dp.source_header_row,
       dp.source_block_start_row, dp.source_block_end_row
FROM DETAIL_PACKAGES dp
LEFT JOIN PACKAGE_MASTER pm ON pm.package_id = dp.package_id
LEFT JOIN DETAIL_PACKAGES par ON par.detail_package_id = dp.parent_detail_package_id
""",
    "v_material_items": """
SELECT it.item_id, it.detail_package_id, dp.package_number_original AS detail_package_number,
       it.package_id, pm.package_number_original AS summary_package_number,
       it.batch_id, it.category, it.line_seq, it.source_sn, it.masterlist_sub_item_no, it.description_en,
       it.description_cn, it.specification, it.quantity, it.unit_of_quantity, it.unit_of_quantity_normalized,
       it.unit_weight_kg, it.total_weight_kg, it.equipment_number, it.drawing_number, it.remark, it.item_type,
       it.referenced_detail_package_id, it.dq_flags, it.source_document_id, it.source_sheet, it.source_row
FROM PACKAGE_DETAIL it
JOIN DETAIL_PACKAGES dp ON dp.detail_package_id = it.detail_package_id
LEFT JOIN PACKAGE_MASTER pm ON pm.package_id = it.package_id
""",
    "v_package_relationships": """
SELECT m.mapping_id, m.batch_id, m.category, m.package_id, m.source_package_number, m.detail_package_id,
       m.target_package_number, m.matching_level, m.matching_method, m.confidence_level, m.confidence_score,
       m.mapping_status, m.is_linked, m.mapping_note, m.review_decision, m.reviewed_by, m.reviewed_at,
       dp.source_sheet AS detail_sheet, dp.source_header_row AS detail_header_row,
       pm.source_row AS summary_row
FROM PACKAGE_MAPPING m
LEFT JOIN DETAIL_PACKAGES dp ON dp.detail_package_id = m.detail_package_id
LEFT JOIN PACKAGE_MASTER pm ON pm.package_id = m.package_id
""",
    "v_open_issues": """
SELECT i.*, CASE i.severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END AS severity_rank
FROM MAPPING_ISSUES i WHERE i.resolution_status = 'OPEN'
""",
    "v_search_index": """
SELECT 'PACKAGE' AS entity_type, pm.package_id AS entity_id, pm.package_id, NULL AS detail_package_id,
       pm.batch_id, pm.category, pm.package_number_original AS label,
       UPPER(COALESCE(pm.package_number_normalized, '') || ' ' || COALESCE(pm.equipment_number, '') || ' ' ||
             COALESCE(pm.description_en, '') || ' ' || COALESCE(pm.description_cn, '') || ' ' ||
             COALESCE(pm.mdr_number, '') || ' ' || COALESCE(pm.rfs_material_receiving, '')) AS search_text
FROM PACKAGE_MASTER pm
UNION ALL
SELECT 'DETAIL_PACKAGE', dp.detail_package_id, dp.package_id, dp.detail_package_id, dp.batch_id, dp.category,
       dp.package_number_original,
       UPPER(COALESCE(dp.package_number_normalized, '') || ' ' || COALESCE(dp.invoice_number_original, ''))
FROM DETAIL_PACKAGES dp
UNION ALL
SELECT 'ITEM', it.item_id, it.package_id, it.detail_package_id, it.batch_id, it.category,
       COALESCE(it.description_en, it.description_cn, it.drawing_number),
       UPPER(COALESCE(it.description_en, '') || ' ' || COALESCE(it.description_cn, '') || ' ' ||
             COALESCE(it.drawing_number, '') || ' ' || COALESCE(it.equipment_number, '') || ' ' ||
             COALESCE(it.masterlist_sub_item_no, '') || ' ' || COALESCE(it.remark, ''))
FROM PACKAGE_DETAIL it
""",
    # ------------------------------------------------------------------ logistics readiness
    "v_readiness_summary": """
SELECT r.batch_id, r.category,
       COUNT(*)                                                            AS packages,
       ROUND(SUM(r.gross_weight_kg) / 1000.0, 3)                          AS gross_weight_t,
       SUM(CASE WHEN r.readiness_status = 'READY_FOR_CONSTRUCTION' THEN 1 ELSE 0 END) AS ready_packages,
       ROUND(SUM(CASE WHEN r.readiness_status = 'READY_FOR_CONSTRUCTION' THEN r.gross_weight_kg ELSE 0 END) / 1000.0, 3) AS ready_t,
       SUM(r.pl_verified)                                                  AS pl_verified,
       SUM(CASE WHEN r.mdr_credit >= 1 THEN 1 ELSE 0 END)                  AS mdr_ok,
       SUM(r.on_site)                                                      AS on_site,
       SUM(r.inspected)                                                    AS inspected,
       SUM(CASE WHEN r.readiness_status = 'BLOCKED' THEN 1 ELSE 0 END)     AS blocked,
       ROUND(AVG(r.readiness_score), 2)                                    AS readiness_index_count,
       ROUND(SUM(r.readiness_score * r.gross_weight_kg) / NULLIF(SUM(r.gross_weight_kg), 0), 2) AS readiness_index_tonnage
FROM PACKAGE_READINESS r
GROUP BY r.batch_id, r.category
""",
    "v_readiness_by_system": """
SELECT r.system_group, COUNT(*) AS packages, ROUND(SUM(r.gross_weight_kg) / 1000.0, 3) AS gross_weight_t,
       SUM(CASE WHEN r.readiness_status = 'READY_FOR_CONSTRUCTION' THEN 1 ELSE 0 END) AS ready_packages,
       SUM(CASE WHEN r.mdr_credit >= 1 THEN 1 ELSE 0 END) AS mdr_ok, SUM(r.inspected) AS inspected,
       ROUND(AVG(r.readiness_score), 2) AS readiness_index_count,
       ROUND(SUM(r.readiness_score * r.gross_weight_kg) / NULLIF(SUM(r.gross_weight_kg), 0), 2) AS readiness_index_tonnage
FROM PACKAGE_READINESS r
GROUP BY r.system_group
""",
    "v_readiness_by_location": """
SELECT r.batch_id, r.category, COALESCE(r.site_location_group, 'Not on site') AS site_location_group,
       r.on_site, COUNT(*) AS packages, ROUND(SUM(r.gross_weight_kg) / 1000.0, 3) AS gross_weight_t,
       SUM(CASE WHEN r.readiness_status = 'READY_FOR_CONSTRUCTION' THEN 1 ELSE 0 END) AS ready,
       SUM(CASE WHEN r.readiness_status = 'INSPECTED_MDR_PENDING' THEN 1 ELSE 0 END) AS inspected_mdr_pending,
       SUM(CASE WHEN r.readiness_status = 'ON_SITE_AWAITING_INSPECTION' THEN 1 ELSE 0 END) AS on_site_no_rfs,
       SUM(CASE WHEN r.on_site = 0 THEN 1 ELSE 0 END) AS not_on_site
FROM PACKAGE_READINESS r
GROUP BY r.batch_id, r.category, COALESCE(r.site_location_group, 'Not on site'), r.on_site
""",
    "v_readiness_status_distribution": """
SELECT r.batch_id, r.category, r.readiness_status, s.label, s.sort_order, COUNT(*) AS packages,
       ROUND(SUM(r.gross_weight_kg) / 1000.0, 3) AS gross_weight_t
FROM PACKAGE_READINESS r JOIN REFERENCE_READINESS_STATUS s ON s.status_code = r.readiness_status
GROUP BY r.batch_id, r.category, r.readiness_status, s.label, s.sort_order
""",
    "v_receiving_curve": """
SELECT d.receiving_date, d.packages_received, d.tonnage_received_t,
       SUM(d.packages_received) OVER (ORDER BY d.receiving_date)  AS cumulative_packages,
       ROUND(SUM(d.tonnage_received_t) OVER (ORDER BY d.receiving_date), 3) AS cumulative_tonnage_t
FROM (SELECT receiving_date, COUNT(*) AS packages_received, ROUND(SUM(gross_weight_kg) / 1000.0, 3) AS tonnage_received_t
      FROM PACKAGE_READINESS WHERE receiving_date IS NOT NULL GROUP BY receiving_date) d
""",
}


def views_ddl():
    return [f"CREATE VIEW IF NOT EXISTS {name} AS{sql.rstrip()};" for name, sql in VIEWS.items()]


# ----------------------------------------------------------------------------- rows per table


def _clean(v):
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, (dt.date, dt.datetime)):
        return v.isoformat()
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False, default=str)
    return v


def table_rows(ctx, history_row, audit_rows):
    docs = [{k: v for k, v in d.items() if not k.startswith("_") and k not in ("batch_no", "batch_name")}
            for d in ctx["docs"].values()]
    mdr = []
    for p in ctx["packages"]:
        for i, m in enumerate(p.get("_mdr_list") or [], 1):
            mdr.append(dict(package_id=p["package_id"], mdr_seq=i, mdr_number=m))
    ann = [dict(annotation_id=f"{a['_doc']['source_document_id']}::Summary::{a['cell_ref']}",
                source_document_id=a["_doc"]["source_document_id"], source_sheet="Summary Packing List",
                source_row=a["row"], cell_ref=a["cell_ref"], value_original=a["value"],
                annotation_context=a["context"], row_package_id=a.get("row_package_id"),
                referenced_package_id=a.get("referenced_package_id")) for a in ctx["annotations"]]
    out = dict(ctx["reference"])
    out.update(
        IMPORT_HISTORY=[history_row], SOURCE_DOCUMENTS=docs, SOURCE_SHEETS=ctx["sheets"],
        PACKAGE_MASTER=ctx["packages"], PACKAGE_MDR=mdr, DETAIL_PACKAGES=ctx["blocks"], PACKAGE_DETAIL=ctx["items"],
        STG_SUMMARY_ROWS=ctx["summary_stg"], STG_DETAIL_ROWS=ctx["detail_stg"], SOURCE_ANNOTATIONS=ann,
        PACKAGE_MAPPING=ctx["mappings"], MAPPING_ISSUES=ctx["issues"], PACKAGE_READINESS=ctx["readiness"],
        INVOICE_REGISTER=ctx["invoices"],
        SERIES_REGISTER=ctx["series"], DATA_QUALITY_CHECKS=ctx["checks"], CHANGE_LOG=ctx["changelog_rows"],
        DATA_DICTIONARY=schema.dictionary_rows(), AUDIT_LOG=audit_rows)
    return out


def _tuples(table, rows):
    cols = schema.columns(table)
    return cols, [tuple(_clean(r.get(c)) for c in cols) for r in rows]


# ----------------------------------------------------------------------------- sqlite


def write_sqlite(ctx, db_path, started, status):
    db_path = Path(db_path)
    tmp = db_path.with_name(db_path.name + ".tmp")
    if tmp.exists():
        tmp.unlink()
    import_id = ctx["import_id"]
    history = dict(import_id=import_id, started_at=ctx["imported_at"], finished_at=None, etl_version=ETL_VERSION,
                   status="RUNNING", source_fingerprint=ctx["fingerprint"], packages_loaded=len(ctx["packages"]),
                   detail_packages_loaded=len(ctx["blocks"]), items_loaded=len(ctx["items"]),
                   issues_logged=len(ctx["issues"]), checks_failed=None, message=None)
    audit_rows = list(ctx.get("_audit_rows") or [])
    con = sqlite3.connect(tmp)
    try:
        con.execute("PRAGMA foreign_keys = ON")
        for stmt in schema.ddl():
            con.execute(stmt)
        for stmt in views_ddl():
            con.execute(stmt)
        rows = table_rows(ctx, history, [])
        with con:
            con.execute("PRAGMA defer_foreign_keys = ON")
            _carry_history(db_path, con)
            for t in schema.LOAD_ORDER:
                if t == "AUDIT_LOG":
                    continue
                cols, data = _tuples(t, rows[t])
                if data:
                    con.executemany(f"INSERT INTO {t} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", data)
                ctx["audit"]("TABLE_LOADED", t, f"{len(data)} rows")
        # post-load integrity checks (recorded as DATA_QUALITY_CHECKS)
        fk = con.execute("PRAGMA foreign_key_check").fetchall()
        integ = con.execute("PRAGMA integrity_check").fetchone()[0]
        extra = [
            dict(check_id="C60", check_group="INTEGRITY", check_name="SQLite foreign key violations (PRAGMA foreign_key_check)",
                 scope="ALL", expected_value="0", actual_value=str(len(fk)), status="PASS" if not fk else "FAIL",
                 note=None if not fk else str(Counter(r[0] for r in fk))),
            dict(check_id="C61", check_group="INTEGRITY", check_name="SQLite integrity_check", scope="ALL",
                 expected_value="ok", actual_value=integ, status="PASS" if integ == "ok" else "FAIL", note=None),
        ]
        for v in VIEWS:
            try:
                con.execute(f"SELECT COUNT(*) FROM {v}").fetchone()
                extra.append(dict(check_id=f"C62-{v}", check_group="INTEGRITY", check_name=f"View {v} executes",
                                  scope="ALL", expected_value="ok", actual_value="ok", status="PASS", note=None))
            except sqlite3.Error as e:
                extra.append(dict(check_id=f"C62-{v}", check_group="INTEGRITY", check_name=f"View {v} executes",
                                  scope="ALL", expected_value="ok", actual_value=str(e), status="FAIL", note=None))
        ctx["checks"].extend(extra)
        fails = [c for c in ctx["checks"] if c["status"] == "FAIL"]
        status = "SUCCESS" if not fails else "SUCCESS_WITH_WARNINGS"
        ctx["run_status"] = status
        with con:
            cols, data = _tuples("DATA_QUALITY_CHECKS", extra)
            con.executemany(f"INSERT INTO DATA_QUALITY_CHECKS ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", data)
            ctx["audit"]("RUN_COMPLETE", "IMPORT_HISTORY", f"status={status}; failed checks={len(fails)}")
            arows = [dict(r) for r in ctx["_audit_source"]()]
            cols, data = _tuples("AUDIT_LOG", arows)
            con.executemany(f"INSERT INTO AUDIT_LOG ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", data)
            finished = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
            con.execute("UPDATE IMPORT_HISTORY SET finished_at=?, status=?, checks_failed=?, message=? WHERE import_id=?",
                        (finished, status, len(fails),
                         f"{len(ctx['packages'])} packages / {len(ctx['blocks'])} detail packages / "
                         f"{len(ctx['items'])} items / {len(ctx['issues'])} issues", import_id))
        con.execute("VACUUM")
    finally:
        con.close()
    os.replace(tmp, db_path)
    log.info("SQLite written: %s", db_path)


def _carry_history(old_path, con):
    if not old_path.exists():
        return
    try:
        old = sqlite3.connect(f"file:{old_path}?mode=ro", uri=True)
    except sqlite3.Error:
        return
    try:
        for t in ("IMPORT_HISTORY", "AUDIT_LOG"):
            try:
                ocols = [r[1] for r in old.execute(f"PRAGMA table_info({t})")]
            except sqlite3.Error:
                continue
            cols = [c for c in schema.columns(t) if c in ocols]
            if not cols:
                continue
            data = old.execute(f"SELECT {', '.join(cols)} FROM {t}").fetchall()
            con.executemany(f"INSERT OR IGNORE INTO {t} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", data)
    finally:
        old.close()


def record_failure(db_path, started, version, message):
    """Best effort: append a FAILED run to the existing database (if any)."""
    db_path = Path(db_path)
    if not db_path.exists():
        return
    try:
        con = sqlite3.connect(db_path)
        with con:
            iid = "IMP-" + started.strftime("%Y%m%dT%H%M%S") + f"{started.microsecond // 1000:03d}Z"
            con.execute("INSERT OR REPLACE INTO IMPORT_HISTORY (import_id, started_at, finished_at, etl_version, status, "
                        "source_fingerprint, message) VALUES (?,?,?,?,?,?,?)",
                        (iid, started.isoformat(), dt.datetime.now(dt.timezone.utc).isoformat(), version, "FAILED",
                         "n/a", message[:2000]))
        con.close()
    except sqlite3.Error:
        pass


# ----------------------------------------------------------------------------- csv


def write_csvs(ctx, db_path, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    try:
        for t in schema.LOAD_ORDER:
            cols = schema.columns(t)
            cur = con.execute(f"SELECT {', '.join(cols)} FROM {t} ORDER BY rowid")
            with open(out_dir / f"{t}.csv", "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(cols)
                w.writerows(cur)
    finally:
        con.close()
    log.info("CSV written: %s", out_dir)


# ----------------------------------------------------------------------------- markdown (generated)


def _md_escape(s):
    return "" if s is None else str(s).replace("|", "\\|").replace("\n", " ")


def write_markdown(ctx, db_path, docs_dir):
    docs_dir = Path(docs_dir)
    docs_dir.mkdir(parents=True, exist_ok=True)
    # ---------- data dictionary
    L = ["# Logistics Data Dictionary", "",
         f"_Generated by the ETL (version {ETL_VERSION}) from `etl/lpl/schema.py` - do not edit by hand._", "",
         "Types are portable between SQLite and PostgreSQL (`TEXT`, `INTEGER`, `DOUBLE PRECISION`, `DATE`, `TIMESTAMP`). "
         "Dates are ISO-8601 text in SQLite. Flags are `INTEGER` 0/1.", "",
         "Layers: **REFERENCE** (lookups) · **LINEAGE** (source register) · **RAW** (unmodified staging rows) · "
         "**ANALYTICS** (logistics readiness) · "
         "**CORE** (normalised master data) · **CONTROL** (mapping exceptions, checks, change log, history).", "",
         "## Tables", "", "| Table | Layer | Rows (this run) | Description |", "|---|---|---:|---|"]
    con = sqlite3.connect(db_path)
    counts = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in schema.LOAD_ORDER}
    con.close()
    for t in schema.LOAD_ORDER:
        L.append(f"| [{t}](#{t.lower()}) | {schema.T[t]['layer']} | {counts[t]:,} | {_md_escape(schema.T[t]['description'])} |")
    L += ["", "## Views (web-app query layer)", "", "| View | Purpose |", "|---|---|"]
    purposes = dict(v_readiness_summary="Logistics readiness KPIs per Batch x Category (count & tonnage weighted).",
                    v_readiness_by_system="Readiness per system / commodity group.",
                    v_readiness_by_location="Material on site per location (laydown / Askara / camp) and batch x category, with status split.",
                    v_readiness_status_distribution="Readiness status distribution (donut / stacked bars).",
                    v_receiving_curve="Site receiving S-curve: packages and tonnage inspected per date, cumulative.",
                    v_dashboard_kpi="Level 1 dashboard KPI tiles (single row).",
                    v_batch_category_summary="Level 1-3: statistics per Batch x Category.",
                    v_mdr_status_distribution="MDR status distribution chart.",
                    v_mapping_status_distribution="Mapping status distribution chart.",
                    v_package_list="Level 4 Summary Packing List grid with drill-down counts and roll-up mapping status.",
                    v_detail_package_list="Level 5 linked Detail blocks (with parent/child split structure).",
                    v_material_items="Level 6 material items with reverse navigation to Detail block and Summary package.",
                    v_package_relationships="Package relationship inspector (all mapping rows incl. proposals).",
                    v_open_issues="Mapping exception review queue.",
                    v_search_index="Global search (packages, detail packages, items) - LIKE / trigram friendly.")
    for v in VIEWS:
        L.append(f"| `{v}` | {purposes.get(v, '')} |")
    for t in schema.LOAD_ORDER:
        spec = schema.T[t]
        L += ["", f"## {t}", "", f"**Layer:** {spec['layer']} · **Rows:** {counts[t]:,}", "", _md_escape(spec["description"]), "",
              "| # | Column | Type | Key | Null | Description | Source / derivation |", "|---:|---|---|---|---|---|---|"]
        for r in [x for x in schema.dictionary_rows() if x["table_name"] == t]:
            key = ("PK" if r["is_primary_key"] else "") + (f" FK→{r['foreign_key']}" if r["foreign_key"] else "")
            L.append(f"| {r['ordinal']} | `{r['column_name']}` | {r['data_type']} | {key.strip()} | "
                     f"{'Y' if r['is_nullable'] else 'N'} | {_md_escape(r['description'])} | {_md_escape(r['source_reference'])} |")
    (docs_dir / "LOGISTICS_DATA_DICTIONARY.md").write_text("\n".join(L) + "\n", encoding="utf-8")

    # ---------- source audit report
    A = ["# Logistics Source Audit Report", "",
         f"_Generated by the ETL (version {ETL_VERSION}), import `{ctx['import_id']}`._", "",
         "Every worksheet of the four original workbooks was opened read-only (cached values). Formula cells were counted in a "
         "second pass. Row classes below account for **every non-blank row** - nothing is silently dropped.", "",
         "## Workbooks", "", "| Document | Batch | Cat. | File | SHA-256 (16) | Sheets | Summary invoice | Summary packages | Detail blocks | Material items |",
         "|---|---|---|---|---|---:|---|---:|---:|---:|"]
    for d in ctx["docs"].values():
        did = d["source_document_id"]
        A.append(f"| {did} | {d['batch_id']} | {d['category']} | {_md_escape(d['source_document_name'])} | `{d['file_sha256'][:16]}` | "
                 f"{d['sheet_count']} | {d['summary_invoice_number']} | {sum(p['source_document_id'] == did for p in ctx['packages'])} | "
                 f"{sum(b['source_document_id'] == did for b in ctx['blocks'])} | {sum(i['source_document_id'] == did for i in ctx['items'])} |")
    A += ["", f"**Totals:** {len(ctx['packages']):,} Summary packages · {len(ctx['blocks']):,} Detail package blocks · "
          f"{len(ctx['items']):,} material item rows ({sum(1 for i in ctx['items'] if i['item_type'] == 'MATERIAL'):,} materials + "
          f"{sum(1 for i in ctx['items'] if i['item_type'] != 'MATERIAL')} sub-package manifest lines).", ""]
    A += ["## Worksheet register", "", "| Document | Sheet | State | Role | In scope | Used range | Merged | Formulas | Error cells | Header row | Data rows | Summary rows | Blocks | Items | Empty template rows | TOTAL rows | Unlabelled totals | Notes |",
          "|---|---|---|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|"]
    for s in ctx["sheets"]:
        dr = f"{s['data_start_row']}-{s['data_end_row']}" if s["data_start_row"] else ""
        A.append("| " + " | ".join(_md_escape(x) for x in [
            s["source_document_id"], f"`{s['sheet_name']}`", s["sheet_state"], s["sheet_role"], "Y" if s["in_scope"] else "N",
            s["used_range"], s["merged_ranges"], s["formula_cells"], s["error_value_cells"], s["header_row"], dr,
            s["summary_package_rows"], s["detail_blocks"], s["material_item_rows"], s["empty_template_rows"],
            s["total_rows"], s["unlabelled_total_rows"], s["notes"]]) + " |")
    A += ["", "## Row classification (Detail sheets)", "", "| Document | " + " | ".join(
        c for c in ["BLOCK_TITLE", "PROJECT_META", "SHIPPER_INVOICE_META", "PACKAGE_HEADER", "PACKAGE_ROW", "ITEM_HEADER",
                    "MATERIAL_ITEM", "TOTAL", "UNLABELLED_TOTAL", "EMPTY_TEMPLATE", "POST_TOTAL_OTHER", "OTHER"]) + " | Non-blank rows |",
          "|---|" + "---:|" * 13]
    for did in ctx["docs"]:
        c = Counter(s["row_class"] for s in ctx["detail_stg"] if s["source_document_id"] == did)
        A.append(f"| {did} | " + " | ".join(str(c.get(k, 0)) for k in [
            "BLOCK_TITLE", "PROJECT_META", "SHIPPER_INVOICE_META", "PACKAGE_HEADER", "PACKAGE_ROW", "ITEM_HEADER",
            "MATERIAL_ITEM", "TOTAL", "UNLABELLED_TOTAL", "EMPTY_TEMPLATE", "POST_TOTAL_OTHER", "OTHER"]) + f" | {sum(c.values())} |")
    A += ["", "Definitions: **MATERIAL_ITEM** = row inside a block's item region with at least one content field "
          "(description, specification, unit, equipment, drawing, remark or masterlist text). **EMPTY_TEMPLATE** = pre-numbered "
          "row with S/N only (or 'XX' / zero). **UNLABELLED_TOTAL** = row with only quantity/weight sums and no label. "
          "Metadata rows (title, Project Name, Shipper/Invoice, headers) are never items.", ""]
    A += ["## Summary sheet layout", "", "| Document | Header rows | Data rows | Total row | Columns mapped | Cells outside table |", "|---|---|---|---|---|---:|"]
    for d in ctx["docs"].values():
        s = d["_summary"]
        tr = s["total_row"]["row"] if s["total_row"] else "none"
        cm = ", ".join(f"{k}={chr(64 + v)}" for k, v in sorted(s["column_map"].items(), key=lambda x: x[1]))
        A.append(f"| {d['source_document_id']} | {', '.join(map(str, s['header_rows']))} | {s['data_start_row']}-{s['data_end_row']} | {tr} | {cm} | {len(s['annotations'])} |")
    sev = Counter(i["severity"] for i in ctx["issues"])
    A += ["", "## Exception overview", "", f"{len(ctx['issues'])} issues logged in MAPPING_ISSUES "
          f"(HIGH {sev.get('HIGH', 0)}, MEDIUM {sev.get('MEDIUM', 0)}, LOW {sev.get('LOW', 0)}, INFO {sev.get('INFO', 0)}).", "",
          "| Issue type | Subtype | Severity | Count |", "|---|---|---|---:|"]
    for (t, st, sv), n in sorted(Counter((i["issue_type"], i["issue_subtype"] or "", i["severity"]) for i in ctx["issues"]).items(),
                                 key=lambda x: (["HIGH", "MEDIUM", "LOW", "INFO"].index(x[0][2]), -x[1])):
        A.append(f"| {t} | {st} | {sv} | {n} |")
    (docs_dir / "LOGISTICS_SOURCE_AUDIT_REPORT.md").write_text("\n".join(A) + "\n", encoding="utf-8")


def write_schema_sql(path):
    """DDL + views as a standalone script (SQLite; PostgreSQL-compatible type names)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    head = ["-- Logistics Master Database schema (generated by the ETL from etl/lpl/schema.py - do not edit by hand)",
            f"-- ETL version {ETL_VERSION}",
            "-- Types are portable: TEXT, INTEGER, DOUBLE PRECISION, DATE, TIMESTAMP. For PostgreSQL, run as-is",
            "-- (CREATE ... IF NOT EXISTS is supported); load data from output/csv with COPY ... CSV HEADER.", ""]
    body = schema.ddl() + [""] + views_ddl()
    path.write_text("\n".join(head) + "\n" + "\n\n".join(body) + "\n", encoding="utf-8")
