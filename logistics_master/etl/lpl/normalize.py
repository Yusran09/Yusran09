"""
Cleaning / normalisation helpers.

Rules of engagement (non-destructive):
  * Original identifiers are never modified; normalised values live in separate
    *_normalized fields and are used only for matching/filtering.
  * Normalisation of package numbers is deliberately conservative: it removes
    nothing that could carry identity (slashes, hyphens, leading zeros, suffixes).
  * Every rule that changes a value increments a counter in ChangeLog so the
    CHANGE_LOG table reports exactly what was done and how often.
"""

import datetime as _dt
import hashlib
import re
import unicodedata
from collections import OrderedDict

# --------------------------------------------------------------------------- change log


class ChangeLog:
    """Counts how many values each transformation rule actually changed."""

    def __init__(self):
        self.rules = OrderedDict()

    def register(self, rule_id, table, field, description, identity_affecting=0):
        if rule_id not in self.rules:
            self.rules[rule_id] = dict(change_id=rule_id, table_name=table, field_name=field,
                                       rule_description=description,
                                       identity_affecting=identity_affecting,
                                       records_affected=0, example_original=None, example_result=None)

    def hit(self, rule_id, original, result):
        r = self.rules[rule_id]
        r["records_affected"] += 1
        if r["example_original"] is None:
            r["example_original"] = _short(original)
            r["example_result"] = _short(result)

    def rows(self):
        return list(self.rules.values())


def _short(v, n=120):
    s = repr(v) if not isinstance(v, str) else v
    return s if len(s) <= n else s[: n - 3] + "..."


# --------------------------------------------------------------------------- text

_WS_CHARS = " 　   ​﻿"
_DASHES = "‐‑‒–—―−－"
_MEANINGFUL = re.compile(r"[0-9A-Za-z一-鿿Ͱ-ϿÀ-ɏ]")
PLACEHOLDERS = {"XX", "X", "-", "--", "/", "N/A", "NA", "NIL", "NONE", "\\"}


def raw_text(v):
    """Value as text exactly (no cleaning) – used for *_original fields."""
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    if isinstance(v, (_dt.datetime, _dt.date)):
        return v.isoformat()
    return str(v)


def clean_text(v, keep_newlines=False):
    """Trim, unify exotic spaces, collapse runs of whitespace. None for blank."""
    if v is None:
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        s = raw_text(v)
    elif isinstance(v, (_dt.datetime, _dt.date)):
        s = v.isoformat()
    else:
        s = str(v)
    for ch in _WS_CHARS:
        s = s.replace(ch, " ")
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    if keep_newlines:
        s = "\n".join(re.sub(r"[ \t]+", " ", ln).strip() for ln in s.split("\n"))
        s = re.sub(r"\n+", "\n", s).strip()
    else:
        s = re.sub(r"\s+", " ", s).strip()
    return s if s else None


def is_meaningful(v):
    """True if the value carries information (letters/digits/CJK), excluding placeholders."""
    s = clean_text(v)
    if s is None:
        return False
    if s.upper() in PLACEHOLDERS:
        return False
    return bool(_MEANINGFUL.search(s))


def label(v):
    """Header label key: NFKC, lower, single spaces."""
    s = clean_text(v)
    if s is None:
        return ""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s)).lower().strip()


# --------------------------------------------------------------------------- numbers & dates


def to_number(v):
    """Return (number|None, ok). ok=False means a non-blank value could not be parsed."""
    if v is None:
        return None, True
    if isinstance(v, bool):
        return None, False
    if isinstance(v, (int, float)):
        f = float(v)
        return (round(f, 6) if not f.is_integer() else f), True
    s = clean_text(v)
    if s is None or s in {"-", "--", "/"}:
        return None, True
    s2 = unicodedata.normalize("NFKC", s).replace(",", "").replace(" ", "")
    try:
        f = float(s2)
        return (round(f, 6) if not f.is_integer() else f), True
    except ValueError:
        return None, False


def to_int(v):
    n, ok = to_number(v)
    if n is None:
        return None
    return int(n) if float(n).is_integer() else None


_DATE_FORMATS = ["%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d", "%d/%m/%Y", "%d.%m.%Y", "%d-%m-%Y", "%Y%m%d",
                 "%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y"]


def _date_token(s):
    s = re.sub(r"\bSept\b", "Sep", s.strip(), flags=re.I)
    s = re.sub(r"[,]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    for fmt in _DATE_FORMATS:
        try:
            return _dt.datetime.strptime(s if " " in fmt else s.split(" ")[0], fmt).date().isoformat()
        except ValueError:
            pass
    return None


def find_dates(v):
    """All dates found in a free-text cell (e.g. '15 Sep 2026\\n3 Nov 2026'). Returns list of ISO dates."""
    s = clean_text(v, keep_newlines=True)
    if not s:
        return []
    parts = [x for x in re.split(r"[\n;&]+|\band\b", s) if x.strip()]
    out = [_date_token(x) for x in parts]
    return [d for d in out if d]


def to_date(v):
    """Return (iso_date|None, ok)."""
    if v is None:
        return None, True
    if isinstance(v, _dt.datetime):
        return v.date().isoformat(), True
    if isinstance(v, _dt.date):
        return v.isoformat(), True
    if isinstance(v, (int, float)):
        # Excel serial date
        if 20000 < float(v) < 80000:
            return (_dt.date(1899, 12, 30) + _dt.timedelta(days=int(v))).isoformat(), True
        return None, False
    s = clean_text(v)
    if s is None or s in {"-", "--"}:
        return None, True
    d = _date_token(s)
    return (d, True) if d else (None, False)


# --------------------------------------------------------------------------- package numbers

_PKG_PATTERNS = [
    # P5-HHI-8321-JLJX-4-34(1)/34 , P5-HHI-8321-JLJX-5-46.1/53 , P3-HHI-8321-HDCZ-KA-5-2/8
    ("STANDARD", re.compile(
        r"^(?P<cat>P\d+)-(?P<vendor>[A-Z]+)-(?P<proj>\d+)-(?P<group>[A-Z]+(?:-[A-Z]+)*)-(?P<bcode>\d+)-"
        r"(?P<seq>\d+)(?P<sub>\(\d+\)|\.\d+)?/(?P<total>\d+)$")),
    # P3-HHI-8321-SDYHC-4-1-12  (hyphen used instead of slash before the total)
    ("HYPHEN_TOTAL", re.compile(
        r"^(?P<cat>P\d+)-(?P<vendor>[A-Z]+)-(?P<proj>\d+)-(?P<group>[A-Z]+(?:-[A-Z]+)*)-(?P<bcode>\d+)-"
        r"(?P<seq>\d+)-(?P<total>\d+)$")),
    # P3-HHI-8321-HDCZ-O-1/1   (no batch digit)
    ("NO_BATCH_CODE", re.compile(
        r"^(?P<cat>P\d+)-(?P<vendor>[A-Z]+)-(?P<proj>\d+)-(?P<group>[A-Z]+(?:-[A-Z]+)*)-"
        r"(?P<seq>\d+)(?P<sub>\(\d+\)|\.\d+)?/(?P<total>\d+)$")),
    # P3-HHI-8321-HDCZ-P-1     (no series total)
    ("NO_TOTAL", re.compile(
        r"^(?P<cat>P\d+)-(?P<vendor>[A-Z]+)-(?P<proj>\d+)-(?P<group>[A-Z]+(?:-[A-Z]+)*)-(?P<seq>\d+)$")),
]

PKG_LIKE = re.compile(r"P\d+-[A-Z]+-\d+-[A-Z0-9().\-]+/\d+", re.I)


def norm_package_number(v, changelog=None):
    """Matching key. NFKC (full-width -> ASCII), upper-case, all whitespace removed,
    dash variants -> '-'.  Nothing else is touched."""
    if v is None:
        return None
    s = raw_text(v)
    out = unicodedata.normalize("NFKC", s)
    for d in _DASHES:
        out = out.replace(d, "-")
    out = re.sub(r"\s+", "", out).upper()
    if changelog is not None and out != s:
        if unicodedata.normalize("NFKC", s) != s:
            changelog.hit("N-PKG-01", s, out)
        elif re.sub(r"\s+", "", s) != s:
            changelog.hit("N-PKG-02", s, out)
        else:
            changelog.hit("N-PKG-03", s, out)
    return out or None


def parse_package_number(norm):
    """Parse a normalised package number. Returns dict (format=UNPARSED if no rule fits)."""
    if not norm:
        return dict(format="UNPARSED")
    for fmt, rx in _PKG_PATTERNS:
        m = rx.match(norm)
        if m:
            d = m.groupdict()
            sub = d.get("sub")
            base = norm
            if sub:
                base = norm.replace(f"{d['seq']}{sub}/", f"{d['seq']}/", 1)
            return dict(format=fmt, cat=d.get("cat"), vendor=d.get("vendor"), proj=d.get("proj"),
                        group=d.get("group"), bcode=d.get("bcode"),
                        seq=int(d["seq"]) if d.get("seq") else None,
                        total=int(d["total"]) if d.get("total") else None,
                        sub=sub, base=base)
    return dict(format="UNPARSED")


def series_key(p):
    """Key identifying a numbering series (group + batch code + declared total)."""
    if p.get("format") in ("STANDARD", "HYPHEN_TOTAL", "NO_BATCH_CODE"):
        return f"{p['cat']}-{p['vendor']}-{p['proj']}-{p['group']}-{p.get('bcode') or ''}-/{p['total']}"
    return None


# --------------------------------------------------------------------------- domain values

_PKG_TYPE_RULES = [
    (re.compile(r"U[\s-]*FRAME|U型|U-SHAPED", re.I), "U-FRAME"),
    (re.compile(r"IRON\s*CASE|铁箱", re.I), "IRON CASE"),
    (re.compile(r"IRON\s*FRAME|铁架", re.I), "IRON FRAME"),
    (re.compile(r"STEEL\s*BOX|钢箱", re.I), "STEEL BOX"),
    (re.compile(r"PLYWOOD", re.I), "PLYWOOD CASE"),
    (re.compile(r"WOOD|木箱", re.I), "WOODEN CASE"),
    (re.compile(r"PALLET|托盘", re.I), "PALLET"),
    (re.compile(r"NUDE|裸装", re.I), "NUDE"),
    (re.compile(r"\bBAG\b|袋", re.I), "BAG"),
    (re.compile(r"CONTAINER|集装箱", re.I), "CONTAINER"),
    (re.compile(r"FRAME|框架", re.I), "FRAME"),
    (re.compile(r"BOX|箱", re.I), "BOX"),
]


def norm_package_type(v):
    s = clean_text(v)
    if s is None:
        return None
    for rx, val in _PKG_TYPE_RULES:
        if rx.search(s):
            return val
    return s.upper()


_UNIT_MAP = {
    "PCS": "PCS", "PC": "PCS", "PIECE": "PCS", "PIECES": "PCS", "个": "PCS", "件": "PCS", "根": "PCS",
    "块": "PCS", "个PCS": "PCS", "件PCS": "PCS", "PCS.": "PCS", "EA": "PCS", "张": "PCS", "支": "PCS",
    "SET": "SET", "SETS": "SET", "套": "SET", "套SET": "SET",
    "M": "M", "METER": "M", "METERS": "M", "米": "M", "MTR": "M",
    "KG": "KG", "KGS": "KG", "千克": "KG",
    "T": "TNE", "TON": "TNE", "TONS": "TNE", "TNE": "TNE", "吨": "TNE",
    "GROUP": "GROUP", "GROUPS": "GROUP", "组": "GROUP",
    "UNIT": "UNIT", "UNITS": "UNIT", "台": "UNIT",
    "PAIR": "PAIR", "对": "PAIR",
    "ROLL": "ROLL", "卷": "ROLL",
    "BKT": "BKT", "桶": "BKT",
    "BOX": "BOX", "盒": "BOX",
    "M2": "M2", "㎡": "M2", "M3": "M3",
}


def norm_unit(v):
    s = clean_text(v)
    if s is None or not is_meaningful(s):
        return None
    k = unicodedata.normalize("NFKC", s).upper().replace(" ", "")
    return _UNIT_MAP.get(k, k)


_MDR_CODE = re.compile(r"\(([A-Z]{2,5})\)")


def norm_mdr_status(status, mdr_number):
    s = clean_text(status)
    n = clean_text(mdr_number)
    if s:
        m = _MDR_CODE.search(unicodedata.normalize("NFKC", s).upper())
        if m:
            return m.group(1)
    if n and re.search(r"no\s*mdr", n, re.I):
        return "NO_MDR"
    if s and is_meaningful(s):
        return re.sub(r"[^A-Z0-9]+", "_", s.upper()).strip("_")
    return "BLANK"


def split_mdr(v):
    s = clean_text(v, keep_newlines=True)
    if not s:
        return []
    parts = [p.strip() for p in re.split(r"[\n;,，]+", s) if p.strip()]
    return [p for p in parts if re.search(r"MDR", p, re.I)]


def equipment_tokens(v):
    s = clean_text(v)
    if not s:
        return set()
    s = unicodedata.normalize("NFKC", s).upper()
    return {t for t in re.split(r"[,;/\s]+", s) if t and is_meaningful(t)}


# --------------------------------------------------------------------------- ids


def h(*parts, n=10):
    raw = "\x1f".join("" if p is None else str(p) for p in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:n].upper()


def edit_distance(a, b):
    a, b = a or "", b or ""
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]
