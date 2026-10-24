const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const cam = { x: 0, y: 0, follow: false, shake: 0, shakeDecay: 0 };
const flash = { a: 0 };
const keys = {};
const mouse = { x: 320, y: 180, down: false };
let scene = 'office';

function shake(amount, ms) {
  cam.shake = amount;
  cam.shakeDecay = amount / (ms / 1000);
}

function camTarget() {
  return {
    x: Math.max(0, Math.min(WORLD_W - 640, player.x - 320)),
    y: Math.max(-420, Math.min(0, player.y - 40 - 180)),
  };
}

function snapCamera() {
  const t = camTarget();
  cam.x = t.x;
  cam.y = t.y;
}

function update(dt) {
  updateTweens(dt);
  updatePlayer(dt);
  updateProps(dt);
  updateDebris(dt);
  updateDialogue(dt);

  if (cam.follow) {
    const t = camTarget();
    const k = 1 - Math.exp(-7 * dt);
    cam.x += (t.x - cam.x) * k;
    cam.y += (t.y - cam.y) * k;
  }

  cam.shake = Math.max(0, cam.shake - cam.shakeDecay * dt);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  keys[e.code] = true;
  keys.Shift = e.shiftKey || e.code === 'ShiftLeft' || e.code === 'ShiftRight';

  if (e.code === 'Space' || e.code.startsWith('Arrow')) {
    e.preventDefault();
  }

  if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) {
    dialogueInput();
  }
});

addEventListener('keyup', e => {
  keys[e.code] = false;
  keys.Shift = e.shiftKey;
});

addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
});

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / r.width * 640;
  mouse.y = (e.clientY - r.top) / r.height * 360;
});

canvas.addEventListener('mousedown', () => {
  mouse.down = true;
  dialogueInput();
});

addEventListener('mouseup', () => {
  mouse.down = false;
});

loadArt().then(() => {
  buildCity();
  if (location.search.includes('skip')) {
    skipIntro();
  } else {
    runIntro();
  }
  requestAnimationFrame(loop);
});
