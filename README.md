# ⚰️ Grave Reaper

ブラウザで動くレトロ横スクロールアクション。
コンセプトは **『魔界村』×『Vampire Survivors』** — ゴシックホラー世界観の横スクロール・ジャンプに、自動攻撃・ジェム収集・レベルアップでのスキル選択を融合。

## ▶ 今すぐプレイ

### 🏆 Grave Reaper Legends（フル版・推奨）
**https://grave-reaper-legends.base44.app/**

[Base44](https://base44.app) 上でホストされる本格版。ゲーム本体に加えて**オンライン機能**を搭載：
- **ランキング表示** — ゲームオーバー時のスコアがオンラインのランキングに登録される
- **ハンドルネーム** — 自分の名前でランキングに参加
- **ゲーム内通貨（仮実装）** — 今後の拡張に向けた基盤

> 仕組み：ゲーム本体（このリポジトリ）を iframe で読み込み、`postMessage` でスコア等を親アプリ（React）へ送信して連携します（詳細は下の「🔗 Base44連携（postMessage）」節を参照）。

### 🎮 エンジン版（バニラ・本リポジトリ）
**https://junsuzuki1973.github.io/grave-reaper/**

GitHub Pages で配信するゲーム本体のみのバージョン。オンライン機能なしで誰でもすぐ遊べます（インストール不要・PCのモダンブラウザ推奨）。

## 🎮 操作方法

| 操作 | キー |
|------|------|
| 移動 | `←` / `→` または `A` / `D` |
| ジャンプ | `Space` / `Enter` |
| 攻撃 | **自動**（武器ごとのクールダウンで自動発射） |
| スキル選択 | `←` `→` で移動、`Enter` / `1`〜`3` で決定 |
| 全画面表示 | `F` キー または 右上の ⛶ ボタン |

## 🕹 ゲームの流れ

1. 左右からウェーブで迫る敵を自動攻撃で撃破し、**ジェム（経験値）** を集める
2. レベルアップで時間が止まり、**スキルカード3枚**から1つを選んで強化
3. 各ステージ開始から **5分でラージデーモン** が中ボスを引き連れて出現 → 撃破で次ステージ
4. 全5ステージ。**ステージ5は突入と同時に最終ボス「Magic Caster（魔導師リッチ）」** が降臨
   - ラージデーモンの召喚、広範囲ファイアブレス、闇のオーブ連射、そして **プレイヤーのレベルとスキルを削り取る弱体化魔法**（魔法陣のテレグラフ中に逃げれば回避可）
5. 最終ボス撃破で **全クリア**

4段階の難易度（初心者／中級／上級／ナイトメア）に加え、プレイヤーのHP状況に追従する**動的難易度**を搭載。

## 🔗 Base44連携（postMessage）

ゲーム本体（iframe・子）は、親ウィンドウ（Base44 / React アプリ）へ以下のイベントを `window.parent.postMessage(..., '*')` で送信します。親iframe内（`window.parent !== window`）でのみ送信し、GitHub Pages 直アクセス時は何もしません。実装は [src/main.js](src/main.js) と [src/ui/gameover.js](src/ui/gameover.js)。

| イベント `type` | 送信タイミング | データ |
|---|---|---|
| `GRAVE_REAPER_GAME_OVER` | ゲームオーバー／全クリア確定時 | `score: { score, kills, stage, level, gems, victory, play_time }` |
| `GRAVE_REAPER_GO_TO_RANKING` | ゲームオーバー画面の「🏆 ランキングを見る」ボタン押下時（クリック / `L` キー） | （なし） |

親側の受信例：
```javascript
window.addEventListener('message', (e) => {
  // 必要に応じて e.origin を検証
  if (e.data?.type === 'GRAVE_REAPER_GAME_OVER') {
    const s = e.data.score;   // { score, kills, stage, level, gems, victory, play_time }
    // → Score エンティティへ保存 など
  } else if (e.data?.type === 'GRAVE_REAPER_GO_TO_RANKING') {
    // → ランキング画面へ遷移
  }
});
```

`score` は v16 にスコア概念が無いため戦績から合成しています：`撃破×100 + ジェム×10 + 秒×5 + レベル×500 +（勝利なら +50000）`。算出式の変更は `src/main.js` の `postGameOverToParent` 一箇所で行えます。

## 🗺 ロードマップ（Legends 拡張計画）

`Grave Reaper Legends` でユーザー機能を継続的にリッチ化していく予定：
- **ゲーム内通貨** — 本実装（獲得・消費・残高管理）
- **アーティファクト** — 収集・装備による永続強化
- **レジェンダリーBOSS攻略図鑑** — ボスの攻撃パターン・攻略情報のコレクション
- その他、プレイヤーの進行・実績を蓄積するユーザー機能

※ これらは主に Base44 側（バックエンド／React UI）で実装し、ゲームエンジン（本リポジトリ）へは必要最小限の `postMessage` 連携のみを足していく方針です。

## 🛠 技術スタック

- **HTML5 Canvas + 素のJavaScript（ESモジュール）**。ビルドツール不要。
- 内部解像度 480×270 を整数倍（または全画面時はフィット）スケールで描画する2キャンバス構成
  （ドット絵用の `image-rendering: pixelated` 世界キャンバス ＋ 文字を鮮明に描く高解像度UIオーバーレイ）。
- 固定タイムステップ 60fps のゲームループ。
- BGMはHTML5 Audio、効果音はWeb Audio APIで合成。

## 💻 ローカルで動かす

ESモジュールと画像は `file://` だとCORSで弾かれるため、ローカルサーバ経由で開きます。

```bash
python serve.py        # → http://localhost:8080
# または serve.bat をダブルクリック（Windows）
```

`serve.py` はキャッシュ無効化ヘッダ付きの開発用サーバです（普通に静的配信できれば何でも可）。

## 📁 構成

```
index.html        2キャンバス構成のエントリ
css/style.css     レイアウト
src/
  engine/         ループ・入力・カメラ・スプライト・アニメ・オーディオ
  entities/       プレイヤー・敵・ボス・最終ボス・投射物・ピックアップ
  systems/        スポナー・戦闘・レベリング
  ui/             HUD・レベルアップ・タイトル・ゲームオーバー
  data/           武器・敵・スキル・難易度・ステージ定義
assets/
  sprites/        抽出済みドット絵スプライト
  backgrounds/    ステージ背景
tools/            スプライト抽出用 Python スクリプト
```

## 📜 ライセンス / クレジット

個人制作のファンゲーム的習作。スプライト・背景・BGMの素材を元に、Python(Pillow)で切り出し・整形して使用しています。
