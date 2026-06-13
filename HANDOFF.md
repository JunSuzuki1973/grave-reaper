# Grave Reaper × Base44 ゲーセン化 — Claude Code指示書

## 概要
grave-reaper（GitHub Pages）にBase44バックエンドを連携させ、
バニラ版（誰でも遊べる）とゲーセン版（ログイン後にスコアランキング参加）を実装する。
課金要素はなし。

対象リポジトリ: https://github.com/JunSuzuki1973/grave-reaper
GitHub Pages: https://junsuzuki1973.github.io/grave-reaper/
Base44バックエンド: https://grave-reap-ranks.base44.app
Base44 App ID: 6a2d01f339fbcea2e6958c2d

---

## アーキテクチャ

GitHub Pages（ゲーム本体）
  └── index.html / src/ （既存コードはほぼ触らない）
  └── src/arcade/base44client.js  ← 新規追加（Base44連携モジュール）
        ↓ HTTP API呼び出し
Base44バックエンド（構築済み）
  └── POST /functions/saveScore  （認証必要・ベストスコアのみ保存）
  └── GET  /functions/getLeaderboard （認証不要・上位20件返す）

---

## STEP 1: Base44 SDK読み込み（index.htmlに追記）

index.html の <head> 内、既存の<script>タグより前に以下を追加：

```html
<!-- Base44 SDK -->
<script type="module">
  import { createClient } from 'https://cdn.base44.com/sdk.esm.js';
  window.base44 = createClient({ appId: '6a2d01f339fbcea2e6958c2d' });
</script>
```

---

## STEP 2: Base44連携モジュールを新規作成

src/arcade/base44client.js を新規作成（ゲームの既存コードは一切触らない）：

```javascript
// Base44連携モジュール — Grave Reaper ゲーセン化

const BASE44_API = 'https://grave-reap-ranks.base44.app/functions';

// ゲーセンモード（ログイン済み）かチェック
export function isArcadeMode() {
  return !!(window.base44?.auth?.currentUser);
}

// 現在のユーザー名を取得
export function getCurrentUserName() {
  const user = window.base44?.auth?.currentUser;
  return user?.full_name || user?.email?.split('@')[0] || 'Player';
}

// ログイン画面を表示（ポップアップ）
export async function signIn() {
  try {
    await window.base44.auth.signInWithPopup();
    return true;
  } catch (e) {
    console.error('Login failed:', e);
    return false;
  }
}

// ログアウト
export async function signOut() {
  await window.base44.auth.signOut();
}

// スコアを保存（ゲームオーバー or クリア時に呼ぶ）
export async function saveScore({ score, stage, difficulty, play_time }) {
  if (!isArcadeMode()) return null;
  try {
    const token = await window.base44.auth.getToken();
    const res = await fetch(`${BASE44_API}/saveScore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_name: getCurrentUserName(),
        score,
        stage,
        difficulty,
        play_time
      })
    });
    return res.json();
  } catch (e) {
    console.error('saveScore failed:', e);
    return null;
  }
}

// ランキング取得（上位20件）
export async function getLeaderboard() {
  try {
    const res = await fetch(`${BASE44_API}/getLeaderboard`);
    const data = await res.json();
    return data.leaderboard || [];
  } catch (e) {
    console.error('getLeaderboard failed:', e);
    return [];
  }
}
```

---

## STEP 3: ゲームオーバー・クリア時にスコア送信

src/ui/ 内のゲームオーバー処理（GameOver系またはGame系のファイル）を探して追記。
既存のゲームオーバー処理の末尾に以下を追加：

```javascript
import { saveScore, isArcadeMode } from '../arcade/base44client.js';

// ゲームオーバー or クリア確定時の処理内に追加
if (isArcadeMode()) {
  saveScore({
    score: /* 現在のスコア変数 */,
    stage: /* 現在のステージ変数 */,
    difficulty: /* 難易度文字列 */,
    play_time: /* 経過時間（秒） */
  });
}
```

※ score/stage/difficulty/play_timeの変数名は既存コードに合わせて差し替えること

---

## STEP 4: タイトル画面にゲーセンボタンを追加

src/ui/ 内のタイトル画面（Title系のファイル）に追記。
既存のボタン描画処理の近くに以下を追加：

```javascript
import { isArcadeMode, signIn, signOut, getCurrentUserName } from '../arcade/base44client.js';

// タイトル画面の描画処理内に追加

if (isArcadeMode()) {
  // 「ランキングを見る」ボタンと「ログアウト（ユーザー名表示）」を追加
  // ユーザー名: getCurrentUserName()
} else {
  // 「ゲーセンに入る」ボタンを追加
  // クリックで signIn() を呼ぶ
}
```

---

## STEP 5: ランキング画面を新規追加

src/ui/Leaderboard.js を新規作成：

```javascript
import { getLeaderboard } from '../arcade/base44client.js';

export class LeaderboardScreen {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.data = [];
  }

  async load() {
    this.data = await getLeaderboard();
  }

  draw() {
    const ctx = this.ctx;
    // 背景（ゲームのレトロゴシック風に合わせる）
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // タイトル
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚰ HALL OF FAME ⚰', this.canvas.width / 2, 40);

    // ランキングリスト
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    this.data.forEach((entry, i) => {
      const y = 70 + i * 22;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      ctx.fillStyle = i < 3 ? '#FFD700' : '#CCCCCC';
      ctx.fillText(
        `${medal} ${entry.user_name.padEnd(12)} ${String(entry.score).padStart(8)} Stg${entry.stage} ${entry.difficulty}`,
        20, y
      );
    });

    // 閉じる案内
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC or BACK to return', this.canvas.width / 2, this.canvas.height - 20);
  }
}
```

---

## 注意事項

- ゲームのメインロジック（engine/, entities/, systems/, data/）は一切触らない
- src/arcade/base44client.js は完全に独立したモジュール
- バニラ版（未ログイン）は既存の動作を100%維持する
- Base44 SDKのCDN URLが変わっている場合は https://cdn.base44.com を確認すること
- ESモジュール構成なので import/export はそのまま使える

---

## 完成後の動作イメージ

バニラ版（未ログイン・GitHub Pages直アクセス）
→ これまで通り普通に遊べる。スコアはローカルのみ。

ゲーセン版（「ゲーセンに入る」ボタンでログイン後）
→ スコアがBase44サーバーに保存されてランキングに乗る
→ タイトル画面から「HALL OF FAME」でランキング閲覧可能
→ ユーザー名がランキングに表示される
