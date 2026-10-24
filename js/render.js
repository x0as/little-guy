const WIN = { x: 360, y: 50, w: 220, h: 150 };   // the office window
const FLOOR = 296;
const DOC_X = 300;
const TRAIL = { x: 0.35 / Math.hypot(0.35, 1), y: -1 / Math.hypot(0.35, 1) };

let skyGrad = null;

function render() {
  if (!skyGrad) {
    skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
    skyGrad.addColorStop(0, '#3a5a9b');
    skyGrad.addColorStop(1, '#f2b880');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 640, 360);

  const sx = (Math.random() - 0.5) * 2 * cam.shake;
  const sy = (Math.random() - 0.5) * 2 * cam.shake;
  ctx.save();
  ctx.translate(Math.round(-cam.x + sx), Math.round(-cam.y + sy));
  if (scene === 'office') drawOffice(); else drawCity();
  drawPlayer();
  drawDebris();
  ctx.restore();

  if (player.control) {
    ctx.font = '11px ' + FONT;
    ctx.textBaseline = 'top';
    const msg = 'WASD / arrows: fly   SPACE or click: laser   Destroyed: ' + kills;
    ctx.fillStyle = '#000';
    ctx.fillText(msg, 9, 7);
    ctx.fillStyle = '#fff';
    ctx.fillText(msg, 8, 6);
  }
  drawDialogue();
  if (flash.a > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + flash.a + ')';
    ctx.fillRect(0, 0, 640, 360);
  }
}

function drawCity() {
  ctx.fillStyle = '#6f7fa3';
  for (const b of farBuildings) {
    if (b.x + b.w < cam.x - 20 || b.x > cam.x + 660) continue;
    ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h));
  }

  ctx.fillStyle = '#8a8a99';
  ctx.fillRect(0, GROUND, WORLD_W, 8);
  ctx.fillStyle = '#3b3b4a';
  ctx.fillRect(0, GROUND + 8, WORLD_W, 80);
  ctx.fillStyle = '#d9d9a0';
  for (let x = Math.floor(cam.x / 50) * 50; x < cam.x + 660; x += 50) {
    ctx.fillRect(x, 338, 20, 3);
  }

  for (const p of props) {
    if (p.x + p.w / 2 < cam.x - 20 || p.x - p.w / 2 > cam.x + 660) continue;
    drawProp(p);
  }
  if (cityMeteor) drawMeteor(cityMeteor);
}

function drawProp(p) {
  const x = Math.round(p.x + p.shake);
  if (p.img) {
    ctx.drawImage(p.img, Math.round(x - p.w / 2), Math.round(p.y - p.h));
    return;
  }
  const hit = p.flash > 0;
  if (p.kind === 'car') {
    ctx.fillStyle = p.color;
    ctx.fillRect(x - p.w / 2, p.y - p.h * 0.6, p.w, p.h * 0.6);
    ctx.fillRect(x - p.w * 0.25, p.y - p.h, p.w * 0.5, p.h * 0.45);
    ctx.fillStyle = '#1b1b22';
    ctx.fillRect(x - p.w * 0.28 - 2, p.y - 4, 5, 4);
    ctx.fillRect(x + p.w * 0.28 - 2, p.y - 4, 5, 4);
  } else {
    ctx.fillStyle = p.color;
    ctx.fillRect(x - p.w / 2, p.y - p.h, p.w, p.h);
    const rng = mulberry(p.seed);
    ctx.fillStyle = '#f6d86b';
    for (let wy = 10; wy < p.h - 14; wy += 16) {
      for (let wx = -p.w / 2 + 7; wx < p.w / 2 - 9; wx += 12) {
        if (rng() < 0.6) ctx.fillRect(Math.round(x + wx), Math.round(p.y - p.h + wy), 6, 8);
      }
    }
  }
  if (hit) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x - p.w / 2, p.y - p.h, p.w, p.h);
  }
}

function drawMeteor(m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(m.s, m.s);
  if (art.meteor) {
    ctx.drawImage(art.meteor, -art.meteor.width / 2, -art.meteor.height / 2);
  } else {
    const r = m.r;
    const bx = TRAIL.x * r * 4, by = TRAIL.y * r * 4;
    const px = -TRAIL.y * r, py = TRAIL.x * r;
    ctx.fillStyle = 'rgba(255,122,26,0.8)';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.lineTo(-px, -py); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,63,0.9)';
    ctx.beginPath(); ctx.moveTo(px / 2, py / 2); ctx.lineTo(bx * 0.6, by * 0.6); ctx.lineTo(-px / 2, -py / 2); ctx.fill();
    ctx.fillStyle = '#7a4e34';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5c3a28';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.25, r * 0.3, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawOffice() {
  // sky and meteor first, the room goes on top so it acts like a window frame
  ctx.fillStyle = '#7fa6d9';
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  drawMeteor(officeMeteor);

  if (art.office_bg) {
    ctx.drawImage(art.office_bg, 0, 0);
  } else {
    const wall = '#c9c3b0';
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 640, WIN.y);
    ctx.fillRect(0, WIN.y + WIN.h, 640, FLOOR - WIN.y - WIN.h);
    ctx.fillRect(0, WIN.y, WIN.x, WIN.h);
    ctx.fillRect(WIN.x + WIN.w, WIN.y, 640 - WIN.x - WIN.w, WIN.h);
    ctx.fillStyle = '#6b5b4b';
    ctx.fillRect(0, FLOOR, 640, 64);
    ctx.strokeStyle = '#e8e4d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.fillStyle = '#e8e4d4';
    ctx.fillRect(WIN.x + WIN.w / 2 - 1, WIN.y, 3, WIN.h);
    ctx.fillStyle = '#3d2f26';
    ctx.fillRect(60, 262, 100, 6);
    ctx.fillRect(66, 268, 6, 28);
    ctx.fillRect(148, 268, 6, 28);
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(95, 240, 28, 20);
    ctx.fillStyle = '#4fa3d9';
    ctx.fillRect(98, 243, 22, 14);
  }

  if (art.doc) {
    ctx.drawImage(art.doc, Math.round(DOC_X - art.doc.width / 2), FLOOR - art.doc.height);
  } else {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(DOC_X - 6, FLOOR - 26, 12, 26);
    ctx.fillStyle = '#e8b894';
    ctx.fillRect(DOC_X - 4, FLOOR - 34, 8, 8);
  }
}

function drawPlayer() {
  const p = player;
  const img = p.form === 'small' ? art.player_small : art.player_super;
  const x = Math.round(p.x);
  const y = Math.round(p.y);

  if (img) {
    ctx.save();

    if (p.superFly) {
      ctx.translate(x, y - img.height / 2);
      ctx.rotate(p.facing > 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    } else {
      ctx.translate(x, y);
      if (p.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -Math.round(img.width / 2), -img.height);
    }

    ctx.restore();
  } else if (p.form === 'small') {
    ctx.fillStyle = '#2b2b3a';
    ctx.fillRect(x - 5, y - 14, 4, 14);
    ctx.fillRect(x + 1, y - 14, 4, 14);
    ctx.fillStyle = '#5b6b7a';
    ctx.fillRect(x - 6, y - 26, 12, 14);
    ctx.fillStyle = '#e8b894';
    ctx.fillRect(x - 4, y - 34, 8, 8);
  } else {
    const f = p.facing;
    const flap = Math.sin(p.t * 12) * 3;
    ctx.fillStyle = '#d62839';
    ctx.beginPath();
    ctx.moveTo(x - f * 3, y - 26);
    ctx.lineTo(x - f * 18, y - 10 + flap);
    ctx.lineTo(x - f * 3, y - 6);
    ctx.fill();
    ctx.fillStyle = '#1f4fd6';
    ctx.fillRect(x - 6, y - 16, 5, 16);
    ctx.fillRect(x + 1, y - 16, 5, 16);
    ctx.fillStyle = '#1f6fe0';
    ctx.fillRect(x - 7, y - 30, 14, 16);
    ctx.fillStyle = '#e8b894';
    ctx.fillRect(x - 4, y - 38, 8, 8);
  }

  if (p.beam) {
    const ox = p.x;
    const oy = p.y + EYE_Y;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(p.bx, p.by);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(p.bx, p.by);
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    const r = 3 + Math.random() * 2;
    ctx.fillRect(Math.round(p.bx - r), Math.round(p.by - r), r * 2, r * 2);
  }
}


function drawDebris() {
  for (const d of debris) {
    ctx.globalAlpha = Math.max(0, d.life / 0.9);
    ctx.fillStyle = d.color;
    ctx.fillRect(Math.round(d.x), Math.round(d.y), d.s, d.s);
  }
  ctx.globalAlpha = 1;
}
