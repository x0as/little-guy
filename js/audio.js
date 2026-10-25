const soundFiles = {
  speaking: 'art/speaking.mp3',
  sonicBoom: 'art/sonicboom.MP3',
  wave: 'art/wave%20start%20mothership.MP3',
  laser: 'art/laser.MP3',
  rocketTakeoff: 'art/rocket%20takeoff%20main.MP3',
  rocketBoom: 'art/rocket%20boom%20main.MP3',
  helicopter: 'art/helicopter.mp3',
};

const sounds = {};
const soundLoops = {};
let gameMuted = false;
for (const [name, path] of Object.entries(soundFiles)) {
  sounds[name] = new Audio(path);
  sounds[name].preload = 'auto';
}

function unlockGameAudio() {
  for (const sound of Object.values(sounds)) {
    const primer = sound.cloneNode();
    primer.muted = true;
    const started = primer.play();
    if (started) started.then(() => {
      primer.pause();
      primer.currentTime = 0;
    }).catch(() => {});
  }
}

function playSound(name) {
  const sound = sounds[name];
  if (!sound) return null;
  sound.loop = false;
  sound.currentTime = 0;
  sound.play().catch(() => {});
  return sound;
}

function setLoopSound(name, active) {
  const sound = sounds[name];
  if (!sound) return;
  if (active && !soundLoops[name]) {
    soundLoops[name] = true;
    sound.loop = true;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  } else if (!active && soundLoops[name]) {
    soundLoops[name] = false;
    sound.pause();
    sound.currentTime = 0;
  }
}

function stopSound(sound) {
  if (!sound) return;
  sound.pause();
  sound.currentTime = 0;
}

function toggleGameMute() {
  gameMuted = !gameMuted;
  for (const sound of Object.values(sounds)) sound.muted = gameMuted;
  return gameMuted;
}

function isGameMuted() {
  return gameMuted;
}
