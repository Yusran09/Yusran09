-- =====================================================================================
-- Logistics Master Database - reference queries for the Web App Data Explorer
-- Portable SQL (SQLite 3.35+ / PostgreSQL 13+). Parameters use :name placeholders.
-- Every query below is executed by etl/test_app_queries.py against the generated DB.
-- =====================================================================================

-- Q01  LEVEL 1 - Dashboard KPI tiles (single row)
SELECT * FROM v_dashboard_kpi;

-- Q02  LEVEL 1 - Batch x Category statistics (also feeds LEVEL 2/3 selectors)
SELECT * FROM v_batch_category_summary ORDER BY batch_id, category;

-- Q03  LEVEL 1 - MDR status distribution
SELECT batch_id, category, mdr_status_code, mdr_status_label, packages
FROM v_mdr_status_distribution ORDER BY batch_id, category, packages DESC;

-- Q04  LEVEL 1 - Mapping status distribution
SELECT batch_id, category, mapping_status, is_linked, mapping_rows
FROM v_mapping_status_distribution ORDER BY batch_id, category, sort_order;

-- Q05  LEVEL 2 - Batch selector
SELECT b.batch_id, b.batch_name, COUNT(p.package_id) AS packages
FROM REFERENCE_BATCH b LEFT JOIN PACKAGE_MASTER p ON p.batch_id = b.batch_id
GROUP BY b.batch_id, b.batch_name ORDER BY b.batch_no;

-- Q06  LEVEL 3 - Category selector for a batch
SELECT c.category_id, c.category_name, COUNT(p.package_id) AS packages
FROM REFERENCE_CATEGORY c LEFT JOIN PACKAGE_MASTER p ON p.category = c.category_id AND p.batch_id = :batch_id
GROUP BY c.category_id, c.category_name ORDER BY c.category_id;

-- Q07  LEVEL 4 - Summary Packing List grid: filters + sorting + pagination
--      (pass NULL for an unused filter; :search is matched case-insensitively)
SELECT package_id, source_sn, package_number_original, equipment_number, description_en, description_cn,
       package_type, length_mm, width_mm, height_mm, volume_m3, net_weight_kg, gross_weight_kg,
       mdr_number, mdr_status_code, rfs_material_receiving, inspection_date, inspection_date_original, remark,
       linked_detail_packages, material_items, package_mapping_status, open_issues
FROM v_package_list
WHERE batch_id = :batch_id
  AND category = :category
  AND (:search IS NULL OR UPPER(package_number_original) LIKE '%' || UPPER(:search) || '%'
                       OR UPPER(COALESCE(equipment_number, '')) LIKE '%' || UPPER(:search) || '%'
                       OR UPPER(COALESCE(description_en, '') || ' ' || COALESCE(description_cn, '')) LIKE '%' || UPPER(:search) || '%'
                       OR UPPER(COALESCE(mdr_number, '')) LIKE '%' || UPPER(:search) || '%')
  AND (:mdr_status_code IS NULL OR mdr_status_code = :mdr_status_code)
  AND (:rfs IS NULL OR UPPER(COALESCE(rfs_material_receiving, '')) LIKE '%' || UPPER(:rfs) || '%')
  AND (:min_volume IS NULL OR volume_m3 >= :min_volume)
  AND (:max_volume IS NULL OR volume_m3 <= :max_volume)
  AND (:min_gross_weight IS NULL OR gross_weight_kg >= :min_gross_weight)
  AND (:max_gross_weight IS NULL OR gross_weight_kg <= :max_gross_weight)
ORDER BY source_sn
LIMIT :page_size OFFSET :offset;

-- Q08  LEVEL 4 - total row count for the same filters (pagination footer)
SELECT COUNT(*) AS total_rows
FROM v_package_list
WHERE batch_id = :batch_id AND category = :category
  AND (:mdr_status_code IS NULL OR mdr_status_code = :mdr_status_code);

-- Q09  LEVEL 5 - Package header card
SELECT p.*, d.source_document_name, d.summary_invoice_number, d.po_number
FROM v_package_list p JOIN SOURCE_DOCUMENTS d ON d.source_document_id = p.source_document_id
WHERE p.package_id = :package_id;

-- Q10  LEVEL 5 - Linked Detail Package blocks (parent manifest first, then split sub-packages)
SELECT detail_package_id, package_number_original, sub_package_suffix, is_split_parent, is_split_child,
       parent_detail_package_number, package_type, length_mm, width_mm, height_mm, volume_m3,
       net_weight_kg, gross_weight_kg, invoice_number_original, item_count, item_weight_sum_kg,
       mapping_status, mapping_method, source_sheet, source_header_row
FROM v_detail_package_list
WHERE package_id = :package_id
ORDER BY is_split_child, source_header_row;

-- Q11  LEVEL 5 - Mapping relationship(s) incl. unlinked proposals pointing at this package
SELECT mapping_id, mapping_status, is_linked, matching_level, matching_method, confidence_level, confidence_score,
       source_package_number, target_package_number, mapping_note, review_decision
FROM v_package_relationships
WHERE package_id = :package_id
ORDER BY is_linked DESC, matching_level;

-- Q12  LEVEL 5 - Exceptions attached to the package or its detail blocks
SELECT i.severity, i.issue_type, i.issue_subtype, i.description, i.proposed_resolution, i.resolution_status,
       i.source_sheet, i.source_row
FROM MAPPING_ISSUES i
WHERE i.package_id = :package_id
   OR i.detail_package_id IN (SELECT detail_package_id FROM DETAIL_PACKAGES WHERE package_id = :package_id)
ORDER BY CASE i.severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END;

-- Q13  LEVEL 6 - Material items of one detail block (paginated)
SELECT item_id, line_seq, source_sn, masterlist_sub_item_no, description_en, description_cn, specification,
       quantity, unit_of_quantity, unit_weight_kg, total_weight_kg, equipment_number, drawing_number, remark,
       item_type, dq_flags, source_row
FROM v_material_items
WHERE detail_package_id = :detail_package_id
ORDER BY line_seq
LIMIT :page_size OFFSET :offset;

-- Q14  LEVEL 6 - All material items of a Summary package (across split sub-packages), materials only
SELECT detail_package_number, line_seq, source_sn, description_en, description_cn, quantity,
       unit_of_quantity_normalized, unit_weight_kg, total_weight_kg, equipment_number, drawing_number
FROM v_material_items
WHERE package_id = :package_id AND item_type = 'MATERIAL'
ORDER BY detail_package_number, line_seq;

-- Q15  Reverse navigation - item -> detail block -> Summary package -> batch/category
SELECT it.item_id, it.detail_package_id, it.detail_package_number, it.package_id, it.summary_package_number,
       it.batch_id, it.category, pm.source_sheet AS summary_sheet, pm.source_row AS summary_row
FROM v_material_items it LEFT JOIN PACKAGE_MASTER pm ON pm.package_id = it.package_id
WHERE it.item_id = :item_id;

-- Q16  Global search (packages, detail packages, items) - top hits
SELECT entity_type, entity_id, package_id, detail_package_id, batch_id, category, label
FROM v_search_index
WHERE search_text LIKE '%' || UPPER(:search) || '%'
ORDER BY CASE entity_type WHEN 'PACKAGE' THEN 1 WHEN 'DETAIL_PACKAGE' THEN 2 ELSE 3 END, label
LIMIT 50;

-- Q17  Source document tracing for any package (raw row as read from the workbook)
SELECT d.source_document_name, s.source_sheet, s.source_row, s.row_class, s.raw_values_json
FROM PACKAGE_MASTER p
JOIN STG_SUMMARY_ROWS s ON s.package_id = p.package_id
JOIN SOURCE_DOCUMENTS d ON d.source_document_id = p.source_document_id
WHERE p.package_id = :package_id;

-- Q18  Source tracing for a detail block: every raw row of the block in sheet order
SELECT s.source_row, s.row_class, s.item_id, s.raw_values_json
FROM STG_DETAIL_ROWS s
WHERE s.detail_package_id = :detail_package_id
ORDER BY s.source_row;

-- Q19  Mapping exception review queue (open, most severe first, paginated)
SELECT issue_id, severity, issue_type, issue_subtype, batch_id, category, package_number, description,
       original_value, comparison_value, proposed_resolution, source_document, source_sheet, source_row
FROM v_open_issues
WHERE (:severity IS NULL OR severity = :severity)
  AND (:issue_type IS NULL OR issue_type = :issue_type)
ORDER BY severity_rank, issue_type, package_number
LIMIT :page_size OFFSET :offset;

-- Q20  Package relationship inspection - split packages (parent manifest + children)
SELECT pm.package_number_original AS summary_package, par.package_number_original AS parent_block,
       ch.package_number_original AS child_block, ch.sub_package_suffix, ch.gross_weight_kg, ch.item_count
FROM DETAIL_PACKAGES ch
JOIN DETAIL_PACKAGES par ON par.detail_package_id = ch.parent_detail_package_id
JOIN PACKAGE_MASTER pm ON pm.package_id = ch.package_id
ORDER BY pm.package_number_original, ch.source_header_row;

-- Q21  Candidates awaiting manual review
SELECT m.mapping_id, m.batch_id, m.category, m.target_package_number AS detail_package_number,
       m.source_package_number AS proposed_summary_package, m.confidence_level, m.confidence_score, m.mapping_note
FROM PACKAGE_MAPPING m
WHERE m.mapping_status IN ('CANDIDATE_MATCH', 'MANUAL_REVIEW')
ORDER BY m.confidence_score DESC;

-- Q22  Invoice reconciliation per document
SELECT source_document_id, invoice_source, source_sheet, invoice_number, block_count, matches_summary_invoice,
       declared_packages, computed_packages, declared_gross_weight_kg, computed_gross_weight_kg, note
FROM INVOICE_REGISTER ORDER BY source_document_id, invoice_source, source_sheet;

-- Q23  Series completeness (packages declared n/N but not listed in any workbook)
SELECT series_key, declared_total, packages_listed, missing_count, missing_seq, documents
FROM SERIES_REGISTER WHERE missing_count > 0 ORDER BY missing_count DESC;

-- Q24  Excel export of the current grid: same as Q07 without LIMIT/OFFSET (stream to xlsx/csv in the API)
SELECT * FROM v_package_list WHERE batch_id = :batch_id AND category = :category ORDER BY source_sn;

-- Q25  Data-quality status for the footer / admin page
SELECT check_group, status, COUNT(*) AS checks FROM DATA_QUALITY_CHECKS GROUP BY check_group, status
ORDER BY check_group, status;

-- Q26  Import history (last runs)
SELECT import_id, started_at, finished_at, etl_version, status, packages_loaded, detail_packages_loaded,
       items_loaded, issues_logged, checks_failed
FROM IMPORT_HISTORY ORDER BY started_at DESC LIMIT 20;

-- =====================================================================================
-- Logistics Readiness module (PACKAGE_READINESS, rules in config/readiness_rules.json)
-- =====================================================================================

-- Q27  Readiness KPIs per Batch x Category (count- and tonnage-weighted Readiness Index)
SELECT * FROM v_readiness_summary ORDER BY batch_id, category;

-- Q28  Readiness per system / commodity group
SELECT * FROM v_readiness_by_system ORDER BY gross_weight_t DESC;

-- Q29  Site receiving S-curve (packages and tonnage inspected per date, cumulative)
SELECT * FROM v_receiving_curve ORDER BY receiving_date;

-- Q30  Readiness status distribution (donut / stacked bars)
SELECT * FROM v_readiness_status_distribution ORDER BY batch_id, category, sort_order;

-- Q31  Action list: material at site that cannot be issued yet (MDR pending / awaiting inspection)
SELECT r.readiness_status, r.package_number_original, r.batch_id, r.category, r.system_group, r.mdr_state_label,
       r.site_location, r.receiving_date, r.gross_weight_kg, r.next_action
FROM PACKAGE_READINESS r
WHERE r.readiness_status IN ('BLOCKED', 'INSPECTED_MDR_PENDING', 'ON_SITE_AWAITING_INSPECTION')
ORDER BY CASE r.readiness_status WHEN 'BLOCKED' THEN 1 WHEN 'INSPECTED_MDR_PENDING' THEN 2 ELSE 3 END, r.package_number_original;

-- Q32  Pre-arrival MDR risk: not yet received AND MDR not approved, by batch / category / MDR state
SELECT r.batch_id, r.category, r.mdr_state_label, COUNT(*) AS packages, ROUND(SUM(r.gross_weight_kg) / 1000.0, 3) AS gross_weight_t
FROM PACKAGE_READINESS r
WHERE r.readiness_status = 'AWAITING_RECEIVING' AND r.mdr_credit < 1
GROUP BY r.batch_id, r.category, r.mdr_state_label
ORDER BY packages DESC;

-- Q33  Readiness card for one package (drawer header)
SELECT r.*, s.label AS status_label, s.color AS status_color
FROM PACKAGE_READINESS r JOIN REFERENCE_READINESS_STATUS s ON s.status_code = r.readiness_status
WHERE r.package_id = :package_id;

-- Q34  Material on site per location (laydown / Askara / camp): Summary Remark column (U / T) + site tags (V / W)
SELECT site_location_group, SUM(packages) AS packages, ROUND(SUM(gross_weight_t), 3) AS gross_weight_t, SUM(ready) AS ready,
       SUM(inspected_mdr_pending) AS inspected_mdr_pending, SUM(on_site_no_rfs) AS on_site_no_rfs
FROM v_readiness_by_location
GROUP BY site_location_group
ORDER BY MIN(1 - on_site), packages DESC;
