#!/usr/bin/env python3
"""
Executes every query in sql/app_queries.sql against the generated SQLite database with
realistic parameters and asserts the drill-down chain works end to end:

  Batch -> Category -> Summary package -> Detail blocks -> Material items -> back to package

Usage:  python3 -I etl/test_app_queries.py [path/to/MASTER_LOGISTICS_DATABASE.sqlite]
Exit code 0 = all assertions passed.
"""

import re
import sqlite3
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent


def load_queries(path):
    text = Path(path).read_text(encoding="utf-8")
    out = []
    for block in re.split(r"\n(?=-- Q\d\d )", text):
        m = re.match(r"-- (Q\d\d)\s+(.*)", block)
        if not m:
            continue
        sql = "\n".join(ln for ln in block.splitlines() if not ln.strip().startswith("--")).strip().rstrip(";")
        out.append((m.group(1), m.group(2).strip(), sql))
    return out


def main(db=None):
    db = Path(db or PROJECT / "output" / "MASTER_LOGISTICS_DATABASE.sqlite")
    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    one = lambda sql, *a: con.execute(sql, a).fetchone()  # noqa: E731

    split_pkg = one("SELECT package_id FROM DETAIL_PACKAGES WHERE is_split_child = 1 LIMIT 1")["package_id"]
    child = one("SELECT detail_package_id FROM DETAIL_PACKAGES WHERE is_split_child = 1 ORDER BY source_header_row LIMIT 1")["detail_package_id"]
    item = one("SELECT item_id FROM PACKAGE_DETAIL WHERE detail_package_id = ? ORDER BY line_seq LIMIT 1", child)["item_id"]
    base = dict(batch_id="B5", category="P5", search=None, mdr_status_code=None, rfs=None, min_volume=None,
                max_volume=None, min_gross_weight=None, max_gross_weight=None, page_size=25, offset=0,
                package_id=split_pkg, detail_package_id=child, item_id=item, severity=None, issue_type=None)
    overrides = {"Q16": dict(search="JLJX-4-34"), "Q07": dict(search="OLC")}

    failures = 0
    results = {}
    for qid, title, sql in load_queries(PROJECT / "sql" / "app_queries.sql"):
        params = dict(base, **overrides.get(qid, {}))
        names = set(re.findall(r":(\w+)", sql))
        try:
            rows = con.execute(sql, {k: params[k] for k in names}).fetchall()
            results[qid] = rows
            print(f"PASS {qid} {len(rows):>6} rows  {title}")
        except Exception as e:  # noqa: BLE001
            failures += 1
            print(f"FAIL {qid} {title}: {e}")

    def check(cond, msg):
        nonlocal failures
        print(("PASS " if cond else "FAIL ") + msg)
        failures += 0 if cond else 1

    k = results["Q01"][0]
    check(k["total_packages"] == one("SELECT COUNT(*) c FROM PACKAGE_MASTER")["c"], "Q01 KPI packages = PACKAGE_MASTER rows")
    check(sum(r["packages"] for r in results["Q02"]) == k["total_packages"], "Q02 batch/category packages add up to total")
    check(len(results["Q05"]) == 2 and len(results["Q06"]) == 2, "Q05/Q06 two batches and two categories")
    check(len(results["Q10"]) >= 2, "Q10 split package shows parent + sub-package blocks")
    check(any(r["is_split_parent"] for r in results["Q10"]) and any(r["is_split_child"] for r in results["Q10"]),
          "Q10 parent/child flags present")
    check(len(results["Q13"]) > 0, "Q13 items returned for a detail block")
    r = results["Q15"][0]
    check(r["package_id"] == split_pkg and r["batch_id"] == "B5", "Q15 reverse navigation item -> Summary package")
    check(len(results["Q16"]) > 0, "Q16 global search finds JLJX-4-34")
    check(len(results["Q17"]) == 1, "Q17 summary row traced to exactly one raw source row")
    check(len(results["Q18"]) > 0, "Q18 detail block traced to raw rows")
    check(len(results["Q20"]) == one("SELECT COUNT(*) c FROM DETAIL_PACKAGES WHERE is_split_child = 1")["c"],
          "Q20 lists every split sub-package")
    orphan = one("SELECT COUNT(*) c FROM PACKAGE_DETAIL it LEFT JOIN DETAIL_PACKAGES dp "
                 "ON dp.detail_package_id = it.detail_package_id WHERE dp.detail_package_id IS NULL")["c"]
    check(orphan == 0, "no orphan material items")
    check(con.execute("PRAGMA foreign_key_check").fetchall() == [], "PRAGMA foreign_key_check clean")
    print(f"\n{'ALL PASSED' if failures == 0 else f'{failures} FAILURE(S)'}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else None))
