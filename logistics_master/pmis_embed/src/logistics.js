
  /* ================= LOGISTICS DASHBOARD : final packing list → site readiness ================= */
  ICONS.truck = 'M2.5 6h11v9.5h-11zM13.5 9h4.3l3.2 3.6v2.9h-7.5M7.6 17.6a1.9 1.9 0 1 1-3.8 0a1.9 1.9 0 1 1 3.8 0zM19.1 17.6a1.9 1.9 0 1 1-3.8 0a1.9 1.9 0 1 1 3.8 0z';
  ICONS.doc = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4';
  ICONS.pin = 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0';
  ICONS.search = 'M21 21l-4.34-4.34M3 11a8 8 0 1 0 16 0a8 8 0 1 0 -16 0';
  ICONS.ship = 'M12 10.2V14M12 2v3M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6M19.4 20A11.6 11.6 0 0 0 21 14l-8.2-3.6a2 2 0 0 0-1.6 0L3 14a11.6 11.6 0 0 0 2.8 7.8M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1';
  ICONS.split = 'M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.2-2.9L3 3M15 9l6-6';
  ICONS.inv = 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11';
  ICONS.weight = 'M12 5a3 3 0 1 0 0 0.01M6.5 8h11l2.5 12H4zM12 8V5';
  ICONS.ramp = 'M3.5 19.5h17M5.5 16.5l4-4 3 2.5 6-7M18.5 8v4M18.5 8h-4';
  ICONS.print = 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6M7 14h10a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1z';
  ICONS.dl = 'M12 15V3M7 10l5 5 5-5M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4';
  ICONS.found = 'M3 20h18M5 20v-4h14v4M8 16v-5h8v5M10 11V5h4v6';
  BADGE_ICON.unshift([/^ready/i, 'check'], [/^mdr pending/i, 'doc'], [/^on site/i, 'pin'], [/^awaiting rfs/i, 'pin'], [/^in transit/i, 'ship'], [/^not on site/i, 'ship'], [/^awaiting/i, 'ship'], [/^blocked/i, 'alert'],
    [/^high$/i, 'alert'], [/^medium$/i, 'alertc'], [/^(low|info)$/i, 'minus'], [/^flag\b/i, 'alertc'], [/^pass\b/i, 'check'], [/^(split|sub-package)/i, 'split'],
    [/^(exact|normalized|confirmed)/i, 'check'], [/^(candidate|manual|unmatched)/i, 'alertc']);
  hydrateIcons();

  function nf(v) { return v == null || isNaN(v) ? '—' : num(Math.round(v), 0); }
  function nf1(v) { return v == null || isNaN(v) ? '—' : num(v, 1); }
  function pc(v, d) { return v == null || isNaN(v) ? '—' : num(v * 100, d == null ? 0 : d) + '%'; }
  function pbar(r, c) {
    var b = el('span', 'pbar'), i = el('i'); b.appendChild(i);
    var v = r == null || isNaN(r) ? 0 : Math.max(0, Math.min(1, r));
    i.style.width = (v * 100).toFixed(1) + '%';
    i.style.background = c || (r == null ? 'var(--muted)' : v >= 0.75 ? 'var(--good)' : v >= 0.4 ? 'var(--warn)' : 'var(--crit)');
    return b;
  }
  function T(s) { return s == null ? '' : String(s).trim(); }
  function U(s) { return T(s).normalize ? T(s).normalize('NFKC').toUpperCase() : T(s).toUpperCase(); }

  /* ---------- 1. pengaturan ---------- */
  var cfg = { judul: 'Logistics Readiness', sheetid: '', sumber: '', tabpackage: 'Packages', tabdetail: 'Detail', tabitem: 'Items', tabissue: 'Issues',
    datadate: '', bobotgate: '15 / 35 / 15 / 35', kreditres: '0.5', mdrtidakperlu: 'mdr not required, mdr is not required, no mdr required',
    lokasi: 'laydown, askara, camp, warehouse, yard, store', tagsite: 'onsite, on site, on-site, arrived', batasmdr: '7 / 14',
    basis: 'package', tema: 'terang', kepekatan: '62', autorefresh: '120', cekdata: 'tampil',
    pondasisumber: '', pondasisheetid: '', pondasitab: '', pondasikolomaxis: 'B', pondasikolomstatus: 'R', pondasisiap: 'concreting, complete, completed, done, finish' };
  $('lg-config').textContent.split(/\r?\n/).forEach(function (line) {
    var m = line.trim().match(/^(judul|sheet\s*id|sumber|tab\s*package|tab\s*detail|tab\s*item|tab\s*issue|data\s*date|bobot\s*gate|kredit\s*res|mdr\s*tidak\s*perlu|lokasi|tag\s*site|batas\s*mdr|basis|tema|kepekatan|auto\s*refresh|cek\s*data|pondasi\s*sumber|pondasi\s*sheet\s*id|pondasi\s*tab|pondasi\s*kolom\s*axis|pondasi\s*kolom\s*status|pondasi\s*siap)\s*:\s*(.*)$/i);
    if (m) cfg[m[1].toLowerCase().replace(/[\s-]+/g, '')] = m[2].trim();
  });
  var tint = parseFloat(String(cfg.kepekatan).replace(',', '.'));
  if (!isNaN(tint)) root.style.setProperty('--tint', Math.max(.15, Math.min(.95, tint > 1 ? tint / 100 : tint)).toFixed(2));
  function applyTheme() {
    var t = (cfg.tema || 'terang').toLowerCase();
    if (t === 'auto') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', /^(terang|light)/.test(t) ? 'light' : 'dark');
  }
  applyTheme();
  var NO = /^(sembunyi|hide|tidak|no|off)/i, showChecks = !NO.test(cfg.cekdata || '');
  function nums(s, n, dflt) {
    var a = String(s || '').split(/[^0-9.,]+/).map(function (x) { return parseFloat(x.replace(',', '.')); }).filter(function (x) { return !isNaN(x); });
    return a.length >= n ? a.slice(0, n) : dflt;
  }
  function words(s) { return String(s || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  var GWv = nums(cfg.bobotgate, 4, [15, 35, 15, 35]), GWs = GWv[0] + GWv[1] + GWv[2] + GWv[3];
  if (!(GWs > 0)) { GWv = [15, 35, 15, 35]; GWs = 100; }
  if (Math.abs(GWs - 100) > 0.01) GWv = GWv.map(function (x) { return x * 100 / GWs; });
  var GW = { PL: GWv[0], MDR: GWv[1], SITE: GWv[2], INSP: GWv[3] };
  var RESC = parseFloat(String(cfg.kreditres).replace(',', '.')); if (isNaN(RESC)) RESC = 0.5;
  var MDR_CREDIT = { APV: 1, NOT_REQUIRED: 1, RES: RESC };
  var P_NR = words(cfg.mdrtidakperlu), P_LOC = words(cfg.lokasi), P_TAG = words(cfg.tagsite), AGEV = nums(cfg.batasmdr, 2, [7, 14]);
  var BLOCKING = { PACKAGE_NUMBER_MISMATCH: 1, SUMMARY_WITHOUT_DETAIL: 1, DETAIL_WITHOUT_SUMMARY: 1, DUPLICATE_PACKAGE_NUMBER: 1, MISSING_PACKAGE_NUMBER: 1 };
  var MDRL = { APV: 'Approved', NOT_REQUIRED: 'Not required', RES: 'Resubmit', NOT_SUBMITTED_YET: 'Not submitted yet', NO_MDR: 'No MDR submitted', BLANK: 'No MDR status' };
  var MDRO = ['APV', 'NOT_REQUIRED', 'RES', 'NOT_SUBMITTED_YET', 'NO_MDR', 'BLANK'];
  var MDRC = { APV: ['var(--good)', 1], NOT_REQUIRED: ['var(--good)', .5], RES: ['var(--warn)', 1], NOT_SUBMITTED_YET: ['var(--crit)', .6], NO_MDR: ['var(--crit)', 1], BLANK: ['var(--muted)', .5] };
  var ST = {
    READY: { n: 'Ready for construction', s: 'Ready', lv: 'good', o: 1, c: 'var(--good)', etl: 'READY_FOR_CONSTRUCTION', act: 'Available for issue to construction.' },
    PEND: { n: 'Inspected – MDR pending', s: 'MDR pending', lv: 'warn', o: 2, c: 'var(--warn)', etl: 'INSPECTED_MDR_PENDING', act: 'Expedite MDR approval with vendor / QA-QC before issue to construction.' },
    SITE: { n: 'On site – awaiting RFS / inspection', s: 'Awaiting RFS', lv: 'warn', o: 3, c: 'var(--plan)', etl: 'ON_SITE_AWAITING_INSPECTION', act: 'Raise RFS and perform receiving inspection.' },
    AWAIT: { n: 'Shipped – in transit, not yet on site', s: 'In transit', lv: '', o: 4, c: 'var(--line-strong)', etl: 'AWAITING_RECEIVING', act: 'Track delivery; prepare MDR so the package is ready on arrival.' },
    BLOCK: { n: 'Blocked – packing list issue', s: 'Blocked', lv: 'crit', o: 5, c: 'var(--crit)', etl: 'BLOCKED', act: 'Resolve the packing-list identity issue (see MAPPING_ISSUES).' }
  };
  var STO = ['READY', 'PEND', 'SITE', 'AWAIT', 'BLOCK'];
  var SEVO = ['HIGH', 'MEDIUM', 'LOW', 'INFO'], SEVLV = { HIGH: 'crit', MEDIUM: 'warn', LOW: '', INFO: '' };
  var SEVC = { HIGH: 'var(--crit)', MEDIUM: 'var(--warn)', LOW: 'var(--plan)', INFO: 'var(--line-strong)' };

  /* ---------- 2. baca data (TSV / CSV dengan baris judul) ---------- */
  function hkey(h) { return String(h || '').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g, ''); }
  function sheet(text, anchor) {
    var rows = Array.isArray(text) ? text : toRows(String(text || ''));
    var meta = {}, hi = -1;
    for (var i = 0; i < Math.min(rows.length, 12); i++) {
      var ks = rows[i].map(hkey);
      if (ks.indexOf(anchor) > -1) { hi = i; break; }
      var m = /^\s*data\s*date\s*[:=]\s*(.+)$/i.exec(rows[i].join(' ').trim()); if (m) meta.dd = m[1].trim();
    }
    if (hi < 0) return { error: 'header row with "' + anchor + '" not found' };
    var H = rows[hi].map(hkey), out = [];
    for (var r = hi + 1; r < rows.length; r++) {
      var row = rows[r]; if (!row || !row.some(function (c) { return T(c) !== ''; })) continue;
      var o = {}; H.forEach(function (k, j) { if (k) o[k] = row[j] == null ? '' : row[j]; }); out.push(o);
    }
    return { rows: out, meta: meta };
  }
  function nv(v) { var t = T(v).replace(/,/g, ''); if (t === '' || t === '-' || t === '—') return null; var x = parseFloat(t); return isNaN(x) ? null : x; }
  /* dates: the formats the Logistics ETL reads (normalize._DATE_FORMATS), nothing more, so both give the same receiving date */
  var MFULL = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function monOf(w) { w = String(w || '').toLowerCase(); for (var i = 0; i < 12; i++) if (w === MFULL[i] || w === MFULL[i].slice(0, 3)) return i; return null; }
  function ymd(y, m, d) { if (!(y > 1900 && m >= 0 && m < 12 && d >= 1 && d <= 31)) return null; var t = Date.UTC(y, m, d), x = new Date(t); return x.getUTCDate() === d ? t : null; }
  function pdate(s) {
    var m = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})/.exec(T(s));                                           /* Google gviz date value */
    if (m) return ymd(+m[1], +m[2], +m[3]);
    var t = T(s).replace(/\bsept\b/gi, 'Sep').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    var f = t.split(' ')[0];
    if ((m = /^(\d{4})([-.\/])(\d{1,2})\2(\d{1,2})$/.exec(f))) return ymd(+m[1], +m[3] - 1, +m[4]);   /* yyyy-mm-dd · yyyy.mm.dd · yyyy/mm/dd */
    if ((m = /^(\d{1,2})([-.\/])(\d{1,2})\2(\d{4})$/.exec(f))) return ymd(+m[4], +m[3] - 1, +m[1]);   /* dd/mm/yyyy · dd.mm.yyyy · dd-mm-yyyy */
    if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(f))) return ymd(+m[1], +m[2] - 1, +m[3]);                /* yyyymmdd */
    if ((m = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(t)) && monOf(m[2]) != null) return ymd(+m[3], monOf(m[2]), +m[1]);   /* 15 Sep 2026 */
    if ((m = /^([A-Za-z]+) (\d{1,2}) (\d{4})$/.exec(t)) && monOf(m[1]) != null) return ymd(+m[3], monOf(m[1]), +m[2]);   /* Sep 15 2026 */
    return null;
  }
  function pdates(s) {
    var out = [];
    T(s).split(/[\n;&]+|\band\b/).forEach(function (x) { if (!x.trim()) return; var d = pdate(x); if (d != null && out.indexOf(d) < 0) out.push(d); });
    return out.sort(function (a, b) { return a - b; });
  }
  /* site location group (same rule as the ETL, readiness.location_group): location keyword + its number / code,
     e.g. 'Laydown 5', 'Askara', 'Camp HHI'. Read from the Summary Remark column (U in B4-P5 / B5-P3, T elsewhere), then site tags (V / W). */
  var NOLOC = 'On-site (no laydown)', OFFSITE = 'Not on site';
  function locGroup(text) {
    var t = String(text || ''), low = t.toLowerCase();
    for (var i = 0; i < P_LOC.length; i++) {
      var k = low.indexOf(P_LOC[i]); if (k < 0) continue;
      var m = /^[\s\-:#.]*(\d+[A-Za-z]?|[A-Z0-9]{1,4})(?![A-Za-z0-9])/.exec(t.slice(k + P_LOC[i].length));
      return P_LOC[i].charAt(0).toUpperCase() + P_LOC[i].slice(1) + (m ? ' ' + m[1] : '');
    }
    return null;
  }
  function hit(text, pats) { var t = String(text || '').toLowerCase(); for (var i = 0; i < pats.length; i++) if (t.indexOf(pats[i]) > -1) return pats[i]; return null; }
  /* same rules as the ETL (normalize.norm_mdr_status / is_meaningful) */
  var PLACE = /^(xx|x|-|--|\/|n\/a|na|nil|none|\\)$/i, MEAN = /[0-9A-Za-z一-鿿Ͱ-ϿÀ-ɏ]/;
  function mdrState(p) {
    if (hit(p.remark, P_NR) || hit(p.mdrNo, P_NR)) return 'NOT_REQUIRED';
    var s = T(p.mdrStatus).replace(/\s+/g, ' '), m = /\(([A-Z]{2,5})\)/.exec(U(s));
    if (m) return m[1];
    if (/no\s*mdr/i.test(p.mdrNo || '')) return 'NO_MDR';
    if (s && !PLACE.test(s) && MEAN.test(s)) return s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return 'BLANK';
  }
  function parsePackages(text) {
    var sh = sheet(text, 'packageno'); if (sh.error) return sh;
    var out = [], seen = {};
    sh.rows.forEach(function (o, i) {
      var no = T(o.packageno); if (!no) return;
      var p = {
        i: i, id: T(o.packageid) || ('ROW-' + (i + 1)), b: U(o.batch), c: U(o.category), sn: nv(o.sn), no: no, grp: T(o.packagegroup), eq: T(o.equipment),
        desc: T(o.description), cn: T(o.descriptioncn), type: T(o.packagetype), L: nv(o.lmm), W: nv(o.wmm), H: nv(o.hmm), vol: nv(o.volumem3),
        nw: nv(o.nwkg), gw: nv(o.gwkg), mdrNo: T(o.mdrno), mdrStatus: T(o.mdrstatus), rfs: T(o.rfsmaterialreceiving), insp: T(o.inspectiondate),
        remark: T(o.remark), note: T(o.sitenote), links: nv(o.detailblocks), split: nv(o.splitsubpackages) || 0, map: T(o.mappingstatus),
        lines: nv(o.materiallines), etlSt: T(o.readinessstatusetl), etlSc: nv(o.readinessscoreetl), src: T(o.source), ddRaw: T(o.datadate)
      };
      if (!p.b && /^P\d/.test(no)) p.b = '';
      p.sys = (p.desc || 'UNSPECIFIED').toUpperCase(); p.t = (p.gw || 0) / 1000;
      p.dup = !!seen[U(no)]; seen[U(no)] = 1;
      out.push(p);
    });
    if (!out.length) return { error: 'no package rows' };
    var ddc = null; out.forEach(function (p) { var d = pdate(p.ddRaw); if (d != null && (ddc == null || d > ddc)) ddc = d; });
    return { list: out, meta: sh.meta, ddCol: ddc };
  }
  function parseBlocks(text) {
    var sh = sheet(text, 'detailid'); if (sh.error) return sh;
    return { list: sh.rows.map(function (o) {
      return { id: T(o.detailid), pid: T(o.packageid), b: U(o.batch), c: U(o.category), no: T(o.packagenodetail) || T(o.packageno), sub: T(o.subpackage),
        parent: T(o.parentdetailid), type: T(o.packagetype), gw: nv(o.gwkg), nw: nv(o.nwkg), vol: nv(o.volumem3), inv: T(o.invoiceno),
        items: nv(o.items), iw: nv(o.itemweightkg), map: T(o.mappingstatus), sp: T(o.splitparent) === '1', src: T(o.source) };
    }).filter(function (b) { return b.id; }) };
  }
  function parseIssues(text) {
    var sh = sheet(text, 'severity'); if (sh.error) return sh;
    return { list: sh.rows.map(function (o) {
      return { sev: U(o.severity), type: U(o.issuetype), sub: T(o.subtype), st: U(o.status) || 'OPEN', b: U(o.batch), c: U(o.category), no: T(o.packageno),
        d: T(o.description), res: T(o.resolution), pid: T(o.packageid), did: T(o.detailid), src: T(o.source) };
    }).filter(function (x) { return x.type; }) };
  }
  function parseItems(text) {
    var sh = sheet(text, 'detailid'); if (sh.error) return sh;
    var by = {};
    sh.rows.forEach(function (o) {
      var id = T(o.detailid); if (!id) return;
      (by[id] = by[id] || []).push({ ln: nv(o.line), sn: T(o.sn), d: T(o.description), cn: T(o.descriptioncn), q: nv(o.qty), u: T(o.unit),
        uw: nv(o.unitwtkg), tw: nv(o.totalwtkg), eq: T(o.equipment), dw: T(o.drawingno), rm: T(o.remark), ty: T(o.type), row: T(o.row), sp: T(o.specification) });
    });
    return { by: by, n: sh.rows.length };
  }

  /* ---------- 3. model: readiness per package (same rules as the Logistics ETL) ---------- */
  var DAY = 864e5;
  /* "Site Note" = same-row tags of the Summary sheet, "V227: onsite; W227: Mechanical part at Camp HHI" (cell refs optional) */
  function tags(note) { return T(note).split(/\s*;\s*(?=[A-Z]{1,3}\d+\s*:)/).map(function (x) { return x.replace(/^[A-Z]{1,3}\d+\s*:\s*/, '').trim(); }).filter(Boolean); }
  function readiness(p, iss, dd) {
    var open = (iss[p.id] || []).filter(function (x) { return x.st === 'OPEN'; });
    var blocking = open.filter(function (x) { return BLOCKING[x.type]; });
    p.openN = open.filter(function (x) { return x.sev !== 'INFO'; }).length; p.blockN = blocking.length;
    p.maxSev = SEVO.filter(function (s) { return s !== 'INFO' && open.some(function (x) { return x.sev === s; }); })[0] || '';
    p.pl = (p.links || 0) > 0 && !blocking.length ? 1 : 0;
    var nr = hit(p.remark, P_NR) || hit(p.mdrNo, P_NR);
    p.mdr = mdrState(p); p.mdrCr = MDR_CREDIT[p.mdr] || 0;
    var rfs = !!p.rfs, ds = pdates(p.insp), ok = ds.filter(function (d) { return d <= dd; });
    p.inspected = rfs && (ds.length || p.insp) ? 1 : 0;
    var ic = p.inspected ? 1 : rfs ? 0.5 : 0;
    p.recv = p.inspected && ok.length ? ok[ok.length - 1] : null; p.dates = ds;
    var tg = tags(p.note), onTag = tg.filter(function (x) { return hit(x, P_TAG); })[0] || null;
    var locR = hit(p.remark, P_LOC) ? p.remark : null, locT = tg.filter(function (x) { return hit(x, P_LOC); })[0] || null;
    p.loc = locR || locT || (onTag || p.inspected ? 'On site (location not stated)' : null);
    p.ev = p.inspected ? 'Inspection record' : onTag ? 'Site tag' : (locR || locT) ? 'Location remark' : null;
    p.onsite = p.ev ? 1 : 0;
    p.lg = p.onsite ? locGroup(locR || locT) || NOLOC : null;
    p.locSrc = locR ? 'Remark' : locT ? 'Site tag' : null;
    p.g = { PL: GW.PL * p.pl, MDR: GW.MDR * p.mdrCr, SITE: GW.SITE * p.onsite, INSP: GW.INSP * ic };
    p.score = Math.round((p.g.PL + p.g.MDR + p.g.SITE + p.g.INSP) * 100) / 100;
    p.st = !p.pl ? 'BLOCK' : p.inspected && p.mdrCr >= 1 ? 'READY' : p.inspected ? 'PEND' : p.onsite ? 'SITE' : 'AWAIT';
    var a = ST[p.st].act;
    if ((p.st === 'PEND' || p.st === 'AWAIT' || p.st === 'SITE') && p.mdrCr < 1) a += ' MDR: ' + (MDRL[p.mdr] || p.mdr) + (p.mdrNo && !nr ? ' (' + p.mdrNo + ')' : '') + '.';
    if (p.st === 'BLOCK') a += blocking.length ? ' ' + blocking.map(function (x) { return x.type; }).filter(function (v, k, ar) { return ar.indexOf(v) === k; }).sort().join('; ') : ' No linked detail block.';
    p.act = a;
    p.age = p.st === 'PEND' && p.recv != null ? Math.round((dd - p.recv) / DAY) : null;
    /* MDR pending: grey up to the first limit, amber after it, red after the second (Batas MDR, default 7 / 14 days) */
    p.lv = p.st === 'PEND' ? (p.age == null ? 'warn' : p.age > AGEV[1] ? 'crit' : p.age > AGEV[0] ? 'warn' : '') : ST[p.st].lv;
    p.locN = p.loc || OFFSITE;
  }
  function mondayOf(t) { var d = new Date(t), k = (d.getUTCDay() + 6) % 7; return t - k * DAY; }
  function isoWeek(t) { var d = new Date(mondayOf(t) + 3 * DAY), y = d.getUTCFullYear(), f = Date.UTC(y, 0, 4); return 1 + Math.round((d.getTime() - mondayOf(f)) / (7 * DAY)); }
  var R = null;
  function build(pkgIn, blkIn, issIn, itmIn) {
    var P = parsePackages(pkgIn); if (P.error) return { error: 'Packages: ' + P.error };
    var B = blkIn ? parseBlocks(blkIn) : { list: [] }, I = issIn ? parseIssues(issIn) : { list: [] };
    if (B.error) B = { list: [], error: B.error }; if (I.error) I = { list: [], error: I.error };
    var nBy = {}, blkPkg = {};
    B.list.forEach(function (b) { if (b.pid) nBy[b.pid] = (nBy[b.pid] || 0) + 1; blkPkg[b.id] = b.pid; });
    P.list.forEach(function (p) { if (p.links == null && B.list.length) p.links = nBy[p.id] || 0; });
    /* an issue raised on a detail block belongs to the Summary package of that block (as in the ETL) */
    var iss = {}; I.list.forEach(function (x) { if (!x.pid && x.did && blkPkg[x.did]) x.pid = blkPkg[x.did]; if (x.pid) (iss[x.pid] = iss[x.pid] || []).push(x); });
    var dd = pdate(cfg.datadate) || pdate(P.meta.dd) || P.ddCol, recvMax = null;
    if (dd == null) P.list.forEach(function (p) { pdates(p.insp).forEach(function (d) { if (recvMax == null || d > recvMax) recvMax = d; }); });
    if (dd == null) dd = recvMax != null ? recvMax : Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    var probs = [], mism = 0;
    P.list.forEach(function (p) {
      readiness(p, iss, dd);
      if (p.etlSt && ST[p.st].etl !== p.etlSt) mism++;
      if (p.insp && !p.dates.length) probs.push(p.no + ': inspection date "' + p.insp + '" not recognised');
    });
    if (mism) probs.unshift(mism + ' package(s) where the readiness computed here differs from the ETL column "Readiness Status (ETL)" — the sheet was edited after the ETL run, or the rules in this block differ.');
    if (B.error) probs.push('Detail tab: ' + B.error); if (I.error) probs.push('Issues tab: ' + I.error);
    var byId = {}; P.list.forEach(function (p) { byId[p.id] = p; });
    var blkBy = {}, orphan = [];
    B.list.forEach(function (b) { if (b.pid && byId[b.pid]) (blkBy[b.pid] = blkBy[b.pid] || []).push(b); else orphan.push(b); });
    var first = null; P.list.forEach(function (p) { if (p.recv != null && (first == null || p.recv < first)) first = p.recv; });
    var w0 = mondayOf(first != null ? Math.min(first, dd - 11 * 7 * DAY) : dd - 11 * 7 * DAY), wN = mondayOf(dd), weeks = [];
    for (var t = w0; t <= wN; t += 7 * DAY) weeks.push(t);
    var lbl = weeks.map(function (t) { var d = new Date(t); return d.getUTCDate() + ' ' + MS[d.getUTCMonth()]; });
    var docs = {}; P.list.forEach(function (p) { var k = p.b + '|' + p.c; docs[k] = (docs[k] || 0) + 1; });
    return { pk: P.list, byId: byId, blkBy: blkBy, orphan: orphan, iss: I.list, issBy: iss, dd: dd, weeks: weeks, lbl: lbl, probs: probs, mism: mism,
      combos: Object.keys(docs).sort(), items: null, itemsN: null, itmIn: itmIn };
  }
  function wIdx(t) { if (t == null) return -1; var i = Math.floor((mondayOf(t) - R.weeks[0]) / (7 * DAY)); return i >= 0 && i < R.weeks.length ? i : -1; }

  /* ---------- 4. agregat (basis: package count | tonnage) ---------- */
  var state = { page: 1, basis: /^(ton|t\b|berat|weight)/i.test(cfg.basis) ? 't' : 'n', rview: 'wk', rsort: 'order', rb: null, rc: null, rs: null,
    pb: null, pc: null, pg: null, pst: 'ALL', ploc: 'ALL', plocs: [], pmdr: 'ALL', pview: 'pkg', pdall: false, psort: 'order', fst: 'ALL', fmat: 'WITH', fsta: 'ALL', fq: '', fsort: 'axis', fview: 'site', fax: null, fall: false, q: '', pkg: null, blk: null, pall: false, xsev: 'ALL', xtype: null, xall: false };
  function agg(list) {
    var a = { n: list.length, t: 0, sc: 0, sct: 0, f: {} };
    ['READY', 'PEND', 'SITE', 'AWAIT', 'BLOCK', 'insp', 'onsite', 'mdr', 'pl', 'mdrRisk'].forEach(function (k) { a.f[k] = { n: 0, t: 0 }; });
    list.forEach(function (p) {
      a.t += p.t; a.sc += p.score; a.sct += p.score * p.t;
      function add(k) { a.f[k].n++; a.f[k].t += p.t; }
      add(p.st); if (p.inspected) add('insp'); if (p.onsite) add('onsite'); if (p.mdrCr >= 1) add('mdr'); if (p.pl) add('pl');
      if (p.st === 'AWAIT' && p.mdrCr < 1) add('mdrRisk');
    });
    a.idxN = a.n ? a.sc / a.n : null; a.idxT = a.t ? a.sct / a.t : null;
    return a;
  }
  function B_(a, k) { var f = k ? a.f[k] : a; return state.basis === 't' ? f.t : f.n; }
  function share(a, k) { var tot = B_(a); return tot ? B_(a, k) / tot : null; }
  function idx(a) { return state.basis === 't' ? a.idxT : a.idxN; }
  function bv(v) { return state.basis === 't' ? nf1(v) : nf(v); }
  function bu(long) { return state.basis === 't' ? 't' : long ? 'packages' : 'pkgs'; }
  function lvIdx(v) { return v == null ? '' : v >= 75 ? 'good' : v >= 40 ? 'warn' : 'crit'; }
  function lvShare(r) { return r == null ? '' : r >= 0.75 ? 'good' : r >= 0.4 ? 'warn' : 'crit'; }
  function bcName(b, c) { return (b ? 'Batch ' + String(b).replace(/^B/, '') : 'All batches') + (c ? ' · ' + c : ''); }
  function weekly(list, pred) { var o = R.weeks.map(function () { return 0; }); list.forEach(function (p) { if (pred && !pred(p)) return; var i = wIdx(p.recv); if (i > -1) o[i] += state.basis === 't' ? p.t : 1; }); return o; }
  function fdd(t) { return t == null ? '—' : fdate(t); }

  /* ---------- 5. tampilan bersama ---------- */
  var srcState = { kind: 'code', notes: [] };
  function renderShared() {
    Array.prototype.forEach.call(root.querySelectorAll('.ddt'), function (n0) {
      clear(n0).appendChild(document.createTextNode('Data date ' + fdate(R.dd)));
      n0.appendChild(el('span', 'hz', ' · ' + R.combos.map(function (k) { var x = k.split('|'); return x[0] + '-' + x[1]; }).join(' · ') + ' · ' + nf(R.pk.length) + ' packages'));
    });
    Array.prototype.forEach.call(root.querySelectorAll('.src'), function (box) {
      clear(box);
      var probs = showChecks ? R.probs : [], notes = srcState.notes.concat(probs.length ? ['Data checks:'].concat(probs.slice(0, 12)) : []);
      if (srcState.kind !== 'fallback' && !probs.length) return;
      var c = el('span', 'chip'), dt = el('i', 'dot'); dt.style.background = 'var(--warn)';
      c.appendChild(dt); c.appendChild(document.createTextNode(srcState.kind === 'fallback' ? 'Offline data' : 'Data check'));
      box.appendChild(c); box.appendChild(infoIcon(notes.join('\n')));
    });
    Array.prototype.forEach.call(root.querySelectorAll('.basisseg'), function (sg) {
      if (!sg._built) {
        sg._built = true;
        [['n', 'Packages'], ['t', 'Tonnage']].forEach(function (o) {
          var b = el('button', null, o[1]); b.type = 'button'; b.setAttribute('data-v', o[0]);
          b.addEventListener('click', function () { if (state.basis === o[0]) return; state.basis = o[0]; renderAll(false); });
          sg.appendChild(b);
        });
      }
      Array.prototype.forEach.call(sg.children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === state.basis ? 'true' : 'false'); });
    });
    Array.prototype.forEach.call(root.querySelectorAll('.pnote'), function (n0) {
      n0.textContent = 'Readiness = packing list ' + nf(GW.PL) + ' · MDR ' + nf(GW.MDR) + ' · site ' + nf(GW.SITE) + ' · inspection ' + nf(GW.INSP) + ' · ' + (state.basis === 't' ? 'weighted by gross tonnage' : 'per package');
    });
  }

  /* ---------- 6. halaman 1: overview ---------- */
  function panel(o) {
    var cd = el('section', 'stp glass'); cd.style.setProperty('--accent', COL[o.lv] || 'var(--muted)');
    var top = el('div', 'stp-top'), nm = el('span', 'stp-name'); nm.appendChild(chipIco(o.icon)); nm.appendChild(document.createTextNode(o.name));
    top.appendChild(nm); top.appendChild(badge(o.lv, o.badge)); cd.appendChild(top);
    var big = el('div', 'stp-big'), L = el('div'), v = el('div', 'v'), cn = el('span', null, '0');
    v.appendChild(cn); v.appendChild(el('small', null, o.unit)); L.appendChild(v); L.appendChild(el('div', 'cap', o.cap)); big.appendChild(L);
    var cmp = el('div', 'cmp');
    o.cmp.forEach(function (x0) { var d = el('div'), i = el('i'); i.style.background = x0[0]; d.appendChild(i); d.appendChild(document.createTextNode(x0[1])); d.appendChild(el('b', null, x0[2])); cmp.appendChild(d); });
    big.appendChild(cmp); cd.appendChild(big);
    var gb = el('div', 'gbar'), f = el('div', 'fill');
    gb.appendChild(f);
    (o.marks || []).forEach(function (mk) { var m0 = el('div', 'mk'); m0.style.background = mk[0]; m0.style.left = Math.max(0, Math.min(100, mk[1] * 100)) + '%'; gb.appendChild(m0); });
    gb.setAttribute('data-tip', o.gtip); cd.appendChild(gb);
    raf2(function () { f.style.width = Math.max(0, Math.min(100, (o.fill || 0) * 100)) + '%'; });
    var kq = el('div', 'kq');
    o.kq.forEach(function (c) { var d = el('div'), l = el('div', 'lbl'); l.appendChild(ico(c[0], 12)); l.appendChild(document.createTextNode(c[1])); d.appendChild(l); var vv = el('div', 'v', c[2]); if (c[3]) vv.appendChild(el('small', null, c[3])); d.appendChild(vv); d.appendChild(el('div', 's', c[4])); if (c[5]) d.title = c[5]; kq.appendChild(d); });
    cd.appendChild(kq);
    if (o.ramp) { var rp = el('div', 'ramp'); rp.appendChild(ico(o.ramp.icon, 15)); var tx = el('span'); tx.innerHTML = o.ramp.html; rp.appendChild(tx); if (o.ramp.badge) rp.appendChild(badge(o.ramp.badge[0], o.ramp.badge[1])); cd.appendChild(rp); }
    var mini = el('div', o.miniCls || 'mini'); cd.appendChild(mini);
    var ft = el('div', 'stp-foot'), lg = el('div', 'legend');
    o.legend.forEach(function (x0) { var sp0 = el('span'), i = el('i', x0[2] || ''); i.style.background = x0[0]; sp0.appendChild(i); sp0.appendChild(document.createTextNode(x0[1])); lg.appendChild(sp0); });
    ft.appendChild(lg);
    var lk = el('button', 'lnk'); lk.type = 'button'; lk.innerHTML = o.link[0] + ' <span aria-hidden="true">→</span>';
    lk.addEventListener('click', function () { go(o.link[1]); }); ft.appendChild(lk); cd.appendChild(ft);
    cn._v = 0; count(cn, o.big, o.bigD || 0);
    if (o.mini) raf2(function () { o.mini(mini); });
    return cd;
  }
  function pace(list) {
    var w = weekly(list, function (p) { return p.inspected; }), n = w.length, k = Math.min(4, n), s0 = 0;
    for (var i = n - k; i < n; i++) s0 += w[i];
    return { w: w, avg: k ? s0 / k : 0, k: k };
  }
  function receivingPanel(a) {
    var pc0 = pace(R.pk), awaitV = B_(a, 'AWAIT') + B_(a, 'SITE'), wks = pc0.avg > 0 ? awaitV / pc0.avg : null;
    var lastR = null; R.pk.forEach(function (p) { if (p.recv != null && (lastR == null || p.recv > lastR)) lastR = p.recv; });
    var rIn = share(a, 'insp'), rRd = share(a, 'READY');
    return panel({ icon: 'truck', name: 'Site receiving', lv: B_(a, 'SITE') > 0 ? 'warn' : 'good', badge: pc(rIn) + ' received · ' + pc(rRd) + ' ready',
      big: B_(a, 'insp'), bigD: state.basis === 't' ? 1 : 0, unit: state.basis === 't' ? 't received & inspected' : 'packages received & inspected',
      cap: 'of ' + bv(B_(a)) + ' ' + bu() + ' shipped · last receipt ' + fdd(lastR),
      cmp: [['var(--good)', 'Ready', bv(B_(a, 'READY'))], ['var(--plan)', 'On site', bv(B_(a, 'onsite'))]],
      fill: rIn, marks: [['var(--good)', rRd], ['var(--plan)', share(a, 'onsite')]], gtip: 'Received & inspected ' + bv(B_(a, 'insp')) + ' · ready ' + bv(B_(a, 'READY')) + ' · on site ' + bv(B_(a, 'onsite')) + ' · shipped ' + bv(B_(a)) + ' ' + bu(),
      kq: [['check', 'Ready', bv(B_(a, 'READY')), '', pc(rRd) + ' of shipped', 'Packing list verified, MDR approved, received & inspected'],
        ['pin', 'On site', bv(B_(a, 'onsite')), '', bv(sumBy(R.pk, function (p) { return p.onsite && p.lg !== NOLOC; })) + ' at laydown/area', 'Physically on site: RFS + inspection date, a laydown / location in the Summary Remark column (U or T) or an "onsite" tag (V / W)'],
        ['flag', 'Awaiting RFS', bv(B_(a, 'SITE')), '', 'on site, not inspected', 'On site (tag or laydown) but no RFS Material Receiving / inspection date yet'],
        ['clock', 'Weekly pace', nf1(pc0.avg), '', bu() + '/week · ' + pc0.k + ' wks', 'Average received & inspected per week over the last ' + pc0.k + ' weeks to the data date']],
      ramp: { icon: 'ramp', html: 'Receiving pace <b>' + nf1(pc0.avg) + ' ' + bu() + '/week</b> (last ' + pc0.k + ' weeks) — the <b>' + bv(awaitV) + ' ' + bu() + '</b> not yet inspected need about <b>' + (wks == null ? '—' : nf(wks) + ' weeks') + '</b> at this pace.',
        badge: wks == null ? ['crit', 'No receipts'] : wks > 26 ? ['warn', '≈' + nf(wks) + ' wks'] : ['good', '≈' + nf(wks) + ' wks'] },
      legend: [['var(--actual)', 'Inspected / week', 'sq'], ['var(--plan)', 'Ready / week', '']], link: ['Open Receiving', 2],
      mini: function (box) {
        chart(box, { n: R.weeks.length, lbl: R.lbl, dd: R.weeks.length - 1, tg0: Math.max(0, R.weeks.length - pc0.k), zone: 'LAST ' + pc0.k + ' WEEKS', compact: true,
          bars: [{ vals: pc0.w, c: 'var(--actual)' }], lines: [{ vals: weekly(R.pk, function (p) { return p.st === 'READY'; }), c: 'var(--plan)', w: 2 }],
          tip: function (i) { return weekTip(R.pk, i); }, tipTitle: weekTitle });
      } });
  }
  function weekTitle(i) { var t = R.weeks[i]; return 'Week ' + isoWeek(t) + ' · ' + R.lbl[i] + ' – ' + fdate(t + 6 * DAY) + (i === R.weeks.length - 1 ? ' · data date' : ''); }
  function weekTip(list, i, mode) {
    var u = ' ' + bu(), rows = [];
    if (mode === 'cum') {
      var cA = 0, cR = 0; list.forEach(function (p) { var k = wIdx(p.recv); if (k > -1 && k <= i) { var w0 = state.basis === 't' ? p.t : 1; cA += w0; if (p.st === 'READY') cR += w0; } });
      rows.push({ c: 'var(--actual)', v: bv(cA), l: 'Inspected (cum.)' + u }); rows.push({ c: 'var(--plan)', v: bv(cR), l: 'Ready (cum.)' + u });
      var tot = list.reduce(function (s0, p) { return s0 + (state.basis === 't' ? p.t : 1); }, 0);
      rows.push({ c: 'var(--base)', v: bv(tot), l: 'Shipped', dash: true }); rows.push('-'); rows.push({ v: pc(tot ? cA / tot : null), l: 'received of shipped' });
      return rows;
    }
    var a0 = 0, r0 = 0, n0 = 0; list.forEach(function (p) { if (wIdx(p.recv) === i) { n0++; a0 += state.basis === 't' ? p.t : 1; if (p.st === 'READY') r0 += state.basis === 't' ? p.t : 1; } });
    rows.push({ c: 'var(--actual)', v: bv(a0), l: 'Inspected' + u }); rows.push({ c: 'var(--plan)', v: bv(r0), l: 'Ready' + u });
    if (state.basis === 't') { rows.push('-'); rows.push({ v: nf(n0), l: 'packages' }); }
    return rows;
  }
  function docPanel(a) {
    var rOk = share(a, 'mdr'), rRes = share(a) ? (B_(a) ? (sumBy(R.pk, function (p) { return p.mdr === 'RES'; })) / B_(a) : null) : null;
    var pend = R.pk.filter(function (p) { return p.st === 'PEND'; }), oldest = pend.reduce(function (m, p) { return p.age != null && p.age > m ? p.age : m; }, 0);
    var res = sumBy(R.pk, function (p) { return p.mdr === 'RES'; }), none = sumBy(R.pk, function (p) { return p.mdrCr < 1 && p.mdr !== 'RES'; });
    return panel({ icon: 'doc', name: 'Documentation · MDR', lv: lvShare(rOk), badge: pc(rOk) + ' MDR approved', big: B_(a, 'mdr'), bigD: state.basis === 't' ? 1 : 0,
      unit: state.basis === 't' ? 't with approved MDR' : 'packages with approved MDR', cap: 'incl. "MDR not required" · packing list verified for ' + bv(B_(a, 'pl')) + ' ' + bu(),
      cmp: [['var(--warn)', 'Resubmit', bv(res)], ['var(--crit)', 'Not submitted / none', bv(none)]],
      fill: rOk, marks: [['var(--warn)', (rOk || 0) + (rRes || 0)]], gtip: 'MDR approved ' + bv(B_(a, 'mdr')) + ' · resubmit ' + bv(res) + ' · not submitted / no status ' + bv(none) + ' ' + bu(),
      kq: [['alert', 'MDR pending', bv(B_(a, 'PEND')), '', 'inspected, not issuable', 'Received & inspected at site but MDR not approved'],
        ['ship', 'Pre-arrival', bv(B_(a, 'mdrRisk')), '', 'MDR open, in transit', 'Pre-arrival risk: not yet received and MDR not approved — finish the MDR before arrival'],
        ['check', 'PL verified', bv(B_(a, 'pl')), '', pc(share(a, 'pl')) + ' of shipped', 'Summary package linked to its detail packing list, no blocking issue'],
        ['flag', 'Blocked', bv(B_(a, 'BLOCK')), '', 'packing list issue', 'Summary package without a verified detail packing list']],
      ramp: pend.length ? { icon: 'clock', html: '<b>' + nf(pend.length) + ' package(s)</b> on site cannot be issued — MDR not approved; oldest <b>' + nf(oldest) + ' days</b> since inspection.',
        badge: [oldest > AGEV[1] ? 'crit' : oldest > AGEV[0] ? 'warn' : '', oldest > AGEV[1] ? '> ' + nf(AGEV[1]) + ' days' : oldest > AGEV[0] ? '> ' + nf(AGEV[0]) + ' days' : '≤ ' + nf(AGEV[0]) + ' days'] }
        : { icon: 'check', html: 'Every package received on site has an approved MDR.', badge: ['good', 'OK'] },
      legend: [['var(--good)', 'Approved / not req.', 'sq'], ['var(--warn)', 'Resubmit', 'sq'], ['var(--crit)', 'Not submitted / no MDR', 'sq'], ['var(--muted)', 'No status', 'sq']],
      link: ['Open Packing List', 3], miniCls: 'mstk', mini: mdrMini });
  }
  function sumBy(list, pred) { var s0 = 0; list.forEach(function (p) { if (pred(p)) s0 += state.basis === 't' ? p.t : 1; }); return s0; }
  function mdrMini(box) {
    clear(box);
    R.combos.forEach(function (k) {
      var x = k.split('|'), list = R.pk.filter(function (p) { return p.b === x[0] && p.c === x[1]; }), tot = sumBy(list, function () { return true; });
      var r = el('div', 'r'); r.appendChild(el('span', null, x[0] + ' · ' + x[1]));
      var bar = el('div', 'bar'), tipT = [];
      MDRO.forEach(function (m) {
        var v = sumBy(list, function (p) { return p.mdr === m; }); if (!v) return;
        var i = el('i'); i.style.width = (v / tot * 100).toFixed(2) + '%'; i.style.background = MDRC[m][0]; i.style.opacity = MDRC[m][1]; bar.appendChild(i);
        tipT.push(MDRL[m] + ' ' + bv(v) + ' (' + pc(v / tot) + ')');
      });
      bar.setAttribute('data-tip', bcName(x[0], x[1]) + '\n' + tipT.join('\n')); r.appendChild(bar);
      r.appendChild(el('b', null, pc(sumBy(list, function (p) { return p.mdrCr >= 1; }) / tot)));
      box.appendChild(r);
    });
  }
  function insights() {
    var out = [], a = agg(R.pk);
    function add(lv, icn, html, sub) { out.push({ lv: lv, icn: icn, html: html, sub: sub, rank: { crit: 0, warn: 1, good: 2, '': 3 }[lv] }); }
    var blk = R.pk.filter(function (p) { return p.st === 'BLOCK'; });
    if (blk.length || R.orphan.length) add('crit', 'alert', '<b>' + nf(blk.length) + ' Summary package(s)</b> without a verified detail packing list' + (blk.length ? ' (' + blk.slice(0, 3).map(function (p) { return p.no; }).join(', ') + ')' : '') + (R.orphan.length ? ' and <b>' + nf(R.orphan.length) + ' detail block(s)</b> not in the Summary (' + R.orphan.slice(0, 2).map(function (b) { return b.no; }).join(', ') + ')' : '') + '.', 'Confirm with the shipper; record the decision in mapping_overrides.csv and re-run the ETL.');
    var pend = R.pk.filter(function (p) { return p.st === 'PEND'; });
    if (pend.length) {
      var byM = {}; pend.forEach(function (p) { byM[p.mdr] = (byM[p.mdr] || 0) + 1; });
      var old = pend.reduce(function (m, p) { return Math.max(m, p.age || 0); }, 0);
      add(old > AGEV[1] ? 'crit' : old > AGEV[0] ? 'warn' : '', 'doc', '<b>' + nf(pend.length) + ' package(s) inspected on site cannot be issued</b> — MDR not approved: ' + Object.keys(byM).map(function (k) { return nf(byM[k]) + ' ' + (MDRL[k] || k).toLowerCase(); }).join(' · ') + '.', 'Oldest ' + nf(old) + ' days since inspection · flagged after ' + nf(AGEV[0]) + ' / ' + nf(AGEV[1]) + ' days (Batas MDR).');
    }
    var nl = R.pk.filter(function (p) { return p.lg === NOLOC; });
    if (nl.length) { var nlb = {}; nl.forEach(function (p) { var k = p.b + '-' + p.c + (p.inspected ? ' inspected' : ' "onsite" tag'); nlb[k] = (nlb[k] || 0) + 1; });
      add('warn', 'pin', '<b>' + nf(nl.length) + ' package(s)</b> are on site without a laydown / location (' + Object.keys(nlb).map(function (k) { return k + ' ' + nf(nlb[k]); }).join(' · ') + ').', 'Write the laydown (e.g. "Laydown 4") in the Summary Remark column so the material can be found on site.'); }
    var site = R.pk.filter(function (p) { return p.st === 'SITE'; });
    if (site.length) add('warn', 'pin', '<b>' + nf(site.length) + ' package(s)</b> are on site (site tag / laydown) without RFS Material Receiving or inspection date.', 'Raise the RFS so they enter the receiving count.');
    var risk = R.pk.filter(function (p) { return p.st === 'AWAIT' && p.mdrCr < 1; });
    if (risk.length) {
      var g = {}; risk.forEach(function (p) { var k = p.b + '-' + p.c + ' ' + (MDRL[p.mdr] || p.mdr).toLowerCase(); g[k] = (g[k] || 0) + 1; });
      var top = Object.keys(g).sort(function (x, y) { return g[y] - g[x]; })[0];
      add('warn', 'ship', 'Pre-arrival MDR risk: <b>' + nf(risk.length) + ' package(s)</b> (' + nf1(risk.reduce(function (s0, p) { return s0 + p.t; }, 0)) + ' t) not yet received have no approved MDR — largest group <b>' + top + '</b> (' + nf(g[top]) + ').', 'Finish these MDRs before arrival so the packages are ready the day they are inspected.');
    }
    var rd = a.f.READY, rcv = a.f.insp, locs = {}; R.pk.forEach(function (p) { if (p.st === 'READY') locs[p.locN] = (locs[p.locN] || 0) + 1; });
    var lk = Object.keys(locs).sort(function (x, y) { return locs[y] - locs[x]; });
    add(rcv.n ? lvShare(rd.n / rcv.n) : '', 'check', 'Ready for construction: <b>' + nf(rd.n) + ' packages</b> (' + nf1(rd.t) + ' t) — ' + (rcv.n ? pc(rd.n / rcv.n) + ' of the ' + nf(rcv.n) + ' received & inspected, ' : '') + pc(rd.n / a.n, 1) + ' of shipped' + (lk.length ? '; ' + nf(locs[lk[0]]) + ' at ' + lk[0] : '') + '.', 'Ready = packing list verified + MDR approved + received & inspected.');
    var wk = R.weeks.map(function () { return 0; }); R.pk.forEach(function (p) { var i = wIdx(p.recv); if (p.inspected && i > -1) wk[i]++; });
    var k4 = Math.min(4, wk.length), avg = k4 ? wk.slice(wk.length - k4).reduce(function (s0, v) { return s0 + v; }, 0) / k4 : 0, left = a.f.AWAIT.n + a.f.SITE.n;
    add(avg > 0 ? (left / avg > 26 ? 'warn' : 'good') : 'crit', 'truck', 'Receiving pace <b>' + nf1(avg) + ' packages/week</b> over the last ' + k4 + ' weeks; <b>' + nf(left) + '</b> packages are not yet inspected (≈' + (avg > 0 ? nf(left / avg) + ' weeks' : 'n/a') + ').', 'Pace = received & inspected per week up to the data date.');
    var parts = R.combos.map(function (k) { var x = k.split('|'), l = R.pk.filter(function (p) { return p.b === x[0] && p.c === x[1]; }), g0 = agg(l); return { k: x[0] + '-' + x[1], v: state.basis === 't' ? g0.idxT : g0.idxN }; });
    var low = parts.filter(function (x) { return x.v < 40; });
    add(low.length ? 'warn' : 'good', 'gauge', 'Readiness index by batch: ' + parts.map(function (x) { return '<b>' + x.k + '</b> ' + nf1(x.v) + '%'; }).join(' · ') + '.', low.length ? low.map(function (x) { return x.k; }).join(', ') + ' below 40 — mainly MDR and receiving.' : 'All batches at or above 40.');
    var inv = R.iss.filter(function (x) { return x.type === 'INVOICE_MISMATCH' && x.st === 'OPEN'; });
    if (inv.length) add('warn', 'inv', '<b>' + nf(inv.length) + ' detail block(s)</b> print another invoice number than the Summary (' + nf(inv.filter(function (x) { return /PLACEHOLDER/.test(x.sub); }).length) + ' placeholder).', 'Summary invoice governs; request re-issued detail packing lists for customs.');
    var lastR = null; R.pk.forEach(function (p) { if (p.recv != null && (lastR == null || p.recv > lastR)) lastR = p.recv; });
    if (lastR != null) { var lag = Math.round((R.dd - lastR) / DAY); if (lag > 7) add(lag > 14 ? 'crit' : 'warn', 'clock', 'Latest receiving record <b>' + fdate(lastR) + '</b> — ' + nf(lag) + ' days before the data date.', 'Update RFS and inspection dates in the "Packages" tab after each receiving.'); }
    return out.sort(function (p, q) { return p.rank - q.rank; }).slice(0, 9);
  }
  function seriesGaps() {
    var S0 = {};
    R.pk.forEach(function (p) {
      var m = /^(P\d+-[A-Z]+-\d+-[A-Z]+(?:-[A-Z]+)*)-(\d+)-(\d+)(?:\(\d+\)|（\d+）|\.\d+)?[\/-](\d+)$/.exec(U(p.no).replace(/\s+/g, ''));
      if (!m) return; var k = m[1] + '-' + m[2] + '-/' + m[4]; (S0[k] = S0[k] || { tot: +m[4], seq: {} }).seq[+m[3]] = 1;
    });
    var out = []; Object.keys(S0).forEach(function (k) { var s0 = S0[k], miss = 0; for (var i = 1; i <= s0.tot; i++) if (!s0.seq[i]) miss++; if (miss) out.push({ k: k, miss: miss, tot: s0.tot }); });
    return out.sort(function (x, y) { return y.miss - x.miss; });
  }
  function checks() {
    var out = [], pk = R.pk;
    var noDet = pk.filter(function (p) { return !(p.links > 0); }).length;
    out.push({ ok: noDet === 0 && !R.orphan.length, t: 'Every Summary package has its Detail Packing List', d: noDet === 0 && !R.orphan.length ? 'All ' + nf(pk.length) + ' packages are linked to their detail blocks.' : nf(noDet) + ' package(s) without detail · ' + nf(R.orphan.length) + ' detail block(s) without Summary package.' });
    var pend = pk.filter(function (p) { return p.st === 'PEND'; }).length;
    out.push({ ok: !pend, t: 'Material on site has an approved MDR', d: !pend ? 'Every inspected package has an approved (or not required) MDR.' : nf(pend) + ' inspected package(s) with MDR not approved.' });
    var site = pk.filter(function (p) { return p.st === 'SITE'; }).length;
    out.push({ ok: !site, t: 'Every package on site has RFS & inspection', d: !site ? 'No package tagged on site without RFS / inspection date.' : nf(site) + ' package(s) on site without RFS / inspection date.' });
    var nls = pk.filter(function (p) { return p.lg === NOLOC; }).length;
    out.push({ ok: !nls, t: 'Every package on site has a laydown / location', d: !nls ? 'Every package on site has its laydown / location in the Remark column or a site tag.' : nf(nls) + ' package(s) on site without laydown / location (Remark column U / T empty).' });
    var inv = R.iss.filter(function (x) { return x.type === 'INVOICE_MISMATCH' && x.st === 'OPEN'; }).length;
    out.push({ ok: !inv, t: 'Detail invoice = Summary invoice', d: !inv ? 'All detail blocks print the Summary invoice number.' : nf(inv) + ' detail block(s) print another / placeholder invoice.' });
    var dup = pk.filter(function (p) { return p.dup; }).length;
    out.push({ ok: !dup, t: 'Package numbers are unique', d: !dup ? 'No duplicate package number across batches and categories.' : nf(dup) + ' duplicate package number(s).' });
    var gaps = seriesGaps();
    out.push({ ok: !gaps.length, t: 'Package series complete (n of N)', d: !gaps.length ? 'Every numbering series is complete across the loaded batches.' : gaps.length + ' series with packages not yet listed — ' + gaps.slice(0, 2).map(function (g) { return g.k.replace(/^P\d+-[A-Z]+-\d+-/, '').replace(/-\/\d+$/, '') + ': ' + nf(g.miss) + ' of ' + nf(g.tot) + ' not listed'; }).join(' · ') + '.' });
    if (pk.some(function (p) { return p.etlSt; })) out.push({ ok: !R.mism, t: 'Readiness here = Logistics ETL', d: !R.mism ? 'Every package gets the same status as the ETL (PACKAGE_READINESS).' : nf(R.mism) + ' package(s) differ — the sheet changed after the ETL run.' });
    return out;
  }
  function renderP1() {
    $('l-title').textContent = cfg.judul || 'Logistics Readiness';
    var a = agg(R.pk), g = clear($('o-st'));
    g.appendChild(receivingPanel(a)); g.appendChild(docPanel(a));
    renderQuick(); renderLoc(a);
    var ins = clear($('o-ins')), h = el('div', 'sec-h'), h3 = el('h3'); h3.appendChild(chipIco('zap')); h3.appendChild(document.createTextNode('Key insights'));
    h3.appendChild(infoIcon('Generated automatically from the data: blocked packages, MDR at site, site tags without RFS, pre-arrival MDR risk, ready tonnage, receiving pace, readiness per batch, invoice consistency and data currency. Sorted by severity.'));
    h.appendChild(h3); ins.appendChild(h);
    insights().forEach(function (it) { var r = el('div', 'insr ' + it.lv), ii = el('span', 'ii'); ii.appendChild(ico(it.icn, 15)); r.appendChild(ii); var tx = el('div'); tx.innerHTML = it.html; if (it.sub) tx.appendChild(el('small', null, it.sub)); r.appendChild(tx); ins.appendChild(r); });
    var ck = clear($('o-chk')), cs = showChecks ? checks() : [];
    $('o-chk').style.display = cs.length ? '' : 'none'; $('o-row').style.gridTemplateColumns = cs.length ? '' : '1fr';
    if (cs.length) {
      var h2 = el('div', 'sec-h'), h4 = el('h3'); h4.appendChild(chipIco('list')); h4.appendChild(document.createTextNode('Readiness checks'));
      h4.appendChild(infoIcon('Cross-checks on the packing lists and the site records. PASS = consistent; FLAG = item to clarify with the shipper, QA/QC or the site team.'));
      h2.appendChild(h4); h2.appendChild(el('span', 'muted', cs.filter(function (c) { return c.ok; }).length + ' / ' + cs.length + ' pass')); ck.appendChild(h2);
      cs.forEach(function (c) { var r = el('div', 'chkr'); r.appendChild(el('span', 't', c.t)); r.appendChild(badge(c.ok ? 'good' : 'warn', c.ok ? 'PASS' : 'FLAG')); r.appendChild(el('span', 'd', c.d)); ck.appendChild(r); });
    }
    snapDots($('o-st')); snapDots($('o-row'));
  }
  /* ---------- 6b. material on site by location (laydown summary) ---------- */
  function locStats(list) {
    var by = {}, out = [];
    list.forEach(function (p) {
      var k = p.onsite ? p.lg : OFFSITE, g = by[k];
      if (!g) { g = by[k] = { k: k, n: 0, t: 0, st: {}, bc: {} }; out.push(g); }
      g.n++; g.t += p.t; g.st[p.st] = (g.st[p.st] || 0) + (state.basis === 't' ? p.t : 1);
      var bc = p.b + '-' + p.c; g.bc[bc] = (g.bc[bc] || 0) + 1;
    });
    function rk(g) { return g.k === OFFSITE ? 2 : g.k === NOLOC ? 1 : 0; }
    return out.sort(function (x, y) { return rk(x) - rk(y) || (state.basis === 't' ? y.t - x.t : y.n - x.n) || (x.k < y.k ? -1 : 1); });
  }
  /* position of a package: at a laydown / named area · on site without laydown · not on site */
  var POSL = { LAYDOWN: 'Laydown / area', ONSITE: 'On-site (no laydown)', OFF: 'Not on site' };
  var POSC = { LAYDOWN: 'var(--good)', ONSITE: 'var(--warn)', OFF: 'var(--line-strong)' };
  var POST = { LAYDOWN: 'Laydown / area written in the Summary Remark column (U in B4-P5 / B5-P3, T elsewhere) or in a site tag',
    ONSITE: 'On site — "onsite" tag (column V / W) or RFS + inspection date (R / S) — but no laydown in the Remark column',
    OFF: 'No RFS / inspection date, no laydown and no site tag yet' };
  function posOf(p) { return !p.onsite ? 'OFF' : p.lg === NOLOC ? 'ONSITE' : 'LAYDOWN'; }
  function matchLoc(p, v) { return v === 'ALL' || (v === 'PICK' ? state.plocs.indexOf(p.lg) > -1 : POSL[v] ? posOf(p) === v : p.lg === v); }
  function laydowns(list) { var o = {}; list.forEach(function (p) { if (posOf(p) === 'LAYDOWN') o[p.lg] = (o[p.lg] || 0) + 1; }); return Object.keys(o).sort(function (x, y) { return o[y] - o[x] || (x < y ? -1 : 1); }).map(function (k) { return { k: k, n: o[k] }; }); }
  function filtName() {
    var parts = [];
    if (state.ploc === 'PICK') parts.push(state.plocs.join(' + ')); else if (state.ploc !== 'ALL') parts.push(POSL[state.ploc] || state.ploc);
    if (state.pst !== 'ALL') parts.push(ST[state.pst].s);
    if (state.pmdr !== 'ALL') parts.push('MDR ' + (MDRL[state.pmdr] || state.pmdr).toLowerCase());
    return parts.join(' · ');
  }
  function openFilter(loc, st, mdr) {
    if (loc && loc !== 'ALL' && !POSL[loc]) { state.ploc = 'PICK'; state.plocs = [loc]; } else { state.ploc = loc || 'ALL'; state.plocs = []; }
    state.pst = st || 'ALL'; state.pmdr = mdr || 'ALL'; state.pdall = false;
    state.pb = state.pc = state.pg = null; state.q = ''; state.pkg = null; state.blk = null; state.pall = false;
    var qi = $('p-q'); if (qi) qi.value = '';
    if (state.page === 3) renderP3(); else go(3);
  }
  function openLoc(k) { openFilter(k === OFFSITE ? 'OFF' : k === NOLOC ? 'ONSITE' : k); }
  function qbRow(box, label, items) {
    var row = el('div', 'lg-frow'), wrap = el('div', 'lg-qbs'); row.appendChild(el('span', 'lg-flab', label));
    items.forEach(function (it) {
      var b = el('button', 'lg-qb' + (it.sub ? ' sub' : '') + (it.n ? '' : ' zero')); b.type = 'button';
      if (it.dot) { var d = el('i', 'lg-dot'); d.style.background = it.dot; b.appendChild(d); } else if (it.icon) b.appendChild(ico(it.icon, 12));
      b.appendChild(document.createTextNode(it.t)); b.appendChild(el('b', null, nf(it.n)));
      b.title = (it.tip ? it.tip + '\n' : '') + 'Click to list these ' + nf(it.n) + ' packages';
      b.addEventListener('click', it.go); wrap.appendChild(b);
    });
    row.appendChild(wrap); box.appendChild(row);
  }
  function renderQuick() {
    var box = clear($('o-quick')), pk = R.pk, c = function (f) { return pk.filter(f).length; };
    qbRow(box, 'Position', [{ t: POSL.LAYDOWN, n: c(function (p) { return posOf(p) === 'LAYDOWN'; }), dot: POSC.LAYDOWN, tip: POST.LAYDOWN, go: function () { openFilter('LAYDOWN'); } }]
      .concat(laydowns(pk).map(function (g) { return { t: g.k, n: g.n, icon: 'pin', sub: true, go: function () { openFilter(g.k); } }; }))
      .concat([{ t: POSL.ONSITE, n: c(function (p) { return posOf(p) === 'ONSITE'; }), dot: POSC.ONSITE, tip: POST.ONSITE, go: function () { openFilter('ONSITE'); } },
        { t: POSL.OFF, n: c(function (p) { return posOf(p) === 'OFF'; }), dot: POSC.OFF, tip: POST.OFF, go: function () { openFilter('OFF'); } }]));
    qbRow(box, 'Status', STO.map(function (k) { return { t: ST[k].s, n: c(function (p) { return p.st === k; }), dot: ST[k].c, tip: ST[k].n, go: function () { openFilter('ALL', k); } }; }));
  }
  function renderLoc(a) {
    var box = clear($('o-loc')), gs = locStats(R.pk), on = gs.filter(function (g) { return g.k !== OFFSITE; });
    var onN = on.reduce(function (s0, g) { return s0 + g.n; }, 0), onT = on.reduce(function (s0, g) { return s0 + g.t; }, 0);
    var h = el('div', 'sec-h'), h3 = el('h3'); h3.appendChild(chipIco('pin')); h3.appendChild(document.createTextNode('Material on site by location'));
    h3.appendChild(infoIcon('Location of every package on site, as written in the Summary Packing List:\n· Remark column — U in B4-P5 and B5-P3, T in B4-P3 and B5-P5 ("Laydown 4", "Laydown 5", "Askara" …)\n· tags on the same row right of the table — V / W ("onsite", "Mechanical part at Camp HHI")\n· on site ("onsite" tag, or RFS + inspection date in R / S) without a laydown = "On-site (no laydown)".\nClick a row to list its packages.'));
    h.appendChild(h3); h.appendChild(el('span', 'muted', nf(onN) + ' of ' + nf(R.pk.length) + ' packages · ' + nf1(onT) + ' t on site')); box.appendChild(h);
    var rows = el('div', 'lg-locs'), mx = gs.reduce(function (m, g) { return Math.max(m, state.basis === 't' ? g.t : g.n); }, 0) || 1;
    var ORDER = ['READY', 'PEND', 'SITE', 'AWAIT', 'BLOCK'];
    gs.forEach(function (g) {
      var b = el('button', 'lr' + (g.k === OFFSITE ? ' off' : '') + (g.k === NOLOC ? ' ns' : '')); b.type = 'button';
      var nm = el('span', 'nm'); nm.appendChild(ico(g.k === OFFSITE ? 'ship' : 'pin', 14));
      var tx = el('span', 'tx', g.k); tx.appendChild(el('small', null, Object.keys(g.bc).sort().map(function (k) { return k + ' ' + nf(g.bc[k]); }).join(' · '))); nm.appendChild(tx); b.appendChild(nm);
      var tw = el('span', 'tw'), tr0 = el('span', 'tr'); tr0.style.width = ((state.basis === 't' ? g.t : g.n) / mx * 100).toFixed(1) + '%';
      var tot = state.basis === 't' ? g.t : g.n;
      ORDER.forEach(function (k) { var v = g.st[k]; if (!v) return; var i = el('i'); i.style.width = (v / tot * 100).toFixed(2) + '%'; i.style.background = ST[k].c; tr0.appendChild(i); });
      tw.appendChild(tr0); b.appendChild(tw);
      var ct = el('span', 'ct'); ct.appendChild(el('b', null, nf(g.n))); ct.appendChild(document.createTextNode(' pkgs · ' + nf1(g.t) + ' t')); b.appendChild(ct);
      var cv = el('span', 'cv'); cv.appendChild(chevI()); b.appendChild(cv);
      b.title = g.k + ' — ' + nf(g.n) + ' packages · ' + nf1(g.t) + ' t\n' + ORDER.filter(function (k) { return g.st[k]; }).map(function (k) { return ST[k].s + ' ' + bv(g.st[k]); }).join(' · ') + '\nClick to list the packages';
      b.addEventListener('click', function () { openLoc(g.k); });
      rows.appendChild(b);
    });
    box.appendChild(rows);
    var lg = el('div', 'legend lg-locleg'); ORDER.filter(function (k) { return gs.some(function (g) { return g.st[k]; }); }).forEach(function (k) { var sp0 = el('span'), i = el('i', 'sq'); i.style.background = ST[k].c; sp0.appendChild(i); sp0.appendChild(document.createTextNode(ST[k].s)); lg.appendChild(sp0); });
    box.appendChild(lg);
  }
  function locChip(p) {
    if (!p.onsite) return document.createTextNode(OFFSITE);
    var c = el('span', 'lg-loc' + (p.lg === NOLOC ? ' ns' : '')); c.appendChild(ico('pin', 11)); c.appendChild(document.createTextNode(p.lg === NOLOC ? 'On-site' : p.lg));
    c.title = (p.locSrc ? p.locSrc + ': ' + p.loc : p.locN) + (p.ev ? ' · ' + p.ev : '');
    return c;
  }
  function snapDots(box) {
    if (!box) return;
    var d = box.nextElementSibling, kids = Array.prototype.filter.call(box.children, function (c) { return c.style.display !== 'none'; }), n = kids.length;
    if (!d || !d.classList || !d.classList.contains('sdots')) { d = el('div', 'sdots'); d.setAttribute('aria-hidden', 'true'); box.parentNode.insertBefore(d, box.nextSibling); }
    clear(d); d.style.visibility = n > 1 ? '' : 'hidden'; for (var i = 0; i < n; i++) d.appendChild(el('i'));
    function upd() { var c0 = kids[0], w = c0 ? c0.getBoundingClientRect().width + 12 : 1, ix = Math.round(box.scrollLeft / w); Array.prototype.forEach.call(d.children, function (x, j) { x.classList.toggle('on', j === Math.min(n - 1, ix)); }); }
    if (!box._dots) { box._dots = true; box.addEventListener('scroll', function () { cancelAnimationFrame(box._dr); box._dr = requestAnimationFrame(upd); }, { passive: true }); }
    upd();
  }

  /* ---------- 7. halaman 2: site receiving (Batch › Category › System) ---------- */
  function scopeR() {
    return R.pk.filter(function (p) { return (!state.rb || p.b === state.rb) && (!state.rc || p.c === state.rc) && (!state.rs || p.sys === state.rs); });
  }
  function uniq(list, f) { var o = []; list.forEach(function (p) { var v = f(p); if (v != null && o.indexOf(v) < 0) o.push(v); }); return o; }
  function optOf(list, name, sub, id, cur) { var a = agg(list); return { id: id, name: name, sub: sub, n: nf(list.length) + ' pkgs', r: idx(a) / 100, lv: lvIdx(idx(a)), cur: cur, tip: 'Readiness index ' + nf1(idx(a)) + '% · ready ' + bv(B_(a, 'READY')) + ' ' + bu() }; }
  function renderRSteps() {
    var box = $('r-steps'), all = R.pk, bs = uniq(all, function (p) { return p.b; }).sort();
    var inB = all.filter(function (p) { return !state.rb || p.b === state.rb; }), cs = uniq(inB, function (p) { return p.c; }).sort();
    var inC = inB.filter(function (p) { return !state.rc || p.c === state.rc; }), ss = uniq(inC, function (p) { return p.sys; }).sort();
    function pick(b, c, s0) { state.rb = b; state.rc = c; state.rs = s0; $('r-tbl').scrollTop = 0; renderP2(); }
    var aAll = agg(all), aB = agg(inB), aC = agg(inC);
    stepBar(box, [
      { name: 'Batch', plural: 'Batches', icon: 'ship', set: !!state.rb, on: false, val: state.rb ? bcName(state.rb) : 'All',
        all: { sub: 'Batch 4 + Batch 5', n: nf(all.length) + ' pkgs', r: idx(aAll) / 100, lv: lvIdx(idx(aAll)) },
        opts: function () { return bs.map(function (b) { var l = all.filter(function (p) { return p.b === b; }); return optOf(l, bcName(b), uniq(l, function (p) { return p.c; }).sort().join(' · '), b, state.rb === b); }); },
        pick: function (id) { pick(id, null, null); } },
      { name: 'Category', plural: 'Categories', icon: 'layers', set: !!state.rc, on: !state.rc && !!state.rb, val: state.rc || 'All · ' + cs.length,
        all: { sub: state.rb ? bcName(state.rb) : 'All batches', n: nf(inB.length) + ' pkgs', r: idx(aB) / 100, lv: lvIdx(idx(aB)) },
        opts: function () { return cs.map(function (c) { var l = inB.filter(function (p) { return p.c === c; }); return optOf(l, c, bcName(state.rb, c), c, state.rc === c); }); },
        pick: function (id) { pick(state.rb, id, null); } },
      { name: 'System', plural: 'Systems', icon: 'box', set: !!state.rs, on: !state.rs && !!state.rc, val: state.rs || 'All · ' + ss.length,
        all: { sub: bcName(state.rb, state.rc), n: nf(inC.length) + ' pkgs', r: idx(aC) / 100, lv: lvIdx(idx(aC)) },
        opts: function () { return ss.map(function (s0) { var l = inC.filter(function (p) { return p.sys === s0; }); return optOf(l, s0, bcName(state.rb, state.rc), s0, state.rs === s0); }); },
        pick: function (id) { pick(state.rb, state.rc, id); } }
    ], 'Readiness index', state.rb || state.rc || state.rs ? function () { pick(null, null, null); } : null);
  }
  function renderP2() {
    var list = scopeR(), a = agg(list), view = state.rview;
    $('r-title').textContent = state.rs ? state.rs : state.rb || state.rc ? bcName(state.rb, state.rc) : 'All packages';
    renderRSteps();
    var kb = clear($('r-kpi'));
    kb.appendChild(statCard('truck', 'Received & inspected', bv(B_(a, 'insp')), bu(), [pc(share(a, 'insp'), 1) + ' of ' + bv(B_(a)) + ' shipped']));
    kb.appendChild(statCard('check', 'Ready for construction', bv(B_(a, 'READY')), bu(), [badge(lvShare(share(a, 'READY')), pc(share(a, 'READY'), 1) + ' ready')]));
    kb.appendChild(statCard('pin', 'On site · awaiting RFS', bv(B_(a, 'SITE')), bu(), [B_(a, 'PEND') ? bv(B_(a, 'PEND')) + ' more inspected, MDR pending' : 'no MDR-pending material']));
    kb.appendChild(statCard('gauge', 'Readiness index', idx(a) == null ? '—' : nf1(idx(a)), '%', [badge(lvIdx(idx(a)), lvIdx(idx(a)) === 'good' ? 'On track' : lvIdx(idx(a)) === 'warn' ? 'Warning' : 'Critical')]));
    var totV = B_(a), sp = { n: R.weeks.length, lbl: R.lbl, dd: R.weeks.length - 1, mode: view === 'cum' ? 'cum' : 'mon', tg0: Math.max(0, R.weeks.length - 4), zone: 'LAST 4 WEEKS',
      bars: [{ vals: weekly(list, function (p) { return p.inspected; }), c: 'var(--actual)' }], lines: [{ vals: weekly(list, function (p) { return p.st === 'READY'; }), c: 'var(--plan)', w: 2.4 }],
      total: view === 'cum' ? { vals: R.weeks.map(function () { return totV; }), name: 'Shipped' } : null,
      tip: function (i, md) { return weekTip(list, i, md === 'cum' ? 'cum' : 'wk'); }, tipTitle: weekTitle, aria: 'Site receiving per week: inspected and ready' };
    legendItems($('r-leg'), view === 'cum' ? [{ c: 'var(--actual)', t: 'Received & inspected (cum.)' }, { c: 'var(--plan)', t: 'Ready (cum.)' }, { c: 'var(--ink)', t: 'Shipped', k: 'dash' }]
      : [{ c: 'var(--actual)', t: 'Received & inspected', k: 'sq' }, { c: 'var(--plan)', t: 'Ready for construction' }]);
    $('r-note').textContent = (state.basis === 't' ? 'Gross tonnes' : 'Packages') + ' per ISO week (by inspection date)' + (view === 'cum' ? ' · cumulative' : '');
    setSeg('r-view', view);
    var cb = $('r-chart'); raf2(function () { chart(cb, sp); });
    renderRTable(list);
  }
  function grpRow(tb, name, chip, list, onClick, isTot) {
    var a = agg(list), r = el('tr', isTot ? 'tot' : 'go');
    var c0 = el('td', 'c-nm2'); if (chip) c0.appendChild(el('span', 'gchip', chip)); c0.appendChild(document.createTextNode(name)); c0.title = name; r.appendChild(c0);
    r.appendChild(el('td', '', nf(list.length))); r.appendChild(el('td', '', nf1(a.t)));
    r.appendChild(el('td', 'cum', bv(B_(a, 'insp')))); r.appendChild(el('td', '', bv(B_(a, 'READY')))); r.appendChild(el('td', '', bv(B_(a, 'PEND'))));
    r.appendChild(el('td', '', bv(B_(a, 'SITE')))); r.appendChild(el('td', '', bv(B_(a, 'AWAIT'))));
    var rt = el('td', 'rt'); rt.appendChild(pbar(share(a, 'insp'))); rt.appendChild(document.createTextNode(pc(share(a, 'insp')))); r.appendChild(rt);
    var ix = el('td', 'rt'); ix.appendChild(pbar(idx(a) == null ? null : idx(a) / 100)); ix.appendChild(document.createTextNode(idx(a) == null ? '—' : nf1(idx(a)) + '%')); r.appendChild(ix);
    var st = el('td', 'c-st'); st.appendChild(badge(lvIdx(idx(a)), lvIdx(idx(a)) === 'good' ? 'On track' : lvIdx(idx(a)) === 'warn' ? 'Warning' : 'Critical')); r.appendChild(st);
    var sk = el('td'); sk.appendChild(spark(weekly(list, function (p) { return p.inspected; }), null)); r.appendChild(sk);
    var ch = el('td', 'c-chev'); if (!isTot) ch.appendChild(chevI()); r.appendChild(ch);
    if (onClick) rowKeys(r, onClick);
    tb.appendChild(r);
  }
  function renderRTable(list) {
    var wrap = clear($('r-tbl')), t = el('table', 'lt'), hd = el('thead'), tr = el('tr'), tb = el('tbody'), srt = state.rsort;
    var info = 'Received & inspected = RFS Material Receiving and inspection date present. Ready = packing list verified + MDR approved + inspected. Values follow the basis (packages or gross tonnes).';
    if (!state.rs) {
      var lvl = !state.rb && !state.rc ? 'bc' : !state.rc ? 'c' : 'sys';
      var groups = lvl === 'bc' ? R.combos.map(function (k) { var x = k.split('|'); return { name: bcName(x[0], x[1]), chip: x[0] + '-' + x[1], list: list.filter(function (p) { return p.b === x[0] && p.c === x[1]; }), go: function () { state.rb = x[0]; state.rc = x[1]; renderP2(); } }; })
        : lvl === 'c' ? uniq(list, function (p) { return p.c; }).sort().map(function (c) { return { name: bcName(state.rb, c), chip: c, list: list.filter(function (p) { return p.c === c; }), go: function () { state.rc = c; renderP2(); } }; })
        : uniq(list, function (p) { return p.sys; }).sort().map(function (s0) { return { name: s0, chip: null, list: list.filter(function (p) { return p.sys === s0; }), go: function () { state.rs = s0; renderP2(); } }; });
      groups = groups.filter(function (g) { return g.list.length; });
      if (srt === 'ready') groups.sort(function (x, y) { return (idx(agg(y.list)) || 0) - (idx(agg(x.list)) || 0); });
      else if (srt === 'await') groups.sort(function (x, y) { return B_(agg(y.list), 'AWAIT') - B_(agg(x.list), 'AWAIT'); });
      headBack($('r-head'), lvl === 'sys' ? 'Systems' : lvl === 'c' ? 'Categories' : 'Batch · Category', groups.length + ' groups · ' + nf(list.length) + ' packages',
        lvl === 'bc' ? null : { t: lvl === 'sys' ? 'All batches & categories' : 'All batches', fn: function () { state.rb = null; state.rc = null; state.rs = null; renderP2(); } }, info);
      ['Group', 'Pkgs', 'Tonnes', 'Inspected', 'Ready', 'MDR pend.', 'On site', 'Awaiting', 'Received %', 'Readiness', 'Status', 'Weekly', ''].forEach(function (x0, i) { th(tr, x0, i === 0 ? 'c-nm2' : i === 10 ? 'c-st' : ''); });
      groups.forEach(function (g) { grpRow(tb, g.name, g.chip, g.list, g.go); });
      grpRow(tb, 'Total in view', null, list, null, true);
      $('r-tip').textContent = 'Click a row (or use Batch › Category › System) to drill down · values in ' + (state.basis === 't' ? 'gross tonnes' : 'packages');
    } else {
      headBack($('r-head'), state.rs, nf(list.length) + ' packages · ' + bcName(state.rb, state.rc), { t: 'All systems', fn: function () { state.rs = null; renderP2(); } }, info);
      heads(tr, [['Package', 'c-nm2'], ['Status', 'c-st'], ['Readiness'], ['MDR', 'c-sc'], ['RFS', 'c-code'], ['Received'], ['Location', 'c-desc'], ['G.W. (t)'], ['Type', 'c-sc'], ['']]);
      var l2 = list.slice();
      if (srt === 'ready') l2.sort(function (x, y) { return y.score - x.score; }); else if (srt === 'await') l2.sort(function (x, y) { return STO.indexOf(y.st) - STO.indexOf(x.st); });
      l2.forEach(function (p) {
        var r = el('tr', 'go'), c0 = el('td', 'c-nm2'); c0.appendChild(el('span', 'lg-mono', p.no)); c0.title = p.no + (p.desc ? ' — ' + p.desc : ''); r.appendChild(c0);
        var st = el('td', 'c-st'); st.appendChild(badge(p.lv, ST[p.st].s)); r.appendChild(st);
        var ix = el('td', 'rt'); ix.appendChild(pbar(p.score / 100)); ix.appendChild(document.createTextNode(nf(p.score))); r.appendChild(ix);
        r.appendChild(el('td', 'c-sc' + (p.mdrCr >= 1 ? '' : ' z'), MDRL[p.mdr] || p.mdr)); r.appendChild(el('td', 'c-code' + (p.rfs ? '' : ' z'), p.rfs || '—'));
        r.appendChild(el('td', p.recv != null ? '' : 'z', fdd(p.recv))); var lc0 = el('td', 'c-desc' + (p.onsite ? '' : ' z')); lc0.appendChild(locChip(p)); r.appendChild(lc0);
        r.appendChild(el('td', '', nf1(p.t))); r.appendChild(el('td', 'c-sc', p.type || '—'));
        var ch = el('td', 'c-chev'); ch.appendChild(chevI()); r.appendChild(ch);
        rowKeys(r, function () { openPackage(p.id); }); tb.appendChild(r);
      });
      $('r-tip').textContent = 'Click a package to open its detail packing list and material lines';
    }
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    setSeg('r-sort', srt);
  }

  /* ---------- 8. halaman 3: packing list (Summary › Detail › Items) ---------- */
  function openPackage(id) { state.pkg = id; state.blk = null; var p = R.byId[id]; if (p) { state.q = ''; var qi = $('p-q'); if (qi) qi.value = ''; } if (state.page === 3) renderP3(); else go(3); }
  var itemIdx = null;
  function ensureItems(done) {
    if (R.items) { done(); return; }
    var src = R.itmIn;
    if (!src) { R.items = {}; R.itemsN = 0; done(); return; }
    var p0 = typeof src === 'string' ? Promise.resolve(src) : src();
    p0.then(function (txt) { var I = parseItems(txt); R.items = I.by || {}; R.itemsN = I.n || 0; itemIdx = null; done(); })
      .catch(function (e) { R.items = {}; R.itemsN = 0; R.probs.push('Items could not be read: ' + ((e && e.message) || e)); done(); });
  }
  function itemSearchIndex() {
    if (itemIdx || !R.items) return itemIdx;
    itemIdx = {};
    Object.keys(R.items).forEach(function (did) { itemIdx[did] = U(R.items[did].map(function (it) { return it.d + ' ' + it.cn + ' ' + it.dw + ' ' + it.eq; }).join(' ')); });
    return itemIdx;
  }
  function scopeP(skip) {
    var q = U(state.q).replace(/\s+/g, ''), qi = q.length >= 3 ? itemSearchIndex() : null;
    return R.pk.filter(function (p) {
      if (state.pb && p.b !== state.pb) return false; if (state.pc && p.c !== state.pc) return false; if (state.pg && p.grp !== state.pg) return false;
      if (skip !== 'st' && state.pst !== 'ALL' && p.st !== state.pst) return false;
      if (skip !== 'loc' && !matchLoc(p, state.ploc)) return false;
      if (skip !== 'mdr' && state.pmdr !== 'ALL' && p.mdr !== state.pmdr) return false;
      if (!q) return true;
      if (p._q == null) p._q = U([p.no, p.eq, p.desc, p.cn, p.mdrNo, p.rfs, p.locN, p.grp, p.type].join(' ')).replace(/\s+/g, '');
      if (p._q.indexOf(q) > -1) return true;
      var bl = R.blkBy[p.id] || [];
      if (bl.some(function (b) { return U(b.no).replace(/\s+/g, '').indexOf(q) > -1; })) return true;
      return !!qi && bl.some(function (b) { return (qi[b.id] || '').replace(/\s+/g, '').indexOf(q) > -1; });
    });
  }
  function segRow(id, items, cur, onPick) {
    var sg = clear($(id));
    items.forEach(function (it) {
      var b = el('button', it.n ? '' : 'zero'); b.type = 'button'; b.setAttribute('data-v', it.v);
      if (it.dot) { var d = el('i', 'lg-dot'); d.style.background = it.dot; b.appendChild(d); } else if (it.icon) b.appendChild(ico(it.icon, 12));
      b.appendChild(document.createTextNode(it.t + ' ')); b.appendChild(el('b', 'lg-n', nf(it.n)));
      if (it.tip) b.title = it.tip;
      b.setAttribute('aria-pressed', (typeof cur === 'function' ? cur(it.v) : it.v === cur) ? 'true' : 'false');
      b.addEventListener('click', function () { onPick(it.v, it); });
      sg.appendChild(b);
    });
  }
  /* counts in each row follow the other filters (e.g. Laydown 4 → how many Ready / MDR pending) */
  function renderPFilters() {
    function pick(k) { return function (v) { state[k] = v; state.pkg = null; state.blk = null; state.pall = false; state.pdall = false; $('p-tbl').scrollTop = 0; renderP3(); }; }
    var lb = scopeP('loc'), cnt = function (f) { return lb.filter(f).length; }, lds = laydowns(R.pk);
    state.plocs = state.plocs.filter(function (k) { return lds.some(function (g) { return g.k === k; }); });
    if (state.ploc === 'PICK' && !state.plocs.length) state.ploc = 'ALL';
    if (['ALL', 'PICK', 'LAYDOWN', 'ONSITE', 'OFF'].indexOf(state.ploc) < 0) state.ploc = 'ALL';
    segRow('p-loc', [{ v: 'ALL', t: 'All', n: lb.length },
      { v: 'LAYDOWN', t: POSL.LAYDOWN, n: cnt(function (p) { return posOf(p) === 'LAYDOWN'; }), dot: POSC.LAYDOWN, tip: POST.LAYDOWN }]
      .concat(lds.map(function (g) { return { v: g.k, t: g.k, n: cnt(function (p) { return p.lg === g.k; }), icon: 'pin', toggle: true, tip: g.k + ' — click several laydowns to combine them (e.g. Laydown 4 + Laydown 5)' }; }))
      .concat([{ v: 'ONSITE', t: POSL.ONSITE, n: cnt(function (p) { return posOf(p) === 'ONSITE'; }), dot: POSC.ONSITE, tip: POST.ONSITE },
        { v: 'OFF', t: POSL.OFF, n: cnt(function (p) { return posOf(p) === 'OFF'; }), dot: POSC.OFF, tip: POST.OFF }]),
      function (v) { return v === state.ploc || (state.ploc === 'PICK' && state.plocs.indexOf(v) > -1); },
      function (v, it) {
        if (it && it.toggle) {
          var cur = state.ploc === 'PICK' ? state.plocs.slice() : [], k = cur.indexOf(v);
          if (k > -1) cur.splice(k, 1); else cur.push(v);
          state.plocs = cur; state.ploc = cur.length ? 'PICK' : 'ALL';
        } else { state.ploc = v; state.plocs = []; }
        state.pkg = null; state.blk = null; state.pall = false; state.pdall = false; $('p-tbl').scrollTop = 0; renderP3();
      });
    var sb = scopeP('st');
    segRow('p-status', [{ v: 'ALL', t: 'All', n: sb.length }].concat(STO.map(function (k) { return { v: k, t: ST[k].s, n: sb.filter(function (p) { return p.st === k; }).length, dot: ST[k].c, tip: ST[k].n }; })), state.pst, pick('pst'));
    var mb = scopeP('mdr'), ms = MDRO.filter(function (k) { return R.pk.some(function (p) { return p.mdr === k; }); });
    R.pk.forEach(function (p) { if (ms.indexOf(p.mdr) < 0) ms.push(p.mdr); });
    if (state.pmdr !== 'ALL' && ms.indexOf(state.pmdr) < 0) state.pmdr = 'ALL';
    segRow('p-mdr', [{ v: 'ALL', t: 'All', n: mb.length }].concat(ms.map(function (k) { return { v: k, t: MDRL[k] || k, n: mb.filter(function (p) { return p.mdr === k; }).length, dot: (MDRC[k] || ['var(--muted)'])[0] }; })), state.pmdr, pick('pmdr'));
  }
  function renderPSteps() {
    var box = $('p-steps'), all = R.pk, bs = uniq(all, function (p) { return p.b; }).sort();
    var inB = all.filter(function (p) { return !state.pb || p.b === state.pb; }), cs = uniq(inB, function (p) { return p.c; }).sort();
    var inC = inB.filter(function (p) { return !state.pc || p.c === state.pc; }), gs = uniq(inC, function (p) { return p.grp || null; }).sort();
    function pick(b, c, g) { state.pb = b; state.pc = c; state.pg = g; state.pkg = null; state.blk = null; state.pall = false; $('p-tbl').scrollTop = 0; renderP3(); }
    stepBar(box, [
      { name: 'Batch', plural: 'Batches', icon: 'ship', set: !!state.pb, on: false, val: state.pb ? bcName(state.pb) : 'All',
        all: { sub: 'Batch 4 + Batch 5', n: nf(all.length) + ' pkgs', r: idx(agg(all)) / 100, lv: lvIdx(idx(agg(all))) },
        opts: function () { return bs.map(function (b) { var l = all.filter(function (p) { return p.b === b; }); return optOf(l, bcName(b), uniq(l, function (p) { return p.c; }).sort().join(' · '), b, state.pb === b); }); },
        pick: function (id) { pick(id, null, null); } },
      { name: 'Category', plural: 'Categories', icon: 'layers', set: !!state.pc, on: !state.pc && !!state.pb, val: state.pc || 'All · ' + cs.length,
        all: { sub: state.pb ? bcName(state.pb) : 'All batches', n: nf(inB.length) + ' pkgs', r: idx(agg(inB)) / 100, lv: lvIdx(idx(agg(inB))) },
        opts: function () { return cs.map(function (c) { var l = inB.filter(function (p) { return p.c === c; }); return optOf(l, c, bcName(state.pb, c), c, state.pc === c); }); },
        pick: function (id) { pick(state.pb, id, null); } },
      { name: 'Package group', plural: 'Groups', icon: 'tree', set: !!state.pg, on: !state.pg && !!state.pc, val: state.pg || 'All · ' + gs.length,
        all: { sub: bcName(state.pb, state.pc), n: nf(inC.length) + ' pkgs', r: idx(agg(inC)) / 100, lv: lvIdx(idx(agg(inC))) },
        opts: function () { return gs.map(function (g) { var l = inC.filter(function (p) { return p.grp === g; }); return optOf(l, g, l[0] ? l[0].sys : '', g, state.pg === g); }); },
        pick: function (id) { pick(state.pb, state.pc, id); } }
    ], 'Readiness index', state.pb || state.pc || state.pg ? function () { pick(null, null, null); } : null);
  }
  function renderP3() {
    renderPFilters(); renderPSteps();
    var p = state.pkg ? R.byId[state.pkg] : null;
    if (state.pkg && !p) state.pkg = null;
    var kb = clear($('p-kpi'));
    if (!p) {
      var list = scopeP(), a = agg(list), nb = 0, ns = 0, nl = 0, ni = 0, nh = 0;
      list.forEach(function (x) { var bl = R.blkBy[x.id] || []; nb += bl.length; ns += x.split || 0; nl += x.lines || 0; ni += x.openN; if (x.maxSev === 'HIGH') nh++; });
      $('p-title').textContent = state.q ? 'Search: ' + state.q : filtName() ? filtName() + (state.pb || state.pc ? ' · ' + bcName(state.pb, state.pc) : '') : state.pg ? state.pg + ' · ' + bcName(state.pb, state.pc) : state.pb || state.pc ? bcName(state.pb, state.pc) : 'All packages';
      kb.appendChild(statCard('box', 'Packages', nf(list.length), '', [nf1(a.t) + ' t gross · ' + nf1(list.reduce(function (s0, x) { return s0 + (x.vol || 0); }, 0)) + ' m³']));
      kb.appendChild(statCard('split', 'Detail blocks', nf(nb), '', [ns ? nf(ns) + ' split sub-packages' : 'one block per package']));
      kb.appendChild(statCard('list', 'Material lines', nf(nl), '', ['in the linked detail packing lists']));
      kb.appendChild(statCard('alert', 'Open issues', nf(ni), '', [nh ? badge('crit', nf(nh) + ' pkgs with HIGH') : 'on these packages · no HIGH']));
      if (state.pview === 'dwg') renderDwg(list); else renderPList(list);
    } else {
      $('p-title').textContent = p.no;
      kb.appendChild(statCard('gauge', 'Readiness', nf(p.score), '/ 100', [badge(p.lv, ST[p.st].s)]));
      kb.appendChild(statCard('doc', 'MDR', MDRL[p.mdr] || p.mdr, '', [p.mdrNo || 'no MDR number']));
      kb.appendChild(statCard('pin', 'Site', p.recv != null ? fdd(p.recv) : p.onsite ? 'On site' : 'Not received', '', [p.locN + (p.rfs ? ' · ' + p.rfs : '')]));
      kb.appendChild(statCard('weight', 'Package', nf1(p.t), 't', [(p.type || '—') + ' · ' + nf(p.L) + ' × ' + nf(p.W) + ' × ' + nf(p.H) + ' mm']));
      ensureItems(function () { if (state.pkg === p.id && state.page === 3) renderPkg(p); });
      renderPkg(p);
    }
    setSeg('p-sort', state.psort); $('p-sort').style.visibility = p ? 'hidden' : '';
    setSeg('p-view', state.pview); $('p-view').style.display = p ? 'none' : '';
  }
  function renderPList(list) {
    var wrap = clear($('p-tbl')), t = el('table', 'lt'), hd = el('thead'), tr = el('tr'), tb = el('tbody'), srt = state.psort;
    headBack($('p-head'), 'Summary Packing List', nf(list.length) + ' packages' + (filtName() ? ' · ' + filtName() : '') + (state.q ? ' matching "' + state.q + '"' : ''), resetBack(),
      'One row per Summary package. Readiness is computed here from the packing-list link, MDR status, site tag / laydown and RFS + inspection date (rules in the settings block).');
    heads(tr, [['Package', 'c-nm2'], ['B · Cat', 'c-code'], ['Status', 'c-st'], ['Readiness'], ['MDR', 'c-sc'], ['Inspected'], ['Location', 'c-desc'], ['G.W. (t)'], ['System', 'c-desc'], ['']]);
    var l2 = sortList(list);
    var cap = state.pall ? l2.length : Math.min(l2.length, 300);
    l2.slice(0, cap).forEach(function (p) {
      var r = el('tr', 'go'), c0 = el('td', 'c-nm2'); if (p.grp) c0.appendChild(el('span', 'gchip', p.grp)); c0.appendChild(el('span', 'lg-mono', p.no)); c0.title = p.no + (p.desc ? ' — ' + p.desc : ''); r.appendChild(c0);
      r.appendChild(el('td', 'c-code', p.b + ' · ' + p.c));
      var st = el('td', 'c-st'); st.appendChild(badge(p.lv, ST[p.st].s)); r.appendChild(st);
      var ix = el('td', 'rt'); ix.appendChild(pbar(p.score / 100)); ix.appendChild(document.createTextNode(nf(p.score))); r.appendChild(ix);
      r.appendChild(el('td', 'c-sc' + (p.mdrCr >= 1 ? '' : ' z'), MDRL[p.mdr] || p.mdr));
      var ins = el('td', p.recv != null ? '' : 'z', p.recv != null ? fdate(p.recv) : p.inspected ? 'Inspected' : p.rfs ? 'RFS only' : '—'); if (p.rfs) ins.title = 'RFS ' + p.rfs + (p.insp ? ' · inspection ' + p.insp : ''); r.appendChild(ins);
      var lc = el('td', 'c-desc' + (p.onsite ? '' : ' z')); lc.appendChild(locChip(p)); r.appendChild(lc); r.appendChild(el('td', '', nf1(p.t))); r.appendChild(el('td', 'c-desc', p.sys));
      var ch = el('td', 'c-chev'); ch.appendChild(chevI()); r.appendChild(ch);
      rowKeys(r, function () { state.pkg = p.id; state.blk = null; renderP3(); $('p-tbl').scrollTop = 0; });
      tb.appendChild(r);
    });
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    if (cap < l2.length) { var mb = el('div', 'lg-more'), b = el('button', 'upb'); b.type = 'button'; b.appendChild(ico('list', 12)); b.appendChild(document.createTextNode('Show all ' + nf(l2.length) + ' packages')); b.addEventListener('click', function () { state.pall = true; renderPList(list); }); mb.appendChild(b); wrap.appendChild(mb); }
    $('p-tip').textContent = 'Click a package for its gates, detail blocks and material lines · search also finds detail package numbers and item drawings / descriptions';
  }
  function gateBox(cls, icn, k, v, s0) { var g = el('div', 'g ' + cls), kk = el('div', 'k'); kk.appendChild(ico(icn, 12)); kk.appendChild(document.createTextNode(k)); g.appendChild(kk); g.appendChild(el('div', 'v', v)); g.appendChild(el('div', 's', s0)); g.title = v + ' — ' + s0; return g; }
  function renderPkg(p) {
    var wrap = clear($('p-tbl')), blocks = (R.blkBy[p.id] || []).slice().sort(function (x, y) { return (x.parent ? 1 : 0) - (y.parent ? 1 : 0) || String(x.src).localeCompare(String(y.src), undefined, { numeric: true }); });
    var b0 = state.blk ? blocks.filter(function (b) { return b.id === state.blk; })[0] : (blocks.length === 1 ? blocks[0] : null);
    headBack($('p-head'), b0 && blocks.length > 1 ? b0.no : p.no, b0 ? (b0.items != null ? nf(b0.items) + ' material lines' : 'material lines') + ' · ' + (b0.inv ? 'invoice ' + b0.inv : '') : blocks.length + ' detail block(s) · ' + (p.desc || ''),
      { t: b0 && blocks.length > 1 ? 'All blocks of ' + p.no.replace(/^P\d+-[A-Z]+-\d+-/, '') : 'All packages', fn: function () { if (b0 && blocks.length > 1) { state.blk = null; renderP3(); } else { state.pkg = null; state.blk = null; renderP3(); } } },
      'Gates: packing list ' + nf(GW.PL) + ' · MDR ' + nf(GW.MDR) + ' · site ' + nf(GW.SITE) + ' · inspection ' + nf(GW.INSP) + ' points.\nNext action: ' + p.act + (p.src ? '\nSource: ' + p.src : ''));
    dwgActions($('p-head'), [p], true);
    var gs = el('div', 'gstrip');
    gs.appendChild(gateBox(p.pl ? 'ok' : 'no', 'list', 'Packing list', p.pl ? 'Verified' : 'Not verified', nf(p.links || 0) + ' detail block(s) · ' + (p.map || '—')));
    gs.appendChild(gateBox(p.mdrCr >= 1 ? 'ok' : p.mdrCr > 0 ? 'part' : 'no', 'doc', 'MDR', MDRL[p.mdr] || p.mdr, p.mdrNo || 'no MDR number'));
    gs.appendChild(gateBox(p.onsite ? 'ok' : 'no', 'pin', 'Site', p.onsite ? p.lg : OFFSITE, p.onsite ? [p.ev, p.locSrc ? p.locSrc + ': ' + p.loc : null].filter(Boolean).join(' · ') : 'no RFS, site tag or laydown remark'));
    gs.appendChild(gateBox(p.inspected ? 'ok' : p.rfs ? 'part' : 'no', 'check', 'Inspection', p.inspected ? fdd(p.recv) : p.rfs ? 'RFS raised' : 'No RFS', p.rfs || (p.insp || '—')));
    wrap.appendChild(gs);
    var na = el('div', 'lg-next'); na.innerHTML = '<b>Next action:</b> ' + esc(p.act) + (p.note ? '<br><span class="lg-sub">Site note: ' + esc(p.note) + '</span>' : '') + (p.openN ? '<br><span class="lg-sub">' + nf(p.openN) + ' open issue(s) — see Exceptions.</span>' : '');
    wrap.appendChild(na);
    var t = el('table', 'lt'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    if (!b0) {
      heads(tr, [['Detail package', 'c-nm2'], ['Sub', 'c-code'], ['Mapping', 'c-st'], ['Type', 'c-sc'], ['G.W. (kg)'], ['Lines'], ['Line wt (kg)'], ['Invoice', 'c-code'], ['Source', 'c-sc'], ['']]);
      if (!blocks.length) { var er = el('tr'), ec = el('td', 'z', 'No detail block is linked to this package — see Exceptions.'); ec.colSpan = 10; er.appendChild(ec); tb.appendChild(er); }
      blocks.forEach(function (b) {
        var r = el('tr', 'go' + (b.parent ? ' child' : '')), c0 = el('td', 'c-nm2'); c0.appendChild(el('span', 'lg-mono', b.no)); r.appendChild(c0);
        r.appendChild(el('td', 'c-code', b.sub || (b.sp ? 'parent' : '—')));
        var st = el('td', 'c-st'); st.appendChild(badge(/EXACT|NORMALIZED|CONFIRMED/i.test(b.map) ? 'good' : /SPLIT/i.test(b.map) ? '' : 'warn', (b.map || '—').replace(/_/g, ' ').toLowerCase())); r.appendChild(st);
        r.appendChild(el('td', 'c-sc', b.type || '—')); r.appendChild(el('td', '', nf1(b.gw)));
        r.appendChild(el('td', '', nf(b.items))); r.appendChild(el('td', '', nf1(b.iw))); r.appendChild(el('td', 'c-code', b.inv || '—'));
        r.appendChild(el('td', 'c-sc z', b.src || '')); var ch = el('td', 'c-chev'); ch.appendChild(chevI()); r.appendChild(ch);
        rowKeys(r, function () { state.blk = b.id; renderP3(); }); tb.appendChild(r);
      });
      $('p-tip').textContent = blocks.length > 1 ? 'Split package: the parent block lists its sub-packages · click a block for its material lines' : 'Click the block for its material lines';
    } else {
      heads(tr, [['#'], ['S/N', 'c-code'], ['Description', 'lg-wrap'], ['Qty'], ['Unit', 'c-sc'], ['Unit wt'], ['Total wt'], ['Equipment', 'c-code'], ['Drawing', 'c-code']].concat(FD ? [['Foundation · status', 'c-desc']] : []).concat([['Remark', 'lg-wrap']]));
      if (!R.items) { var lr = el('tr'), lc = el('td', 'z', 'Loading material lines…'); lc.colSpan = 10; lr.appendChild(lc); tb.appendChild(lr); }
      else {
        var its = R.items[b0.id] || [];
        if (!its.length) { var nr0 = el('tr'), nc = el('td', 'z', R.itemsN ? 'No material lines for this block.' : 'Material lines are not loaded (tab "' + cfg.tabitem + '" / embedded items).'); nc.colSpan = 10; nr0.appendChild(nc); tb.appendChild(nr0); }
        its.forEach(function (it) {
          var r = el('tr'); r.appendChild(el('td', 'z', nf(it.ln))); r.appendChild(el('td', 'c-code', it.sn || '—'));
          var d = el('td', 'lg-wrap lg-strong'); d.appendChild(document.createTextNode(it.d || '—')); if (it.cn) d.appendChild(el('span', 'lg-cn', it.cn)); if (it.sp) d.appendChild(el('span', 'lg-cn', it.sp)); if (/sub/i.test(it.ty)) d.appendChild(badge('', 'Sub-package ref')); r.appendChild(d);
          r.appendChild(el('td', '', it.q == null ? '—' : num(it.q, it.q % 1 ? 2 : 0))); r.appendChild(el('td', 'c-sc', it.u || '—'));
          r.appendChild(el('td', '', it.uw == null ? '—' : num(it.uw, 2))); r.appendChild(el('td', 'cum', it.tw == null ? '—' : num(it.tw, 2)));
          r.appendChild(el('td', 'c-code', it.eq || '—')); r.appendChild(el('td', 'c-code', it.dw || '—')); if (FD) { var fc = el('td', 'c-desc'); fdCell(fc, it.dw); r.appendChild(fc); } r.appendChild(el('td', 'lg-wrap lg-res', it.rm || ''));
          tb.appendChild(r);
        });
      }
      $('p-tip').textContent = 'Material lines exactly as in the detail packing list · weights are item weights, not package weights';
    }
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
  }
  /* ---------- 8b. drawing list: every material line (drawing number) of the filtered packages — screen, print (A4), Excel ---------- */
  function resetBack() {
    return state.pb || state.pc || state.pg || filtName() || state.q ? { t: 'All packages', fn: function () { state.pb = state.pc = state.pg = null; state.pst = 'ALL'; state.ploc = 'ALL'; state.plocs = []; state.pmdr = 'ALL'; state.q = ''; $('p-q').value = ''; state.pall = false; state.pdall = false; renderP3(); } } : null;
  }
  function sortList(list) {
    var l2 = list.slice(), srt = state.psort;
    if (srt === 'score') l2.sort(function (x, y) { return x.score - y.score || x.i - y.i; }); else if (srt === 'gw') l2.sort(function (x, y) { return (y.gw || 0) - (x.gw || 0); });
    return l2;
  }
  function blocksOf(p) { return (R.blkBy[p.id] || []).slice().sort(function (x, y) { return (x.parent ? 1 : 0) - (y.parent ? 1 : 0) || String(x.src).localeCompare(String(y.src), undefined, { numeric: true }); }); }
  function linesOf(p) {                     /* material lines of every detail block (sub-package references of split parents left out) */
    var out = [];
    blocksOf(p).forEach(function (b) { ((R.items || {})[b.id] || []).forEach(function (it) { if (!/sub/i.test(it.ty)) out.push({ b: b, it: it }); }); });
    return out;
  }
  function dwgStats(list) { var n = 0, d = {}; list.forEach(function (p) { linesOf(p).forEach(function (x) { n++; if (x.it.dw) d[x.it.dw] = 1; }); }); return { lines: n, dwg: Object.keys(d).length }; }
  function pkgMeta(p, n) {
    return [p.b + '-' + p.c, p.onsite ? p.lg : OFFSITE, ST[p.st].s, 'MDR ' + (MDRL[p.mdr] || p.mdr) + (p.mdrNo ? ' ' + p.mdrNo : ''),
      p.recv != null ? 'inspected ' + fdate(p.recv) : '', p.rfs ? 'RFS ' + p.rfs : '', nf1(p.t) + ' t', nf(n) + ' line' + (n === 1 ? '' : 's')].filter(Boolean);
  }
  function filtText() {
    return [state.pb ? bcName(state.pb) : '', state.pc || '', state.pg ? 'group ' + state.pg : '', filtName(), state.q ? 'search "' + state.q + '"' : ''].filter(Boolean).join(' · ') || 'All packages';
  }
  function pages(stt, n, compact) { return Math.max(1, Math.ceil(compact ? (n * 1.6 + stt.lines / 6) / 33 : (stt.lines + n * 2.5) / 30)); }
  function dwgActions(box, list, one) {
    var stt = R.items ? dwgStats(list) : null;
    var pb = el('button', 'upb lg-act'); pb.type = 'button'; pb.appendChild(ico('print', 12)); pb.appendChild(document.createTextNode(one ? 'Print drawings' : 'Print list'));
    pb.title = 'Print every material line with its drawing number · A4 landscape · ' + nf(list.length) + ' package(s)' + (stt ? ' · ' + nf(stt.lines) + ' lines · about ' + nf(pages(stt, list.length)) + ' page(s)' : '') + '\nTip: choose "Save as PDF" to keep a file.';
    pb.addEventListener('click', function () { printDwg(list); });
    box.appendChild(pb);
    if (!one) {
      var cb = el('button', 'upb lg-act'); cb.type = 'button'; cb.appendChild(ico('print', 12)); cb.appendChild(document.createTextNode('Print compact'));
      cb.title = 'One line per package with all its drawing numbers · about ' + nf(pages(stt || { lines: 0 }, list.length, true)) + ' page(s)';
      cb.addEventListener('click', function () { printDwg(list, true); });
      box.appendChild(cb);
    }
    var xb = el('button', 'upb lg-act'); xb.type = 'button'; xb.appendChild(ico('dl', 12)); xb.appendChild(document.createTextNode('Excel'));
    xb.title = 'Download the same list as an Excel file (.xlsx): one row per material line with its drawing number';
    xb.addEventListener('click', function () { xlsxDwg(list); });
    box.appendChild(xb);
  }
  function renderDwg(list) {
    var wrap = clear($('p-tbl'));
    if (!R.items) { wrap.appendChild(el('div', 'd-empty', 'Loading material lines…')); ensureItems(function () { if (state.page === 3 && state.pview === 'dwg' && !state.pkg) renderP3(); }); return; }
    var l2 = sortList(list), stt = dwgStats(l2), q = U(state.q).replace(/\s+/g, '');
    headBack($('p-head'), 'Drawing list', nf(l2.length) + ' packages · ' + nf(stt.lines) + ' material lines · ' + nf(stt.dwg) + ' drawing numbers', resetBack(),
      'Every material line of the packages in the current filter (position, status, MDR, batch, category, group, search), exactly as in the detail packing lists. Print it (A4) or download it for the site team.');
    dwgActions($('p-head'), l2);
    var t = el('table', 'lt lg-dwg'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    var nc = FD ? 9 : 8;
    heads(tr, [['S/N', 'c-code'], ['Description', 'lg-wrap'], ['Drawing No', 'c-code']].concat(FD ? [['Foundation · status', 'c-desc']] : []).concat([['Equipment', 'c-code'], ['Qty'], ['Unit', 'c-sc'], ['Total wt (kg)'], ['Detail package · remark', 'lg-wrap']]));
    var cap = state.pdall ? l2.length : Math.min(l2.length, 40);
    l2.slice(0, cap).forEach(function (p) {
      var ls = linesOf(p), split = (R.blkBy[p.id] || []).length > 1, r = el('tr', 'lg-pkr go'), c = el('td');
      c.colSpan = nc; c.appendChild(el('span', 'lg-pkno', p.no)); c.appendChild(locChip(p)); c.appendChild(badge(p.lv, ST[p.st].s));
      c.appendChild(el('span', 'lg-pkmeta', pkgMeta(p, ls.length).slice(3).join(' · '))); r.appendChild(c); r.title = 'Open ' + p.no;
      rowKeys(r, function () { state.pkg = p.id; state.blk = null; renderP3(); $('p-tbl').scrollTop = 0; }); tb.appendChild(r);
      if (!ls.length) { var e = el('tr'), ec = el('td', 'z', 'No material lines in the detail packing list.'); ec.colSpan = nc; e.appendChild(ec); tb.appendChild(e); }
      ls.forEach(function (x) {
        var it = x.it, rr = el('tr', q.length >= 3 && U([it.dw, it.d, it.cn, it.eq].join(' ')).replace(/\s+/g, '').indexOf(q) > -1 ? 'hit' : '');
        rr.appendChild(el('td', 'c-code', it.sn || '—'));
        var d = el('td', 'lg-wrap'); d.appendChild(document.createTextNode(it.d || '—')); if (it.cn) d.appendChild(el('span', 'lg-cn', it.cn)); if (it.sp) d.appendChild(el('span', 'lg-cn', it.sp)); rr.appendChild(d);
        rr.appendChild(el('td', 'c-code lg-dw', it.dw || '—')); if (FD) { var fc = el('td', 'c-desc'); fdCell(fc, it.dw); rr.appendChild(fc); } rr.appendChild(el('td', 'c-code', it.eq || '—'));
        rr.appendChild(el('td', '', it.q == null ? '—' : num(it.q, it.q % 1 ? 2 : 0))); rr.appendChild(el('td', 'c-sc', it.u || '—'));
        rr.appendChild(el('td', '', it.tw == null ? '—' : num(it.tw, 1)));
        rr.appendChild(el('td', 'lg-wrap lg-res', [split ? x.b.no : '', it.rm].filter(Boolean).join(' · ')));
        tb.appendChild(rr);
      });
    });
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    if (cap < l2.length) { var mb = el('div', 'lg-more'), b = el('button', 'upb'); b.type = 'button'; b.appendChild(ico('list', 12)); b.appendChild(document.createTextNode('Show all ' + nf(l2.length) + ' packages on screen')); b.addEventListener('click', function () { state.pdall = true; renderDwg(list); }); mb.appendChild(b); wrap.appendChild(mb); }
    $('p-tip').textContent = 'Print and Excel take every package of the filter: ' + nf(l2.length) + ' packages · ' + nf(stt.lines) + ' material lines (print list ≈ ' + nf(pages(stt, l2.length)) + ' A4 pages, compact ≈ ' + nf(pages(stt, l2.length, true)) + ') · click a package row to open it';
  }
  function docShell(sub, stats, colgroup, thead, body, extraCss, o) {
    o = o || {};
    var d0 = new Date(), stamp = d0.getDate() + ' ' + MS[d0.getMonth()] + ' ' + d0.getFullYear() + ' ' + ('0' + d0.getHours()).slice(-2) + ':' + ('0' + d0.getMinutes()).slice(-2);
    var ttl = (cfg.judul || 'Logistics Readiness') + ' — ' + (o.t || 'Drawing list');
    var css = '@page{size:A4 landscape;margin:10mm 10mm 12mm;@bottom-left{content:"' + esc(ttl).replace(/"/g, '') + '";font:7.5pt Arial,sans-serif;color:#6b7770}@bottom-right{content:"Page " counter(page) " / " counter(pages);font:7.5pt Arial,sans-serif;color:#6b7770}}' +
      '*{box-sizing:border-box}body{margin:0;font:8.6pt/1.32 "Segoe UI",Inter,Arial,sans-serif;color:#1e2b25;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'header{display:flex;justify-content:space-between;align-items:flex-end;gap:16pt;border-bottom:2px solid #263d33;padding-bottom:5pt;margin-bottom:6pt}h1{margin:0;font-size:14pt}' +
      'header p{margin:2pt 0 0;color:#33413a;font-weight:600}header .r{text-align:right;color:#4a5750;font-size:8pt;white-space:nowrap}' +
      'table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}' +
      'th{font-size:7pt;letter-spacing:.05em;text-transform:uppercase;text-align:left;color:#3a4741;background:#e9eee8;border-bottom:1px solid #263d33;padding:3pt 4pt}' +
      'td{padding:2pt 4pt;border-bottom:.6pt solid #dfe5de;vertical-align:top;overflow-wrap:anywhere}tr{break-inside:avoid}td.n{text-align:right;white-space:nowrap}' +
      'small{color:#6b7770;font-size:7.4pt}.z{color:#8a958f}footer{margin-top:6pt;color:#6b7770;font-size:7.5pt}@media screen{body{padding:18px;max-width:1300px;margin:0 auto}}' + (extraCss || '');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc((o.t || 'Drawing list') + ' — ' + sub) + '</title><style>' + css + '</style></head><body>' +
      '<header><div><h1>' + esc(ttl) + '</h1><p>' + esc(sub) + '</p></div><div class="r">Data date ' + esc(fdate(R.dd)) + '<br>' + stats + '<br>Printed ' + esc(stamp) + '</div></header>' +
      (o.raw || '<table>' + colgroup + '<thead><tr>' + thead.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>' + body + '</table>') +
      '<footer>' + (o.foot || 'Material lines exactly as in the detail packing lists (Logistics ETL) · Position = Summary Remark column (U / T) and site tags (V / W) · weights are item weights.') + '</footer></body></html>';
  }
  function cols(ws) { return '<colgroup>' + ws.map(function (w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup>'; }
  function dwgDoc(list, compact) {
    var stt = dwgStats(list), sub = list.length === 1 ? list[0].no : filtText(), rows = [];
    var stats = nf(list.length) + ' package(s) · ' + nf(stt.lines) + ' material lines · ' + nf(stt.dwg) + ' drawing numbers';
    if (compact) {                                           /* drawing index: one line per package with all its drawing numbers */
      list.forEach(function (p) {
        var ls = linesOf(p), seen = {}, ds = [];
        ls.forEach(function (x) { var d = x.it.dw; if (d && !seen[d]) { seen[d] = 1; ds.push(d); } });
        rows.push('<tr class="ix"><td><b>' + esc(p.no) + '</b><small>' + esc(p.b + '-' + p.c + (p.desc ? ' · ' + p.desc : '')) + '</small></td><td>' + esc(p.onsite ? p.lg : OFFSITE) + '</td><td>' + esc(ST[p.st].s) +
          '<small>MDR ' + esc((MDRL[p.mdr] || p.mdr) + (p.mdrNo ? ' ' + p.mdrNo : '')) + '</small></td><td>' + (p.recv != null ? esc(fdate(p.recv)) : '—') + (p.rfs ? '<small>' + esc(p.rfs) + '</small>' : '') + '</td><td class="n">' + nf(ls.length) +
          '</td><td class="ds">' + (ds.length ? ds.map(function (d) { return '<span>' + esc(d) + '</span>'; }).join('') : '<i class="z">no drawing number</i>') + '</td></tr>');
      });
      return docShell(sub + ' · compact', stats, cols([15, 8, 11, 9, 4, 53]), ['Package', 'Laydown / position', 'Status · MDR', 'Inspected · RFS', 'Lines', 'Drawing numbers'], '<tbody>' + rows.join('') + '</tbody>',
        'tr.ix{break-inside:auto}tr.ix td{padding:3pt 4pt}tr.ix b{font:700 8.6pt Consolas,"Courier New",monospace;display:block}tr.ix small{display:block}' +
        'td.ds{line-height:1.45}td.ds span{display:inline-block;margin:0 8pt 0 0;font:700 7.8pt Consolas,"Courier New",monospace;white-space:nowrap}');
    }
    var nc = FD ? 9 : 8;
    list.forEach(function (p) {
      var ls = linesOf(p), split = (R.blkBy[p.id] || []).length > 1;
      rows.push('<tbody><tr class="pk"><td colspan="' + nc + '"><b>' + esc(p.no) + '</b><span>' + esc(pkgMeta(p, ls.length).join('  ·  ')) + '</span>' + (p.desc ? '<em>' + esc(p.desc + (p.eq ? ' · ' + p.eq : '')) + '</em>' : '') + '</td></tr>');
      if (!ls.length) rows.push('<tr><td colspan="' + nc + '" class="z">No material lines in the detail packing list.</td></tr>');
      ls.forEach(function (x) {
        var it = x.it, fx = FD ? fdOf(it.dw) : null;
        rows.push('<tr class="it"><td>' + esc(it.sn) + '</td><td>' + esc(it.d) + (it.cn ? ' <small>' + esc(it.cn) + '</small>' : '') + (it.sp ? ' <small>' + esc(it.sp) + '</small>' : '') + '</td><td class="dw">' + esc(it.dw || '—') +
          (FD ? '</td><td>' + (fx ? '<b class="fa">' + esc(fx.k) + '</b> ' + (fx.fs.length ? '<i class="fs" style="background:' + fMeta(fx.st).c + '"></i>' : '') + esc(fx.fs.length || fx.seg ? fx.st : 'not in register') : '') : '') +
          '</td><td>' + esc(it.eq) + '</td><td class="n">' + (it.q == null ? '' : num(it.q, it.q % 1 ? 2 : 0)) + '</td><td>' + esc(it.u) + '</td><td class="n">' + (it.tw == null ? '' : num(it.tw, 1)) +
          '</td><td>' + esc([split ? x.b.no : '', it.rm].filter(Boolean).join(' · ')) + '</td></tr>');
      });
      rows.push('</tbody>');
    });
    return docShell(sub, stats, FD ? cols([5, 25, 15, 15, 7, 5, 4, 7, 17]) : cols([5, 31, 17, 7, 6, 5, 8, 21]), ['S/N', 'Description', 'Drawing No'].concat(FD ? ['Foundation · status'] : []).concat(['Equipment', 'Qty', 'Unit', 'Total wt (kg)', 'Detail package · remark']), rows.join(''),
      'tr.pk td{background:#eef3ec;border-top:1.2pt solid #263d33;padding:4pt}tr.pk b{font:700 9.6pt Consolas,"Courier New",monospace;margin-right:8pt}tr.pk span{color:#33413a}' +
      'tr.pk em{display:block;font-style:normal;color:#5d6a63;font-size:7.8pt}td.dw{font:700 8.4pt Consolas,"Courier New",monospace}' +
      'b.fa{font:700 7.8pt Consolas,"Courier New",monospace}i.fs{display:inline-block;width:6.5pt;height:6.5pt;border-radius:1.5pt;margin:0 3pt 0 2pt;vertical-align:-.5pt}');
  }
  function dwgMsg(t) { var x = $('p-tip'); if (x) x.textContent = t; }
  function printDwg(list, compact) {
    if (!R.items) { ensureItems(function () { printDwg(list, compact); }); return; }
    printHtml(dwgDoc(list, compact));
  }
  function printHtml(html) {                /* print from a hidden frame; if the website blocks it, from a new window */
    var fr = document.createElement('iframe'), done = false;
    fr.setAttribute('aria-hidden', 'true'); fr.setAttribute('tabindex', '-1');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(fr);
    var w = fr.contentWindow;
    try { w.document.open(); w.document.write(html); w.document.close(); } catch (e) { fr.parentNode.removeChild(fr); popupHtml(html); return; }
    setTimeout(function () {
      try { w.addEventListener('beforeprint', function () { done = true; }); w.focus(); w.print(); } catch (e) {}
      setTimeout(function () { if (!done) popupHtml(html); }, 500);
      setTimeout(function () { if (fr.parentNode) fr.parentNode.removeChild(fr); }, 60000);
    }, 250);
  }
  function popupHtml(html) {
    var w = null; try { w = window.open('', '_blank'); } catch (e) {}
    if (!w) { dwgMsg('This website blocks printing from the dashboard — use "Excel", or open the dashboard in its own tab and print again.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 600);
  }
  /* Excel (.xlsx) written here: a small zip (stored) with one worksheet — no library, works offline */
  var CRC = null;
  function crc32(u) {
    if (!CRC) { CRC = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
    var x = -1; for (var i = 0; i < u.length; i++) x = CRC[(x ^ u[i]) & 255] ^ (x >>> 8); return (x ^ -1) >>> 0;
  }
  function deflate(u) {
    if (!window.CompressionStream || !window.Response || !window.Blob) return Promise.resolve(null);
    try { return new Response(new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer().then(function (x) { return new Uint8Array(x); }, function () { return null; }); }
    catch (e) { return Promise.resolve(null); }
  }
  function zipFiles(files, type) {             /* zip: deflate where the browser can, otherwise stored */
    return Promise.all(files.map(function (f) { return deflate(f.d); })).then(function (zs) {
      var parts = [], cen = [], off = 0;
      files.forEach(function (f, i) {
        var z = zs[i] && zs[i].length < f.d.length ? zs[i] : null, dat = z || f.d, m = z ? 8 : 0;
        var nm = new TextEncoder().encode(f.n), c = crc32(f.d), h = new DataView(new ArrayBuffer(30)), e = new DataView(new ArrayBuffer(46));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, m, true); h.setUint16(12, 0x21, true);
        h.setUint32(14, c, true); h.setUint32(18, dat.length, true); h.setUint32(22, f.d.length, true); h.setUint16(26, nm.length, true);
        e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint16(10, m, true); e.setUint16(14, 0x21, true);
        e.setUint32(16, c, true); e.setUint32(20, dat.length, true); e.setUint32(24, f.d.length, true); e.setUint16(28, nm.length, true); e.setUint32(42, off, true);
        parts.push(new Uint8Array(h.buffer), nm, dat); cen.push(new Uint8Array(e.buffer), nm);
        off += 30 + nm.length + dat.length;
      });
      var csz = cen.reduce(function (s0, x) { return s0 + x.length; }, 0), end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csz, true); end.setUint32(16, off, true);
      return new Blob(parts.concat(cen, [new Uint8Array(end.buffer)]), { type: type });
    });
  }
  function xEsc(v) { return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function colL(i) { var s0 = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s0 = String.fromCharCode(65 + (i - 1) % 26) + s0; return s0; }
  function xlsxBlob(sheet, rows, widths) { return xlsxBook([{ n: sheet, r: rows, w: widths }]); }
  function xlsxBook(sh) {                    /* .xlsx with one or more sheets: inline strings, bold header, frozen row 1, autofilter */
    var NSM = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      PNS = 'http://schemas.openxmlformats.org/package/2006/relationships', CT = 'application/vnd.openxmlformats-', X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    function sheetXml(s0) {
      var rows = s0.r, last = colL(rows[0].length - 1), data = rows.map(function (r, ri) {
        var cells = '';
        r.forEach(function (v, ci) {
          if (v == null || v === '') return;
          var ref = colL(ci) + (ri + 1), st = ri ? '' : ' s="1"';
          cells += typeof v === 'number' && isFinite(v) ? '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>' : '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xEsc(v) + '</t></is></c>';
        });
        return '<row r="' + (ri + 1) + '">' + cells + '</row>';
      }).join('');
      return X + '<worksheet xmlns="' + NSM + '"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
        '<cols>' + s0.w.map(function (wd, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + wd + '" customWidth="1"/>'; }).join('') + '</cols>' +
        '<sheetData>' + data + '</sheetData><autoFilter ref="A1:' + last + rows.length + '"/></worksheet>';
    }
    var files = [
      ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="' + CT + 'package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="' + CT + 'officedocument.spreadsheetml.sheet.main+xml"/>' +
        sh.map(function (s0, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="' + CT + 'officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
        '<Override PartName="/xl/styles.xml" ContentType="' + CT + 'officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', X + '<Relationships xmlns="' + PNS + '"><Relationship Id="rId1" Type="' + RNS + '/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', X + '<workbook xmlns="' + NSM + '" xmlns:r="' + RNS + '"><sheets>' + sh.map(function (s0, i) { return '<sheet name="' + xEsc(s0.n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets>' +
        '<definedNames>' + sh.map(function (s0, i) { return '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + xEsc(s0.n) + '\'!$A$1:$' + colL(s0.r[0].length - 1) + '$' + s0.r.length + '</definedName>'; }).join('') + '</definedNames></workbook>'],
      ['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="' + PNS + '">' + sh.map(function (s0, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + RNS + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
        '<Relationship Id="rId' + (sh.length + 1) + '" Type="' + RNS + '/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', X + '<styleSheet xmlns="' + NSM + '"><fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6ECE5"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']
    ].concat(sh.map(function (s0, i) { return ['xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(s0)]; }));
    var enc = new TextEncoder();
    return zipFiles(files.map(function (f) { return { n: f[0], d: enc.encode(f[1]) }; }), CT + 'officedocument.spreadsheetml.sheet');
  }
  function isoD(t) { return t == null ? '' : new Date(t).toISOString().slice(0, 10); }
  function dwgRows(list) {
    var rows = [['Batch', 'Category', 'Package No', 'Position', 'Laydown / area', 'Status', 'MDR status', 'MDR No', 'RFS Material Receiving', 'Inspection date', 'Detail package no',
      'S/N', 'Description', 'Description CN', 'Specification', 'Drawing No'].concat(FD ? ['Axis (foundation)', 'Foundation status', 'Foundation STA'] : []).concat(['Equipment', 'Qty', 'Unit', 'Unit wt (kg)', 'Total wt (kg)', 'Remark'])];
    list.forEach(function (p) {
      linesOf(p).forEach(function (x) {
        var it = x.it;
        var fx = FD ? fdOf(it.dw) : null;
        rows.push([p.b, p.c, p.no, POSL[posOf(p)], posOf(p) === 'LAYDOWN' ? p.lg : '', ST[p.st].s, MDRL[p.mdr] || p.mdr, p.mdrNo, p.rfs, p.recv != null ? isoD(p.recv) : p.insp,
          x.b.no, it.sn, it.d, it.cn, it.sp, it.dw].concat(FD ? [fx ? fx.k : '', fx ? fx.st : '', fx ? fx.sta : ''] : []).concat([it.eq, it.q, it.u, it.uw, it.tw, it.rm]));
      });
    });
    return rows;
  }
  function download(name, blob) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.target = '_self'; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 4000);
  }
  function xlsxDwg(list) {
    if (!R.items) { ensureItems(function () { xlsxDwg(list); }); return; }
    var tag = (list.length === 1 ? list[0].no : filtText()).replace(/[\\\/:*?"<>|]+/g, '-').replace(/\s*·\s*/g, ' ').replace(/\s+/g, ' ').slice(0, 90);
    dwgMsg('Preparing the Excel file…');
    xlsxBlob('Drawing list', dwgRows(list), [7, 9, 30, 18, 13, 14, 16, 24, 22, 12, 30, 8, 38, 24, 18, 26].concat(FD ? [14, 22, 18] : []).concat([12, 8, 7, 11, 11, 30])).then(function (blob) {
      download('Drawing list ' + tag + ' ' + isoD(R.dd) + '.xlsx', blob);
      dwgMsg('Excel file ready: ' + nf(list.length) + ' package(s) · ' + nf(dwgStats(list).lines) + ' material lines (' + nf(blob.size / 1024) + ' KB).');
    }, function (e) { dwgMsg('Excel file could not be made: ' + ((e && e.message) || e)); });
  }
  function heads(tr, defs) { defs.forEach(function (d) { th(tr, d[0], d[1] || ''); }); }
  function esc(s0) { return String(s0 == null ? '' : s0).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 9. halaman 4: exceptions ---------- */
  var RESO = { PACKAGE_NUMBER_MISMATCH: 'Verify the physical marking with the shipper; confirm or reject the alias in mapping_overrides.csv.',
    SUMMARY_WITHOUT_DETAIL: 'Obtain the missing detail packing list or confirm the proposed counterpart.', INVOICE_MISMATCH: 'Summary invoice governs; request re-issued detail packing lists.',
    EQUIPMENT_MISMATCH: 'Align equipment tags (typo OCL / OLC).', ITEM_WEIGHT_SUM_MISMATCH: 'Check TOTAL formula ranges / item weights in the detail list.',
    DIMENSION_MISMATCH: 'Confirm against the measurement certificate.', VOLUME_MISMATCH: 'Confirm against the measurement certificate.', WEIGHT_MISMATCH: 'Confirm against the weighing certificate.' };
  function renderXSev() {
    var sg = $('x-sev');
    if (!sg._built) {
      sg._built = true;
      [['ALL', 'All']].concat(SEVO.map(function (k) { return [k, k.charAt(0) + k.slice(1).toLowerCase()]; })).forEach(function (o) {
        var b = el('button', null, o[1]); b.type = 'button'; b.setAttribute('data-v', o[0]);
        b.addEventListener('click', function () { state.xsev = o[0]; state.xtype = null; state.xall = false; renderP4(); }); sg.appendChild(b);
      });
    }
    setSeg('x-sev', state.xsev);
  }
  function renderP4() {
    renderXSev();
    var open = R.iss.filter(function (x) { return x.st === 'OPEN' || x.sev === 'INFO'; }), list = open.filter(function (x) { return state.xsev === 'ALL' || x.sev === state.xsev; });
    $('x-title').textContent = state.xtype ? state.xtype.replace(/_/g, ' ').toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); }) : state.xsev === 'ALL' ? 'All open issues' : state.xsev.charAt(0) + state.xsev.slice(1).toLowerCase() + ' severity';
    var kb = clear($('x-kpi')), cnt = function (s0) { return open.filter(function (x) { return x.sev === s0 && x.st === 'OPEN'; }).length; };
    var pk = {}; open.forEach(function (x) { if (x.pid && x.st === 'OPEN' && x.sev !== 'INFO') pk[x.pid] = 1; });
    kb.appendChild(statCard('alert', 'Open issues', nf(open.filter(function (x) { return x.st === 'OPEN' && x.sev !== 'INFO'; }).length), '', [nf(R.iss.length) + ' logged by the ETL']));
    kb.appendChild(statCard('flag', 'High', nf(cnt('HIGH')), '', [cnt('HIGH') ? badge('crit', 'act first') : 'none open']));
    kb.appendChild(statCard('box', 'Packages affected', nf(Object.keys(pk).length), '', ['of ' + nf(R.pk.length) + ' packages']));
    kb.appendChild(statCard('check', 'Info / accepted', nf(open.filter(function (x) { return x.sev === 'INFO' || x.st !== 'OPEN'; }).length), '', ['split packages, carry-over, series gaps']));
    var types = {}; list.forEach(function (x) { var t0 = types[x.type] = types[x.type] || { n: 0, s: {} }; t0.n++; t0.s[x.sev] = (t0.s[x.sev] || 0) + 1; });
    var tk = Object.keys(types).sort(function (x, y) { var sx = SEVO.findIndex ? SEVO.findIndex(function (s0) { return types[x].s[s0]; }) : 0, sy = SEVO.findIndex ? SEVO.findIndex(function (s0) { return types[y].s[s0]; }) : 0; return sx - sy || types[y].n - types[x].n; });
    var mx = tk.reduce(function (m, k) { return Math.max(m, types[k].n); }, 1), bx = clear($('x-bars'));
    tk.forEach(function (k) {
      var b = el('button', 'hbr' + (state.xtype === k ? ' on' : '')); b.type = 'button';
      b.appendChild(el('span', 'nm', k.replace(/_/g, ' ').toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); })));
      var tr0 = el('span', 'tr'); tr0.style.width = (types[k].n / mx * 100).toFixed(1) + '%';
      SEVO.forEach(function (s0) { var v = types[k].s[s0]; if (!v) return; var i = el('i'); i.style.width = (v / types[k].n * 100).toFixed(2) + '%'; i.style.background = SEVC[s0]; tr0.appendChild(i); });
      var tw = el('span', 'tr'); tw.style.background = 'transparent'; tw.appendChild(tr0); b.appendChild(tr0);
      var ct = el('span', 'ct'); ct.appendChild(el('b', null, nf(types[k].n))); ct.appendChild(document.createTextNode(' · ' + SEVO.filter(function (s0) { return types[k].s[s0]; }).map(function (s0) { return s0.charAt(0) + ' ' + types[k].s[s0]; }).join(' · '))); b.appendChild(ct);
      b.addEventListener('click', function () { state.xtype = state.xtype === k ? null : k; state.xall = false; renderP4(); });
      bx.appendChild(b);
    });
    if (!tk.length) bx.appendChild(el('div', 'd-empty', 'No issue for this filter.'));
    legendItems($('x-leg'), SEVO.map(function (s0) { return { c: SEVC[s0], t: s0.charAt(0) + s0.slice(1).toLowerCase(), k: 'sq' }; }));
    var rows = list.filter(function (x) { return !state.xtype || x.type === state.xtype; }).sort(function (x, y) { return SEVO.indexOf(x.sev) - SEVO.indexOf(y.sev); });
    var wrap = clear($('x-tbl')), t = el('table', 'lt'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    headBack($('x-head'), state.xtype ? state.xtype.replace(/_/g, ' ').toLowerCase() : 'Exception register', nf(rows.length) + ' issue(s)', state.xtype ? { t: 'All types', fn: function () { state.xtype = null; renderP4(); } } : null,
      'Exceptions found by the Logistics ETL (rules R01–R18). Values are kept as written in the source; each issue carries a proposed resolution.');
    heads(tr, [['Severity', 'c-st'], ['Type', 'c-desc'], ['Package', 'c-code'], ['B · Cat', 'c-code'], ['Description', 'lg-wrap'], ['Resolution', 'lg-wrap'], ['Source', 'c-sc'], ['']]);
    var cap = state.xall ? rows.length : Math.min(rows.length, 250);
    rows.slice(0, cap).forEach(function (x) {
      var r = el('tr', x.pid && R.byId[x.pid] ? 'go' : ''), sv = el('td', 'c-st'); sv.appendChild(badge(SEVLV[x.sev] || '', x.sev)); r.appendChild(sv);
      var ty = el('td', 'c-desc'); ty.appendChild(document.createTextNode(x.type.replace(/_/g, ' ').toLowerCase())); if (x.sub) ty.appendChild(el('small', null, x.sub.replace(/_/g, ' ').toLowerCase())); ty.title = x.type + (x.sub ? ' · ' + x.sub : ''); r.appendChild(ty);
      r.appendChild(el('td', 'c-code', x.no || '—')); r.appendChild(el('td', 'c-code', (x.b || '') + (x.c ? ' · ' + x.c : '')));
      r.appendChild(el('td', 'lg-wrap', x.d)); r.appendChild(el('td', 'lg-wrap lg-res', x.res || RESO[x.type] || '')); r.appendChild(el('td', 'c-sc z', x.src || ''));
      var ch = el('td', 'c-chev'); if (x.pid && R.byId[x.pid]) { ch.appendChild(chevI()); rowKeys(r, function () { openPackage(x.pid); }); } r.appendChild(ch);
      tb.appendChild(r);
    });
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    if (cap < rows.length) { var mb = el('div', 'lg-more'), b2 = el('button', 'upb'); b2.type = 'button'; b2.appendChild(ico('list', 12)); b2.appendChild(document.createTextNode('Show all ' + nf(rows.length) + ' issues')); b2.addEventListener('click', function () { state.xall = true; renderP4(); }); mb.appendChild(b2); wrap.appendChild(mb); }
    $('x-tip').textContent = 'Click a type above to filter · click an issue to open its package';
  }


  /* ================= 12. FOUNDATION × MATERIAL — OLC axis register (foundation sheet) linked to the drawing numbers =================
     Axis ID (foundation sheet, column B: "O2J3Z043", "O2J2Z003 ~ 5") ↔ drawing number of the material lines ("02J3Z043-HJ-1"):
     letter O and digit 0 are the same at the start, ranges are expanded, a trailing letter (010B) is kept. */
  var AXRE = /^[0O](\d)([A-Z])(\d{1,2})([A-Z]{1,2})(\d{3})([A-Z](?![A-Z]))?/;
  function axKey(m) { return '0' + m[1] + m[2] + m[3] + m[4] + m[5] + (m[6] || ''); }
  function axSpan(m, k, to, suf) {
    var base = k.slice(0, k.length - (m[6] ? 4 : 3)), a = +m[5], out = [];
    if (!(to >= a) || to - a > 60) return [k];
    if (m[6]) out.push(k);                                  /* "02J3Z001a--02J3Z007": 001A is a foundation of its own */
    for (var n = a; n <= to; n++) out.push(base + ('00' + n).slice(-3));
    if (suf) out.push(base + ('00' + to).slice(-3) + suf);
    return out;
  }
  function axisKeys(raw) {                       /* register: "O2J2Z003 ~ 5" → 02J2Z003 · 02J2Z004 · 02J2Z005 */
    var s = U(raw).replace(/\s+/g, ''), m = AXRE.exec(s); if (!m) return [];
    var k = axKey(m), r = /^~(\d{1,3})([A-Z])?$/.exec(s.slice(m[0].length));
    return r ? axSpan(m, k, +r[1], r[2] || '') : [k];
  }
  function drawingAxes(dw) {                     /* material: "02J3Z043-HJ-1" → 02J3Z043 · "01J5Z001~01J5Z008" → 8 axes · "第一行：02J3Z001a--02J3Z007" → 001A, 001…007 */
    var s = U(dw).replace(/\s+/g, ''), m = AXRE.exec(s);
    if (!m) { var i = s.search(/[0O]\d[A-Z]\d{1,2}[A-Z]{1,2}\d{3}/); if (i < 1 || /[A-Z0-9]/.test(s.slice(0, i))) return []; s = s.slice(i); m = AXRE.exec(s); if (!m) return []; }
    var k = axKey(m), rest = s.slice(m[0].length), r = /^~(?:[0O]\d[A-Z]\d{1,2}[A-Z]{1,2})?(\d{3})/.exec(rest);
    if (r) return axSpan(m, k, +r[1], '');
    var e = /^(?:-{1,2}|_|至|TO)([0O]\d[A-Z]\d{1,2}[A-Z]{1,2}\d{3}[A-Z]?)/.exec(rest), m2 = e && AXRE.exec(e[1]);
    if (!m2) return [k];
    var k2 = axKey(m2);
    return k2.slice(0, k2.length - (m2[6] ? 4 : 3)) === k.slice(0, k.length - (m[6] ? 4 : 3)) ? axSpan(m, k, +m2[5], m2[6] || '') : [k, k2];
  }
  /* segment level: "02J3A-7H-6" = trestle of segment J3A without axis number → the foundations O2J3AZ… of that segment */
  function segOfKey(k) { var m = AXRE.exec(k); return m ? '0' + m[1] + m[2] + m[3] + m[4].slice(0, -1) : ''; }
  function drawingSeg(dw) { var m = /^[0O](\d)([A-Z])(\d{1,2})([A-Z]?)(?=[-_~(]|$)/.exec(U(dw).replace(/\s+/g, '')); return m ? '0' + m[1] + m[2] + m[3] + m[4] : ''; }
  function near1(a, b) {                         /* one character different: substituted, added, dropped or two swapped */
    var la = a.length, lb = b.length, i = 0;
    if (a === b || Math.abs(la - lb) > 1) return false;
    while (i < la && i < lb && a.charAt(i) === b.charAt(i)) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2));
    return la < lb ? a.slice(i) === b.slice(i + 1) : a.slice(i + 1) === b.slice(i);
  }
  function fNear(k) {                            /* typo tolerance: the ONLY register axis 1 character away, same OLC line (01 ≠ 02), same axis number */
    if (Object.prototype.hasOwnProperty.call(FD.nr, k)) return FD.nr[k];
    var n0 = /(\d+)[A-Z]?$/.exec(k), c = FD.keys.filter(function (r) { var n1 = /(\d+)[A-Z]?$/.exec(r); return r.charAt(1) === k.charAt(1) && near1(k, r) && (!n0 || !n1 || +n0[1] === +n1[1]); });
    return (FD.nr[k] = c.length === 1 ? c[0] : c.length ? c : null);
  }
  function axLink(dw) {                          /* one drawing number → its foundations: exact · ≈ 1-character typo · segment level */
    var key = dw == null ? '' : String(dw); if (Object.prototype.hasOwnProperty.call(FD.lk, key)) return FD.lk[key];
    var ks = drawingAxes(key), L = { ks: ks, fs: [], nr: [], amb: [] };
    if (!ks.length) {
      var sg = drawingSeg(key);
      if (sg) { L.sg = sg; L.S = FD.segs[sg] || null; return (FD.lk[key] = L); }
      var t0 = U(key).replace(/\s+/g, '').split(/[-~_(]/)[0].replace(/^O/, '0');    /* malformed axis code, e.g. 02J3Z43 */
      if (/^0\d[A-Z]/.test(t0) && t0.length >= 6 && t0.length <= 11) L.ks = ks = [t0];
    }
    ks.forEach(function (k) {
      var rs = fRows(k);
      if (!rs) { var c = fNear(k); if (typeof c === 'string') { rs = FD.by[c]; L.nr.push([k, c]); } else if (c) L.amb.push([k, c]); }
      (rs || []).forEach(function (f) { if (L.fs.indexOf(f) < 0) L.fs.push(f); });
    });
    return (FD.lk[key] = L);
  }
  function colIdx(spec, H) {                     /* "B" → column B · "Axis ID" → the column with that header */
    var s0 = T(spec); if (!s0) return -1;
    if (/^[A-Z]{1,2}$/i.test(s0)) { var n = 0; s0.toUpperCase().split('').forEach(function (ch) { n = n * 26 + ch.charCodeAt(0) - 64; }); return n - 1; }
    return H.indexOf(hkey(s0));
  }
  var FHDR = { axis: ['axisid', 'axis', 'foundationid'], status: ['foundationworks', 'foundationstatus', 'constructionstatus', 'consstatus'],
    area: ['areastatus', 'areareadiness'], earth: ['earthworks'], rmF: ['remarkfoundation'], rmU: ['remarkupperstructure'], sta: ['staid', 'staidassigned'],
    seg: ['segmentid'], grp: ['structuregroup'], cls: ['foundationclass'], typ: ['foundationtype'], ch: ['chainagem', 'chainage', 'chainagetext'] };
  function firstCol(H, names) { for (var i = 0; i < names.length; i++) { var j = H.indexOf(names[i]); if (j > -1) return j; } return -1; }
  function fTable(x) {                           /* foundation data = TSV (snapshot / JSONP) or CSV (Publish to web, gviz) */
    if (Array.isArray(x)) return x;
    var t0 = String(x || ''), nl = t0.indexOf('\n'), l0 = nl > -1 ? t0.slice(0, nl) : t0;
    return l0.indexOf('\t') > -1 ? t0.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; }).map(function (l) { return l.split('\t'); }) : csvRows(t0.trim() + '\n');
  }
  function parseFoundation(input) {
    var rows = fTable(input), hi = 0;
    for (var i = 0; i < Math.min(rows.length, 10); i++) if (rows[i].map(hkey).indexOf('axisid') > -1) { hi = i; break; }
    var hr = rows[hi] || [], H = hr.map(hkey), data = rows.slice(hi + 1).filter(function (r) { return r && r.some(function (c) { return T(c) !== ''; }); });
    if (!data.length) return { error: 'no rows' };
    function share(ci, f) { var n = 0, k = 0; if (ci < 0) return 0; data.forEach(function (r) { var v = T(r[ci]); if (v) { n++; if (f(v)) k++; } }); return n ? k / n : 0; }
    function isAx(v) { return axisKeys(v).length > 0; }
    function isNum(v) { return /^-?[\d.,]+$/.test(v); }
    var notes = [], ai = colIdx(cfg.pondasikolomaxis || 'B', H);
    if (share(ai, isAx) < 0.5) {
      var a2 = firstCol(H, FHDR.axis);
      if (share(a2, isAx) < 0.5) { a2 = -1; for (var c = 0; c < H.length; c++) if (share(c, isAx) >= 0.5) { a2 = c; break; } }
      if (a2 < 0) return { error: 'no column with axis IDs (e.g. O2J3Z043) — check "Pondasi Kolom Axis"' };
      notes.push('Axis column "' + (cfg.pondasikolomaxis || 'B') + '" holds no axis IDs — column ' + colL(a2) + ' ("' + T(hr[a2]) + '") is used.'); ai = a2;
    }
    var si = colIdx(cfg.pondasikolomstatus || 'R', H);
    if (share(si, function () { return true; }) === 0 || share(si, isNum) > 0.5) {
      var s2 = firstCol(H, FHDR.status);
      if (s2 > -1) { notes.push('Status column "' + (cfg.pondasikolomstatus || 'R') + '" holds ' + (share(si, isNum) > 0.5 ? 'numbers' : 'nothing') + ' — column ' + colL(s2) + ' ("' + T(hr[s2]) + '") is used.'); si = s2; }
    }
    var C = {}; ['area', 'earth', 'rmF', 'rmU', 'sta', 'seg', 'grp', 'cls', 'typ', 'ch'].forEach(function (k) { C[k] = firstCol(H, FHDR[k]); });
    var list = [], by = {}, bad = [];
    data.forEach(function (r) {
      var raw = T(r[ai]); if (!raw) return;
      var keys = axisKeys(raw); if (!keys.length) { if (bad.length < 50) bad.push(raw); return; }
      function g(k) { return C[k] > -1 ? T(r[C[k]]).replace(/\s*\n\s*/g, ' / ') : ''; }
      var f = { n: list.length, raw: raw, raw0: raw, keys: keys, st: si > -1 ? T(r[si]) || 'No status' : 'No status', area: g('area'), earth: g('earth'), rmF: g('rmF'), rmU: g('rmU'),
        sta: g('sta') || '—', seg: g('seg'), grp: g('grp'), cls: g('cls'), typ: g('typ'), ch: g('ch'), lines: [], pk: {}, pks: [], mat: 'NONE' };
      list.push(f); keys.forEach(function (k) { (by[k] = by[k] || []).push(f); });
    });
    if (!list.length) return { error: 'no axis rows' };
    /* register typo: the same axis ID twice and one row's Segment ID disagrees with it (O2L3T001 in segment L2) → that row becomes O2L2T001 */
    var fixes = [];
    if (C.seg > -1) Object.keys(by).forEach(function (k) {
      var fs = by[k]; if (fs.length < 2) return;
      var m = AXRE.exec(k), sk = m[2] + m[3], sgOf = function (f) { var x = /^([A-Z]+\d+)/.exec(U(f.seg)); return x ? x[1] : ''; };
      if (!fs.some(function (f) { return sgOf(f) === sk; })) return;
      fs.slice().forEach(function (f) {
        var sg = sgOf(f); if (!sg || sg === sk || sg.charAt(0) !== m[2]) return;
        var nk = '0' + m[1] + sg + m[4] + m[5] + (m[6] || ''); if (by[nk]) return;
        by[k].splice(by[k].indexOf(f), 1); by[nk] = [f]; f.keys = f.keys.map(function (x) { return x === k ? nk : x; });
        if (f.keys.length === 1) f.raw = (f.raw0.charAt(0).toUpperCase() === 'O' ? 'O' : '0') + nk.slice(1);
        f.fix = (f.fix ? f.fix + ' · ' : '') + k + ' → ' + nk + ' (Segment ID ' + sg + ')'; fixes.push({ f: f, from: k, to: nk, seg: sg });
      });
    });
    var segs = {};
    list.forEach(function (f) { f.keys.forEach(function (k) { var s0 = segOfKey(k); if (!s0) return; var S = segs[s0] = segs[s0] || { code: s0, fs: [], lines: [], pk: {}, pks: [] }; if (S.fs.indexOf(f) < 0) S.fs.push(f); }); });
    return { list: list, by: by, dup: Object.keys(by).filter(function (k) { return by[k].length > 1; }), bad: bad, notes: notes, fixes: fixes, segs: segs,
      keys: Object.keys(by), nr: {}, lk: {}, axisCol: colL(ai) + ' · ' + T(hr[ai]), statusCol: si > -1 ? colL(si) + ' · ' + T(hr[si]) : 'none' };
  }
  /* foundation stage colours (order = progress), material position per axis */
  var FSC = [[/concret|complete|finish|done/i, '#2F8F5B', 1], [/rebar|form/i, '#3E7CB1', 2], [/pil/i, '#6C63C4', 3], [/excav/i, '#B28C22', 4],
    [/clear|progress/i, '#CF7A30', 5], [/not\s*start|no status/i, '#9AA59E', 6], [/constraint|block|hold|stop/i, '#D14D4B', 7]];
  function fMeta(st) { for (var i = 0; i < FSC.length; i++) if (FSC[i][0].test(st)) return { c: FSC[i][1], o: FSC[i][2] }; return { c: '#8A958F', o: 8 }; }
  var FMAT = { ON: { t: 'Material on site', s: 'On site', c: 'var(--good)' }, PART: { t: 'Material partly on site', s: 'Partly on site', c: 'var(--warn)' },
    OFF: { t: 'Material not on site yet', s: 'Not on site', c: 'var(--line-strong)' }, NONE: { t: 'No material in the packing lists', s: 'No material', c: 'transparent' } };
  var FMO = ['ON', 'PART', 'OFF', 'NONE'];
  var P_FREADY = words(cfg.pondasisiap || 'concreting, complete, completed, done, finish');
  function fReady(st) { return !!hit(st, P_FREADY); }
  var FD = null, FJ = null, FSRCN = { kind: 'none', name: '', at: null, notes: [] };
  function fRows(k) { return FD.by[k] || (/[A-Z]$/.test(k) ? FD.by[k.slice(0, -1)] : null) || null; }
  function fJoin() {                               /* every material line whose drawing number names an axis of the register */
    if (!FD || !R || !R.items) return null;
    if (FJ && FJ.R === R && FJ.items === R.items && FJ.FD === FD) return FJ;
    FD.list.forEach(function (f) { f.lines = []; f.pk = {}; f.nrs = ''; });
    Object.keys(FD.segs).forEach(function (c0) { FD.segs[c0].lines = []; FD.segs[c0].pk = {}; });
    var unm = {}, matched = 0, axisLike = 0, near = {}, amb = {}, segN = 0, segU = {};
    R.pk.forEach(function (p) {
      linesOf(p).forEach(function (x) {
        var L = axLink(x.it.dw), ln = { p: p, b: x.b, it: x.it };
        if (L.sg) { if (L.S) { segN++; L.S.lines.push(ln); L.S.pk[p.id] = p; } else segU[L.sg.slice(0, 2)] = (segU[L.sg.slice(0, 2)] || 0) + 1; return; }
        if (!L.ks.length) return;
        axisLike++;
        L.amb.forEach(function (a) { amb[a[0]] = a[1]; });
        if (!L.fs.length) { var pf = L.ks[0].slice(0, 2), u = unm[pf] = unm[pf] || { n: 0, ex: [] }; u.n++; if (u.ex.length < 3 && u.ex.indexOf(x.it.dw) < 0) u.ex.push(x.it.dw); return; }
        matched++;
        if (L.nr.length) { ln.nr = L.nr.map(function (a) { return a[0] + ' ≈ ' + a[1]; }).join(', '); L.nr.forEach(function (a) { var q = near[a[0]] = near[a[0]] || { from: a[0], to: a[1], n: 0, ex: x.it.dw }; q.n++; }); }
        L.fs.forEach(function (f) { f.lines.push(ln); f.pk[p.id] = p; if (ln.nr) f.nrs = ln.nr; });
      });
    });
    FD.list.forEach(function (f) {
      var ps = Object.keys(f.pk).map(function (id) { return f.pk[id]; }), on = ps.filter(function (p) { return p.onsite; }).length;
      f.pks = ps; f.mat = !ps.length ? 'NONE' : on === ps.length ? 'ON' : on ? 'PART' : 'OFF'; f.ready = fReady(f.st); f._q = null;
    });
    Object.keys(FD.segs).forEach(function (c0) {
      var S = FD.segs[c0]; S.pks = Object.keys(S.pk).map(function (id) { return S.pk[id]; });
      S.rd = S.fs.filter(function (f) { return f.ready; }).length; S.on = S.lines.filter(function (x) { return x.p.onsite; }).length;
    });
    FJ = { R: R, items: R.items, FD: FD, unm: unm, matched: matched, axisLike: axisLike, near: near, amb: amb, segN: segN, segU: segU };
    return FJ;
  }
  function segSta(S) { var o = []; S.fs.forEach(function (f) { if (o.indexOf(f.sta) < 0) o.push(f.sta); }); return o.join(' / '); }
  function fdOf(dw) {                              /* foundation(s) of one drawing number, for the drawing lists */
    if (!FD) return null;
    var L = axLink(dw), ks = L.ks;
    if (L.sg) {
      var S = L.S, rd = S ? S.fs.filter(function (f) { return fReady(f.st); }).length : 0;
      return { k: L.sg + ' (segment)', fs: [], seg: S, sta: S ? segSta(S) : '', st: S ? 'segment: ' + nf(rd) + ' of ' + nf(S.fs.length) + ' foundations ready' : 'not in foundation register' };
    }
    if (!ks.length) return null;
    var fs = L.fs;
    return { k: ks.length > 1 ? ks[0] + '…' + ks[ks.length - 1].slice(-3) : ks[0], fs: fs, nr: L.nr, sta: fs[0] ? fs[0].sta : '',
      st: fs.length ? fs.map(function (f) { return f.st; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' / ') + (L.nr.length ? ' · ≈ ' + L.nr.map(function (a) { return a[1]; }).join(', ') : '') : 'not in foundation register' };
  }
  function fChip(st, small) {
    var c = el('span', 'lg-fchip' + (small ? ' sm' : '')), m = fMeta(st), d = el('i'); d.style.background = m.c; c.appendChild(d);
    c.appendChild(document.createTextNode(st)); c.title = 'Foundation: ' + st; return c;
  }
  function fdCell(td, dw) {
    var x = fdOf(dw); if (!x) { td.textContent = '—'; td.className += ' z'; return; }
    var w = el('span', 'lg-fdc'); w.appendChild(el('b', 'lg-mono', x.k));
    if (x.fs.length) w.appendChild(fChip(x.st, true)); else w.appendChild(el('span', 'lg-sub', x.seg ? x.st : 'not in register'));
    w.title = x.k + ' — ' + x.st + (x.sta ? ' · ' + x.sta : '') + (x.fs[0] && x.fs[0].area ? ' · area ' + x.fs[0].area : '') + (x.nr && x.nr.length ? '\nLinked with a 1-character typo: ' + x.nr.map(function (a) { return a[0] + ' ≈ ' + a[1]; }).join(', ') : '');
    td.appendChild(w);
  }
  function matChip(f) {
    var c = el('span', 'lg-mchip m-' + f.mat), d = el('i'); d.style.background = FMAT[f.mat].c; c.appendChild(d);
    var lay = {}; f.pks.forEach(function (p) { var k = p.onsite ? (p.lg === NOLOC ? 'On-site' : p.lg) : 'In transit'; lay[k] = (lay[k] || 0) + 1; });
    var parts = Object.keys(lay).sort().map(function (k) { return k + (lay[k] > 1 ? ' ×' + lay[k] : ''); });
    c.appendChild(document.createTextNode(f.mat === 'NONE' ? 'No material' : parts.join(' · '))); c.title = FMAT[f.mat].t; return c;
  }
  function fStatuses(list) {
    var o = {}; list.forEach(function (f) { o[f.st] = (o[f.st] || 0) + 1; });
    return Object.keys(o).sort(function (a, b) { return fMeta(a).o - fMeta(b).o || o[b] - o[a] || (a < b ? -1 : 1); });
  }
  function fStas() { var o = []; FD.list.forEach(function (f) { if (o.indexOf(f.sta) < 0) o.push(f.sta); }); return o; }
  function fGap(f) { return f.mat === 'NONE' ? 4 : !f.ready && (f.mat === 'ON' || f.mat === 'PART') ? 0 : f.ready && f.mat === 'ON' ? 1 : f.ready ? 2 : 3; }
  function scopeF(skip) {
    skip = skip || ''; var q = U(state.fq).replace(/\s+/g, '');
    return FD.list.filter(function (f) {
      if (skip.indexOf('st') < 0 && state.fst !== 'ALL' && f.st !== state.fst) return false;
      if (skip.indexOf('mat') < 0 && state.fmat !== 'ALL' && !(state.fmat === 'WITH' ? f.mat !== 'NONE' : f.mat === state.fmat)) return false;
      if (skip.indexOf('sta') < 0 && state.fsta !== 'ALL' && f.sta !== state.fsta) return false;
      if (!q) return true;
      if (f._q == null) f._q = U([f.raw, f.raw0, f.keys.join(' '), f.sta, f.seg, f.grp, f.cls, f.typ, f.ch, f.st, f.area, f.earth, f.rmF, f.rmU].join(' ')).replace(/\s+/g, '');
      if (f._q.indexOf(q) > -1) return true;
      return f.lines.some(function (x) { return U(x.it.dw + ' ' + x.p.no).replace(/\s+/g, '').indexOf(q) > -1; });
    });
  }
  function fName(staOnly) {
    var parts = [];
    if (state.fsta !== 'ALL') parts.push(state.fsta);
    if (!staOnly && state.fst !== 'ALL') parts.push('Foundation ' + state.fst);
    if (!staOnly && state.fmat !== 'ALL') parts.push(state.fmat === 'WITH' ? 'axes with material' : FMAT[state.fmat].t);
    if (state.fq) parts.push('search "' + state.fq + '"');
    return parts.join(' · ');
  }
  function fReset(staOnly) { return (!staOnly && (state.fst !== 'ALL' || state.fmat !== 'ALL')) || state.fsta !== 'ALL' || state.fq ? { t: staOnly ? 'All STA' : 'All axes', fn: function () { if (!staOnly) { state.fst = 'ALL'; state.fmat = 'ALL'; } state.fsta = 'ALL'; state.fq = ''; $('f-q').value = ''; state.fall = false; renderP5(); } } : null; }
  function renderFFilters() {
    function pick(k) { return function (v) { state[k] = v; state.fax = null; state.fall = false; $('f-tbl').scrollTop = 0; renderP5(); }; }
    var sb = scopeF('st');
    segRow('f-st', [{ v: 'ALL', t: 'All', n: sb.length }].concat(fStatuses(FD.list).map(function (k) { return { v: k, t: k, n: sb.filter(function (f) { return f.st === k; }).length, dot: fMeta(k).c, tip: fReady(k) ? 'Counts as foundation ready (setting "Pondasi Siap")' : '' }; })), state.fst, pick('fst'));
    var mb = scopeF('mat');
    segRow('f-mat', [{ v: 'ALL', t: 'All', n: mb.length }, { v: 'WITH', t: 'With material', n: mb.filter(function (f) { return f.mat !== 'NONE'; }).length, icon: 'box' }]
      .concat(FMO.map(function (k) { return { v: k, t: FMAT[k].s, n: mb.filter(function (f) { return f.mat === k; }).length, dot: k === 'NONE' ? 'var(--track)' : FMAT[k].c, tip: FMAT[k].t }; })), state.fmat, pick('fmat'));
    var axv = state.fview === 'axis', ab = scopeF(axv ? 'sta' : 'st mat sta');
    $('f-st').parentNode.style.display = axv ? '' : 'none'; $('f-mat').parentNode.style.display = axv ? '' : 'none';
    segRow('f-sta', [{ v: 'ALL', t: 'All', n: ab.length }].concat(fStas().map(function (k) { return { v: k, t: k, n: ab.filter(function (f) { return f.sta === k; }).length }; })), state.fsta, pick('fsta'));
  }
  function renderFKpi(list) {
    var kb = clear($('f-kpi')), withM = list.filter(function (f) { return f.mat !== 'NONE'; }), lines = new Set(), pk = {};
    withM.forEach(function (f) { f.lines.forEach(function (x) { lines.add(x.it); }); f.pks.forEach(function (p) { pk[p.id] = 1; }); });
    var front = list.filter(function (f) { return f.ready && f.mat === 'ON'; }), wait = list.filter(function (f) { return !f.ready && (f.mat === 'ON' || f.mat === 'PART'); });
    var frontP = list.filter(function (f) { return f.ready && f.mat === 'PART'; }).length;
    var fwait = list.filter(function (f) { return f.ready && (f.mat === 'OFF' || f.mat === 'NONE'); });
    kb.appendChild(statCard('found', 'Axes with material', nf(withM.length), '', ['of ' + nf(list.length) + ' foundations · ' + nf(lines.size) + ' lines · ' + nf(Object.keys(pk).length) + ' pkgs']));
    var fc = statCard('check', 'Erection front', nf(front.length), '', [front.length ? badge('good', 'foundation ready + material on site') : 'foundation ready + material on site']);
    if (frontP) fc.appendChild(el('div', 'lg-ksub', '+ ' + nf(frontP) + ' with material partly on site'));
    kb.appendChild(fc);
    kb.appendChild(statCard('alert', 'Material waiting', nf(wait.length), '', [wait.length ? badge('warn', 'on site · foundation not ready') : 'material on site · foundation not ready']));
    kb.appendChild(statCard('ship', 'Foundation waiting', nf(fwait.length), '', [nf(fwait.filter(function (f) { return f.mat === 'OFF'; }).length) + ' in transit · ' + nf(fwait.filter(function (f) { return f.mat === 'NONE'; }).length) + ' not in packing lists']));
    Array.prototype.forEach.call(kb.children, function (c, i) {
      var go0 = [function () { state.fview = 'axis'; state.fmat = 'WITH'; state.fst = 'ALL'; }, function () { state.fview = 'site'; }, function () { state.fview = 'site'; }, function () { state.fview = 'ready'; }][i];
      c.classList.add('lg-kclick'); c.title = ['Axis register: axes with material', 'Material on site → foundation (foundation ready first)', 'Material on site → foundation (foundation not ready)', 'Foundation ready → material not on site'][i]; rowKeys(c, function () { go0(); state.fax = null; state.fall = false; renderP5(); });
    });
  }
  function renderFMx() {
    var box = clear($('f-mx')), list = scopeF('st mat'), sts = fStatuses(list);
    var h = el('div', 'sec-h'), h3 = el('h3'); h3.appendChild(chipIco('found')); h3.appendChild(document.createTextNode('Foundation status × material'));
    h3.appendChild(infoIcon('Rows: foundation status from the foundation sheet (Foundation Works).\nColumns: where the material of that axis is — every packing-list line whose drawing number starts with the axis ID (e.g. 02J3Z043-HJ-1 → O2J3Z043).\nGreen = foundation ready (setting "Pondasi Siap") and material on site (light green: partly on site) · amber = material on site, foundation not ready · blue = foundation ready, material not on site.\nClick a number to list those axes.'));
    h.appendChild(h3);
    var hr0 = el('div', 'lg-fsrcw'); hr0.appendChild(el('span', 'muted', nf(list.length) + ' foundations' + (state.fsta !== 'ALL' ? ' · ' + state.fsta : ''))); hr0.appendChild(fSrcChip()); h.appendChild(hr0); box.appendChild(h);
    var t = el('table', 'lt lg-fmx'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    th(tr, 'Foundation status', 'c-nm2'); FMO.forEach(function (k) { th(tr, FMAT[k].s); }); th(tr, 'Total'); hd.appendChild(tr); t.appendChild(hd);
    var tot = { ON: 0, PART: 0, OFF: 0, NONE: 0 };
    sts.forEach(function (st) {
      var r = el('tr'), c0 = el('td', 'c-nm2'); c0.appendChild(fChip(st)); r.appendChild(c0);
      var rd = fReady(st), n0 = 0;
      FMO.forEach(function (k) {
        var n = list.filter(function (f) { return f.st === st && f.mat === k; }).length; n0 += n; tot[k] += n;
        var cls = 'cell' + (!n ? ' z' : rd && k === 'ON' ? ' g' : rd && k === 'PART' ? ' g2' : !rd && (k === 'ON' || k === 'PART') ? ' w' : rd && (k === 'OFF' || k === 'NONE') ? ' b' : '') + (state.fst === st && state.fmat === k ? ' on' : '');
        var td = el('td', cls, n ? nf(n) : '·');
        if (n) { td.title = n + ' axes · ' + st + ' · ' + FMAT[k].t; td.tabIndex = 0; td.addEventListener('click', function () { state.fst = st; state.fmat = k; state.fview = 'axis'; state.fax = null; state.fall = false; renderP5(); }); }
        r.appendChild(td);
      });
      r.appendChild(el('td', 'cum', nf(n0))); tb.appendChild(r);
    });
    var rt = el('tr', 'tot'); rt.appendChild(el('td', 'c-nm2', 'Total')); FMO.forEach(function (k) { rt.appendChild(el('td', 'cum', nf(tot[k]))); }); rt.appendChild(el('td', 'cum', nf(list.length))); tb.appendChild(rt);
    t.appendChild(tb); var wr = el('div', 'dt-wrap lg-fmxw'); wr.appendChild(t); box.appendChild(wr);
    /* linear view: every axis in sheet order, one row per STA section — colour = foundation status, underline = material */
    var sw = el('div', 'lg-strip'), lab = el('div', 'lg-striph'); lab.appendChild(el('b', null, 'Linear view')); lab.appendChild(el('span', 'lg-sub', ' — each square is one foundation in the order of the sheet (chainage); underline = material position · click a square for its material'));
    sw.appendChild(lab);
    fStas().forEach(function (sta) {
      var fs = list.filter(function (f) { return f.sta === sta; }); if (!fs.length) return;
      var row = el('div', 'row'), lb = el('div', 'lab'); lb.appendChild(el('b', null, sta)); lb.appendChild(el('span', 'lg-sub', ' ' + nf(fs.length) + ' · ' + nf(fs.filter(function (f) { return f.mat !== 'NONE'; }).length) + ' with mat.')); row.appendChild(lb);
      var cells = el('div', 'cells');
      fs.forEach(function (f) {
        var i = el('i', f.mat !== 'NONE' ? 'm' : ''); i.style.background = fMeta(f.st).c; if (f.mat !== 'NONE') i.style.setProperty('--m', FMAT[f.mat].c === 'transparent' ? 'transparent' : FMAT[f.mat].c);
        i.setAttribute('data-n', f.n); i.title = f.raw + ' · ' + f.st + (f.mat !== 'NONE' ? ' · ' + FMAT[f.mat].t + ' (' + f.pks.length + ' pkg)' : '') + (f.ch ? ' · ' + f.ch : '');
        cells.appendChild(i);
      });
      cells.addEventListener('click', function (e) { var n = e.target.getAttribute && e.target.getAttribute('data-n'); if (n != null) { state.fax = +n; renderP5(); } });
      row.appendChild(cells); sw.appendChild(row);
    });
    var lg = el('div', 'legend'); fStatuses(list).forEach(function (st) { var sp0 = el('span'), i = el('i', 'sq'); i.style.background = fMeta(st).c; sp0.appendChild(i); sp0.appendChild(document.createTextNode(st)); lg.appendChild(sp0); });
    ['ON', 'PART', 'OFF'].forEach(function (k) { var sp0 = el('span'), i = el('i', 'lg-ul'); i.style.background = FMAT[k].c; sp0.appendChild(i); sp0.appendChild(document.createTextNode(FMAT[k].s)); lg.appendChild(sp0); });
    sw.appendChild(lg); box.appendChild(sw);
    var J = fJoin(), nt = [];
    nt.push('Axis = column ' + FD.axisCol + ' · status = column ' + FD.statusCol + ' · ' + nf(FD.list.length) + ' foundations, ' + nf(Object.keys(FD.by).length) + ' axis codes · source: ' + (FSRCN.name || 'embedded snapshot') + (FSRCN.at ? ' (' + hhmm(FSRCN.at) + ')' : ''));
    var nN = Object.keys(J.near), nA = Object.keys(J.amb), nNl = nN.reduce(function (s0, k) { return s0 + J.near[k].n; }, 0);
    nt.push(nf(J.matched) + ' of ' + nf(J.axisLike) + ' material lines with an axis code in the drawing number are linked to a foundation' + (nNl ? ' (' + nf(nNl) + ' through a 1-character typo, listed below)' : '') + '.');
    var sgs = Object.keys(FD.segs).filter(function (c0) { return FD.segs[c0].lines.length; }).sort();
    if (J.segN) nt.push(nf(J.segN) + ' lines have a segment drawing without axis number (e.g. 02J3A-7H-6) and belong to every foundation of that segment: ' + sgs.map(function (c0) { var S = FD.segs[c0]; return c0 + ' ' + nf(S.lines.length) + ' lines → ' + nf(S.fs.length) + ' foundations'; }).join(' · ') + '.');
    Object.keys(J.unm).sort().forEach(function (pf) { var u = J.unm[pf]; nt.push(nf(u.n) + ' line(s) ' + (pf === '01' ? 'of OLC-1 (drawings 01…)' : pf === '02' ? 'of OLC-2' : 'with prefix ' + pf) + ' have no foundation in this sheet — e.g. ' + u.ex.join(', ') + '.'); });
    Object.keys(J.segU).sort().forEach(function (pf) { nt.push(nf(J.segU[pf]) + ' segment-level line(s) ' + (pf === '01' ? 'of OLC-1 (e.g. 01J3-1H-3)' : 'with prefix ' + pf) + ' have no segment in this sheet.'); });
    if (FD.fixes.length) nt.push('Typo fixed: ' + nf(FD.fixes.length) + ' axis ID(s) are used twice in the sheet and the Segment ID shows which one is wrong — ' + FD.fixes.slice(0, 3).map(function (x0) { return x0.f.raw0 + ' (segment ' + x0.seg + ', ' + x0.f.sta + ') → ' + x0.f.raw; }).join(' · ') + (FD.fixes.length > 3 ? ' …' : '') + '. Please correct the foundation sheet.');
    nN.slice(0, 5).forEach(function (k) { var q = J.near[k]; nt.push('1-character typo linked: drawing ' + q.ex + ' (' + q.from + ') ≈ axis ' + q.to + ' · ' + nf(q.n) + ' line(s).'); });
    if (nN.length > 5) nt.push('… ' + nf(nN.length - 5) + ' more 1-character links (see Print mapping / Excel mapping).');
    if (nA.length) nt.push(nf(nA.length) + ' drawing code(s) are 1 character from more than one axis and are NOT linked (e.g. ' + nA.slice(0, 3).map(function (k) { return k + ' → ' + J.amb[k].slice(0, 3).join(' / '); }).join(' · ') + ').');
    if (FD.dup.length) nt.push(nf(FD.dup.length) + ' axis ID(s) appear twice in the sheet (e.g. ' + FD.dup.slice(0, 3).join(', ') + ') — both foundations are shown.');
    if (FD.bad.length) nt.push(nf(FD.bad.length) + ' value(s) in the axis column are not axis IDs (e.g. ' + FD.bad.slice(0, 3).join(', ') + ').');
    FD.notes.concat(FSRCN.notes).forEach(function (x0) { nt.push(x0); });
    var nb = el('div', 'lg-fnote'); nt.forEach(function (x0) { nb.appendChild(el('div', null, x0)); }); box.appendChild(nb);
  }
  var fBusy = false;
  function fSrcChip() {                            /* where the foundation data comes from (live sheet / snapshot) + reload */
    var live = FSRCN.kind === 'live', warn = FSRCN.notes.length > 0;
    var b = el(fHas ? 'button' : 'span', 'upb lg-fsrc' + (live && !warn ? ' ok' : warn ? ' warn' : ''));
    if (fHas) {
      b.type = 'button'; b.disabled = fBusy;
      var sv = s('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', 'class': fBusy ? 'spin' : '' }, b);
      s('path', { d: 'M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 2.5v3h-3' }, sv);
      b.addEventListener('click', function () { fBusy = true; renderP5(); refreshF().then(function () { fBusy = false; if (state.page === 5) renderP5(); }); });
    }
    b.appendChild(document.createTextNode(fBusy ? 'Loading foundation sheet…' : live ? 'Foundation sheet · live ' + hhmm(FSRCN.at) : FSRCN.kind === 'code' ? 'Foundation snapshot' + (warn ? ' · sheet not reachable' : '') : 'Foundation data'));
    b.title = (FSRCN.name || '') + (FSRCN.notes.length ? '\n' + FSRCN.notes.join('\n') : '') + (fHas ? '\nClick to reload the foundation sheet now.' : '\nNo foundation link in the settings ("Pondasi Sumber" / "Pondasi Sheet ID") — embedded snapshot only.');
    return b;
  }
  function renderFList(list) {
    var wrap = clear($('f-tbl')), l2 = list.slice(), srt = state.fsort;
    if (srt === 'mat') l2.sort(function (a, b) { return b.lines.length - a.lines.length || a.n - b.n; });
    else if (srt === 'gap') l2.sort(function (a, b) { return fGap(a) - fGap(b) || a.n - b.n; });
    headBack($('f-head'), 'Axis register', nf(l2.length) + ' foundation(s)' + (fName() ? ' · ' + fName() : ''), fReset(),
      'One row per foundation of the foundation sheet, in sheet order. Material = packing-list lines whose drawing number starts with the axis ID (O / 0 treated alike, ranges such as "~ 5" expanded). Click a row for its material lines.');
    fActions($('f-head'), l2, false, 'axis');
    var t = el('table', 'lt'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    heads(tr, [['Axis ID', 'c-nm2'], ['STA · chainage', 'c-desc'], ['Area · earth works', 'c-desc'], ['Foundation', 'c-st'], ['Material position', 'c-st'], ['Pkgs'], ['Lines'], ['Material status', 'c-desc'], ['Remark', 'lg-wrap'], ['']]);
    var cap = state.fall ? l2.length : Math.min(l2.length, 300);
    l2.slice(0, cap).forEach(function (f) {
      var r = el('tr', 'go'), c0 = el('td', 'c-nm2'); c0.appendChild(el('span', 'lg-mono', f.raw));
      var sg = [f.fix ? 'sheet: ' + f.raw0 + ' (typo fixed)' : '', f.nrs ? '≈ ' + f.nrs : '', f.keys.length > 1 ? f.keys.length + ' axes' : '', f.grp, f.cls, f.typ].filter(Boolean).join(' · '); if (sg) c0.appendChild(el('small', null, sg)); r.appendChild(c0);
      var c1 = el('td', 'c-desc', f.sta); if (f.ch) c1.appendChild(el('small', null, f.ch)); r.appendChild(c1);
      var c3 = el('td', 'c-desc', f.area || '—'); if (f.earth) c3.appendChild(el('small', null, f.earth)); r.appendChild(c3);
      var c4 = el('td', 'c-st'); c4.appendChild(fChip(f.st)); r.appendChild(c4);
      var c5 = el('td', 'c-st'); c5.appendChild(matChip(f)); r.appendChild(c5);
      r.appendChild(el('td', f.pks.length ? '' : 'z', nf(f.pks.length))); r.appendChild(el('td', f.lines.length ? 'cum' : 'z', nf(f.lines.length)));
      var sc = {}; f.pks.forEach(function (p) { sc[p.st] = (sc[p.st] || 0) + 1; });
      r.appendChild(el('td', 'c-desc' + (f.pks.length ? '' : ' z'), f.pks.length ? STO.filter(function (k) { return sc[k]; }).map(function (k) { return nf(sc[k]) + ' ' + ST[k].s.toLowerCase(); }).join(' · ') : '—'));
      r.appendChild(el('td', 'lg-wrap lg-res', [f.rmF, f.rmU].filter(Boolean).join(' · ')));
      var ch = el('td', 'c-chev'); ch.appendChild(chevI()); r.appendChild(ch);
      rowKeys(r, function () { state.fax = f.n; renderP5(); $('f-tbl').scrollTop = 0; });
      tb.appendChild(r);
    });
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    if (cap < l2.length) { var mb = el('div', 'lg-more'), b = el('button', 'upb'); b.type = 'button'; b.appendChild(ico('list', 12)); b.appendChild(document.createTextNode('Show all ' + nf(l2.length) + ' foundations')); b.addEventListener('click', function () { state.fall = true; renderFList(list); }); mb.appendChild(b); wrap.appendChild(mb); }
    $('f-tip').textContent = 'Click an axis for its material lines (package, position, status, drawing) · Print / Excel take every axis of the filter';
  }
  function renderFAxis(f) {
    $('f-title').textContent = f.raw;
    headBack($('f-head'), f.raw, nf(f.lines.length) + ' material line(s) · ' + nf(f.pks.length) + ' package(s)', { t: 'All axes', fn: function () { state.fax = null; renderP5(); } },
      'Foundation from the foundation sheet; material = packing-list lines whose drawing number starts with ' + f.keys.join(' / ') + '.');
    fActions($('f-head'), [f], true);
    var wrap = clear($('f-tbl')), gs = el('div', 'gstrip');
    gs.appendChild(gateBox(f.ready ? 'ok' : /constraint|block/i.test(f.st) ? 'no' : 'part', 'found', 'Foundation', f.st, f.rmF || (f.ready ? 'ready (setting "Pondasi Siap")' : 'not ready')));
    gs.appendChild(gateBox(f.area ? 'ok' : 'part', 'pin', 'Area · earth works', f.area || '—', f.earth || '—'));
    gs.appendChild(gateBox('ok', 'ship', 'Location', f.sta, [f.ch, f.seg, f.grp, f.cls].filter(Boolean).join(' · ')));
    gs.appendChild(gateBox(f.mat === 'ON' ? 'ok' : f.mat === 'PART' ? 'part' : 'no', 'box', 'Material', FMAT[f.mat].t, f.pks.length ? nf(f.pks.length) + ' package(s) · ' + nf(f.lines.length) + ' line(s)' : 'no drawing ' + f.keys[0] + '… in Batch 4–5'));
    wrap.appendChild(gs);
    if (f.rmU) { var nu = el('div', 'lg-next'); nu.innerHTML = '<b>Upper structure:</b> ' + esc(f.rmU); wrap.appendChild(nu); }
    var nx = [];
    if (f.fix) nx.push('<b>Axis ID in the sheet:</b> ' + esc(f.raw0) + ' — read as ' + esc(f.raw) + ' (' + esc(f.fix) + '; the same ID is also used in another segment).');
    if (f.nrs) nx.push('<b>Linked with a 1-character typo:</b> ' + esc(f.nrs) + ' (drawing code ≈ axis ID).');
    var S0 = FD.segs[segOfKey(f.keys[0])];
    if (S0 && S0.lines.length) {
      var sl = {}; S0.lines.forEach(function (x) { if (x.p.onsite) { var k0 = lgName(x.p); sl[k0] = (sl[k0] || 0) + 1; } });
      nx.push('<b>Segment material ' + esc(S0.code) + '</b> (drawings without axis number, for all ' + nf(S0.fs.length) + ' foundations of the segment, ' + nf(S0.rd) + ' ready): ' + nf(S0.lines.length) + ' lines in ' + nf(S0.pks.length) + ' packages · on site ' + nf(S0.on) +
        (S0.on ? ' (' + esc(Object.keys(sl).sort().map(function (k0) { return k0 + ' ' + nf(sl[k0]); }).join(' · ')) + ')' : '') + '.');
    }
    if (nx.length) { var nb0 = el('div', 'lg-next'); nb0.innerHTML = nx.join('<br>'); wrap.appendChild(nb0); }
    var t = el('table', 'lt'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    heads(tr, [['Package', 'c-nm2'], ['Position', 'c-desc'], ['Status', 'c-st'], ['MDR', 'c-sc'], ['Drawing No', 'c-code'], ['Description', 'lg-wrap'], ['Qty'], ['Unit', 'c-sc'], ['Total wt (kg)'], ['']]);
    if (!f.lines.length) { var er = el('tr'), ec = el('td', 'z', 'No packing-list line has a drawing number of this axis (' + f.keys.join(', ') + ').'); ec.colSpan = 10; er.appendChild(ec); tb.appendChild(er); }
    f.lines.forEach(function (x) {
      var p = x.p, it = x.it, r = el('tr', 'go'), c0 = el('td', 'c-nm2'); c0.appendChild(el('span', 'lg-mono', p.no)); r.appendChild(c0);
      var lc = el('td', 'c-desc' + (p.onsite ? '' : ' z')); lc.appendChild(locChip(p)); r.appendChild(lc);
      var st = el('td', 'c-st'); st.appendChild(badge(p.lv, ST[p.st].s)); r.appendChild(st);
      r.appendChild(el('td', 'c-sc' + (p.mdrCr >= 1 ? '' : ' z'), MDRL[p.mdr] || p.mdr)); r.appendChild(el('td', 'c-code lg-dw', it.dw || '—'));
      var d = el('td', 'lg-wrap'); d.appendChild(document.createTextNode(it.d || '—')); if (it.cn) d.appendChild(el('span', 'lg-cn', it.cn)); r.appendChild(d);
      r.appendChild(el('td', '', it.q == null ? '—' : num(it.q, it.q % 1 ? 2 : 0))); r.appendChild(el('td', 'c-sc', it.u || '—')); r.appendChild(el('td', '', it.tw == null ? '—' : num(it.tw, 1)));
      var ch = el('td', 'c-chev'); ch.appendChild(chevI()); r.appendChild(ch);
      r.title = 'Open package ' + p.no; rowKeys(r, function () { openPackage(p.id); });
      tb.appendChild(r);
    });
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    $('f-tip').textContent = 'Click a line to open its package (gates, detail blocks, material lines)';
  }
  function fRowsX(list) {
    var rows = [['Axis ID', 'Axis codes', 'STA ID', 'Chainage', 'Segment', 'Structure group', 'Foundation class', 'Foundation type', 'Area status', 'Earth works', 'Foundation status',
      'Foundation ready', 'Remark foundation', 'Remark upper structure', 'Material', 'Packages', 'Material lines', 'Packages on site', 'Laydown / area', 'Ready', 'MDR pending', 'In transit', 'Package numbers', 'Drawing numbers']];
    list.forEach(function (f) {
      var on = f.pks.filter(function (p) { return p.onsite; }), lay = {}, dws = [];
      on.forEach(function (p) { lay[p.lg === NOLOC ? 'On-site' : p.lg] = 1; });
      f.lines.forEach(function (x) { if (x.it.dw && dws.indexOf(x.it.dw) < 0) dws.push(x.it.dw); });
      rows.push([f.raw, f.keys.join(' '), f.sta, f.ch, f.seg, f.grp, f.cls, f.typ, f.area, f.earth, f.st, f.ready ? 'yes' : 'no', f.rmF, f.rmU, FMAT[f.mat].t, f.pks.length, f.lines.length, on.length,
        Object.keys(lay).sort().join(', '), f.pks.filter(function (p) { return p.st === 'READY'; }).length, f.pks.filter(function (p) { return p.st === 'PEND'; }).length,
        f.pks.filter(function (p) { return !p.onsite; }).length, f.pks.map(function (p) { return p.no; }).join(', '), dws.join(', ')]);
    });
    return rows;
  }
  function fDoc(list) {
    var rows = list.map(function (f) {
      var dws = []; f.lines.forEach(function (x) { if (x.it.dw && dws.indexOf(x.it.dw) < 0) dws.push(x.it.dw); });
      var lay = {}; f.pks.forEach(function (p) { var k = p.onsite ? (p.lg === NOLOC ? 'On-site' : p.lg) : 'In transit'; lay[k] = (lay[k] || 0) + 1; });
      return '<tr class="ix"><td><b>' + esc(f.raw) + '</b><small>' + esc(f.sta + (f.ch ? ' · ' + f.ch : '')) + '</small></td><td><i class="fs" style="background:' + fMeta(f.st).c + '"></i>' + esc(f.st) +
        (f.rmF ? '<small>' + esc(f.rmF) + '</small>' : '') + '</td><td>' + esc(f.area || '—') + (f.earth ? '<small>' + esc(f.earth) + '</small>' : '') + '</td><td>' + esc(FMAT[f.mat].s) +
        '<small>' + esc(Object.keys(lay).sort().map(function (k) { return k + (lay[k] > 1 ? ' ×' + lay[k] : ''); }).join(' · ')) + '</small></td><td class="n">' + nf(f.pks.length) + '</td><td class="n">' + nf(f.lines.length) +
        '</td><td class="ds">' + (dws.length ? dws.map(function (d) { return '<span>' + esc(d) + '</span>'; }).join('') : '<i class="z">—</i>') + '</td></tr>';
    });
    var nm = list.filter(function (f) { return f.mat !== 'NONE'; }).length;
    return docShell((list.length === 1 ? list[0].raw : fName() || 'All axes') + ' · foundation register', nf(list.length) + ' foundation(s) · ' + nf(nm) + ' with material', cols([13, 15, 12, 13, 5, 5, 37]),
      ['Axis · STA', 'Foundation status', 'Area · earth works', 'Material', 'Pkgs', 'Lines', 'Drawing numbers'], '<tbody>' + rows.join('') + '</tbody>',
      'tr.ix{break-inside:auto}tr.ix td{padding:3pt 4pt}tr.ix b{font:700 8.6pt Consolas,"Courier New",monospace;display:block}tr.ix small{display:block}' +
      'i.fs{display:inline-block;width:7pt;height:7pt;border-radius:1.5pt;margin-right:4pt;vertical-align:-.5pt}td.ds span{display:inline-block;margin:0 8pt 0 0;font:700 7.6pt Consolas,"Courier New",monospace;white-space:nowrap}',
      { t: 'Foundation register', foot: 'Foundation = foundation sheet (Axis ID · Foundation Works) · material = packing-list lines whose drawing number starts with the axis ID (O = 0, ranges expanded).' });
  }
  function fActions(box, list, one, mode) {
    if (!one) {
      var mp = el('button', 'upb lg-act'); mp.type = 'button'; mp.appendChild(ico('print', 12)); mp.appendChild(document.createTextNode('Print mapping'));
      mp.title = 'A4 landscape: 1 material on site → foundation per laydown · 2 foundation ready → material not on site · 3 relation checks (STA filter and search apply)';
      mp.addEventListener('click', function () { printHtml(fMapDoc(scopeF('st mat'))); });
      var mx = el('button', 'upb lg-act'); mx.type = 'button'; mx.appendChild(ico('dl', 12)); mx.appendChild(document.createTextNode('Excel mapping'));
      mx.title = 'Excel (.xlsx), 3 sheets: on site → foundation (one row per laydown · package · axis), ready foundations with material missing, relation checks';
      mx.addEventListener('click', function () {
        var tag = (fName(true) || 'all').replace(/[\\\/:*?"<>|~]+/g, '-').replace(/\s*·\s*/g, ' ').replace(/\s+/g, ' ').slice(0, 60);
        xlsxBook(fMapX(scopeF('st mat'))).then(function (blob) { download('Foundation x material mapping ' + tag + ' ' + isoD(R.dd) + '.xlsx', blob); $('f-tip').textContent = 'Excel mapping ready (3 sheets).'; });
      });
      box.appendChild(mp); box.appendChild(mx);
      if (mode !== 'axis') return;
    }
    var pb = el('button', 'upb lg-act'); pb.type = 'button'; pb.appendChild(ico('print', 12)); pb.appendChild(document.createTextNode(one ? 'Print axis' : 'Print register'));
    pb.title = 'A4 landscape: axis, foundation status, area, material position and drawing numbers · ' + nf(list.length) + ' foundation(s)';
    pb.addEventListener('click', function () { printHtml(fDoc(list)); });
    var xb = el('button', 'upb lg-act'); xb.type = 'button'; xb.appendChild(ico('dl', 12)); xb.appendChild(document.createTextNode(one ? 'Excel' : 'Excel register'));
    xb.title = 'Excel (.xlsx): one row per foundation with its status and the material linked to it';
    xb.addEventListener('click', function () {
      var tag = (list.length === 1 ? list[0].raw : fName() || 'all axes').replace(/[\\\/:*?"<>|~]+/g, '-').replace(/\s*·\s*/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
      xlsxBlob('Foundation x material', fRowsX(list), [14, 22, 18, 13, 10, 16, 12, 10, 14, 12, 20, 8, 28, 28, 22, 9, 9, 9, 18, 7, 9, 9, 40, 60]).then(function (blob) {
        download('Foundation x material ' + tag + ' ' + isoD(R.dd) + '.xlsx', blob); $('f-tip').textContent = 'Excel file ready: ' + nf(list.length) + ' foundation(s).';
      });
    });
    box.appendChild(pb); box.appendChild(xb);
  }
  /* ---- mapping: material on site → foundation (per laydown) · foundation ready → material not on site ---- */
  function lgName(p) { return p.lg === NOLOC ? POSL.ONSITE : p.lg; }
  function wtTxt(kg) { return !kg ? '—' : kg >= 100 ? nf1(kg / 1000) + ' t' : num(kg, 0) + ' kg'; }
  function vals(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
  function fHere(f) { return f.pks.filter(function (p) { return p.onsite; }); }
  function fMiss(f) { return f.pks.filter(function (p) { return !p.onsite; }); }
  function stBreak(fs) { var o = {}; fs.forEach(function (f) { o[f.st] = (o[f.st] || 0) + 1; }); return fStatuses(fs).map(function (k) { return k + ' ' + nf(o[k]); }).join(' · '); }
  function areaTxt(fs) { var o = {}; fs.forEach(function (f) { var k = f.area || '—'; o[k] = (o[k] || 0) + 1; }); return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return k + (fs.length > 1 ? ' ×' + nf(o[k]) : ''); }).join(' · '); }
  function segTxt(f) { var S = FD.segs[segOfKey(f.keys[0])]; return S && S.lines.length ? 'segment ' + S.code + ': ' + nf(S.on) + ' of ' + nf(S.lines.length) + ' lines on site' : ''; }
  function fRest(a) {                                /* where the other packages of this axis are */
    var o = {}, n = 0;
    a.f.pks.forEach(function (p) { if (a.pk[p.id]) return; n++; var k = p.onsite ? lgName(p) : 'in transit'; o[k] = (o[k] || 0) + 1; });
    return n ? 'also ' + Object.keys(o).sort().map(function (k) { return k + ' ×' + o[k]; }).join(' · ') : 'all its material is here';
  }
  function fMap(list) {
    var inL = {}, G = {}, gl = [];
    list.forEach(function (f) { inL[f.n] = 1; });
    function grp(p) { var g = lgName(p); if (!G[g]) { G[g] = { name: g, ax: [], axi: {}, sg: [], sgi: {}, ln: new Set(), sl: 0, wt: 0, pk: {} }; gl.push(G[g]); } return G[g]; }
    function add(a, x) { a.pk[x.p.id] = x.p; a.lines.push(x); a.wt += x.it.tw || 0; if (x.it.dw && a.dw.indexOf(x.it.dw) < 0) a.dw.push(x.it.dw); }
    list.forEach(function (f) {
      f.lines.forEach(function (x) {
        if (!x.p.onsite) return;
        var g = grp(x.p), a = g.axi[f.n] || (g.axi[f.n] = g.ax[g.ax.length] = { f: f, pk: {}, lines: [], wt: 0, dw: [] });
        add(a, x); if (!g.ln.has(x.it)) { g.ln.add(x.it); g.wt += x.it.tw || 0; } g.pk[x.p.id] = 1;
      });
    });
    Object.keys(FD.segs).sort().forEach(function (c0) {
      var S = FD.segs[c0]; if (!S.fs.some(function (f) { return inL[f.n]; })) return;
      S.lines.forEach(function (x) {
        if (!x.p.onsite) return;
        var g = grp(x.p), a = g.sgi[c0] || (g.sgi[c0] = g.sg[g.sg.length] = { S: S, pk: {}, lines: [], wt: 0, dw: [] });
        add(a, x); g.sl++; g.wt += x.it.tw || 0; g.pk[x.p.id] = 1;
      });
    });
    gl.sort(function (a, b) { return (a.name === POSL.ONSITE) - (b.name === POSL.ONSITE) || (b.ln.size + b.sl) - (a.ln.size + a.sl) || (a.name < b.name ? -1 : 1); });
    gl.forEach(function (g) { g.ax.sort(function (a, b) { return (b.f.ready ? 1 : 0) - (a.f.ready ? 1 : 0) || a.f.n - b.f.n; }); });
    return { gs: gl, ready: list.filter(function (f) { return f.ready && f.mat !== 'ON'; }) };
  }
  function mRow(tb, n, cls, b, txt) { var r = el('tr', cls), c = el('td'); c.colSpan = n; if (b) c.appendChild(el('b', 'lg-pkno', b)); c.appendChild(el('span', 'lg-pkmeta', txt)); r.appendChild(c); tb.appendChild(r); }
  function pkCell(ps, loc) {
    var td = el('td', 'lg-wrap lg-pks');
    if (!ps.length) { td.textContent = '—'; td.className += ' z'; return td; }
    ps.forEach(function (p) { var s0 = el('span', 'lg-pkx'); s0.appendChild(el('b', 'lg-mono', p.no)); s0.appendChild(el('i', p.st === 'READY' && !loc ? 'ok' : null, loc ? lgName(p) : p.st === 'READY' ? ST[p.st].s : (p.onsite ? ST[p.st].s + ' · ' : p.st === 'AWAIT' ? '' : ST[p.st].s + ' · ') + 'MDR ' + (MDRL[p.mdr] || p.mdr))); td.appendChild(s0); });
    return td;
  }
  function axHead(r, f) {
    var c0 = el('td', 'c-nm2'); c0.appendChild(el('span', 'lg-mono', f.raw)); c0.appendChild(el('small', null, [f.fix ? 'sheet: ' + f.raw0 : '', f.sta, f.ch].filter(Boolean).join(' · '))); r.appendChild(c0);
    var c1 = el('td', 'c-st'); c1.appendChild(fChip(f.st)); if (f.rmF) c1.title = f.rmF; r.appendChild(c1);
    var c2 = el('td', 'c-desc', f.area || '—'); if (f.earth) c2.appendChild(el('small', null, f.earth)); r.appendChild(c2);
  }
  function axOpen(r, f) { var ch = el('td', 'c-chev'); ch.appendChild(chevI()); r.appendChild(ch); r.title = 'Open axis ' + f.raw; rowKeys(r, function () { state.fax = f.n; renderP5(); $('f-tbl').scrollTop = 0; }); }
  function renderFSite(list) {
    var M = fMap(list), wrap = clear($('f-tbl')), nAx = 0, nRd = 0, nLn = 0;
    M.gs.forEach(function (g) { nAx += g.ax.length; nRd += g.ax.filter(function (a) { return a.f.ready; }).length; nLn += g.ln.size + g.sl; });
    headBack($('f-head'), 'Material on site → foundation', nf(M.gs.length) + ' position(s) · ' + nf(nAx) + ' axis rows, ' + nf(nRd) + ' with foundation ready · ' + nf(nLn) + ' lines', fReset(true),
      'Every material line on site (laydown from the Summary Remark / site tags), with the foundation of its axis (drawing number → Axis ID) and the area status. Per laydown: foundation ready first (erection front), then not ready (material waits), then segment material (drawings without axis number, e.g. 02J3A-7H-6, which serve all foundations of the segment).');
    fActions($('f-head'), list, false, 'map');
    var t = el('table', 'lt lg-map'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    heads(tr, [['Axis · STA', 'c-nm2'], ['Foundation', 'c-st'], ['Area · earth works', 'c-desc'], ['Packages here', 'lg-wrap'], ['Lines'], ['Weight'], ['Rest of the axis material', 'lg-rest'], ['']]);
    if (!M.gs.length) mRow(tb, 8, '', '', 'No material on site for these foundations.');
    M.gs.forEach(function (g) {
      var rdy = g.ax.filter(function (a) { return a.f.ready; });
      mRow(tb, 8, 'lg-mg', g.name, [nf(g.ax.length) + ' axes (' + nf(rdy.length) + ' foundation ready)', nf(g.ln.size) + ' axis lines', g.sl ? nf(g.sl) + ' segment lines' : '', nf1(g.wt / 1000) + ' t'].filter(Boolean).join(' · '));
      [[rdy, 'Foundation ready — erection front: the material can go to its axis', 'g'], [g.ax.filter(function (a) { return !a.f.ready; }), 'Foundation not ready — the material waits at ' + g.name, 'w']].forEach(function (s0) {
        if (!s0[0].length) return;
        mRow(tb, 8, 'lg-ms ' + s0[2], '', s0[1] + ' · ' + nf(s0[0].length) + ' axes');
        s0[0].forEach(function (a) {
          var r = el('tr', 'go'); axHead(r, a.f); r.appendChild(pkCell(vals(a.pk))); r.appendChild(el('td', 'cum', nf(a.lines.length))); r.appendChild(el('td', '', wtTxt(a.wt)));
          r.appendChild(el('td', 'lg-rest' + (a.f.mat === 'ON' ? '' : ' lg-warn'), fRest(a))); axOpen(r, a.f); tb.appendChild(r);
        });
      });
      if (g.sg.length) {
        mRow(tb, 8, 'lg-ms s', '', 'Segment material — drawing without axis number, serves every foundation of the segment · ' + nf(g.sg.length) + ' segment(s)');
        g.sg.forEach(function (a) {
          var S = a.S, r = el('tr', 'lg-sgr'), c0 = el('td', 'c-nm2'); c0.appendChild(el('span', 'lg-mono', S.code + '-…')); c0.appendChild(el('small', null, segSta(S))); r.appendChild(c0);
          var c1 = el('td', 'c-st'); c1.appendChild(el('b', null, nf(S.rd) + ' of ' + nf(S.fs.length) + ' ready')); c1.title = stBreak(S.fs); r.appendChild(c1);
          r.appendChild(el('td', 'c-desc', areaTxt(S.fs))); r.appendChild(pkCell(vals(a.pk))); r.appendChild(el('td', 'cum', nf(a.lines.length))); r.appendChild(el('td', '', wtTxt(a.wt)));
          r.appendChild(el('td', 'lg-rest', 'segment total ' + nf(S.lines.length) + ' lines · ' + nf(S.on) + ' on site')); r.appendChild(el('td')); tb.appendChild(r);
        });
      }
    });
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    $('f-tip').textContent = 'Click an axis for all its material lines · Print mapping / Excel mapping: this list + foundations ready without material + relation checks';
  }
  function renderFReady(list) {
    var M = fMap(list), rd = M.ready, wrap = clear($('f-tbl'));
    headBack($('f-head'), 'Foundation ready → material', nf(rd.length) + ' ready foundation(s) without all their material on site', fReset(true),
      'Foundations whose status counts as ready (setting "Pondasi Siap") but whose material is not (completely) on site: partly on site, still in transit, or not in the packing lists at all.');
    fActions($('f-head'), list, false, 'map');
    var t = el('table', 'lt lg-map'), hd = el('thead'), tr = el('tr'), tb = el('tbody');
    heads(tr, [['Axis · STA', 'c-nm2'], ['Foundation', 'c-st'], ['Area · earth works', 'c-desc'], ['On site', 'lg-wrap'], ['Not on site yet', 'lg-wrap'], ['Segment material', 'lg-rest'], ['']]);
    if (!rd.length) mRow(tb, 7, '', '', 'Every ready foundation has its material on site.');
    [['PART', 'Material partly on site — packages still missing'], ['OFF', 'Material in transit — nothing on site yet'], ['NONE', 'No material in the packing lists (Batch 4–5) — follow up procurement / shipping']].forEach(function (G0) {
      var fs = rd.filter(function (f) { return f.mat === G0[0]; }); if (!fs.length) return;
      mRow(tb, 7, 'lg-mg', FMAT[G0[0]].s, G0[1] + ' · ' + nf(fs.length) + ' foundation(s)');
      fs.forEach(function (f) {
        var r = el('tr', 'go'); axHead(r, f); r.appendChild(pkCell(fHere(f), true));
        var c4 = pkCell(fMiss(f)); if (f.mat === 'NONE') { c4.textContent = 'no drawing ' + f.keys[0] + '… in the packing lists'; c4.className += ' z'; } r.appendChild(c4);
        r.appendChild(el('td', 'lg-rest', segTxt(f) || '—')); axOpen(r, f); tb.appendChild(r);
      });
    });
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
    $('f-tip').textContent = 'Click an axis for its material lines · Print mapping / Excel mapping include this list';
  }
  function fChecks() {                               /* relation checks for the print and the Excel */
    var J = fJoin(), o = [];
    FD.fixes.forEach(function (x0) { o.push(['Register typo fixed (Segment ID)', x0.f.raw0, x0.f.raw, 1, x0.f.sta + ' · Segment ID ' + x0.seg + ' · the same ID is used in another segment']); });
    Object.keys(J.near).forEach(function (k) { var q = J.near[k]; o.push(['1-character typo linked', q.from, q.to, q.n, 'e.g. drawing ' + q.ex]); });
    Object.keys(J.amb).forEach(function (k) { o.push(['1 character from several axes — not linked', k, J.amb[k].join(' / '), '', '']); });
    Object.keys(FD.segs).sort().forEach(function (c0) { var S = FD.segs[c0]; if (S.lines.length) o.push(['Segment drawing (no axis number)', c0 + '-…', nf(S.fs.length) + ' foundations of ' + c0, S.lines.length, nf(S.on) + ' lines on site · ' + nf(S.rd) + ' foundations ready']); });
    Object.keys(J.unm).sort().forEach(function (pf) { o.push(['No foundation in the sheet', 'drawings ' + pf + '…', '', J.unm[pf].n, (pf === '01' ? 'OLC-1 · ' : '') + 'e.g. ' + J.unm[pf].ex.join(', ')]); });
    Object.keys(J.segU).sort().forEach(function (pf) { o.push(['Segment not in the sheet', 'drawings ' + pf + '…', '', J.segU[pf], pf === '01' ? 'OLC-1 segment drawings' : '']); });
    FD.dup.forEach(function (k) { o.push(['Axis ID used twice (not resolved)', k, '', FD.by[k].length, FD.by[k].map(function (f) { return f.sta; }).join(' / ')]); });
    FD.bad.forEach(function (v) { o.push(['Not an axis ID (column ' + FD.axisCol.split(' ')[0] + ')', v, '', '', '']); });
    return o;
  }
  function dwPack(ds) {                              /* print: "02J3A-7H-1", "-2", "-3", "-9" → "02J3A-7H- 1–3, 9" (every number kept) */
    var g = {}, o = [];
    ds.forEach(function (d) { var m = /^(.+-)([1-9]\d{0,3})$/.exec(d); if (!m) { o.push({ s: d }); return; } if (!g[m[1]]) { g[m[1]] = []; o.push({ k: m[1] }); } g[m[1]].push(+m[2]); });
    return o.map(function (x) {
      if (x.s != null) return '<span>' + esc(x.s) + '</span>';
      var ns = g[x.k].sort(function (a, b) { return a - b; }); if (ns.length === 1) return '<span>' + esc(x.k + ns[0]) + '</span>';
      var rs = [], a = ns[0], b = ns[0];
      for (var i = 1; i <= ns.length; i++) { var n = ns[i]; if (n === b + 1) b = n; else { rs.push(a === b ? String(a) : b === a + 1 ? a + ', ' + b : a + '–' + b); a = b = n; } }
      return '<span>' + esc(x.k) + '<em>' + rs.join(', ') + '</em></span>';
    }).join(' ');
  }
  function fMapDoc(list) {
    var M = fMap(list), nm = fName(true), cnt = { PART: 0, OFF: 0, NONE: 0 };
    M.ready.forEach(function (f) { cnt[f.mat]++; });
    function pks(ps, loc) {                         /* packages grouped by status (or by laydown), one run per group */
      if (!ps.length) return '<i class="z">—</i>';
      var g = {}, o = [];
      ps.forEach(function (p) { var k = loc ? lgName(p) : ST[p.st].s + (p.st === 'READY' ? '' : ' · MDR ' + (MDRL[p.mdr] || p.mdr)); if (!g[k]) { g[k] = []; o.push(k); } g[k].push(p.no); });
      return o.map(function (k) {
        var ns = g[k], a = ns.length > 1 ? ns[0] : '';           /* shared start of the package numbers, e.g. "P5-HHI-8321-", written once */
        ns.forEach(function (s0) { var i = 0; while (i < a.length && a.charAt(i) === s0.charAt(i)) i++; a = a.slice(0, i); });
        var j = a.lastIndexOf('-'), pf = j >= 5 ? a.slice(0, j + 1) : '';
        return '<span class="p"><i>' + esc(k) + ' (' + ns.length + ')' + (pf ? ', ' + esc(pf) + '…' : '') + ':</i> ' + ns.map(function (n0) { return '<b>' + esc(n0.slice(pf.length)) + '</b>'; }).join(' · ') + '</span>';
      }).join('');
    }
    function dws(a) { return dwPack(a.dw); }
    function ax(f, short) {
      return '<td><b class="ax">' + esc(f.raw) + '</b><small>' + esc([f.sta, f.ch].filter(Boolean).join(' · ')) + '</small>' + (f.fix ? '<small class="fx">sheet: ' + esc(f.raw0) + ' (typo fixed)</small>' : '') + (f.nrs ? '<small class="fx">≈ ' + esc(f.nrs) + '</small>' : '') +
        '</td><td><i class="fs" style="background:' + fMeta(f.st).c + '"></i>' + esc(f.st) + (f.rmF && !short ? '<small>' + esc(f.rmF) + '</small>' : '') + '</td><td>' + esc(f.area || '—') + (f.earth ? '<small>' + esc(f.earth) + '</small>' : '') + '</td>';
    }
    var sum = '<table class="sm">' + cols([28, 12, 14, 12, 12, 12, 10]) + '<thead><tr><th>Material on site · position</th><th>Axes</th><th>Foundation ready</th><th>Not ready</th><th>Axis lines</th><th>Segment lines</th><th>t</th></tr></thead><tbody>' +
      M.gs.map(function (g) { var r0 = g.ax.filter(function (a) { return a.f.ready; }).length; return '<tr><td><b>' + esc(g.name) + '</b></td><td class="n">' + nf(g.ax.length) + '</td><td class="n">' + nf(r0) + '</td><td class="n">' + nf(g.ax.length - r0) + '</td><td class="n">' + nf(g.ln.size) + '</td><td class="n">' + nf(g.sl) + '</td><td class="n">' + nf1(g.wt / 1000) + '</td></tr>'; }).join('') +
      '</tbody></table><table class="sm">' + cols([64, 36]) + '<thead><tr><th>Foundation ready · material not on site</th><th>Foundations</th></tr></thead><tbody>' +
      ['PART', 'OFF', 'NONE'].map(function (k) { return '<tr><td>' + esc({ PART: 'Partly on site (packages missing)', OFF: 'In transit (nothing on site)', NONE: 'Not in the packing lists (Batch 4–5)' }[k]) + '</td><td class="n">' + nf(cnt[k]) + '</td></tr>'; }).join('') +
      '<tr class="t"><td>Total</td><td class="n">' + nf(M.ready.length) + '</td></tr></tbody></table>';
    var b1 = M.gs.map(function (g) {
      var rdy = g.ax.filter(function (a) { return a.f.ready; }), h = '<tr class="g"><td colspan="7"><b>' + esc(g.name) + '</b>' + esc(nf(g.ax.length) + ' axes · ' + nf(rdy.length) + ' foundation ready · ' + nf(g.ln.size) + ' axis lines' + (g.sl ? ' · ' + nf(g.sl) + ' segment lines' : '') + ' · ' + nf1(g.wt / 1000) + ' t') + '</td></tr>';
      [[rdy, 'Foundation ready — erection front: material can go to its axis', 'r'], [g.ax.filter(function (a) { return !a.f.ready; }), 'Foundation not ready — material waits at ' + g.name, 'n']].forEach(function (s0) {
        if (!s0[0].length) return;
        h += '<tr class="s ' + s0[2] + '"><td colspan="7">' + esc(s0[1] + ' · ' + nf(s0[0].length) + ' axes') + '</td></tr>' + s0[0].map(function (a) {
          return '<tr class="a">' + ax(a.f) + '<td>' + pks(vals(a.pk)) + '</td><td class="n">' + nf(a.lines.length) + '<small>' + wtTxt(a.wt) + '</small></td><td class="ds">' + dws(a) + '</td><td>' + esc(fRest(a)) + '</td></tr>';
        }).join('');
      });
      if (g.sg.length) h += '<tr class="s g2"><td colspan="7">Segment material — drawing without axis number, serves every foundation of the segment</td></tr>' + g.sg.map(function (a) {
        var S = a.S; return '<tr class="sg"><td><b class="ax">' + esc(S.code) + '-…</b><small>' + esc(segSta(S)) + '</small></td><td>' + nf(S.rd) + ' of ' + nf(S.fs.length) + ' foundations ready<small>' + esc(stBreak(S.fs)) + '</small></td><td>' + esc(areaTxt(S.fs)) +
          '</td><td>' + pks(vals(a.pk)) + '</td><td class="n">' + nf(a.lines.length) + '<small>' + wtTxt(a.wt) + '</small></td><td class="ds">' + dws(a) + '</td><td>segment total ' + nf(S.lines.length) + ' lines · ' + nf(S.on) + ' on site</td></tr>';
      }).join('');
      return '<tbody>' + h + '</tbody>';
    }).join('') || '<tbody><tr><td colspan="7" class="z">No material on site for these foundations.</td></tr></tbody>';
    var b2 = ['PART', 'OFF', 'NONE'].map(function (k) {
      var fs = M.ready.filter(function (f) { return f.mat === k; }), st0 = null; if (!fs.length) return '';
      return '<tbody><tr class="g"><td colspan="6"><b>' + esc(FMAT[k].s) + '</b>' + esc({ PART: 'packages still missing', OFF: 'nothing on site yet', NONE: 'no drawing of the axis in the packing lists (Batch 4–5)' }[k] + ' · ' + nf(fs.length) + ' foundations') + '</td></tr>' +
        fs.map(function (f) {
          var sh = f.sta !== st0 ? '<tr class="s t2"><td colspan="6">' + esc(f.sta) + '</td></tr>' : ''; st0 = f.sta;
          return sh + '<tr class="r"><td><b class="ax">' + esc(f.raw) + '</b><small>' + esc(f.ch || '') + '</small>' + (f.fix ? '<small class="fx">sheet: ' + esc(f.raw0) + ' (typo fixed)</small>' : '') + (f.nrs ? '<small class="fx">≈ ' + esc(f.nrs) + '</small>' : '') +
            '</td><td><i class="fs" style="background:' + fMeta(f.st).c + '"></i>' + esc(f.st) + '</td><td>' + esc([f.area, f.earth].filter(Boolean).join(' · ') || '—') + '</td><td>' + pks(fHere(f), true) + '</td><td>' +
            (k === 'NONE' ? '<i class="z">not in the packing lists</i>' : pks(fMiss(f))) + '</td><td>' + esc(segTxt(f) || '—') + '</td></tr>';
        }).join('') + '</tbody>';
    }).join('') || '<tbody><tr><td colspan="6" class="z">Every ready foundation has its material on site.</td></tr></tbody>';
    var ck = fChecks();
    var html = '<div class="sum">' + sum + '</div>' +
      '<h2>1 · Material on site → foundation</h2><p class="i">Per laydown / position: every axis with material there — foundation status, area status, the packages and drawing numbers at this position, and where the rest of the axis material is. Foundation ready first (erection front), then not ready (material waits). Segment material (drawing without axis number, e.g. 02J3A-7H-6) is listed per segment.</p>' +
      '<table class="m1">' + cols([11, 13, 9, 22, 5, 28, 12]) + '<thead><tr><th>Axis · STA</th><th>Foundation status</th><th>Area · earth works</th><th>Packages here</th><th>Lines</th><th>Drawing numbers here</th><th>Rest of the axis material</th></tr></thead>' + b1 + '</table>' +
      '<h2 class="pb">2 · Foundation ready → material not (fully) on site</h2><p class="i">Foundations whose status counts as ready (setting "Pondasi Siap": ' + esc(P_FREADY.join(', ')) + ') but whose material is not completely on site.</p>' +
      '<table class="m2">' + cols([11, 12, 13, 22, 26, 16]) + '<thead><tr><th>Axis · STA</th><th>Foundation status</th><th>Area · earth works</th><th>On site</th><th>Not on site yet (status · MDR)</th><th>Segment material</th></tr></thead>' + b2 + '</table>' +
      '<h2>3 · Relation checks (foundation sheet ↔ drawing numbers)</h2><table class="sm">' + cols([26, 13, 18, 8, 35]) + '<thead><tr><th>Check</th><th>Code</th><th>Linked to</th><th>Lines</th><th>Detail</th></tr></thead><tbody>' +
      (ck.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td><b class="ax">' + esc(r[1]) + '</b></td><td>' + esc(r[2]) + '</td><td class="n">' + (r[3] === '' ? '' : nf(r[3])) + '</td><td>' + esc(r[4]) + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="z">No remarks.</td></tr>') + '</tbody></table>';
    var nAx = 0; M.gs.forEach(function (g) { nAx += g.ax.length; });
    return docShell(nm || 'All foundations', nf(M.gs.length) + ' position(s) · ' + nf(nAx) + ' axis rows · ' + nf(M.ready.length) + ' ready without material · foundation data: ' + esc(FSRCN.kind === 'live' ? 'live ' + hhmm(FSRCN.at) : 'snapshot'), '', [], '',
      'h2{font-size:11pt;margin:12pt 0 3pt;color:#1e2b25}h2.pb{break-before:page}p.i{margin:0 0 5pt;color:#4a5750;font-size:7.8pt}.sum{display:flex;gap:14pt;align-items:flex-start}.sum table{width:auto;flex:1}' +
      'table.sm td,table.sm th{padding:2pt 5pt}tr.t td{font-weight:700;border-top:1pt solid #263d33}tr.g td{background:#e3ebe1;border-top:1.4pt solid #263d33;padding:4pt;font-size:8.2pt}tr.g b{font-size:10pt;margin-right:8pt}' +
      'tr.s td{font-weight:700;font-size:7.6pt;padding:3pt 4pt;letter-spacing:.02em}tr.s.r td{color:#1f6b43;background:#eef6f0}tr.s.n td{color:#8a5a12;background:#fbf3e6}tr.s.g2 td{color:#3b4a6b;background:#eef1f7}tr.s.t2 td{color:#33413a;background:#f4f6f3;font-weight:600}' +
      'tr.a,tr.r,tr.sg{break-inside:avoid}b.ax{font:700 8.6pt Consolas,"Courier New",monospace;display:block}td small{display:block}small.fx{color:#a1531c}' +
      'span.p{display:block}span.p i{font-style:normal;color:#5d6a63;font-size:7.2pt}span.p b{font:700 7.6pt Consolas,"Courier New",monospace;white-space:nowrap}' +
      'td.ds{line-height:1.45}td.ds span{font:700 7.2pt Consolas,"Courier New",monospace;margin-right:3pt}td.ds span em{font:400 7.2pt Arial,sans-serif;color:#33413a;margin-left:1pt}' +
      'i.fs{display:inline-block;width:7pt;height:7pt;border-radius:1.5pt;margin-right:4pt;vertical-align:-.5pt}',
      { t: 'Foundation × material mapping', raw: html, foot: 'Foundation = foundation sheet (Axis ID · Foundation Works · Area Status) · material = packing-list lines, position from the Summary Remark / site tags · axis link = drawing number starts with the Axis ID (O = 0, ranges expanded, 1-character typos within the same OLC line linked and listed in section 3).' });
  }
  function fMapX(list) {                             /* Excel mapping: 3 sheets */
    var M = fMap(list), s1 = [['Position', 'Package No', 'Batch', 'Category', 'Package status', 'MDR status', 'Link', 'Axis ID', 'Axis ID in sheet', 'Segment', 'STA ID', 'Chainage', 'Foundation status', 'Foundation ready', 'Area status', 'Earth works', 'Remark foundation', 'Lines', 'Weight (kg)', 'Drawing numbers']];
    function part(a, p) { var ls = a.lines.filter(function (x) { return x.p === p; }), d = [], w = 0, hw = false; ls.forEach(function (x) { if (x.it.tw != null) { hw = true; w += x.it.tw; } if (x.it.dw && d.indexOf(x.it.dw) < 0) d.push(x.it.dw); }); return { ls: ls, d: d, w: hw ? Math.round(w * 10) / 10 : '' }; }
    M.gs.forEach(function (g) {
      g.ax.forEach(function (a) { var f = a.f; vals(a.pk).forEach(function (p) { var q = part(a, p);
        s1.push([g.name, p.no, p.b, p.c, ST[p.st].s, MDRL[p.mdr] || p.mdr, q.ls.some(function (x) { return x.nr; }) ? 'axis (1-character typo)' : 'axis', f.raw, f.raw0 !== f.raw ? f.raw0 : '', segOfKey(f.keys[0]), f.sta, f.ch, f.st, f.ready ? 'yes' : 'no', f.area, f.earth, f.rmF, q.ls.length, q.w, q.d.join(', ')]); }); });
      g.sg.forEach(function (a) { var S = a.S; vals(a.pk).forEach(function (p) { var q = part(a, p);
        s1.push([g.name, p.no, p.b, p.c, ST[p.st].s, MDRL[p.mdr] || p.mdr, 'segment (no axis number)', '', '', S.code, segSta(S), '', stBreak(S.fs), nf(S.rd) + ' of ' + nf(S.fs.length), areaTxt(S.fs), '', '', q.ls.length, q.w, q.d.join(', ')]); }); });
    });
    var s2 = [['Axis ID', 'Axis ID in sheet', 'STA ID', 'Chainage', 'Foundation status', 'Remark foundation', 'Area status', 'Earth works', 'Material', 'Packages on site', 'On site at', 'Packages not on site', 'Package numbers not on site', 'MDR of those packages', 'Material lines of the axis', 'Segment material']];
    M.ready.forEach(function (f) {
      var h = fHere(f), m = fMiss(f), at = [], md = [];
      h.forEach(function (p) { if (at.indexOf(lgName(p)) < 0) at.push(lgName(p)); }); m.forEach(function (p) { var x = MDRL[p.mdr] || p.mdr; if (md.indexOf(x) < 0) md.push(x); });
      s2.push([f.raw, f.raw0 !== f.raw ? f.raw0 : '', f.sta, f.ch, f.st, f.rmF, f.area, f.earth, FMAT[f.mat].t, h.length, at.join(', '), m.length, m.map(function (p) { return p.no; }).join(', '), md.join(', '), f.lines.length, segTxt(f)]);
    });
    var s3 = [['Check', 'Code', 'Linked to', 'Lines', 'Detail']].concat(fChecks());
    return [{ n: 'On site to foundation', r: s1, w: [18, 26, 7, 8, 13, 13, 16, 12, 12, 9, 18, 13, 20, 9, 16, 12, 28, 7, 10, 60] },
      { n: 'Ready - material missing', r: s2, w: [12, 12, 18, 13, 18, 28, 16, 12, 22, 9, 18, 9, 40, 18, 9, 30] },
      { n: 'Relation checks', r: s3, w: [34, 16, 22, 8, 50] }];
  }
  function renderP5() {
    var msg = function (t) { clear($('f-kpi')); clear($('f-mx')).appendChild(el('div', 'd-empty', t)); clear($('f-tbl')); clear($('f-head')); };
    $('f-mx').style.display = '';
    if (!FD) {
      $('f-title').textContent = 'Foundation × material';
      msg(fHas ? (FSRCN.kind === 'error' ? 'The foundation sheet could not be read: ' + FSRCN.notes.join(' ') : 'Loading the foundation sheet…') :
        'No foundation data yet — fill in "Pondasi Sumber" (Publish to web CSV link of the foundation tab) or "Pondasi Sheet ID" in the settings block.');
      return;
    }
    if (!R.items) { msg('Loading material lines…'); ensureItems(function () { if (state.page === 5) renderP5(); }); return; }
    fJoin(); renderFFilters();
    var f0 = state.fax != null ? FD.list[state.fax] : null;
    var vw = state.fview;
    renderFKpi(scopeF('st mat'));
    setSeg('f-sort', state.fsort); setSeg('f-view', vw);
    $('f-sort').style.display = f0 || vw !== 'axis' ? 'none' : ''; $('f-view').style.display = f0 ? 'none' : '';
    if (f0) { $('f-mx').style.display = 'none'; renderFAxis(f0); return; }
    var nm = fName(vw !== 'axis');
    $('f-title').textContent = vw === 'axis' ? (nm ? nm.charAt(0).toUpperCase() + nm.slice(1) : 'All axes') : (vw === 'site' ? 'Material on site → foundation' : 'Foundation ready → material') + (nm ? ' · ' + nm : '');
    renderFMx();
    if (vw === 'site') renderFSite(scopeF('st mat')); else if (vw === 'ready') renderFReady(scopeF('st mat')); else renderFList(scopeF());
  }
  /* loading the foundation sheet: embedded snapshot first, then the sheet (Publish to web CSV, or Sheet ID + tab via gviz) */
  function fSrc() {
    var pub = T(cfg.pondasisumber), sidF = T(cfg.pondasisheetid), tab = T(cfg.pondasitab), m0 = /\/spreadsheets\/d\/(?!e\/)([A-Za-z0-9_-]{20,})/.exec(sidF);
    if (m0) sidF = m0[1];
    if (!tab) { var g0 = /[?&#]gid=(\d+)/.exec(pub) || /[?&#]gid=(\d+)/.exec(T(cfg.pondasisheetid)); if (g0) tab = g0[1]; }
    if (/\/spreadsheets\/d\/(?!e\/)/.test(pub)) { var m1 = /\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(pub); if (m1 && !sidF) sidF = m1[1]; pub = ''; }
    return { pub: pub ? pubCsv(pub) : '', sid: sidF, tab: tab };
  }
  var FS = fSrc(), fHas = !!(FS.pub || FS.sid);
  function fMethods() {
    var ms = [];
    if (FS.pub && /^https:\/\//i.test(FS.pub)) ms.push({ name: 'foundation sheet (Publish to web)', run: function () { return fetchText(FS.pub + (FS.pub.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now()); } });
    if (FS.sid) {
      var gv = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(FS.sid) + '/gviz/tq?headers=1' + (FS.tab ? (/^\d+$/.test(FS.tab) ? '&gid=' + FS.tab : '&sheet=' + encodeURIComponent(FS.tab)) : '');
      ms.push({ name: 'foundation sheet (Sheet ID)', run: function () { return fetchText(gv + '&tqx=out:csv&_=' + Date.now()); } });
      ms.push({ name: 'foundation sheet (Sheet ID, JSONP)', run: function () { return jsonp(gv + '&_=' + Date.now()); } });
    }
    return ms;
  }
  var fSig = null;
  function setFoundation(txt, kind, name) {
    if (txt == null || txt === fSig) return;
    var P = parseFoundation(txt);
    if (P.error) { FSRCN.notes = [(name || 'foundation data') + ': ' + P.error]; if (!FD) FSRCN.kind = 'error'; if (R && state.page === 5) renderP5(); return; }
    fSig = txt; FD = P; FJ = null; FSRCN = { kind: kind, name: name || (kind === 'code' ? 'snapshot embedded in this page' : 'foundation sheet'), at: kind === 'live' ? Date.now() : null, notes: [] };
    if (R) { if (state.page === 5) renderP5(); else if (state.page === 3 && (state.pview === 'dwg' || state.pkg)) renderP3(); }
  }
  function refreshF() {
    var ms = fMethods(); if (!ms.length) return Promise.resolve();
    return new Promise(function (resolve) {
      var lg = [];
      (function next(i) {
        if (i >= ms.length) {
          if (!FD) FSRCN.kind = 'error';
          FSRCN.notes = ['Live foundation sheet not reachable — ' + (FD ? 'the ' + (FSRCN.kind === 'live' ? 'last loaded sheet' : 'embedded snapshot') + ' is shown' : 'no foundation data') + ' (' + lg.join(' · ') + ').'];
          if (R && state.page === 5) renderP5(); resolve(); return;
        }
        ms[i].run().then(function (data) {
          var txt = asText(data), P = parseFoundation(Array.isArray(data) ? data : txt);
          if (P.error) throw new Error(P.error);
          setFoundation(txt, 'live', ms[i].name); resolve();
        }).catch(function (e) { lg.push(ms[i].name + ': ' + ((e && e.message) || e)); next(i + 1); });
      })(0);
    });
  }

  /* ---------- 10. navigasi & render ---------- */
  var NPG = 5, prevPage = 1;
  function placePill(nv, from, to) {
    var p = nv.querySelector('.pill');
    if (!p) { p = el('span', 'pill'); p.setAttribute('aria-hidden', 'true'); nv.insertBefore(p, nv.firstChild); nv.classList.add('has-pill'); }
    var a = nv.querySelector('[data-go="' + from + '"]'), b = nv.querySelector('[data-go="' + to + '"]');
    if (!b) return;
    if (a && a !== b && !reduce) { p.style.transition = 'none'; p.style.left = a.offsetLeft + 'px'; p.style.width = a.offsetWidth + 'px'; void p.offsetWidth; p.style.transition = ''; }
    p.style.left = b.offsetLeft + 'px'; p.style.width = b.offsetWidth + 'px';
  }
  function placeAllPills() {
    Array.prototype.forEach.call(root.querySelectorAll('.nav'), function (nv) {
      var pr = nv.querySelector('[aria-pressed="true"]'); if (!pr) return;
      var t0 = +pr.getAttribute('data-go'); placePill(nv, t0, t0);
      var p = nv.querySelector('.pill'); p.style.transition = 'none'; placePill(nv, t0, t0); void p.offsetWidth; p.style.transition = '';
    });
  }
  function renderPage(pg) { if (!R) return; if (pg === 1) renderP1(); else if (pg === 2) renderP2(); else if (pg === 3) renderP3(); else if (pg === 4) renderP4(); else renderP5(); }
  function go(page) {
    if (page === state.page || page > NPG) { if (page === state.page && R) renderPage(page); return; }
    var fwd = page > state.page; state.page = page; hideTip(); closeDrop();
    for (var q = 1; q <= NPG; q++) {
      var pg = $('pg' + q), on = q === page;
      pg.classList.remove('in-l', 'in-r'); pg.classList.toggle('off', !on);
      if (on) { void pg.offsetWidth; pg.classList.add(fwd ? 'in-r' : 'in-l'); }
      pg.setAttribute('aria-hidden', on ? 'false' : 'true'); if ('inert' in pg) pg.inert = !on;
    }
    Array.prototype.forEach.call(root.querySelectorAll('.nav button'), function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-go') === page ? 'true' : 'false'); });
    var nv = $('pg' + page).querySelector('.nav'); if (nv) placePill(nv, prevPage, page);
    prevPage = page;
    animPage = true; renderPage(page); setTimeout(function () { animPage = false; }, 200);
    try { if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) {}
  }
  root.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-go]'); if (b) go(+b.getAttribute('data-go')); });
  root.addEventListener('keydown', function (e) {
    var b = e.target.closest && e.target.closest('.nav button'); if (!b || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    var to = Math.max(1, Math.min(NPG, state.page + (e.key === 'ArrowRight' ? 1 : -1))); e.preventDefault(); go(to);
    var nb = $('pg' + to).querySelector('.nav [data-go="' + to + '"]'); if (nb) nb.focus();
  });
  for (var q0 = 2; q0 <= NPG; q0++) if ('inert' in $('pg' + q0)) $('pg' + q0).inert = true;
  placeAllPills();
  window.addEventListener('resize', placeAllPills);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeAllPills);
  function segBind(id, key, fn) { Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) { b.addEventListener('click', function () { state[key] = b.getAttribute('data-v'); setSeg(id, state[key]); fn(); }); }); }
  function setSeg(id, v) { var x0 = $(id); if (!x0) return; Array.prototype.forEach.call(x0.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); }); }
  segBind('r-view', 'rview', function () { if (R) renderP2(); });
  segBind('r-sort', 'rsort', function () { if (R) renderP2(); });
  segBind('p-sort', 'psort', function () { if (R) renderP3(); });
  segBind('p-view', 'pview', function () { state.pdall = false; if (R) renderP3(); });
  segBind('f-sort', 'fsort', function () { state.fall = false; if (R) renderP5(); });
  segBind('f-view', 'fview', function () { state.fax = null; state.fall = false; $('f-tbl').scrollTop = 0; if (R) renderP5(); });
  var fqT = null;
  $('f-q').addEventListener('input', function (e) { clearTimeout(fqT); var v = e.target.value; fqT = setTimeout(function () { state.fq = v.trim(); state.fax = null; state.fall = false; if (R) renderP5(); }, 200); });
  var qT = null;
  $('p-q').addEventListener('input', function (e) {
    clearTimeout(qT); var v = e.target.value;
    qT = setTimeout(function () {
      state.q = v.trim(); state.pkg = null; state.blk = null; state.pall = false;
      if (U(state.q).length >= 3 && !R.items) ensureItems(function () { if (R) renderP3(); }); else if (R) renderP3();
    }, 180);
  });
  var lastW = {};
  if (window.ResizeObserver) new ResizeObserver(function () {
    if (!R) return;
    var w = root.clientWidth; if (lastW.w === w) return; lastW.w = w;
    clearTimeout(lastW.t); lastW.t = setTimeout(function () { renderPage(state.page); }, 120);
  }).observe(root);
  function renderAll() { renderShared(); for (var q = 1; q <= NPG; q++) if (q === state.page || q === 1) renderPage(q); }

  /* ---------- 11. render + muat data (data cadangan → Google Sheets) ---------- */
  var drawn = false;
  function render(ins, kind, notes) {
    var r = build(ins.pkg, ins.blk, ins.iss, ins.itm);
    if (r.error) return r.error;
    var keepItems = R && R.itmIn === r.itmIn ? R.items : null;
    R = r; if (keepItems) { R.items = keepItems; R.itemsN = Object.keys(keepItems).reduce(function (s0, k) { return s0 + keepItems[k].length; }, 0); }
    srcState = { kind: kind, notes: notes || [] };
    renderAll(); drawn = true;
    return true;
  }
  /* a data block is plain text (TSV pasted from the sheet) or, with data-z="1", compressed by the builder (base64 · zlib) */
  function blockSrc(id) {
    var e = $(id), t = e ? e.textContent.trim() : '';
    if (!t) return null;
    return e.getAttribute('data-z') ? function () { return unzip(bytes(t)).then(text); } : t;
  }
  function settle(v) { return typeof v === 'function' ? v() : Promise.resolve(v); }
  var EMB = { pkg: blockSrc('lg-data-pkg'), blk: blockSrc('lg-data-blk'), iss: blockSrc('lg-data-iss'), itm: blockSrc('lg-data-itm'), fnd: blockSrc('lg-data-fnd') };
  var first = 'no embedded data';
  function showFirst() {
    if (first === true) return;
    var msg = first !== 'no embedded data' ? 'Data error: ' + first : hasSrc ? 'Loading data from Google Sheets…' : 'No data yet — fill in "Sheet ID" in the settings block or paste the data blocks';
    Array.prototype.forEach.call(root.querySelectorAll('.ddt'), function (n0) { n0.textContent = msg; });
  }
  var embReady = !EMB.pkg ? Promise.resolve() : Promise.all([settle(EMB.pkg), settle(EMB.blk), settle(EMB.iss)]).then(function (a) {
    EMB.pkg = a[0]; EMB.blk = a[1]; EMB.iss = a[2];                       /* items stay packed until a package or a search needs them */
    first = render(EMB, 'code', []);
  }, function (e) { first = 'embedded data could not be unpacked (' + ((e && e.message) || e) + ')'; });
  embReady.then(showFirst);
  if (EMB.fnd) settle(EMB.fnd).then(function (t0) { var e0 = $('lg-data-fnd'); setFoundation(t0, 'code', 'snapshot embedded in this page' + (e0 && e0.getAttribute('data-src') ? ' (' + e0.getAttribute('data-src') + ')' : '')); }, function () {});

  function pubCsv(u) {
    if (!u || !/docs\.google\.com\/spreadsheets/.test(u)) return u;
    u = u.replace(/\/pubhtml(\?|$)/, '/pub$1');
    if (!/output=csv/.test(u)) u += (u.indexOf('?') > -1 ? '&' : '?') + 'output=csv';
    return u;
  }
  var sid = cfg.sheetid, pubAll = cfg.sumber || '';
  var TAB = { pkg: cfg.tabpackage || 'Packages', blk: cfg.tabdetail || 'Detail', itm: cfg.tabitem || 'Items', iss: cfg.tabissue || 'Issues' };
  var mid = /\/spreadsheets\/d\/(?!e\/)([A-Za-z0-9_-]{20,})/.exec(sid || ''); if (mid) sid = mid[1];
  mid = /\/spreadsheets\/d\/(?!e\/)([A-Za-z0-9_-]{20,})/.exec(pubAll || ''); if (mid && !sid) sid = mid[1];
  if (/\/spreadsheets\/d\/(?!e\/)/.test(pubAll)) pubAll = '';
  function fetchText(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }); }
  function jsonp(base) {
    return new Promise(function (resolve, reject) {
      var cb = '__pmisGviz' + Math.random().toString(36).slice(2), sc = document.createElement('script'), done = false;
      var timer = setTimeout(function () { finish(); reject(new Error('no response (sheet sharing must be "Anyone with the link: Viewer")')); }, 9000);
      function finish() { done = true; clearTimeout(timer); window[cb] = function () {}; if (sc.parentNode) sc.parentNode.removeChild(sc); }
      window[cb] = function (resp) {
        if (done) return; finish();
        if (!resp || resp.status === 'error' || !resp.table) { var er = resp && resp.errors && resp.errors[0]; reject(new Error(er ? (er.detailed_message || er.message || er.reason) : 'invalid response')); return; }
        var rows = [resp.table.cols.map(function (c) { return c.label || ''; })];
        resp.table.rows.forEach(function (r) { rows.push((r.c || []).map(function (c) {
          if (!c) return '';
          var d = typeof c.v === 'string' && /^Date\((\d{4}),(\d{1,2}),(\d{1,2})/.exec(c.v);           /* a date cell: ISO, whatever the sheet locale */
          if (d) return d[1] + '-' + ('0' + (+d[2] + 1)).slice(-2) + '-' + ('0' + d[3]).slice(-2);
          return typeof c.v === 'number' ? String(c.v) : c.f != null ? String(c.f) : c.v == null ? '' : String(c.v);
        })); });
        resolve(rows);
      };
      sc.onerror = function () { if (done) return; finish(); reject(new Error('script blocked')); };
      sc.onload = function () { setTimeout(function () { if (done) return; finish(); reject(new Error('not data — share the sheet as "Anyone with the link: Viewer"')); }, 80); };
      sc.src = base + '&tqx=responseHandler:' + cb;
      document.head.appendChild(sc);
    });
  }
  function methodsFor(k) {
    var ms = [];
    if (sid) {
      var gv = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(sid) + '/gviz/tq?headers=1&sheet=' + encodeURIComponent(TAB[k]);
      ms.push({ name: 'the sheet itself (Sheet ID)', run: function () { return fetchText(gv + '&tqx=out:csv&_=' + Date.now()); } });
      ms.push({ name: 'the sheet itself (Sheet ID, JSONP)', run: function () { return jsonp(gv + '&_=' + Date.now()); } });
    }
    var pa = pubCsv(pubAll);
    if (pa && /^https:\/\//i.test(pa) && /\/spreadsheets\/d\/e\//.test(pa) && !/[?&]gid=/.test(pa))
      ms.push({ name: 'Publish to web (tab "' + TAB[k] + '")', run: function () { return fetchText(pa + '&sheet=' + encodeURIComponent(TAB[k]) + '&_=' + Date.now()); } });
    return ms;
  }
  var ANCH = { pkg: 'packageno', blk: 'detailid', itm: 'detailid', iss: 'severity' };
  function asText(d) { return Array.isArray(d) ? d.map(function (r) { return r.map(function (c) { return String(c == null ? '' : c).replace(/\t|\r?\n/g, ' '); }).join('\t'); }).join('\n') : String(d || ''); }
  function loadTab(k) {
    var ms = methodsFor(k);
    if (!ms.length) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var lg = [];
      (function next(i) {
        if (i >= ms.length) { resolve({ err: lg }); return; }
        ms[i].run().then(function (data) {
          var txt = asText(data), sh = sheet(Array.isArray(data) ? data : txt, ANCH[k]);
          if (sh.error || !sh.rows.length) throw new Error('unrecognised format (' + (sh.error || 'no rows') + ')');
          resolve({ data: txt, name: ms[i].name });
        }).catch(function (e) { lg.push(ms[i].name + ': ' + ((e && e.message) || e)); next(i + 1); });
      })(0);
    });
  }
  var every = parseFloat(String(cfg.autorefresh).replace(',', '.'));
  if (isNaN(every)) every = 120; else if (every > 0 && every < 1) every = 1;
  var fr = { busy: false, ok: null, tryAt: null, fail: false, flash: false }, hasSrc = methodsFor('pkg').length > 0;
  var live = {}, sigs = {};
  function hhmm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function everyTxt() { return every >= 60 ? num(every / 60, every % 60 ? 1 : 0) + (every === 60 ? ' hour' : ' hours') : every + ' minutes'; }
  function setFresh() {
    Array.prototype.forEach.call(root.querySelectorAll('.fresh'), function (box) {
      clear(box); box.style.display = hasSrc ? '' : 'none';
      box.className = 'fresh' + (fr.fail && !fr.busy ? ' warn' : '') + (fr.flash ? ' new' : '');
      var b = el('button', 'rf' + (fr.busy ? ' spin' : '')); b.type = 'button'; b.disabled = fr.busy;
      b.setAttribute('aria-label', 'Refresh data from Google Sheets now'); b.title = 'Refresh now';
      var sv = s('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, b);
      s('path', { d: 'M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 2.5v3h-3' }, sv);
      b.addEventListener('click', function (e) { e.stopPropagation(); refreshAll(); refreshF(); });
      box.appendChild(b);
      if (!fr.busy && fr.tryAt) box.appendChild(el('i', 'dot'));
      var t = el('span', 'ft', fr.busy ? (fr.tryAt ? 'Refreshing…' : 'Loading live data…') : fr.flash ? 'Updated just now' : fr.ok ? 'Updated ' + hhmm(fr.ok) : fr.tryAt ? 'Sheet not reachable' : '');
      t.setAttribute('data-tip', 'Data source: Google Sheets (tabs "' + TAB.pkg + '", "' + TAB.blk + '", "' + TAB.itm + '", "' + TAB.iss + '")' + (fr.ok ? ', last loaded at ' + hhmm(fr.ok) : '') + '.\n' +
        (every > 0 ? 'Refreshes automatically every ' + everyTxt() + ' while this page is open.' : 'Automatic refresh is off.') +
        (fr.fail && fr.tryAt ? '\nLast attempt (' + hhmm(fr.tryAt) + ') failed — showing the last available data.' : '') + '\nClick ↻ to refresh now.');
      box.appendChild(t);
    });
  }
  function refreshAll() {
    if (fr.busy || !hasSrc) return;
    fr.busy = true; setFresh();
    var ks = ['pkg', 'blk', 'iss', 'itm'];
    Promise.all([embReady].concat(ks.map(loadTab))).then(function (r0) {
      var r = r0.slice(1), had = fr.ok, changed = false, notes = [];
      ks.forEach(function (k, j) {
        var x = r[j];
        if (x && x.data) { if (x.data !== sigs[k]) { sigs[k] = x.data; live[k] = x.data; changed = true; } }
        else if (!live[k]) notes.push('Tab "' + TAB[k] + '" could not be loaded — showing the data embedded in the code.' + (x && x.err ? '\n  ' + x.err.join('\n  ') : ''));
      });
      var kind = live.pkg ? 'live' : 'fallback';
      if (changed || kind !== srcState.kind) {
        var ins = { pkg: live.pkg || EMB.pkg, blk: live.blk || EMB.blk, iss: live.iss || EMB.iss, itm: live.itm || EMB.itm };
        if (ins.pkg) { var res = render(ins, kind, notes); if (res !== true && first === true) render(EMB, 'fallback', notes.concat(['Live data error: ' + res])); }
      } else if (notes.join() !== srcState.notes.join() && R) { srcState.notes = notes; renderShared(); }
      fr.busy = false; fr.tryAt = Date.now(); fr.fail = !(r[0] && r[0].data);
      if (r[0] && r[0].data) fr.ok = fr.tryAt;
      fr.flash = !!had && changed;
      setFresh();
      if (fr.flash) setTimeout(function () { fr.flash = false; setFresh(); }, 6000);
    });
  }
  if (/^auto/i.test(cfg.tema) && window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () { applyTheme(); if (R) renderAll(); });
  }
  $('foot').textContent = (hasSrc ? 'Source: Google Sheets · refreshes ' + (every > 0 ? 'every ' + everyTxt() : 'on page load') : 'Source: Logistics ETL data embedded in this page (4 packing-list workbooks)') +
    ' · Readiness = packing list ' + nf(GW.PL) + ' · MDR ' + nf(GW.MDR) + ' · site ' + nf(GW.SITE) + ' · inspection ' + nf(GW.INSP) + ' · Ready = PL verified + MDR approved + received & inspected';
  setFresh();
  embReady.then(refreshAll);
  embReady.then(function () { return refreshF(); });
  if (every > 0 && fHas) setInterval(function () { if (!document.hidden) refreshF(); }, every * 60000);
  if (every > 0 && hasSrc) {
    setInterval(function () { if (!document.hidden) refreshAll(); }, every * 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && fr.tryAt && Date.now() - fr.tryAt >= every * 60000) refreshAll(); });
  }
  window.__pmLogistics = { state: state, model: function () { return R; }, go: go, openPackage: openPackage, agg: agg, openFilter: openFilter, count: function () { return R ? scopeP().length : 0; },
    drawingDoc: function (compact) { return dwgDoc(sortList(scopeP()), compact); }, drawingRows: function () { return dwgRows(sortList(scopeP())); },
    foundation: function () { return FD && R && R.items ? (fJoin(), { fd: FD, join: FJ }) : null; }, foundationDoc: function () { return FD ? fDoc(scopeF()) : null; },
    foundationRows: function () { return FD ? fRowsX(scopeF()) : null; }, foundationSource: function () { return FSRCN; }, foundationMapDoc: function () { return FD ? fMapDoc(scopeF('st mat')) : null; }, foundationMapRows: function () { return FD ? fMapX(scopeF('st mat')) : null; },
    foundationMap: function () {
      if (!FD || !fJoin()) return null;
      var M = fMap(scopeF('st mat'));
      return { gs: M.gs.map(function (g) { return { name: g.name, ax: g.ax.map(function (a) { return [a.f.raw, Object.keys(a.pk).length, a.lines.length]; }), rdy: g.ax.filter(function (a) { return a.f.ready; }).length, lines: g.ln.size,
        sg: g.sg.map(function (a) { return [a.S.code, Object.keys(a.pk).length, a.lines.length]; }) }; }), ready: M.ready.map(function (f) { return [f.raw, f.mat, fHere(f).length, fMiss(f).length]; }) };
    }, axisKeys: axisKeys, drawingAxes: drawingAxes };
