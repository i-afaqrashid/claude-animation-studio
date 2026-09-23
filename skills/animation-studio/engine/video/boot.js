// The frame contract between a film and the renderer.
// A film calls Studio.film({ draw(ctx, t) { ... } }) and the renderer calls window.renderAt(t).
(function () {
  const G = globalThis.G;
  const FONTS = [
    ['Caveat', 'engine/fonts/Caveat-Bold.ttf', '700'],
    ['Bungee', 'engine/fonts/Bungee-Regular.ttf', '400'],
    ['Permanent Marker', 'engine/fonts/PermanentMarker-Regular.ttf', '400'],
    ['Patrick Hand', 'engine/fonts/PatrickHand-Regular.ttf', '400'],
    ['Gochi Hand', 'engine/fonts/GochiHand-Regular.ttf', '400'],
  ];

  const Studio = {};
  Studio.film = ({ draw, duration, post = {}, fadeOut = 1.6, init } = {}) => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const DUR = duration ?? (globalThis.SCORE && globalThis.SCORE.DURATION);

    function renderAt(t, fmt = 'png') {
      G.setTime(t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, G.W, G.H);
      draw(ctx, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      G.post(ctx, t, typeof post === 'function' ? post(t) : post);
      if (DUR && fadeOut > 0) {
        const f = Math.min(1, Math.max(0, (t - (DUR - fadeOut - 0.2)) / fadeOut));
        if (f > 0) { ctx.fillStyle = `rgba(5,5,8,${f})`; ctx.fillRect(0, 0, G.W, G.H); }
      }
      return fmt === 'none' ? '' : canvas.toDataURL(fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
    }

    (async () => {
      for (const [fam, url, weight] of FONTS) {
        try { const f = new FontFace(fam, `url(${url})`, { weight }); document.fonts.add(f); await f.load(); }
        catch (e) { console.error('font failed', fam, String(e)); }
      }
      G.initTextures();
      if (init) await init(ctx);
      window.renderAt = renderAt;
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

  globalThis.Studio = Studio;
})();
