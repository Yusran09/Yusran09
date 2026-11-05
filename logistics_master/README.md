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

**Validation:** 116 checks, 0 FAIL. Independent QA verified every item against its source cell, as well as
package-number sets, totals, Excel/CSV row counts and source-file hashes. All 26 web-app queries pass.

## Folder structure

```
logistics_master/
├── etl/
│   ├── run_etl.py               # entry point - reusable, re-runnable ETL
│   ├── lpl/                     # package: schema, normalize, parse, mapping, controls, export, excel
│   ├── test_app_queries.py      # runs every query in sql/app_queries.sql + drill-down assertions
│   └── qa_verify_outputs.py     # independent QA (pandas / raw cells), not reusing the parser
├── config/
│   ├── source_manifest.json     # the 4 workbooks: batch, category, file-name matching tokens
│   └── mapping_overrides.csv    # manual review decisions (CONFIRMED_ALIAS / REJECTED) - empty on delivery
├── docs/
│   ├── LOGISTICS_DATA_MODEL.md
│   ├── LOGISTICS_DATA_DICTIONARY.md          (generated)
│   ├── LOGISTICS_MAPPING_RULES.md
│   ├── LOGISTICS_WEBAPP_IMPLEMENTATION_GUIDE.md
│   └── LOGISTICS_SOURCE_AUDIT_REPORT.md      (generated)
├── sql/
│   ├── schema.sql               # DDL + views (generated; PostgreSQL-compatible types)
│   └── app_queries.sql          # 26 reference queries for the web app
├── source/                      # the four original workbooks - NOT committed (confidential)
└── output/                      # generated deliverables - NOT committed (confidential)
    ├── MASTER_LOGISTICS_DATABASE.sqlite
    ├── MASTER_LOGISTICS_PACKING_LIST_CLEAN.xlsx
    ├── LOGISTICS_DATA_RECONCILIATION_REPORT.xlsx
    └── csv/<TABLE>.csv          # 22 tables, UTF-8
```

## Run

```bash
pip install -r etl/requirements.txt          # openpyxl, pandas (pandas only for QA)
# put the four workbooks in logistics_master/source/  (any file names; matched by tokens in the manifest)
python3 -I etl/run_etl.py                    # ~30 s; exit code 0 = no failed checks, 2 = failed checks
python3 -I etl/test_app_queries.py           # query layer smoke test
python3 -I etl/qa_verify_outputs.py          # independent QA
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
