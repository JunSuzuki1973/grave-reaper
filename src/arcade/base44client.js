// Base44連携モジュール — Grave Reaper ゲーセン化
// 公式SDK(@base44/sdk)のAPIに準拠。window.base44 は index.html で createClient 済み。
// SDK未読込・未ログインでも安全に no-op し、バニラ版の動作を維持する。
//
// 注意: auth.me()/isAuthenticated() は非同期。ログイン状態は refreshUser() で
// キャッシュ(_user)に取り込み、描画ループからは同期的に参照する。

let _user = null;     // ログインユーザー（me() の結果キャッシュ）
let _ready = false;   // ログイン状態を一度でも確認したか

function client() {
  return (typeof window !== 'undefined' && window.base44) ? window.base44 : null;
}

// SDK が読み込まれているか（ログインボタンを出してよいか）
export function isBase44Available() {
  const c = client();
  return !!(c && c.auth);
}

// 起動時／SDK読込後／ログイン・ログアウト後に呼び、ログイン状態をキャッシュ
export async function refreshUser() {
  const c = client();
  if (!c || !c.auth) { _user = null; _ready = true; return null; }
  try {
    const authed = await c.auth.isAuthenticated();
    _user = authed ? await c.auth.me() : null;
  } catch (e) {
    _user = null;   // 401等は未ログイン扱い
  }
  _ready = true;
  return _user;
}

export function isReady() { return _ready; }

// ゲーセンモード（ログイン済み）か。キャッシュ参照（同期）。
export function isArcadeMode() { return !!_user; }

// 現在のユーザー名
export function getCurrentUserName() {
  if (!_user) return 'Player';
  return _user.full_name || (_user.email ? _user.email.split('@')[0] : 'Player');
}

// ログイン（Google OAuth。リダイレクト後この画面に戻る）
export function signIn() {
  const c = client();
  if (!c || !c.auth) return;
  c.auth.loginWithProvider('google', window.location.href);
}

// ログアウト（サーバー側でセッション破棄→この画面へ戻る）
export function signOut() {
  const c = client();
  if (!c || !c.auth) return;
  c.auth.logout(window.location.href);
}

// スコア保存（ゲームオーバー or クリア時。未ログインなら no-op）
export async function saveScore({ score, stage, difficulty, play_time }) {
  const c = client();
  if (!c || !c.functions || !isArcadeMode()) return null;
  try {
    return await c.functions.invoke('saveScore', {
      user_name: getCurrentUserName(),
      score, stage, difficulty, play_time,
    });
  } catch (e) {
    console.error('saveScore failed:', e);
    return null;
  }
}

// ランキング取得（上位20件・認証不要）
export async function getLeaderboard() {
  const c = client();
  if (!c || !c.functions) return [];
  try {
    const r = await c.functions.invoke('getLeaderboard');
    // 返却形のゆらぎに対応（配列 / {leaderboard} / {data:{leaderboard}}）
    if (Array.isArray(r)) return r;
    if (r && Array.isArray(r.leaderboard)) return r.leaderboard;
    if (r && r.data && Array.isArray(r.data.leaderboard)) return r.data.leaderboard;
    return [];
  } catch (e) {
    console.error('getLeaderboard failed:', e);
    return [];
  }
}
