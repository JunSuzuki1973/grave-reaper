// Pickup entities: gems and potions

import { drawSprite } from '../engine/sprites.js';
import { playGem, playPotion } from '../engine/audio.js';

const GROUND_Y = 240;
const GRAVITY = 400;

const GEM_TYPES = [
  { key: 'item_gem_red',   xp: 10, color: '#ff2244' },
  { key: 'item_gem_blue',  xp: 25, color: '#2244ff' },
  { key: 'item_gem_green', xp: 50, color: '#22ff44' },
];

export class Gem {
  constructor(x, y, xpValue) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 60;
    this.vy = -80 - Math.random() * 60;
    this.width = 12;
    this.height = 12;
    this.xpValue = xpValue;
    this.dead = false;
    this.grounded = false;
    this.bobTimer = Math.random() * Math.PI * 2;

    // Determine type by value
    if (xpValue >= 40) {
      this.type = GEM_TYPES[2]; // green
    } else if (xpValue >= 20) {
      this.type = GEM_TYPES[1]; // blue
    } else {
      this.type = GEM_TYPES[0]; // red
    }

    // Magnetic attraction state
    this.attracted = false;
    this.attractSpeed = 180;
  }

  update(dt, playerX, playerY, gemRange) {
    if (this.dead) return;

    // Check attraction
    const dx = playerX - (this.x + this.width / 2);
    const dy = playerY - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < gemRange) {
      this.attracted = true;
    }

    if (this.attracted) {
      if (dist < 10) {
        this.dead = true;
        playGem();
        return;
      }
      // Move toward player
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = this.attractSpeed * (1 + (gemRange - dist) / gemRange * 2);
      this.x += nx * speed * dt;
      this.y += ny * speed * dt;
    } else {
      // Physics
      this.vy += GRAVITY * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Ground
      if (this.y + this.height >= GROUND_Y) {
        this.y = GROUND_Y - this.height;
        this.vy *= -0.3;
        this.vx *= 0.8;
        this.grounded = true;
        if (Math.abs(this.vy) < 10) this.vy = 0;
      }

      // Bob when grounded
      if (this.grounded) {
        this.bobTimer += dt * 3;
      }
    }
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const sx = this.x - camX;
    const sy = this.y + (this.grounded ? Math.sin(this.bobTimer) * 1.5 : 0);

    drawSprite(ctx, this.type.key, sx, sy, this.width, this.height);
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }
}

export class Potion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = -60 - Math.random() * 40;
    this.width = 14;
    this.height = 14;
    this.dead = false;
    this.grounded = false;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.healAmount = 30;
  }

  update(dt) {
    if (this.dead) return;

    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.height >= GROUND_Y) {
      this.y = GROUND_Y - this.height;
      this.vy *= -0.3;
      this.vx *= 0.8;
      this.grounded = true;
      if (Math.abs(this.vy) < 10) this.vy = 0;
    }

    if (this.grounded) {
      this.bobTimer += dt * 2;
    }
  }

  collect(player) {
    if (this.dead) return;
    this.dead = true;
    player.hp = Math.min(player.hp + this.healAmount, player.maxHp);
    playPotion();
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const sx = this.x - camX;
    const sy = this.y + (this.grounded ? Math.sin(this.bobTimer) * 1.5 : 0);
    drawSprite(ctx, 'item_potion', sx, sy, this.width, this.height);
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }
}

// Create gem drops for a dead enemy
export function createGemDrops(enemy) {
  const drops = [];
  const numGems = 1 + Math.floor(enemy.xp / 20);
  for (let i = 0; i < numGems; i++) {
    const xpPerGem = Math.ceil(enemy.xp / numGems);
    drops.push(new Gem(
      enemy.x + enemy.width / 2 + (Math.random() - 0.5) * 20,
      enemy.y + enemy.height / 2,
      xpPerGem
    ));
  }
  return drops;
}
