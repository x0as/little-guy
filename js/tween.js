const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outSine: t => Math.sin(t * Math.PI / 2),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
};

const tweens = [];

function tween(obj, to, ms, easing = 'linear') {
  return new Promise(resolve => {
    const from = {};
    for (const k in to) from[k] = obj[k];
    tweens.push({ obj, from, to, ms, easing, t: 0, resolve });
  });
}

function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt * 1000;
    const k = Math.min(1, tw.t / tw.ms);
    const e = ease[tw.easing](k);
    for (const key in tw.to) {
      tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
    }
    if (k >= 1) {
      tweens.splice(i, 1);
      tw.resolve();
    }
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
