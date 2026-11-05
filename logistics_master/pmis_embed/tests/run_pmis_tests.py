#!/usr/bin/env python3
"""
Regression test of the Logistics PMIS embed — run after the ETL:

    python3 pmis_embed/tests/run_pmis_tests.py [--db output/MASTER_LOGISTICS_DATABASE.sqlite] [--shots DIR]

1. builds the embed in a temporary folder (embedded data + a test Sheet ID) and checks the 1 MB limit;
2. turns LOGISTICS-PMIS-SHEET.xlsx into CSV per tab, as Google's gviz CSV export returns it;
3. exports the ETL reference (PACKAGE_READINESS, material lines per detail block);
4. runs test_pmis_embed.js in Chromium (Playwright) and checks every figure of its RESULT.
Needs Node.js with the 'playwright' package and its Chromium. Exit code 0 = all checks pass.
"""
import argparse
import csv
import io
import json
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PMIS = HERE.parent
BASE = PMIS.parent
sys.path.insert(0, str(PMIS))
import build_pmis_embed as B  # noqa: E402


def reference(db):
    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    pk = {r[0]: dict(st=r[1], sc=r[2], recv=r[3], loc=r[4], mdr=r[5], open=r[6], act=r[7], lg=r[8]) for r in c.execute(
        "SELECT package_id, readiness_status, readiness_score, receiving_date, site_location, mdr_state, open_issue_count, next_action, "
        "site_location_group FROM PACKAGE_READINESS")}
    locs = dict(c.execute("SELECT COALESCE(site_location_group, 'Not on site'), COUNT(*) FROM PACKAGE_READINESS GROUP BY 1"))
    items = dict(c.execute("SELECT detail_package_id, COUNT(*) FROM PACKAGE_DETAIL GROUP BY 1"))
    split = dict(c.execute("SELECT package_id, COUNT(*) n FROM DETAIL_PACKAGES WHERE package_id IS NOT NULL GROUP BY 1 HAVING n > 1 ORDER BY n DESC LIMIT 1"))
    grp = c.execute("SELECT package_group FROM PACKAGE_MASTER WHERE package_group IS NOT NULL ORDER BY batch_id, category, source_row LIMIT 1").fetchone()
    dwg = c.execute("SELECT drawing_number FROM PACKAGE_DETAIL WHERE drawing_number IS NOT NULL AND LENGTH(drawing_number) >= 6 LIMIT 1").fetchone()
    combos = c.execute("SELECT COUNT(DISTINCT batch_id || category) FROM PACKAGE_MASTER").fetchone()[0]
    pend = c.execute("SELECT COUNT(*) FROM PACKAGE_READINESS WHERE readiness_status = 'INSPECTED_MDR_PENDING'").fetchone()[0]
    dd = c.execute("SELECT substr(started_at, 1, 10) FROM IMPORT_HISTORY WHERE status = 'SUCCESS' ORDER BY started_at DESC LIMIT 1").fetchone()[0]
    return dict(pk=pk, items=items, itemsTotal=sum(items.values()), splitBlocks=split, combos=combos, pending=pend, dataDate=dd, locs=locs,
                searches=[s for s in (grp and grp[0], dwg and dwg[0]) if s])


def xlsx_to_csv(xlsx, out_dir):
    from openpyxl import load_workbook
    wb = load_workbook(xlsx, read_only=True)
    for ws in wb.worksheets:
        buf = io.StringIO()
        w = csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator="\n")
        for row in ws.iter_rows(values_only=True):
            w.writerow(["" if v is None else str(v) for v in row])
        (out_dir / f"{ws.title}.csv").write_text(buf.getvalue(), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(BASE / "output" / "MASTER_LOGISTICS_DATABASE.sqlite"))
    ap.add_argument("--shots", default="", help="folder for screenshots (optional)")
    a = ap.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        rpt = B.build(B.argparse.Namespace(db=a.db, out_dir=str(tmp), project="Test Project", sheet_id="TESTSHEET_0123456789abcdefghij",
                                           image="", no_data=False, no_sheet=False))
        xlsx_to_csv(tmp / "LOGISTICS-PMIS-SHEET.xlsx", tmp)
        ref = reference(a.db)
        (tmp / "ref.json").write_text(json.dumps(ref), encoding="utf-8")
        cmd = ["node", str(HERE / "test_pmis_embed.js"), str(tmp / "LOGISTICS-PMIS-PREVIEW.html"), str(tmp / "ref.json"), str(tmp)]
        if a.shots:
            cmd.append(str(Path(a.shots).resolve()))
        run = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        line = next((l for l in run.stdout.splitlines() if l.startswith("RESULT ")), None)
        if not line:
            print(run.stdout[-2000:], run.stderr[-2000:])
            raise SystemExit("no RESULT from the browser test")
        R = json.loads(line[7:])

    checks = []

    def chk(name, ok, got):
        checks.append((name, bool(ok), got))

    if "fatal" in R:
        chk("browser run", False, R["fatal"])
    else:
        o, P, n = R["offline"], R["pages"], len(ref["pk"])
        chk("embed under 1 MB", rpt["bytes"] < B.LIMIT, f"{rpt['bytes']:,} bytes · {rpt['layout']}")
        chk("all packages loaded", o["packages"] == n, f"{o['packages']} / {n}")
        chk("readiness = ETL for every package (status, score, receiving date, MDR, location, location group, action, issues)",
            not any(o["diff"].values()) and o["mism"] == 0, f"{o['diff']} {o['examples']}")
        chk("data date = ETL run date", o["dataDate"] == ref["dataDate"], o["dataDate"])
        chk("overview panels / insights / checks", P["overviewPanels"] == 2 and P["insights"] > 0 and P["checks"] > 0,
            (P["overviewPanels"], P["insights"], P["checks"]))
        chk("overview: one row per site location (laydown summary)", P["locRows"] == len(ref["locs"]), (P["locRows"], ref["locs"]))
        chk("location row opens the packing list with exactly its packages", P["locOpen"]["rows"] == ref["locs"].get(P["locOpen"]["loc"]),
            (P["locOpen"], ref["locs"].get(P["locOpen"]["loc"])))
        chk("location buttons on the packing list", P["locButtons"] == len(ref["locs"]) + 1, P["locButtons"])
        chk("receiving: one row per batch·category + chart", P["receivingGroups"] == ref["combos"] and P["chartSvg"] == 1, (P["receivingGroups"], P["chartSvg"]))
        chk("receiving drill-down to packages", P["receivingDrillPackages"] > 0, P["receivingDrillPackages"])
        chk("packing list rows (first 300)", P["packingRows"] == min(300, n), P["packingRows"])
        chk("split package shows all detail blocks", P["splitBlocks"] == P["splitBlocksExpected"], (P["splitBlocks"], P["splitBlocksExpected"]))
        chk("material lines of a block (compressed block unpacked)", P["items"]["n"] == P["itemsExpected"] and P["items"]["loaded"] == P["itemsTotal"],
            (P["items"], P["itemsExpected"], P["itemsTotal"]))
        chk("search finds package group and item drawing", all(v > 0 for v in P["search"].values()) and len(P["search"]) == len(ref["searches"]), P["search"])
        chk("status filter = ETL count (MDR pending)", P["pendingRows"] == ref["pending"], (P["pendingRows"], ref["pending"]))
        chk("exceptions by type + filter", P["issueTypes"] > 0 and P["issueRowsFiltered"] > 0, (P["issueTypes"], P["issueRowsFiltered"]))
        chk("tonnage basis", all(s.startswith("t") for s in P["tonnage"]), P["tonnage"])
        chk("dark theme from the hub toggle", P["theme"] == "dark", P["theme"])
        lv = R.get("live") or {}
        chk("live sheet: edited package follows the sheet", lv.get("edited") and lv.get("status") in ("READY", "PEND") and lv.get("etl") == "AWAITING_RECEIVING", lv)
        chk("live sheet: edit flagged against the ETL column", lv.get("mism") == 1 and "Data check" in lv.get("chip", ""), (lv.get("mism"), lv.get("chip")))
        ph = R["phone"]
        chk("phone: no horizontal scrolling", ph["scrollWidth"] <= ph["innerWidth"], ph)
    chk("no JavaScript errors", not R.get("errors"), R.get("errors"))
    w = max(len(c[0]) for c in checks)
    for name, ok, got in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {name.ljust(w)}  {got if not ok or isinstance(got, str) else ''}".rstrip())
    bad = [c for c in checks if not c[1]]
    print(f"\n{len(checks) - len(bad)} / {len(checks)} checks pass")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
