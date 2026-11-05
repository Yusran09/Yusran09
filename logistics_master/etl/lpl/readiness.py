"""
Logistics Readiness engine.

For every Summary package it evaluates four gates and derives a readiness status, a
weighted Readiness Index (0-100) and the next action:

    PL    Packing List Verified    linked Detail block(s) and no open blocking (identity) issue
    MDR   MDR Approved             credit by MDR state (APV / not required = 1, RES = 0.5, else 0)
    SITE  Arrived on Site          inspection record, site 'onsite' tag or a location remark
    INSP  Received & Inspected     RFS number AND inspection date (RFS only = partial credit)

Rules (weights, credits, patterns, blocking issue types, status order) come from
config/readiness_rules.json, so the business can tune them without code changes.
The result is stored in PACKAGE_READINESS and feeds the web app, Excel and SQL views.
Nothing here changes a source value.
"""

import datetime as dt
import json
import re
from collections import Counter, defaultdict

from .normalize import clean_text, find_dates

SEV_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}


def load_rules(path):
    rules = json.loads(path.read_text(encoding="utf-8"))
    w = sum(g["weight"] for g in rules["gates"])
    if abs(w - 100) > 1e-9:
        raise SystemExit(f"readiness_rules.json: gate weights must sum to 100 (got {w})")
    return rules


def _match(text, patterns):
    t = (text or "").lower()
    return next((p for p in patterns if p in t), None)


def location_group(text, patterns):
    """Site location named in a Remark / site tag: the location keyword plus its number or code.

    'Laydown 5' -> 'Laydown 5', 'Askara' -> 'Askara', 'Mechanical part at Camp HHI' -> 'Camp HHI'.
    Same keyword order as _match (config 'location_patterns'); None when no keyword is present.
    """
    t = text or ""
    low = t.lower()
    for p in patterns:
        i = low.find(p)
        if i < 0:
            continue
        m = re.match(r"[\s\-:#.]*(\d+[A-Za-z]?|[A-Z0-9]{1,4})(?![A-Za-z0-9])", t[i + len(p):])
        return p[:1].upper() + p[1:] + (" " + m.group(1) if m else "")
    return None


def evaluate(ctx, rules, today=None):
    today = today or dt.date.today()
    W = {g["id"]: g["weight"] for g in rules["gates"]}
    status_ref = {s["code"]: s for s in rules["statuses"]}
    blocking_types = set(rules["blocking_issue_types"])

    linked = Counter(b["package_id"] for b in ctx["blocks"] if b.get("package_id"))
    split = Counter(b["package_id"] for b in ctx["blocks"] if b.get("package_id") and b.get("is_split_child"))
    block_to_pkg = {b["detail_package_id"]: b.get("package_id") for b in ctx["blocks"]}
    open_issues = defaultdict(list)
    for i in ctx["issues"]:
        if i["resolution_status"] != "OPEN":
            continue
        pid = i.get("package_id") or block_to_pkg.get(i.get("detail_package_id"))
        if pid:
            open_issues[pid].append(i)
    # annotations on the same Summary row (site tags such as 'onsite', 'Mechanical part at Camp HHI')
    tags = defaultdict(list)
    for a in ctx["annotations"]:
        if a.get("context") == "PACKAGE_ROW_TAG" and a.get("row_package_id"):
            tags[a["row_package_id"]].append(clean_text(a["value"]) or "")

    rows = []
    for p in ctx["packages"]:
        pid = p["package_id"]
        iss = open_issues.get(pid, [])
        blocking = [i for i in iss if i["issue_type"] in blocking_types]
        sev = min((SEV_RANK[i["severity"]] for i in iss if i["severity"] != "INFO"), default=None)
        max_sev = {v: k for k, v in SEV_RANK.items()}.get(sev)

        # ---- gate PL
        pl_ok = 1 if linked.get(pid, 0) > 0 and not blocking else 0

        # ---- gate MDR
        nr = _match(p.get("remark"), rules["mdr_not_required_patterns"]) or \
            _match(p.get("mdr_number"), rules["mdr_not_required_patterns"])
        mdr_state = "NOT_REQUIRED" if nr else (p.get("mdr_status_code") or "BLANK")
        mdr_credit = float(rules["mdr_credit"].get(mdr_state, 0.0))

        # ---- gates SITE / INSP
        rfs = bool(p.get("rfs_material_receiving"))
        insp_text = p.get("inspection_date_original")
        dates = sorted({d for d in (find_dates(insp_text) if insp_text else []) if d})
        if p.get("inspection_date"):
            dates = sorted(set(dates) | {p["inspection_date"]})
        inspected = 1 if (rfs and (dates or insp_text)) else 0
        insp_credit = 1.0 if inspected else (rules["inspection_rfs_only_credit"] if rfs else 0.0)
        plausible = [d for d in dates if d <= today.isoformat()]
        # receiving date: the inspection date; for cells with several dates the most recent plausible one
        receiving_date = (plausible[-1] if plausible else None) if inspected else None

        tag_txt = [t for t in tags.get(pid, [])]
        onsite_tag = next((t for t in tag_txt if _match(t, rules["onsite_tag_patterns"])), None)
        loc_remark = p.get("remark") if _match(p.get("remark"), rules["location_patterns"]) else None
        loc_tag = next((t for t in tag_txt if _match(t, rules["location_patterns"])), None)
        location = loc_remark or loc_tag or ("On site (location not stated)" if (onsite_tag or inspected) else None)
        # location group for the laydown summary: Remark column (U in B4-P5 / B5-P3, T elsewhere) first, then site tags
        location_grp = location_group(loc_remark or loc_tag, rules["location_patterns"]) or \
            ("On-site (no laydown)" if (onsite_tag or inspected) else None)
        if inspected:
            evidence = "INSPECTION_RECORD"
        elif onsite_tag:
            evidence = "SITE_TAG"
        elif loc_remark or loc_tag:
            evidence = "LOCATION_REMARK"
        else:
            evidence = None
        on_site = 1 if evidence else 0

        # ---- score & status
        g_pl = W["PL"] * pl_ok
        g_mdr = W["MDR"] * mdr_credit
        g_site = W["SITE"] * on_site
        g_insp = W["INSP"] * insp_credit
        score = round(g_pl + g_mdr + g_site + g_insp, 2)
        if not pl_ok:
            st = "BLOCKED"
        elif inspected and mdr_credit >= 1:
            st = "READY_FOR_CONSTRUCTION"
        elif inspected:
            st = "INSPECTED_MDR_PENDING"
        elif on_site:
            st = "ON_SITE_AWAITING_INSPECTION"
        else:
            st = "AWAITING_RECEIVING"
        mdr_label = rules["mdr_state_labels"].get(mdr_state, mdr_state)
        action = status_ref[st]["action"]
        if st in ("INSPECTED_MDR_PENDING", "AWAITING_RECEIVING", "ON_SITE_AWAITING_INSPECTION") and mdr_credit < 1:
            action += f" MDR: {mdr_label}" + (f" ({p['mdr_number']})" if p.get("mdr_number") and not nr else "") + "."
        if st == "BLOCKED":
            action += " " + "; ".join(sorted({i["issue_type"] for i in blocking})) if blocking else " No linked detail block."

        rows.append(dict(
            package_id=pid, batch_id=p["batch_id"], category=p["category"],
            package_number_original=p["package_number_original"],
            system_group=(p.get("description_en") or "UNSPECIFIED").upper(),
            equipment_number=p.get("equipment_number"), package_group=p.get("package_group"),
            gross_weight_kg=p.get("gross_weight_kg"), volume_m3=p.get("volume_m3"),
            pl_verified=pl_ok, linked_detail_packages=linked.get(pid, 0), split_sub_packages=split.get(pid, 0),
            mdr_state=mdr_state, mdr_state_label=mdr_label, mdr_credit=mdr_credit,
            rfs_raised=1 if rfs else 0, inspected=inspected, on_site=on_site, on_site_evidence=evidence,
            site_location=location, site_location_group=location_grp, receiving_date=receiving_date,
            inspection_dates=", ".join(dates) or None,
            open_issue_count=len([i for i in iss if i["severity"] != "INFO"]), blocking_issue_count=len(blocking),
            max_open_severity=max_sev,
            gate_pl_score=g_pl, gate_mdr_score=g_mdr, gate_site_score=g_site, gate_inspection_score=g_insp,
            readiness_score=score, readiness_status=st, next_action=action.strip(),
            rules_version=rules["version"]))
    return rows


def reference_rows(rules):
    return [dict(status_code=s["code"], label=s["label"], short_label=s["short"], color=s["color"],
                 sort_order=s["sort"], rule=s["rule"], action=s["action"]) for s in rules["statuses"]]


def checks(ctx, rows):
    """Readiness consistency checks appended to DATA_QUALITY_CHECKS."""
    out = []

    def add(cid, name, expected, actual, status=None, note=None):
        out.append(dict(check_id=cid, check_group="READINESS", check_name=name, scope="ALL",
                        expected_value=str(expected), actual_value=str(actual),
                        status=status or ("PASS" if str(expected) == str(actual) else "FAIL"), note=note))

    ids = Counter(r["package_id"] for r in rows)
    add("C70", "Every Summary package has exactly one readiness row", len(ctx["packages"]),
        sum(1 for v in ids.values() if v == 1))
    add("C71", "Readiness scores within 0..100", 0, sum(1 for r in rows if not 0 <= r["readiness_score"] <= 100))
    add("C72", "READY packages are PL-verified, MDR-approved and inspected", 0,
        sum(1 for r in rows if r["readiness_status"] == "READY_FOR_CONSTRUCTION"
            and not (r["pl_verified"] and r["mdr_credit"] >= 1 and r["inspected"])))
    add("C73", "Inspected packages have a receiving date or a dated inspection text", 0,
        sum(1 for r in rows if r["inspected"] and not (r["receiving_date"] or r["inspection_dates"])))
    dist = Counter(r["readiness_status"] for r in rows)
    for k, v in sorted(dist.items()):
        add(f"C74-{k}", f"Packages with readiness status {k}", None, v, "INFO")
    return out
