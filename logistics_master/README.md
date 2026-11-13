# Logistics Master Database: Packing Lists Batch 4 / Batch 5 (P3 · P5)

This folder holds the data engineering foundation for a Logistics Web App. It turns four original packing-list
workbooks into one relational, traceable and validated master dataset. The drill-down path is
**Batch → Category → Summary Package → Detail Package → Material Item**.

## Result of the current import

| | B4-P3 | B4-P5 | B5-P3 | B5-P5 | **Total** |
|---|---:|---:|---:|---:|---:|
| Summary packages | 122 | 586 | 292 | 153 | **1,153** |
| Detail package blocks | 122 | 586 | 292 | 163 | **1,163** |
| Material item rows | 1,946 | 11,230 | 3,213 | 554¹ | **16,943** |
| Gross weight (t) | 912.8 | 3,102.1 | 1,697.5 | 1,106.4 | **6,818.9** |
| Volume (m3) | 3,231.1 | 12,760.8 | 9,556.3 | 3,673.9 | **29,222.1** |

¹ Includes 10 manifest lines in split-package parent blocks (`item_type = SUB_PACKAGE_REFERENCE`).

**Mapping:** 1,152 exact matches, 10 split sub-packages (linked on manifest evidence), 1 candidate alias pending review
(`HDCZ-K-5-2/8` → `HDCZ-KA-5-2/8`), 1 Summary package without detail (the counterpart of that candidate), and
0 unmatched detail blocks.

**Exceptions:** 706 logged (49 HIGH · 366 MEDIUM · 270 LOW · 21 INFO). See `MAPPING_ISSUES`.

**Validation:** 129 checks, 0 FAIL. Independent QA verified every item against its source cell, as well as
package-number sets, totals, Excel/CSV row counts and source-file hashes. All 34 web-app queries pass, and the readiness dashboard end-to-end test passes.

## Logistics Readiness module (web dashboard)

`../logistics-readiness.html` is a dashboard in the same style as the portfolio page `index.html`. It shows, per
package, whether material is **Ready for Construction**: packing list verified, MDR approved, and received and
inspected at site (RFS).

* Readiness is computed by the ETL: `etl/lpl/readiness.py`, with rules in `config/readiness_rules.json`, stored in
  `PACKAGE_READINESS`.
* The ETL writes `output/webapp/logistics_readiness_data.js` / `.json`. These are git-ignored because they contain
  confidential data. The page loads them automatically, or you can drag the JSON onto the page.
* **Current result:** 341 packages (1,693 t) are ready, 10 are inspected but MDR-pending, 10 are on site awaiting
  inspection, 791 are awaiting site receiving and 1 is blocked. Readiness Index is 55.5 % by count and 52.5 % by
  tonnage.
* Details are in [docs/LOGISTICS_READINESS_GUIDE.md](docs/LOGISTICS_READINESS_GUIDE.md). The end-to-end test is
  `node etl/test_webapp_readiness.js`.

## Logistics Readiness · PMIS embed (DS v8)

`pmis_embed/` builds the same readiness dashboard as a **PMIS embed** in the Clean Enterprise UI (DS v8) of the
PMIS hub (Resources · TIA · Schedule): navigator bar, welcome page, settings and data blocks as text, engine stored
compressed so the code stays under 1 MB. Five pages: Overview, Receiving, Packing List (Summary › Detail › Items),
Exceptions and Foundations. It reads embedded data or a Google Sheet (tabs Packages / Detail / Items / Issues) and recomputes
readiness with the ETL rules; any difference with the ETL is flagged.

* `python3 pmis_embed/build_pmis_embed.py` writes `output/pmis/LOGISTICS-PMIS-KODE.txt` (paste into the website),
  a local preview and `LOGISTICS-PMIS-SHEET.xlsx` (the four tabs for Google Sheets). Current size: ±899 KB, ±961 KB
  with the foundation snapshot.
* `python3 pmis_embed/tests/run_pmis_tests.py` runs 43 browser checks (all 1,153 packages equal to
  `PACKAGE_READINESS`, all pages, the live-sheet path, the foundation matching against a Python mirror, phone layout,
  no JavaScript errors). It uses a synthetic foundation register built from the ETL drawing numbers, or the real one
  with `--foundation FILE`.
* Material on site per location (Laydown 4 / Laydown 5 / Askara …, from the Summary Remark column U or T and the
  site tags in V / W): overview section, location buttons on the Packing List page and a location marker per package.
* Drawing list: every material line with its drawing number for the filtered packages (e.g. MDR approved at Laydown 4 +
  Laydown 5), printable on A4 (full or compact) and downloadable as Excel (.xlsx), built in the browser.
* Foundations (page 05): the foundation register (Axis ID in column B, Foundation Works in column R; live from a
  "Publish to web" CSV link, with a compressed snapshot in the code via `--foundation`) is linked to the material
  through the drawing number (`02J3Z043-HJ-1` → axis `O2J3Z043`; O = 0, ranges expanded). Per axis: foundation
  status and where its material is (on site / partly / in transit / none); matrix, linear view per STA, axis detail,
  print and Excel. The drawing list and package lines show the foundation status of each drawing.
* How-to (Indonesian): [pmis_embed/README.md](pmis_embed/README.md).

## Folder structure

```
logistics_master/
├── etl/
│   ├── run_etl.py               # entry point - reusable, re-runnable ETL
│   ├── lpl/                     # package: schema, normalize, parse, mapping, controls, export, excel
│   ├── test_app_queries.py      # runs every query in sql/app_queries.sql + drill-down assertions
│   ├── qa_verify_outputs.py     # independent QA (pandas / raw cells), not reusing the parser
│   └── test_webapp_readiness.js # Playwright end-to-end test of logistics-readiness.html
├── config/
│   ├── source_manifest.json     # the 4 workbooks: batch, category, file-name matching tokens
│   ├── readiness_rules.json     # logistics readiness gates, weights, MDR credits, statuses
│   └── mapping_overrides.csv    # manual review decisions (CONFIRMED_ALIAS / REJECTED) - empty on delivery
├── docs/
│   ├── LOGISTICS_DATA_MODEL.md
│   ├── LOGISTICS_DATA_DICTIONARY.md          (generated)
│   ├── LOGISTICS_MAPPING_RULES.md
│   ├── LOGISTICS_WEBAPP_IMPLEMENTATION_GUIDE.md
│   ├── LOGISTICS_READINESS_GUIDE.md
│   └── LOGISTICS_SOURCE_AUDIT_REPORT.md      (generated)
├── sql/
│   ├── schema.sql               # DDL + views (generated; PostgreSQL-compatible types)
│   └── app_queries.sql          # 34 reference queries for the web app (Q27-Q34 readiness, Q34 = on site by location)
├── pmis_embed/                  # Logistics Readiness as a PMIS embed (DS v8): builder, framework, src, tests
├── source/                      # the four original workbooks - NOT committed (confidential)
└── output/                      # generated deliverables - NOT committed (confidential)
    ├── MASTER_LOGISTICS_DATABASE.sqlite
    ├── MASTER_LOGISTICS_PACKING_LIST_CLEAN.xlsx
    ├── LOGISTICS_DATA_RECONCILIATION_REPORT.xlsx
    ├── csv/<TABLE>.csv          # 24 tables, UTF-8
    ├── webapp/logistics_readiness_data.js|.json   # data for logistics-readiness.html
    └── pmis/LOGISTICS-PMIS-KODE.txt|PREVIEW.html|SHEET.xlsx   # PMIS embed + Google Sheet tabs
```

## Run

```bash
pip install -r etl/requirements.txt          # openpyxl, pandas (pandas only for QA)
# put the four workbooks in logistics_master/source/  (any file names; matched by tokens in the manifest)
python3 -I etl/run_etl.py                    # ~30 s; exit code 0 = no failed checks, 2 = failed checks
python3 -I etl/test_app_queries.py           # query layer smoke test
node etl/test_webapp_readiness.js            # web dashboard end-to-end test (Playwright)
python3 -I etl/qa_verify_outputs.py          # independent QA
python3 pmis_embed/build_pmis_embed.py       # PMIS embed (output/pmis/)
python3 pmis_embed/tests/run_pmis_tests.py   # PMIS embed browser test (Node + Playwright)
```

Options: `--source-dir`, `--output-dir`, `--config-dir`, `--docs-dir`, `--skip-excel`.

The ETL is safe to re-run:

* Source files are opened read-only.
* Ids are deterministic, so the same input produces the same ids.
* The database is rebuilt in a temp file and swapped in atomically.
* `IMPORT_HISTORY` and `AUDIT_LOG` keep every run.
* Review decisions in `config/mapping_overrides.csv` are re-applied on every run.

The Excel files open with `fullCalcOnLoad`. The delivered copies were also recalculated with LibreOffice and have
0 formula errors.

## Known limitations

* The previous-processing references named in the brief (styled master xlsx, sqlite, implementation guide, queries
  .sql) were **not available**. Their figures were checked against the source workbooks instead (reconciliation
  report → SUMMARY and INVESTIGATIONS). The brief's 17,140 item rows could not be traced to a definition. The
  report lists the exact row accounting and alternative totals.
* `received_quantity` is the Summary column headed *Quantity* next to RFS / Inspection Date. Its meaning is inferred
  from position and from the site pivot that sums it. Confirm this with the site team.
