// ランキング（HALL OF FAME）画面。Base44 のオンラインスコアを表示。
// UIオーバーレイ（uiCtx・論理480×270座標）に描画する。

import { getLeaderboard } from '../arcade/base44client.js';

const JP_FONT = "'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif";
const W = 480, H = 270;

export class LeaderboardScreen {
  constructor() {
    this.data = [];
    this.loading = false;
    this.loaded = false;
    this.error = false;
  }

  async load() {
    this.loading = true;
    this.loaded = false;
    this.error = false;
    try {
      this.data = await getLeaderboard();
      this.loaded = true;
    } catch (e) {
      this.error = true;
      this.data = [];
    } finally {
      this.loading = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, W, H);

    // タイトル
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold 20px ${JP_FONT}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#aa3300';
    ctx.shadowBlur = 8;
    ctx.fillText('⚰ HALL OF FAME ⚰', W / 2, 36);
    ctx.shadowBlur = 0;

    if (this.loading) {
      ctx.fillStyle = '#cccccc';
      ctx.font = `13px ${JP_FONT}`;
      ctx.fillText('読み込み中…', W / 2, H / 2);
      this._footer(ctx);
      ctx.restore();
      return;
    }

    if (this.error || this.data.length === 0) {
      ctx.fillStyle = '#cc9999';
      ctx.font = `12px ${JP_FONT}`;
      ctx.fillText(this.error ? 'ランキングを取得できませんでした' : 'まだ記録がありません', W / 2, H / 2);
      this._footer(ctx);
      ctx.restore();
      return;
    }

    // 列ヘッダ
    const top = this.data.slice(0, 10);
    ctx.font = `11px ${JP_FONT}`;
    ctx.textAlign = 'left';
    const xRank = 40, xName = 78, xScore = 320, xStage = 372, xDiff = 414;
    let y = 62;
    for (let i = 0; i < top.length; i++) {
      const e = top[i] || {};
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      ctx.fillStyle = i < 3 ? '#FFD700' : '#CCCCCC';
      ctx.textAlign = 'left';
      ctx.fillText(medal, xRank, y);
      ctx.fillText(String(e.user_name || '???').slice(0, 12), xName, y);
      ctx.textAlign = 'right';
      ctx.fillText(Number(e.score || 0).toLocaleString(), xScore, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = i < 3 ? '#e0c060' : '#778899';
      ctx.font = `9px ${JP_FONT}`;
      ctx.fillText(`Stg${e.stage != null ? e.stage : '-'}`, xStage, y);
      ctx.fillText(String(e.difficulty || ''), xDiff, y);
      ctx.font = `11px ${JP_FONT}`;
      y += 19;
    }

    this._footer(ctx);
    ctx.restore();
  }

  _footer(ctx) {
    ctx.fillStyle = '#8899aa';
    ctx.font = `10px ${JP_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('[ Esc / Enter ] 戻る', W / 2, H - 16);
  }
}
