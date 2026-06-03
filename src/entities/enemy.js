// Enemy entity

import { drawSprite, drawSpriteTinted } from '../engine/sprites.js';
import { Animation } from '../engine/animation.js';

const GROUND_Y = 240;
const GRAVITY = 500;

export class Enemy {
  constructor(x, y, def, difficultyScale = 1) {
    this.def = def;
    this.id = def.id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = def.width;
    this.height = def.height;
    this.flying = def.flying || false;

    // HPは難易度にしっかり比例。速度・攻撃は緩やかに上昇（理不尽さ回避）。
    this.hp = Math.floor(def.hp * difficultyScale);
    this.maxHp = this.hp;
    this.speed = def.speed * (1 + (difficultyScale - 1) * 0.22);
    this.damage = Math.floor(def.damage * (1 + (difficultyScale - 1) * 0.5));
    this.xp = def.xp;
    this.color = def.color;

    this.grounded = !this.flying;
    this.facingRight = true;
    this.dead = false;

    // 防御オーラによる被ダメージ倍率（1=通常、<1で硬くなる。毎フレーム再計算）
    this.defenseMul = 1;

    // 中ボス（デーモン）：防御オーラを放つ／HPバー強調
    this.isMidBoss = def.isMidBoss || false;
    this.auraStrength = def.auraStrength || 0;   // 周囲の敵を硬くする最大値(0..1)
    this.auraRange = def.auraRange || 0;

    // 遠隔攻撃（一部の敵のみ）
    this.ranged = def.ranged || false;
    this.shootCd = def.shootCd || 2.5;
    this.shootTimer = this.shootCd * (0.5 + Math.random() * 0.5); // 初回ばらつき
    this.projSpeed = def.projSpeed || 130;
    this.projDmg = def.projDmg || 8;
    this.projColor = def.projColor || '#ff6622';

    // Anim
    this.anim = new Animation(def.frames, def.animFps || 4, true);

    // Damage flash
    this.hitFlash = 0;

    // Bobbing for flying enemies
    this.bobTimer = Math.random() * Math.PI * 2;

    // Target position for flying enemies
    this.targetY = y;
  }

  update(dt, playerX, playerY, platforms) {
    if (this.dead) return;

    this.anim.update(dt);

    const dx = playerX - (this.x + this.width / 2);
    const dy = playerY - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Direction to player
    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;

      if (this.flying) {
        // Flying: track player in Y too with smooth follow
        this.bobTimer += dt * 2;
        const bob = Math.sin(this.bobTimer) * 8;
        const targetX = playerX - this.width / 2 + nx * 20;
        const targetY = playerY - this.height / 2 + bob;
        this.vx += (nx * this.speed - this.vx) * dt * 3;
        this.vy += ((targetY - this.y) * 2 - this.vy) * dt * 3;
        this.vx = Math.max(-this.speed, Math.min(this.speed, this.vx));
        this.vy = Math.max(-this.speed, Math.min(this.speed, this.vy));
      } else {
        // Ground: horizontal only
        this.vx = nx * this.speed;
        // Apply gravity
        this.vy += GRAVITY * dt;
      }
    }

    this.facingRight = this.vx > 0;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Ground collision
    if (!this.flying) {
      const groundY = GROUND_Y - this.height;
      if (this.y >= groundY) {
        this.y = groundY;
        this.vy = 0;
        this.grounded = true;
      }

      // Simple platform collision for ground enemies (top only)
      for (const plat of platforms) {
        const prevBottom = this.y + this.height - this.vy * dt;
        const curBottom = this.y + this.height;
        if (
          curBottom >= plat.y &&
          prevBottom <= plat.y + 4 &&
          this.x + this.width > plat.x &&
          this.x < plat.x + plat.w
        ) {
          this.y = plat.y - this.height;
          this.vy = 0;
          this.grounded = true;
          break;
        }
      }
    }

    // Clamp flying enemies from going underground
    if (this.flying && this.y + this.height > GROUND_Y - 10) {
      this.y = GROUND_Y - 10 - this.height;
      this.vy *= -0.3;
    }

    // Hit flash decay
    if (this.hitFlash > 0) this.hitFlash -= dt * 8;
  }

  takeDamage(amount) {
    if (this.dead) return;
    // 防御オーラで被ダメージ軽減（defenseMul<1で硬くなる）
    const dealt = Math.max(1, amount * (this.defenseMul != null ? this.defenseMul : 1));
    this.hp -= dealt;
    this.hitFlash = 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  draw(ctx, camX) {
    if (this.dead) return;

    const sx = this.x - camX;
    const sy = this.y;

    const frame = this.anim.getFrame() || this.def.frames[0];

    // 素材の基本向き：通常は右向き想定。faceLeft の素材は判定を反転。
    const flip = this.def.faceLeft ? this.facingRight : !this.facingRight;

    // 防御オーラ発動中（defenseMul<1）は淡い紫の盾オーラを表示
    if (this.defenseMul < 0.98) {
      ctx.save();
      ctx.globalAlpha = 0.18 + (1 - this.defenseMul) * 0.25;
      ctx.fillStyle = '#88aaff';
      ctx.beginPath();
      ctx.ellipse(sx + this.width / 2, sy + this.height / 2,
                  this.width * 0.7, this.height * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.hitFlash > 0) {
      drawSpriteTinted(ctx, frame, sx, sy, this.width, this.height,
                       '#ffd0d0', Math.min(0.35, this.hitFlash * 0.35), flip);
    } else {
      drawSprite(ctx, frame, sx, sy, this.width, this.height, flip);
    }

    // HP bar（中ボスは太く・幅広）
    if (this.hp < this.maxHp || this.isMidBoss) {
      const barW = this.isMidBoss ? this.width + 16 : this.width;
      const barH = this.isMidBoss ? 5 : 3;
      const bx = sx + (this.width - barW) / 2;
      const by = sy - (this.isMidBoss ? 9 : 5);
      ctx.fillStyle = '#440000';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = this.isMidBoss ? '#ff7733' : '#ff2244';
      ctx.fillRect(bx, by, barW * Math.max(0, this.hp / this.maxHp), barH);
      if (this.isMidBoss) {
        ctx.strokeStyle = '#ffaa66';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
      }
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  getCenterX() { return this.x + this.width / 2; }
  getCenterY() { return this.y + this.height / 2; }
}
