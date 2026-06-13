// Main entry point: game state machine and world management

import { initInput, clearFrame, isConfirm, isJustPressed } from './engine/input.js';
import { startLoop } from './engine/loop.js';
import { loadSprites, loadBackgrounds, getBackground, drawSprite } from './engine/sprites.js';
import { camera, updateCamera } from './engine/camera.js';
import { initBGM, startBGM, setBGMTrack } from './engine/audio.js';

import { Player } from './entities/player.js';
import { Spawner } from './systems/spawner.js';
import { CombatSystem } from './systems/combat.js';
import { LevelingSystem } from './systems/leveling.js';
import { createGemDrops, Potion } from './entities/pickup.js';

import { getDifficulty, DIFFICULTIES } from './data/difficulty.js';
import { getStage, NUM_STAGES, stageForTime, BOSS_SPAWN_TIME } from './data/stages.js';

import { TitleScreen } from './ui/title.js';
import { LevelUpUI } from './ui/levelup.js';
import { GameOverScreen } from './ui/gameover.js';
import { drawHUD } from './ui/hud.js';
import { LeaderboardScreen } from './ui/Leaderboard.js';
import { saveScore, isArcadeMode, isBase44Available, getCurrentUserName, signIn, signOut } from './arcade/base44client.js';

// ─── Constants ─────────────────────────────────────────────────────────────
const CANVAS_W = 480;
const CANVAS_H = 270;
const GROUND_Y = 240;

const STAGE_TILE_W = 32;

// Platforms (world coordinates, fixed set that tiles/repeats)
const BASE_PLATFORMS = [
  { x: 200,  y: 190, w: 80  },
  { x: 450,  y: 175, w: 80  },
  { x: 700,  y: 190, w: 96  },
  { x: 950,  y: 165, w: 80  },
  { x: 1200, y: 185, w: 80  },
  { x: 1500, y: 170, w: 96  },
  { x: 1800, y: 190, w: 80  },
  { x: 2100, y: 175, w: 80  },
  { x: 2400, y: 185, w: 96  },
];

// Decorations. All world-locked (parallax 1.0) so they sit ON the ground and
// scroll with the world — preventing the "floating in the sky" look.
// Sizes preserve each sprite's real aspect ratio; bottom edge rests on GROUND_Y.
const DECO_PERIOD = 2400;
const BASE_DECOS = [
  // trees (h/w ≈ 1.7)
  { key: 'deco_tree0',       w: 34, h: 58 },
  { key: 'deco_tree1',       w: 36, h: 60 },
  { key: 'deco_tree0',       w: 30, h: 51 },
  { key: 'deco_tree1',       w: 38, h: 63 },
  // gravestones (h/w ≈ 1.2–1.4)
  { key: 'deco_gravestone0', w: 18, h: 22 },
  { key: 'deco_gravestone1', w: 18, h: 21 },
  { key: 'deco_gravestone2', w: 18, h: 26 },
  { key: 'deco_gravestone0', w: 18, h: 22 },
  { key: 'deco_gravestone1', w: 18, h: 21 },
].map((d, i) => ({
  ...d,
  ox: 90 + i * 270 + (i % 3) * 40,   // spread across the world period
  oy: GROUND_Y - d.h,                // plant bottom on the ground
}));

// State enum
const STATE = {
  LOADING: 'LOADING',
  TITLE:   'TITLE',
  PLAYING: 'PLAYING',
  LEVELUP: 'LEVELUP',
  GAMEOVER:'GAMEOVER',
};

// ─── Setup ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Crisp UI overlay canvas (high-res text). Shares the 480×270 logical
// coordinate space via a scaled transform, but its backing store is the
// full displayed pixel size — so text is rendered sharp, not upscaled.
const uiCanvas = document.getElementById('ui-canvas');
const uiCtx = uiCanvas.getContext('2d');
let uiScale = 3;

// キャンバスのスケーリング。
// ・通常ウィンドウ時：ピクセルパーフェクトな整数倍（最大8×）。
// ・全画面時：アスペクト比(16:9)を保ったままモニターいっぱいにフィット（非整数倍も許可）。
//   → 480×270 は厳密に 16:9 なので 16:9 モニターでは黒帯なしで全面に拡大される。
function resizeCanvas() {
  const W = CANVAS_W, H = CANVAS_H;
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);

  let scale;
  if (isFs) {
    // モニターにフィット（短い方の辺に合わせ、16:9を維持）
    scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  } else {
    const scaleX = Math.floor(window.innerWidth  / W);
    const scaleY = Math.floor(window.innerHeight / H);
    scale = Math.max(2, Math.min(scaleX, scaleY, 8));
  }
  uiScale = scale;

  const dispW = Math.round(W * scale);
  const dispH = Math.round(H * scale);

  // World canvas: nearest-neighbour upscale via CSS.
  canvas.style.width  = dispW + 'px';
  canvas.style.height = dispH + 'px';

  // UI canvas: backing store at display resolution (× devicePixelRatio for HiDPI).
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  uiCanvas.width  = Math.round(dispW * dpr);
  uiCanvas.height = Math.round(dispH * dpr);
  uiCanvas.style.width  = dispW + 'px';
  uiCanvas.style.height = dispH + 'px';
  // Map logical 480×270 → device pixels so layout code stays in game units.
  uiCtx.setTransform((dispW * dpr) / W, 0, 0, (dispH * dpr) / H, 0, 0);
  uiCtx.textBaseline = 'alphabetic';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─── 全画面表示 ──────────────────────────────────────────────────────────────
// ページ全体を全画面化（body は黒背景・中央寄せなのでキャンバスは中央に残る）。
function toggleFullscreen() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (!fsEl) {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) req.call(el).catch(() => {});
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document).catch(() => {});
  }
}
// 全画面の出入りでビューポートサイズが変わる → 整数スケールを再計算。
document.addEventListener('fullscreenchange', resizeCanvas);
document.addEventListener('webkitfullscreenchange', resizeCanvas);
// F キーでトグル（ゲーム状態に関係なく常時。requestFullscreen はユーザー操作内で呼ぶ）。
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') { e.preventDefault(); toggleFullscreen(); }
});
const fsBtn = document.getElementById('fs-btn');
if (fsBtn) fsBtn.addEventListener('click', () => { toggleFullscreen(); fsBtn.blur(); });

// ─── ゲーセン化：Base44 ログイン / オンラインランキング ───────────────────────
// バニラ版（未ログイン or SDK未読込）は既存の動作を100%維持。
const leaderboardScreen = new LeaderboardScreen();
let showLeaderboard = false;

const arcadeBar  = document.getElementById('arcade-bar');
const arcadeUser = document.getElementById('arcade-user');
const loginBtn   = document.getElementById('arcade-login');
const rankBtn    = document.getElementById('rank-btn');
const logoutBtn  = document.getElementById('logout-btn');

// タイトル画面でのみ操作バーを表示し、ログイン状態でボタンを出し分け
function refreshArcadeBar() {
  if (!arcadeBar) return;
  const onTitle = state === STATE.TITLE && !showLeaderboard;
  arcadeBar.hidden = !onTitle;
  if (!onTitle) return;
  const avail = isBase44Available();
  const logged = isArcadeMode();
  if (loginBtn)  loginBtn.hidden  = !avail || logged;   // SDK未読込ならログインも出さない
  if (rankBtn)   rankBtn.hidden   = !logged;
  if (logoutBtn) logoutBtn.hidden = !logged;
  if (arcadeUser) arcadeUser.textContent = logged ? `${getCurrentUserName()} さん` : '';
}

if (loginBtn) loginBtn.addEventListener('click', async () => {
  loginBtn.blur();
  await signIn();
  refreshArcadeBar();
});
if (logoutBtn) logoutBtn.addEventListener('click', async () => {
  logoutBtn.blur();
  await signOut();
  refreshArcadeBar();
});
if (rankBtn) rankBtn.addEventListener('click', async () => {
  rankBtn.blur();
  showLeaderboard = true;
  refreshArcadeBar();
  await leaderboardScreen.load();
});
// SDK 読込完了でボタン状態を更新
window.addEventListener('base44ready', refreshArcadeBar);

// v16 にはスコア概念が無いため戦績から合成（撃破/ジェム/時間/レベル/勝利）
function computeArcadeScore(win) {
  return Math.floor(
    gameStats.killCount * 100 +
    gameStats.totalGems * 10 +
    Math.floor(gameStats.elapsedTime) * 5 +
    player.level * 500 +
    (win ? 50000 : 0)
  );
}
// ゲームオーバー/クリア時にスコア送信（未ログインなら no-op）
function submitArcadeScore(win) {
  if (!isArcadeMode()) return;
  saveScore({
    score: computeArcadeScore(win),
    stage: currentStage,
    difficulty: (difficulty && difficulty.name) ? difficulty.name : 'normal',
    play_time: Math.floor(gameStats.elapsedTime),
  });
}

function clearUI() {
  uiCtx.save();
  uiCtx.setTransform(1, 0, 0, 1, 0, 0);
  uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  uiCtx.restore();
}

initInput();
initBGM('Clockwork_Catacomb.mp3');

let state = STATE.LOADING;

// Game objects
let player;
let enemies;
let bosses;
let pickups;
let spawner;
let combat;
let leveling;
let titleScreen;
let levelUpUI;
let gameOverScreen;

let gameStats = {
  elapsedTime: 0,
  killCount: 0,
  totalGems: 0,
};

// ステージ / 難易度の状態
let currentStage = 1;            // 1..NUM_STAGES（背景描画が参照）
let difficulty = getDifficulty('beginner');
let stageBanner = { text: '', timer: 0 };   // ステージ突入時の表示
let victory = false;
let bossWarned = false;          // ボス出現警告を出したか
let stageStartTime = 0;          // 現ステージ開始時の累積時間

// ─── Background drawing ────────────────────────────────────────────────────
// Each stage uses a single wide scroll image. It is mirror-tiled so the left
// and right edges always match — no seams, no compositing contradictions.
const BG_PARALLAX = 0.45;

function drawBackground(ctx, camX) {
  const img = getBackground(currentStage);

  if (!img || !img.complete || img.naturalWidth === 0) {
    // フォールバック（読込前）
    ctx.fillStyle = '#0a0816';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    return;
  }

  const scale = CANVAS_H / img.naturalHeight;
  const tileW = img.naturalWidth * scale;       // 1枚分の表示幅
  const period = tileW * 2;                      // ミラー1往復が周期

  // スクロールオフセット（パララックス）。周期内に正規化。
  let scroll = (camX * BG_PARALLAX) % period;
  if (scroll < 0) scroll += period;

  // 画面を覆うのに必要なミラータイルを左から並べる
  let startIndex = Math.floor((scroll) / tileW) - 1;
  for (let i = startIndex; ; i++) {
    const screenX = i * tileW - scroll;
    if (screenX > CANVAS_W) break;
    const mirrored = ((i % 2) + 2) % 2 === 1;    // 奇数タイルは左右反転
    ctx.save();
    if (mirrored) {
      ctx.translate(screenX + tileW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, tileW, CANVAS_H);
    } else {
      ctx.drawImage(img, screenX, 0, tileW, CANVAS_H);
    }
    ctx.restore();
  }
}

// Procedural stars
const STARS = [];
for (let i = 0; i < 80; i++) {
  STARS.push({
    x: Math.random() * 2400,
    y: Math.random() * 140,
    size: Math.random() > 0.8 ? 1.5 : 1,
    bright: Math.random(),
  });
}

function drawStars(ctx, camX) {
  for (const star of STARS) {
    const sx = (star.x - camX * 0.03) % (CANVAS_W + 100);
    const displayX = sx < -50 ? sx + CANVAS_W + 100 : sx;
    const alpha = 0.4 + star.bright * 0.6;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(displayX, star.y, star.size, star.size);
  }
}

// Draw platforms
function drawPlatforms(ctx, camX) {
  for (const plat of getPlatforms()) {
    const sx = plat.x - camX;
    if (sx + plat.w < -10 || sx > CANVAS_W + 10) continue;
    drawSprite(ctx, 'tile_ground', sx, plat.y, plat.w, 10);
    // Platform edge highlight
    ctx.fillStyle = '#3d2810';
    ctx.fillRect(sx, plat.y, plat.w, 2);
  }
}

// Get all platforms (tiled)
function getPlatforms() {
  const allPlats = [];
  const camPeriods = Math.ceil(Math.abs(camera.x) / DECO_PERIOD) + 2;
  for (let t = -camPeriods; t <= camPeriods + 1; t++) {
    for (const p of BASE_PLATFORMS) {
      allPlats.push({ x: p.x + t * DECO_PERIOD, y: p.y, w: p.w });
    }
  }
  return allPlats;
}

// ─── Game init ─────────────────────────────────────────────────────────────
function initGame(charId = 'knight', difficultyId = 'beginner') {
  player = new Player(CANVAS_W / 2, GROUND_Y - 36, charId);
  enemies = [];
  bosses = [];
  pickups = { gems: [], potions: [] };
  difficulty = getDifficulty(difficultyId);
  spawner = new Spawner(difficulty);
  combat = new CombatSystem();
  leveling = new LevelingSystem();
  gameStats = { elapsedTime: 0, killCount: 0, totalGems: 0 };
  currentStage = 1;
  victory = false;
  bossWarned = false;
  stageStartTime = 0;
  spawner.resetForNewStage(1);
  setStage(1);
  updateCamera(player.getCenterX(), player.getCenterY());
}

// ステージ突入（背景＋突入バナー＋BGM切替）
function setStage(num) {
  currentStage = num;
  const st = getStage(num);
  if (st.final) {
    // 最終ステージ：ラスボスBGMへ切替。突入と同時にラスボスが降臨するため、
    // 「ラージデーモン接近」予告は出さない。
    setBGMTrack('FinalBoss.mp3', 0.5);
    bossWarned = true;
    stageBanner = { text: `⚠ 最終決戦 — 魔導師マジックキャスター ⚠`, timer: 3.5 };
  } else {
    setBGMTrack('Clockwork_Catacomb.mp3', 0.45);
    stageBanner = { text: `STAGE ${num}  ${st.name}`, timer: 3.0 };
  }
}

// ボス撃破 → 次ステージへ（最終ステージなら全クリア）
function onBossDefeated() {
  if (currentStage >= NUM_STAGES) {
    victory = true;
    gameOverScreen.show({
      time: gameStats.elapsedTime,
      kills: gameStats.killCount,
      level: player.level,
      gems: gameStats.totalGems,
      victory: true,
    });
    submitArcadeScore(true);   // ゲーセン版：オンラインランキングへ送信
    state = STATE.GAMEOVER;
    return;
  }
  // 次のステージへ
  currentStage += 1;
  stageStartTime = gameStats.elapsedTime;
  bossWarned = false;
  spawner.resetForNewStage(currentStage);
  enemies = [];          // 雑魚を一掃して新ステージへ
  bosses = [];
  combat.enemyProjectiles = [];
  setStage(currentStage);
}

// ─── Level-up helper ──────────────────────────────────────────────────────
function showLevelUpScreen() {
  const choices = leveling.prepareChoices(player);
  levelUpUI.show(choices, (idx) => {
    leveling.applyUpgrade(idx, player);
    if (leveling.hasPending()) {
      showLevelUpScreen();
    } else {
      state = STATE.PLAYING;
    }
  });
  state = STATE.LEVELUP;
}

// ─── Update functions ──────────────────────────────────────────────────────
function updateTitle(dt) {
  // ランキング表示中は Esc / 決定で閉じる（タイトル操作はブロック）
  if (showLeaderboard) {
    if (isJustPressed('Escape') || isConfirm()) { showLeaderboard = false; refreshArcadeBar(); }
    return;
  }
  const result = titleScreen.update(dt);
  if (result && result.action === 'start') {
    startBGM();   // Start BGM on first confirmed user interaction
    const charId = result.character ? result.character.id : 'knight';
    const diffId = result.difficulty ? result.difficulty.id : 'beginner';
    initGame(charId, diffId);
    state = STATE.PLAYING;
  }
}

function updatePlaying(dt) {
  gameStats.elapsedTime += dt;

  const platforms = getPlatforms();

  // Update player
  player.update(dt, platforms);

  // Update camera
  updateCamera(player.getCenterX(), player.getCenterY());

  // Update enemies
  const px = player.getCenterX();
  const py = player.getCenterY();
  for (const e of enemies) {
    e.update(dt, px, py, platforms);
  }
  for (const b of bosses) {
    b.update(dt, px, py, platforms);
    // ボスのファイアブレス要求 → 広範囲の地面炎を生成
    if (b.pendingFireBreath) {
      combat.spawnFireField(b.pendingFireBreath);
      b.pendingFireBreath = null;
    }
    // 最終ボスの闇のオーブ連射 → 敵弾を生成
    if (b.pendingVolley) {
      combat.spawnBossVolley(b.pendingVolley);
      b.pendingVolley = null;
    }
    // 最終ボスのラージデーモン召喚 → bosses[] に手下を追加
    if (b.pendingSummon) {
      spawner.spawnSummonedDemon(bosses, b);
      b.pendingSummon = null;
    }
    // 最終ボスの弱体化魔法 → 魔法陣を設置（テレグラフ→発動）
    if (b.pendingHex) {
      combat.spawnHex(b.pendingHex);
      b.pendingHex = null;
    }
  }

  // このステージ開始からの経過時間（ボス出現＝7分）
  const stageElapsed = gameStats.elapsedTime - stageStartTime;

  // Spawner（ボス判定はステージ内経過時間で行う）
  spawner.update(dt, stageElapsed, enemies, bosses, player, gameStats.elapsedTime);

  // Combat (handles projectiles, pickups, damage)
  combat.update(dt, player, enemies, bosses, pickups);

  // 弱体化魔法が命中した → 警告バナー
  if (combat.pendingCurseNotice) {
    combat.pendingCurseNotice = false;
    stageBanner = { text: '⚠ 魔力を吸われた！ レベル＆スキル低下 ⚠', timer: 2.5 };
  }

  // Process dead enemies: drop pickups, add kills
  const bossDied = processDeadEnemies();

  // Clean up dead enemies
  enemies = enemies.filter(e => !e.dead);
  bosses = bosses.filter(b => !b.dead);

  // ステージバナーのフェード
  if (stageBanner.timer > 0) stageBanner.timer -= dt;

  // ボス出現の予告（出現10秒前）
  if (!bossWarned && stageElapsed >= BOSS_SPAWN_TIME - 10) {
    bossWarned = true;
    stageBanner = { text: '⚠ ラージデーモン 接近中… ⚠', timer: 3.5 };
  }

  // ボス撃破 → 次ステージ or 全クリア
  if (bossDied) {
    onBossDefeated();
    if (state === STATE.GAMEOVER) return;
  }

  // Check level up
  if (leveling.update(player)) {
    showLevelUpScreen();
    return;
  }

  // Count total gems gained
  // (tracked when gems are collected in pickup update)

  // Game over check
  if (player.dead) {
    gameOverScreen.show({
      time: gameStats.elapsedTime,
      kills: gameStats.killCount,
      level: player.level,
      gems: gameStats.totalGems,
    });
    submitArcadeScore(false);   // ゲーセン版：オンラインランキングへ送信
    state = STATE.GAMEOVER;
  }
}

function processDeadEnemies() {
  let bossDied = false;
  const deadEnemies = enemies.filter(e => e.dead && !e.processed);
  const deadBosses = bosses.filter(b => b.dead && !b.processed);

  for (const e of [...deadEnemies, ...deadBosses]) {
    e.processed = true;
    gameStats.killCount++;

    // Drop gems
    const gems = createGemDrops(e);
    for (const g of gems) {
      pickups.gems.push(g);
      gameStats.totalGems += g.xpValue;
    }

    // 20% potion drop
    if (Math.random() < 0.2) {
      pickups.potions.push(new Potion(e.getCenterX(), e.getCenterY()));
    }
  }

  // 召喚された手下デーモンの死亡ではステージ進行・勝利しない
  if (deadBosses.some(b => !b.isSummon)) bossDied = true;
  return bossDied;
}

function updateLevelUp(dt) {
  levelUpUI.update();
  // State transitions handled in show() callback
}

function updateGameOver(dt) {
  const result = gameOverScreen.update(dt);
  if (result === 'retry') {
    initGame();
    state = STATE.PLAYING;
  } else if (result === 'title') {
    state = STATE.TITLE;
  }
}

// ─── Main update ───────────────────────────────────────────────────────────
function update(dt) {
  switch (state) {
    case STATE.TITLE:    updateTitle(dt);    break;
    case STATE.PLAYING:  updatePlaying(dt);  break;
    case STATE.LEVELUP:  updateLevelUp(dt);  break;
    case STATE.GAMEOVER: updateGameOver(dt); break;
  }

  clearFrame();
}

// ステージ突入バナー（中央に大きく表示し、フェードアウト）
function drawStageBanner(uictx) {
  const W = 480, H = 270;
  const JP = "'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif";
  const t = stageBanner.timer;
  const alpha = Math.min(1, t) * (t > 2.5 ? (3 - t) * 2 : 1); // 出入りフェード
  uictx.save();
  uictx.globalAlpha = Math.max(0, alpha);
  uictx.textAlign = 'center';
  // 背景帯
  uictx.fillStyle = 'rgba(0,0,0,0.55)';
  uictx.fillRect(0, H / 2 - 26, W, 52);
  uictx.fillStyle = '#ffdd44';
  uictx.font = `bold 22px ${JP}`;
  uictx.shadowColor = '#aa3300';
  uictx.shadowBlur = 10;
  uictx.fillText(stageBanner.text, W / 2, H / 2 + 8);
  uictx.restore();
}

// ─── Render ────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  clearUI();   // clear crisp overlay each frame

  // ゲーセン操作バーの表示制御（タイトル時のみ）
  refreshArcadeBar();

  const camX = camera.x;

  if (state === STATE.TITLE) {
    // World background on pixel canvas, all text on crisp UI canvas.
    drawBackground(ctx, titleScreen.bgX);
    titleScreen.draw(uiCtx);
    if (showLeaderboard) leaderboardScreen.draw(uiCtx);  // ランキング overlay
    return;
  }

  if (state === STATE.LOADING) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    uiCtx.fillStyle = '#ffffff';
    uiCtx.font = 'bold 12px monospace';
    uiCtx.textAlign = 'center';
    uiCtx.fillText('Loading...', CANVAS_W / 2, CANVAS_H / 2);
    return;
  }

  // Background
  drawBackground(ctx, camX);

  // Platforms
  drawPlatforms(ctx, camX);

  // Pickups
  for (const gem of pickups.gems) {
    if (!gem.dead) gem.draw(ctx, camX);
  }
  for (const pot of pickups.potions) {
    if (!pot.dead) pot.draw(ctx, camX);
  }

  // Enemies
  for (const e of enemies) {
    if (!e.dead) e.draw(ctx, camX);
  }
  for (const b of bosses) {
    if (!b.dead) b.draw(ctx, camX);
  }

  // Projectiles
  combat.draw(ctx, camX);

  // Player
  player.draw(ctx, camX);

  // HUD (crisp overlay)
  drawHUD(uiCtx, player, gameStats, {
    stage: currentStage,
    difficulty,
    intensity: spawner ? spawner.getIntensity() : 1,
  });

  // ステージ突入バナー
  if (stageBanner.timer > 0) drawStageBanner(uiCtx);

  // Level up overlay (crisp overlay)
  if (state === STATE.LEVELUP) {
    levelUpUI.draw(uiCtx);
  }

  // Game over overlay (crisp overlay)
  if (state === STATE.GAMEOVER) {
    gameOverScreen.draw(uiCtx);
  }
}

// ─── Boot ──────────────────────────────────────────────────────────────────
async function boot() {
  // Init UI objects
  titleScreen = new TitleScreen();
  levelUpUI = new LevelUpUI();
  gameOverScreen = new GameOverScreen();

  // Load sprites + stage backgrounds (fallback colors if missing)
  state = STATE.LOADING;
  render(); // Show loading screen

  await Promise.all([loadSprites(), loadBackgrounds()]);

  state = STATE.TITLE;
  startLoop(update, render);
}

boot();
