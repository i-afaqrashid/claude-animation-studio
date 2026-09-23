// Shared math helpers: deterministic randomness, noise, easing.
// Everything here is pure so audio + video workers stay perfectly in sync.

(function () {
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stateless hash -> [0,1)
function hash(...xs) {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    let v = Math.floor(x * 1000003) | 0;
    h ^= v;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

// 1D value noise, smooth
function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, x) => clamp((x - a) / (b - a));
const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
const smooth = (t) => t * t * (3 - 2 * t);

const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inQuart: (t) => t * t * t * t,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  outElastic: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// Tween helper: value from a to b between t0..t1 with easing
function tween(t, t0, t1, a, b, e = ease.inOutCubic) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  return lerp(a, b, e((t - t0) / (t1 - t0)));
}

// Damped spring impulse response: kick at t0, returns 0 before, decays after
function springKick(t, t0, freq = 3, decay = 5) {
  if (t < t0) return 0;
  const x = t - t0;
  return Math.exp(-decay * x) * Math.sin(2 * Math.PI * freq * x);
}

// Envelope that is 1 right at t0 and decays exponentially
function pulse(t, t0, decay = 8) {
  if (t < t0) return 0;
  return Math.exp(-decay * (t - t0));
}

// Keyframe interpolation: keys = [[t, value, easeFn?], ...]
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, v0] = ks[i];
    const [t1, v1, e] = ks[i + 1];
    if (t <= t1) return lerp(v0, v1, (e || ease.inOutCubic)((t - t0) / (t1 - t0)));
  }
  return ks[ks.length - 1][1];
}

const U = { mulberry32, hash, noise1, clamp, lerp, invLerp, remap, smooth, ease, tween, springKick, pulse, keys };
if (typeof module !== 'undefined') module.exports = U; else globalThis.U = U;
})();
