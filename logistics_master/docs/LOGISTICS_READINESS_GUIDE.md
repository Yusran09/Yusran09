# Logistics Readiness Module

**Logistics Readiness** shows whether each shipped package can be issued to construction. The module has three parts:

| Part | Location |
|---|---|
| Readiness engine (ETL) | `etl/lpl/readiness.py`, rules in `config/readiness_rules.json` |
| Database table & views | `PACKAGE_READINESS`, `REFERENCE_READINESS_STATUS`, `v_readiness_summary`, `v_readiness_by_system`, `v_readiness_status_distribution`, `v_receiving_curve` |
| Web dashboard | `../logistics-readiness.html` and `../assets/js/logistics-readiness.js`, using the same design system as `index.html` |
| Excel | sheet `LOGISTICS_READINESS` in `MASTER_LOGISTICS_PACKING_LIST_CLEAN.xlsx` |
| Tests | `etl/test_webapp_readiness.js` (Playwright end-to-end), checks C70–C74, queries Q27–Q33 |

---

## 1. Business objective

Answer, for every package of Batch 4 / Batch 5 (P3, P5):

1. **Can it be issued to construction today?** A package is ready only when its packing list is verified, its MDR is approved and it has been received and inspected at site.
2. **If not, what blocks it, and who acts?** Logistics, QA/QC and Document Control each get their own action list.
3. **How fast is site receiving progressing** against what has been shipped, by count and by tonnage?

## 2. Technical methodology: readiness gates

Each package is evaluated against four gates. Weights and credits are configurable.

| Gate | Weight | Credit rule | Source fields |
|---|---:|---|---|
| **PL** – Packing List Verified | 15 | 1 if ≥ 1 Detail block is linked (EXACT / NORMALIZED / SPLIT / CONFIRMED_ALIAS) and there is no open blocking issue | `PACKAGE_MAPPING`, `MAPPING_ISSUES` |
| **MDR** – MDR Approved | 35 | APV = 1 · *not required* = 1 · RES = 0.5 · Not submitted / No MDR / blank = 0 | `mdr_status_code`; "MDR not required" in MDR No. or Remark |
| **SITE** – Arrived on Site | 15 | 1 if there is an inspection record, a site tag (`onsite`) or a location remark (Laydown / Askara / Camp …) | `rfs_material_receiving`, `inspection_date`, `remark`, `SOURCE_ANNOTATIONS` |
| **INSP** – Received & Inspected | 35 | 1 if RFS Material Receiving **and** an inspection date exist. RFS only = 0.5 | `rfs_material_receiving`, `inspection_date(_original)` |

**Readiness Index** = Σ (weight × credit), from 0 to 100. Aggregates are shown two ways:

* by **package count**: the average of the package scores;
* by **tonnage**: the gross-weight weighted average. Heavy packages drive construction, so this is the default in the hero ring.

**Readiness status** is mutually exclusive and evaluated in this order:

| Status | Rule | Standard action |
|---|---|---|
| `BLOCKED` | PL gate not met | Resolve the packing-list identity issue |
| `READY_FOR_CONSTRUCTION` | Inspected **and** MDR credit = 1 | Available for issue to construction |
| `INSPECTED_MDR_PENDING` | Inspected, MDR not approved | Expedite MDR with vendor / QA-QC |
| `ON_SITE_AWAITING_INSPECTION` | Site evidence, no RFS / inspection | Raise RFS, inspect |
| `AWAITING_RECEIVING` | Shipped (in the final packing list), no site record | Track delivery; finish MDR before arrival |

The engine computes the status once, in the ETL. The web app, Excel and SQL views only filter and aggregate it, so all
outputs give the same answer. Invoice and weight discrepancies are shown as *Document Discrepancies*. They do not
block readiness by default; the list of blocking issue types is configurable (`blocking_issue_types`).

## 3. Current result (import of 05 Nov 2026)

| Status | Packages | Tonnage (t) |
|---|---:|---:|
| Ready for Construction | 341 | 1,693.0 |
| Inspected – MDR Pending | 10 | 45.1 |
| On Site – Awaiting Inspection | 10 | 89.4 |
| Shipped – Awaiting Site Receiving | 791 | 4,982.3 |
| Blocked – Packing List Issue | 1 | 9.1 |
| **Total** | **1,153** | **6,818.9** |

| Batch · Cat | Packages | Readiness Index (count / tonnage) | Ready |
|---|---:|---|---:|
| B4 · P3 | 122 | 21.2 % / 21.2 % | 6 |
| B4 · P5 | 586 | 78.6 % / 76.5 % | 335 |
| B5 · P3 | 292 | 32.5 % / 34.8 % | 0 |
| B5 · P5 | 153 | 38.7 % / 38.3 % | 0 |
| **All** | **1,153** | **55.5 % / 52.5 %** | **341** |

Key findings:

* All **10 packages already received and inspected in B5-P3 are MDR-pending**: 3 with no MDR status, 5 with "No MDR submitted from HHI" and 2 with Resubmit. None can be issued yet.
* **10 more B5-P3 packages are tagged "onsite"** by the site team but have no RFS or inspection record yet.
* Site receiving started on 25 Jul 2026. By 03 Nov 2026, **351 packages (1,738 t) had been inspected**, 30.4 % of the packages shipped.
* **Pre-arrival MDR risk:** 461 packages not yet received still have no approved MDR. The largest groups are B5-P3 Resubmit (210 packages) and B4-P3 with no MDR status (109 packages).
* The receiving counts match the site team's own pivot totals in the source workbooks: B4-P5 has 335 inspected and B5-P3 has 10.

## 4. Implementation approach

```
4 packing-list workbooks ──ETL──> SQLite (PACKAGE_MASTER, MAPPING, ISSUES)
                                      │
               readiness_rules.json ──┤  readiness.evaluate()
                                      ▼
                         PACKAGE_READINESS (+ views)  ──> Excel sheet LOGISTICS_READINESS
                                      │                ──> Power BI (optional)
                                      ▼
            output/webapp/logistics_readiness_data.js / .json  (git-ignored, confidential)
                                      │
                                      ▼
            logistics-readiness.html + assets/js/logistics-readiness.js  (static, no server needed)
```

### Run

```bash
python3 -I logistics_master/etl/run_etl.py      # rebuilds DB, Excel, CSV and web data
# open logistics-readiness.html in a browser (double-click works: data loads via <script>)
node logistics_master/etl/test_webapp_readiness.js   # optional end-to-end test (Playwright)
```

If the data file is missing (for example on the public GitHub Pages site), the page shows a **Load data** panel. You
can then drag in `logistics_readiness_data.json` and it is processed locally in the browser. Nothing is uploaded.
`?data=<url>` also works when the page is served over HTTP.

### Dashboard sections

| Section | Content |
|---|---|
| Hero | Tonnage-weighted Readiness Index ring, packages, tonnage, ready, inspected, data provenance (import id, timestamp, DQ status) |
| Filter bar | Batch, Category, System, Status, MDR state, Location, free-text search (package no., equipment, MDR, RFS, description), basis Count / Tonnage. All sections follow the filters |
| Overview | 6 KPI cards, readiness gate completion bars, status donut (click a status to filter) |
| Receiving | Receiving S-curve (inspected vs ready, as % of shipped) and weekly receiving bars (ISO weeks) |
| Breakdown | Batch × Category cards (click to filter), readiness by system, MDR status stacked bars, site location |
| Actions | Blocked · Inspected–MDR pending · On site–awaiting inspection · Pre-arrival MDR risk · Document discrepancies · Ready (by location) |
| Register | Sortable, paginated package register with gate icons, score bar, status, next action, CSV export |
| Drawer | Per-package readiness ring, gate checklist with points, package facts, open issues, detail packing list blocks (split tree) with material items, source trace (workbook › sheet › row) |

### Tuning the rules

Edit `config/readiness_rules.json` and re-run the ETL. You can change:

* gate weights (they must sum to 100);
* MDR credits;
* "MDR not required" text patterns;
* on-site and location patterns;
* blocking issue types;
* status labels, colours and actions.

`rules_version` is stored on every readiness row.

## 5. Risks and limitations

| Risk | Mitigation |
|---|---|
| "Awaiting receiving" does not mean "in transit". It only means no site record exists in these workbooks | The label reads "no site record". Integrate the site receiving log (see web-app guide §7) to separate in-transit from not-yet-recorded |
| Readiness has no required-on-site (ROS) date, so it cannot say *late* | Planned next step: link `equipment_number` / system to Primavera P6 activities and ROS dates, then add *Ready vs Need date* (float) and a forecast |
| Multi-date inspection cells (4 packages) | The receiving curve uses the latest plausible date. The original text is kept and flagged (R18) |
| Location conflicts (e.g. remark *Laydown 4* vs site note *Mechanical part at Camp HHI*) | The formal Remark column wins. The site note is shown in the drawer for review |
| Confidential data on a public site | The data file is git-ignored and the page holds no data. Load it locally or host it privately |

## 6. Recommended KPIs

| KPI | Definition | Target / use |
|---|---|---|
| Logistics Readiness Index (t) | Σ score × G.W. / Σ G.W. | Headline. Trend weekly |
| Ready for Construction % | Ready ÷ shipped (count and t) | Material available to construction |
| Receiving progress % | Inspected ÷ shipped; weekly receipts | Site receiving throughput (S-curve) |
| MDR approval % | MDR credit = 1 ÷ shipped | Document readiness |
| Pre-arrival MDR readiness % | MDR approved ÷ awaiting-receiving packages | Will packages be ready on arrival? (currently 41.7 %) |
| Material on site not issuable | Inspected–MDR pending + On site–awaiting inspection | Should trend to 0. Escalate if older than 7 days |
| Blocked packages | Status BLOCKED | Must be 0 before receiving |

## 7. Reporting structure

| Report | Audience | Content from the module |
|---|---|---|
| Weekly Logistics Readiness report | Logistics, Site, QA/QC | KPI cards, S-curve, weekly receipts, action lists (MDR pending, awaiting inspection) |
| Monthly report | Project Controls / PM | Readiness Index trend by batch/category and system, tonnage ready, pre-arrival MDR risk |
| Steering committee | Management | Headline index, ready tonnage, top blockers and owners |

## 8. Power BI (optional)

Import `PACKAGE_READINESS` as the fact table. Relate it to `PACKAGE_MASTER` on `package_id`, and add the reference
tables as dimensions.

```DAX
Packages           = COUNTROWS ( PACKAGE_READINESS )
Tonnage (t)        = DIVIDE ( SUM ( PACKAGE_READINESS[gross_weight_kg] ), 1000 )
Readiness Index    = AVERAGE ( PACKAGE_READINESS[readiness_score] )
Readiness Index t  = DIVIDE ( SUMX ( PACKAGE_READINESS, PACKAGE_READINESS[readiness_score] * PACKAGE_READINESS[gross_weight_kg] ),
                              SUM ( PACKAGE_READINESS[gross_weight_kg] ) )
Ready %            = DIVIDE ( CALCULATE ( [Packages], PACKAGE_READINESS[readiness_status] = "READY_FOR_CONSTRUCTION" ), [Packages] )
Inspected %        = DIVIDE ( CALCULATE ( [Packages], PACKAGE_READINESS[inspected] = 1 ), [Packages] )
Cum. Inspected     = CALCULATE ( [Packages], PACKAGE_READINESS[inspected] = 1,
                                 FILTER ( ALL ( 'Date' ), 'Date'[Date] <= MAX ( 'Date'[Date] ) ) )   -- relate 'Date' to receiving_date
```
