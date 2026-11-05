#!/usr/bin/env python3
"""
Independent QA of the delivered outputs (does NOT reuse the ETL parser).

  1. Summary package numbers per workbook (pandas)        == PACKAGE_MASTER
  2. Detail package numbers per sheet (raw cell scan)      == DETAIL_PACKAGES
  3. Every PACKAGE_DETAIL row: its source Excel row really contains the item's
     description, quantity and total weight (cell-level lineage check)
  4. Gross weight / volume totals per workbook (pandas)    == PACKAGE_MASTER sums
  5. Excel master: sheet row counts == DB; BATCH_SUMMARY checks all 'OK'
  6. Reconciliation report: COUNT_RECON all PASS
  7. CSV row counts == DB
  8. Source workbooks unchanged (SHA-256 equals SOURCE_DOCUMENTS)

Usage: python3 -I etl/qa_verify_outputs.py
"""

import csv
import hashlib
import re
import sqlite3
import sys
import unicodedata
import warnings
from pathlib import Path

import openpyxl
import pandas as pd

warnings.filterwarnings("ignore")
P = Path(__file__).resolve().parent.parent
OUT = P / "output"
DB = OUT / "MASTER_LOGISTICS_DATABASE.sqlite"
PKG = re.compile(r"^P\d-HHI-\d{4}-")
fails = 0


def ok(cond, msg):
    global fails
    print(("PASS  " if cond else "FAIL  ") + msg)
    fails += 0 if cond else 1


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", str(s))).strip().upper()


con = sqlite3.connect(DB)
docs = {r[0]: (r[1], r[2]) for r in con.execute("SELECT source_document_id, source_file_name, file_sha256 FROM SOURCE_DOCUMENTS")}
src_dir = P / "source"

for did, (fname, sha) in docs.items():
    path = src_dir / fname
    # 8 source unchanged
    ok(hashlib.sha256(path.read_bytes()).hexdigest() == sha, f"{did} source file unchanged (SHA-256)")

    # 1 summary numbers via pandas
    df = pd.read_excel(path, sheet_name="Summary Packing List", header=None, dtype=object)
    col = df.iloc[:, 3].dropna().astype(str).str.strip()
    src_pk = set(col[col.str.match(PKG)])
    db_pk = {r[0] for r in con.execute("SELECT package_number_original FROM PACKAGE_MASTER WHERE source_document_id=?", (did,))}
    ok(src_pk == db_pk, f"{did} Summary package numbers: source {len(src_pk)} == DB {len(db_pk)}")

    # 4 totals via pandas (header row = row whose col A is S/N; G.W. = col O, volume = col M)
    hdr = df.index[df.iloc[:, 0].astype(str).str.strip().eq("S/N")][0]
    body = df.iloc[hdr + 1:]
    body = body[body.iloc[:, 3].astype(str).str.match(PKG)]
    gw = pd.to_numeric(body.iloc[:, 14], errors="coerce").sum()
    vol = pd.to_numeric(body.iloc[:, 12], errors="coerce").sum()
    dgw, dvol = con.execute("SELECT SUM(gross_weight_kg), SUM(volume_m3) FROM PACKAGE_MASTER WHERE source_document_id=?", (did,)).fetchone()
    ok(abs(gw - dgw) < 0.01 and abs(vol - dvol) < 0.001, f"{did} G.W. {gw:,.2f} / volume {vol:,.3f} == DB")

    # 2 + 3 detail
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    items = con.execute("SELECT source_sheet, source_row, description_en, description_cn, quantity, total_weight_kg "
                        "FROM PACKAGE_DETAIL WHERE source_document_id=?", (did,)).fetchall()
    by_sheet = {}
    for it in items:
        by_sheet.setdefault(it[0], []).append(it)
    for sheet in {r[0] for r in con.execute("SELECT DISTINCT source_sheet FROM DETAIL_PACKAGES WHERE source_document_id=?", (did,))}:
        rows = list(wb[sheet].iter_rows(max_col=20, values_only=True))
        src_blocks = []
        for i, r in enumerate(rows[:-1]):
            if r[0] is not None and str(r[0]).strip().lower().startswith("package no"):
                src_blocks.append(str(rows[i + 1][0]))
        db_blocks = [r[0] for r in con.execute("SELECT package_number_original FROM DETAIL_PACKAGES WHERE source_document_id=? "
                                               "AND source_sheet=? ORDER BY source_header_row", (did, sheet))]
        ok(src_blocks == db_blocks, f"{did}/{sheet} detail package numbers in order: {len(src_blocks)} == {len(db_blocks)}")
        bad = 0
        for sh, rno, den, dcn, q, tw in by_sheet.get(sheet, []):
            cells = rows[rno - 1]
            texts = {norm(c) for c in cells if c is not None}
            nums = [float(c) for c in cells if isinstance(c, (int, float))]
            d_ok = (den is None or norm(den) in texts) and (dcn is None or norm(dcn) in texts)
            q_ok = q is None or any(abs(n - q) < 1e-6 for n in nums)
            w_ok = tw is None or any(abs(n - tw) < 1e-4 for n in nums)
            bad += 0 if (d_ok and q_ok and w_ok) else 1
        ok(bad == 0, f"{did}/{sheet} cell-level lineage of {len(by_sheet.get(sheet, []))} items ({bad} mismatches)")
    wb.close()

# 5 Excel master
counts = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in
          ("PACKAGE_MASTER", "DETAIL_PACKAGES", "PACKAGE_DETAIL", "PACKAGE_MAPPING", "MAPPING_ISSUES", "INVOICE_REGISTER", "CHANGE_LOG")}
counts["LOGISTICS_READINESS"] = con.execute("SELECT COUNT(*) FROM PACKAGE_READINESS").fetchone()[0]
wb = openpyxl.load_workbook(OUT / "MASTER_LOGISTICS_PACKING_LIST_CLEAN.xlsx", read_only=True, data_only=True)
expected_sheets = ["README", "DATA_DICTIONARY", "SOURCE_REGISTER", "PACKAGE_MASTER", "DETAIL_PACKAGES", "PACKAGE_DETAIL",
                   "PACKAGE_MAPPING", "MAPPING_ISSUES", "INVOICE_REGISTER", "BATCH_SUMMARY", "DATA_QUALITY_REPORT", "CHANGE_LOG",
                   "LOGISTICS_READINESS"]
ok(wb.sheetnames == expected_sheets, f"Excel master has the 12 required sheets in order (+ LOGISTICS_READINESS)")
for t, n in counts.items():
    got = sum(1 for r in wb[t].iter_rows(min_row=2, values_only=True) if any(v is not None for v in r))
    ok(got == n, f"Excel {t}: {got} data rows == DB {n}")
checks = [r[16] for r in wb["BATCH_SUMMARY"].iter_rows(values_only=True) if len(r) > 16 and r[16] in ("OK", "CHECK")]
ok(checks and all(c == "OK" for c in checks), f"BATCH_SUMMARY formula cross-checks: {checks}")
wb.close()

# 6 Recon report
wb = openpyxl.load_workbook(OUT / "LOGISTICS_DATA_RECONCILIATION_REPORT.xlsx", read_only=True, data_only=True)
st = [r[6] for r in wb["COUNT_RECON"].iter_rows(min_row=3, values_only=True) if r and r[6]]
ok(st and all(s == "PASS" for s in st), f"COUNT_RECON: {len(st)} lines, all PASS={all(s == 'PASS' for s in st)}")
wb.close()

# 7 CSV
for t in ("PACKAGE_MASTER", "DETAIL_PACKAGES", "PACKAGE_DETAIL", "PACKAGE_MAPPING", "MAPPING_ISSUES", "STG_DETAIL_ROWS"):
    with open(OUT / "csv" / f"{t}.csv", encoding="utf-8", newline="") as f:
        n = sum(1 for _ in csv.reader(f)) - 1
    ok(n == con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0], f"CSV {t}: {n} rows == DB")

print("\nQA RESULT:", "ALL PASSED" if fails == 0 else f"{fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
