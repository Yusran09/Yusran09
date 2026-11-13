#!/usr/bin/env python3
"""
Logistics Readiness · PMIS embed builder
=======================================

Builds the Logistics Readiness dashboard as a PMIS embed in the same Clean Enterprise UI
(DS v8) as the PMIS hub (Resources / TIA / Schedule): navigator bar on top, the dashboard in
its own frame, settings block + plain-text data blocks, engine stored compressed.

    python3 pmis_embed/build_pmis_embed.py
    python3 pmis_embed/build_pmis_embed.py --sheet-id <ID> --image https://...   (optional settings)
    python3 pmis_embed/build_pmis_embed.py --no-data                              (code without data)
    python3 pmis_embed/build_pmis_embed.py --foundation FOUNDATION.xlsx \
        --foundation-src "<Publish to web CSV link>" --foundation-sheet-id <ID> --foundation-tab <gid>
                                          (page 05 Foundations: foundation snapshot + live foundation sheet)

Inputs   output/MASTER_LOGISTICS_DATABASE.sqlite (from etl/run_etl.py)
         --foundation  foundation register (xlsx sheet "Map Area Readiness", or csv), optional
         pmis_embed/framework/*   PMIS DS v8 parts, verbatim from the PMIS hub embed
         pmis_embed/src/*         the logistics dashboard (pages, logic, styles, settings)
Outputs  output/pmis/LOGISTICS-PMIS-KODE.txt     paste into the website "custom code" block
         output/pmis/LOGISTICS-PMIS-PREVIEW.html  the same code, to open locally in a browser
         output/pmis/LOGISTICS-PMIS-SHEET.xlsx    the 4 tabs for Google Sheets (text cells, header row 1)

Nothing in the source data is changed: values are written as the ETL stored them. Multi-line
cells are written on one line (line breaks -> "; " for inspection dates, a space elsewhere).
"""

import argparse
import base64
import datetime as dt
import hashlib
import html
import json
import re
import sqlite3
import sys
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
FW, SRC = HERE / "framework", HERE / "src"
BASE = HERE.parent
LIMIT = 1_000_000          # website custom-code limit (bytes)
ZLINE = 2000               # base64 line length used by the PMIS hub

# ---------------------------------------------------------------- engine utilities (verbatim + small adaptations)
PATCHES = [
    # chart(): labels, data-date label and tooltip titles come from the chart spec (weekly axis) instead of R.lbl
    ("lx.textContent = R.lbl[j];", "lx.textContent = sp.lbl[j];"),
    ("dl.textContent = 'Data date ' + R.lbl[sp.dd];", "dl.textContent = 'Data date ' + sp.lbl[sp.dd];"),
    ("tt.textContent = 'TO-GO WINDOW';", "tt.textContent = sp.zone || 'TO-GO WINDOW';"),
    ("rowsTip(R.lbl[i] + (i === sp.dd ? ' · data date' : i >= sp.tg0 ? ' · to-go' : ''), sp.tip(i, sp.mode), e.clientX, e.clientY);",
     "rowsTip(sp.tipTitle ? sp.tipTitle(i) : sp.lbl[i] + (i === sp.dd ? ' · data date' : i >= sp.tg0 ? ' · to-go' : ''), sp.tip(i, sp.mode), e.clientX, e.clientY);"),
    ("rowsTip(R.lbl[i], sp.tip(i, sp.mode), e.clientX, e.clientY);",
     "rowsTip(sp.tipTitle ? sp.tipTitle(i) : sp.lbl[i], sp.tip(i, sp.mode), e.clientX, e.clientY);"),
    ("'aria-label': sp.aria || 'Resource loading chart'", "'aria-label': sp.aria || 'Logistics chart'"),
    # drop-down rows show a 0-100 % bar (readiness index) instead of the 0-200 % ratio bar
    ("pp.appendChild(rbar(r));", "pp.appendChild(pbar(r));"),
]


def read(p):
    return Path(p).read_text(encoding="utf-8")


def patched_utils():
    s = read(FW / "engine_utils.js")
    for old, new in PATCHES:
        n = s.count(old)
        if n != 1:
            raise SystemExit(f"patch target found {n}x (expected 1): {old[:70]}")
        s = s.replace(old, new)
    return s


def unzip_helpers():
    """bytes / text / inflate / unzip from the hub script (base64 -> zlib -> text)."""
    s = read(FW / "hub_script.html")
    a = s.index("  function bytes(s) {")
    b = s.index("  /* ---- a dashboard as pasted on the website")
    return s[a:b].rstrip() + "\n"


def compose_js():
    body = patched_utils() + "\n" + unzip_helpers() + read(SRC / "logistics.js")
    return "<script>\n(function () {\n" + body.rstrip() + "\n})();\n</script>"


def compose_engine():
    pages = read(SRC / "pages.html").strip("\n")
    parts = [read(FW / "engine_style_main.css.html").rstrip("\n"),
             read(FW / "engine_pm_finish.css.html").rstrip("\n"),
             read(FW / "engine_pm_ds.css.html").rstrip("\n"),
             read(SRC / "logistics.css.html").rstrip("\n"),
             "",
             pages,
             read(FW / "engine_canvas.js.html").rstrip("\n"),
             "",
             compose_js(),
             "",
             read(FW / "engine_viewer.js.html").rstrip("\n"),
             "",
             read(FW / "engine_welcome.js.html").rstrip("\n")]
    return "\n".join(parts) + "\n"


def zpack(text):
    raw = zlib.compress(text.encode("utf-8"), 9)
    b64 = base64.b64encode(raw).decode("ascii")
    out = "\n".join(b64[i:i + ZLINE] for i in range(0, len(b64), ZLINE))
    assert zlib.decompress(base64.b64decode(out.replace("\n", ""))).decode("utf-8") == text
    return out


# ---------------------------------------------------------------- data blocks
def fmt(v, nl=" "):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else ("%.6f" % v).rstrip("0").rstrip(".")
    s = str(v).replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"[ \t]*\n[ \t\n]*", nl, s.strip())
    return s.replace("\t", " ")


def fdate(iso):
    d = dt.date.fromisoformat(iso[:10])
    return f"{d.day} {d.strftime('%b')} {d.year}"


PKG_COLS = ["Package ID", "Batch", "Category", "S/N", "Package No", "Package Group", "Equipment", "Description",
            "Description CN", "Package Type", "L (mm)", "W (mm)", "H (mm)", "Volume (m3)", "N.W. (kg)", "G.W. (kg)",
            "MDR No", "MDR Status", "RFS Material Receiving", "Inspection Date", "Remark", "Site Note",
            "Detail Blocks", "Split Sub-packages", "Mapping Status", "Material Lines", "Readiness Status (ETL)",
            "Readiness Score (ETL)", "Source", "Data Date"]
BLK_COLS = ["Detail ID", "Package ID", "Batch", "Category", "Package No (Detail)", "Sub-package", "Parent Detail ID",
            "Package Type", "G.W. (kg)", "N.W. (kg)", "Volume (m3)", "Invoice No", "Items", "Item Weight (kg)",
            "Mapping Status", "Split Parent", "Source"]
ISS_COLS = ["Issue ID", "Rule", "Severity", "Issue Type", "Sub-type", "Status", "Batch", "Category", "Package No",
            "Description", "Resolution", "Package ID", "Detail ID", "Source"]
ITM_COLS = ["Detail ID", "Line", "S/N", "Description", "Description CN", "Specification", "Qty", "Unit",
            "Unit Wt (kg)", "Total Wt (kg)", "Equipment", "Drawing No", "Remark", "Type", "Row"]


def extract(db):
    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    c.row_factory = sqlite3.Row
    imp = c.execute("SELECT import_id, started_at, etl_version FROM IMPORT_HISTORY WHERE status='SUCCESS' "
                    "ORDER BY started_at DESC LIMIT 1").fetchone()
    if not imp:
        raise SystemExit("no successful ETL run in IMPORT_HISTORY")
    data_date = imp["started_at"][:10]           # the ETL evaluates readiness 'today' = run date
    docs = {r["source_document_id"]: r["source_file_name"] for r in c.execute("SELECT * FROM SOURCE_DOCUMENTS")}

    pkg = []
    for r in c.execute("""
        SELECT pm.*, pr.linked_detail_packages, pr.split_sub_packages, pr.readiness_status, pr.readiness_score,
               vp.package_mapping_status, vp.material_items
        FROM PACKAGE_MASTER pm
        JOIN PACKAGE_READINESS pr ON pr.package_id = pm.package_id
        LEFT JOIN v_package_list vp ON vp.package_id = pm.package_id
        ORDER BY pm.batch_id, pm.category, pm.source_row"""):
        insp = r["inspection_date"] or fmt(r["inspection_date_original"], "; ")
        pkg.append([r["package_id"], r["batch_id"], r["category"], r["source_sn"], r["package_number_original"],
                    r["package_group"], r["equipment_number"], r["description_en"], r["description_cn"],
                    r["package_type"], r["length_mm"], r["width_mm"], r["height_mm"], r["volume_m3"],
                    r["net_weight_kg"], r["gross_weight_kg"], r["mdr_number"], r["mdr_status"],
                    r["rfs_material_receiving"], insp, r["remark"], r["site_annotation"],
                    r["linked_detail_packages"], r["split_sub_packages"], r["package_mapping_status"],
                    r["material_items"], r["readiness_status"], r["readiness_score"],
                    f"row {r['source_row']}",
                    data_date])

    blk = []
    for r in c.execute("SELECT * FROM DETAIL_PACKAGES ORDER BY batch_id, category, source_document_id, source_sheet, source_block_start_row"):
        blk.append([r["detail_package_id"], r["package_id"], r["batch_id"], r["category"], r["package_number_original"],
                    r["sub_package_suffix"], r["parent_detail_package_id"], r["package_type"], r["gross_weight_kg"],
                    r["net_weight_kg"], r["volume_m3"], r["invoice_number_original"], r["item_count"],
                    r["item_weight_sum_kg"], r["mapping_status"], 1 if r["is_split_parent"] else 0,
                    f"{r['source_sheet']} · rows {r['source_block_start_row']}–{r['source_block_end_row']}"])

    sev = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}
    iss = []
    rows = c.execute("""
        SELECT mi.*, COALESCE(mi.package_id, dp.package_id) AS pkg_resolved
        FROM MAPPING_ISSUES mi LEFT JOIN DETAIL_PACKAGES dp ON dp.detail_package_id = mi.detail_package_id""").fetchall()
    rows.sort(key=lambda r: (sev.get(r["severity"], 9), r["issue_type"] or "", r["batch_id"] or "", r["category"] or "",
                             r["package_number"] or "", r["issue_id"]))
    for r in rows:
        src = " · ".join(str(x) for x in [r["source_sheet"], f"row {r['source_row']}" if r["source_row"] else None] if x)
        iss.append([r["issue_id"], r["rule_id"], r["severity"], r["issue_type"], r["issue_subtype"], r["resolution_status"],
                    r["batch_id"], r["category"], r["package_number"], r["description"], r["proposed_resolution"],
                    r["pkg_resolved"], r["detail_package_id"], src])

    itm = []
    for r in c.execute("""
        SELECT pd.* FROM PACKAGE_DETAIL pd JOIN DETAIL_PACKAGES dp ON dp.detail_package_id = pd.detail_package_id
        ORDER BY dp.batch_id, dp.category, dp.source_document_id, dp.source_sheet, dp.source_block_start_row, pd.line_seq"""):
        itm.append([r["detail_package_id"], r["line_seq"], r["source_sn"], r["description_en"], r["description_cn"],
                    r["specification"], r["quantity"], r["unit_of_quantity"], r["unit_weight_kg"], r["total_weight_kg"],
                    r["equipment_number"], r["drawing_number"], r["remark"], r["item_type"], r["source_row"]])
    n_items = c.execute("SELECT COUNT(*) FROM PACKAGE_DETAIL").fetchone()[0]
    if n_items != len(itm):
        raise SystemExit(f"{n_items - len(itm)} item(s) without a detail block — not exported silently")
    info = dict(import_id=imp["import_id"], etl_version=imp["etl_version"], data_date=data_date,
                documents=sorted(docs.values()), counts=dict(packages=len(pkg), blocks=len(blk), issues=len(iss), items=len(itm)))
    return dict(pkg=(PKG_COLS, pkg), blk=(BLK_COLS, blk), iss=(ISS_COLS, iss), itm=(ITM_COLS, itm)), info


def fcell(v):
    """foundation cell as the sheet shows it: dates as ISO, numbers without trailing zeros, line breaks -> ' / '."""
    if isinstance(v, dt.datetime):
        return v.date().isoformat() if (v.hour, v.minute, v.second) == (0, 0, 0) else v.strftime("%Y-%m-%d %H:%M")
    if isinstance(v, dt.date):
        return v.isoformat()
    return fmt(v, " / ")


def read_foundation(path, sheet):
    """Foundation register -> TSV text. Every column from A is kept, so column letters (B = Axis ID,
    R = Foundation Works) stay as in the sheet; rows above the header row and empty rows are left out."""
    p = Path(path)
    if p.suffix.lower() in (".csv", ".txt"):
        import csv
        with p.open(newline="", encoding="utf-8-sig") as fh:
            rows = [list(r) for r in csv.reader(fh)]
        name = p.name
    else:
        from openpyxl import load_workbook
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            wb = load_workbook(p, read_only=True, data_only=True)
        if sheet not in wb.sheetnames:
            raise SystemExit(f"foundation: sheet '{sheet}' not in {p.name} ({', '.join(wb.sheetnames)}) — use --foundation-sheet")
        rows = [list(r) for r in wb[sheet].iter_rows(values_only=True)]
        name = f"{p.name} · {sheet}"
    hkey = lambda c: re.sub(r"[^a-z0-9]", "", str(c or "").lower())
    hi = next((i for i, r in enumerate(rows[:10]) if "axisid" in [hkey(c) for c in r]), None)
    if hi is None:
        raise SystemExit("foundation: no header row with an 'Axis ID' column in the first 10 rows")
    rows = [[fcell(c) for c in r] for r in rows[hi:]]
    width = max(len(r) for r in rows)
    while width > 1 and not any(len(r) >= width and r[width - 1] for r in rows):
        width -= 1
    out = [(r + [""] * width)[:width] for r in rows]
    out = [out[0]] + [r for r in out[1:] if any(r)]
    if len(out) < 2:
        raise SystemExit("foundation: no data rows under the header")
    return "\n".join("\t".join(r) for r in out), dict(name=name, rows=len(out) - 1, cols=width)


def tsv(cols, rows):
    out = ["\t".join(cols)]
    for r in rows:
        out.append("\t".join(fmt(v) for v in r))
    txt = "\n".join(out)
    low = txt.lower()
    for bad in ("</script", "<!--", "<script"):
        if bad in low:
            raise SystemExit(f"data contains '{bad}', which would break the embed; clean the source value first")
    return txt


BLOCK_IDS = (("pkg", "lg-data-pkg"), ("blk", "lg-data-blk"), ("iss", "lg-data-iss"), ("itm", "lg-data-itm"))


def data_blocks(t, packed, skip=(), fnd=None):
    """t: {key: tsv}; packed: keys stored compressed (data-z="1"); skip: keys left empty (Google Sheet only);
    fnd: (tsv, label) foundation snapshot for page 05, always compressed, or None."""
    out = []
    for k, bid in BLOCK_IDS:
        if k in skip:
            out.append(f'<script type="text/plain" id="{bid}"></script>')
        elif k in packed:
            out.append(f'<script type="text/plain" id="{bid}" data-z="1">\n{zpack(t[k])}\n</script>')
        else:
            out.append(f'<script type="text/plain" id="{bid}">\n{t[k]}\n</script>')
    if fnd:
        out.append(f'<script type="text/plain" id="lg-data-fnd" data-z="1" data-src="{html.escape(fnd[1], quote=True)}">\n{zpack(fnd[0])}\n</script>')
    else:
        out.append('<script type="text/plain" id="lg-data-fnd"></script>')
    return "\n".join(out)


def write_sheet_xlsx(tabs, path):
    from openpyxl import Workbook
    from openpyxl.cell import WriteOnlyCell
    from openpyxl.styles import Font
    wb = Workbook(write_only=True)
    for key, name in (("pkg", "Packages"), ("blk", "Detail"), ("itm", "Items"), ("iss", "Issues")):
        cols, rows = tabs[key]
        ws = wb.create_sheet(name)
        ws.freeze_panes = "A2"
        head = []
        for h in cols:
            cell = WriteOnlyCell(ws, value=h)
            cell.font = Font(bold=True)
            cell.number_format = "@"
            head.append(cell)
        ws.append(head)
        for r in rows:
            line = []
            for v in r:
                cell = WriteOnlyCell(ws, value=fmt(v) or None)
                cell.number_format = "@"
                line.append(cell)
            ws.append(line)
    wb.save(path)


# ---------------------------------------------------------------- assembly
# Packages stay plain text (the block people edit: RFS, inspection date, MDR status); the ETL-derived
# Detail / Issues / Items blocks are stored compressed. If the code still exceeds the limit, the next
# layout is tried and the report says which one was used.
LAYOUTS = [
    dict(name="packages plain · detail, issues, items packed", packed={"blk", "iss", "itm"}, skip=set()),
    dict(name="all blocks packed", packed={"pkg", "blk", "iss", "itm"}, skip=set()),
    dict(name="all blocks packed · material lines from the Google Sheet only", packed={"pkg", "blk", "iss"}, skip={"itm"}),
]


def assemble(args, engine_z, blocks, data_info):
    welcome = json.loads(read(SRC / "welcome.json"))
    if args.image:
        welcome["img"] = args.image
    head = read(FW / "hub_head.html")
    rep = {
        "{{BUILD_INFO}}": "build " + dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "{{HUB_TITLE}}": args.project,
        "{{HUB_TITLE_HTML}}": html.escape(args.project),
        "{{HUB_HEAD}}": head if head.endswith("\n") else head + "\n",
        "{{HUB_STAGE}}": read(FW / "hub_stage.html").rstrip("\n"),
        "{{HUB_LINK}}": read(FW / "hub_link.html").rstrip("\n"),
        "{{DASH_TITLE}}": f"{args.project} – Logistics Readiness",
        "{{SHEET_ID}}": args.sheet_id or "",
        "{{IMAGE}}": args.image or "",
        "{{FND_SRC}}": args.foundation_src or "",
        "{{FND_SID}}": args.foundation_sheet_id or "",
        "{{FND_TAB}}": args.foundation_tab or "",
        "{{WELCOME_JSON}}": json.dumps(welcome, ensure_ascii=False).replace("</", "<\\/"),
        "{{DATA_INFO}}": data_info,
        "{{DATA_BLOCKS}}": blocks,
        "{{ENGINE_Z}}": engine_z,
        "{{HUB_SCRIPT}}": read(FW / "hub_script.html").rstrip("\n"),
    }
    page = read(SRC / "shell.html")
    for k, v in rep.items():
        if page.count(k) < 1:
            raise SystemExit(f"placeholder {k} missing in shell.html")
        page = page.replace(k, v)
    left = re.findall(r"\{\{[A-Z_]+\}\}", page)
    if left:
        raise SystemExit(f"unfilled placeholders: {left}")
    return page


def build(args):
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    engine = compose_engine()
    if "<!--pmhub:keep-->" in engine:
        raise SystemExit("engine must not contain the keep marker")
    engine_z = zpack(engine)
    rpt = {"engine_bytes": len(engine.encode()), "engine_z_bytes": len(engine_z)}
    tabs, fnd = None, None
    for k in ("foundation_src", "foundation_sheet_id", "foundation_tab"):
        v = getattr(args, k) or ""
        if any(c in v for c in "<>\n\"") or v.startswith(("http:", "javascript:")):
            raise SystemExit(f"--{k.replace('_', '-')}: not a valid link / ID")
    if args.foundation and not args.no_data:
        ftxt, finfo = read_foundation(args.foundation, args.foundation_sheet)
        fnd = (ftxt, f"{finfo['name']} · snapshot {fdate(dt.date.today().isoformat())}")
        rpt["foundation"] = dict(finfo, tsv_bytes=len(ftxt.encode()), packed_bytes=len(zpack(ftxt)))
    if args.no_data:
        page = assemble(args, engine_z, data_blocks({}, set(), skip={"pkg", "blk", "iss", "itm"}), "no data — template only")
        rpt["layout"] = "template without data"
    else:
        tabs, info = extract(args.db)
        t = {k: tsv(*v) for k, v in tabs.items()}
        c = info["counts"]
        data_info = (f"Logistics ETL {info['import_id']} (v{info['etl_version']}) · data date {fdate(info['data_date'])} · "
                     f"{c['packages']} packages / {c['blocks']} detail blocks / {c['items']} material lines / {c['issues']} issues")
        tried = []
        # the foundation snapshot is kept if a layout that still embeds the material lines fits with it (page 05
        # needs both); otherwise it is dropped first and page 05 loads the foundation sheet only
        keep = [l for l in LAYOUTS if not l["skip"]]
        order = [(l, True) for l in keep if fnd] + [(l, False) for l in keep]
        order += [(l, w) for l in LAYOUTS if l["skip"] for w in ((True, False) if fnd else (False,))]
        for lay, with_f in order:
            page = assemble(args, engine_z, data_blocks(t, lay["packed"], lay["skip"], fnd if with_f else None), data_info)
            tried.append((lay["name"] + (" · foundation snapshot" if with_f else ""), len(page.encode("utf-8"))))
            if tried[-1][1] < LIMIT:
                break
        if fnd and not with_f:
            print("WARNING: foundation snapshot not embedded (size limit) — page 05 loads the foundation sheet only.", file=sys.stderr)
        rpt["foundation_embedded"] = bool(fnd and with_f)
        rpt.update(layout=lay["name"], tried=tried, data=info, tsv_bytes={k: len(v.encode()) for k, v in t.items()})
        if lay["skip"]:
            print("WARNING: material lines are not embedded (size limit) — they load from the Google Sheet tab only.", file=sys.stderr)
    size = len(page.encode("utf-8"))
    name = "LOGISTICS-PMIS-KODE" + ("-TEMPLATE" if args.no_data else "")
    (out_dir / f"{name}.txt").write_text(page, encoding="utf-8")
    (out_dir / f"{name.replace('KODE', 'PREVIEW')}.html").write_text(
        "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        "<title>Logistics Readiness · PMIS preview</title><style>body{margin:0;background:#EEF0EC}</style></head><body>\n"
        + page + "\n</body></html>\n", encoding="utf-8")
    if tabs and not args.no_sheet:
        write_sheet_xlsx(tabs, out_dir / "LOGISTICS-PMIS-SHEET.xlsx")
    rpt.update(output=str(out_dir / f"{name}.txt"), bytes=size, limit=LIMIT, under_limit=size < LIMIT,
               sha256=hashlib.sha256(page.encode()).hexdigest()[:16])
    print(json.dumps(rpt, indent=2, ensure_ascii=False))
    if size >= LIMIT:
        raise SystemExit(f"embed is {size:,} bytes — over the {LIMIT:,} byte limit")
    return rpt


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=str(BASE / "output" / "MASTER_LOGISTICS_DATABASE.sqlite"))
    ap.add_argument("--out-dir", default=str(BASE / "output" / "pmis"))
    ap.add_argument("--project", default="Nusaraya Project", help="project name in the navigator bar and the title")
    ap.add_argument("--sheet-id", default="", help="Google Sheet ID written into the settings block (optional)")
    ap.add_argument("--image", default="", help="https:// photo for the welcome page (optional)")
    ap.add_argument("--no-data", action="store_true", help="code only, without the embedded data blocks")
    ap.add_argument("--no-sheet", action="store_true", help="do not write LOGISTICS-PMIS-SHEET.xlsx")
    ap.add_argument("--foundation", default="", help="foundation register (xlsx / csv) embedded as the page-05 snapshot (optional)")
    ap.add_argument("--foundation-sheet", default="Map Area Readiness", help="sheet of the foundation xlsx (default: Map Area Readiness)")
    ap.add_argument("--foundation-src", default="", help='"Pondasi Sumber": Publish to web CSV link of the foundation tab (optional)')
    ap.add_argument("--foundation-sheet-id", default="", help='"Pondasi Sheet ID": share link / ID of the foundation Google Sheet (optional)')
    ap.add_argument("--foundation-tab", default="", help='"Pondasi Tab": gid or tab name for the Sheet ID (optional)')
    build(ap.parse_args(argv))


if __name__ == "__main__":
    main()
