// Game over screen

import { isJustPressed, isConfirm } from '../engine/input.js';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '00')}`;
}

export class GameOverScreen {
  constructor() {
    this.stats = null;
    this.blinkTimer = 0;
    this.blinkOn = true;
    this.showTimer = 0;
  }

  show(stats) {
    this.stats = stats;
    this.blinkTimer = 0;
    this.blinkOn = true;
    this.showTimer = 0;
  }

  update(dt) {
    this.blinkTimer += dt;
    this.showTimer += dt;
    if (this.blinkTimer >= 0.5) {
      this.blinkTimer = 0;
      this.blinkOn = !this.blinkOn;
    }

    // Prevent accidental skip — require 1 second before input
    if (this.showTimer < 1.0) return null;

    if (isJustPressed('KeyR')) return 'retry';
    if (isConfirm()) return 'title';

    return null;
  }

  draw(ctx) {
    const W = 480;
    const H = 270;
    const JP = "'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif";

    ctx.save();
    ctx.textAlign = 'center';

    // 暗幕
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);

    // ゲームオーバー or 勝利
    const win = this.stats && this.stats.victory;
    ctx.fillStyle = win ? '#ffdd44' : '#ff2222';
    ctx.font = `bold 34px ${JP}`;
    ctx.shadowColor = win ? '#ffaa00' : '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillText(win ? '★ 全ステージ制覇！ ★' : 'ゲームオーバー', W / 2, 78);
    ctx.shadowBlur = 0;

    // リザルト
    if (this.stats) {
      const statsY = 118;
      ctx.font = `14px ${JP}`;
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(`生存時間　：${formatTime(this.stats.time)}`, W / 2, statsY);
      ctx.fillText(`撃破数　　：${this.stats.kills}`,            W / 2, statsY + 22);
      ctx.fillText(`最高レベル：${this.stats.level}`,           W / 2, statsY + 44);
      ctx.fillText(`総ジェム　：${this.stats.gems}`,            W / 2, statsY + 66);
    }

    // 操作
    if (this.blinkOn) {
      ctx.fillStyle = '#ffdd44';
      ctx.font = `bold 13px ${JP}`;
      ctx.fillText('[ R ] リトライ　　[ Enter ] タイトルへ', W / 2, 222);
    }

    ctx.restore();
  }
}
