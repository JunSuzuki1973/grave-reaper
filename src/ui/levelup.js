// レベルアップ：スキルカード選択UI（高解像度オーバーレイに描画）

import { isNavLeft, isNavRight, isConfirm, isJustPressed } from '../engine/input.js';

const JP_FONT = "'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif";

// カテゴリ（日本語）ごとの配色
const CAT_STYLE = {
  '武器解放':   { accent: '#46f0a8' },
  '全体攻撃':   { accent: '#ff6bd6' },
  '武器強化':   { accent: '#ffb347' },
  'ステータス': { accent: '#9db4ff' },
};

export class LevelUpUI {
  constructor() {
    this.choices = [];
    this.selectedIndex = 0;
    this.visible = false;
    this.onSelect = null;
  }

  show(choices, onSelect) {
    this.choices = choices;
    this.selectedIndex = 0;
    this.visible = true;
    this.onSelect = onSelect;
  }

  hide() {
    this.visible = false;
    this.choices = [];
  }

  update() {
    if (!this.visible) return;

    if (isNavLeft())  this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    if (isNavRight()) this.selectedIndex = Math.min(this.choices.length - 1, this.selectedIndex + 1);

    for (let i = 1; i <= 3; i++) {
      if (isJustPressed(`Digit${i}`) || isJustPressed(`Numpad${i}`)) {
        if (i - 1 < this.choices.length) {
          this.selectedIndex = i - 1;
          this.confirmSelection();
          return;
        }
      }
    }

    if (isConfirm()) this.confirmSelection();
  }

  confirmSelection() {
    if (this.onSelect) this.onSelect(this.selectedIndex);
    this.hide();
  }

  draw(ctx) {
    if (!this.visible || this.choices.length === 0) return;

    const W = 480, H = 270;
    ctx.save();
    ctx.textAlign = 'center';

    // 暗幕
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);

    // 見出し
    ctx.fillStyle = '#ffdd44';
    ctx.font = `bold 20px ${JP_FONT}`;
    ctx.shadowColor = '#aa6600';
    ctx.shadowBlur = 8;
    ctx.fillText('レベルアップ！', W / 2, 34);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = `12px ${JP_FONT}`;
    ctx.fillText('強化を1つ選択してください', W / 2, 50);

    // カード
    const n = this.choices.length;
    const cardW = 132, cardH = 150, gap = 14;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = (W - totalW) / 2;
    const cardY = 62;

    for (let i = 0; i < n; i++) {
      const c = this.choices[i];
      const cx = startX + i * (cardW + gap);
      const sel = i === this.selectedIndex;
      const catLabel = c.cat || '';
      const style = CAT_STYLE[catLabel] || { accent: '#cccccc' };

      // カード背景
      const g = ctx.createLinearGradient(cx, cardY, cx, cardY + cardH);
      if (sel) { g.addColorStop(0, '#2a1c05'); g.addColorStop(1, '#140d02'); }
      else     { g.addColorStop(0, '#12121f'); g.addColorStop(1, '#080810'); }
      ctx.fillStyle = g;
      ctx.fillRect(cx, cardY, cardW, cardH);

      // 枠（選択中は光彩＋太線）
      if (sel) { ctx.shadowColor = style.accent; ctx.shadowBlur = 14; }
      ctx.strokeStyle = sel ? style.accent : '#3a4a5a';
      ctx.lineWidth = sel ? 3 : 1.5;
      ctx.strokeRect(cx + 1, cardY + 1, cardW - 2, cardH - 2);
      ctx.shadowBlur = 0;

      // カテゴリバッジ
      ctx.fillStyle = style.accent;
      ctx.font = `bold 10px ${JP_FONT}`;
      ctx.fillText(catLabel, cx + cardW / 2, cardY + 18);

      // 番号
      ctx.fillStyle = sel ? '#ffdd44' : '#667788';
      ctx.font = `bold 11px ${JP_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}`, cx + 8, cardY + 18);
      ctx.textAlign = 'center';

      // アイコン（絵文字）
      ctx.font = '40px serif';
      ctx.fillText(c.iconEmoji || '？', cx + cardW / 2, cardY + 66);

      // スキル名
      ctx.fillStyle = sel ? style.accent : '#ffffff';
      ctx.font = `bold 15px ${JP_FONT}`;
      ctx.fillText(c.name, cx + cardW / 2, cardY + 92);

      // 説明（折り返し）
      ctx.fillStyle = '#cdd6e0';
      ctx.font = `12px ${JP_FONT}`;
      const lines = wrapJa(c.desc, cardW - 16, ctx);
      lines.forEach((ln, li) => {
        ctx.fillText(ln, cx + cardW / 2, cardY + 112 + li * 16);
      });

      // 選択マーカー
      if (sel) {
        ctx.fillStyle = '#ffdd44';
        ctx.font = `bold 11px ${JP_FONT}`;
        ctx.fillText('▼ 選択中 ▼', cx + cardW / 2, cardY + cardH - 8);
      }
    }

    // 操作ガイド
    ctx.fillStyle = '#8899aa';
    ctx.font = `11px ${JP_FONT}`;
    ctx.fillText('[ ← → ] 選択   [ 1 / 2 / 3 ] 直接選択   [ Enter / Space ] 決定', W / 2, H - 12);

    ctx.restore();
  }
}

// 日本語の折り返し（文字単位）
function wrapJa(text, maxWidth, ctx) {
  const lines = [];
  let cur = '';
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
