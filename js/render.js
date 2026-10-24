const WIN = { x: 360, y: 50, w: 220, h: 150 };
const FLOOR = 296;
const DOC_X = 300;
const TRAIL = { x: 0.35 / Math.hypot(0.35, 1), y: -1 / Math.hypot(0.35, 1) };
const PLAY_BTN = { x: 250, y: 220, w: 140, h: 36 };

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

  if (scene === 'office') drawOffice();
  else drawCity();

  drawEnemies();
  drawEnemyProjectiles();
  drawSmoke();
  drawAllies();
  drawAllyProjectiles();
  drawRockets();
  drawHelicopters();
  drawPlayer();
  drawDebris();
  if (mothership) drawMothership();
  ctx.restore();

  drawHealthUI();
  drawDialogue();
  drawToast();

  if (flash.a > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + flash.a + ')';
    ctx.fillRect(0, 0, 640, 360);
  }
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.kind === 'ufo') {
      drawEnemySprite(e, art.ufo, '#63a8cf', '#67f4ff');
    } else {
      const small = { ...e, w: e.w * 0.8, h: e.h * 0.8 };
      drawEnemySprite(small, art.alien, '#8ac75a', '#b8ff62');
    }
  }
}

function drawMothership() {
  const img = art.mothership;
  if (img) {
    ctx.drawImage(img, Math.round(mothership.x - mothership.w / 2), Math.round(mothership.y), mothership.w, mothership.h);
  } else {
    ctx.save();
    const cx = mothership.x - mothership.w * 0.1;
    const cy = mothership.y + mothership.h * 0.35;
    ctx.fillStyle = '#1e0a30';
    ctx.beginPath();
    ctx.ellipse(cx, cy, mothership.w * 0.46, mothership.h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a1055';
    ctx.beginPath();
    ctx.ellipse(cx, cy - mothership.h * 0.1, mothership.w * 0.28, mothership.h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    const t = performance.now() / 600;
    const lightColors = ['#ff00ff', '#cc00ff', '#ff44ff', '#aa00ee', '#ff00cc'];
    for (let i = 0; i < 6; i++) {
      const lx = cx - mothership.w * 0.32 + i * mothership.w * 0.13;
      const ly = cy + mothership.h * 0.18;
      const pulse = 0.6 + 0.4 * Math.sin(t + i * 1.1);
      ctx.fillStyle = lightColors[i % lightColors.length];
      ctx.globalAlpha = pulse;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawEnemySprite(e, img, fallback, glow) {
  if (img) {
    ctx.drawImage(img, Math.round(e.x - e.w / 2), Math.round(e.y - e.h / 2), e.w, e.h);
    return;
  }
  ctx.save();
  ctx.fillStyle = fallback;
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + e.h * 0.15, e.w * 0.2, e.h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemyProjectiles() {
  for (const p of enemyProjectiles) {
    ctx.fillStyle = p.kind === 'boss' ? '#ff6b3d' :
      p.kind === 'ufo' ? '#67f4ff' : '#c4ff62';
    const r = p.kind === 'alien' ? 3 : (p.kind === 'boss' ? 7 : 5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAllies() {
  for (const a of allies) {
    const img = art.military;
    const ax = Math.round(a.x);
    const ay = Math.round(a.y);
    if (img) {
      ctx.save();
      ctx.translate(ax, ay);
      if (a.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -Math.round(img.width / 2), -img.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#556b2f';
      ctx.fillRect(ax - 4, ay - 20, 8, 20);
      ctx.fillStyle = '#8b7355';
      ctx.fillRect(ax - 3, ay - 26, 6, 6);
    }

    // Visual role indicators
    if (a.role === 'healer') {
      // Green glow aura
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.15 * Math.sin(performance.now() * 0.005);
      ctx.fillStyle = '#44ff66';
      ctx.beginPath();
      ctx.arc(ax, ay - 13, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Cross symbol
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ax - 1, ay - 28, 2, 6);
      ctx.fillRect(ax - 3, ay - 26, 6, 2);
      ctx.restore();
    } else if (a.role === 'rocketeer') {
      // Red glow only
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(performance.now() * 0.006);
      ctx.fillStyle = '#ff4422';
      ctx.beginPath();
      ctx.arc(ax, ay - 13, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

function drawRockets() {
  for (const r of rockets) {
    // Draw smoke trail
    if (r.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < r.trail.length; i++) {
        const t = i / r.trail.length;
        ctx.globalAlpha = t * 0.35;
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = (1 - t) * 4 + 1;
        ctx.beginPath();
        ctx.moveTo(r.trail[i - 1].x, r.trail[i - 1].y);
        ctx.lineTo(r.trail[i].x, r.trail[i].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Draw rocket body
    ctx.save();
    const angle = Math.atan2(r.vy, r.vx);
    ctx.translate(r.x, r.y);
    ctx.rotate(angle);

    // Rocket body
    ctx.fillStyle = '#884422';
    ctx.fillRect(-8, -2, 16, 4);
    // Nose cone
    ctx.fillStyle = '#cc3311';
    ctx.beginPath();
    ctx.moveTo(8, -3);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, 3);
    ctx.fill();
    // Fins
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-11, -5);
    ctx.lineTo(-6, -2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.lineTo(-11, 5);
    ctx.lineTo(-6, 2);
    ctx.fill();
    // Engine flame
    const flicker = 0.7 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(255, ${Math.floor(120 + Math.random() * 80)}, 0, ${flicker})`;
    ctx.beginPath();
    ctx.moveTo(-8, -1.5);
    ctx.lineTo(-13 - Math.random() * 4, 0);
    ctx.lineTo(-8, 1.5);
    ctx.fill();

    ctx.restore();
  }
}

function drawSmoke() {
  ctx.save();
  for (const s of smokeParticles) {
    const alpha = (s.life / s.maxLife) * 0.6;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHelicopters() {
  for (const h of helicopters) {
    const img = art.heli;
    if (img) {
      ctx.drawImage(img, Math.round(h.x - img.width / 2), Math.round(h.y - img.height / 2));
    } else {
      ctx.fillStyle = '#4a5a3a';
      ctx.fillRect(Math.round(h.x) - 25, Math.round(h.y) - 8, 50, 16);
      ctx.fillStyle = '#6a7a5a';
      ctx.fillRect(Math.round(h.x) - 30, Math.round(h.y) - 3, 60, 6);
    }
    const rot = performance.now() * 0.02;
    ctx.save();
    ctx.translate(h.x, h.y - (art.heli ? art.heli.height / 2 + 2 : 10));
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.lineWidth = 2;
    const rx = Math.cos(rot) * 28;
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.lineTo(rx, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawAllyProjectiles() {
  for (const p of allyProjectiles) {
    ctx.save();
    // Outer glow
    ctx.fillStyle = 'rgba(255, 220, 60, 0.3)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    // Bright core
    ctx.fillStyle = '#ffee55';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // White center
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHealthUI() {
  if (!player.control && !gameOver) return;

  drawBar(10, 18, 130, 9, player.hp / player.maxHp, '#4be36b', 'PLAYER HP');
  drawBar(10, 38, 130, 9, cityHealth / CITY_MAX_HEALTH, '#55b6ff', 'CITY HP');

  if (mothership) {
    const mins = Math.floor(waveTimer / 60);
    const secs = Math.floor(waveTimer % 60);
    const timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(220, 6, 200, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '10px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('WAVE ' + invasionWave + '  \u23F1 ' + timeStr, 320, 15);
    ctx.textAlign = 'left';
  } else if (invasionWave > 0 && !gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(220, 6, 200, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '10px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('WAVE ' + invasionWave + ' \u2014 CLEAR!', 320, 15);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(555, 6, 78, 16);
  ctx.font = '10px ' + FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('\u2605 ' + kills + ' destroyed', 559, 9);

  drawPowerHUD();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 348, 640, 12);
  ctx.font = '9px ' + FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('WASD fly  SHIFT turbo  CLICK fire  1 laser  2 heal  3 backup', 8, 350);

  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, 640, 360);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 34px ' + FONT;
    ctx.fillText('GAME OVER', 320, 145);
    ctx.font = '16px ' + FONT;
    ctx.fillText(player.hp <= 0 ? 'The hero has fallen.' : 'The city has fallen.', 320, 185);

    const hover = mouse.x >= PLAY_BTN.x && mouse.x <= PLAY_BTN.x + PLAY_BTN.w &&
                  mouse.y >= PLAY_BTN.y && mouse.y <= PLAY_BTN.y + PLAY_BTN.h;
    ctx.fillStyle = hover ? '#3a7bd5' : '#1f4fd6';
    ctx.fillRect(PLAY_BTN.x, PLAY_BTN.y, PLAY_BTN.w, PLAY_BTN.h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(PLAY_BTN.x, PLAY_BTN.y, PLAY_BTN.w, PLAY_BTN.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillText('PLAY AGAIN', PLAY_BTN.x + PLAY_BTN.w / 2, PLAY_BTN.y + PLAY_BTN.h / 2);
    ctx.textAlign = 'left';
  }
}

function drawPowerHUD() {
  const powers = [
    { key: '1', name: 'LASER', color: '#ff4444' },
    { key: '2', name: 'HEAL', color: '#44ff66' },
    { key: '3', name: 'BACKUP', color: '#44aaff' },
  ];
  const startX = 10;
  const startY = 328;
  const bw = 52;
  const bh = 14;
  const gap = 4;
  const powerNames = ['laser', 'heal', 'backup'];

  for (let i = 0; i < 3; i++) {
    const pw = powers[i];
    const px = startX + i * (bw + gap);
    const active = player.power === powerNames[i];
    ctx.fillStyle = active ? pw.color : 'rgba(0,0,0,0.5)';
    ctx.globalAlpha = active ? 0.9 : 0.5;
    ctx.fillRect(px, startY, bw, bh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, startY, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = '9px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.fillText(pw.key + ' ' + pw.name, px + 4, startY + bh / 2);
  }

  if (player.power === 'backup' && player.backupCooldown > 0) {
    ctx.fillStyle = '#ffaa00';
    ctx.font = '9px ' + FONT;
    ctx.textBaseline = 'top';
    ctx.fillText('CD: ' + Math.ceil(player.backupCooldown) + 's', startX + 2 * (bw + gap) + bw + 4, startY + 2);
  }
}

function drawToast() {
  if (toastTimer <= 0) return;
  const alpha = Math.min(1, toastTimer);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '12px ' + FONT;
  const tw = ctx.measureText(toastMsg).width + 40;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(320 - tw / 2, 110, tw, 32);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 1;
  ctx.strokeRect(320 - tw / 2, 110, tw, 32);
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(toastMsg, 320, 126);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBar(x, y, w, h, fraction, color, label) {
  const value = Math.max(0, Math.min(1, fraction));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#343440';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * value, h);
  ctx.fillStyle = '#fff';
  ctx.font = '10px ' + FONT;
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 2);
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
  for (const m of fallingMeteors) {
    drawMeteor(m);
    const bw = m.r * 2.5;
    const bh = 3;
    const bx = m.x - bw / 2;
    const by = m.y - m.r * m.s - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ff6633';
    ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.maxHp), bh);
  }

  if (typeof streetDoc !== 'undefined' && scene === 'city') {
    const docImg = art.doc;
    const dx = Math.round(streetDoc.x);
    const dy = Math.round(streetDoc.y);
    if (docImg) {
      ctx.drawImage(docImg, dx - Math.round(docImg.width / 2), dy - docImg.height);
    } else {
      ctx.fillStyle = '#e8e4d4';
      ctx.fillRect(dx - 5, dy - 24, 10, 24);
      ctx.fillStyle = '#e8b894';
      ctx.fillRect(dx - 4, dy - 32, 8, 8);
    }
  }
}

function drawProp(p) {
  const x = Math.round(p.x + p.shake);

  // Collapsing animation
  if (p.collapsing !== undefined) {
    const t = Math.min(1, p.collapsing / 0.65);
    ctx.save();
    // Anchor at bottom of building
    ctx.translate(x, p.y);
    // Squish vertically and widen horizontally
    const scaleY = 1 - t * 0.85;
    const scaleX = 1 + t * 0.4;
    // Slight tilt as it collapses
    const tilt = Math.sin(t * 3) * 0.08 * (1 - t);
    ctx.rotate(tilt);
    ctx.scale(scaleX, scaleY);
    ctx.globalAlpha = 1 - t * 0.5;

    if (p.img) {
      ctx.drawImage(p.img, -p.w / 2, -p.h);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
    }
    ctx.restore();

    // Dust cloud at base
    ctx.save();
    ctx.globalAlpha = 0.4 + t * 0.3;
    ctx.fillStyle = '#a09880';
    const dustW = p.w * (0.5 + t * 1.2);
    const dustH = 8 + t * 20;
    ctx.beginPath();
    ctx.ellipse(x, p.y, dustW / 2, dustH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Secondary lighter dust
    ctx.globalAlpha = 0.2 + t * 0.2;
    ctx.fillStyle = '#c8c0a8';
    ctx.beginPath();
    ctx.ellipse(x, p.y - dustH * 0.3, dustW * 0.7, dustH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  if (p.img) {
    ctx.drawImage(p.img, Math.round(x - p.w / 2), Math.round(p.y - p.h));
    if (p.healFlash > 0) {
      ctx.fillStyle = 'rgba(100, 255, 100, 0.35)';
      ctx.fillRect(Math.round(x - p.w / 2), Math.round(p.y - p.h), p.w, p.h);
    }
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
  if (p.healFlash > 0) {
    ctx.fillStyle = 'rgba(100, 255, 100, 0.35)';
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
  ctx.fillStyle = '#7fa6d9';
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  if (typeof officeMeteor !== 'undefined' && officeMeteor) drawMeteor(officeMeteor);

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
    const bx = p.bx;
    const by = p.by;
    const t = performance.now();
    const pulse = 0.7 + 0.3 * Math.sin(t * 0.04);
    const isHeal = p.power === 'heal';

    ctx.save();
    ctx.lineCap = 'round';

    if (isHeal) {
      ctx.strokeStyle = 'rgba(40, 255, 80, 0.18)';
      ctx.lineWidth = 14 * pulse;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      ctx.strokeStyle = 'rgba(80, 255, 100, 0.45)';
      ctx.lineWidth = 6 * pulse;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      ctx.strokeStyle = '#44ff66';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      ctx.strokeStyle = 'rgba(230, 255, 230, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      const ir = 4 + Math.random() * 4;
      ctx.fillStyle = '#a0ffa0';
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(Math.round(bx), Math.round(by), ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 4; s++) {
        const ang = t * 0.005 + s * Math.PI / 2;
        const sr = ir + 2 + Math.random() * 5;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(ang) * ir, by + Math.sin(ang) * ir);
        ctx.lineTo(bx + Math.cos(ang) * sr, by + Math.sin(ang) * sr);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255, 40, 40, 0.18)';
      ctx.lineWidth = 14 * pulse;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 80, 80, 0.45)';
      ctx.lineWidth = 6 * pulse;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      ctx.strokeStyle = 'rgba(255,230,230,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();

      const ir = 4 + Math.random() * 4;
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(Math.round(bx), Math.round(by), ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 4; s++) {
        const ang = t * 0.005 + s * Math.PI / 2;
        const sr = ir + 2 + Math.random() * 5;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(ang) * ir, by + Math.sin(ang) * ir);
        ctx.lineTo(bx + Math.cos(ang) * sr, by + Math.sin(ang) * sr);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    ctx.restore();
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
