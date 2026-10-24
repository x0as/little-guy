const FONT = '"PixelFont", monospace';

const dlg = { active: false, who: '', lines: [], shown: 0, total: 0, typing: false, resolve: null };

function say(who, text) {
  return new Promise(resolve => {
    ctx.font = '12px ' + FONT;
    dlg.who = who;
    dlg.lines = wrapText(text, 570);
    dlg.total = dlg.lines.join('').length;
    dlg.shown = 0;
    dlg.typing = true;
    dlg.active = true;
    dlg.resolve = resolve;
  });
}

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  lines.push(line);
  return lines;
}

function dialogueInput() {
  if (!dlg.active) return;
  if (dlg.typing) {
    dlg.shown = dlg.total;
    dlg.typing = false;
  } else {
    dlg.active = false;
    dlg.resolve();
  }
}

function updateDialogue(dt) {
  if (!dlg.active || !dlg.typing) return;
  dlg.shown += dt * 33;
  if (dlg.shown >= dlg.total) {
    dlg.shown = dlg.total;
    dlg.typing = false;
  }
}

function drawDialogue() {
  if (!dlg.active) return;
  ctx.fillStyle = '#14121f';
  ctx.fillRect(20, 262, 600, 84);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(21, 263, 598, 82);

  ctx.textBaseline = 'top';
  if (dlg.who) {
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(dlg.who, 32, 270);
  }
  ctx.font = '12px ' + FONT;
  ctx.fillStyle = '#fff';
  let left = Math.floor(dlg.shown);
  let y = 288;
  for (const line of dlg.lines) {
    ctx.fillText(line.slice(0, Math.max(0, left)), 32, y);
    left -= line.length;
    y += 15;
  }
}
