// Loads whatever PNGs exist in art/. Missing ones just stay undefined and the
// game draws a placeholder instead, so you can add art a piece at a time.

const art = {};

const artNames = [
  'player_small', 'player_super', 'meteor', 'office_bg', 'doc',
  'building_1', 'building_2', 'building_3', 'building_4', 'building_5', 'building_6',
  'car_1', 'car_2', 'car_3', 'car_4',
];

function loadArt() {
  return Promise.all(artNames.map(name => new Promise(done => {
    const img = new Image();
    img.onload = () => { art[name] = img; done(); };
    img.onerror = () => done();
    img.src = 'art/' + name + '.png';
  })));
}

// random one of prefix1..prefixN that actually exists, or null
function pickArt(prefix, count) {
  const found = [];
  for (let i = 1; i <= count; i++) {
    if (art[prefix + i]) found.push(art[prefix + i]);
  }
  if (!found.length) return null;
  return found[Math.floor(Math.random() * found.length)];
}
