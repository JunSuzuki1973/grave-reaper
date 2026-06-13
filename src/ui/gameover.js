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
    // 「ランキングを見る」ボタンの当たり判定（論理480×270座標）。main がクリック判定に使用。
    this.rankingBtnRect = null;
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

    if (isJustPressed('KeyL')) return 'ranking';   // ランキングを見る（クリックでも可）
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

    // ── 「ランキングを見る」ボタン（レトロ調・クリック可能）──
    const bw = 176, bh = 28;
    const bx = W / 2 - bw / 2, by = 196;
    this.rankingBtnRect = { x: bx, y: by, w: bw, h: bh };
    // 枠付きボタン（暗い背景＋金枠で既存UIに馴染ませる）
    ctx.fillStyle = 'rgba(34,18,8,0.92)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = this.blinkOn ? '#ffd24a' : '#aa7722';   // 軽く明滅して押せると分かるように
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.fillStyle = '#ffe07a';
    ctx.font = `bold 13px ${JP}`;
    ctx.fillText('🏆 ランキングを見る', W / 2, by + 19);

    // ボタン下の補助ヒント
    ctx.fillStyle = '#aa9988';
    ctx.font = `9px ${JP}`;
    ctx.fillText('クリック または [ L ] キー', W / 2, by + bh + 12);

    // 操作（リトライ / タイトル）
    if (this.blinkOn) {
      ctx.fillStyle = '#ffdd44';
      ctx.font = `bold 12px ${JP}`;
      ctx.fillText('[ R ] リトライ　　[ Enter ] タイトルへ', W / 2, 250);
    }

    ctx.restore();
  }
}
