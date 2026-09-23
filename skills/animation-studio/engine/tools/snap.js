// node engine/render.js snap <url> [--desktop] [--full] [--out assets/site.png] [--hide ".cookie-banner,#popup"] [--dark] [--wait 1500]
// A real screenshot of a website, as a phone (390×844 at 2x) or a desktop (1440×900) sees it, for
// UI.imageScreen (a screenshot scrolling inside UI.phone) or a Ken Burns pan (G.kenBurns).
//   --full   the whole page (scrolls first so lazy images load; capped at 12 screens)
//   --hide   CSS selectors to hide (cookie banners, chat bubbles, pop-ups)
// Use screenshots of sites the user owns or has permission to show.
module.exports = async function snap(C, _mode, args) {
  const { fs, path, ROOT, sleep } = C;
  const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const url = args.find((a, i) => /^https?:\/\//.test(a) && !['--out', '--hide', '--wait'].includes(args[i - 1]));
  if (!url) { console.log('usage: node engine/render.js snap <https://…> [--desktop] [--full] [--out assets/x.png] [--hide ".sel"] [--dark] [--wait ms]'); process.exitCode = 1; return; }
  const desktop = args.includes('--desktop'), full = args.includes('--full');
  const device = desktop ? { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false } : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
  const host = new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '');
  const out = path.resolve(ROOT, val('--out') || `assets/snap-${host}-${desktop ? 'desktop' : 'mobile'}${full ? '-full' : ''}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const w = await C.openWorker('snap', url, { external: true, device });
  try {
    const c = w.c;
    if (!desktop) await c.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }).catch(() => {});
    if (args.includes('--dark')) await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    if (!desktop) { await c.send('Page.reload', {}); for (let i = 0; i < 200; i++) { try { if (await C.evaluate(c, 'document.readyState') === 'complete') break; } catch (e) { /* loading */ } await sleep(100); } }
    const hide = val('--hide');
    if (hide) await C.evaluate(c, `(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(hide)} + '{display:none !important}'; document.head.appendChild(s); return true; })()`);
    // scroll through the page so lazy images load, then back to the top
    const height = await C.evaluate(c, 'Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)');
    const cap = Math.min(height, device.height * 12);
    if (full) { for (let y = 0; y < cap; y += device.height * 0.8) { await C.evaluate(c, `window.scrollTo(0, ${y})`); await sleep(250); } await C.evaluate(c, 'window.scrollTo(0, 0)'); }
    await sleep(+(val('--wait') || 1200));
    const shot = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(full ? { clip: { x: 0, y: 0, width: device.width, height: cap, scale: 1 } } : {}) });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    const b = fs.readFileSync(out);
    console.log(`snap: ${path.relative(ROOT, out)} (${b.readUInt32BE(16)}×${b.readUInt32BE(20)}, ${desktop ? 'desktop' : 'phone'}${full ? ', whole page' : ''})`);
    console.log(`film.js: const shot = await Studio.loadImage('${path.relative(ROOT, out)}');  // in init()\n         UI.phone(ctx, x, y, h, UI.imageScreen(shot, { scroll: (t) => U.keys(t, [[T(2), 0], [T(4), 0.5]]) }), t)`);
  } finally { w.close(); }
};
