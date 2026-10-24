// Loads whatever PNGs exist in art/. Missing ones just stay undefined and the
// game draws a placeholder instead, so you can add art a piece at a time.

const art = {};

const artNames = [
  'player_small', 'player_super', 'meteor', 'office_bg', 'doc',
  'building_1', 'building_2', 'building_3', 'building_4', 'building_5', 'building_6',
  'car_1', 'car_2', 'car_3',
];

function loadArt() {
  return Promise.all(artNames.map(name => new Promise(done => {
    const img = new Image();
    img.onload = () => { art[name] = img; done(); };
    img.onerror = () => done();
    img.src = 'art/' + name + '.png';
  })));
}

// For cars, also try to load explosion frames: car_1dmg.png, car_2dmg.png, car_3dmg.png
// If car_1dmg.png is wide (sprite sheet), slice it into 64x64 frames when rendering.
function loadCarFrames(prefix, count) {
  const frames = [];
  const dmgPrefix = prefix + 'dmg';
  const base = art[prefix];
  if (!base) return frames;
  frames.push(base);
  // If base is a wide sprite sheet (width > height), slice it into 64x64 frames
  if (base.width > base.height) {
    const frameW = 64;
    const sheetW = base.width;
    const frameCount = Math.floor(sheetW / frameW);
    for (let i = 1; i <= frameCount && i <= 4; i++) {
      const key = prefix + '_' + i;
      if (art[key]) frames.push(art[key]);
      else break;
    }
    // Trim to max 4 frames
    if (frames.length > 4) frames.length = 4;
    return frames;
  }
  // Load the dmg variant for destruction animation
  const dmg = art[dmgPrefix];
  if (dmg) {
    // If dmg is a wide sprite sheet, slice it into 64x64 frames
    if (dmg.width > dmg.height) {
      const frameW = 64;
      const sheetW = dmg.width;
      const frameCount = Math.floor(sheetW / frameW);
      for (let i = 0; i < frameCount; i++) {
        frames.push(art[dmgPrefix]);
      }
      if (frames.length > 4) frames.length = 4;
    } else {
      frames.push(dmg);
    }
  }
  return frames;
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
