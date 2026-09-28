/* app.js
 * Full application logic:
 *   - boot / load letters, digits, symbols from char/ (glyphs.js fallback)
 *   - build input display, ABC keyboard, symbols keyboard
 *   - draw modal for custom 7x11 glyphs
 *   - render preview canvas
 *   - encode & export 8-bit BMP
 *
 * Reads glyph pixel maps and keyboard layouts from window.GLYPHS (glyphs.js).
 * Component styles live in extra.css.
 *
 * Layout rule: total pixel width of all characters plus 1px gaps
 * must not exceed CANVAS_W. Character count is unlimited.
 */
(function () {
  'use strict';

  /* ---------- Constants ---------- */
  const CANVAS_W   = 67;
  const CANVAS_H   = 26;
  const TOP_BLANK  = 15;
  const GAP        = 1;
  const SPACE_W    = 3;
  const CHAR_DIR   = 'char/';

  const DRAW_W = 7;
  const DRAW_H = 11;

  // Draw color applied inline on toggled cells (bypasses any CSS issue)
  const INK_COLOR = '#00d4aa';   // vivid violet

  const PUA_BASE = 0xE000;

  const ALPHABET  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIGITS    = '0123456789';
  const SYMBOLS   = '&+-*/@!.';
  const ALL_CHARS = ALPHABET + DIGITS + SYMBOLS;

  const GLYPHS           = window.GLYPHS || {};
  const LETTER_MAPS      = GLYPHS.LETTERS || {};
  const DIGIT_MAPS       = GLYPHS.DIGITS || {};
  const SYMBOL_MAPS      = GLYPHS.SYMBOLS || {};
  const FILENAMES        = GLYPHS.FILENAMES || {};
  const KEYBOARD_ROWS    = GLYPHS.ABC_ROWS || [];
  const SYMBOL_DIGIT_ROW = GLYPHS.SYMBOL_DIGIT_ROW || [];
  const SYMBOL_ROW       = GLYPHS.SYMBOL_ROW || [];

  const FALLBACK_MAPS = Object.assign({}, LETTER_MAPS, DIGIT_MAPS, SYMBOL_MAPS);

  /* ---------- State ---------- */
  const letters = Object.create(null);
  let name = '';
  let drawCounter = 0;

  /* ---------- DOM ---------- */
  const $ = id => document.getElementById(id);
  const bootEl        = $('boot');
  const bootProgress  = $('boot-progress');
  const errorEl       = $('boot-error');
  const retryBtn      = $('retry-btn');
  const appEl         = $('app');
  const inputText     = $('input-text');
  const kbAbc         = $('keyboard-abc');
  const kbSym         = $('keyboard-sym');
  const nameHint      = $('name-hint');
  const preview       = $('preview');
  const previewCtx    = preview.getContext('2d');
  const previewCount  = $('preview-count');
  const previewWidth  = $('preview-width');
  const exportBtn     = $('export-btn');

  /* ---------- Helpers ---------- */
  function isPUA(ch) {
    const c = ch.charCodeAt(0);
    return c >= PUA_BASE && c <= 0xF8FF;
  }

  function displayChar(ch) {
    if (ch === ' ') return '\u2423';
    if (isPUA(ch))  return '\u270E';
    return ch;
  }

  /* ---------- Glyph canvas builders ---------- */
  function buildCodeCanvas(map, color) {
    const h = map.length;
    const w = map[0].length;
    const c = document.createElement('canvas');
    c.width  = w;
    c.height = h;
    const cx = c.getContext('2d');
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = color || '#000000';
    for (let y = 0; y < h; y++) {
      const row = map[y];
      for (let x = 0; x < w; x++) {
        if (row[x] === '#') cx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function buildSpaceCanvas() {
    const c = document.createElement('canvas');
    c.width  = SPACE_W;
    c.height = 11;
    const cx = c.getContext('2d');
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, SPACE_W, 11);
    return c;
  }

  /* ---------- Filename resolution ---------- */
  function resolveFilename(ch) {
    return FILENAMES[ch] || ch;
  }

  /* ---------- Loader (BMP first, glyphs.js fallback) ---------- */
  function loadChar(ch) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width  = img.naturalWidth;
        c.height = img.naturalHeight;
        const cx = c.getContext('2d');
        cx.fillStyle = '#ffffff';
        cx.fillRect(0, 0, c.width, c.height);
        cx.drawImage(img, 0, 0);
        resolve({ ch, canvas: c, source: 'bmp' });
      };
      img.onerror = () => {
        const fb = FALLBACK_MAPS[ch];
        if (fb) {
          const c = buildCodeCanvas(fb, '#000000');
          resolve({ ch, canvas: c, source: 'code' });
        } else {
          resolve({ ch, canvas: null, source: 'missing' });
        }
      };
      img.src = CHAR_DIR + resolveFilename(ch) + '.bmp';
    });
  }

  /* ---------- Pixel width helpers ---------- */
  function currentWidth() {
    let w = 0;
    for (let i = 0; i < name.length; i++) {
      const L = letters[name[i]];
      if (!L) continue;
      w += L.width;
      if (i > 0) w += GAP;
    }
    return w;
  }

  function canAdd(ch) {
    const L = letters[ch];
    if (!L) return false;
    const next = currentWidth() + (name.length > 0 ? GAP : 0) + L.width;
    return next <= CANVAS_W;
  }

  /* ---------- Build UI ---------- */
  function makeCharButton(ch) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'key';
    btn.dataset.char = ch;
    btn.textContent = ch;
    btn.setAttribute('aria-label', 'Character ' + ch);
    return btn;
  }

  function makeFnButton(label, action, ariaLabel, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'key fn' + (extraClass ? ' ' + extraClass : '');
    btn.dataset.action = action;
    btn.textContent = label;
    btn.setAttribute('aria-label', ariaLabel);
    return btn;
  }

  function buildAbcKeyboard() {
    kbAbc.innerHTML = '';

    KEYBOARD_ROWS.forEach((row, ri) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';

      for (const ch of row) rowEl.appendChild(makeCharButton(ch));

      if (ri === 1) {
        rowEl.appendChild(makeFnButton('?123', 'to-sym', 'Switch to symbols and digits', 'wide'));
      }
      if (ri === 2) {
        rowEl.appendChild(makeFnButton('Clear all', 'clear', 'Clear all characters', 'wide'));
        rowEl.appendChild(makeFnButton('\u232B', 'delete', 'Delete last character'));
      }

      kbAbc.appendChild(rowEl);
    });
  }

  function buildSymKeyboard() {
    kbSym.innerHTML = '';

    const row1 = document.createElement('div');
    row1.className = 'keyboard-row';
    for (const ch of SYMBOL_DIGIT_ROW) row1.appendChild(makeCharButton(ch));
    kbSym.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'keyboard-row sym-row';
    for (const ch of SYMBOL_ROW) {
      const btn = makeCharButton(ch);
      btn.classList.add('sym-char');
      row2.appendChild(btn);
    }
    row2.appendChild(makeFnButton('ABC', 'to-abc', 'Back to letters', 'wide'));
    kbSym.appendChild(row2);

    // Row 3: [draw] [space] [Clear all] [鈱玗
    const row3 = document.createElement('div');
    row3.className = 'keyboard-row';

    const drawBtn = makeFnButton('\u270E', 'draw', 'Draw a custom glyph');
    drawBtn.style.color = '#00d4aa';
    row3.appendChild(drawBtn);

    row3.appendChild(makeFnButton('\u2423', 'space', 'Insert space', 'space'));
    row3.appendChild(makeFnButton('Clear all', 'clear', 'Clear all characters', 'wide'));
    row3.appendChild(makeFnButton('\u232B', 'delete', 'Delete last character'));
    kbSym.appendChild(row3);
  }

  /* ---------- Page switching ---------- */
  function switchPage(page) {
    document.querySelectorAll('.kb-page').forEach(p => {
      p.hidden = p.dataset.page !== page;
    });
  }

  /* ---------- State mutations ---------- */
  function addChar(ch) {
    if (!canAdd(ch)) return;
    name += ch;
    updateDisplay();
    render();
  }

  function delChar() {
    if (!name.length) return;
    name = name.slice(0, -1);
    updateDisplay();
    render();
  }

  function clearAll() {
    if (!name.length) return;
    name = '';
    updateDisplay();
    render();
  }

  /* ---------- Display sync ---------- */
  function updateDisplay() {
    inputText.textContent = name.split('').map(displayChar).join('');

    const w = currentWidth();
    nameHint.textContent = name.length + ' chars \u00B7 ' + w + ' / ' + CANVAS_W + ' px';
    nameHint.classList.toggle('full', w >= CANVAS_W);

    document.querySelectorAll('.key[data-char]').forEach(k => {
      k.disabled = !canAdd(k.dataset.char);
    });
    document.querySelectorAll('.key[data-action="space"]').forEach(k => {
      k.disabled = !canAdd(' ');
    });
    document.querySelectorAll('.key[data-action="clear"]').forEach(k => {
      k.disabled = name.length === 0;
    });
    document.querySelectorAll('.key[data-action="draw"]').forEach(k => {
      k.disabled = currentWidth() + (name.length > 0 ? GAP : 0) + 1 > CANVAS_W;
    });
  }

  /* ---------- Canvas render ---------- */
  function render() {
    previewCtx.fillStyle = '#ffffff';
    previewCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    let x = 0, drawn = 0;
    for (const ch of name) {
      const L = letters[ch];
      if (!L) continue;
      previewCtx.drawImage(L.canvas, x, TOP_BLANK);
      x += L.width + GAP;
      drawn++;
    }

    previewCount.textContent = drawn;
    previewWidth.textContent = currentWidth();

    exportBtn.disabled = !(name.length > 0 && drawn === name.length);
  }

  /* ---------- Draw modal ---------- */
  let drawModal  = null;
  let drawGridEl = null;
  let drawAddBtn = null;

  /* Toggle a cell on/off; sets color inline so it never depends on CSS */
  function setCellOn(cell, on) {
    if (on) {
      cell.classList.add('on');
      cell.style.background = INK_COLOR;
    } else {
      cell.classList.remove('on');
      cell.style.background = '#ffffff';
    }
  }

  function buildDrawModal() {
    const modal = document.createElement('div');
    modal.className = 'draw-modal';
    modal.hidden = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'draw-backdrop';

    const content = document.createElement('div');
    content.className = 'draw-content';

    const header = document.createElement('div');
    header.className = 'draw-header';
    header.textContent = 'Draw a custom glyph';

    const sub = document.createElement('div');
    sub.className = 'draw-sub';
    sub.textContent = '7 \u00D7 11 grid \u00B7 click a cell to toggle';

    const wrap = document.createElement('div');
    wrap.className = 'draw-grid-wrap';

    const grid = document.createElement('div');
    grid.className = 'draw-grid';
    for (let y = 0; y < DRAW_H; y++) {
      for (let x = 0; x < DRAW_W; x++) {
        const cell = document.createElement('div');
        cell.className = 'draw-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.style.background = '#ffffff';   // explicit base colour, no CSS needed
        grid.appendChild(cell);
      }
    }
    wrap.appendChild(grid);

    const footer = document.createElement('div');
    footer.className = 'draw-footer';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'draw-btn draw-clear';
    clearBtn.textContent = 'Clear';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'draw-btn';
    cancelBtn.textContent = 'Cancel';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'draw-btn primary';
    addBtn.textContent = 'Add';
    addBtn.disabled = true;

    footer.appendChild(clearBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(addBtn);

    content.appendChild(header);
    content.appendChild(sub);
    content.appendChild(wrap);
    content.appendChild(footer);
    modal.appendChild(backdrop);
    modal.appendChild(content);
    document.body.appendChild(modal);

    grid.addEventListener('click', e => {
      const cell = e.target.closest('.draw-cell');
      if (!cell) return;
      const willBeOn = !cell.classList.contains('on');
      setCellOn(cell, willBeOn);
      addBtn.disabled = !gridHasInk();
    });

    clearBtn.addEventListener('click', () => {
      grid.querySelectorAll('.draw-cell').forEach(c => setCellOn(c, false));
      addBtn.disabled = true;
    });

    cancelBtn.addEventListener('click', closeDrawModal);
    backdrop.addEventListener('click', closeDrawModal);

    addBtn.addEventListener('click', () => {
      const ok = commitDraw();
      if (ok) closeDrawModal();
    });

    document.addEventListener('keydown', e => {
      if (modal.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawModal();
      }
    });

    drawModal  = modal;
    drawGridEl = grid;
    drawAddBtn = addBtn;
  }

  function gridHasInk() {
    return !!drawGridEl.querySelector('.draw-cell.on');
  }

  function openDrawModal() {
    drawGridEl.querySelectorAll('.draw-cell').forEach(c => setCellOn(c, false));
    drawAddBtn.disabled = true;
    drawModal.hidden = false;
  }

  function closeDrawModal() {
    drawModal.hidden = true;
  }

  function commitDraw() {
    const cells = drawGridEl.querySelectorAll('.draw-cell');
    const ink = [];
    let xmin = DRAW_W, xmax = -1;

    for (let y = 0; y < DRAW_H; y++) {
      ink.push(new Array(DRAW_W).fill(false));
    }
    cells.forEach(cell => {
      if (!cell.classList.contains('on')) return;
      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);
      ink[y][x] = true;
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
    });

    if (xmax < 0) return false;

    const glyphW = xmax - xmin + 1;

    const next = currentWidth() + (name.length > 0 ? GAP : 0) + glyphW;
    if (next > CANVAS_W) return false;

    const c = document.createElement('canvas');
    c.width  = glyphW;
    c.height = DRAW_H;
    const cx = c.getContext('2d');
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, glyphW, DRAW_H);
    cx.fillStyle = '#000000';
    for (let y = 0; y < DRAW_H; y++) {
      for (let x = xmin; x <= xmax; x++) {
        if (ink[y][x]) cx.fillRect(x - xmin, y, 1, 1);
      }
    }

    const code = PUA_BASE + drawCounter;
    drawCounter++;
    const ch = String.fromCharCode(code);

    letters[ch] = { canvas: c, width: glyphW, height: DRAW_H, isDrawn: true };
    name += ch;

    updateDisplay();
    render();
    return true;
  }

  /* ---------- Boot ---------- */
  let completed = 0;

  async function boot() {
    bootEl.hidden      = false;
    errorEl.hidden     = true;
    appEl.hidden       = true;
    appEl.classList.remove('ready');

    completed = 0;
    const TOTAL = ALL_CHARS.length;
    bootProgress.textContent = '0 / ' + TOTAL;

    for (const k of Object.keys(letters)) delete letters[k];
    name = '';
    drawCounter = 0;

    const chars = ALL_CHARS.split('');
    const results = await Promise.allSettled(chars.map(ch => {
      const p = loadChar(ch);
      const tick = () => {
        completed++;
        bootProgress.textContent = completed + ' / ' + TOTAL;
      };
      p.then(tick, tick);
      return p;
    }));

    let ok = 0, fromBmp = 0, fromCode = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value && r.value.canvas) {
        const { ch, canvas, source } = r.value;
        letters[ch] = { canvas, width: canvas.width, height: canvas.height };
        ok++;
        if (source === 'bmp')  fromBmp++;
        if (source === 'code') fromCode++;
      }
    }

    console.log('[boot] loaded ' + ok + '/' + TOTAL +
                '  (bmp=' + fromBmp + ', code=' + fromCode + ')');

    const sc = buildSpaceCanvas();
    letters[' '] = { canvas: sc, width: SPACE_W, height: 11, isCode: true };

    if (ok === TOTAL) {
      bootEl.hidden = true;
      appEl.hidden  = false;
      requestAnimationFrame(() => {
        appEl.classList.add('ready');
      });
      switchPage('abc');
      updateDisplay();
      render();
    } else {
      bootEl.hidden  = true;
      errorEl.hidden = false;
    }
  }

  retryBtn.addEventListener('click', boot);

  /* ---------- Keyboard click handling ---------- */
  function onKeyClick(e) {
    const key = e.target.closest('.key');
    if (!key || key.disabled) return;

    const action = key.dataset.action;
    if (action === 'delete') { delChar(); return; }
    if (action === 'space')  { addChar(' '); return; }
    if (action === 'clear')  { clearAll(); return; }
    if (action === 'to-sym') { switchPage('sym'); return; }
    if (action === 'to-abc') { switchPage('abc'); return; }
    if (action === 'draw')   { openDrawModal(); return; }
    if (key.dataset.char)    { addChar(key.dataset.char); }
  }

  kbAbc.addEventListener('click', onKeyClick);
  kbSym.addEventListener('click', onKeyClick);

  function onKeyKeydown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.target.click && e.target.click();
    }
  }
  kbAbc.addEventListener('keydown', onKeyKeydown);
  kbSym.addEventListener('keydown', onKeyKeydown);

  /* ---------- Physical keyboard support ---------- */
  document.addEventListener('keydown', e => {
    if (drawModal && !drawModal.hidden) return;
    if (appEl.hidden || !appEl.classList.contains('ready')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      delChar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearAll();
    } else if (e.key === ' ') {
      e.preventDefault();
      addChar(' ');
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      addChar(e.key.toUpperCase());
    } else if (/^[0-9&+\-*/@!.]$/.test(e.key)) {
      e.preventDefault();
      addChar(e.key);
    }
  });

  /* ---------- BMP encoder (8-bit indexed, grayscale palette) ---------- */
  function canvasToBMP8(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;

    const rowSize     = (w + 3) & ~3;
    const pixDataSize = rowSize * h;
    const paletteSize = 256 * 4;
    const offBits     = 14 + 40 + paletteSize;
    const totalSize   = offBits + pixDataSize;

    const buf = new ArrayBuffer(totalSize);
    const dv  = new DataView(buf);
    const u8  = new Uint8Array(buf);

    u8[0] = 0x42; u8[1] = 0x4D;
    dv.setUint32(2,  totalSize, true);
    dv.setUint16(6,  0, true);
    dv.setUint16(8,  0, true);
    dv.setUint32(10, offBits,   true);

    dv.setUint32(14, 40,          true);
    dv.setInt32 (18, w,           true);
    dv.setInt32 (22, h,           true);
    dv.setUint16(26, 1,           true);
    dv.setUint16(28, 8,           true);
    dv.setUint32(30, 0,           true);
    dv.setUint32(34, pixDataSize, true);
    dv.setInt32 (38, 2835,        true);
    dv.setInt32 (42, 2835,        true);
    dv.setUint32(46, 256,         true);
    dv.setUint32(50, 0,           true);

    for (let i = 0; i < 256; i++) {
      const p = 54 + i * 4;
      u8[p]     = i;
      u8[p + 1] = i;
      u8[p + 2] = i;
      u8[p + 3] = 0;
    }

    for (let y = 0; y < h; y++) {
      const srcY   = h - 1 - y;
      const rowOff = offBits + y * rowSize;
      for (let x = 0; x < w; x++) {
        const i = (srcY * w + x) * 4;
        const a = px[i + 3];
        if (a < 128) { u8[rowOff + x] = 255; continue; }
        const lum = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
        u8[rowOff + x] = lum > 128 ? 255 : 0;
      }
    }

    return new Blob([buf], { type: 'image/bmp' });
  }

  /* ---------- Export ---------- */
  exportBtn.addEventListener('click', () => {
    if (!name) return;

    let blob;
    try {
      blob = canvasToBMP8(preview);
    } catch (err) {
      alert(
        'Export failed.\n\n' +
        'The browser is blocking pixel access (this usually happens when ' +
        'opening the file directly from disk with file://).\n\n' +
        'Serve the folder over HTTP instead, e.g.:\n' +
        '   python -m http.server\n' +
        'then open http://localhost:8000'
      );
      return;
    }

    const safe = name
      .replace(/ /g, '_')
      .split('')
      .map(c => isPUA(c) ? '_draw' : c)
      .join('')
      .replace(/[\\/:*?"<>|]/g, '_');

    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = (safe || 'filter') + '.bmp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });

  /* ---------- Kick off ---------- */
  buildAbcKeyboard();
  buildSymKeyboard();
  buildDrawModal();
  boot();
})();

