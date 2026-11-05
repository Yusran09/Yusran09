
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
  BADGE_ICON.unshift([/^ready/i, 'check'], [/^mdr pending/i, 'doc'], [/^on site/i, 'pin'], [/^awaiting/i, 'ship'], [/^blocked/i, 'alert'],
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
    basis: 'package', tema: 'terang', kepekatan: '62', autorefresh: '120', cekdata: 'tampil' };
  $('lg-config').textContent.split(/\r?\n/).forEach(function (line) {
    var m = line.trim().match(/^(judul|sheet\s*id|sumber|tab\s*package|tab\s*detail|tab\s*item|tab\s*issue|data\s*date|bobot\s*gate|kredit\s*res|mdr\s*tidak\s*perlu|lokasi|tag\s*site|batas\s*mdr|basis|tema|kepekatan|auto\s*refresh|cek\s*data)\s*:\s*(.*)$/i);
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
    SITE: { n: 'On site – awaiting inspection', s: 'On site', lv: 'warn', o: 3, c: 'var(--plan)', etl: 'ON_SITE_AWAITING_INSPECTION', act: 'Raise RFS and perform receiving inspection.' },
    AWAIT: { n: 'Shipped – awaiting site receiving', s: 'Awaiting', lv: '', o: 4, c: 'var(--line-strong)', etl: 'AWAITING_RECEIVING', act: 'Track delivery; prepare MDR so the package is ready on arrival.' },
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
    p.g = { PL: GW.PL * p.pl, MDR: GW.MDR * p.mdrCr, SITE: GW.SITE * p.onsite, INSP: GW.INSP * ic };
    p.score = Math.round((p.g.PL + p.g.MDR + p.g.SITE + p.g.INSP) * 100) / 100;
    p.st = !p.pl ? 'BLOCK' : p.inspected && p.mdrCr >= 1 ? 'READY' : p.inspected ? 'PEND' : p.onsite ? 'SITE' : 'AWAIT';
    var a = ST[p.st].act;
    if ((p.st === 'PEND' || p.st === 'AWAIT' || p.st === 'SITE') && p.mdrCr < 1) a += ' MDR: ' + (MDRL[p.mdr] || p.mdr) + (p.mdrNo && !nr ? ' (' + p.mdrNo + ')' : '') + '.';
    if (p.st === 'BLOCK') a += blocking.length ? ' ' + blocking.map(function (x) { return x.type; }).filter(function (v, k, ar) { return ar.indexOf(v) === k; }).sort().join('; ') : ' No linked detail block.';
    p.act = a;
    p.age = p.st === 'PEND' && p.recv != null ? Math.round((dd - p.recv) / DAY) : null;
    p.lv = p.st === 'PEND' ? (p.age != null && p.age > AGEV[1] ? 'crit' : 'warn') : ST[p.st].lv;
    p.locN = p.loc || 'No site record';
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
    pb: null, pc: null, pg: null, pst: 'ALL', psort: 'order', q: '', pkg: null, blk: null, pall: false, xsev: 'ALL', xtype: null, xall: false };
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
      cmp: [['var(--good)', 'Ready', bv(B_(a, 'READY'))], ['var(--base)', 'Shipped', bv(B_(a))]],
      fill: rIn, marks: [['var(--good)', rRd]], gtip: 'Received & inspected ' + bv(B_(a, 'insp')) + ' · ready ' + bv(B_(a, 'READY')) + ' · shipped ' + bv(B_(a)) + ' ' + bu(),
      kq: [['check', 'Ready', bv(B_(a, 'READY')), '', pc(rRd) + ' of shipped', 'Packing list verified, MDR approved, received & inspected'],
        ['pin', 'On site · no RFS', bv(B_(a, 'SITE')), '', 'awaiting inspection', 'Site tag or laydown remark, no RFS / inspection date yet'],
        ['ship', 'Awaiting', bv(B_(a, 'AWAIT')), '', 'no site record', 'In the final packing list, nothing recorded on site yet'],
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
        badge: [oldest > AGEV[1] ? 'crit' : 'warn', oldest > AGEV[1] ? '> ' + nf(AGEV[1]) + ' days' : '≤ ' + nf(AGEV[1]) + ' days'] }
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
      add(old > AGEV[1] ? 'crit' : 'warn', 'doc', '<b>' + nf(pend.length) + ' package(s) inspected on site cannot be issued</b> — MDR not approved: ' + Object.keys(byM).map(function (k) { return nf(byM[k]) + ' ' + (MDRL[k] || k).toLowerCase(); }).join(' · ') + '.', 'Oldest ' + nf(old) + ' days since inspection · flagged after ' + nf(AGEV[0]) + ' / ' + nf(AGEV[1]) + ' days (Batas MDR).');
    }
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
    return out.sort(function (p, q) { return p.rank - q.rank; }).slice(0, 8);
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
        r.appendChild(el('td', p.recv != null ? '' : 'z', fdd(p.recv))); r.appendChild(el('td', 'c-desc' + (p.loc ? '' : ' z'), p.locN));
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
  function scopeP() {
    var q = U(state.q).replace(/\s+/g, ''), qi = q.length >= 3 ? itemSearchIndex() : null;
    return R.pk.filter(function (p) {
      if (state.pb && p.b !== state.pb) return false; if (state.pc && p.c !== state.pc) return false; if (state.pg && p.grp !== state.pg) return false;
      if (state.pst !== 'ALL' && p.st !== state.pst) return false;
      if (!q) return true;
      if (p._q == null) p._q = U([p.no, p.eq, p.desc, p.cn, p.mdrNo, p.rfs, p.locN, p.grp, p.type].join(' ')).replace(/\s+/g, '');
      if (p._q.indexOf(q) > -1) return true;
      var bl = R.blkBy[p.id] || [];
      if (bl.some(function (b) { return U(b.no).replace(/\s+/g, '').indexOf(q) > -1; })) return true;
      return !!qi && bl.some(function (b) { return (qi[b.id] || '').replace(/\s+/g, '').indexOf(q) > -1; });
    });
  }
  function renderPStatus() {
    var sg = $('p-status');
    if (!sg._built) {
      sg._built = true;
      [['ALL', 'All']].concat(STO.map(function (k) { return [k, ST[k].s]; })).forEach(function (o) {
        var b = el('button', null, o[1]); b.type = 'button'; b.setAttribute('data-v', o[0]);
        b.addEventListener('click', function () { state.pst = o[0]; state.pkg = null; state.blk = null; state.pall = false; renderP3(); });
        sg.appendChild(b);
      });
    }
    setSeg('p-status', state.pst);
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
    renderPStatus(); renderPSteps();
    var p = state.pkg ? R.byId[state.pkg] : null;
    if (state.pkg && !p) state.pkg = null;
    var kb = clear($('p-kpi'));
    if (!p) {
      var list = scopeP(), a = agg(list), nb = 0, ns = 0, nl = 0, ni = 0, nh = 0;
      list.forEach(function (x) { var bl = R.blkBy[x.id] || []; nb += bl.length; ns += x.split || 0; nl += x.lines || 0; ni += x.openN; if (x.maxSev === 'HIGH') nh++; });
      $('p-title').textContent = state.q ? 'Search: ' + state.q : state.pg ? state.pg + ' · ' + bcName(state.pb, state.pc) : state.pb || state.pc ? bcName(state.pb, state.pc) : 'All packages';
      kb.appendChild(statCard('box', 'Packages', nf(list.length), '', [nf1(a.t) + ' t gross · ' + nf1(list.reduce(function (s0, x) { return s0 + (x.vol || 0); }, 0)) + ' m³']));
      kb.appendChild(statCard('split', 'Detail blocks', nf(nb), '', [ns ? nf(ns) + ' split sub-packages' : 'one block per package']));
      kb.appendChild(statCard('list', 'Material lines', nf(nl), '', ['in the linked detail packing lists']));
      kb.appendChild(statCard('alert', 'Open issues', nf(ni), '', [nh ? badge('crit', nf(nh) + ' pkgs with HIGH') : 'on these packages · no HIGH']));
      renderPList(list);
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
  }
  function renderPList(list) {
    var wrap = clear($('p-tbl')), t = el('table', 'lt'), hd = el('thead'), tr = el('tr'), tb = el('tbody'), srt = state.psort;
    headBack($('p-head'), 'Summary Packing List', nf(list.length) + ' packages' + (state.q ? ' matching "' + state.q + '"' : ''),
      state.pb || state.pc || state.pg || state.pst !== 'ALL' || state.q ? { t: 'All packages', fn: function () { state.pb = state.pc = state.pg = null; state.pst = 'ALL'; state.q = ''; $('p-q').value = ''; state.pall = false; renderP3(); } } : null,
      'One row per Summary package. Readiness is computed here from the packing-list link, MDR status, site tag / laydown and RFS + inspection date (rules in the settings block).');
    heads(tr, [['Package', 'c-nm2'], ['B · Cat', 'c-code'], ['Status', 'c-st'], ['Readiness'], ['MDR', 'c-sc'], ['Inspected'], ['Location', 'c-desc'], ['G.W. (t)'], ['System', 'c-desc'], ['']]);
    var l2 = list.slice();
    if (srt === 'score') l2.sort(function (x, y) { return x.score - y.score || x.i - y.i; }); else if (srt === 'gw') l2.sort(function (x, y) { return (y.gw || 0) - (x.gw || 0); });
    var cap = state.pall ? l2.length : Math.min(l2.length, 300);
    l2.slice(0, cap).forEach(function (p) {
      var r = el('tr', 'go'), c0 = el('td', 'c-nm2'); if (p.grp) c0.appendChild(el('span', 'gchip', p.grp)); c0.appendChild(el('span', 'lg-mono', p.no)); c0.title = p.no + (p.desc ? ' — ' + p.desc : ''); r.appendChild(c0);
      r.appendChild(el('td', 'c-code', p.b + ' · ' + p.c));
      var st = el('td', 'c-st'); st.appendChild(badge(p.lv, ST[p.st].s)); r.appendChild(st);
      var ix = el('td', 'rt'); ix.appendChild(pbar(p.score / 100)); ix.appendChild(document.createTextNode(nf(p.score))); r.appendChild(ix);
      r.appendChild(el('td', 'c-sc' + (p.mdrCr >= 1 ? '' : ' z'), MDRL[p.mdr] || p.mdr));
      var ins = el('td', p.recv != null ? '' : 'z', p.recv != null ? fdate(p.recv) : p.inspected ? 'Inspected' : p.rfs ? 'RFS only' : '—'); if (p.rfs) ins.title = 'RFS ' + p.rfs + (p.insp ? ' · inspection ' + p.insp : ''); r.appendChild(ins);
      r.appendChild(el('td', 'c-desc' + (p.loc ? '' : ' z'), p.locN)); r.appendChild(el('td', '', nf1(p.t))); r.appendChild(el('td', 'c-desc', p.sys));
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
    var gs = el('div', 'gstrip');
    gs.appendChild(gateBox(p.pl ? 'ok' : 'no', 'list', 'Packing list', p.pl ? 'Verified' : 'Not verified', nf(p.links || 0) + ' detail block(s) · ' + (p.map || '—')));
    gs.appendChild(gateBox(p.mdrCr >= 1 ? 'ok' : p.mdrCr > 0 ? 'part' : 'no', 'doc', 'MDR', MDRL[p.mdr] || p.mdr, p.mdrNo || 'no MDR number'));
    gs.appendChild(gateBox(p.onsite ? 'ok' : 'no', 'pin', 'Site', p.onsite ? p.locN : 'No site record', p.ev || 'not received'));
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
      heads(tr, [['#'], ['S/N', 'c-code'], ['Description', 'lg-wrap'], ['Qty'], ['Unit', 'c-sc'], ['Unit wt'], ['Total wt'], ['Equipment', 'c-code'], ['Drawing', 'c-code'], ['Remark', 'lg-wrap']]);
      if (!R.items) { var lr = el('tr'), lc = el('td', 'z', 'Loading material lines…'); lc.colSpan = 10; lr.appendChild(lc); tb.appendChild(lr); }
      else {
        var its = R.items[b0.id] || [];
        if (!its.length) { var nr0 = el('tr'), nc = el('td', 'z', R.itemsN ? 'No material lines for this block.' : 'Material lines are not loaded (tab "' + cfg.tabitem + '" / embedded items).'); nc.colSpan = 10; nr0.appendChild(nc); tb.appendChild(nr0); }
        its.forEach(function (it) {
          var r = el('tr'); r.appendChild(el('td', 'z', nf(it.ln))); r.appendChild(el('td', 'c-code', it.sn || '—'));
          var d = el('td', 'lg-wrap lg-strong'); d.appendChild(document.createTextNode(it.d || '—')); if (it.cn) d.appendChild(el('span', 'lg-cn', it.cn)); if (it.sp) d.appendChild(el('span', 'lg-cn', it.sp)); if (/sub/i.test(it.ty)) d.appendChild(badge('', 'Sub-package ref')); r.appendChild(d);
          r.appendChild(el('td', '', it.q == null ? '—' : num(it.q, it.q % 1 ? 2 : 0))); r.appendChild(el('td', 'c-sc', it.u || '—'));
          r.appendChild(el('td', '', it.uw == null ? '—' : num(it.uw, 2))); r.appendChild(el('td', 'cum', it.tw == null ? '—' : num(it.tw, 2)));
          r.appendChild(el('td', 'c-code', it.eq || '—')); r.appendChild(el('td', 'c-code', it.dw || '—')); r.appendChild(el('td', 'lg-wrap lg-res', it.rm || ''));
          tb.appendChild(r);
        });
      }
      $('p-tip').textContent = 'Material lines exactly as in the detail packing list · weights are item weights, not package weights';
    }
    hd.appendChild(tr); t.appendChild(hd); t.appendChild(tb); wrap.appendChild(t);
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

  /* ---------- 10. navigasi & render ---------- */
  var NPG = 4, prevPage = 1;
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
  function renderPage(pg) { if (!R) return; if (pg === 1) renderP1(); else if (pg === 2) renderP2(); else if (pg === 3) renderP3(); else renderP4(); }
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
  var EMB = { pkg: blockSrc('lg-data-pkg'), blk: blockSrc('lg-data-blk'), iss: blockSrc('lg-data-iss'), itm: blockSrc('lg-data-itm') };
  var first = 'no embedded data';
  function showFirst() { if (first !== true) Array.prototype.forEach.call(root.querySelectorAll('.ddt'), function (n0) { n0.textContent = first === 'no embedded data' ? 'Loading data from Google Sheets…' : 'Data error: ' + first; }); }
  var embReady = !EMB.pkg ? Promise.resolve() : Promise.all([settle(EMB.pkg), settle(EMB.blk), settle(EMB.iss)]).then(function (a) {
    EMB.pkg = a[0]; EMB.blk = a[1]; EMB.iss = a[2];                       /* items stay packed until a package or a search needs them */
    first = render(EMB, 'code', []);
  }, function (e) { first = 'embedded data could not be unpacked (' + ((e && e.message) || e) + ')'; });
  embReady.then(showFirst);

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
      b.addEventListener('click', function (e) { e.stopPropagation(); refreshAll(); });
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
  if (every > 0 && hasSrc) {
    setInterval(function () { if (!document.hidden) refreshAll(); }, every * 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && fr.tryAt && Date.now() - fr.tryAt >= every * 60000) refreshAll(); });
  }
  window.__pmLogistics = { state: state, model: function () { return R; }, go: go, openPackage: openPackage, agg: agg };
