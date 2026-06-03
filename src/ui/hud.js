// HUD：HP / 経験値 / タイマー / 撃破数 / ジェム（高解像度オーバーレイに描画）

const JP_FONT = "'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function drawHUD(ctx, player, gameState, meta = {}) {
  const W = 480;

  ctx.save();

  // 上部の帯
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 26);

  // ステージ＋難易度（中央上の小さい行）
  if (meta.stage) {
    ctx.textAlign = 'center';
    ctx.font = `bold 7px ${JP_FONT}`;
    ctx.fillStyle = '#ffcc66';
    let label = `STAGE ${meta.stage}`;
    ctx.fillText(label, 268, 8);
    if (meta.difficulty) {
      ctx.fillStyle = meta.difficulty.color || '#cccccc';
      ctx.fillText('  ' + meta.difficulty.name, 268 + ctx.measureText(label).width / 2 + 12, 8);
    }
  }

  const barH = 8;
  const barY = 11;

  // ── HP バー ──
  const hpX = 6, hpW = 96;
  ctx.fillStyle = '#330008';
  ctx.fillRect(hpX, barY, hpW, barH);
  const hpRatio = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = hpRatio > 0.5 ? '#ee2244' : hpRatio > 0.25 ? '#ff8800' : '#ff2200';
  ctx.fillRect(hpX, barY, hpW * hpRatio, barH);
  ctx.strokeStyle = '#ff5577';
  ctx.lineWidth = 1;
  ctx.strokeRect(hpX + 0.5, barY + 0.5, hpW - 1, barH - 1);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 9px ${JP_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('HP', hpX, barY - 2);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, hpX + hpW, barY - 2);

  // ── 経験値バー ──
  const xpX = 112, xpW = 110;
  ctx.fillStyle = '#1a0033';
  ctx.fillRect(xpX, barY, xpW, barH);
  const xpRatio = player.xpToNext > 0 ? Math.min(player.xp / player.xpToNext, 1) : 0;
  ctx.fillStyle = '#aa55ff';
  ctx.fillRect(xpX, barY, xpW * xpRatio, barH);
  ctx.strokeStyle = '#cc77ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(xpX + 0.5, barY + 0.5, xpW - 1, barH - 1);

  ctx.fillStyle = '#e0c0ff';
  ctx.font = `bold 9px ${JP_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`Lv.${player.level}`, xpX, barY - 2);
  ctx.textAlign = 'right';
  ctx.fillText(`${player.xp}/${player.xpToNext}`, xpX + xpW, barY - 2);

  // ── タイマー ──
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `bold 12px ${JP_FONT}`;
  ctx.fillText(formatTime(gameState.elapsedTime), 268, 23);

  // ── 撃破数 ──
  ctx.textAlign = 'left';
  ctx.font = `bold 10px ${JP_FONT}`;
  ctx.fillStyle = '#ff9999';
  ctx.fillText(`☠ ${gameState.killCount}`, 312, 11);

  // ── ジェム ──
  ctx.fillStyle = '#88ddff';
  ctx.fillText(`◆ ${gameState.totalGems}`, 312, 23);

  // ── 所持武器 ──
  ctx.fillStyle = '#bbbbbb';
  ctx.font = `9px ${JP_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(player.unlockedWeapons.length + ' 武器', W - 6, 11);

  // ── 動的難易度インジケーター（強度）──
  if (meta.intensity != null) {
    const it = meta.intensity;
    // 1.0付近=緑、高い=赤
    const t = Math.min(1, Math.max(0, (it - 0.7) / 2.0));
    const r = Math.floor(120 + t * 135), g = Math.floor(220 - t * 170);
    ctx.fillStyle = `rgb(${r},${g},90)`;
    ctx.font = `bold 9px ${JP_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`強度 x${it.toFixed(2)}`, W - 6, 23);
  }

  // ── リバイブ（中央寄りに表示）──
  if (player.revives > 0) {
    ctx.fillStyle = '#ffee99';
    ctx.font = `bold 8px ${JP_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`復活 x${player.revives}`, 360, 11);
  }

  ctx.restore();
}
