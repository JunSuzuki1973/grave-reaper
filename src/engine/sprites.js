// Sprite loader and drawer with color fallback

const sprites = {};
const BASE_PATH = 'assets/sprites/';

// Fallback colors for each sprite key
export const FALLBACK_COLORS = {
  // Player — Knight
  player_knight_idle:    '#4488ff',
  player_knight_walk0:   '#4488ff',
  player_knight_walk1:   '#4488ff',
  player_knight_walk2:   '#4488ff',
  player_knight_jump:    '#66aaff',
  player_knight_attack:  '#88ccff',
  // Player — Mage
  player_mage_idle:      '#cc66ff',
  player_mage_walk0:     '#cc66ff',
  player_mage_walk1:     '#cc66ff',
  player_mage_walk2:     '#cc66ff',
  player_mage_jump:      '#dd88ff',
  player_mage_cast:      '#ee99ff',

  // Enemies
  enemy_zombie_0:    '#44aa44',
  enemy_zombie_1:    '#44aa44',
  enemy_skeleton_0:  '#ccccaa',
  enemy_skeleton_1:  '#ccccaa',
  enemy_bat_0:       '#553366',
  enemy_bat_1:       '#553366',
  enemy_ghost_0:     '#aaccee',
  enemy_ghost_1:     '#aaccee',
  enemy_devil_0:     '#cc2222',
  enemy_devil_1:     '#cc2222',
  enemy_werewolf_0:  '#886633',
  enemy_werewolf_1:  '#886633',
  enemy_gargoyle_0:  '#778899',
  enemy_gargoyle_1:  '#778899',
  enemy_dragon_0:    '#cc4400',
  enemy_dragon_1:    '#cc4400',
  enemy_dragon_2:    '#cc4400',
  enemy_dracula_0:   '#220033',
  enemy_dracula_1:   '#220033',
  enemy_dracula_2:   '#220033',
  enemy_boss_0:      '#880000',
  enemy_boss_1:      '#880000',
  enemy_final_0:     '#4a0a3a',
  enemy_final_1:     '#4a0a3a',
  enemy_final_cast:  '#4a0a3a',

  // Weapons/FX
  fx_sword_0:     '#ffff44',
  fx_sword_1:     '#ffff44',
  fx_sword_2:     '#ffff44',
  fx_sword_3:     '#ffff44',
  fx_sword_4:     '#ffff44',
  fx_spear_0:     '#ffaa00',
  fx_spear_1:     '#ffaa00',
  fx_spear_2:     '#ffaa00',
  fx_spear_3:     '#ffaa00',
  fx_axe_0:       '#aa6600',
  fx_axe_1:       '#aa6600',
  fx_axe_2:       '#aa6600',
  fx_axe_3:       '#aa6600',
  fx_fireball_0:  '#ff4400',
  fx_fireball_1:  '#ff6600',
  fx_fireball_2:  '#ff8800',
  fx_fireball_3:  '#ffaa00',
  fx_lightning_0: '#ffff88',
  fx_lightning_1: '#ffff88',
  fx_lightning_2: '#ffff88',
  fx_lightning_3: '#ffff88',
  fx_dagger_0:    '#88ffff',

  // Items
  item_gem_red:   '#ff2244',
  item_gem_blue:  '#2244ff',
  item_gem_green: '#22ff44',
  item_potion:    '#ff88aa',
  icon_shield:    '#aaaaff',
  icon_wind:      '#88ffcc',
  icon_sword:     '#ffcc44',

  // Tiles / Background
  tile_ground:     '#2a1a0a',
  bg_sky:          '#050a1a',
  bg_moon:         '#ffffcc',
  bg_castle:       '#110a22',
  deco_gravestone0: '#555566',
  deco_gravestone1: '#555566',
  deco_gravestone2: '#555566',
  deco_tree0:       '#221133',
  deco_tree1:       '#221133',
};

const SPRITE_FILES = Object.keys(FALLBACK_COLORS);

// 画像キャッシュ破棄用バージョン。素材を更新したらここを上げる。
const ASSET_VERSION = '11';

export function loadSprites() {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = SPRITE_FILES.length;

    function onLoad() {
      loaded++;
      if (loaded >= total) resolve();
    }

    for (const key of SPRITE_FILES) {
      const img = new Image();
      img.onload = onLoad;
      img.onerror = onLoad; // fail silently, fallback will be used
      img.src = `${BASE_PATH}${key}.png?v=${ASSET_VERSION}`;
      sprites[key] = img;
    }

    // If no sprites at all, resolve immediately
    if (total === 0) resolve();
  });
}

export function getSprite(key) {
  return sprites[key] || null;
}

// ── ステージ背景（横長の一枚画像）──
const backgrounds = {};
const NUM_STAGES = 5;

export function loadBackgrounds() {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = NUM_STAGES;
    const done = () => { if (++loaded >= total) resolve(); };
    for (let s = 1; s <= NUM_STAGES; s++) {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = `assets/backgrounds/stage${s}.png?v=${ASSET_VERSION}`;
      backgrounds[s] = img;
    }
  });
}

export function getBackground(stage) {
  return backgrounds[stage] || null;
}

export function drawSprite(ctx, key, x, y, w, h, flipX = false) {
  const img = sprites[key];
  const hasImage = img && img.complete && img.naturalWidth > 0;

  ctx.save();
  if (flipX) {
    ctx.scale(-1, 1);
    ctx.translate(-x * 2 - w, 0);
  }

  if (hasImage) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    // Fallback: color box
    ctx.fillStyle = FALLBACK_COLORS[key] || '#888888';
    ctx.fillRect(x, y, w, h);

    // Small border for definition
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  ctx.restore();
}

// Draw sprite centered at (cx, cy)
export function drawSpriteCentered(ctx, key, cx, cy, w, h, flipX = false) {
  drawSprite(ctx, key, cx - w / 2, cy - h / 2, w, h, flipX);
}

// Scratch canvas reused for silhouette tinting (hit-flash etc.)
let _scratch = null;
function getScratch(w, h) {
  if (!_scratch) _scratch = document.createElement('canvas');
  if (_scratch.width < w || _scratch.height < h) {
    _scratch.width = Math.max(w, _scratch.width);
    _scratch.height = Math.max(h, _scratch.height);
  }
  return _scratch;
}

/**
 * Draw a sprite tinted toward `color`, affecting ONLY the sprite's opaque
 * pixels (its silhouette) — never a full rectangle. `amount` 0..1 blends the
 * tint. Falls back to the normal sprite if the image isn't ready.
 */
export function drawSpriteTinted(ctx, key, x, y, w, h, color, amount, flipX = false) {
  const img = sprites[key];
  const hasImage = img && img.complete && img.naturalWidth > 0;
  if (!hasImage || amount <= 0) {
    drawSprite(ctx, key, x, y, w, h, flipX);
    return;
  }

  // Render sprite + tint into a scratch canvas at integer size.
  const iw = Math.max(1, Math.ceil(w));
  const ih = Math.max(1, Math.ceil(h));
  const sc = getScratch(iw, ih);
  const sctx = sc.getContext('2d');
  sctx.clearRect(0, 0, iw, ih);
  sctx.imageSmoothingEnabled = false;
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';
  sctx.drawImage(img, 0, 0, iw, ih);
  // Tint only where the sprite is opaque.
  sctx.globalCompositeOperation = 'source-atop';
  sctx.globalAlpha = Math.min(1, amount);
  sctx.fillStyle = color;
  sctx.fillRect(0, 0, iw, ih);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';

  ctx.save();
  if (flipX) {
    ctx.scale(-1, 1);
    ctx.translate(-x * 2 - w, 0);
  }
  ctx.drawImage(sc, 0, 0, iw, ih, x, y, w, h);
  ctx.restore();
}
