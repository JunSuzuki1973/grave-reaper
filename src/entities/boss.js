// Boss entity

import { drawSprite, drawSpriteTinted, getSprite } from '../engine/sprites.js';
import { Animation } from '../engine/animation.js';
import { playBossSpawn } from '../engine/audio.js';

const GROUND_Y = 240;
const GRAVITY = 400;

const BOSS_DEF = {
  id: 'boss',
  hp: 500,
  speed: 30,
  damage: 35,
  xp: 200,
  width: 72,
  height: 72,
  flying: false,
  frames: ['enemy_boss_0', 'enemy_boss_1'],
  animFps: 3,
  color: '#880000',
};

export class Boss {
  constructor(x, y, difficultyScale = 1) {
    this.def = BOSS_DEF;
    this.id = 'boss';
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = BOSS_DEF.width;
    this.height = BOSS_DEF.height;
    this.flying = false;

    this.hp = Math.floor(BOSS_DEF.hp * difficultyScale);
    this.maxHp = this.hp;
    this.speed = BOSS_DEF.speed;
    this.damage = Math.floor(BOSS_DEF.damage * difficultyScale);
    this.xp = BOSS_DEF.xp;
    this.color = BOSS_DEF.color;

    this.grounded = true;
    this.facingRight = true;
    this.dead = false;
    this.isSummon = false;   // 最終ボスが召喚した手下なら true（勝利判定の対象外）

    this.anim = new Animation(BOSS_DEF.frames, BOSS_DEF.animFps, true);
    this.hitFlash = 0;

    // Phase-2 when < 50% HP
    this.phase2 = false;
    this.chargeTimer = 0;
    this.chargeCooldown = 3.0;
    this.charging = false;
    this.chargeDuration = 0;

    // ファイアブレス（広範囲・地面炎上攻撃）
    this.breathCd = 5.0;
    this.breathTimer = 2.5;       // 初回まで
    this.breathAnim = 0;          // >0 の間は炎を吐くポーズ(frame1)
    this.pendingFireBreath = null; // main が読み取って炎フィールドを生成

    // 防御オーラ：HP満タンで最大、HPが減るほど弱まる
    this.baseAura = 0.70;         // 最大で周囲の敵の被ダメージを70%軽減
    this.auraRange = 9999;        // 画面全体に及ぶ

    playBossSpawn();
  }

  // 現在の防御オーラ強度（HP比例で減衰）
  getAura() {
    return this.baseAura * Math.max(0, this.hp / this.maxHp);
  }

  update(dt, playerX, playerY, platforms) {
    if (this.dead) return;

    this.anim.update(dt);

    const dx = playerX - (this.x + this.width / 2);
    this.facingRight = dx > 0;

    // Phase 2 check
    if (!this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.speed *= 1.5;
    }

    // ── ファイアブレス（広範囲・地面炎上）──
    if (this.breathAnim > 0) this.breathAnim -= dt;
    this.breathTimer -= dt;
    if (this.breathTimer <= 0 && !this.charging) {
      this.breathTimer = this.breathCd * (this.phase2 ? 0.7 : 1);  // 後半は頻繁
      this.breathAnim = 1.0;
      // プレイヤーのいる方向を広く焼く。main がこの要求を読んで炎を生成。
      this.pendingFireBreath = {
        fromX: this.getCenterX(),
        dir: this.facingRight ? 1 : -1,
        toX: playerX,
        phase2: this.phase2,
      };
    }

    // Charge attack in phase 2
    if (this.phase2) {
      this.chargeTimer += dt;
      if (this.chargeTimer >= this.chargeCooldown && !this.charging) {
        this.charging = true;
        this.chargeDuration = 0.4;
        this.vx = (dx > 0 ? 1 : -1) * this.speed * 4;
      }
      if (this.charging) {
        this.chargeDuration -= dt;
        if (this.chargeDuration <= 0) {
          this.charging = false;
          this.chargeTimer = 0;
          this.vx = 0;
        }
      }
    }

    if (!this.charging) {
      this.vx = (dx > 0 ? 1 : -1) * this.speed;
    }

    this.facingRight = this.vx > 0;
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Ground
    const groundY = GROUND_Y - this.height;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.grounded = true;
    }

    // Platform collision
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
        break;
      }
    }

    if (this.hitFlash > 0) this.hitFlash -= dt * 8;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    // ボスは毎フレーム多数の弾/AoEでヒットするため、hitFlash=1 を毎回入れると
    // 白ティントが張り付き「体全体が白く見える」。少しずつ加算し低い上限で頭打ち。
    this.hitFlash = Math.min(0.6, this.hitFlash + 0.4);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const sx = this.x - camX;
    const sy = this.y;

    // 自然なアスペクト比で足元中心に大きく描画（フレーム間の横幅差で歪まない）
    // ファイアブレス中は火炎ポーズ(frame1)を表示
    const frame = this.breathAnim > 0 ? 'enemy_boss_1'
                                      : (this.anim.getFrame() || 'enemy_boss_0');
    const img = getSprite(frame);
    const targetH = 120;                       // ボスの表示高さ（迫力ある大きさ）
    let dw, dh, dx, dy;
    if (img && img.naturalWidth > 0) {
      const aspect = img.naturalWidth / img.naturalHeight;
      dh = targetH;
      dw = targetH * aspect;
    } else {
      dw = this.width; dh = this.height;
    }
    const footCx = sx + this.width / 2;        // 当たり判定の中心X
    const footY = sy + this.height;            // 足元Y
    dx = footCx - dw / 2;
    dy = footY - dh;

    if (this.hitFlash > 0) {
      // シルエットのみを淡く着色。上限を抑え、連続被弾でも白飛びしない。
      drawSpriteTinted(ctx, frame, dx, dy, dw, dh, '#ffd0d0', Math.min(0.3, this.hitFlash * 0.35), !this.facingRight);
    } else {
      drawSprite(ctx, frame, dx, dy, dw, dh, !this.facingRight);
    }

    // Boss HP bar（大きな表示の頭上に配置）
    const barW = dw * 0.7;
    const bx = footCx - barW / 2;
    const by = dy - 8;
    ctx.fillStyle = '#220000';
    ctx.fillRect(bx, by, barW, 5);
    ctx.fillStyle = this.phase2 ? '#ff8800' : '#ff2244';
    ctx.fillRect(bx, by, barW * Math.max(0, this.hp / this.maxHp), 5);
    ctx.strokeStyle = '#ff5555';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, 5);
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }
  getCenterX() { return this.x + this.width / 2; }
  getCenterY() { return this.y + this.height / 2; }
}
