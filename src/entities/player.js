// Player entity

import { drawSprite, drawSpriteTinted } from '../engine/sprites.js';
import { Animation, AnimationController } from '../engine/animation.js';
import { isLeft, isRight, isJump } from '../engine/input.js';
import { playJump, playHit } from '../engine/audio.js';
import { revertUpgrade } from '../data/upgrades.js';

const GRAVITY = 600;
const JUMP_FORCE = -280;
const GROUND_Y = 240;
const BASE_SPEED = 100;
const INVINCIBLE_DURATION = 1.0;

// Per-character definitions
const CHAR_DEFS = {
  knight: {
    hp: 120,
    startWeapon: 'sword',
    attackSpeedMult: 1.0,
    frames: {
      idle:   ['player_knight_idle'],
      walk:   ['player_knight_walk0', 'player_knight_walk1', 'player_knight_walk2'],
      jump:   ['player_knight_jump'],
      attack: ['player_knight_attack'],
    },
  },
  mage: {
    hp: 80,
    startWeapon: 'fireball',
    attackSpeedMult: 1.3,  // Mage attacks faster
    frames: {
      idle:   ['player_mage_idle'],
      walk:   ['player_mage_walk0', 'player_mage_walk1', 'player_mage_walk2'],
      jump:   ['player_mage_jump'],
      attack: ['player_mage_cast'],
    },
  },
};

// レベルアップに必要な経験値。レベルが上がるほど急増させ、
// ゲーム後半でレベルアップ頻度が下がる（＝アクション性を維持）よう二次関数曲線にする。
//  Lv1→2:80  3→4:212  5→6:590  10→11:1730  15→16:3320  20→21:5360
export function xpForLevel(level) {
  return Math.floor(50 + 18 * level + 12 * level * level);
}

export class Player {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} charId  'knight' | 'mage'
   */
  constructor(x, y, charId = 'knight') {
    this.charId = charId;
    const def = CHAR_DEFS[charId] || CHAR_DEFS.knight;

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 28;
    this.height = 36;
    this.grounded = false;
    this.facingRight = true;

    // Stats (also used as upgrade state)
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.xp = 0;
    this.xpToNext = xpForLevel(1);
    this.level = 1;
    this.damageMultiplier = 1;
    this.attackSpeedMultiplier = def.attackSpeedMult;
    this.multiShot = 1;
    this.rangeMultiplier = 1;
    this.allPiercing = false;
    this.moveSpeedMultiplier = 1;
    this.defense = 0;
    this.regenPerSec = 0;
    this.gemRange = 60;
    this.revives = 0;
    this.xpMultiplier = 1;

    // Weapons (start weapon depends on character)
    const sw = def.startWeapon;
    this.unlockedWeapons = [sw];
    this.weaponCooldowns = { [sw]: 0 };

    // 習得したアップグレードの履歴（最終ボスの弱体化魔法で剥がす対象）
    this.acquiredUpgrades = [];
    this.curseFlash = 0;   // 弱体化を受けた演出

    // Invincibility
    this.invincibleTimer = 0;
    this.isInvincible = false;

    // Regen timer
    this.regenTimer = 0;

    // Animation
    const f = def.frames;
    this.anim = new AnimationController({
      idle:   new Animation(f.idle,   4, true),
      walk:   new Animation(f.walk,   8, true),
      jump:   new Animation(f.jump,   4, false),
      attack: new Animation(f.attack, 8, false),
    });
    this.anim.play('idle');

    this.state = 'idle'; // idle, walk, jump, attack
    this.dead = false;

    // Flash effect when damaged
    this.flashTimer = 0;
  }

  update(dt, platforms) {
    if (this.dead) return;

    // Input
    const moveLeft = isLeft();
    const moveRight = isRight();
    const jumpPressed = isJump();

    const speed = BASE_SPEED * this.moveSpeedMultiplier;

    if (moveLeft) {
      this.vx = -speed;
      this.facingRight = false;
    } else if (moveRight) {
      this.vx = speed;
      this.facingRight = true;
    } else {
      this.vx *= 0.8; // Friction
      if (Math.abs(this.vx) < 1) this.vx = 0;
    }

    // Jump
    if (jumpPressed && this.grounded) {
      this.vy = JUMP_FORCE;
      this.grounded = false;
      playJump();
    }

    // Gravity
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
    }

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Ground collision
    const groundY = GROUND_Y - this.height;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.grounded = true;
    }

    // Platform collision (one-way, land on top only)
    this.grounded = this.y >= groundY;
    if (!this.grounded) {
      for (const plat of platforms) {
        const prevBottom = this.y + this.height - this.vy * dt;
        const curBottom = this.y + this.height;
        const platLeft = plat.x;
        const platRight = plat.x + plat.w;
        const platTop = plat.y;
        if (
          curBottom >= platTop &&
          prevBottom <= platTop + 4 &&
          this.x + this.width > platLeft &&
          this.x < platRight
        ) {
          this.y = platTop - this.height;
          this.vy = 0;
          this.grounded = true;
          break;
        }
      }
    }

    // Invincibility
    if (this.isInvincible) {
      this.invincibleTimer -= dt;
      this.flashTimer += dt;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.flashTimer = 0;
      }
    }

    // Regen
    if (this.regenPerSec > 0) {
      this.regenTimer += dt;
      if (this.regenTimer >= 1) {
        this.regenTimer -= 1;
        this.hp = Math.min(this.hp + this.regenPerSec, this.maxHp);
      }
    }

    // 弱体化演出の減衰
    if (this.curseFlash > 0) this.curseFlash -= dt * 1.2;

    // Determine animation state
    let newState = 'idle';
    if (!this.grounded) newState = 'jump';
    else if (Math.abs(this.vx) > 5) newState = 'walk';

    if (newState !== this.state && !(this.state === 'attack' && !this.anim.isDone())) {
      this.state = newState;
      this.anim.play(newState);
    }

    this.anim.update(dt);
  }

  takeDamage(amount) {
    if (this.isInvincible || this.dead) return;

    const finalDamage = Math.max(1, Math.floor(amount * (1 - this.defense)));
    this.hp -= finalDamage;
    this.flashTimer = 0;

    if (this.hp <= 0) {
      if (this.revives > 0) {
        this.revives--;
        this.hp = Math.floor(this.maxHp * 0.3);
        this.isInvincible = true;
        this.invincibleTimer = 3.0;
      } else {
        this.hp = 0;
        this.dead = true;
      }
    } else {
      this.isInvincible = true;
      this.invincibleTimer = INVINCIBLE_DURATION;
      playHit();
    }
  }

  gainXP(amount) {
    const gained = Math.floor(amount * this.xpMultiplier);
    this.xp += gained;
  }

  // 最終ボスの弱体化魔法：レベルを1下げ、習得スキルをランダムに1つ剥がす。
  // 戻り値は剥がしたアップグレードid（無ければnull）。
  applyCurse() {
    if (this.dead) return null;
    let removed = null;
    if (this.acquiredUpgrades.length > 0) {
      const i = Math.floor(Math.random() * this.acquiredUpgrades.length);
      removed = this.acquiredUpgrades.splice(i, 1)[0];
      revertUpgrade(removed, this);
    }
    if (this.level > 1) {
      this.level--;
      this.xpToNext = xpForLevel(this.level);
      this.xp = 0;
    }
    this.curseFlash = 1.0;
    return removed;
  }

  checkLevelUp() {
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = xpForLevel(this.level);
      return true;
    }
    return false;
  }

  draw(ctx, camX) {
    if (this.dead) return;

    const sx = this.x - camX;
    const sy = this.y;

    // Flash when invincible
    if (this.isInvincible && Math.floor(this.flashTimer * 10) % 2 === 0) {
      return; // Skip draw to create blink effect
    }

    const frame = this.anim.getFrame() || 'player_knight_idle';
    if (this.curseFlash > 0) {
      // 弱体化を受けている間は紫に明滅し、吸い取られるオーラを表示
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.min(0.4, this.curseFlash * 0.4);
      ctx.strokeStyle = '#bb44ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx + this.width / 2, sy + this.height / 2,
              this.width * (0.7 + (1 - this.curseFlash) * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawSpriteTinted(ctx, frame, sx, sy, this.width, this.height,
                       '#cc66ff', Math.min(0.5, this.curseFlash * 0.55), !this.facingRight);
    } else {
      drawSprite(ctx, frame, sx, sy, this.width, this.height, !this.facingRight);
    }

    // Health indicator pip (small bar over head)
    if (this.hp < this.maxHp) {
      const barW = this.width;
      const barH = 3;
      const bx = sx;
      const by = sy - 6;
      ctx.fillStyle = '#440000';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), barH);
    }
  }

  getCenterX() { return this.x + this.width / 2; }
  getCenterY() { return this.y + this.height / 2; }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }
}
