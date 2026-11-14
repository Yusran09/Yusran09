#!/usr/bin/env python3
"""
Regression test of the Logistics PMIS embed — run after the ETL:

    python3 pmis_embed/tests/run_pmis_tests.py [--db output/MASTER_LOGISTICS_DATABASE.sqlite] [--shots DIR]

1. builds the embed in a temporary folder (embedded data + a test Sheet ID) and checks the 1 MB limit;
2. turns LOGISTICS-PMIS-SHEET.xlsx into CSV per tab, as Google's gviz CSV export returns it;
3. exports the ETL reference (PACKAGE_READINESS, material lines per detail block);
4. page 05 Foundations: a foundation register (--foundation FILE, or a SYNTHETIC test register made from the
   drawing numbers of the ETL in the temporary folder) is embedded; the axis <-> drawing matching is recomputed
   here in Python and compared with the dashboard (matrix, KPI, per-axis material, Excel, live CSV link);
5. runs test_pmis_embed.js in Chromium (Playwright) and checks every figure of its RESULT.
Needs Node.js with the 'playwright' package and its Chromium. Exit code 0 = all checks pass.
"""
import argparse
import csv
import io
import json
import re
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
PMIS = HERE.parent
BASE = PMIS.parent
sys.path.insert(0, str(PMIS))
import build_pmis_embed as B  # noqa: E402

# readiness status code -> button label in the dashboard (short labels of config/readiness_rules.json)
STATUS_LABEL = {"READY_FOR_CONSTRUCTION": "Ready", "INSPECTED_MDR_PENDING": "MDR pending", "ON_SITE_AWAITING_INSPECTION": "Awaiting RFS",
                "AWAITING_RECEIVING": "In transit", "BLOCKED": "Blocked"}


def reference(db):
    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    pk = {r[0]: dict(st=r[1], sc=r[2], recv=r[3], loc=r[4], mdr=r[5], open=r[6], act=r[7], lg=r[8]) for r in c.execute(
        "SELECT package_id, readiness_status, readiness_score, receiving_date, site_location, mdr_state, open_issue_count, next_action, "
        "site_location_group FROM PACKAGE_READINESS")}
    locs = dict(c.execute("SELECT COALESCE(site_location_group, 'Not on site'), COUNT(*) FROM PACKAGE_READINESS GROUP BY 1"))
    status = dict(c.execute("SELECT readiness_status, COUNT(*) FROM PACKAGE_READINESS GROUP BY 1"))
    named = [k for k, _ in sorted(((k, v) for k, v in locs.items() if k not in ("Not on site", "On-site (no laydown)")), key=lambda kv: -kv[1])][:2]
    dlist = None
    if len(named) == 2:
        sel = """FROM PACKAGE_READINESS r JOIN PACKAGE_DETAIL it ON it.package_id = r.package_id
                 WHERE r.mdr_state = 'APV' AND r.site_location_group IN (?, ?) AND it.item_type <> 'SUB_PACKAGE_REFERENCE'"""
        n_pk = c.execute("SELECT COUNT(*) FROM PACKAGE_READINESS WHERE mdr_state = 'APV' AND site_location_group IN (?, ?)", named).fetchone()[0]
        n_ln = c.execute("SELECT COUNT(*) " + sel, named).fetchone()[0]
        dws = sorted({r[0] for r in c.execute("SELECT DISTINCT it.drawing_number " + sel + " AND it.drawing_number IS NOT NULL", named)})
        dlist = dict(locs=named, packages=n_pk, lines=n_ln, drawings=dws)
    mdr = dict(c.execute("SELECT mdr_state, COUNT(*) FROM PACKAGE_READINESS GROUP BY 1"))
    items = dict(c.execute("SELECT detail_package_id, COUNT(*) FROM PACKAGE_DETAIL GROUP BY 1"))
    split = dict(c.execute("SELECT package_id, COUNT(*) n FROM DETAIL_PACKAGES WHERE package_id IS NOT NULL GROUP BY 1 HAVING n > 1 ORDER BY n DESC LIMIT 1"))
    grp = c.execute("SELECT package_group FROM PACKAGE_MASTER WHERE package_group IS NOT NULL ORDER BY batch_id, category, source_row LIMIT 1").fetchone()
    dwg = c.execute("SELECT drawing_number FROM PACKAGE_DETAIL WHERE drawing_number IS NOT NULL AND LENGTH(drawing_number) >= 6 LIMIT 1").fetchone()
    combos = c.execute("SELECT COUNT(DISTINCT batch_id || category) FROM PACKAGE_MASTER").fetchone()[0]
    pend = c.execute("SELECT COUNT(*) FROM PACKAGE_READINESS WHERE readiness_status = 'INSPECTED_MDR_PENDING'").fetchone()[0]
    dd = c.execute("SELECT substr(started_at, 1, 10) FROM IMPORT_HISTORY WHERE status = 'SUCCESS' ORDER BY started_at DESC LIMIT 1").fetchone()[0]
    return dict(pk=pk, items=items, itemsTotal=sum(items.values()), splitBlocks=split, combos=combos, pending=pend, dataDate=dd, locs=locs,
                status=status, mdr=mdr, dwg=dlist,
                searches=[s for s in (grp and grp[0], dwg and dwg[0]) if s])


# ---------------------------------------------------------------- page 05: foundation register x material (Python mirror)
AXRE = re.compile(r"^[0O](\d)([A-Z])(\d{1,2})([A-Z]{1,2})(\d{3})([A-Z](?![A-Z]))?", re.ASCII)
AXIN = re.compile(r"[0O]\d[A-Z]\d{1,2}[A-Z]{1,2}\d{3}", re.ASCII)
F_READY = ("concreting", "complete", "completed", "done", "finish")      # default of the setting "Pondasi Siap"
F_STATUSES = ("Concreting", "Rebar & Form Works", "Piling", "Excavation", "Not Started", "Any Constraint", "Land Clearing In Progress")
F_HEAD = ["Point ID", "Axis ID", "Structure Group", "Foundation Class", "Segment ID", "STA ID", "Chainage (m)", "Chainage Basis", "Easting X",
          "Northing Y", "Latitude", "Longitude", "Longitude a", "Route ID", "Point Order", "Area Status", "Earth Works", "Foundation Works",
          "Remark\nFoundation", "Remark\nUpper Structure"]
NOLOC = "On-site (no laydown)"


def _u(s):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(s or "").strip()).upper())


def _key(m):
    return "0" + "".join(m.group(i) for i in range(1, 6)) + (m.group(6) or "")


def _span(m, k, to, suf):
    base, a = k[: len(k) - (4 if m.group(6) else 3)], int(m.group(5))
    if not to >= a or to - a > 60:
        return [k]
    out = [k] if m.group(6) else []
    return out + [f"{base}{n:03d}" for n in range(a, to + 1)] + ([f"{base}{to:03d}{suf}"] if suf else [])


def axis_keys(raw):
    """register value: 'O2J2Z003 ~ 5' -> 02J2Z003, 02J2Z004, 02J2Z005 (letter O = digit 0)"""
    s = _u(raw)
    m = AXRE.match(s)
    if not m:
        return []
    r = re.fullmatch(r"~(\d{1,3})([A-Z])?", s[m.end():], re.ASCII)
    return _span(m, _key(m), int(r.group(1)), r.group(2) or "") if r else [_key(m)]


def drawing_axes(dw):
    """drawing number: '02J3Z043-HJ-1' -> 02J3Z043 · '01J5Z001~01J5Z008' -> 8 axes · '第一行：02J3Z001a--02J3Z007' -> 001A, 001..007"""
    s = _u(dw)
    m = AXRE.match(s)
    if not m:
        i = AXIN.search(s)
        if not i or i.start() < 1 or re.search(r"[A-Z0-9]", s[:i.start()], re.ASCII):
            return []
        s = s[i.start():]
        m = AXRE.match(s)
        if not m:
            return []
    k, rest = _key(m), s[m.end():]
    r = re.match(r"~(?:[0O]\d[A-Z]\d{1,2}[A-Z]{1,2})?(\d{3})", rest, re.ASCII)
    if r:
        return _span(m, k, int(r.group(1)), "")
    e = re.match(r"(?:-{1,2}|_|至|TO)([0O]\d[A-Z]\d{1,2}[A-Z]{1,2}\d{3}[A-Z]?)", rest, re.ASCII)
    m2 = AXRE.match(e.group(1)) if e else None
    if not m2:
        return [k]
    k2 = _key(m2)
    same = k2[: len(k2) - (4 if m2.group(6) else 3)] == k[: len(k) - (4 if m.group(6) else 3)]
    return _span(m, k, int(m2.group(5)), m2.group(6) or "") if same else [k, k2]


def seg_of_key(k):
    m = AXRE.match(k)
    return "0" + m.group(1) + m.group(2) + m.group(3) + m.group(4)[:-1] if m else ""


def drawing_seg(dw):
    m = re.match(r"[0O](\d)([A-Z])(\d{1,2})([A-Z]?)(?=[-_~(]|$)", _u(dw), re.ASCII)
    return "0" + m.group(1) + m.group(2) + m.group(3) + m.group(4) if m else ""


def near1(a, b):
    la, lb, i = len(a), len(b), 0
    if a == b or abs(la - lb) > 1:
        return False
    while i < la and i < lb and a[i] == b[i]:
        i += 1
    if la == lb:
        return a[i + 1:] == b[i + 1:] or (i + 1 < la and a[i] == b[i + 1] and a[i + 1] == b[i] and a[i + 2:] == b[i + 2:])
    return a[i:] == b[i + 1:] if la < lb else a[i + 1:] == b[i:]


def _num(k):
    m = re.search(r"(\d+)[A-Z]?$", k)
    return int(m.group(1)) if m else None


def foundation_fixture(db, path):
    """SYNTHETIC foundation register for the regression test only (written to the temporary folder, never to the
    outputs): axis IDs come from the drawing numbers of the ETL, statuses / STA are assigned in rotation. It covers
    letter O and digit 0, a range row, a duplicated axis, a duplicated axis whose Segment ID shows the typo, a 1-character
    typo between register and drawings, a value that is no axis ID, axes left out, axes without material, an empty status."""
    from openpyxl import Workbook
    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    dws = [r[0] for r in c.execute("SELECT DISTINCT drawing_number FROM PACKAGE_DETAIL WHERE drawing_number IS NOT NULL")]
    keys = sorted({k for d in dws for k in drawing_axes(d) if AXRE.match(k)})
    if len(keys) < 12:
        return None
    keys = [k for i, k in enumerate(keys) if i % 9 != 4]                     # left out -> their lines stay unmatched
    rows, i, ranges = [], 0, 0
    while i < len(keys):
        k = keys[i]
        nxt = keys[i + 1:i + 3]
        if ranges < 4 and not k[-1].isalpha() and len(nxt) == 2 and all(
                n[:-3] == k[:-3] and not n[-1].isalpha() and int(n[-3:]) == int(k[-3:]) + j + 1 for j, n in enumerate(nxt)):
            rows.append("O" + k[1:] + " ~ " + str(int(nxt[-1][-3:])))         # range row "O2J2Z003 ~ 5"
            ranges += 1
            i += 3
        else:
            rows.append(("O" + k[1:]) if i % 2 == 0 else k)
            i += 1
    singles = [r for r in rows if "~" not in r]
    present = {kk for r in rows for kk in axis_keys(r)}
    typo = None                                                               # 1-character typo: register Z -> X, drawings keep Z
    for r in singles[20:]:
        k = axis_keys(r)[0]
        if "Z" not in k[3:-3]:
            continue
        t = k[:-3].replace("Z", "X") + k[-3:]
        if len(t) != len(k) or t in present or sum(1 for rr in rows if k in axis_keys(rr)) != 1:
            continue
        others = [x for x in present if x != k and x[1] == k[1] and near1(k, x) and _num(x) == _num(k)]
        if not others:
            typo = (r, ("O" if r.startswith("O") else "0") + t[1:])
            break
    if typo:
        rows[rows.index(typo[0])] = typo[1]
    base = keys[-1][:-3] if not keys[-1][-1].isalpha() else keys[-1][:-4]
    rows += [f"O{base[1:]}{n:03d}" for n in range(901, 906) if f"{base}{n:03d}" not in keys]   # axes without material
    rows.insert(7, rows[5])                                                   # duplicated axis ID (same segment: stays a duplicate)
    rows.insert(11, "TBA")                                                    # not an axis ID
    seg_typo = next((r for r in singles[30:] if r in rows and "~" not in r), None)

    def segid(raw, n):
        m = AXRE.match(_u(raw).replace(" ", ""))
        return f"{m.group(2)}{m.group(3)} ({n})" if m else None
    out = []
    for n, raw in enumerate(rows):
        st = "" if n == 9 else F_STATUSES[(n * 5 + n // 7) % len(F_STATUSES)]
        out.append([n + 1, raw, "Tower Foundation", "Shallow" if n % 3 else "Pile Cap", segid(raw, n + 1), f"TEST STA {n // 40 + 1:02d}", f"T-{n * 10:05.2f}",
                    "Point", 550000.0 + n * 12.5, 83000.0 + n * 3.25, 0.759, 0.511, None, "TEST Axis", n + 1, "Lahan Terbuka" if n % 5 else "KPC - RA",
                    "Cut & Fill", st, "- line one\n- line two" if n % 4 == 0 else None, None])
    if seg_typo:                                                              # same ID again, but its Segment ID names segment +5
        m = AXRE.match(_u(seg_typo))
        out.append([len(out) + 1, seg_typo, "Precast Line", "Shallow", f"{m.group(2)}{int(m.group(3)) + 5} (1)", "TEST STA 99", "T-99999.00", "Point",
                    0.0, 0.0, 0.0, 0.0, None, "TEST Axis", len(out) + 1, "Lahan Terbuka", "Cut & Fill", "Concreting", None, None])
    wb = Workbook()
    ws = wb.active
    ws.title = "Map Area Readiness"
    ws.append(F_HEAD)
    for r in out:
        ws.append(r)
    wb.save(path)
    return path


def foundation_reference(db, tsv_text):
    """Expected page-05 figures from the register the builder embeds (same TSV) and the ETL material lines."""
    T = [r.split("\t") for r in tsv_text.split("\n")]
    hk = [re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKC", h).lower()) for h in T[0]]
    ai, si = 1, 17                                                            # columns B and R (default settings)
    col = lambda *ns: next((hk.index(n) for n in ns if n in hk), -1)
    ci, gi = col("staid", "staidassigned"), col("segmentid")
    found, by, bad = [], {}, []
    for r in T[1:]:
        r = r + [""] * (len(T[0]) - len(r))
        raw = r[ai].strip()
        if not raw:
            continue
        ks = axis_keys(raw)
        if not ks:
            bad.append(raw)
            continue
        f = dict(n=len(found), raw=raw, raw0=raw, keys=ks, st=r[si].strip() or "No status", sta=(r[ci].strip() if ci > -1 else "") or "—",
                 seg=r[gi].strip() if gi > -1 else "", lines=0, pks=set(), nr=False)
        found.append(f)
        for k in ks:
            by.setdefault(k, []).append(f)
    fixes = []                                                                # duplicated ID + Segment ID that names another segment
    if gi > -1:
        for k in list(by):
            fs = by[k]
            if len(fs) < 2:
                continue
            m = AXRE.match(k)
            sk = m.group(2) + m.group(3)
            sg_of = lambda f: (re.match(r"([A-Z]+\d+)", _u(f["seg"]), re.ASCII) or [None, ""])[1] if f["seg"] else ""
            if not any(sg_of(f) == sk for f in fs):
                continue
            for f in list(fs):
                sg = sg_of(f)
                if not sg or sg == sk or sg[0] != m.group(2):
                    continue
                nk = "0" + m.group(1) + sg + m.group(4) + m.group(5) + (m.group(6) or "")
                if nk in by:
                    continue
                by[k].remove(f)
                by[nk] = [f]
                f["keys"] = [nk if x == k else x for x in f["keys"]]
                if len(f["keys"]) == 1:
                    f["raw"] = ("O" if f["raw0"][0].upper() == "O" else "0") + nk[1:]
                fixes.append([f["raw0"], f["raw"]])
    segs = {}
    for f in found:
        for k in f["keys"]:
            s0 = seg_of_key(k)
            if s0:
                S = segs.setdefault(s0, dict(fs=[], lines=0, on=0))
                if f not in S["fs"]:
                    S["fs"].append(f)
    keys = list(by)
    near_c = {}

    def rows_of(k):
        return by.get(k) or (by.get(k[:-1]) if k[-1].isalpha() else None) or []

    def fnear(k):
        if k not in near_c:
            c = [r for r in keys if r[1] == k[1] and near1(k, r) and (_num(k) is None or _num(r) is None or _num(k) == _num(r))]
            near_c[k] = c[0] if len(c) == 1 else c or None
        return near_c[k]

    def link(dw):
        ks, L = drawing_axes(dw), dict(fs=[], nr=[], amb=[], sg=None)
        if not ks:
            sg = drawing_seg(dw)
            if sg:
                L["sg"] = sg
                return ks, L
            t0 = re.sub(r"^O", "0", re.split(r"[-~_(]", _u(dw))[0])
            if re.match(r"0\d[A-Z]", t0, re.ASCII) and 6 <= len(t0) <= 11:
                ks = [t0]
        for k in ks:
            rs = rows_of(k)
            if not rs:
                c = fnear(k)
                if isinstance(c, str):
                    rs = by[c]
                    L["nr"].append((k, c))
                elif c:
                    L["amb"].append(k)
            for f in rs:
                if f not in L["fs"]:
                    L["fs"].append(f)
        return ks, L

    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    pk_info = {r[0]: dict(on=r[1] is not None, lg=r[1]) for r in c.execute("SELECT package_id, site_location_group FROM PACKAGE_READINESS")}
    matched = axis_like = seg_n = 0
    unm, seg_u, near, amb = Counter(), Counter(), {}, set()
    f_lines = {f["n"]: [] for f in found}
    seg_lines = {s0: [] for s0 in segs}
    for lid, pid, dw in c.execute("""SELECT d.item_id, b.package_id, d.drawing_number FROM PACKAGE_DETAIL d
                                     JOIN DETAIL_PACKAGES b ON b.detail_package_id = d.detail_package_id
                                     JOIN PACKAGE_READINESS r ON r.package_id = b.package_id
                                     WHERE d.item_type <> 'SUB_PACKAGE_REFERENCE' AND d.drawing_number IS NOT NULL"""):
        ks, L = link(dw)
        if L["sg"]:
            if L["sg"] in segs:
                seg_n += 1
                seg_lines[L["sg"]].append((lid, pid))
            else:
                seg_u[L["sg"][:2]] += 1
            continue
        if not ks:
            continue
        axis_like += 1
        amb.update(L["amb"])
        if not L["fs"]:
            unm[ks[0][:2]] += 1
            continue
        matched += 1
        for k, t0 in L["nr"]:
            near.setdefault(k, [t0, 0])[1] += 1
        for f in L["fs"]:
            f["lines"] += 1
            f["pks"].add(pid)
            f_lines[f["n"]].append((lid, pid))
            if L["nr"]:
                f["nr"] = True
    for f in found:
        on = sum(1 for q in f["pks"] if pk_info[q]["on"])
        f["mat"] = "NONE" if not f["pks"] else "ON" if on == len(f["pks"]) else "PART" if on else "OFF"
        f["ready"] = any(w in f["st"].lower() for w in F_READY)
    mx = {}
    for f in found:
        row = mx.setdefault(f["st"], [0, 0, 0, 0, 0])
        row[("ON", "PART", "OFF", "NONE").index(f["mat"])] += 1
        row[4] += 1
    with_m = [f for f in found if f["mat"] != "NONE"]
    kpi = [len(with_m), sum(1 for f in found if f["ready"] and f["mat"] == "ON"),
           sum(1 for f in found if not f["ready"] and f["mat"] in ("ON", "PART")), sum(1 for f in found if f["ready"] and f["mat"] in ("OFF", "NONE"))]
    sample = max(found, key=lambda f: f["lines"])
    live = next((f for f in found if f["mat"] != "NONE" and not f["ready"] and not f["nr"] and sum(1 for g in found if g["raw0"] == f["raw0"]) == 1), None)
    # mapping: material on site per laydown -> axis / segment; ready foundations without all material on site
    G = {}

    def grp(lg):
        return G.setdefault(lg, dict(ax={}, sg={}, ln=set(), sl=0))
    for f in found:
        for lid, pid in f_lines[f["n"]]:
            if not pk_info[pid]["on"]:
                continue
            g = grp(pk_info[pid]["lg"])
            a = g["ax"].setdefault(f["n"], dict(f=f, pk=set(), lines=0))
            a["pk"].add(pid)
            a["lines"] += 1
            g["ln"].add(lid)
    for s0 in sorted(segs):
        for lid, pid in seg_lines[s0]:
            if not pk_info[pid]["on"]:
                continue
            g = grp(pk_info[pid]["lg"])
            a = g["sg"].setdefault(s0, dict(pk=set(), lines=0))
            a["pk"].add(pid)
            a["lines"] += 1
            g["sl"] += 1
    gs = sorted(G.items(), key=lambda kv: (kv[0] == NOLOC, -(len(kv[1]["ln"]) + kv[1]["sl"]), kv[0]))
    fmap = dict(gs=[dict(name=name, ax=[[a["f"]["raw"], len(a["pk"]), a["lines"]] for a in sorted(g["ax"].values(), key=lambda a: (not a["f"]["ready"], a["f"]["n"]))],
                         rdy=sum(1 for a in g["ax"].values() if a["f"]["ready"]), lines=len(g["ln"]), sg=[[s0, len(a["pk"]), a["lines"]] for s0, a in g["sg"].items()])
                    for name, g in gs],
                ready=[[f["raw"], f["mat"], sum(1 for q in f["pks"] if pk_info[q]["on"]), sum(1 for q in f["pks"] if not pk_info[q]["on"])] for f in found if f["ready"] and f["mat"] != "ON"])
    n_checks = (len(fixes) + len(near) + len(amb) + sum(1 for s0 in segs if seg_lines[s0]) + len(unm) + len(seg_u)
                + sum(1 for v in by.values() if len(v) > 1) + min(len(bad), 50))
    xl_rows = sum(len(a["pk"]) for _, g in gs for a in list(g["ax"].values()) + list(g["sg"].values()))

    def status_of(dw):                                                        # foundation cells of the drawing list
        ks, L = link(dw)
        if L["sg"]:
            S = segs.get(L["sg"])
            if not S:
                return L["sg"] + " (segment)", "not in foundation register"
            rd = sum(1 for f in S["fs"] if any(w in f["st"].lower() for w in F_READY))
            return L["sg"] + " (segment)", f"segment: {rd:,} of {len(S['fs']):,} foundations ready"
        if not ks:
            return None
        sts = []
        for f in L["fs"]:
            if f["st"] not in sts:
                sts.append(f["st"])
        st = " / ".join(sts) + (" · ≈ " + ", ".join(x for _, x in L["nr"]) if L["nr"] else "") if L["fs"] else "not in foundation register"
        return (ks[0] + "…" + ks[-1][-3:] if len(ks) > 1 else ks[0]), st

    ref = dict(n=len(found), keys=len(by), dup=sum(1 for v in by.values() if len(v) > 1), bad=min(len(bad), 50), matched=matched, axisLike=axis_like,
               unm=dict(unm), segU=dict(seg_u), segN=seg_n, segLines={s0: len(v) for s0, v in seg_lines.items() if v}, fixes=fixes,
               near={k: v for k, v in near.items()}, mat=dict(Counter(f["mat"] for f in found)), matrix=mx, kpi=kpi, withM=len(with_m),
               pkgsWithM=len({q for f in with_m for q in f["pks"]}), linesSum=sum(f["lines"] for f in found),
               perAxis=[[f["raw"], f["lines"], len(f["pks"]), f["mat"]] for f in found],
               sample=dict(raw=sample["raw"], lines=sample["lines"], pkgs=len(sample["pks"])),
               live=dict(raw=live["raw0"], disp=live["raw"], to="Concreting") if live else None,
               map=fmap, mapRows=dict(a=sum(len(g["ax"]) for _, g in gs), sg=sum(len(g["sg"]) for _, g in gs), r=len(fmap["ready"])),
               xl=dict(s1=xl_rows, s2=len(fmap["ready"]), s3=n_checks))
    return ref, status_of


def foundation_live_csv(src, sheet, live, out):
    """the register as Google's "Publish to web" CSV (quoted only where needed, line breaks kept), one status changed"""
    from openpyxl import load_workbook
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        wb = load_workbook(src, read_only=True, data_only=True)
        rows = [["" if v is None else (str(int(v)) if isinstance(v, float) and v.is_integer() else str(v)) for v in r]
                for r in wb[sheet].iter_rows(values_only=True)]
    n = 0
    for r in rows:
        if live and len(r) > 17 and r[1].strip() == live["raw"]:
            r[17] = live["to"]
            n += 1
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\n").writerows(rows)
    out.write_text(buf.getvalue(), encoding="utf-8")
    return n


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
    ap.add_argument("--foundation", default="", help="real foundation register (xlsx) instead of the synthetic test register")
    ap.add_argument("--foundation-sheet", default="Map Area Readiness")
    a = ap.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        fsrc = Path(a.foundation) if a.foundation else foundation_fixture(a.db, tmp / "TEST-FOUNDATION-REGISTER.xlsx")
        fpub = "https://docs.google.com/spreadsheets/d/e/TEST_PUBLISH_0123456789abcdefghij/pub?gid=123&single=true&output=csv"
        rpt = B.build(B.argparse.Namespace(db=a.db, out_dir=str(tmp), project="Test Project", sheet_id="TESTSHEET_0123456789abcdefghij",
                                           image="", no_data=False, no_sheet=False, foundation=str(fsrc) if fsrc else "",
                                           foundation_sheet=a.foundation_sheet, foundation_src=fpub if fsrc else "",
                                           foundation_sheet_id="", foundation_tab=""))
        xlsx_to_csv(tmp / "LOGISTICS-PMIS-SHEET.xlsx", tmp)
        ref = reference(a.db)
        fstatus = None
        if fsrc:
            ref["fnd"], fstatus = foundation_reference(a.db, B.read_foundation(fsrc, a.foundation_sheet)[0])
            ref["fnd"]["source"] = "real register " + fsrc.name if a.foundation else "synthetic test register"
            ref["fnd"]["liveRows"] = foundation_live_csv(fsrc, a.foundation_sheet, ref["fnd"]["live"], tmp / "foundation-live.csv")
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
        xl = tmp / "drawing-list.xlsx"
        if xl.exists():                                     # the Excel file the dashboard wrote, read back while the folder exists
            from openpyxl import load_workbook
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                wb = load_workbook(xl, read_only=True)
                rows = list(wb.worksheets[0].iter_rows(values_only=True))
            R.setdefault("pages", {}).setdefault("drawing", {})["xlsxRows"] = len(rows) - 1
            R["pages"]["drawing"]["xlsxDrawings"] = sorted({r[15] for r in rows[1:] if r[15]})
            R["pages"]["drawing"]["xlsxPackages"] = len({r[2] for r in rows[1:]})
            if fstatus:                                     # foundation cells of every drawing-list line vs the Python mirror
                bad = [r[15] for r in rows[1:] if (fstatus(r[15]) or ("", "")) != ((r[16] or ""), (r[17] or ""))]
                R["pages"]["drawing"]["xlsxFoundation"] = dict(head=list(rows[0][16:19]), bad=len(bad), ex=bad[:3])
        fm = tmp / "foundation-mapping.xlsx"
        if fm.exists():
            from openpyxl import load_workbook
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                wbm = load_workbook(fm, read_only=True)
                R["pages"].setdefault("fnd", {})["xlMap"] = {ws.title: sum(1 for _ in ws.iter_rows(values_only=True)) - 1 for ws in wbm.worksheets}
        fx = tmp / "foundation.xlsx"
        if fx.exists():
            from openpyxl import load_workbook
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                rows = list(load_workbook(fx, read_only=True).worksheets[0].iter_rows(values_only=True))
            R["pages"].setdefault("fnd", {})["xlsx"] = dict(rows=len(rows) - 1, lines=sum(int(r[16] or 0) for r in rows[1:]),
                                                           status=dict(Counter(r[10] for r in rows[1:])), head=[rows[0][0], rows[0][10], rows[0][16]])

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
        named = {k: v for k, v in ref["locs"].items() if k not in ("Not on site", "On-site (no laydown)")}
        chk("packing list position buttons: All · Laydown / area · each laydown · On-site · Not on site",
            P["locButtons"] == len(named) + 4, P["locButtons"])
        chk("packing list MDR buttons", P["mdrButtons"] == len(ref["mdr"]) + 1, (P["mdrButtons"], ref["mdr"]))
        q = P["quick"]["opened"]
        want = {"Laydown / area": sum(named.values()), "On-site (no laydown)": ref["locs"].get("On-site (no laydown)", 0),
                "Not on site": ref["locs"].get("Not on site", 0), **named, **{lab: ref["status"].get(code, 0) for code, lab in STATUS_LABEL.items()}}
        chk("overview quick view: one button per position, laydown and status", P["quick"]["n"] == len(want), (P["quick"]["n"], len(want)))
        bad = {k: (q.get(k), v) for k, v in want.items() if not q.get(k) or q[k]["page"] != 3 or q[k]["n"] != v}
        chk("every quick view button opens the packing list with exactly its packages", not bad, bad or {k: q[k]["n"] for k in want})
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
        if ref.get("dwg"):
            d, w = P.get("drawing") or {}, ref["dwg"]
            chk(f"drawing list ({' + '.join(w['locs'])}, MDR approved): packages", d.get("n") == w["packages"] and d.get("printPackages") == w["packages"]
                and d.get("compactPackages") == w["packages"], (d.get("n"), d.get("printPackages"), d.get("compactPackages"), w["packages"]))
            chk("drawing list: print lists every material line", d.get("printLines") == w["lines"], (d.get("printLines"), w["lines"]))
            chk("drawing list: Excel has every line and the same drawing numbers as the ETL", d.get("xlsxRows") == w["lines"]
                and d.get("xlsxDrawings") == w["drawings"] and d.get("xlsxPackages") == w["packages"],
                (d.get("xlsxRows"), w["lines"], len(d.get("xlsxDrawings") or []), len(w["drawings"]), d.get("xlsx")))
            chk("drawing list buttons: print list · print compact · Excel", d.get("buttons") == ["Print list", "Print compact", "Excel"], d.get("buttons"))
        fr, F = ref.get("fnd"), P.get("fnd") or {}
        if fr:
            src = fr["source"]
            chk(f"foundations ({src}): register parsed — axis column B, status column R, duplicates, non-axis values",
                F.get("n") == fr["n"] and F.get("keys") == fr["keys"] and F.get("dup") == fr["dup"] and F.get("bad") == fr["bad"]
                and str(F.get("axisCol", "")).startswith("B ") and str(F.get("statusCol", "")).startswith("R "),
                {k: (F.get(k), fr.get(k)) for k in ("n", "keys", "dup", "bad")} | {"cols": (F.get("axisCol"), F.get("statusCol"))})
            rl = F.get("rel") or {}
            chk("foundations: relation rules = Python mirror — register typo fixed by Segment ID, 1-character typo links, segment-level lines",
                rl.get("fixes") == fr["fixes"] and rl.get("near") == fr["near"] and rl.get("segN") == fr["segN"] and rl.get("segU") == fr["segU"]
                and rl.get("segLines") == fr["segLines"] and (src.startswith("real") or (len(fr["fixes"]) > 0 and len(fr["near"]) > 0)),
                {k: (rl.get(k), fr.get(k)) for k in ("fixes", "near", "segN", "segU", "segLines")})
            chk("foundations: drawing numbers linked to axes = Python mirror (matched / axis-type / unmatched per prefix)",
                F.get("matched") == fr["matched"] and F.get("axisLike") == fr["axisLike"] and F.get("unm") == fr["unm"],
                (F.get("matched"), fr["matched"], F.get("axisLike"), fr["axisLike"], F.get("unm"), fr["unm"]))
            pa = F.get("perAxis") or []
            diff = [(x, y) for x, y in zip(pa, fr["perAxis"]) if x != y]
            chk("foundations: lines, packages and material position of every axis = Python mirror",
                len(pa) == len(fr["perAxis"]) and not diff and F.get("mat") == fr["mat"], (len(pa), len(fr["perAxis"]), diff[:3], F.get("mat"), fr["mat"]))
            num = lambda v: 0 if v in ("·", "", None) else int(str(v).replace(",", ""))
            mx = {r[0]: [num(v) for v in r[1:]] for r in F.get("mxRows") or []}
            chk("foundations: status × material matrix on screen = Python mirror (+ total row)",
                mx == fr["matrix"] and [num(v) for v in (F.get("mxTotal") or [])[1:]] == [sum(v[i] for v in fr["matrix"].values()) for i in range(5)],
                (mx, fr["matrix"]))
            mp = F.get("map") or {}
            chk("foundations: default view = material on site → foundation; per laydown: axes, ready, lines, segment material = Python mirror",
                F.get("view0") == "site" and mp.get("gs") == fr["map"]["gs"] and F.get("siteRows") == fr["mapRows"]["a"] and F.get("siteSeg") == fr["mapRows"]["sg"],
                (F.get("view0"), F.get("siteRows"), F.get("siteSeg"), fr["mapRows"], [g["name"] for g in mp.get("gs") or []], [g["name"] for g in fr["map"]["gs"]]))
            chk("foundations: foundation ready → material not (fully) on site = Python mirror (screen)",
                mp.get("ready") == fr["map"]["ready"] and F.get("readyRows") == len(fr["map"]["ready"]), (F.get("readyRows"), len(fr["map"]["ready"])))
            md = F.get("mapDoc") or {}
            chk("foundations: Print mapping — section 1 axis + segment rows, section 2 ready rows",
                [md.get("a"), md.get("sg"), md.get("r")] == [fr["mapRows"]["a"], fr["mapRows"]["sg"], fr["mapRows"]["r"]] and md.get("sections") == 3, (md, fr["mapRows"]))
            xm = (F.get("xlMap") or {})
            chk("foundations: Excel mapping — 3 sheets with one row per laydown · axis/segment · package, ready rows, relation checks",
                list(xm.values()) == [fr["xl"]["s1"], fr["xl"]["s2"], fr["xl"]["s3"]], (xm, fr["xl"]))
            chk("foundations: KPI — axes with material · erection front · material waiting · foundation waiting",
                [num(v) for v in F.get("kpi") or []] == fr["kpi"] and F.get("kpiSub", "").startswith(f"of {fr['n']:,} foundations · {fr['matched']:,} lines · {fr['pkgsWithM']:,} pkgs"),
                (F.get("kpi"), fr["kpi"], F.get("kpiSub")))
            chk("foundations: linear view = one square per foundation", F.get("stripCells") == fr["n"], (F.get("stripCells"), fr["n"]))
            chk("foundations: default list = axes with material; All + Show all = every foundation; print rows",
                F.get("listWith") == min(300, fr["withM"]) and F.get("listAll") == min(300, fr["n"]) and F.get("listAllShown") == fr["n"] and F.get("docRows") == fr["n"],
                (F.get("listWith"), fr["withM"], F.get("listAll"), F.get("listAllShown"), F.get("docRows"), fr["n"]))
            fxl = F.get("xlsx") or {}
            chk("foundations: Excel = one row per foundation, material lines per axis and statuses = Python mirror",
                fxl.get("rows") == fr["n"] and fxl.get("lines") == fr["linesSum"] and fxl.get("head") == ["Axis ID", "Foundation status", "Material lines"]
                and fxl.get("status") == {k: v[4] for k, v in fr["matrix"].items()}, (fxl, fr["n"], fr["linesSum"]))
            cl = F.get("cell") or {}
            chk("foundations: a matrix cell opens exactly its axes", cl.get("n", 0) > 0 and cl.get("rows") == min(300, cl.get("n", -1)), cl)
            ax = F.get("axis") or {}
            chk("foundations: axis detail — 4 gates and every material line of the axis",
                ax.get("title") == fr["sample"]["raw"] and ax.get("gates") == 4 and ax.get("lines") == fr["sample"]["lines"], (ax, fr["sample"]))
            chk("foundations: a material line opens its package (page 3)", (F.get("lineOpens") or {}).get("page") == 3 and (F.get("lineOpens") or {}).get("pkg"), F.get("lineOpens"))
            dx = (P.get("drawing") or {}).get("xlsxFoundation")
            if dx is not None:
                chk("drawing list: foundation axis + status of every line = Python mirror",
                    dx["head"] == ["Axis (foundation)", "Foundation status", "Foundation STA"] and dx["bad"] == 0 and "Foundation · status" in (P.get("drawing") or {}).get("heads", []), dx)
            lf = R.get("liveF") or {}
            if fr.get("live"):
                chk("live foundation sheet (Publish to web CSV): changed status follows the sheet",
                    fr["liveRows"] == 1 and lf.get("kind") == "live" and lf.get("st") == fr["live"]["to"] and lf.get("ready") is True and lf.get("n") == fr["n"], (lf, fr["live"]))
        ph = R["phone"]
        chk("phone: no horizontal scrolling", ph["scrollWidth"] <= ph["innerWidth"] and ph["frame"][0] <= ph["frame"][1], ph)
        if fr:
            p5 = ph.get("p5") or {"outer": [1, 0], "frame": [1, 0]}
            chk("phone: foundations page without horizontal scrolling", p5["outer"][0] <= p5["outer"][1] and p5["frame"][0] <= p5["frame"][1]
                and ph.get("p5rows", 0) > 0, (p5, ph.get("p5rows")))
    chk("no JavaScript errors", not R.get("errors"), R.get("errors"))
    w = max(len(c[0]) for c in checks)
    for name, ok, got in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {name.ljust(w)}  {got if not ok or isinstance(got, str) else ''}".rstrip())
    bad = [c for c in checks if not c[1]]
    print(f"\n{len(checks) - len(bad)} / {len(checks)} checks pass")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
