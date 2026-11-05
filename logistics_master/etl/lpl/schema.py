"""
Schema definition = single source of truth.

Every table/column is declared once here.  The same metadata drives:
  * SQLite DDL (PostgreSQL-compatible type names)
  * DATA_DICTIONARY table / Excel sheet / Markdown dictionary
  * Column order of CSV and Excel exports

Type conventions (portable SQLite <-> PostgreSQL):
  TEXT, INTEGER, DOUBLE PRECISION, DATE (ISO 'YYYY-MM-DD' text in SQLite),
  TIMESTAMP (ISO-8601 UTC text in SQLite).  Flags are INTEGER 0/1.
"""

from collections import OrderedDict

# (column, type, constraint, description, source_reference)
# constraint: 'PK', 'FK:<TABLE>.<col>', 'NN' (not null), 'UQ', '' ; combinations with '|'
T = OrderedDict()

T["REFERENCE_BATCH"] = dict(
    layer="REFERENCE",
    description="Shipment batch lookup (Batch 4, Batch 5).",
    columns=[
        ("batch_id", "TEXT", "PK", "Batch code used across all tables (B4, B5).", "Derived from workbook (manifest)"),
        ("batch_no", "INTEGER", "NN|UQ", "Numeric batch number.", "Derived"),
        ("batch_name", "TEXT", "NN", "Display name, e.g. 'Batch 4'.", "Derived"),
        ("description", "TEXT", "", "Free-text description.", "Derived"),
    ],
)

T["REFERENCE_CATEGORY"] = dict(
    layer="REFERENCE",
    description="Package category lookup (P3, P5) as labelled on invoices and package numbers.",
    columns=[
        ("category_id", "TEXT", "PK", "Category code (P3, P5).", "Package No. prefix / Invoice No. prefix"),
        ("category_name", "TEXT", "NN", "Display name.", "Derived"),
        ("mdr_prefix_observed", "TEXT", "", "MDR/RFS number prefixes observed in the source for this category.", "Derived from MDR No. / RFS columns"),
        ("description", "TEXT", "", "Free-text description.", "Derived"),
    ],
)

T["REFERENCE_MAPPING_STATUS"] = dict(
    layer="REFERENCE",
    description="Allowed mapping status values and whether they create an effective Summary->Detail link.",
    columns=[
        ("status_code", "TEXT", "PK", "Mapping status code.", "Mapping rules"),
        ("is_linked", "INTEGER", "NN", "1 = relationship is effective (package_id populated on detail/items); 0 = proposal / orphan.", "Mapping rules"),
        ("sort_order", "INTEGER", "NN", "Display order.", "Mapping rules"),
        ("description", "TEXT", "NN", "Meaning of the status.", "Mapping rules"),
    ],
)

T["REFERENCE_MDR_STATUS"] = dict(
    layer="REFERENCE",
    description="MDR status codes derived from the Summary 'MDR Status' column.",
    columns=[
        ("mdr_status_code", "TEXT", "PK", "Normalised MDR status code (APV, RES, NO_MDR, BLANK, ...).", "Summary 'MDR Status'"),
        ("label", "TEXT", "NN", "Original label as written in source (first observed).", "Summary 'MDR Status'"),
        ("description", "TEXT", "", "Meaning.", "Derived"),
    ],
)

T["SOURCE_DOCUMENTS"] = dict(
    layer="LINEAGE",
    description="One row per source workbook (the four original packing-list workbooks).",
    columns=[
        ("source_document_id", "TEXT", "PK", "Stable document id, e.g. DOC-B4-P3.", "Manifest"),
        ("source_document_name", "TEXT", "NN", "Canonical workbook name.", "Manifest"),
        ("source_file_name", "TEXT", "NN", "Actual file name read during this import.", "File system"),
        ("batch_id", "TEXT", "NN|FK:REFERENCE_BATCH.batch_id", "Shipment batch.", "Manifest"),
        ("category", "TEXT", "NN|FK:REFERENCE_CATEGORY.category_id", "Category P3/P5.", "Manifest"),
        ("file_sha256", "TEXT", "NN", "SHA-256 of the workbook bytes (change detection).", "File system"),
        ("file_size_bytes", "INTEGER", "NN", "File size.", "File system"),
        ("sheet_count", "INTEGER", "NN", "Number of worksheets in the workbook.", "Workbook"),
        ("summary_sheet", "TEXT", "", "Name of the Summary Packing List worksheet.", "Workbook"),
        ("detail_sheet_count", "INTEGER", "", "Number of Detail Packing List worksheets detected.", "Workbook"),
        ("summary_title", "TEXT", "", "Summary sheet title line.", "Summary row 1"),
        ("po_number", "TEXT", "", "P.O. No. from Summary header.", "Summary 'P.O. No.'"),
        ("summary_invoice_number", "TEXT", "", "Invoice No. from Summary header.", "Summary 'Invoice No.'"),
        ("shipper", "TEXT", "", "Shipper from Summary header.", "Summary 'Shipper'"),
        ("consignee", "TEXT", "", "Consignee from Summary header.", "Summary 'Consignee'"),
        ("port_of_loading", "TEXT", "", "Port of loading from Summary header.", "Summary 'Port Of Loading'"),
        ("port_of_discharge", "TEXT", "", "Port of discharge from Summary header.", "Summary 'Port Of Discharge'"),
        ("summary_note", "TEXT", "", "Note row below the Summary table (package type legend).", "Summary 'Note' row"),
        ("imported_at", "TIMESTAMP", "NN", "UTC timestamp of the import run that loaded this document.", "ETL"),
        ("import_version", "TEXT", "NN", "ETL version used.", "ETL"),
        ("import_id", "TEXT", "NN|FK:IMPORT_HISTORY.import_id", "Import run id.", "ETL"),
    ],
)

T["SOURCE_SHEETS"] = dict(
    layer="LINEAGE",
    description="Worksheet register for every sheet in every workbook (audit of structure and counts).",
    columns=[
        ("source_sheet_id", "TEXT", "PK", "<document_id>::<sheet name>.", "Derived"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Parent workbook.", "Workbook"),
        ("sheet_name", "TEXT", "NN", "Worksheet name exactly as in source (trailing spaces kept).", "Workbook"),
        ("sheet_index", "INTEGER", "NN", "1-based position in workbook.", "Workbook"),
        ("sheet_state", "TEXT", "NN", "visible / hidden / veryHidden.", "Workbook"),
        ("sheet_role", "TEXT", "NN", "SUMMARY, DETAIL, IMPORT_PACKING_LIST, LEGACY_SALES_CONTRACT, SHIPPING_MARK_TEMPLATE, OTHER.", "ETL classification"),
        ("in_scope", "INTEGER", "NN", "1 if the sheet feeds the master tables.", "ETL classification"),
        ("used_range", "TEXT", "", "Excel used range reported by the workbook.", "Workbook"),
        ("max_row", "INTEGER", "", "Last used row.", "Workbook"),
        ("max_column", "INTEGER", "", "Last used column number (formatting can inflate this).", "Workbook"),
        ("merged_ranges", "INTEGER", "", "Number of merged ranges.", "Workbook"),
        ("formula_cells", "INTEGER", "", "Number of formula cells (first 30 columns).", "Workbook"),
        ("error_value_cells", "INTEGER", "", "Cells whose cached value is an Excel error value (REF, NAME, VALUE, DIV/0, N/A ...).", "Workbook"),
        ("header_row", "INTEGER", "", "Summary: header row. Detail: first package header row.", "ETL"),
        ("data_start_row", "INTEGER", "", "First data row.", "ETL"),
        ("data_end_row", "INTEGER", "", "Last data row.", "ETL"),
        ("summary_package_rows", "INTEGER", "", "Summary: number of package rows.", "ETL"),
        ("detail_blocks", "INTEGER", "", "Detail: number of package blocks.", "ETL"),
        ("material_item_rows", "INTEGER", "", "Detail: material item rows retained in PACKAGE_DETAIL.", "ETL"),
        ("empty_template_rows", "INTEGER", "", "Detail: pre-numbered rows with no content (excluded).", "ETL"),
        ("total_rows", "INTEGER", "", "Detail: labelled TOTAL rows (TOTAL/总计/合计).", "ETL"),
        ("unlabelled_total_rows", "INTEGER", "", "Detail: rows with only qty/weight sums and no label (excluded).", "ETL"),
        ("metadata_rows", "INTEGER", "", "Detail: title/project/shipper/invoice/header rows (excluded).", "ETL"),
        ("notes", "TEXT", "", "Audit notes.", "ETL"),
    ],
)

T["STG_SUMMARY_ROWS"] = dict(
    layer="RAW",
    description="Raw layer: every non-blank row of every Summary sheet, unmodified (JSON of cell values) with its classification.",
    columns=[
        ("stg_id", "TEXT", "PK", "<document_id>::<sheet>::R<row>.", "Derived"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("source_sheet", "TEXT", "NN", "Worksheet.", "Workbook"),
        ("source_row", "INTEGER", "NN", "Excel row number.", "Workbook"),
        ("row_class", "TEXT", "NN", "TITLE, METADATA, HEADER, PACKAGE, TOTAL, NOTE, ANNOTATION_ONLY, OTHER.", "ETL classification"),
        ("package_id", "TEXT", "FK:PACKAGE_MASTER.package_id", "Package created from this row (PACKAGE rows).", "ETL"),
        ("raw_values_json", "TEXT", "NN", "JSON object {column_letter: value} exactly as read (cached values).", "Workbook"),
    ],
)

T["STG_DETAIL_ROWS"] = dict(
    layer="RAW",
    description="Raw layer: every non-blank row of every Detail sheet with its classification and owning block.",
    columns=[
        ("stg_id", "TEXT", "PK", "<document_id>::<sheet>::R<row>.", "Derived"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("source_sheet", "TEXT", "NN", "Worksheet.", "Workbook"),
        ("source_row", "INTEGER", "NN", "Excel row number.", "Workbook"),
        ("block_seq", "INTEGER", "", "Block sequence within the sheet (1..n); NULL before first block.", "ETL"),
        ("detail_package_id", "TEXT", "FK:DETAIL_PACKAGES.detail_package_id", "Owning detail package block.", "ETL"),
        ("row_class", "TEXT", "NN", "BLOCK_TITLE, PROJECT_META, SHIPPER_INVOICE_META, PACKAGE_HEADER, PACKAGE_ROW, ITEM_HEADER, MATERIAL_ITEM, TOTAL, UNLABELLED_TOTAL, EMPTY_TEMPLATE, POST_TOTAL_OTHER, OTHER.", "ETL classification"),
        ("item_id", "TEXT", "FK:PACKAGE_DETAIL.item_id", "Item created from this row (MATERIAL_ITEM rows).", "ETL"),
        ("raw_values_json", "TEXT", "NN", "JSON object {column_letter: value} exactly as read (cached values).", "Workbook"),
    ],
)

T["SOURCE_ANNOTATIONS"] = dict(
    layer="RAW",
    description="Cells outside the formal Summary table (site-team pivot tables, status tags, comparison lists). Preserved, not used as master data.",
    columns=[
        ("annotation_id", "TEXT", "PK", "<document_id>::<sheet>::<cell>.", "Derived"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("source_sheet", "TEXT", "NN", "Worksheet.", "Workbook"),
        ("source_row", "INTEGER", "NN", "Excel row.", "Workbook"),
        ("cell_ref", "TEXT", "NN", "Cell address.", "Workbook"),
        ("value_original", "TEXT", "NN", "Cell value as text.", "Workbook"),
        ("annotation_context", "TEXT", "NN", "PIVOT_TABLE, PACKAGE_ROW_TAG, COMPARISON_LIST, OTHER.", "ETL classification"),
        ("row_package_id", "TEXT", "FK:PACKAGE_MASTER.package_id", "Package on the same Summary row (PACKAGE_ROW_TAG only).", "ETL"),
        ("referenced_package_id", "TEXT", "FK:PACKAGE_MASTER.package_id", "Package whose number appears in the annotation value.", "ETL"),
    ],
)

T["PACKAGE_MASTER"] = dict(
    layer="CORE",
    description="Summary Packing List master: one row per Summary package (package-level record).",
    columns=[
        ("package_id", "TEXT", "PK", "Surrogate key. Deterministic: PKG-<batch><cat>-<hash(package_number_normalized, occurrence)>.", "Derived"),
        ("batch_id", "TEXT", "NN|FK:REFERENCE_BATCH.batch_id", "Shipment batch.", "Manifest"),
        ("category", "TEXT", "NN|FK:REFERENCE_CATEGORY.category_id", "Category P3/P5.", "Manifest"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("source_sheet", "TEXT", "NN", "Summary worksheet name.", "Workbook"),
        ("source_row", "INTEGER", "NN", "Excel row in the Summary sheet.", "Workbook"),
        ("source_sn", "INTEGER", "", "S/N as written.", "Summary 'S/N'"),
        ("masterlist_item_no", "TEXT", "", "Masterlist Item No.", "Summary 'Masterlist Item No.'"),
        ("masterlist_sub_item_no", "TEXT", "", "Masterlist Sub-Item No.", "Summary 'Masterlist Sub-Item No.'"),
        ("package_number_original", "TEXT", "NN", "Package No. exactly as written (never modified).", "Summary 'Package No.'"),
        ("package_number_normalized", "TEXT", "NN", "Matching key: NFKC, upper-case, whitespace removed, dash variants unified. Punctuation, slashes, zeros and suffixes kept.", "Derived"),
        ("package_group", "TEXT", "", "Parsed package group (e.g. SDYHA, HDCZ-KA, XZTY-B).", "Derived from package number"),
        ("package_batch_code", "TEXT", "", "Batch digit embedded in the package number (may differ from shipment batch).", "Derived from package number"),
        ("package_seq", "INTEGER", "", "Package sequence number (n of n/N).", "Derived from package number"),
        ("package_seq_total", "INTEGER", "", "Declared series total (N of n/N).", "Derived from package number"),
        ("package_number_format", "TEXT", "NN", "STANDARD, HYPHEN_TOTAL, NO_BATCH_CODE, NO_TOTAL, UNPARSED.", "Derived"),
        ("equipment_number", "TEXT", "", "Equipment Number (cleaned whitespace).", "Summary 'Equipment Number'"),
        ("description_en", "TEXT", "", "Description of Goods (English).", "Summary 'Description of Goods (in English)'"),
        ("description_cn", "TEXT", "", "Description of Goods (Chinese).", "Summary 'Description of Goods (in Chinese)'"),
        ("package_quantity", "DOUBLE PRECISION", "", "Package Qty.", "Summary 'Package / Qty'"),
        ("package_type", "TEXT", "", "Package Type as written.", "Summary 'Package / Type'"),
        ("package_type_normalized", "TEXT", "", "Standardised package type (U-FRAME, IRON CASE, WOODEN CASE, ...).", "Derived"),
        ("length_mm", "DOUBLE PRECISION", "", "Package length (mm).", "Summary 'Package Dim L(mm)'"),
        ("width_mm", "DOUBLE PRECISION", "", "Package width (mm).", "Summary 'Package Dim W(mm)'"),
        ("height_mm", "DOUBLE PRECISION", "", "Package height (mm).", "Summary 'Package Dim H(mm)'"),
        ("volume_m3", "DOUBLE PRECISION", "", "Volume (m3).", "Summary 'Volume (m3)'"),
        ("net_weight_kg", "DOUBLE PRECISION", "", "Package net weight (kg).", "Summary 'Weight N.W.'"),
        ("gross_weight_kg", "DOUBLE PRECISION", "", "Package gross weight (kg).", "Summary 'Weight G.W.'"),
        ("mdr_number", "TEXT", "", "MDR No. as written (multi-value separated by ' | ').", "Summary 'MDR No.'"),
        ("mdr_status", "TEXT", "", "MDR Status as written.", "Summary 'MDR Status'"),
        ("mdr_status_code", "TEXT", "FK:REFERENCE_MDR_STATUS.mdr_status_code", "Normalised MDR status code.", "Derived"),
        ("rfs_material_receiving", "TEXT", "", "RFS Material Receiving reference.", "Summary 'RFS Material Receiving'"),
        ("inspection_date", "DATE", "", "Inspection date (ISO). NULL when the cell holds several dates.", "Summary 'Inspection Date'"),
        ("inspection_date_original", "TEXT", "", "Inspection Date cell exactly as written (multi-date cells kept here).", "Summary 'Inspection Date'"),
        ("received_quantity", "DOUBLE PRECISION", "", "Column headed 'Quantity' next to RFS/Inspection Date (site receiving quantity). Only in B4-P5 and B5-P3.", "Summary 'Quantity' (col T)"),
        ("remark", "TEXT", "", "Remark as written (e.g. laydown area).", "Summary 'Remark'"),
        ("site_annotation", "TEXT", "", "Same-row text outside the formal table (e.g. 'onsite').", "Summary columns right of the table"),
        ("imported_at", "TIMESTAMP", "NN", "Import run timestamp (UTC).", "ETL"),
        ("import_version", "TEXT", "NN", "ETL version.", "ETL"),
    ],
)

T["PACKAGE_MDR"] = dict(
    layer="CORE",
    description="Bridge table: one row per MDR number referenced by a Summary package (multi-MDR cells split).",
    columns=[
        ("package_id", "TEXT", "PK|FK:PACKAGE_MASTER.package_id", "Package.", "Derived"),
        ("mdr_seq", "INTEGER", "PK", "Position in the original cell (1..n).", "Derived"),
        ("mdr_number", "TEXT", "NN", "Single MDR number.", "Summary 'MDR No.' split on line breaks"),
    ],
)

T["DETAIL_PACKAGES"] = dict(
    layer="CORE",
    description="One row per package block found in a Detail Packing List worksheet.",
    columns=[
        ("detail_package_id", "TEXT", "PK", "Surrogate key. Deterministic: DPK-<batch><cat>-<hash(sheet, package_number_normalized, occurrence)>.", "Derived"),
        ("package_id", "TEXT", "FK:PACKAGE_MASTER.package_id", "Linked Summary package (NULL while unresolved).", "Mapping engine"),
        ("parent_detail_package_id", "TEXT", "FK:DETAIL_PACKAGES.detail_package_id", "For split sub-packages: the parent (manifest) block.", "Mapping engine"),
        ("batch_id", "TEXT", "NN|FK:REFERENCE_BATCH.batch_id", "Shipment batch.", "Manifest"),
        ("category", "TEXT", "NN|FK:REFERENCE_CATEGORY.category_id", "Category.", "Manifest"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("source_sheet", "TEXT", "NN", "Detail worksheet.", "Workbook"),
        ("source_block_number", "INTEGER", "NN", "Block sequence within the sheet.", "ETL"),
        ("source_header_row", "INTEGER", "NN", "Row of the 'Package No.' header.", "Workbook"),
        ("source_package_row", "INTEGER", "", "Row holding the package values.", "Workbook"),
        ("source_block_start_row", "INTEGER", "NN", "First row of the block (incl. title/meta rows).", "Workbook"),
        ("source_block_end_row", "INTEGER", "NN", "Last row of the block.", "Workbook"),
        ("package_number_original", "TEXT", "NN", "Package No. exactly as written in the block.", "Detail 'Package No.'"),
        ("package_number_normalized", "TEXT", "NN", "Matching key (same rule as PACKAGE_MASTER).", "Derived"),
        ("package_group", "TEXT", "", "Parsed package group.", "Derived"),
        ("package_seq", "INTEGER", "", "Parsed sequence.", "Derived"),
        ("package_seq_total", "INTEGER", "", "Parsed series total.", "Derived"),
        ("sub_package_suffix", "TEXT", "", "Split suffix, e.g. '(3)' or '.2' (NULL if not a sub-package).", "Derived"),
        ("package_base_number_normalized", "TEXT", "", "Normalised number with the split suffix removed.", "Derived"),
        ("package_type", "TEXT", "", "Package type as written.", "Detail 'Package Type'"),
        ("package_type_normalized", "TEXT", "", "Standardised package type.", "Derived"),
        ("length_mm", "DOUBLE PRECISION", "", "Length (mm).", "Detail 'Length(mm)'"),
        ("width_mm", "DOUBLE PRECISION", "", "Width (mm).", "Detail 'Width(mm)'"),
        ("height_mm", "DOUBLE PRECISION", "", "Height (mm).", "Detail 'Height(mm)'"),
        ("volume_m3", "DOUBLE PRECISION", "", "Volume (m3).", "Detail 'Volume(m3)'"),
        ("net_weight_kg", "DOUBLE PRECISION", "", "Package net weight (kg).", "Detail 'Net Weight(kg)'"),
        ("gross_weight_kg", "DOUBLE PRECISION", "", "Package gross weight (kg).", "Detail 'Gross Weight(kg)'"),
        ("invoice_number_original", "TEXT", "", "Invoice No. printed in the block header.", "Detail 'Invoice No.'"),
        ("project_name_original", "TEXT", "", "Project Name printed in the block header.", "Detail 'Project Name'"),
        ("shipper_original", "TEXT", "", "Shipper printed in the block header.", "Detail 'Shipper'"),
        ("has_item_header", "INTEGER", "NN", "1 if the 'S/N.' item header row exists.", "ETL"),
        ("total_row_type", "TEXT", "NN", "LABELLED, UNLABELLED, MISSING.", "ETL"),
        ("block_total_quantity", "DOUBLE PRECISION", "", "Quantity on the block TOTAL row.", "Detail TOTAL row"),
        ("block_total_weight_kg", "DOUBLE PRECISION", "", "Weight on the block TOTAL row.", "Detail TOTAL row"),
        ("item_count", "INTEGER", "NN", "Material item rows in the block.", "ETL"),
        ("item_weight_sum_kg", "DOUBLE PRECISION", "", "Sum of item Total Weight in the block.", "ETL"),
        ("is_split_parent", "INTEGER", "NN", "1 if this block is the manifest of split sub-packages.", "Mapping engine"),
        ("is_split_child", "INTEGER", "NN", "1 if this block is a split sub-package.", "Mapping engine"),
        ("mapping_status", "TEXT", "NN|FK:REFERENCE_MAPPING_STATUS.status_code", "Mapping status of this block.", "Mapping engine"),
        ("mapping_method", "TEXT", "NN", "Mapping level/method that produced the status.", "Mapping engine"),
        ("package_extra_json", "TEXT", "", "Values found on the package row outside the mapped columns.", "Workbook"),
        ("imported_at", "TIMESTAMP", "NN", "Import run timestamp.", "ETL"),
        ("import_version", "TEXT", "NN", "ETL version.", "ETL"),
    ],
)

T["PACKAGE_DETAIL"] = dict(
    layer="CORE",
    description="Material item master: one row per actual material/item line in a Detail block (no aggregation).",
    columns=[
        ("item_id", "TEXT", "PK", "Surrogate key. Deterministic: ITM-<batch><cat>-<hash(detail_package_id, line_seq)>.", "Derived"),
        ("detail_package_id", "TEXT", "NN|FK:DETAIL_PACKAGES.detail_package_id", "Parent detail block.", "ETL"),
        ("package_id", "TEXT", "FK:PACKAGE_MASTER.package_id", "Parent Summary package when resolved.", "Mapping engine"),
        ("batch_id", "TEXT", "NN|FK:REFERENCE_BATCH.batch_id", "Shipment batch.", "Manifest"),
        ("category", "TEXT", "NN|FK:REFERENCE_CATEGORY.category_id", "Category.", "Manifest"),
        ("package_number_original", "TEXT", "NN", "Package No. of the parent block as written.", "Detail block"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("source_sheet", "TEXT", "NN", "Detail worksheet.", "Workbook"),
        ("source_row", "INTEGER", "NN", "Excel row.", "Workbook"),
        ("line_seq", "INTEGER", "NN", "1-based position of the item inside its block.", "ETL"),
        ("source_sn", "TEXT", "", "S/N as written (text: some sheets use package-seq tokens like '34（1）').", "Detail 'S/N.'"),
        ("masterlist_sub_item_no", "TEXT", "", "Masterlist Sub-Item No. as written.", "Detail 'Masterlist Sub-Item No.'"),
        ("description_en", "TEXT", "", "Description (English).", "Detail 'Description (in English)'"),
        ("description_cn", "TEXT", "", "Description (Chinese).", "Detail 'Description (in Chinese)'"),
        ("specification", "TEXT", "", "Specification (only in blocks that have this column).", "Detail 'Specification'"),
        ("quantity", "DOUBLE PRECISION", "", "Quantity.", "Detail 'Quantity'"),
        ("unit_of_quantity", "TEXT", "", "Unit as written.", "Detail 'Unit Of Qty'"),
        ("unit_of_quantity_normalized", "TEXT", "", "Standardised unit (PCS, SET, M, ...).", "Derived"),
        ("unit_weight_kg", "DOUBLE PRECISION", "", "Item unit weight (kg). Not package weight.", "Detail 'Unit Weight'"),
        ("total_weight_kg", "DOUBLE PRECISION", "", "Item line total weight (kg). Not package weight.", "Detail 'Total Weight'"),
        ("equipment_number", "TEXT", "", "Equipment No.", "Detail 'Equipment No.'"),
        ("drawing_number", "TEXT", "", "Drawing No.", "Detail 'Drawing No.'"),
        ("remark", "TEXT", "", "Remarks.", "Detail 'Remarks'"),
        ("item_type", "TEXT", "NN", "MATERIAL or SUB_PACKAGE_REFERENCE (manifest line pointing to a split sub-package; exclude from material quantity/weight sums).", "ETL"),
        ("referenced_detail_package_id", "TEXT", "FK:DETAIL_PACKAGES.detail_package_id", "For SUB_PACKAGE_REFERENCE lines: the referenced sub-package block.", "ETL"),
        ("dq_flags", "TEXT", "", "Semicolon list of data-quality flags on this row.", "ETL"),
        ("extra_values_json", "TEXT", "", "Values outside the mapped columns, non-numeric values found in numeric columns, and source Excel error values encoded as EXCEL_ERROR:<CODE>.", "Workbook"),
        ("imported_at", "TIMESTAMP", "NN", "Import run timestamp.", "ETL"),
        ("import_version", "TEXT", "NN", "ETL version.", "ETL"),
    ],
)

T["PACKAGE_MAPPING"] = dict(
    layer="CORE",
    description="Summary<->Detail relationship register (one row per detail block, plus one row per Summary package with no detail).",
    columns=[
        ("mapping_id", "TEXT", "PK", "Deterministic: MAP-<detail_package_id or package_id>.", "Derived"),
        ("package_id", "TEXT", "FK:PACKAGE_MASTER.package_id", "Summary package (linked or proposed).", "Mapping engine"),
        ("detail_package_id", "TEXT", "FK:DETAIL_PACKAGES.detail_package_id", "Detail block (NULL for UNMATCHED_SUMMARY).", "Mapping engine"),
        ("batch_id", "TEXT", "NN|FK:REFERENCE_BATCH.batch_id", "Batch.", "Manifest"),
        ("category", "TEXT", "NN|FK:REFERENCE_CATEGORY.category_id", "Category.", "Manifest"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("source_package_number", "TEXT", "", "Summary Package No. (original).", "Summary"),
        ("target_package_number", "TEXT", "", "Detail Package No. (original).", "Detail"),
        ("matching_level", "INTEGER", "NN", "1 exact, 2 normalised, 3 alias/sub-package, 4 manual review, 0 none.", "Mapping engine"),
        ("matching_method", "TEXT", "NN", "Rule that produced the result.", "Mapping engine"),
        ("confidence_level", "TEXT", "NN", "HIGH, MEDIUM, LOW, NONE.", "Mapping engine"),
        ("confidence_score", "DOUBLE PRECISION", "", "0..1 score (identifier + attribute agreement).", "Mapping engine"),
        ("mapping_status", "TEXT", "NN|FK:REFERENCE_MAPPING_STATUS.status_code", "Mapping status.", "Mapping engine"),
        ("is_linked", "INTEGER", "NN", "1 if the relationship is effective.", "Mapping engine"),
        ("mapping_note", "TEXT", "", "Human-readable explanation.", "Mapping engine"),
        ("evidence_json", "TEXT", "", "Attribute comparison and alternative candidates.", "Mapping engine"),
        ("reviewed_by", "TEXT", "", "Reviewer (from mapping_overrides.csv).", "Manual review"),
        ("reviewed_at", "TEXT", "", "Review date (from mapping_overrides.csv).", "Manual review"),
        ("review_decision", "TEXT", "", "CONFIRMED_ALIAS / REJECTED / PENDING.", "Manual review"),
    ],
)

T["MAPPING_ISSUES"] = dict(
    layer="CONTROL",
    description="Exception register: every discrepancy found, stored separately; nothing is silently corrected.",
    columns=[
        ("issue_id", "TEXT", "PK", "Deterministic: ISS-<hash(rule, scope key)>.", "Derived"),
        ("rule_id", "TEXT", "NN", "Detection rule id (see LOGISTICS_MAPPING_RULES.md).", "ETL"),
        ("issue_type", "TEXT", "NN", "Issue type.", "ETL"),
        ("issue_subtype", "TEXT", "", "Refinement of the type.", "ETL"),
        ("severity", "TEXT", "NN", "HIGH, MEDIUM, LOW, INFO.", "ETL"),
        ("issue_scope", "TEXT", "NN", "DOCUMENT, PACKAGE, DETAIL_PACKAGE, ITEM, SERIES.", "ETL"),
        ("batch_id", "TEXT", "FK:REFERENCE_BATCH.batch_id", "Batch.", "ETL"),
        ("category", "TEXT", "FK:REFERENCE_CATEGORY.category_id", "Category.", "ETL"),
        ("package_number", "TEXT", "", "Package number concerned (original).", "ETL"),
        ("package_id", "TEXT", "FK:PACKAGE_MASTER.package_id", "Summary package concerned.", "ETL"),
        ("detail_package_id", "TEXT", "FK:DETAIL_PACKAGES.detail_package_id", "Detail block concerned.", "ETL"),
        ("item_id", "TEXT", "FK:PACKAGE_DETAIL.item_id", "Item concerned.", "ETL"),
        ("source_document_id", "TEXT", "FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "ETL"),
        ("source_document", "TEXT", "", "Workbook name.", "ETL"),
        ("source_sheet", "TEXT", "", "Worksheet.", "ETL"),
        ("source_row", "INTEGER", "", "Excel row.", "ETL"),
        ("original_value", "TEXT", "", "Value found.", "ETL"),
        ("comparison_value", "TEXT", "", "Value it was compared with.", "ETL"),
        ("description", "TEXT", "NN", "What is wrong.", "ETL"),
        ("proposed_resolution", "TEXT", "", "Suggested action.", "ETL"),
        ("resolution_status", "TEXT", "NN", "OPEN, ACCEPTED_AS_IS, RESOLVED (default OPEN).", "ETL / review"),
    ],
)

T["INVOICE_REGISTER"] = dict(
    layer="CORE",
    description="Invoice numbers per source context (Summary header, IMPORT packing list, Detail block headers) with declared vs computed totals.",
    columns=[
        ("invoice_register_id", "TEXT", "PK", "Deterministic id.", "Derived"),
        ("source_document_id", "TEXT", "NN|FK:SOURCE_DOCUMENTS.source_document_id", "Workbook.", "Workbook"),
        ("batch_id", "TEXT", "NN|FK:REFERENCE_BATCH.batch_id", "Batch.", "Manifest"),
        ("category", "TEXT", "NN|FK:REFERENCE_CATEGORY.category_id", "Category.", "Manifest"),
        ("invoice_source", "TEXT", "NN", "SUMMARY_HEADER, IMPORT_PACKING_LIST, DETAIL_BLOCK_HEADER.", "ETL"),
        ("source_sheet", "TEXT", "NN", "Worksheet.", "Workbook"),
        ("invoice_number", "TEXT", "", "Invoice number as written.", "Workbook"),
        ("invoice_issue_date", "DATE", "", "Invoice issue date (IMPORT sheet only).", "IMPORT 'Invoice Issue Date'"),
        ("po_number", "TEXT", "", "P.O. No.", "Workbook"),
        ("port_of_loading", "TEXT", "", "Port of loading.", "Workbook"),
        ("port_of_discharge", "TEXT", "", "Port of discharge.", "Workbook"),
        ("block_count", "INTEGER", "", "DETAIL_BLOCK_HEADER: number of blocks printing this invoice number.", "ETL"),
        ("declared_packages", "DOUBLE PRECISION", "", "Declared package total (Summary total row / IMPORT 'In Total').", "Workbook"),
        ("declared_volume_m3", "DOUBLE PRECISION", "", "Declared volume total.", "Workbook"),
        ("declared_net_weight_kg", "DOUBLE PRECISION", "", "Declared N.W. total.", "Workbook"),
        ("declared_gross_weight_kg", "DOUBLE PRECISION", "", "Declared G.W. total.", "Workbook"),
        ("computed_packages", "INTEGER", "", "Packages counted by the ETL for this context.", "ETL"),
        ("computed_volume_m3", "DOUBLE PRECISION", "", "Sum of package volumes.", "ETL"),
        ("computed_net_weight_kg", "DOUBLE PRECISION", "", "Sum of package N.W.", "ETL"),
        ("computed_gross_weight_kg", "DOUBLE PRECISION", "", "Sum of package G.W.", "ETL"),
        ("matches_summary_invoice", "INTEGER", "", "1 if invoice number equals the Summary header invoice.", "ETL"),
        ("note", "TEXT", "", "Observations.", "ETL"),
    ],
)

T["SERIES_REGISTER"] = dict(
    layer="CONTROL",
    description="Package numbering series completeness across all workbooks (declared n/N vs packages listed).",
    columns=[
        ("series_key", "TEXT", "PK", "<cat>-<vendor>-<project>-<group>-<batch code>-/<total>.", "Derived from package numbers"),
        ("declared_total", "INTEGER", "", "Series total N declared in the package numbers.", "Derived"),
        ("packages_listed", "INTEGER", "NN", "Summary packages found for the series (all workbooks).", "ETL"),
        ("distinct_seq", "INTEGER", "NN", "Distinct sequence numbers found.", "ETL"),
        ("missing_count", "INTEGER", "NN", "Sequence numbers 1..N not found in any workbook.", "ETL"),
        ("missing_seq", "TEXT", "", "Comma list of missing sequence numbers.", "ETL"),
        ("duplicate_seq", "TEXT", "", "Comma list of sequence numbers listed more than once.", "ETL"),
        ("out_of_range_seq", "TEXT", "", "Sequence numbers greater than N.", "ETL"),
        ("documents", "TEXT", "", "Workbooks in which the series appears.", "ETL"),
    ],
)

T["DATA_QUALITY_CHECKS"] = dict(
    layer="CONTROL",
    description="Validation and reconciliation checks executed by the ETL with expected vs actual results.",
    columns=[
        ("check_id", "TEXT", "PK", "Check id.", "ETL"),
        ("check_group", "TEXT", "NN", "COUNT_RECON, INTEGRITY, MAPPING, CONTENT, TOTALS, REFERENCE_FIGURES.", "ETL"),
        ("check_name", "TEXT", "NN", "What is checked.", "ETL"),
        ("scope", "TEXT", "NN", "ALL or document/sheet.", "ETL"),
        ("expected_value", "TEXT", "", "Expected result.", "ETL"),
        ("actual_value", "TEXT", "", "Actual result.", "ETL"),
        ("status", "TEXT", "NN", "PASS, FAIL, WARN, INFO.", "ETL"),
        ("note", "TEXT", "", "Explanation.", "ETL"),
    ],
)

T["CHANGE_LOG"] = dict(
    layer="CONTROL",
    description="Every transformation rule applied by the ETL with the number of values affected and an example.",
    columns=[
        ("change_id", "TEXT", "PK", "Rule id.", "ETL"),
        ("table_name", "TEXT", "NN", "Target table.", "ETL"),
        ("field_name", "TEXT", "NN", "Target field.", "ETL"),
        ("rule_description", "TEXT", "NN", "Transformation applied.", "ETL"),
        ("identity_affecting", "INTEGER", "NN", "1 if the rule could change package identity (only applied to *_normalized keys).", "ETL"),
        ("records_affected", "INTEGER", "NN", "Number of values changed by the rule in this run.", "ETL"),
        ("example_original", "TEXT", "", "Example input.", "ETL"),
        ("example_result", "TEXT", "", "Example output.", "ETL"),
    ],
)

T["DATA_DICTIONARY"] = dict(
    layer="CONTROL",
    description="Field definitions for every table (generated from the ETL schema module).",
    columns=[
        ("table_name", "TEXT", "PK", "Table.", "Schema"),
        ("column_name", "TEXT", "PK", "Column.", "Schema"),
        ("ordinal", "INTEGER", "NN", "Column position.", "Schema"),
        ("data_type", "TEXT", "NN", "Portable type.", "Schema"),
        ("is_primary_key", "INTEGER", "NN", "1 if part of the PK.", "Schema"),
        ("foreign_key", "TEXT", "", "Referenced TABLE.column.", "Schema"),
        ("is_nullable", "INTEGER", "NN", "1 if NULL allowed.", "Schema"),
        ("layer", "TEXT", "NN", "REFERENCE, LINEAGE, RAW, CORE, ANALYTICS, CONTROL.", "Schema"),
        ("description", "TEXT", "NN", "Definition.", "Schema"),
        ("source_reference", "TEXT", "", "Original source column / derivation.", "Schema"),
    ],
)

T["IMPORT_HISTORY"] = dict(
    layer="CONTROL",
    description="One row per ETL run (appended, never truncated).",
    columns=[
        ("import_id", "TEXT", "PK", "IMP-<UTC timestamp>.", "ETL"),
        ("started_at", "TIMESTAMP", "NN", "Run start (UTC).", "ETL"),
        ("finished_at", "TIMESTAMP", "", "Run end (UTC).", "ETL"),
        ("etl_version", "TEXT", "NN", "ETL version.", "ETL"),
        ("status", "TEXT", "NN", "SUCCESS, SUCCESS_WITH_WARNINGS, FAILED.", "ETL"),
        ("source_fingerprint", "TEXT", "NN", "SHA-256 over the four source file hashes.", "ETL"),
        ("packages_loaded", "INTEGER", "", "PACKAGE_MASTER rows.", "ETL"),
        ("detail_packages_loaded", "INTEGER", "", "DETAIL_PACKAGES rows.", "ETL"),
        ("items_loaded", "INTEGER", "", "PACKAGE_DETAIL rows.", "ETL"),
        ("issues_logged", "INTEGER", "", "MAPPING_ISSUES rows.", "ETL"),
        ("checks_failed", "INTEGER", "", "DATA_QUALITY_CHECKS with status FAIL.", "ETL"),
        ("message", "TEXT", "", "Summary / error message.", "ETL"),
    ],
)

T["AUDIT_LOG"] = dict(
    layer="CONTROL",
    description="Event log of every import run (appended).",
    columns=[
        ("audit_id", "TEXT", "PK", "<import_id>-<seq>.", "ETL"),
        ("import_id", "TEXT", "NN|FK:IMPORT_HISTORY.import_id", "Run.", "ETL"),
        ("event_time", "TIMESTAMP", "NN", "UTC time.", "ETL"),
        ("event_type", "TEXT", "NN", "SOURCE_READ, TABLE_LOADED, OVERRIDE_APPLIED, CHECK_FAILED, RUN_COMPLETE, ...", "ETL"),
        ("entity", "TEXT", "", "Table / document concerned.", "ETL"),
        ("detail", "TEXT", "", "Detail.", "ETL"),
    ],
)

T["REFERENCE_READINESS_STATUS"] = dict(
    layer="REFERENCE",
    description="Logistics readiness status lookup (from config/readiness_rules.json).",
    columns=[
        ("status_code", "TEXT", "PK", "Readiness status code.", "readiness_rules.json"),
        ("label", "TEXT", "NN", "Display label.", "readiness_rules.json"),
        ("short_label", "TEXT", "NN", "Short label for badges.", "readiness_rules.json"),
        ("color", "TEXT", "NN", "Display colour (hex).", "readiness_rules.json"),
        ("sort_order", "INTEGER", "NN", "Display order.", "readiness_rules.json"),
        ("rule", "TEXT", "NN", "Condition that assigns the status.", "readiness_rules.json"),
        ("action", "TEXT", "NN", "Standard next action.", "readiness_rules.json"),
    ],
)

T["PACKAGE_READINESS"] = dict(
    layer="ANALYTICS",
    description="Logistics readiness per Summary package: four gates (PL, MDR, SITE, INSP), Readiness Index 0-100, status and next action.",
    columns=[
        ("package_id", "TEXT", "PK|FK:PACKAGE_MASTER.package_id", "Summary package.", "PACKAGE_MASTER"),
        ("batch_id", "TEXT", "NN|FK:REFERENCE_BATCH.batch_id", "Batch.", "PACKAGE_MASTER"),
        ("category", "TEXT", "NN|FK:REFERENCE_CATEGORY.category_id", "Category.", "PACKAGE_MASTER"),
        ("package_number_original", "TEXT", "NN", "Package No. as written.", "PACKAGE_MASTER"),
        ("system_group", "TEXT", "NN", "System / commodity group (Summary English description, upper-case).", "PACKAGE_MASTER.description_en"),
        ("equipment_number", "TEXT", "", "Equipment / area tag(s).", "PACKAGE_MASTER"),
        ("package_group", "TEXT", "", "Package numbering group.", "PACKAGE_MASTER"),
        ("gross_weight_kg", "DOUBLE PRECISION", "", "Package gross weight (tonnage weighting).", "PACKAGE_MASTER"),
        ("volume_m3", "DOUBLE PRECISION", "", "Package volume.", "PACKAGE_MASTER"),
        ("pl_verified", "INTEGER", "NN", "Gate PL: 1 = linked Detail block(s) and no open blocking issue.", "PACKAGE_MAPPING / MAPPING_ISSUES"),
        ("linked_detail_packages", "INTEGER", "NN", "Linked Detail blocks.", "DETAIL_PACKAGES"),
        ("split_sub_packages", "INTEGER", "NN", "Linked split sub-packages.", "DETAIL_PACKAGES"),
        ("mdr_state", "TEXT", "NN", "MDR state (APV, NOT_REQUIRED, RES, NOT_SUBMITTED_YET, NO_MDR, BLANK).", "PACKAGE_MASTER.mdr_status_code / remark"),
        ("mdr_state_label", "TEXT", "NN", "MDR state label.", "readiness_rules.json"),
        ("mdr_credit", "DOUBLE PRECISION", "NN", "Gate MDR credit 0..1.", "readiness_rules.json"),
        ("rfs_raised", "INTEGER", "NN", "1 if an RFS Material Receiving number exists.", "PACKAGE_MASTER.rfs_material_receiving"),
        ("inspected", "INTEGER", "NN", "Gate INSP: 1 if RFS and inspection date exist.", "PACKAGE_MASTER"),
        ("on_site", "INTEGER", "NN", "Gate SITE: 1 if inspection record, site tag or location remark exists.", "PACKAGE_MASTER / SOURCE_ANNOTATIONS"),
        ("on_site_evidence", "TEXT", "", "INSPECTION_RECORD, SITE_TAG or LOCATION_REMARK.", "Derived"),
        ("site_location", "TEXT", "", "Known site location (laydown / camp) or 'On site (location not stated)'.", "PACKAGE_MASTER.remark / SOURCE_ANNOTATIONS"),
        ("site_location_group", "TEXT", "", "Site location group for the laydown summary: 'Laydown 4', 'Laydown 5', 'Askara', 'Camp HHI' ... (location keyword + number/code) from the Summary Remark column (U in B4-P5 / B5-P3, T in B4-P3 / B5-P5) or a same-row site tag; 'On-site (no laydown)' when on site ('onsite' tag or RFS + inspection date) without a laydown / location; NULL when not on site.", "PACKAGE_MASTER.remark / SOURCE_ANNOTATIONS"),
        ("receiving_date", "DATE", "", "Inspection date used for the receiving curve (latest plausible date for multi-date cells).", "PACKAGE_MASTER.inspection_date(_original)"),
        ("inspection_dates", "TEXT", "", "All inspection dates found (ISO, comma list).", "PACKAGE_MASTER.inspection_date_original"),
        ("open_issue_count", "INTEGER", "NN", "Open non-INFO issues on the package or its blocks.", "MAPPING_ISSUES"),
        ("blocking_issue_count", "INTEGER", "NN", "Open blocking (identity) issues.", "MAPPING_ISSUES"),
        ("max_open_severity", "TEXT", "", "Highest open severity (HIGH/MEDIUM/LOW).", "MAPPING_ISSUES"),
        ("gate_pl_score", "DOUBLE PRECISION", "NN", "Weighted PL points.", "readiness_rules.json"),
        ("gate_mdr_score", "DOUBLE PRECISION", "NN", "Weighted MDR points.", "readiness_rules.json"),
        ("gate_site_score", "DOUBLE PRECISION", "NN", "Weighted SITE points.", "readiness_rules.json"),
        ("gate_inspection_score", "DOUBLE PRECISION", "NN", "Weighted INSP points.", "readiness_rules.json"),
        ("readiness_score", "DOUBLE PRECISION", "NN", "Readiness Index 0-100 (sum of gate points).", "Derived"),
        ("readiness_status", "TEXT", "NN|FK:REFERENCE_READINESS_STATUS.status_code", "Readiness status.", "Derived"),
        ("next_action", "TEXT", "NN", "Recommended next action.", "Derived"),
        ("rules_version", "TEXT", "NN", "Version of readiness_rules.json used.", "readiness_rules.json"),
    ],
)

# Load order respects FK dependencies; truncation runs in reverse.
LOAD_ORDER = [
    "REFERENCE_BATCH", "REFERENCE_CATEGORY", "REFERENCE_MAPPING_STATUS", "REFERENCE_MDR_STATUS",
    "REFERENCE_READINESS_STATUS",
    "IMPORT_HISTORY", "SOURCE_DOCUMENTS", "SOURCE_SHEETS",
    "PACKAGE_MASTER", "PACKAGE_MDR", "DETAIL_PACKAGES", "PACKAGE_DETAIL",
    "STG_SUMMARY_ROWS", "STG_DETAIL_ROWS", "SOURCE_ANNOTATIONS",
    "PACKAGE_MAPPING", "MAPPING_ISSUES", "PACKAGE_READINESS", "INVOICE_REGISTER", "SERIES_REGISTER",
    "DATA_QUALITY_CHECKS", "CHANGE_LOG", "DATA_DICTIONARY", "AUDIT_LOG",
]
# Tables kept across runs (history); everything else is fully refreshed each run.
PERSISTENT_TABLES = {"IMPORT_HISTORY", "AUDIT_LOG"}

INDEXES = [
    ("PACKAGE_MASTER", ["batch_id", "category"]),
    ("PACKAGE_MASTER", ["package_number_normalized"]),
    ("PACKAGE_MASTER", ["equipment_number"]),
    ("PACKAGE_MASTER", ["mdr_status_code"]),
    ("PACKAGE_MASTER", ["source_document_id"]),
    ("PACKAGE_MDR", ["mdr_number"]),
    ("DETAIL_PACKAGES", ["package_id"]),
    ("DETAIL_PACKAGES", ["parent_detail_package_id"]),
    ("DETAIL_PACKAGES", ["package_number_normalized"]),
    ("DETAIL_PACKAGES", ["batch_id", "category"]),
    ("DETAIL_PACKAGES", ["mapping_status"]),
    ("PACKAGE_DETAIL", ["detail_package_id"]),
    ("PACKAGE_DETAIL", ["package_id"]),
    ("PACKAGE_DETAIL", ["batch_id", "category"]),
    ("PACKAGE_DETAIL", ["drawing_number"]),
    ("PACKAGE_DETAIL", ["equipment_number"]),
    ("PACKAGE_MAPPING", ["package_id"]),
    ("PACKAGE_MAPPING", ["detail_package_id"]),
    ("PACKAGE_MAPPING", ["mapping_status"]),
    ("MAPPING_ISSUES", ["package_id"]),
    ("MAPPING_ISSUES", ["detail_package_id"]),
    ("MAPPING_ISSUES", ["issue_type", "severity"]),
    ("PACKAGE_READINESS", ["batch_id", "category"]),
    ("PACKAGE_READINESS", ["readiness_status"]),
    ("PACKAGE_READINESS", ["system_group"]),
    ("PACKAGE_READINESS", ["site_location_group"]),
    ("PACKAGE_READINESS", ["receiving_date"]),
    ("STG_DETAIL_ROWS", ["detail_package_id"]),
    ("STG_DETAIL_ROWS", ["source_document_id", "source_sheet", "source_row"]),
    ("STG_SUMMARY_ROWS", ["source_document_id", "source_sheet", "source_row"]),
]

UNIQUE_CONSTRAINTS = [
    # A Summary row / detail block / item row can only be imported once.
    ("PACKAGE_MASTER", ["source_document_id", "source_sheet", "source_row"]),
    ("DETAIL_PACKAGES", ["source_document_id", "source_sheet", "source_header_row"]),
    ("PACKAGE_DETAIL", ["source_document_id", "source_sheet", "source_row"]),
    ("PACKAGE_DETAIL", ["detail_package_id", "line_seq"]),
    ("PACKAGE_MAPPING", ["detail_package_id"]),
]


def columns(table):
    return [c[0] for c in T[table]["columns"]]


def _pk_cols(table):
    return [c[0] for c in T[table]["columns"] if "PK" in c[2].split("|")]


def ddl():
    """Return CREATE TABLE / INDEX statements (portable to PostgreSQL)."""
    out = []
    for tname in LOAD_ORDER:
        spec = T[tname]
        lines, fks = [], []
        pk = _pk_cols(tname)
        for col, typ, cons, _d, _s in spec["columns"]:
            parts = cons.split("|") if cons else []
            line = f'    {col} {typ}'
            if "NN" in parts or (col in pk):
                line += " NOT NULL"
            if "UQ" in parts:
                line += " UNIQUE"
            lines.append(line)
            for p in parts:
                if p.startswith("FK:"):
                    rt, rc = p[3:].split(".")
                    fks.append(f"    FOREIGN KEY ({col}) REFERENCES {rt}({rc})")
        lines.append(f"    PRIMARY KEY ({', '.join(pk)})")
        for ut, ucols in UNIQUE_CONSTRAINTS:
            if ut == tname:
                lines.append(f"    UNIQUE ({', '.join(ucols)})")
        lines.extend(fks)
        out.append(f"CREATE TABLE IF NOT EXISTS {tname} (\n" + ",\n".join(lines) + "\n);")
    for i, (tname, cols) in enumerate(INDEXES, 1):
        out.append(f"CREATE INDEX IF NOT EXISTS ix_{tname.lower()}_{'_'.join(cols)} ON {tname} ({', '.join(cols)});")
    return out


def dictionary_rows():
    rows = []
    for tname in LOAD_ORDER:
        spec = T[tname]
        pk = _pk_cols(tname)
        for i, (col, typ, cons, desc, src) in enumerate(spec["columns"], 1):
            parts = cons.split("|") if cons else []
            fk = next((p[3:] for p in parts if p.startswith("FK:")), None)
            nullable = 0 if ("NN" in parts or col in pk) else 1
            rows.append(dict(table_name=tname, column_name=col, ordinal=i, data_type=typ,
                             is_primary_key=1 if col in pk else 0, foreign_key=fk,
                             is_nullable=nullable, layer=spec["layer"], description=desc,
                             source_reference=src))
    return rows
