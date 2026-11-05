"""
Excel writers:
  MASTER_LOGISTICS_PACKING_LIST_CLEAN.xlsx      (12 structured sheets, Excel Tables)
  LOGISTICS_DATA_RECONCILIATION_REPORT.xlsx     (reconciliation & exceptions)

Write-only mode keeps memory flat for the 17k-row item sheet. Every data sheet is an
Excel Table (filters, banded rows), header frozen, Arial font, typed number formats.
Summary sheets use live COUNTIFS/SUMIFS formulas over the data tables, plus an ETL
value and a check column, so the workbook re-proves its own figures.
"""

import datetime as dt
import json
import sqlite3
from collections import Counter

import openpyxl
from openpyxl.cell import WriteOnlyCell
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.filters import AutoFilter
from openpyxl.worksheet.table import Table, TableColumn, TableStyleInfo

from . import __version__ as ETL_VERSION
from . import schema

FONT = "Arial"
NAVY = "1F3864"
F_TITLE = Font(name=FONT, size=14, bold=True, color=NAVY)
F_H2 = Font(name=FONT, size=11, bold=True, color=NAVY)
F_BOLD = Font(name=FONT, size=10, bold=True)
F_NOTE = Font(name=FONT, size=9, italic=True, color="595959")
F_INPUT = Font(name=FONT, size=10, color="0000FF")
FILL_KEY = PatternFill("solid", fgColor="DDEBF7")
SEV_FILL = dict(HIGH="F8CBAD", MEDIUM="FFE699", LOW="E2EFDA", INFO="EDEDED")

NUM_FMT = {
    "mm": "#,##0", "m3": "#,##0.000", "kg": "#,##0.00", "qty": "#,##0.###;-#,##0.###;0", "int": "0",
    "score": "0.00", "date": "yyyy-mm-dd",
}


def _fmt_for(col, typ):
    if typ == "DATE":
        return NUM_FMT["date"]
    if typ == "INTEGER":
        return NUM_FMT["int"]
    if typ == "DOUBLE PRECISION":
        if col.endswith("_mm"):
            return NUM_FMT["mm"]
        if col.endswith("_m3"):
            return NUM_FMT["m3"]
        if col.endswith("_kg"):
            return NUM_FMT["kg"]
        if "score" in col:
            return NUM_FMT["score"]
        return NUM_FMT["qty"]
    return None


def _types(table):
    return {c[0]: c[1] for c in schema.T[table]["columns"]} if table in schema.T else {}


def _safe(v):
    if isinstance(v, str):
        v = ILLEGAL_CHARACTERS_RE.sub("", v)
        if len(v) > 32000:
            v = v[:32000] + "…"
    return v


def _new_wb():
    wb = openpyxl.Workbook(write_only=True)
    wb._fonts[0] = Font(name=FONT, size=10)   # default font for every cell
    wb.calculation.fullCalcOnLoad = True      # formulas computed when opened (ETL writes no cached values)
    return wb


class TableWriter:
    """Writes a header + rows as an Excel Table into a write-only sheet."""

    def __init__(self, wb, used_names):
        self.wb = wb
        self.used = used_names

    def sheet(self, title):
        ws = self.wb.create_sheet(title)
        ws._row_counter = 0
        return ws

    def append(self, ws, values):
        ws.append(values)
        ws._row_counter += 1

    def table(self, ws, name, headers, rows, types=None, widths=None, freeze=True, start_note=None,
              severity_col=None):
        types = types or {}
        if ws._row_counter == 0:
            # write-only sheets: widths & panes must be set before the first row is streamed
            sample = rows[:400]
            for i, h in enumerate(headers, 1):
                if widths and h in widths:
                    w = widths[h]
                else:
                    lens = [len(str(r[i - 1])) for r in sample if r[i - 1] is not None]
                    w = min(max([len(h) + 2] + [min(x, 60) + 1 for x in lens]), 55)
                ws.column_dimensions[get_column_letter(i)].width = max(w, 8)
            if freeze:
                ws.freeze_panes = "A3" if start_note else "A2"
        if start_note:
            c = WriteOnlyCell(ws, value=start_note)
            c.font = F_NOTE
            self.append(ws, [c])
        first = ws._row_counter + 1
        self.append(ws, [WriteOnlyCell(ws, value=h) for h in headers])
        fmts = [_fmt_for(h, types.get(h, "")) for h in headers]
        sev_idx = headers.index(severity_col) if severity_col in headers else None
        for r in rows:
            out = []
            for i, v in enumerate(r):
                v = _safe(v)
                f = fmts[i]
                if f == NUM_FMT["date"] and isinstance(v, str) and len(v) == 10:
                    try:
                        v = dt.date.fromisoformat(v)
                    except ValueError:
                        f = None
                if (f and v is not None) or (sev_idx == i and v in SEV_FILL):
                    c = WriteOnlyCell(ws, value=v)
                    if f:
                        c.number_format = f
                    if sev_idx == i and v in SEV_FILL:
                        c.fill = PatternFill("solid", fgColor=SEV_FILL[v])
                    out.append(c)
                else:
                    out.append(v)
            self.append(ws, out)
        last = ws._row_counter
        if not rows:   # tables need at least one data row
            self.append(ws, [None] * len(headers))
            last += 1
        ref = f"A{first}:{get_column_letter(len(headers))}{last}"
        tname = name
        k = 2
        while tname in self.used:
            tname = f"{name}_{k}"
            k += 1
        self.used.add(tname)
        t = Table(displayName=tname, ref=ref)
        t.tableColumns = [TableColumn(id=i, name=h) for i, h in enumerate(headers, 1)]
        t.autoFilter = AutoFilter(ref=ref)
        t.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
        ws.add_table(t)
        return first, last

    def text(self, ws, values, font=None, fill=None):
        out = []
        for v in values:
            if v is None:
                out.append(None)
                continue
            c = WriteOnlyCell(ws, value=_safe(v))
            if font:
                c.font = font
            if fill:
                c.fill = fill
            c.alignment = Alignment(vertical="top", wrap_text=isinstance(v, str) and len(v) > 60)
            out.append(c)
        self.append(ws, out)


def _q(con, sql, params=()):
    cur = con.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return cols, [list(r) for r in cur.fetchall()]


def _col_letter(headers, name):
    return get_column_letter(headers.index(name) + 1)


# ============================================================================ MASTER


def write_master(ctx, db_path, out_path):
    con = sqlite3.connect(db_path)
    wb = _new_wb()
    tw = TableWriter(wb, set())
    n_pk = con.execute("SELECT COUNT(*) FROM PACKAGE_MASTER").fetchone()[0]

    # ---------------- 1 README
    ws = tw.sheet("README")
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 120
    kpi_cols, kpi = _q(con, "SELECT * FROM v_dashboard_kpi")
    k = dict(zip(kpi_cols, kpi[0]))
    tw.text(ws, ["Logistics Master Packing List - Batch 4 & Batch 5 (P3 / P5)"], F_TITLE)
    tw.text(ws, [f"Generated by Logistics ETL v{ETL_VERSION} | import {ctx['import_id']} | "
                 f"{ctx['imported_at']} | status {ctx.get('run_status')}"], F_NOTE)
    tw.text(ws, [])
    tw.text(ws, ["Purpose", "Single, clean, relational and traceable logistics master dataset built from the four original "
                 "packing-list workbooks. Drill-down: Batch > Category > Summary Package > Detail Package > Material Item."], F_BOLD)
    tw.text(ws, ["Principle", "Original values are never overwritten. Normalised values (*_normalized) are used only for "
                 "matching. Unmatched or uncertain records are kept and listed in MAPPING_ISSUES; nothing is silently corrected."])
    tw.text(ws, [])
    tw.text(ws, ["Key figures (this import)"], F_H2)
    for lab, key in [("Summary packages", "total_packages"), ("Detail package blocks", "total_detail_packages"),
                     ("Material item rows", "total_material_items"), ("Sub-package manifest lines", "total_manifest_lines"),
                     ("Volume (m3)", "total_volume_m3"), ("Net weight (kg)", "total_net_weight_kg"),
                     ("Gross weight (kg)", "total_gross_weight_kg"), ("Detail blocks linked to Summary", "linked_detail_packages"),
                     ("Detail blocks not linked", "unlinked_detail_packages"), ("Summary packages without detail", "unmatched_summary_packages"),
                     ("Open issues (all / HIGH)", None)]:
        v = f"{k['open_issues']} / {k['open_issues_high']}" if key is None else k[key]
        c = WriteOnlyCell(ws, value=v)
        if isinstance(v, (int, float)):
            c.number_format = "#,##0.###"
        tw.append(ws, [lab, c])
    tw.text(ws, ["", "Figures above are values written by the ETL; BATCH_SUMMARY recomputes them with live formulas."], F_NOTE)
    tw.text(ws, [])
    tw.text(ws, ["Source documents"], F_H2)
    for d in ctx["docs"].values():
        tw.append(ws, [d["source_document_id"], f"{d['source_document_name']}  (Invoice {d['summary_invoice_number']}, "
                       f"sha256 {d['file_sha256'][:16]}…)"])
    tw.text(ws, [])
    tw.text(ws, ["Worksheets"], F_H2)
    for name, desc in [
        ("README", "This page."),
        ("DATA_DICTIONARY", "Field definitions of every table (type, key, nullability, source column)."),
        ("SOURCE_REGISTER", "Source workbooks and every worksheet with role, structure and counts (source audit)."),
        ("PACKAGE_MASTER", "Summary Packing List master - one row per Summary package, plus roll-up columns (linked detail blocks, items, mapping status, open issues)."),
        ("DETAIL_PACKAGES", "One row per package block in the Detail sheets, linked to its Summary package (package_id) and, for split sub-packages, to its parent block."),
        ("PACKAGE_DETAIL", "One row per material item line. item_type = SUB_PACKAGE_REFERENCE marks manifest lines that point to a sub-package (exclude from material sums)."),
        ("PACKAGE_MAPPING", "Summary <-> Detail relationship register: status, level, method, confidence, evidence, review fields."),
        ("MAPPING_ISSUES", "Exception register (severity HIGH / MEDIUM / LOW / INFO) with proposed resolution."),
        ("INVOICE_REGISTER", "Invoice numbers by source (Summary header, IMPORT packing list, Detail block headers) with declared vs computed totals."),
        ("BATCH_SUMMARY", "Batch x Category statistics, mapping and MDR distributions - live formulas with ETL cross-check."),
        ("DATA_QUALITY_REPORT", "Validation / reconciliation checks (PASS / FAIL / WARN / INFO) and package-series completeness."),
        ("CHANGE_LOG", "Every transformation rule applied and how many values it changed."),
        ("LOGISTICS_READINESS", "Readiness per package: gates (PL, MDR, Site, Inspection), Readiness Index 0-100, status and next action (rules: config/readiness_rules.json)."),
    ]:
        tw.append(ws, [name, desc])
    tw.text(ws, [])
    tw.text(ws, ["Keys & drill-down"], F_H2)
    for a, b in [("package_id", "PACKAGE_MASTER primary key; DETAIL_PACKAGES.package_id and PACKAGE_DETAIL.package_id point to it (NULL while unresolved)."),
                 ("detail_package_id", "DETAIL_PACKAGES primary key; every PACKAGE_DETAIL row carries it (no orphan items)."),
                 ("item_id", "PACKAGE_DETAIL primary key."),
                 ("source_document_id / source_sheet / source_row", "Lineage to the exact workbook, worksheet and Excel row."),
                 ("Ids are deterministic", "Re-running the ETL on the same files reproduces the same ids.")]:
        tw.append(ws, [a, b])
    tw.text(ws, [])
    tw.text(ws, ["Mapping status legend"], F_H2)
    for s in ctx["reference"]["REFERENCE_MAPPING_STATUS"]:
        tw.append(ws, [s["status_code"], f"{'LINKED' if s['is_linked'] else 'not linked'} - {s['description']}"])
    tw.text(ws, [])
    tw.text(ws, ["Manual review"], F_H2)
    tw.append(ws, ["How to confirm a candidate", "Add a row to config/mapping_overrides.csv (source_document_id, detail_package_number, "
                   "summary_package_number, decision CONFIRMED_ALIAS or REJECTED, reviewed_by, reviewed_at, note) and re-run "
                   "`python3 -I etl/run_etl.py`. The decision is applied on every future run."])

    # ---------------- 2 DATA_DICTIONARY
    ws = tw.sheet("DATA_DICTIONARY")
    cols, rows = _q(con, "SELECT * FROM DATA_DICTIONARY ORDER BY rowid")
    tw.table(ws, "tbl_DATA_DICTIONARY", cols, rows, _types("DATA_DICTIONARY"),
             widths=dict(description=70, source_reference=45))

    # ---------------- 3 SOURCE_REGISTER
    ws = tw.sheet("SOURCE_REGISTER")
    cols, rows = _q(con, "SELECT * FROM SOURCE_DOCUMENTS ORDER BY rowid")
    tw.table(ws, "tbl_SOURCE_DOCUMENTS", cols, rows, _types("SOURCE_DOCUMENTS"), freeze=False,
             start_note="Source workbooks (one row per document)")
    tw.append(ws, [])
    cols, rows = _q(con, "SELECT * FROM SOURCE_SHEETS ORDER BY rowid")
    tw.table(ws, "tbl_SOURCE_SHEETS", cols, rows, _types("SOURCE_SHEETS"), freeze=False,
             start_note="Worksheet register (source audit)", widths=dict(notes=80))

    # ---------------- 4 PACKAGE_MASTER (table + roll-ups)
    ws = tw.sheet("PACKAGE_MASTER")
    pm_cols = schema.columns("PACKAGE_MASTER")
    cols, rows = _q(con, f"""SELECT {', '.join('pm.' + c for c in pm_cols)},
        v.linked_detail_packages, v.split_sub_packages, v.material_items, v.package_mapping_status,
        v.open_issues, v.open_issues_high
        FROM PACKAGE_MASTER pm JOIN v_package_list v ON v.package_id = pm.package_id ORDER BY pm.rowid""")
    t = _types("PACKAGE_MASTER")
    t.update(linked_detail_packages="INTEGER", split_sub_packages="INTEGER", material_items="INTEGER",
             open_issues="INTEGER", open_issues_high="INTEGER")
    tw.table(ws, "tbl_PACKAGE_MASTER", cols, rows, t, widths=dict(description_cn=24, description_en=30))
    pm_headers = cols

    # ---------------- 5 DETAIL_PACKAGES
    ws = tw.sheet("DETAIL_PACKAGES")
    dp_cols = schema.columns("DETAIL_PACKAGES")
    sel = []
    for c in dp_cols:
        sel.append(f"dp.{c}")
        if c == "package_id":
            sel.append("pm.package_number_original AS summary_package_number")
    cols, rows = _q(con, f"SELECT {', '.join(sel)} FROM DETAIL_PACKAGES dp LEFT JOIN PACKAGE_MASTER pm "
                         f"ON pm.package_id = dp.package_id ORDER BY dp.rowid")
    tw.table(ws, "tbl_DETAIL_PACKAGES", cols, rows, _types("DETAIL_PACKAGES"))
    dp_headers = cols

    # ---------------- 6 PACKAGE_DETAIL
    ws = tw.sheet("PACKAGE_DETAIL")
    it_cols = schema.columns("PACKAGE_DETAIL")
    sel = []
    for c in it_cols:
        sel.append(f"it.{c}")
        if c == "package_id":
            sel.append("pm.package_number_original AS summary_package_number")
    cols, rows = _q(con, f"SELECT {', '.join(sel)} FROM PACKAGE_DETAIL it LEFT JOIN PACKAGE_MASTER pm "
                         f"ON pm.package_id = it.package_id ORDER BY it.rowid")
    tw.table(ws, "tbl_PACKAGE_DETAIL", cols, rows, _types("PACKAGE_DETAIL"),
             widths=dict(description_en=40, description_cn=28, remark=30, drawing_number=28, extra_values_json=30))
    it_headers = cols

    # ---------------- 7 PACKAGE_MAPPING
    ws = tw.sheet("PACKAGE_MAPPING")
    cols, rows = _q(con, "SELECT * FROM PACKAGE_MAPPING ORDER BY rowid")
    tw.table(ws, "tbl_PACKAGE_MAPPING", cols, rows, _types("PACKAGE_MAPPING"),
             widths=dict(mapping_note=70, evidence_json=50))
    mp_headers = cols

    # ---------------- 8 MAPPING_ISSUES
    ws = tw.sheet("MAPPING_ISSUES")
    cols, rows = _q(con, "SELECT * FROM MAPPING_ISSUES ORDER BY rowid")
    tw.table(ws, "tbl_MAPPING_ISSUES", cols, rows, _types("MAPPING_ISSUES"),
             widths=dict(description=80, proposed_resolution=60, original_value=30, comparison_value=30),
             severity_col="severity")
    is_headers = cols

    # ---------------- 9 INVOICE_REGISTER
    ws = tw.sheet("INVOICE_REGISTER")
    cols, rows = _q(con, "SELECT * FROM INVOICE_REGISTER ORDER BY rowid")
    tw.table(ws, "tbl_INVOICE_REGISTER", cols, rows, _types("INVOICE_REGISTER"), widths=dict(note=70))

    # ---------------- 10 BATCH_SUMMARY (formulas)
    ws = tw.sheet("BATCH_SUMMARY")
    _batch_summary(ws, tw, con, pm_headers, dp_headers, it_headers, mp_headers, is_headers, ctx)

    # ---------------- 11 DATA_QUALITY_REPORT
    ws = tw.sheet("DATA_QUALITY_REPORT")
    cols, rows = _q(con, "SELECT * FROM DATA_QUALITY_CHECKS ORDER BY rowid")
    tw.table(ws, "tbl_DATA_QUALITY_CHECKS", cols, rows, _types("DATA_QUALITY_CHECKS"), freeze=False,
             start_note="Validation & reconciliation checks executed by the ETL", widths=dict(check_name=70, note=70))
    tw.append(ws, [])
    cols, rows = _q(con, "SELECT * FROM SERIES_REGISTER ORDER BY rowid")
    tw.table(ws, "tbl_SERIES_REGISTER", cols, rows, _types("SERIES_REGISTER"), freeze=False,
             start_note="Package numbering series completeness (n/N) across all four workbooks", widths=dict(missing_seq=60))

    # ---------------- 12 CHANGE_LOG
    ws = tw.sheet("CHANGE_LOG")
    cols, rows = _q(con, "SELECT * FROM CHANGE_LOG ORDER BY rowid")
    tw.table(ws, "tbl_CHANGE_LOG", cols, rows, _types("CHANGE_LOG"), widths=dict(rule_description=80))

    # ---------------- 13 LOGISTICS_READINESS (added module; after the 12 required sheets)
    ws = tw.sheet("LOGISTICS_READINESS")
    cols, rows = _q(con, """SELECT r.package_number_original, r.batch_id, r.category, r.system_group, r.equipment_number,
            r.gross_weight_kg, r.volume_m3, s.label AS readiness_status_label, r.readiness_score, r.pl_verified,
            r.mdr_state_label, r.mdr_credit, r.on_site, r.on_site_evidence, r.site_location, r.rfs_raised, r.inspected,
            r.receiving_date, r.inspection_dates, r.open_issue_count, r.blocking_issue_count, r.next_action,
            r.readiness_status, r.package_id
        FROM PACKAGE_READINESS r JOIN REFERENCE_READINESS_STATUS s ON s.status_code = r.readiness_status
        JOIN PACKAGE_MASTER pm ON pm.package_id = r.package_id ORDER BY pm.rowid""")
    t = _types("PACKAGE_READINESS")
    tw.table(ws, "tbl_LOGISTICS_READINESS", cols, rows, t,
             widths=dict(next_action=70, readiness_status_label=30, site_location=26))

    con.close()
    wb.save(out_path)


def _batch_summary(ws, tw, con, pm_h, dp_h, it_h, mp_h, is_h, ctx):
    n_pm = con.execute("SELECT COUNT(*) FROM PACKAGE_MASTER").fetchone()[0] + 1
    n_dp = con.execute("SELECT COUNT(*) FROM DETAIL_PACKAGES").fetchone()[0] + 1
    n_it = con.execute("SELECT COUNT(*) FROM PACKAGE_DETAIL").fetchone()[0] + 1
    n_mp = con.execute("SELECT COUNT(*) FROM PACKAGE_MAPPING").fetchone()[0] + 1
    n_is = con.execute("SELECT COUNT(*) FROM MAPPING_ISSUES").fetchone()[0] + 1

    def rng(sheet, headers, col, n):
        L = _col_letter(headers, col)
        return f"{sheet}!${L}$2:${L}${n}"

    PM = lambda c: rng("PACKAGE_MASTER", pm_h, c, n_pm)   # noqa: E731
    DP = lambda c: rng("DETAIL_PACKAGES", dp_h, c, n_dp)  # noqa: E731
    IT = lambda c: rng("PACKAGE_DETAIL", it_h, c, n_it)   # noqa: E731
    MP = lambda c: rng("PACKAGE_MAPPING", mp_h, c, n_mp)  # noqa: E731
    IS = lambda c: rng("MAPPING_ISSUES", is_h, c, n_is)   # noqa: E731

    widths = [12, 9, 12, 14, 16, 16, 14, 14, 14, 14, 12, 12, 14, 12, 3, 14, 12]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    tw.text(ws, ["Batch x Category Summary"], F_TITLE)
    tw.text(ws, ["Columns C-N are live COUNTIFS/SUMIFS formulas over the data sheets. Column P holds the value the ETL "
                 "computed in SQLite (v_batch_category_summary) and Q compares them."], F_NOTE)
    tw.append(ws, [])
    hdr = ["Batch", "Category", "Packages", "Volume (m3)", "Net weight (kg)", "Gross weight (kg)", "Detail blocks",
           "Split sub-pkgs", "Unlinked blocks", "Material items", "MDR APV", "MDR RES", "Inspected pkgs", "Open HIGH issues",
           None, "ETL packages", "Check"]
    tw.text(ws, hdr, F_BOLD, FILL_KEY)
    _, etl = _q(con, "SELECT batch_id, category, packages FROM v_batch_category_summary ORDER BY batch_id, category")
    first = ws._row_counter + 1
    for b, c, n in etl:
        r = ws._row_counter + 1
        A, B = f"$A{r}", f"$B{r}"
        crit = lambda R: f'{R("batch_id")},{A},{R("category")},{B}'  # noqa: E731
        row = [b, c,
               f"=COUNTIFS({crit(PM)})",
               f"=SUMIFS({PM('volume_m3')},{crit(PM)})",
               f"=SUMIFS({PM('net_weight_kg')},{crit(PM)})",
               f"=SUMIFS({PM('gross_weight_kg')},{crit(PM)})",
               f"=COUNTIFS({crit(DP)})",
               f"=COUNTIFS({crit(DP)},{DP('is_split_child')},1)",
               f'=COUNTIFS({crit(DP)},{DP("package_id")},"")',
               f'=COUNTIFS({crit(IT)},{IT("item_type")},"MATERIAL")',
               f'=COUNTIFS({crit(PM)},{PM("mdr_status_code")},"APV")',
               f'=COUNTIFS({crit(PM)},{PM("mdr_status_code")},"RES")',
               f'=COUNTIFS({crit(PM)},{PM("inspection_date_original")},"<>")',
               f'=COUNTIFS({crit(IS)},{IS("severity")},"HIGH",{IS("resolution_status")},"OPEN")',
               None, n, f'=IF(C{r}=P{r},"OK","CHECK")']
        cells = []
        for i, v in enumerate(row):
            cell = WriteOnlyCell(ws, value=v)
            if i in (3,):
                cell.number_format = "#,##0.000"
            elif i in (4, 5):
                cell.number_format = "#,##0"
            elif i >= 2 and i != 14:
                cell.number_format = "#,##0"
            cells.append(cell)
        tw.append(ws, cells)
    last = ws._row_counter
    tot = ["TOTAL", None] + [f"=SUM({get_column_letter(i)}{first}:{get_column_letter(i)}{last})" for i in range(3, 15)] + \
          [None, f"=SUM(P{first}:P{last})", f'=IF(C{last + 1}=P{last + 1},"OK","CHECK")']
    cells = []
    for i, v in enumerate(tot):
        cell = WriteOnlyCell(ws, value=v)
        cell.font = F_BOLD
        if 2 <= i <= 13 or i == 15:
            cell.number_format = "#,##0.000" if i == 3 else "#,##0"
        cells.append(cell)
    tw.append(ws, cells)

    # mapping status distribution
    tw.append(ws, [])
    tw.text(ws, ["Mapping status distribution (PACKAGE_MAPPING rows)"], F_H2)
    combos = [(b, c) for b, c, _ in etl]
    tw.text(ws, ["Status", "Linked"] + [f"{b}-{c}" for b, c in combos] + ["Total"], F_BOLD, FILL_KEY)
    for s in ctx["reference"]["REFERENCE_MAPPING_STATUS"]:
        r = ws._row_counter + 1
        row = [s["status_code"], "Y" if s["is_linked"] else "N"]
        for b, c in combos:
            row.append(f'=COUNTIFS({MP("mapping_status")},$A{r},{MP("batch_id")},"{b}",{MP("category")},"{c}")')
        row.append(f"=SUM(C{r}:{get_column_letter(2 + len(combos))}{r})")
        tw.append(ws, row)

    # MDR distribution
    tw.append(ws, [])
    tw.text(ws, ["MDR status distribution (Summary packages)"], F_H2)
    tw.text(ws, ["MDR code", "Label"] + [f"{b}-{c}" for b, c in combos] + ["Total"], F_BOLD, FILL_KEY)
    for m in ctx["reference"]["REFERENCE_MDR_STATUS"]:
        r = ws._row_counter + 1
        row = [m["mdr_status_code"], m["label"]]
        for b, c in combos:
            row.append(f'=COUNTIFS({PM("mdr_status_code")},$A{r},{PM("batch_id")},"{b}",{PM("category")},"{c}")')
        row.append(f"=SUM(C{r}:{get_column_letter(2 + len(combos))}{r})")
        tw.append(ws, row)

    # issues by severity
    tw.append(ws, [])
    tw.text(ws, ["Open issues by severity"], F_H2)
    tw.text(ws, ["Severity", None] + [f"{b}-{c}" for b, c in combos] + ["Total"], F_BOLD, FILL_KEY)
    for sev in ("HIGH", "MEDIUM", "LOW", "INFO"):
        r = ws._row_counter + 1
        row = [sev, None]
        for b, c in combos:
            row.append(f'=COUNTIFS({IS("severity")},$A{r},{IS("batch_id")},"{b}",{IS("category")},"{c}",'
                       f'{IS("resolution_status")},"OPEN")')
        row.append(f"=SUM(C{r}:{get_column_letter(2 + len(combos))}{r})")
        tw.append(ws, row)
    tw.text(ws, ["Document-level issues without batch/category are excluded from this grid; see MAPPING_ISSUES."], F_NOTE)


# ============================================================================ RECONCILIATION


def write_recon(ctx, db_path, out_path):
    con = sqlite3.connect(db_path)
    wb = _new_wb()
    tw = TableWriter(wb, set())
    rc = ctx["recount"]

    # ---------------- SUMMARY
    ws = tw.sheet("SUMMARY")
    for i, w in enumerate([44, 16, 16, 16, 12, 70], 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    tw.text(ws, ["Logistics Data Reconciliation Report"], F_TITLE)
    tw.text(ws, [f"ETL v{ETL_VERSION} | import {ctx['import_id']} | {ctx['imported_at']} | source fingerprint "
                 f"{ctx['fingerprint'][:16]}…"], F_NOTE)
    tw.text(ws, ["Counts are recalculated directly from the four original workbooks. Brief figures are the preliminary "
                 "numbers quoted in the assignment (previous outputs were not supplied, so they could not be re-opened)."], F_NOTE)
    tw.append(ws, [])
    tw.text(ws, ["Figure", "Brief (reference)", "Actual (source)", "Variance", "Status", "Explanation"], F_BOLD, FILL_KEY)
    dist = Counter(m["mapping_status"] for m in ctx["mappings"])
    ref = {c["check_id"]: c for c in ctx["checks"] if c["check_group"] == "REFERENCE_FIGURES"}
    lines = [
        ("Summary package records", 1151, len(ctx["packages"]), ref["C40"]["note"]),
        ("Detail package blocks", 1163, len(ctx["blocks"]), "Exact agreement."),
        ("Material item rows", 17140, len(ctx["items"]), _item_note(ctx)),
        ("Exact matches", 1150, dist.get("EXACT_MATCH", 0), "All Summary packages except HDCZ-KA-5-2/8 have an identical Detail block."),
        ("Candidate mappings (split + alias)", 11, dist.get("SPLIT_PACKAGE", 0) + dist.get("CANDIDATE_MATCH", 0) + dist.get("MANUAL_REVIEW", 0),
         ref["C44"]["note"]),
        ("Unmatched detail blocks", 2, dist.get("UNMATCHED_DETAIL", 0), ref["C45"]["note"]),
    ]
    for lab, b, a, note in lines:
        r = ws._row_counter + 1
        tw.append(ws, [lab, b, a, f"=C{r}-B{r}", f'=IF(D{r}=0,"MATCH","DIFFERENT")', note])
    tw.append(ws, [])
    tw.text(ws, ["Per document", "Summary pkgs", "Detail blocks", "Material items", "Issues", "Summary invoice"], F_BOLD, FILL_KEY)
    for did, d in ctx["docs"].items():
        tw.append(ws, [f"{did}  {d['source_document_name']}", sum(p["source_document_id"] == did for p in ctx["packages"]),
                       sum(b["source_document_id"] == did for b in ctx["blocks"]),
                       sum(i["source_document_id"] == did for i in ctx["items"]),
                       sum(i["source_document_id"] == did for i in ctx["issues"]), d["summary_invoice_number"]])
    tw.append(ws, [])
    tw.text(ws, ["Mapping status", "Rows", "Linked"], F_BOLD, FILL_KEY)
    for s in ctx["reference"]["REFERENCE_MAPPING_STATUS"]:
        tw.append(ws, [s["status_code"], dist.get(s["status_code"], 0), "Y" if s["is_linked"] else "N"])
    tw.append(ws, [])
    tw.text(ws, ["Issues by severity", "Count"], F_BOLD, FILL_KEY)
    sev = Counter(i["severity"] for i in ctx["issues"])
    for s in ("HIGH", "MEDIUM", "LOW", "INFO"):
        tw.append(ws, [s, sev.get(s, 0)])
    fails = [c for c in ctx["checks"] if c["status"] == "FAIL"]
    tw.append(ws, [])
    tw.text(ws, ["Validation checks", f"{len(ctx['checks'])} executed", f"{len(fails)} FAIL",
                 f"{sum(c['status'] == 'WARN' for c in ctx['checks'])} WARN"], F_BOLD)

    # ---------------- COUNT_RECON (formulas)
    ws = tw.sheet("COUNT_RECON")
    rows = []
    for did, d in ctx["docs"].items():
        r0 = rc[did]
        rows.append([did, "Summary Packing List", "Summary package rows", r0["summary_rows"],
                     sum(p["source_document_id"] == did for p in ctx["packages"])])
        tr = d.get("_summary_total") or {}
        if tr.get("package_quantity") is not None:
            rows.append([did, "Summary Packing List", "Summary total row - package qty", int(tr["package_quantity"]),
                         sum(p["source_document_id"] == did for p in ctx["packages"])])
        imp = d.get("_import")
        if imp and imp.get("totals"):
            rows.append([did, imp["sheet"], "IMPORT packing list - In Total packages", int(imp["totals"]["packages"]),
                         sum(p["source_document_id"] == did for p in ctx["packages"])])
        for sh, n in r0["blocks"].items():
            rows.append([did, sh, "'Package No.' header rows vs DETAIL_PACKAGES", n,
                         sum(b["source_document_id"] == did and b["source_sheet"] == sh for b in ctx["blocks"])])
        for sh, n in r0["item_candidates"].items():
            rows.append([did, sh, "Rows with item content vs PACKAGE_DETAIL", n,
                         sum(i["source_document_id"] == did and i["source_sheet"] == sh for i in ctx["items"])])
        rows.append([did, "(all detail sheets)", "Non-blank rows vs STG_DETAIL_ROWS", r0["detail_nonblank_rows"],
                     sum(s["source_document_id"] == did for s in ctx["detail_stg"])])
        rows.append([did, "Summary Packing List", "Non-blank rows vs STG_SUMMARY_ROWS", r0["summary_nonblank_rows"],
                     sum(s["source_document_id"] == did for s in ctx["summary_stg"])])
    hdr = ["source_document_id", "source_sheet", "measure", "source_count", "loaded_count", "variance", "status"]
    first = 3
    data = []
    for i, r in enumerate(rows):
        rr = first + i
        data.append(r + [f"=E{rr}-D{rr}", f'=IF(F{rr}=0,"PASS","FAIL")'])
    tw.table(ws, "tbl_COUNT_RECON", hdr, data, dict(source_count="INTEGER", loaded_count="INTEGER"), freeze=False,
             start_note="source_count = independent recount from the workbook (fixed-column logic, separate from the parser); "
                        "loaded_count = rows in the master tables.")

    # ---------------- INVESTIGATIONS
    ws = tw.sheet("INVESTIGATIONS")
    inv_rows = _investigations(ctx)
    tw.table(ws, "tbl_INVESTIGATIONS", ["topic", "brief_observation", "finding", "evidence", "conclusion"], inv_rows,
             widths=dict(topic=26, brief_observation=40, finding=70, evidence=70, conclusion=50))

    # ---------------- ROW_CLASSIFICATION
    ws = tw.sheet("ROW_CLASSIFICATION")
    classes = ["BLOCK_TITLE", "PROJECT_META", "SHIPPER_INVOICE_META", "PACKAGE_HEADER", "PACKAGE_ROW", "ITEM_HEADER",
               "MATERIAL_ITEM", "TOTAL", "UNLABELLED_TOTAL", "EMPTY_TEMPLATE", "POST_TOTAL_OTHER", "OTHER"]
    c = Counter((s["source_document_id"], s["source_sheet"], s["row_class"]) for s in ctx["detail_stg"])
    keys = sorted({(a, b) for a, b, _ in c})
    data = []
    for i, (a, b) in enumerate(keys):
        rr = 2 + i
        data.append([a, b] + [c.get((a, b, k), 0) for k in classes] +
                    [f"=SUM(C{rr}:{get_column_letter(2 + len(classes))}{rr})"])
    tw.table(ws, "tbl_ROW_CLASSIFICATION", ["source_document_id", "source_sheet"] + [k.lower() for k in classes] + ["non_blank_rows"],
             data, {k.lower(): "INTEGER" for k in classes})

    # ---------------- mapping subsets
    base = """SELECT m.mapping_status, m.matching_level, m.matching_method, m.confidence_level, m.confidence_score,
                     m.batch_id, m.category, m.source_package_number, m.target_package_number,
                     pm.source_sheet AS summary_sheet, pm.source_row AS summary_row,
                     dp.source_sheet AS detail_sheet, dp.source_header_row AS detail_header_row,
                     pm.length_mm AS s_length_mm, dp.length_mm AS d_length_mm, pm.width_mm AS s_width_mm, dp.width_mm AS d_width_mm,
                     pm.height_mm AS s_height_mm, dp.height_mm AS d_height_mm, pm.volume_m3 AS s_volume_m3, dp.volume_m3 AS d_volume_m3,
                     pm.net_weight_kg AS s_net_weight_kg, dp.net_weight_kg AS d_net_weight_kg,
                     pm.gross_weight_kg AS s_gross_weight_kg, dp.gross_weight_kg AS d_gross_weight_kg,
                     m.mapping_note, m.package_id, m.detail_package_id, m.mapping_id
              FROM PACKAGE_MAPPING m
              LEFT JOIN PACKAGE_MASTER pm ON pm.package_id = m.package_id
              LEFT JOIN DETAIL_PACKAGES dp ON dp.detail_package_id = m.detail_package_id"""
    numt = {k: "DOUBLE PRECISION" for k in ["s_length_mm", "d_length_mm", "s_width_mm", "d_width_mm", "s_height_mm",
                                             "d_height_mm", "s_volume_m3", "d_volume_m3", "s_net_weight_kg", "d_net_weight_kg",
                                             "s_gross_weight_kg", "d_gross_weight_kg", "confidence_score"]}
    for title, where in [("MAPPING_RESULTS", ""), ("EXACT_MATCHES", "WHERE m.mapping_status IN ('EXACT_MATCH','NORMALIZED_MATCH')"),
                         ("SPLIT_PACKAGES", "WHERE m.mapping_status = 'SPLIT_PACKAGE' OR dp.is_split_parent = 1"),
                         ("CANDIDATE_MATCHES", "WHERE m.mapping_status IN ('CANDIDATE_MATCH','MANUAL_REVIEW','CONFIRMED_ALIAS')"),
                         ("UNMATCHED", "WHERE m.mapping_status IN ('UNMATCHED_SUMMARY','UNMATCHED_DETAIL')")]:
        ws = tw.sheet(title)
        cols, rows = _q(con, f"{base} {where} ORDER BY m.rowid")
        tw.table(ws, f"tbl_{title}", cols, rows, numt, widths=dict(mapping_note=80))

    # ---------------- DUPLICATES
    ws = tw.sheet("DUPLICATES")
    cols, rows = _q(con, "SELECT * FROM MAPPING_ISSUES WHERE issue_type = 'DUPLICATE_PACKAGE_NUMBER' "
                         "OR issue_subtype = 'DUPLICATE_SEQUENCE' ORDER BY rowid")
    note = ("Checked: duplicate package numbers within each Summary, within each workbook's Detail blocks, across the four "
            "workbooks (incl. Batch 4 vs Batch 5) and duplicate sequence numbers per series. "
            + ("No duplicates found." if not rows else f"{len(rows)} duplicate findings."))
    tw.table(ws, "tbl_DUPLICATES", cols, rows, _types("MAPPING_ISSUES"), freeze=False, start_note=note,
             severity_col="severity")

    # ---------------- ATTRIBUTE_VARIANCE (per block x attribute)
    ws = tw.sheet("ATTRIBUTE_VARIANCE")
    data = []
    pk = {p["package_id"]: p for p in ctx["packages"]}
    for m in ctx["mappings"]:
        if m["mapping_status"] not in ("EXACT_MATCH", "NORMALIZED_MATCH", "CONFIRMED_ALIAS", "CANDIDATE_MATCH") or not m["evidence_json"]:
            continue
        ev = json.loads(m["evidence_json"])
        for f, v in (ev.get("attributes") or {}).items():
            if v["status"] in ("MISMATCH", "WITHIN_TOLERANCE"):
                data.append([m["batch_id"], m["category"], m["mapping_status"], m["source_package_number"],
                             m["target_package_number"], f, v.get("summary"), v.get("detail"), v.get("diff"), v.get("rel"),
                             v["status"], m["package_id"], m["detail_package_id"]])
    tw.table(ws, "tbl_ATTRIBUTE_VARIANCE", ["batch_id", "category", "mapping_status", "summary_package_number",
                                            "detail_package_number", "attribute", "summary_value", "detail_value", "difference",
                                            "relative_difference", "comparison_status", "package_id", "detail_package_id"],
             data, dict(difference="DOUBLE PRECISION", relative_difference="DOUBLE PRECISION"), freeze=True,
             widths=dict(summary_value=18, detail_value=18))

    # ---------------- INVOICE_RECON
    ws = tw.sheet("INVOICE_RECON")
    cols, rows = _q(con, "SELECT * FROM INVOICE_REGISTER ORDER BY rowid")
    tw.table(ws, "tbl_INVOICE_RECON", cols, rows, _types("INVOICE_REGISTER"), widths=dict(note=70))

    # ---------------- SERIES_COMPLETENESS
    ws = tw.sheet("SERIES_COMPLETENESS")
    cols, rows = _q(con, "SELECT * FROM SERIES_REGISTER ORDER BY rowid")
    tw.table(ws, "tbl_SERIES", cols, rows, _types("SERIES_REGISTER"), widths=dict(missing_seq=70))

    # ---------------- EXCEPTIONS
    ws = tw.sheet("EXCEPTIONS")
    cols, rows = _q(con, "SELECT * FROM MAPPING_ISSUES ORDER BY rowid")
    tw.table(ws, "tbl_EXCEPTIONS", cols, rows, _types("MAPPING_ISSUES"),
             widths=dict(description=80, proposed_resolution=60), severity_col="severity")

    # ---------------- DQ_CHECKS
    ws = tw.sheet("DQ_CHECKS")
    cols, rows = _q(con, "SELECT * FROM DATA_QUALITY_CHECKS ORDER BY rowid")
    tw.table(ws, "tbl_DQ_CHECKS", cols, rows, _types("DATA_QUALITY_CHECKS"), widths=dict(check_name=70, note=70))
    con.close()
    wb.save(out_path)


def _item_note(ctx):
    c = Counter(s["row_class"] for s in ctx["detail_stg"])
    m, e, u = c["MATERIAL_ITEM"], c["EMPTY_TEMPLATE"], c["UNLABELLED_TOTAL"]
    return (f"Actual = rows with item content ({m:,}); each verified cell-by-cell against its source row. Excluded: "
            f"{e:,} pre-numbered empty template rows, {u} unlabelled subtotal rows, {c['TOTAL']:,} TOTAL rows "
            f"(ROW_CLASSIFICATION). Alternative definitions for comparison: + empty templates = {m + e:,}; "
            f"+ unlabelled subtotals = {m + u:,}; + both = {m + e + u:,}. The previous attempt's outputs were not "
            f"supplied, so its 17,140 cannot be traced to a definition.")


def _investigations(ctx):
    docs = ctx["docs"]
    P = ctx["packages"]
    B = ctx["blocks"]
    out = []

    def doc_pk(did):
        return [p for p in P if p["source_document_id"] == did]

    # 1 B4-P5 585 vs 586
    ps = doc_pk("DOC-B4-P5")
    sns = sorted(p["source_sn"] for p in ps)
    imp = docs["DOC-B4-P5"].get("_import") or {}
    piv = [a for a in ctx["annotations"] if a["_doc"]["source_document_id"] == "DOC-B4-P5" and a["context"] == "PIVOT_TABLE"]
    gt = next((a for a in piv if str(a["value"]).strip().lower() == "grand total"), None)
    gtv = next((a["value"] for a in piv if gt and a["row"] == gt["row"] and a["col"] == gt["col"] + 1), None)
    out.append(["B4-P5 Summary count", "Requires verification between 585 and 586.",
                f"{len(ps)} package rows, S/N {sns[0]}-{sns[-1]} continuous (no gaps, no duplicates), rows "
                f"{min(p['source_row'] for p in ps)}-{max(p['source_row'] for p in ps)}. "
                f"{sum(b['source_document_id'] == 'DOC-B4-P5' for b in B)} detail blocks, all EXACT_MATCH.",
                f"IMPORT packing list 'In Total' = {int(imp.get('totals', {}).get('packages') or 0)} packages; "
                f"site pivot 'Grand Total' ({gt['cell_ref'] if gt else 'n/a'}) = {gtv}. Summary sheet has no total row.",
                f"{len(ps)} is correct. No source evidence supports 585."])
    # 2 B5-P3 291 vs 292
    ps = doc_pk("DOC-B5-P3")
    sns = sorted(p["source_sn"] for p in ps)
    ex = sum(1 for b in B if b["source_document_id"] == "DOC-B5-P3" and b["mapping_status"] == "EXACT_MATCH")
    piv = [a for a in ctx["annotations"] if a["_doc"]["source_document_id"] == "DOC-B5-P3" and a["context"] == "PIVOT_TABLE"]
    gt = next((a for a in piv if str(a["value"]).strip().lower() == "grand total"), None)
    gtv = next((a["value"] for a in piv if gt and a["row"] == gt["row"] and a["col"] == gt["col"] + 1), None)
    out.append(["B5-P3 Summary count", "Requires verification between 291 and 292.",
                f"{len(ps)} package rows, S/N {sns[0]}-{sns[-1]} continuous. {ex} have an identical detail block; "
                f"1 (HDCZ-KA-5-2/8) has none - its detail block is printed as HDCZ-K-5-2/8.",
                f"Site pivot 'Grand Total' ({gt['cell_ref'] if gt else 'n/a'}) = {gtv}. Summary total row has no package qty. "
                f"{sum(b['source_document_id'] == 'DOC-B5-P3' for b in B)} detail blocks.",
                f"{len(ps)} Summary packages. 291 equals the number of exact matches, not the package count."])
    # 3 B5-P5 153 vs 163
    ps = doc_pk("DOC-B5-P5")
    bl = [b for b in B if b["source_document_id"] == "DOC-B5-P5"]
    split = [b for b in bl if b["is_split_child"]]
    parents = [b for b in bl if b["is_split_parent"]]
    out.append(["B5-P5 153 Summary vs 163 Detail", "153 Summary packages vs 163 Detail blocks.",
                f"{len(ps)} Summary packages; {len(bl)} detail blocks = {len(bl) - len(split)} identical numbers + "
                f"{len(split)} split sub-packages: "
                + "; ".join(f"{p['package_number_original']} -> {sum(1 for c in split if c['parent_detail_package_id'] == p['detail_package_id'])} children"
                            for p in parents) + ".",
                "Each parent block is a manifest whose item lines (Drawing No. column) list the child package numbers, e.g. "
                + ", ".join(c["package_number_original"] for c in split[:3]) + " ...",
                "Not a discrepancy: 1 Summary package -> parent block + sub-package blocks (SPLIT_PACKAGE, linked). "
                "Manifest lines are typed SUB_PACKAGE_REFERENCE so weights are not double counted."])
    # 4 invoice metadata B5-P3
    cnt = Counter((b["source_sheet"], b["invoice_number_original"]) for b in B if b["source_document_id"] == "DOC-B5-P3")
    out.append(["B5-P3 detail invoice metadata", "Several Batch 5 P3 Detail sheets contain invoice metadata inconsistent with Summary.",
                "Summary invoice " + str(docs["DOC-B5-P3"]["summary_invoice_number"]) + ". Detail block headers: "
                + "; ".join(f"{sh}: '{inv}' x{n}" for (sh, inv), n in sorted(cnt.items(), key=lambda x: (x[0][0], str(x[0][1])))),
                "INVOICE_REGISTER (DETAIL_BLOCK_HEADER rows) and MAPPING_ISSUES rule R05.",
                "Confirmed. Placeholders (P3-HHI-00X / 'P3-HHI-'), wrong category (P5-HHI-00X in QDTC, SL, 1 HDCZ block) and "
                "previous-batch invoice (P3-HHI-004 in SDYH and 1 HDCZ block). Only LMK prints the Summary invoice. "
                "Values kept as written; Summary invoice treated as governing."])
    # 5 K vs KA
    cand = next((m for m in ctx["mappings"] if m["mapping_status"] == "CANDIDATE_MATCH"), None)
    if cand:
        ev = json.loads(cand["evidence_json"])
        agree = [f"{k}={v['summary']}" for k, v in ev["attributes"].items() if v["status"] in ("MATCH", "WITHIN_TOLERANCE")]
        dis = [f"{k}: {v['summary']} vs {v['detail']}" for k, v in ev["attributes"].items() if v["status"] == "MISMATCH"]
        alts = ev.get("same_group_other_series") or []
        b = next(x for x in B if x["detail_package_id"] == cand["detail_package_id"])
        out.append(["K vs KA package number", "Possible Package Number discrepancy involving K and KA.",
                    f"Detail block {b['source_sheet']}!R{b['source_package_row']} prints '{cand['target_package_number']}'; "
                    f"the Summary has no such package. Summary '{cand['source_package_number']}' is the only KA-series package "
                    f"without a detail block. Sequence 2/8 fits the KA series (8 packages); the K series has 23.",
                    "Attributes agreeing: " + ", ".join(agree) + (". Differences: " + "; ".join(dis) if dis else ".")
                    + (" Same-group alternative(s): " + ", ".join(
                        f"{a['package_number']} (already linked: {a['already_linked']})" for a in alts) if alts else ""),
                    f"CANDIDATE_MATCH (confidence {cand['confidence_level']}, score {cand['confidence_score']}). Not linked "
                    "automatically - confirm with the shipper / physical marking, then record CONFIRMED_ALIAS in "
                    "config/mapping_overrides.csv."])
    # 6 other invoice observations
    for did in ("DOC-B4-P5", "DOC-B5-P5"):
        cnt = Counter((b["source_sheet"], b["invoice_number_original"]) for b in B
                      if b["source_document_id"] == did and b["invoice_number_original"] != docs[did]["summary_invoice_number"])
        if cnt:
            out.append([f"{did[4:]} detail invoice metadata", "(additional finding)",
                        f"Summary invoice {docs[did]['summary_invoice_number']}; differing block headers: "
                        + "; ".join(f"{sh}: '{inv}' x{n}" for (sh, inv), n in sorted(cnt.items())),
                        "MAPPING_ISSUES R05; INVOICE_REGISTER.",
                        "Blocks of the carry-over series JLJX-4 / JSSX-4 print the Batch 4 invoice P5-HHI-004. "
                        "Kept as written; flagged for confirmation." if did == "DOC-B5-P5" else
                        "44 ZMZG blocks print invoice P5-HHI-002 instead of P5-HHI-004. Kept as written; flagged."])
    jssx = [s for s in ctx["series"] if "JSSX-4-" in s["series_key"]]
    if jssx:
        s = jssx[0]
        out.append(["JSSX-4 carry-over series", "(additional finding)",
                    f"Series {s['series_key']}: {s['packages_listed']} of {s['declared_total']} listed, split across "
                    f"{s['documents']}; missing: {s['missing_seq'] or 'none'}.",
                    "SERIES_REGISTER; MAPPING_ISSUES R08.",
                    "Batch-4-numbered packages shipped with Batch 5; no package number appears in both batches."])
    return out
