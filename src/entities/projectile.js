// Projectile entity

import { drawSprite } from '../engine/sprites.js';
import { Animation } from '../engine/animation.js';

export class Projectile {
  constructor(x, y, vx, vy, weaponDef, playerStats) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;

    const wDef = weaponDef;
    this.weaponId = wDef.id;
    this.width = wDef.width;
    this.height = wDef.height;
    this.damage = Math.floor(wDef.damage * playerStats.damageMultiplier);
    this.range = wDef.range * playerStats.rangeMultiplier;
    this.piercing = wDef.piercing || playerStats.allPiercing;
    this.color = wDef.color;

    // Track distance traveled
    this.distanceTraveled = 0;

    this.dead = false;
    this.hitEnemies = new Set(); // for piercing

    // Axe: arc motion
    this.isAxe = wDef.id === 'axe';
    this.axeAngle = 0;

    // Animation
    if (wDef.fxFrames && wDef.fxFrames.length > 0) {
      this.anim = new Animation(wDef.fxFrames, 10, true);
    } else {
      this.anim = null;
    }

    this.facingRight = vx >= 0;
  }

  update(dt) {
    if (this.dead) return;

    if (this.anim) this.anim.update(dt);

    const prevX = this.x;
    const prevY = this.y;

    if (this.isAxe) {
      // Axe: arc upward then fall
      this.axeAngle += dt * 8;
      this.vy += 600 * dt; // Gravity on axe
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const dx = this.x - prevX;
    const dy = this.y - prevY;
    this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

    // Kill if range exceeded
    if (this.distanceTraveled >= this.range) {
      this.dead = true;
    }

    // Kill if off screen vertically or too far horizontally
    if (this.y > 300 || this.y < -100) {
      this.dead = true;
    }
  }

  onHitEnemy(enemy) {
    if (this.piercing) {
      this.hitEnemies.add(enemy.id + '_' + Math.floor(enemy.x));
      // piercing projectiles continue but only hit each enemy once
    } else {
      this.dead = true;
    }
  }

  alreadyHit(enemy) {
    return this.hitEnemies.has(enemy.id + '_' + Math.floor(enemy.x));
  }

  draw(ctx, camX) {
    if (this.dead) return;

    const sx = this.x - camX - this.width / 2;
    const sy = this.y - this.height / 2;

    const frame = this.anim ? this.anim.getFrame() : null;

    ctx.save();

    if (this.isAxe) {
      // Rotate axe
      ctx.translate(sx + this.width / 2, sy + this.height / 2);
      ctx.rotate(this.axeAngle);
      ctx.translate(-this.width / 2, -this.height / 2);
      if (frame) {
        drawSprite(ctx, frame, 0, 0, this.width, this.height);
      } else {
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    } else {
      if (frame) {
        drawSprite(ctx, frame, sx, sy, this.width, this.height, !this.facingRight);
      } else {
        ctx.fillStyle = this.color;
        ctx.fillRect(sx, sy, this.width, this.height);
      }
    }

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }
}
