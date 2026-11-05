# Logistics Mapping Rules

How the ETL reads the packing lists, normalises identifiers, links Summary packages to Detail package blocks, and logs
exceptions. The implementation is in `etl/lpl/parse.py`, `normalize.py`, `mapping.py` and `controls.py`.

Figures quoted are from the current import (see `IMPORT_HISTORY`).

---

## 1. Source reading rules

### 1.1 Worksheet roles (auto-detected)

| Role | Detection | In scope |
|---|---|---|
| SUMMARY | Sheet named `Summary Packing List` | Yes → PACKAGE_MASTER |
| DETAIL | Contains rows whose column A starts with `Package No.` | Yes → DETAIL_PACKAGES / PACKAGE_DETAIL |
| IMPORT_PACKING_LIST | Name contains `IMPORT` | Invoice totals only → INVOICE_REGISTER |
| LEGACY_SALES_CONTRACT | `出口合同` / "SALES CONTRACT" (hidden, invoice HHI-001, every formula returns a reference error) | No (registered only) |
| SHIPPING_MARK_TEMPLATE | Name contains `Shipping Mark` (hidden, earlier shipment) | No (registered only) |

New detail sheets in future workbooks are picked up automatically. No sheet list is hard-coded.

### 1.2 Summary sheet

* Header row = the row whose column A is `S/N`. The header rows differ per workbook (row 5, 6 or 7). Group headers
  directly above (`Package`, `Package Dim (mm)`, `Weight (kgs)`) and sub-headers below (`Qty`, `Type`, `L(mm)` …) are
  combined into one label per column. Columns are then mapped **by label, not by position**. The mapping per workbook
  is in the source audit report.
* Package row = any row below the header with a value in the `Package No.` column.
* Total row = first row after the data with numbers but no package number. Note row = column A starts with `Note`.
* Cells to the right of the last mapped column (site-team pivot tables, `onsite` tags, the "sama / Enggak" comparison
  list in B4-P5) go to **SOURCE_ANNOTATIONS**. They are not used as master data. Same-row tags are also copied to
  `PACKAGE_MASTER.site_annotation`.

### 1.3 Detail sheet block parser (state machine)

```
[BLOCK_TITLE 'Detailed Packing List'] [PROJECT_META] [SHIPPER_INVOICE_META]  -> pending block metadata
PACKAGE_HEADER 'Package No.'  -> new block (column map read from this header row)
PACKAGE_ROW                   -> package number, type, L/W/H, volume, N.W., G.W.
ITEM_HEADER 'S/N.'            -> item column map read from this header row (handles the extra 'Specification' column)
  item region rows ...        -> MATERIAL_ITEM | UNLABELLED_TOTAL | EMPTY_TEMPLATE
TOTAL / 总计 / 合计           -> block total (qty, weight)
```

* A block's item ownership comes from its **position** in the sheet, never from the S/N value. Some sheets put the
  package sequence in S/N (`34（1）`), and one block has an S/N fill-down error (`34（5）…34（15）`).
* If the `S/N.` header row is missing (1 block: `JLJX-4-34（6）/34`), the rows after the package row are read with
  the sheet's previous item layout and the block is flagged (R13).
* Item-region row classification:

| Class | Rule | Count |
|---|---|---:|
| MATERIAL_ITEM | At least one content field has information (description EN/CN, specification, unit, equipment, drawing, remark, or masterlist text other than placeholders such as `XX`) | 16,943 |
| UNLABELLED_TOTAL | No content, but a non-zero quantity or weight. These are sum rows without a label, e.g. XZTY row 39 | 47 |
| EMPTY_TEMPLATE | No content and no non-zero quantity/weight. These are pre-numbered blank rows (S/N only, `XX`, `0`, stray `·`) | 965 |

* Metadata, header and total rows are never items (check C30 = 0). Every non-blank row is staged in STG_DETAIL_ROWS
  with its class (check C06: non-blank rows = staged rows, per workbook).
* Values outside the mapped columns go to `extra_values_json`. Examples are the remark in L1155 and side calculations
  in 4JLJX columns M–Q. Non-numeric values found in numeric columns (`2 boxes`, `100*2`, `300+100`) also go there, and
  so do source Excel error values (`EXCEL_ERROR:NAME`).

## 2. Standardisation rules (CHANGE_LOG)

| Rule | Field(s) | Transformation | Identity-affecting |
|---|---|---|---|
| N-PKG-01 | `package_number_normalized` | Unicode NFKC: full-width to ASCII (`34（3）` → `34(3)`) | matching key only |
| N-PKG-02 | `package_number_normalized` | All whitespace removed | matching key only |
| N-PKG-03 | `package_number_normalized` | Upper-case; dash variants (– — −) → `-` | matching key only |
| N-TXT-01 | text fields | Trim; NBSP / ideographic spaces → space; line breaks and runs of spaces collapsed | no |
| N-NUM-01 | numeric fields | Floating-point artefacts rounded to 6 dp (`13530.370000000003` → `13530.37`) | no |
| N-DAT-01 | `inspection_date` | Excel date/time → ISO `YYYY-MM-DD`. Cells with several dates stay NULL, with the text kept in `inspection_date_original` | no |
| N-MDR-01 | `mdr_number` | Multi-line MDR cells joined with ` \| `. Each MDR also goes to PACKAGE_MDR | no |
| N-MDR-02 | `mdr_status_code` | `Approved (APV)` → APV, `Resubmit (RES)` → RES, `Not Submitted Yet` → NOT_SUBMITTED_YET, MDR No. "No MDR submitted…" → NO_MDR, blank → BLANK | no |
| N-PTY-01 | `package_type_normalized` | `U型架U-shaped frame.` → U-FRAME, `铁箱IRON CASE` → IRON CASE, `Plywoodcase` → PLYWOOD CASE … | no |
| N-UNT-01 | `unit_of_quantity_normalized` | `piece`, `个PCS`, `件` → PCS · `set`, `套` → SET · `group` → GROUP … | no |
| N-ERR-01 | item text fields | A source cell holding an Excel error value becomes NULL plus `EXCEL_ERROR:<code>` in `extra_values_json`. The raw cell stays in STG | no |
| N-ID-01 | all `*_id` | Deterministic surrogate ids from business keys | no |

**What normalisation never does:** remove `/`, `-`, `.`, brackets, leading zeros or suffixes. Those can distinguish
packages (`34/34` vs `34（3）/34`, `46/53` vs `46.2/53`, `K` vs `KA`). Originals are always kept in `*_original`.

### 2.1 Package-number grammar

`<category>-<vendor>-<project>-<group>-<batch code>-<seq>[<sub>]/<total>`, e.g. `P5-HHI-8321-JLJX-4-34（3）/34`

| Format | Example | Summary packages |
|---|---|---:|
| STANDARD | `P3-HHI-8321-HDCZ-KA-5-2/8` | 1,111 |
| HYPHEN_TOTAL (`-` instead of `/` before total) | `P3-HHI-8321-SDYHC-4-1-12` | 39 |
| NO_TOTAL | `P3-HHI-8321-HDCZ-P-1` | 2 |
| NO_BATCH_CODE | `P3-HHI-8321-HDCZ-O-1/1` | 1 |

Non-standard formats are parsed and kept as written. They are flagged LOW (R09).

## 3. Matching hierarchy

Matching is scoped to one source document, which means the same Batch and Category. The Summary invoice context is
never mixed across documents.

| Level | Status | Rule | Linked | Confidence |
|---|---|---|---|---|
| L1 | EXACT_MATCH | `package_number_original` identical | yes | HIGH |
| L2 | NORMALIZED_MATCH | `package_number_normalized` identical | yes | HIGH |
| L3 | SPLIT_PACKAGE | Detail number = Summary number + sub-suffix `(n)` or `.n` **and** the parent block (same number without suffix) lists the child number in its item lines (Drawing No. / description) | yes | HIGH |
| L3 | CANDIDATE_MATCH | Sub-suffix matches a Summary package, but no manifest evidence | **no** | MEDIUM |
| L4 | CANDIDATE_MATCH | Exactly one *unlinked* Summary package with the same sequence, total and batch code, a package group within edit distance 2, and score ≥ 0.6 | **no** | by score |
| L4 | MANUAL_REVIEW | Several or weak candidates | **no** | by score |
| L4 | CONFIRMED_ALIAS | A CANDIDATE confirmed in `config/mapping_overrides.csv` | yes | HIGH |
| – | UNMATCHED_DETAIL | Nothing applies | no | NONE |
| – | UNMATCHED_SUMMARY | Summary package with no linked block (row has no `detail_package_id`) | no | NONE |

**Candidate score** = 0.4 × identifier similarity (1 − edit distance / group length) + 0.6 × attribute agreement.
Attribute agreement is the share of L, W, H, volume, N.W., G.W. and package type that agree within tolerance.
Confidence: HIGH ≥ 0.85, MEDIUM ≥ 0.6, otherwise LOW. **A fuzzy result is never linked automatically, whatever its score.**

### 3.1 Attribute tolerances (Summary vs Detail)

| Attribute | MATCH / WITHIN_TOLERANCE | Otherwise |
|---|---|---|
| L, W, H (mm) | difference ≤ 1 mm | DIMENSION_MISMATCH (MEDIUM) |
| Volume (m3) | ≤ 0.01 m3 or ≤ 0.5 % (the Summary rounds to 2 dp) | VOLUME_MISMATCH (LOW if ≤ 2 %, else MEDIUM) |
| N.W., G.W. (kg) | ≤ 1 kg or ≤ 0.1 % (B5-P5 Summary rounds to whole kg) | WEIGHT_MISMATCH (MEDIUM; HIGH if > 10 %) |
| Package type | normalised values equal | PACKAGE_TYPE_MISMATCH (LOW, aggregated per document and type pair) |

### 3.2 Results of this import

| Status | Rows | Notes |
|---|---:|---|
| EXACT_MATCH | 1,152 | Every Summary package except one |
| SPLIT_PACKAGE | 10 | `JLJX-4-34/34` → 7 sub-packages `34（1）…34（7）`. `JLJX-5-46/53` → 3 sub-packages `46.1 / 46.2 / 46.3`. Both parents are EXACT_MATCH and are flagged `is_split_parent` |
| CANDIDATE_MATCH | 1 | Detail `P3-HHI-8321-HDCZ-K-5-2/8` (B5-P3 HDCZ rows 3175–3176) → Summary `P3-HHI-8321-HDCZ-KA-5-2/8`. Score 0.857 (HIGH): identical L/W/H, volume, N.W. and G.W.; only the package type differs. The K series has 23 packages and `K-5-2/23` already has its own block. KA-5-2/8 is the only KA package without detail. **Pending confirmation.** |
| UNMATCHED_SUMMARY | 1 | `P3-HHI-8321-HDCZ-KA-5-2/8` (the counterpart of the candidate above) |
| UNMATCHED_DETAIL | 0 | |

### 3.3 Recording a review decision

Add a row to `config/mapping_overrides.csv` and re-run the ETL:

```csv
source_document_id,detail_package_number,summary_package_number,decision,reviewed_by,reviewed_at,note
DOC-B5-P3,P3-HHI-8321-HDCZ-K-5-2/8,P3-HHI-8321-HDCZ-KA-5-2/8,CONFIRMED_ALIAS,<name>,2026-11-10,Shipper confirmed typo in detail PL
```

* `CONFIRMED_ALIAS`: the block is linked, the status becomes CONFIRMED_ALIAS, and the R01 issue is closed as RESOLVED.
* `REJECTED`: the block stays unlinked and the decision is recorded in PACKAGE_MAPPING.
* Overrides that do not match any block are reported (check C50 and AUDIT_LOG `OVERRIDE_UNUSED`).

The file is empty on delivery. No decision has been taken on your behalf.

## 4. Exception rules (MAPPING_ISSUES)

| Rule | Issue type (subtype) | Scope | Severity | Trigger | This run |
|---|---|---|---|---|---:|
| R01 | PACKAGE_NUMBER_MISMATCH (CANDIDATE_ALIAS / AMBIGUOUS) | Detail | HIGH | Block mapped as CANDIDATE_MATCH / MANUAL_REVIEW | 1 |
| R01 | DETAIL_WITHOUT_SUMMARY | Detail | HIGH | UNMATCHED_DETAIL | 0 |
| R01 | SPLIT_PACKAGE (SUB_PACKAGE_LINKED) | Detail | INFO | SPLIT_PACKAGE (accepted as is) | 10 |
| R01 | PACKAGE_NUMBER_FORMAT_VARIANT | Detail | LOW | NORMALIZED_MATCH | 0 |
| R02 | SUMMARY_WITHOUT_DETAIL | Package | HIGH | No linked block | 1 |
| R03 | DUPLICATE_PACKAGE_NUMBER (within Summary / within Detail / across documents) | Package / Detail | HIGH | Same normalised number more than once | 0 |
| R04 | MISSING_PACKAGE_NUMBER | Package / Detail | HIGH / MEDIUM | Block or Summary row without number | 0 |
| R05 | INVOICE_MISMATCH (PLACEHOLDER / PLACEHOLDER_OTHER_CATEGORY / CATEGORY / DIFFERENT_INVOICE / MISSING) | Detail | MEDIUM; HIGH if other category | Block header invoice ≠ Summary invoice | 381 |
| R06 | DIMENSION / VOLUME / WEIGHT / PACKAGE_TYPE_MISMATCH | Detail (type: Document) | see 3.1 | Identifier-linked block differs from Summary | 34 + 13 type pairs |
| R07 | EQUIPMENT_MISMATCH (PROBABLE_TYPO / NO_OVERLAP) | Package | LOW | Summary equipment shares no tag with item equipment (separator-insensitive) | 85 |
| R08 | BATCH_CODE_MISMATCH (CARRY_OVER) | Series | INFO | Batch digit in package number ≠ shipment batch | 3 |
| R09 | NONSTANDARD_PACKAGE_FORMAT | Package | LOW | Format ≠ STANDARD | 42 |
| R10 | SERIES_GAP (MISSING / DUPLICATE_SEQUENCE) | Series | INFO / HIGH | Sequence 1..N not all present across the four workbooks | 3 |
| R11 | BLOCK_TOTAL_MISSING, ITEM_WEIGHT_SUM_MISMATCH | Detail | LOW | No TOTAL row. Σ item weight vs package N.W. differs by > max(1 kg, 0.5 %) | 8 + 80 |
| R12 | ITEM_DATA_INCOMPLETE (MISSING_SN, MISSING_QUANTITY, MISSING_UNIT, …), SOURCE_ERROR_VALUE | Detail / Item | LOW / MEDIUM | Item-level flags, aggregated per block | 29 + 2 |
| R13 | MISSING_ITEM_HEADER | Detail | LOW | Block without `S/N.` header | 1 |
| R14 | SN_PATTERN_ANOMALY | Detail | LOW | Item S/N carries another sub-package token than the block | 2 |
| R15 | EMPTY_DETAIL_BLOCK | Detail | MEDIUM | Block without items | 0 |
| R16 | SUMMARY_TOTAL_MISSING / MISMATCH, IMPORT_TOTAL_MISMATCH | Document | INFO / MEDIUM | Declared totals vs computed | 1 (B4-P5 has no total row) |
| R17 | METADATA_INCONSISTENCY | Document | INFO / LOW | Ports differ between Summary and IMPORT list; project/shipper text varies between blocks | 6 |
| R18 | MALFORMED_VALUE, MULTIPLE_VALUES_IN_CELL | Package / Detail | MEDIUM / LOW | Non-numeric or unparseable values; several dates in one cell | 4 |

Total: **706 issues**, of which HIGH 49, MEDIUM 366, LOW 270 and INFO 21. Every issue has `original_value`,
`comparison_value`, `proposed_resolution` and `resolution_status` (OPEN, ACCEPTED_AS_IS or RESOLVED). Issue ids are
deterministic, so the review status of an issue can be tracked across runs.

## 5. Re-run behaviour

* Same inputs give the same ids, mappings and issue ids. Verified on consecutive runs.
* A changed workbook (new SHA-256) is fully re-read. Unchanged business keys keep their ids.
* Source workbooks are opened read-only and never written.
