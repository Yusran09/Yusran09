/* PMIS DS v8 · shared engine utilities, verbatim from the Resources dashboard engine
   (PMIS-Resources-TIA-Schedule-KODE.txt · template pmhub-d1 · script 2). Line ranges:
        3-158  core: dom, format, icons, badge, tooltip, count, csv/tsv, bars
      365-489  chart: rowsTip, lineD, cum, chart, spark
      680-753  drill-down step bar + drop-down list
      810-819  statCard, legendItems
      861-867  headBack, th, rowKeys
      919-919  chevI
   Small, documented adaptations are applied by build_pmis_embed.py (PATCHES). */
  var root = document.getElementById('pmis'), tip = document.getElementById('tip');
  var NS = 'http://www.w3.org/2000/svg';
  var MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MON = { jan:0, feb:1, mar:2, apr:3, may:4, mei:4, jun:5, jul:6, aug:7, agu:7, agt:7, sep:8, oct:9, okt:9, nov:10, dec:11, des:11 };
  var PH = [{ k:'O', n:'Overall' }, { k:'E', n:'Engineering' }, { k:'P', n:'Procurement' }, { k:'C', n:'Construction' }];
  var PHN = { O:'Overall', E:'Engineering', P:'Procurement', C:'Construction' };
  var LV = { good:'On Track', warn:'Warning', crit:'Critical' }, RANK = { good:0, warn:1, crit:2 };
  var COL = { good:'var(--good)', warn:'var(--warn)', crit:'var(--crit)' };
  var reduce = true;
  var WK = 6048e5;

  function $(id) { return document.getElementById(id); }
  function num(v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function signed(v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), d); }
  function fdate(t) { var x = new Date(t); return x.getUTCDate() + ' ' + MS[x.getUTCMonth()] + ' ' + x.getUTCFullYear(); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function s(tag, a, parent) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  function lvSpi(r) { return r >= 0.95 ? 'good' : r >= 0.85 ? 'warn' : 'crit'; }
  function lvDev(d) { return d >= -2 ? 'good' : d >= -5 ? 'warn' : 'crit'; }
  function worst(a, b) { return RANK[a] >= RANK[b] ? a : b; }
  function badge(lv, text) {
    var t = text || LV[lv], b = el('span', 'badge ' + lv), bi = el('span', 'bi');
    bi.appendChild(ico(badgeIcon(lv, t), 13)); b.appendChild(bi); b.appendChild(document.createTextNode(t)); return b;
  }
  function infoIcon(text) {
    var b = el('span', 'info'); b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', text); b.setAttribute('data-tip', text);
    var sv = s('svg', { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3, 'aria-hidden': 'true' }, b);
    s('circle', { cx: 8, cy: 8, r: 6.4 }, sv); s('path', { d: 'M8 7.3v3.6M8 5.1v.2', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, sv);
    return b;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  /* ---------- ikon (garis, 24×24, currentColor) ---------- */
  var ICONS = {
    overview: 'M4 3h5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1zM15 3h5a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1zM15 12h5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1zM4 16h5a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1z',
    scurve: 'M3 3v16a2 2 0 0 0 2 2h16M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7',
    layers: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83zM2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17',
    tree: 'M17 16h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1zM3 16h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1zM10 2h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1zM5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8',
    target: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M6 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    down: 'M16 17h6v-6M22 17l-8.5-8.5-5 5L2 7',
    up: 'M16 7h6v6M22 7l-8.5 8.5-5-5L2 17',
    gauge: 'M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0',
    flag: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528',
    pulse: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2',
    check: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M16 9l-5.5 5.5L8 12',
    compass: 'M12.99 6.74l1.93 3.44M19.136 12a10 10 0 0 1-14.271 0M21 21l-2.16-3.84M3 21l8.02-14.26M10 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    box: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.29 7 L12 12 L20.71 7M7.5 4.27l9 5.15',
    hardhat: 'M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5M14 6a6 6 0 0 1 6 6v3M4 15v-3a6 6 0 0 1 6-6M3 15h18a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-18a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1z',
    bars: 'M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3',
    alert: 'M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01',
    clock: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M12 6v6l4 2',
    zap: 'M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z',
    sigma: 'M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2',
    brief: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z',
    table: 'M12 3v18M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2zM3 9h18M3 15h18',
    pie: 'M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1zM21.21 15.89A10 10 0 1 1 8 2.83',
    nut: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
    blocks: 'M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2M15 2h6a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1z',
    list: 'M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13',
    coins: 'M13.744 17.736a6 6 0 1 1-7.48-7.48M15 6h1v4M6.134 14.768l.866-.5 2 3.464M10 8a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
    alertc: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M12 8L12 12M12 16L12.01 16',
    minus: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M8 12h8',
    cal: 'M8 2v3M16 2v3M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2zM3 9h18',
    timer: 'M10 2L14 2M12 14L15 11M4 14a8 8 0 1 0 16 0a8 8 0 1 0 -16 0'
  };
  function ico(name, size, cls) {
    var sv = s('svg', { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', 'class': 'icn' + (cls ? ' ' + cls : '') });
    s('path', { d: ICONS[name] || ICONS.minus }, sv);
    return sv;
  }
  function chipIco(name) { var c = el('span', 'ichip'); c.appendChild(ico(name, 15)); return c; }
  function hydrateIcons(scope) {
    Array.prototype.forEach.call((scope || root).querySelectorAll('i.ic[data-i]'), function (x) {
      var sv = ico(x.getAttribute('data-i'), +x.getAttribute('data-s') || 14); x.parentNode.replaceChild(sv, x);
    });
  }
  var BADGE_ICON = [[/^critical/i, 'alert'], [/^warning/i, 'alertc'], [/^(on track|on schedule|on plan|on or before)/i, 'check'], [/^(completed|done)/i, 'check'],
    [/^late start/i, 'clock'], [/^behind/i, 'down'], [/^ahead/i, 'up'], [/^not due/i, 'minus'], [/^plan finish passed/i, 'flag']];
  function badgeIcon(lv, text) {
    for (var i = 0; i < BADGE_ICON.length; i++) if (BADGE_ICON[i][0].test(text || '')) return BADGE_ICON[i][1];
    return lv === 'good' ? 'check' : lv === 'warn' ? 'alertc' : lv === 'crit' ? 'alert' : 'minus';
  }

  /* ---------- tooltip (info icons + chart) ---------- */
  function placeTip(cx, cy) {
    tip.style.display = 'block';
    var rb = root.getBoundingClientRect(), x = cx - rb.left + 14, y = cy - rb.top + 14;
    if (x + tip.offsetWidth > rb.width - 6) x = cx - rb.left - tip.offsetWidth - 14;
    if (y + tip.offsetHeight > rb.height - 6) y = cy - rb.top - tip.offsetHeight - 14;
    tip.style.left = Math.max(6, x) + 'px'; tip.style.top = Math.max(6, y) + 'px';
  }
  function showTextTip(elm) {
    clear(tip); tip.textContent = elm.getAttribute('data-tip');
    var r = elm.getBoundingClientRect(); placeTip(r.left + r.width / 2, r.bottom - 6);
  }
  function hideTip() { tip.style.display = 'none'; }
  root.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTextTip(t); });
  root.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t && !t.contains(e.relatedTarget)) hideTip(); });
  root.addEventListener('focusin', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-tip')) showTextTip(e.target); });
  root.addEventListener('focusout', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-tip')) hideTip(); });
  root.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) { e.stopPropagation(); showTextTip(t); } }, true);

  /* ---------- animated numbers & bars ---------- */
  function count(node, to, d, signedFmt) {
    var from = node._v == null ? 0 : node._v; node._v = to;
    var f = function (v) { return (signedFmt ? signed(v, d) : num(v, d)) + (node._suffix || ''); };
    cancelAnimationFrame(node._raf);
    if (reduce || from === to) { node.textContent = f(to); return; }
    var t0 = performance.now(), dur = 950;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = f(from + (to - from) * e);
      if (p < 1) node._raf = requestAnimationFrame(step);
    })(t0);
  }
  function setBar(bar, actual, plan) {
    var f = bar.querySelector('.fill'), m = bar.querySelector('.mark');
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      f.style.width = Math.max(0, Math.min(100, actual)) + '%';
      if (m) { m.style.left = Math.max(0, Math.min(100, plan)) + '%'; bar.classList.add('on'); }
    }); });
  }

  function csvRows(text) {
    var out = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (q) { if (ch === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text.charAt(i + 1) === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); out.push(row); }
    return out;
  }
  function toRows(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return [];
    if (text.indexOf('\t') > -1) return lines.map(function (l) { return l.split('\t'); });
    if (lines[0].indexOf('|') > -1) return lines.map(function (l) { return l.split('|'); });
    if (lines[0].indexOf(';') > -1) return lines.map(function (l) { return l.split(';'); });
    if (lines[0].indexOf(',') > -1) return csvRows(text.trim() + '\n');
    return lines.map(function (l) {
      var t = l.trim(), m = t.match(/^(desc\.?)\s+(subject)\s+(.*)$/i) ||
        t.match(/^((?:plan|actual|rencana|aktual|realisasi)(?:\s+cum\w*\.?|\s+kum\w*)?)\s+(\S+)\s+(.*)$/i);
      return m ? [m[1], m[2]].concat(m[3].split(/\s+/)) : t.split(/\s+/);
    });
  }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  function niceStep(max, n) { var raw = max / n, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function barPath(x, y0, w, v, y) {
    var top = y(v), h = Math.abs(top - y0), r = Math.min(4, w / 2, h); if (h < 0.5) return '';
    if (v >= 0) return 'M' + x + ' ' + y0 + 'V' + (top + r) + 'Q' + x + ' ' + top + ' ' + (x + r) + ' ' + top + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + top + ' ' + (x + w) + ' ' + (top + r) + 'V' + y0 + 'Z';
    return 'M' + x + ' ' + y0 + 'V' + (top - r) + 'Q' + x + ' ' + top + ' ' + (x + r) + ' ' + top + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + top + ' ' + (x + w) + ' ' + (top - r) + 'V' + y0 + 'Z';
  }
  /* ---------- 4. grafik ---------- */
  function rowsTip(title, rows, cx, cy) {
    clear(tip); tip.appendChild(el('div', 't', title));
    rows.forEach(function (r) {
      if (r === '-') { tip.appendChild(el('div', 'sep')); return; }
      var d = el('div', 'r'), i = el('i'); i.style.background = r.c || 'transparent'; if (r.dash) i.style.background = 'repeating-linear-gradient(90deg,' + r.c + ' 0 3px,transparent 3px 5px)';
      d.appendChild(i); d.appendChild(el('b', null, r.v)); d.appendChild(el('span', null, r.l)); tip.appendChild(d);
    });
    placeTip(cx, cy);
  }
  function lineD(vals, x, y, upto) {
    var d = '', on = false;
    for (var i = 0; i < vals.length && (upto == null || i <= upto); i++) {
      if (vals[i] == null) { on = false; continue; }
      d += (on ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(vals[i]).toFixed(1); on = true;
    }
    return d;
  }
  function cum(a, upto) { var t = 0; return a.map(function (v, i) { if (upto != null && i > upto) return null; if (v == null) return null; t += v; return t; }); }
  /* sp: { n, dd, tg0, mode:'mon'|'cum'|'var', bars:[{vals,c,name}], lines:[{vals,c,name,dash,w,dot}], stack:[{vals,c,name}], total:{vals,name}, varOf:{a,b}, compact, unit, focus } */
  var animPage = false, clipN = 0;
  function chart(box, sp) {
    clear(box);
    var W0 = box.clientWidth || 700, H = box.clientHeight || 300, cp = !!sp.compact, n = sp.n;
    var m = { t: cp ? 6 : 26, r: cp ? 2 : 10, b: cp ? 16 : 26, l: cp ? 30 : 46 }, iw = Math.max(10, W0 - m.l - m.r), ih = Math.max(10, H - m.t - m.b);
    var bars = sp.bars || [], lines = sp.lines || [], stack = sp.stack || [], vals = [0], varr = null, st = null;
    if (sp.mode === 'cum') {
      bars = bars.map(function (b) { return { vals: cum(b.vals, sp.dd), c: b.c, name: b.name, asLine: true }; });
      lines = lines.map(function (l) { return { vals: cum(l.vals), c: l.c, name: l.name, dash: l.dash, w: l.w, dot: l.dot }; });
    }
    if (sp.mode === 'var' && sp.varOf) { varr = sp.varOf.a.map(function (v, i) { return v - sp.varOf.b[i]; }); varr.forEach(function (v) { vals.push(v); }); }
    else {
      bars.forEach(function (b) { b.vals.forEach(function (v) { if (v != null) vals.push(v); }); });
      lines.forEach(function (l) { l.vals.forEach(function (v) { if (v != null) vals.push(v); }); });
      if (stack.length) { st = []; for (var i0 = 0; i0 < n; i0++) { var acc = 0; st.push(stack.map(function (s0) { var lo = acc; acc += s0.vals[i0] || 0; return [lo, acc]; })); vals.push(acc); } }
      if (sp.total) sp.total.vals.forEach(function (v) { if (v != null) vals.push(v); });
    }
    var vmax = Math.max.apply(null, vals), vmin = Math.min.apply(null, vals), step = niceStep((vmax - vmin) || 1, cp ? 3 : 5);
    if (step % 1) step = step < 1 ? 1 : step === 2.5 ? 2 : Math.ceil(step);
    var top = Math.ceil(vmax / step) * step || step, bot = Math.floor(vmin / step) * step;
    var band = iw / n, x = function (i) { return m.l + (i + 0.5) * band; }, y = function (v) { return m.t + (top - v) / (top - bot) * ih; };
    var svg = s('svg', { viewBox: '0 0 ' + W0 + ' ' + H, role: 'img', 'aria-label': sp.aria || 'Resource loading chart' }, box);
    var sig = (sp.mode || '') + JSON.stringify([bars.map(function (b) { return b.vals; }), lines.map(function (l) { return l.vals; }), stack.map(function (q) { return q.vals; }), varr]);
    var anim = !reduce && (animPage || box._sig !== sig), uid = 'pm' + (++clipN), defs = s('defs', {}, svg); box._sig = sig;
    var gr = s('linearGradient', { id: uid + 'g', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    s('stop', { offset: 0, style: 'stop-color:var(--actual-2)' }, gr); s('stop', { offset: 1, style: 'stop-color:var(--actual)' }, gr);
    if (sp.tg0 != null && sp.tg0 < n) {
      var xg = m.l + sp.tg0 * band;
      s('rect', { x: xg, y: m.t, width: iw - sp.tg0 * band, height: ih, fill: 'var(--togo)', rx: 6 }, svg);
      s('line', { x1: xg, x2: xg, y1: m.t, y2: m.t + ih, style: 'stroke:rgba(var(--hl-rgb),.42)', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg);
      if (!cp) { var tt = s('text', { x: xg + 8, y: m.t - 8, 'font-size': 10.5, fill: 'var(--hl-txt)', 'letter-spacing': '.08em', 'font-weight': 500 }, svg); tt.textContent = 'TO-GO WINDOW'; }
    }
    for (var v = bot; v <= top + 1e-9; v += step) {
      s('line', { x1: m.l, x2: W0 - m.r, y1: y(v), y2: y(v), stroke: Math.abs(v) < 1e-9 ? 'var(--axis)' : 'var(--grid)', 'stroke-width': 1 }, svg);
      var tl = s('text', { x: m.l - 7, y: y(v) + 3.5, 'text-anchor': 'end', 'font-size': cp ? 9.5 : 10.5, fill: 'var(--muted)' }, svg);
      tl.textContent = Math.abs(v) >= 1000 ? num(v / 1000, v % 1000 ? 1 : 0) + 'k' : num(v, 0);
    }
    var lstep = Math.max(1, Math.ceil((cp ? 46 : 52) / band));
    for (var j = 0; j < n; j++) if ((j % lstep) === 0 || j === sp.dd) {
      if (j !== sp.dd && sp.dd != null && Math.abs(j - sp.dd) < lstep && j % lstep === 0 && j !== 0) continue;
      var lx = s('text', { x: x(j), y: H - (cp ? 3 : 7), 'text-anchor': 'middle', 'font-size': cp ? 9.5 : 10.5, fill: j === sp.dd ? 'var(--ink)' : 'var(--muted)' }, svg);
      lx.textContent = R.lbl[j];
    }
    var dg = svg;
    if (anim) {
      var cr = s('rect', { x: 0, y: -40, width: 0, height: H + 80 }, s('clipPath', { id: uid + 'c' }, defs));
      var an = s('animate', { attributeName: 'width', from: '0', to: String(W0), dur: '1.15s', begin: 'indefinite', fill: 'freeze', calcMode: 'spline', keyTimes: '0;1', keySplines: '.25 .6 .2 1' }, cr);
      dg = s('g', { 'clip-path': 'url(#' + uid + 'c)' }, svg);
      var done = function () { cr.setAttribute('width', W0 + 40); if (an.parentNode) an.parentNode.removeChild(an); };
      requestAnimationFrame(function () { try { an.beginElement(); } catch (e) { done(); } });
      setTimeout(function () { try { if (!(cr.width.animVal.value > W0 - 1)) done(); } catch (e) { done(); } }, 1600);
    }
    if (st) {
      var foc = sp.focus;
      stack.forEach(function (s0, k) {
        var up = '', dn = '';
        for (var i = 0; i < n; i++) up += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(st[i][k][1]).toFixed(1);
        for (var i2 = n - 1; i2 >= 0; i2--) dn += 'L' + x(i2).toFixed(1) + ' ' + y(st[i2][k][0]).toFixed(1);
        s('path', { d: up + dn + 'Z', fill: s0.c, 'fill-opacity': foc == null ? .88 : foc === k ? .95 : .14, stroke: 'var(--gapline)', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, dg);
      });
    }
    if (varr) {
      var bwv = Math.max(2, Math.min(18, band * 0.62)), y0 = y(0);
      varr.forEach(function (d, i) { var p = barPath(x(i) - bwv / 2, y0, bwv, d, y); if (!p) return; var e0 = s('path', { d: p, fill: d >= 0 ? 'var(--over)' : 'var(--relief)', 'fill-opacity': i <= sp.dd ? .55 : .9 }, svg);
        if (anim) { e0.setAttribute('class', 'grow' + (d < 0 ? ' neg' : '')); e0.style.animationDelay = (i * 0.03) + 's'; } });
    }
    if (!varr) {
      bars.forEach(function (b) {
        if (b.asLine) { s('path', { d: lineD(b.vals, x, y), fill: 'none', stroke: b.c, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'class': 'glow' }, dg); return; }
        var bw = Math.max(2, Math.min(cp ? 12 : 20, band * 0.56)), yb = y(0), bf = b.c === 'var(--actual)' ? 'url(#' + uid + 'g)' : b.c;
        b.vals.forEach(function (val, i) { if (val == null || val <= 0) return; var p = barPath(x(i) - bw / 2, yb, bw, val, y); if (!p) return; var e0 = s('path', { d: p, fill: bf }, svg);
          if (anim) { e0.setAttribute('class', 'grow'); e0.style.animationDelay = (i * 0.035) + 's'; } });
      });
      lines.forEach(function (l) {
        var at = { d: lineD(l.vals, x, y), fill: 'none', stroke: l.c, 'stroke-width': l.w || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
        if (l.dash) at['stroke-dasharray'] = '6 5'; if (l.dot) at['stroke-dasharray'] = '1.5 4'; if (l.c === 'var(--plan)') at['class'] = 'pglow';
        s('path', at, dg);
      });
      if (sp.total) s('path', { d: lineD(sp.total.vals, x, y), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-dasharray': '5 4', opacity: .85 }, dg);
    }
    if (sp.dd != null && sp.dd >= 0) {
      s('line', { x1: x(sp.dd), x2: x(sp.dd), y1: m.t - (cp ? 0 : 4), y2: m.t + ih, stroke: 'var(--ink2)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .8 }, svg);
      if (!cp) { var dl = s('text', { x: x(sp.dd) - 6, y: m.t - 8, 'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--ink2)' }, svg); dl.textContent = 'Data date ' + R.lbl[sp.dd]; }
      var bv = !varr && bars[0] ? bars[0].vals[sp.dd] : null;
      if (bv != null && bv > 0) {
        var by = y(bv), br = cp ? 2.6 : 3.6;
        s('circle', { cx: x(sp.dd), cy: by, r: br, fill: 'none', stroke: 'var(--actual-2)', 'stroke-width': 1.5, 'class': 'beacon' }, svg);
        s('circle', { cx: x(sp.dd), cy: by, r: br, fill: 'var(--actual-2)', style: 'filter:drop-shadow(0 0 4px var(--actual-2))' }, svg);
      }
    }
    if (!sp.tip) return;
    var cross = s('line', { y1: m.t, y2: m.t + ih, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-opacity': .45, visibility: 'hidden' }, svg);
    var hit = s('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);
    function at(e) { var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W0 / r.width; return Math.max(0, Math.min(n - 1, Math.floor((px - m.l) / band))); }
    hit.addEventListener('pointermove', function (e) { var i = at(e); cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible'); rowsTip(R.lbl[i] + (i === sp.dd ? ' · data date' : i >= sp.tg0 ? ' · to-go' : ''), sp.tip(i, sp.mode), e.clientX, e.clientY); });
    hit.addEventListener('pointerleave', function () { cross.setAttribute('visibility', 'hidden'); hideTip(); });
    hit.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { var i = at(e); rowsTip(R.lbl[i], sp.tip(i, sp.mode), e.clientX, e.clientY); } });
  }
  function spark(a, b) {
    var sv = s('svg', { 'class': 'spk', viewBox: '0 0 92 24', preserveAspectRatio: 'none', 'aria-hidden': 'true' }), n = a.length;
    var mx = Math.max.apply(null, a.concat(b || []).concat([1])), x = function (i) { return i * 92 / (n - 1); }, y = function (v) { return 22 - (v / mx) * 20; };
    if (b) s('path', { d: lineD(b, x, y), fill: 'none', stroke: 'var(--base)', 'stroke-width': 1.3, 'stroke-dasharray': '3 2', 'vector-effect': 'non-scaling-stroke' }, sv);
    s('path', { d: lineD(a, x, y), fill: 'none', stroke: 'var(--plan)', 'stroke-width': 1.7, 'vector-effect': 'non-scaling-stroke' }, sv);
    return sv;
  }
  /* ---------- 7a. tombol drill-down (Type › Group › Resource / Class › Category › Item) ---------- */
  var dropOpen = null;
  function closeDrop(focusBtn) {
    if (!dropOpen) return;
    var d = dropOpen.d, b0 = dropOpen.btn; if (d.parentNode) d.parentNode.removeChild(d);
    b0.setAttribute('aria-expanded', 'false'); dropOpen = null; if (focusBtn) b0.focus();
  }
  function caret() {
    var sv = s('svg', { 'class': 'cv', width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
    s('path', { d: 'M4 6l4 4 4-4' }, sv); return sv;
  }
  /* L: { name, plural, icon, val, set, on, opts(), all:{ sub, n, r, lv }, pick(id|null) } */
  function stepBar(box, levels, valHead, reset) {
    closeDrop(); clear(box);
    levels.forEach(function (L, i) {
      if (i) box.appendChild(el('span', 'arw', '›'));
      var b = el('button', 'step' + (L.set ? ' set' : '') + (L.on ? ' on' : '')); b.type = 'button';
      b.setAttribute('aria-haspopup', 'listbox'); b.setAttribute('aria-expanded', 'false');
      var k0 = el('span', 'k'); k0.appendChild(ico(L.icon, 12)); k0.appendChild(document.createTextNode(L.name));
      b.appendChild(k0); b.appendChild(el('span', 'v', L.val)); b.appendChild(caret());
      b.title = L.name + ': ' + L.val; b.setAttribute('aria-label', L.name + ': ' + L.val + '. Open list');
      b.addEventListener('click', function (e) { e.stopPropagation(); if (dropOpen && dropOpen.btn === b) closeDrop(); else openDrop(box, L, b, valHead); });
      box.appendChild(b);
    });
    if (reset) {
      var rb = el('button', 'upb rst'); rb.type = 'button'; rb.appendChild(ico('minus', 12)); rb.appendChild(document.createTextNode('Clear'));
      rb.title = 'Clear the drill-down selection'; rb.addEventListener('click', function (e) { e.stopPropagation(); reset(); }); box.appendChild(rb);
    }
  }
  function optRow(cls, dotLv, name, sub, n, r) {
    var b = el('button', 'opt' + cls); b.type = 'button'; b.setAttribute('role', 'option');
    var dt = el('i', 'sd'); dt.style.background = COL[dotLv] || 'var(--muted)'; b.appendChild(dt);
    var t = el('span', 't', name); if (sub) t.appendChild(el('small', null, sub)); b.appendChild(t);
    b.appendChild(el('span', 'n', n));
    var pp = el('span', 'pp'); pp.appendChild(rbar(r)); pp.appendChild(document.createTextNode(r != null ? pc(r) : '—')); b.appendChild(pp);
    return b;
  }
  function openDrop(box, L, btn, valHead) {
    closeDrop();
    var opts = L.opts(), d = el('div', 'drop'); d.setAttribute('role', 'listbox'); d.setAttribute('aria-label', L.name);
    d.addEventListener('click', function (e) { e.stopPropagation(); });
    var dq = null;
    if (opts.length > 8) { dq = el('input', 'dq'); dq.type = 'search'; dq.placeholder = 'Filter ' + opts.length + ' ' + L.plural.toLowerCase() + '…'; dq.setAttribute('aria-label', 'Filter list'); d.appendChild(dq); }
    var dh = el('div', 'dh'); dh.appendChild(el('span', null, L.name)); dh.appendChild(el('span', null, valHead)); d.appendChild(dh);
    var lst = el('div', 'dl'); d.appendChild(lst);
    var all = optRow(' all' + (!L.set ? ' cur' : ''), L.all.lv, 'All ' + L.plural.toLowerCase(), L.all.sub, L.all.n, L.all.r);
    all.addEventListener('click', function () { closeDrop(); L.pick(null); });
    lst.appendChild(all);
    var rows = [];
    opts.forEach(function (o) {
      var b = optRow(o.cur ? ' cur' : '', o.lv, o.name, o.sub, o.n, o.r);
      b.title = o.name + (o.sub ? ' — ' + o.sub : '') + (o.tip ? '\n' + o.tip : '');
      b.addEventListener('click', function () { closeDrop(); L.pick(o.id); });
      b._txt = (o.name + ' ' + (o.sub || '')).toLowerCase(); rows.push(b); lst.appendChild(b);
    });
    var none = el('div', 'none', 'No match.'); none.style.display = opts.length ? 'none' : ''; if (!opts.length) none.textContent = 'Nothing in the current selection.'; lst.appendChild(none);
    if (dq) dq.addEventListener('input', function () {
      var q = dq.value.trim().toLowerCase(), shown = 0;
      rows.forEach(function (r) { var ok = !q || r._txt.indexOf(q) > -1; r.style.display = ok ? '' : 'none'; if (ok) shown++; });
      none.style.display = shown ? 'none' : ''; none.textContent = 'No match.';
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDrop(true); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var vis = [all].concat(rows.filter(function (r) { return r.style.display !== 'none'; })), ix = vis.indexOf(document.activeElement);
      ix = e.key === 'ArrowDown' ? Math.min(vis.length - 1, ix + 1) : Math.max(0, ix - 1); vis[ix].focus(); e.preventDefault();
    });
    box.appendChild(d);
    d.style.left = Math.max(0, Math.min(btn.offsetLeft, box.clientWidth - d.offsetWidth)) + 'px';
    btn.setAttribute('aria-expanded', 'true'); dropOpen = { d: d, btn: btn };
    (dq || lst.querySelector('.opt.cur') || all).focus({ preventScroll: true });
  }
  document.addEventListener('click', function () { closeDrop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dropOpen) closeDrop(true); });
  function statCard(icn, lbl, val, unit, sub) {
    var d = el('div', 'stat glass'), l = el('div', 'lbl'); l.appendChild(ico(icn, 14)); l.appendChild(document.createTextNode(lbl)); d.appendChild(l);
    var v = el('div', 'v', val); if (unit) v.appendChild(el('small', null, unit)); d.appendChild(v);
    var sb = el('div', 'sub'); (sub || []).forEach(function (x0) { sb.appendChild(typeof x0 === 'string' ? document.createTextNode(x0) : x0); }); d.appendChild(sb);
    return d;
  }
  function legendItems(box, items) {
    clear(box);
    items.forEach(function (it) { var sp0 = el('span'), i = el('i', it.k || ''); i.style.background = it.c; sp0.appendChild(i); sp0.appendChild(document.createTextNode(it.t)); box.appendChild(sp0); });
  }
  function headBack(box, title, sub, back, info) {
    clear(box); var h = el('h3'); h.appendChild(chipIco(back ? 'list' : 'table')); h.appendChild(document.createTextNode(title));
    if (sub) h.appendChild(el('span', 'sub', '· ' + sub)); if (info) h.appendChild(infoIcon(info)); box.appendChild(h);
    if (back) { var up = el('button', 'upb'); up.type = 'button'; up.appendChild(ico('up', 12)); up.appendChild(document.createTextNode(back.t)); up.addEventListener('click', back.fn); box.appendChild(up); }
  }
  function th(tr, t, cls) { tr.appendChild(el('th', cls || '', t)); }
  function rowKeys(r, fn) { r.tabIndex = 0; r.setAttribute('role', 'button'); r.addEventListener('click', fn); r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); }
  function chevI() { var sv = s('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }); s('path', { d: 'M6 3.5L10.5 8 6 12.5' }, sv); return sv; }
