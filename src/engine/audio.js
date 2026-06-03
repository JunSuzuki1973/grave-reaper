// Web Audio API synthesized sound effects + HTML5 BGM

let ctx = null;

// ─── BGM (HTML5 Audio) ──────────────────────────────────────────────────────
let bgmEl = null;
let bgmStarted = false;
let bgmSrc = '';

export function initBGM(src = 'Clockwork_Catacomb.mp3') {
  if (bgmEl) return;
  bgmEl = new Audio(src);
  bgmEl.loop = true;
  bgmEl.volume = 0.45;
  bgmEl.preload = 'auto';
  bgmSrc = src;
}

/**
 * BGMトラックを差し替える（ボス戦などで曲を変える）。
 * 同じ曲なら何もしない。既に再生中なら新しい曲を即時再生。
 */
export function setBGMTrack(src, volume = 0.45) {
  if (!bgmEl) initBGM(src);
  if (src === bgmSrc) { bgmEl.volume = volume; return; }
  bgmSrc = src;
  bgmEl.src = src;
  bgmEl.volume = volume;
  bgmEl.currentTime = 0;
  if (bgmStarted) bgmEl.play().catch(() => {});
}

/** Call once after the first user interaction (needed for autoplay policy). */
export function startBGM() {
  if (!bgmEl || bgmStarted) return;
  bgmStarted = true;
  bgmEl.play().catch(() => {
    // Autoplay still blocked; retry on next interaction
    bgmStarted = false;
  });
}

export function stopBGM() {
  if (!bgmEl) return;
  bgmEl.pause();
  bgmEl.currentTime = 0;
  bgmStarted = false;
}

export function setBGMVolume(v) {
  if (bgmEl) bgmEl.volume = Math.max(0, Math.min(1, v));
}

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }
  return ctx;
}

function resumeCtx() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume();
  return c;
}

// Attack: short noise burst
export function playAttack() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.1);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.12);
}

// Hit: low pulse when player takes damage
export function playHit() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.start(t);
  osc.stop(t + 0.25);
}

// Gem pickup: high chime
export function playGem() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.start(t);
  osc.stop(t + 0.15);
}

// Level up: rising arpeggio
export function playLevelUp() {
  const c = resumeCtx();
  if (!c) return;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const t = c.currentTime + i * 0.08;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

// Boss spawn: heavy low drum
export function playBossSpawn() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;

  // Sub bass
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.start(t);
  osc.stop(t + 0.6);

  // Noise layer
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = c.createGain();
  noise.connect(noiseGain);
  noiseGain.connect(c.destination);
  noiseGain.gain.setValueAtTime(0.2, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  noise.start(t);
}

// Potion pickup
export function playPotion() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.1);
  osc.frequency.exponentialRampToValueAtTime(440, t + 0.2);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.start(t);
  osc.stop(t + 0.25);
}

// Enemy death
export function playEnemyDeath() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t);
  osc.stop(t + 0.18);
}

// 弱体化魔法ヒット：不気味な下降音
export function playCurse() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.7);
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  osc.start(t);
  osc.stop(t + 0.8);
  // 重なる低い唸り
  const osc2 = c.createOscillator();
  const g2 = c.createGain();
  osc2.connect(g2);
  g2.connect(c.destination);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(110, t);
  osc2.frequency.exponentialRampToValueAtTime(45, t + 0.7);
  g2.gain.setValueAtTime(0.25, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  osc2.start(t);
  osc2.stop(t + 0.8);
}

// Jump sound
export function playJump() {
  const c = resumeCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.12);
}
