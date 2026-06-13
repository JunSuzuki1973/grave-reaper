// Base44連携モジュール — Grave Reaper ゲーセン化
// 完全に独立したモジュール。ゲーム本体（engine/entities/systems/data）には依存しない。
// window.base44（index.html で SDK を読み込んで生成）が無い場合でも安全に no-op する。

const BASE44_API = 'https://grave-reap-ranks.base44.app/functions';

// ゲーセンモード（ログイン済み）かチェック
export function isArcadeMode() {
  return !!(window.base44 && window.base44.auth && window.base44.auth.currentUser);
}

// Base44 SDK が読み込まれているか（ログインボタンを出してよいか）
export function isBase44Available() {
  return !!(window.base44 && window.base44.auth);
}

// 現在のユーザー名を取得
export function getCurrentUserName() {
  const user = window.base44 && window.base44.auth && window.base44.auth.currentUser;
  if (!user) return 'Player';
  return user.full_name || (user.email ? user.email.split('@')[0] : 'Player');
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
  try {
    await window.base44.auth.signOut();
  } catch (e) {
    console.error('Logout failed:', e);
  }
}

// スコアを保存（ゲームオーバー or クリア時に呼ぶ）。未ログインなら何もしない。
export async function saveScore({ score, stage, difficulty, play_time }) {
  if (!isArcadeMode()) return null;
  try {
    const token = await window.base44.auth.getToken();
    const res = await fetch(`${BASE44_API}/saveScore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_name: getCurrentUserName(),
        score,
        stage,
        difficulty,
        play_time,
      }),
    });
    return res.json();
  } catch (e) {
    console.error('saveScore failed:', e);
    return null;
  }
}

// ランキング取得（上位20件・認証不要）
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
