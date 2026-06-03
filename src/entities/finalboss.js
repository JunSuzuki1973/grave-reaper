// 最終ボス「Magic Caster（魔導師）」。ステージ5専用のラスボス。
// ラージデーモンより格上：
//   ・防御オーラが強力（最大0.88・画面全体）＝雑魚をより硬くする
//   ・ファイアブレスが広範囲・高火力・高頻度
//   ・闇のオーブ連射（ラージデーモンには無い遠隔攻撃）
// 移動/重力/フェーズ2/ファイアブレスの基礎は Boss を継承して再利用する。

import { Boss } from './boss.js';
import { drawSprite, drawSpriteTinted, getSprite } from '../engine/sprites.js';
import { Animation } from '../engine/animation.js';

const GROUND_Y = 240;

export class FinalBoss extends Boss {
  constructor(x, y, difficultyScale = 1) {
    super(x, y, difficultyScale);
    this.id = 'finalboss';
    this.isFinal = true;

    // 体格を大きく（当たり判定）
    this.width = 84;
    this.height = 96;
    this.y = GROUND_Y - this.height;

    // idleアニメ（2フレーム）。攻撃/詠唱時は enemy_final_cast を表示。
    this.anim = new Animation(['enemy_final_0', 'enemy_final_1'], 2.5, true);

    // ステータス（ラージデーモンより格上）
    this.speed = 26;            // 重厚にゆっくり迫る
    this.damage = 48;           // 接触ダメージ
    this.xp = 1000;
    this.color = '#4a0a3a';

    // 防御オーラ：最大0.88（ラージデーモン0.70より強力）・画面全体
    this.baseAura = 0.88;
    this.auraRange = 9999;

    // ファイアブレス（親より頻繁）
    this.breathCd = 4.0;
    this.breathTimer = 3.2;

    // 闇のオーブ連射（遠隔攻撃）
    this.volleyCd = 3.6;
    this.volleyTimer = 2.2;
    this.castAnim = 0;          // >0 の間は詠唱ポーズ
    this.pendingVolley = null;  // main が読み取って敵弾を生成

    // ラージデーモン召喚
    this.summonCd = 14;
    this.summonTimer = 7;
    this.pendingSummon = null;  // main が読み取って Boss を bosses[] に追加

    // 弱体化魔法（広範囲・レベル＆スキル低下）。テレグラフ付きで回避可能。
    this.hexCd = 12;
    this.hexTimer = 9;
    this.pendingHex = null;     // main が読み取って combat.spawnHex
  }

  update(dt, playerX, playerY, platforms) {
    if (this.dead) return;

    if (this.castAnim > 0) this.castAnim -= dt;

    // 闇のオーブ連射：プレイヤー方向に扇状の弾幕
    this.volleyTimer -= dt;
    if (this.volleyTimer <= 0 && !this.charging) {
      this.volleyTimer = this.volleyCd * (this.phase2 ? 0.6 : 1);
      this.castAnim = 0.9;
      this.pendingVolley = {
        fromX: this.getCenterX(),
        fromY: this.y + this.height * 0.4,
        toX: playerX, toY: playerY,
        count: this.phase2 ? 9 : 6,
        spread: this.phase2 ? 1.2 : 0.85,   // 扇の全開き角(rad)
        speed: 190,
        dmg: this.phase2 ? 30 : 24,
        color: '#cc55ff',
      };
    }

    // ラージデーモン召喚（手下を呼び出す）
    this.summonTimer -= dt;
    if (this.summonTimer <= 0 && !this.charging) {
      this.summonTimer = this.summonCd * (this.phase2 ? 0.7 : 1);
      this.castAnim = 1.0;
      this.pendingSummon = { x: this.getCenterX() };
    }

    // 弱体化魔法：プレイヤーの現在地に魔法陣を設置（テレグラフ中は回避可能）
    this.hexTimer -= dt;
    if (this.hexTimer <= 0 && !this.charging) {
      this.hexTimer = this.hexCd * (this.phase2 ? 0.7 : 1);
      this.castAnim = 1.2;
      this.pendingHex = {
        x: playerX, y: playerY,
        radius: this.phase2 ? 100 : 85,
        telegraph: 1.3,
      };
    }

    // 親：移動・重力・フェーズ2突進・ファイアブレス要求の生成
    super.update(dt, playerX, playerY, platforms);

    // 親が生成したファイアブレス要求を「最終ボス仕様（広範囲・高火力）」に格上げ
    if (this.pendingFireBreath) this.pendingFireBreath.final = true;
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const sx = this.x - camX;
    const sy = this.y;

    // 攻撃中は詠唱/ブレスポーズ、それ以外はidleアニメ
    const frame = (this.breathAnim > 0 || this.castAnim > 0)
      ? 'enemy_final_cast'
      : (this.anim.getFrame() || 'enemy_final_0');

    const img = getSprite(frame);
    const targetH = 150;                       // ラスボスらしい大きな表示
    let dw, dh;
    if (img && img.naturalWidth > 0) {
      dh = targetH;
      dw = targetH * (img.naturalWidth / img.naturalHeight);
    } else {
      dw = this.width; dh = this.height;
    }
    const footCx = sx + this.width / 2;
    const footY = sy + this.height;
    const dx = footCx - dw / 2;
    const dy = footY - dh;

    // 防御オーラの紫オーラ（生存中・HP比で強さを示す）
    const aura = this.getAura();
    if (aura > 0.02) {
      ctx.save();
      ctx.globalAlpha = 0.10 + aura * 0.18;
      const g = ctx.createRadialGradient(footCx, dy + dh * 0.5, dw * 0.15,
                                         footCx, dy + dh * 0.5, dw * 0.7);
      g.addColorStop(0, '#aa33ff');
      g.addColorStop(1, 'rgba(80,0,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(footCx, dy + dh * 0.5, dw * 0.7, dh * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.hitFlash > 0) {
      drawSpriteTinted(ctx, frame, dx, dy, dw, dh, '#ffd0ff', Math.min(0.3, this.hitFlash * 0.35), !this.facingRight);
    } else {
      drawSprite(ctx, frame, dx, dy, dw, dh, !this.facingRight);
    }

    // 大きなHPバー（頭上）
    const barW = dw * 0.8;
    const bx = footCx - barW / 2;
    const by = dy - 10;
    ctx.fillStyle = '#1a0022';
    ctx.fillRect(bx - 1, by - 1, barW + 2, 8);
    ctx.fillStyle = this.phase2 ? '#ff44cc' : '#aa33ff';
    ctx.fillRect(bx, by, barW * Math.max(0, this.hp / this.maxHp), 6);
    ctx.strokeStyle = '#ee99ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, 6);
  }
}
