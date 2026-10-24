const art = {};

const artNames = [
  'player_small', 'player_super', 'meteor', 'office_bg', 'doc',
  'building_1', 'building_2', 'building_3', 'building_4', 'building_5', 'building_6',
  'car_1', 'car_2', 'car_3', 'car_4',
  'alien', 'mothership', 'ufo', 'military', 'heli',
];

function loadArt() {
  return Promise.all(artNames.map(name => new Promise(done => {
    const img = new Image();
    img.onload = () => { art[name] = img; done(); };
    img.onerror = () => { art[name] = null; done(); };
    img.src = 'art/' + name + '.png';
  })));
}

function pickArt(prefix, count) {
  const found = [];
  for (let i = 1; i <= count; i++) {
    if (art[prefix + i]) found.push(art[prefix + i]);
  }
  if (!found.length) return null;
  return found[Math.floor(Math.random() * found.length)];
}
