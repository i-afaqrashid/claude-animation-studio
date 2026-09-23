// The frame contract between a film and the renderer.
// A film calls Studio.film({ draw(ctx, t) { ... } }) and the renderer calls window.renderAt(t, fmt, scale).
(function () {
  const G = globalThis.G;
  const FONTS = [
    ['Caveat', 'engine/fonts/Caveat-Bold.ttf', '700'],
    ['Bungee', 'engine/fonts/Bungee-Regular.ttf', '400'],
    ['Permanent Marker', 'engine/fonts/PermanentMarker-Regular.ttf', '400'],
    ['Patrick Hand', 'engine/fonts/PatrickHand-Regular.ttf', '400'],
    ['Gochi Hand', 'engine/fonts/GochiHand-Regular.ttf', '400'],
    // a clean sans for captions, subtitles and UI text that looks the same on every machine
    ['Inter', 'engine/fonts/Inter-400.ttf', '400'],
    ['Inter', 'engine/fonts/Inter-700.ttf', '700'],
    ['Inter', 'engine/fonts/Inter-800.ttf', '800'],
    // other scripts (G.text / UI.text pick these automatically for Urdu, Arabic and Hindi runs)
    ['Noto Nastaliq Urdu', 'engine/fonts/NotoNastaliqUrdu-Regular.ttf', '400'],
    ['Noto Naskh Arabic', 'engine/fonts/NotoNaskhArabic-Regular.ttf', '400'],
    ['Noto Naskh Arabic', 'engine/fonts/NotoNaskhArabic-Bold.ttf', '700'],
    ['Noto Sans Devanagari', 'engine/fonts/NotoSansDevanagari-Regular.ttf', '400'],
    ['Noto Sans Devanagari', 'engine/fonts/NotoSansDevanagari-Bold.ttf', '700'],
  ];
  G.scale = 1;

  const Studio = {};
  Studio.film = ({ draw, duration, post = {}, fadeOut = 1.6, init } = {}) => {
    const canvas = document.getElementById('c');
    canvas.width = G.W; canvas.height = G.H; // the score's FORMAT (gfx.js read it)
    const ctx = canvas.getContext('2d');
    const DUR = duration ?? (globalThis.SCORE && globalThis.SCORE.DURATION);

    // scale < 1 renders a smaller frame of the SAME picture (drafts, the live preview): the film
    // keeps drawing in full-size coordinates and the canvas transform shrinks it.
    function renderAt(t, fmt = 'png', scale = 1) {
      const cw = 2 * Math.ceil((G.W * scale) / 2), ch = 2 * Math.ceil((G.H * scale) / 2); // H.264 needs even sizes
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      G.scale = scale;
      G.setTime(t);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, G.W, G.H);
      draw(ctx, t);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      G.post(ctx, t, typeof post === 'function' ? post(t) : post);
      if (DUR && fadeOut > 0) {
        const f = Math.min(1, Math.max(0, (t - (DUR - fadeOut - 0.2)) / fadeOut));
        if (f > 0) { ctx.fillStyle = `rgba(5,5,8,${f})`; ctx.fillRect(0, 0, G.W, G.H); }
      }
      if (Studio.afterFrame) Studio.afterFrame(ctx, t);
      return fmt === 'none' ? '' : canvas.toDataURL(fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
    }

    // ---------- probe: what text does frame t draw, where, how big, on what? ----------
    // Used by the pacing check (is there text in the first 3 s?) and the visual QA (safe area, size,
    // overlaps, contrast). Records every fillText (also into full-frame offscreen canvases: transition
    // buffers, caches), then renders the frame again WITHOUT text to measure the background under each.
    function probeAt(t, scale = 0.5) {
      const P = CanvasRenderingContext2D.prototype, origFill = P.fillText, origStroke = P.strokeText;
      const aspect = G.W / G.H, texts = [];
      let lastStroke = null;
      P.strokeText = function (text, ...rest) { lastStroke = String(text); return origStroke.call(this, text, ...rest); };
      P.fillText = function (text, x, y, ...rest) {
        const c = this.canvas;
        if (c && Math.abs(c.width / c.height - aspect) < 0.01 && String(text).trim() && !G.decorDepth) {
          const m = this.measureText(text), tr = this.getTransform(), k = G.W / c.width;
          const size = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 0])[1]);
          const al = this.textAlign, rtl = this.direction === 'rtl';
          const w = m.width;
          const x0 = al === 'center' ? x - w / 2 : al === 'right' || (al === 'end' && !rtl) || (al === 'start' && rtl) ? x - w : x;
          const asc = m.actualBoundingBoxAscent || size * 0.8, desc = m.actualBoundingBoxDescent || size * 0.2;
          const pts = [[x0, y - asc], [x0 + w, y - asc], [x0, y + desc], [x0 + w, y + desc]].map(([px, py]) => [(tr.a * px + tr.c * py + tr.e) * k, (tr.b * px + tr.d * py + tr.f) * k]);
          const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
          texts.push({ text: String(text), x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
            size: size * Math.hypot(tr.a, tr.b) * k, color: typeof this.fillStyle === 'string' ? this.fillStyle : null, alpha: this.globalAlpha, outlined: lastStroke === String(text) });
          lastStroke = null;
        }
        return origFill.call(this, text, x, y, ...rest);
      };
      try { renderAt(t, 'none', scale); } finally { P.fillText = origFill; P.strokeText = origStroke; }
      // the same frame without any text: the background each text sits on
      P.fillText = function () {}; P.strokeText = function () {};
      try { renderAt(t, 'none', scale); } finally { P.fillText = origFill; P.strokeText = origStroke; }
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data, cw = canvas.width, ch = canvas.height, k = cw / G.W;
      const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const parse = (c) => { const d = document.createElement('canvas').getContext('2d'); d.fillStyle = c; const v = d.fillStyle; if (v[0] === '#') return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)); const m = /rgba?\(([^)]+)\)/.exec(v); return m ? m[1].split(',').slice(0, 3).map(Number) : null; };
      for (const tx of texts) {
        const rgb = tx.color && parse(tx.color);
        const x0 = Math.max(0, Math.floor(tx.x * k)), x1 = Math.min(cw - 1, Math.ceil((tx.x + tx.w) * k)), y0 = Math.max(0, Math.floor(tx.y * k)), y1 = Math.min(ch - 1, Math.ceil((tx.y + tx.h) * k));
        const L = [];
        for (let yy = y0; yy <= y1; yy += 2) for (let xx = x0; xx <= x1; xx += 2) { const i = (yy * cw + xx) * 4; L.push(lum(img[i], img[i + 1], img[i + 2])); }
        L.sort((a, b) => a - b);
        tx.onscreen = x1 > x0 && y1 > y0;
        if (rgb && L.length) {
          const tl = lum(...rgb), med = L[Math.floor(L.length / 2)], worst = Math.abs(tl - L[0]) < Math.abs(tl - L[L.length - 1]) ? L[0] : L[L.length - 1];
          const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          tx.contrast = +cr(tl, med).toFixed(2); tx.worstContrast = +cr(tl, worst).toFixed(2);
        }
      }
      return texts;
    }

    (async () => {
      for (const [fam, url, weight] of FONTS) {
        try { const f = new FontFace(fam, `url(${url})`, { weight }); document.fonts.add(f); await f.load(); }
        catch (e) { console.error('font failed', fam, String(e)); }
      }
      await Studio.loadBrand();
      G.initTextures();
      if (init) await init(ctx);
      window.renderAt = renderAt;
      window.probeAt = probeAt;
      window.READY = true;
    })().catch((e) => console.error('boot failed', String(e), e && e.stack));
  };

  // load a user image from the project folder (e.g. 'assets/logo.png') inside init()
  Studio.loadImage = (src) => new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('image failed to load: ' + src));
    im.src = src;
  });
  // load a JSON file from the project (e.g. 'out/voice.json' written by song.js) inside init(); null if missing
  Studio.loadJSON = async (src) => { try { const r = await fetch(src, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  // load a font file from the project (e.g. a brand font) inside init()
  Studio.loadFont = async (family, src, weight = '400') => { const f = new FontFace(family, `url(${src})`, { weight: String(weight) }); document.fonts.add(f); await f.load(); return family; };

  // ---------- the brand kit ----------
  // brand.json next to index.html (optional): its colours become the UI theme defaults (a film's own
  // UI.setTheme still wins), its fonts are loaded, and its logo is ready as Studio.brand.logoImg.
  Studio.brand = null;
  Studio.brandTheme = (b) => {
    const c = b.colors || {};
    const th = { accent: c.primary, accent2: c.secondary, ok: c.success, ink: c.ink || c.text, muted: c.muted, onAccent: c.onPrimary, app: c.surface, card: c.card };
    const body = b.fonts && (b.fonts.body || b.fonts.display);
    if (body && body.family) th.font = `"${body.family}", system-ui, -apple-system, Helvetica, Arial, sans-serif`;
    for (const k of Object.keys(th)) if (th[k] === undefined) delete th[k];
    return th;
  };
  Studio.loadBrand = async () => {
    const b = await Studio.loadJSON('brand.json');
    if (!b) return null;
    Studio.brand = b;
    for (const f of Object.values(b.fonts || {})) {
      if (f && f.file) { try { await Studio.loadFont(f.family, f.file, f.weight || 400); } catch (e) { console.error('brand font failed', f.family, String(e)); } }
    }
    if (globalThis.UI && UI.setThemeDefaults) UI.setThemeDefaults(Studio.brandTheme(b));
    if (b.logo) { try { b.logoImg = await Studio.loadImage(b.logo); } catch (e) { console.error(String(e)); } }
    return b;
  };

  // ---------- caching static layers ----------
  // Draw an expensive static layer (a background, a set, a map) once and reuse it on every frame.
  // It still boils: `variants` versions (default 3) are drawn with different pencil jitter and cycle
  // at the boil rate. drawFn(ctx) must not depend on t. Use: ctx.drawImage(Studio.cache('bg', drawBg), 0, 0, G.W, G.H)
  const caches = new Map();
  Studio.cache = (key, drawFn, { variants = 3 } = {}) => {
    const s = G.scale || 1, v = variants > 1 ? ((G.boil % variants) + variants) % variants : 0, k = `${key}|${s}|${v}`;
    let c = caches.get(k);
    if (!c) {
      c = G.makeCanvas(Math.round(G.W * s), Math.round(G.H * s));
      const x = c.getContext('2d');
      x.setTransform(s, 0, 0, s, 0, 0);
      const saved = G.boil;
      G.boil = v;
      try { drawFn(x); } finally { G.boil = saved; }
      caches.set(k, c);
    }
    return c;
  };

  globalThis.Studio = Studio;
})();
