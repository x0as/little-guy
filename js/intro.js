const DOC_NAME = 'Dr. Daniel';
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

  await say('', 'Meteors are falling! The whole city is in danger!');
  await say('', "I'm just a little guy. I can't fight an alien invasion!");
  await say(DOC_NAME, 'I made that suit for you, Huzaifa. Now you need to trust yourself.');

  await tween(flash, { a: 1 }, 250);
  player.form = 'super';
  shake(5, 300);
  await tween(flash, { a: 0 }, 500);

  await say('', 'I can fly! Okay, I can work with this.');
  await say(DOC_NAME, 'I built five powers into that suit. Press 1 for laser, 2 for the healing ray, 3 for backup, 4 for shield, or 5 for EMP.');
  await say(DOC_NAME, 'Click or press Space to use a power. The healing ray repairs buildings, backup calls allies, the shield blocks damage, and EMP knocks nearby UFOs down.');

  cam.follow = true;
  await tween(player, { y: 180 }, 700, 'inExpo');

  cityMeteor = { x: player.x + 420, y: -240, s: 3, r: 36 };
  await meteorBit();
  enterFree();

  await wait(400);
  await say(DOC_NAME, 'The mothership is to the right. Fly toward it and protect the city.');
  await say(DOC_NAME, 'Its scouts are closing in. Use your powers and keep those buildings standing.');

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
  playSound('rocketBoom');
  await tween(flash, { a: 0.8 }, 80);
  await tween(flash, { a: 0 }, 800);
  await say('', 'I actually stopped a meteor. Maybe I can do this.');
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
