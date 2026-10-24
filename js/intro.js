const DOC_NAME = 'Dr. Whozaifa';
const streetDoc = { x: 300, y: FLOOR };
let cityMeteor = null;

async function runIntro() {
  scene = 'city';
  player.x = 190;
  player.y = FLOOR;
  player.facing = 1;
  player.control = false;
  streetDoc.x = 300;
  cam.follow = false;
  snapCamera();

  await wait(500);
  await tween(streetDoc, { x: player.x + 42 }, 1200, 'inOutQuad');

  await say('', "There's an alien invasion! And meteors are falling!");
  await say('', "I'm just a little guy! What can I do?!");
  await say(DOC_NAME, '...Are you?');

  await tween(flash, { a: 1 }, 250);
  player.form = 'super';
  shake(5, 300);
  await tween(flash, { a: 0 }, 500);

  await say('', '...Huh. Not so little anymore.');

  cam.follow = true;
  await tween(player, { y: 180 }, 700, 'inExpo');

  cityMeteor = { x: player.x + 420, y: -240, s: 3, r: 36 };
  await meteorBit();
  enterFree();

  // Doc gives directions while player is now in control
  await wait(400);
  await say(DOC_NAME, 'The mothership is to the RIGHT — fly toward it!');
  await say(DOC_NAME, 'Its scouts are already swarming the city. Go, go, GO!');

  // Doc walks off screen to the left
  await tween(streetDoc, { x: -80 }, 1400, 'inOutQuad');
}

async function meteorBit() {
  const target = { x: player.x + 260, y: -20 };
  const fall = tween(cityMeteor, target, 2200, 'outSine');
  await wait(800);

  const fly = tween(player, { x: target.x - 48, y: target.y + 22 }, 1400, 'inOutQuad');
  await Promise.all([fall, fly]);

  shake(6, 300);
  await Promise.all([
    tween(player, { x: player.x - 70, y: player.y + 10 }, 350),
    tween(cityMeteor, { x: cityMeteor.x - 70, y: cityMeteor.y + 10 }, 350),
  ]);

  await tween(cityMeteor, {
    x: cityMeteor.x + 500,
    y: cityMeteor.y - 700,
    s: 0.1,
  }, 1400, 'inQuad');

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
  startNextWave();
}

function skipIntro() {
  scene = 'city';
  player.form = 'super';
  player.x = 300;
  player.y = 200;
  player.control = true;
  snapCamera();
  cam.follow = true;
  startNextWave();
}
