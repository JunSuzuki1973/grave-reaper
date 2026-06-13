// 配信用 dist/ を組み立てる（ビルド工程なしの静的ゲームを必要ファイルだけ集約）。
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });

// 単体ファイル
for (const f of ['index.html', 'Clockwork_Catacomb.mp3', 'FinalBoss.mp3']) {
  if (existsSync(f)) cpSync(f, `dist/${f}`);
}
// ディレクトリ
for (const d of ['css', 'src']) {
  if (existsSync(d)) cpSync(d, `dist/${d}`, { recursive: true });
}
// アセットは実行時に使う sprites と backgrounds のみ（source など重い原本は除外）
for (const d of ['sprites', 'backgrounds']) {
  if (existsSync(`assets/${d}`)) cpSync(`assets/${d}`, `dist/assets/${d}`, { recursive: true });
}
console.log('dist/ を生成しました');
