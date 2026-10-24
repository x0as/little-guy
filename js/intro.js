const DOC_NAME = 'DOC';
const WINDOW_CENTER = { x: 470, y: 125 };

const officeMeteor = { x: 390, y: 70, s: 1, r: 8 };
let cityMeteor = null;

async function runIntro() {
  scene = 'office';
  player.x = 190;
  player.y = FLOOR;
  await wait(800);

  // meteor slides into the window and gets huge
  const grow = tween(officeMeteor, { x: 470, y: 135, s: 4 }, 3000, 'inQuad');
  await wait(2000);
  shake(3, 1000);
  await grow;
  shake(7, 500);

  await say('', "IM JUST A LITTLE GUY!!! WHAT CAN I DO?!");
  await say(DOC_NAME, '...Are you?');

  // costume change
  await tween(flash, { a: 1 }, 250);
  player.form = 'super';
  shake(5, 300);
  await tween(flash, { a: 0 }, 500);
  await say('', '...Huh. Not so little anymore.');

  // out through the window
  await tween(player, { x: WINDOW_CENTER.x, y: WINDOW_CENTER.y + 20 }, 500, 'inExpo');
  burst(WINDOW_CENTER.x, WINDOW_CENTER.y, '#bfe3ff', 40, 220, 160);
  await tween(flash, { a: 1 }, 100);
  toCity();
  await tween(flash, { a: 0 }, 400);

  await meteorBit();
  enterFree();
}

function toCity() {
  scene = 'city';
  player.x = WINDOW_CENTER.x;
  player.y = WINDOW_CENTER.y;
  player.facing = 1;
  snapCamera();
  cam.follow = true;
  cityMeteor = { x: 760, y: -240, s: 1, r: 36 };
}

async function meteorBit() {
  const target = { x: 700, y: -20 };
  const fall = tween(cityMeteor, target, 2200, 'outSine');
  await wait(800);
  const fly = tween(player, { x: target.x - 48, y: target.y + 22 }, 1400, 'inOutQuad');
  await Promise.all([fall, fly]);

  // grab it, wind up
  shake(6, 300);
  await Promise.all([
    tween(player, { x: player.x - 70, y: player.y + 10 }, 350),
    tween(cityMeteor, { x: cityMeteor.x - 70, y: cityMeteor.y + 10 }, 350),
  ]);

  // throw it as far as possible
  await tween(cityMeteor, { x: 2600, y: -900, s: 0.1 }, 1400, 'inQuad');
  cityMeteor = null;
  shake(8, 600);
  await tween(flash, { a: 0.8 }, 80);
  await tween(flash, { a: 0 }, 800);
  await say('', '...I could get used to this.');
}

function enterFree() {
  scene = 'city';
  player.form = 'super';
  cam.follow = true;
  player.control = true;
}

function skipIntro() {
  scene = 'city';
  player.form = 'super';
  player.x = 300;
  player.y = 200;
  snapCamera();
  cam.follow = true;
  player.control = true;
}
