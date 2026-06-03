# Grave Reaper — 開発計画

ブラウザで動くレトロフューチャー横スクロールアクション。
**コンセプト**：『魔界村』(横スクロール・ジャンプ・ゴシックホラー世界観) × 『Vampire Survivors』(自動攻撃・Gem収集・レベルアップでスキル選択)

---

## 1. 技術スタック

- **HTML5 Canvas + 素のJavaScript (ES Modules)**。ビルド不要。
- `image-rendering: pixelated` でドット絵をシャープに拡大。
- 内部解像度 **480×270 (16:9)** を整数倍スケールで画面にフィット → レトロ感とパフォーマンス両立。
- 60fps 固定タイムステップのゲームループ。
- **ローカルサーバ必須**：ES Modules と画像は `file://` だとCORSで弾かれるため、`python -m http.server` 等で起動（起動スクリプト同梱）。

## 2. アセット処理（最大の技術リスク）

添付の5枚は2048×1152の「ラベル付きショーケースシート」。見出し文字・パレット見本・装飾枠が混在 → そのままでは使えない。

**方針**：Python(Pillow)で各スプライトを座標指定で個別PNGに切り出し → `assets/sprites/` に整理。切り出し後に拡大表示して目視確認し、座標を反復調整する。

- `tools/extract_sprites.py` … 座標テーブルに基づき自動クロップ
- 抽出対象（優先順）：
  1. プレイヤー：Dark Knight (idle / walk×3 / jump / attack)
  2. 敵：Zombie, Skeleton, Bat, Ghost, Red Devil, Werewolf, Gargoyle, Dragon, Dracula + **Large Demon Boss**
  3. 武器エフェクト：Sword swing, Spear, Axe, Fireball, Lightning, Dagger
  4. アイテム：Gem(赤青緑), Potion, スキルアイコン(盾/風/剣)
  5. タイル・背景：地面タイル, 墓石, 枯木, 満月, 城シルエット
- 抽出が困難な細部 → 自作ドット絵 or 絵文字で補完。

## 3. ゲームメカニクス

### 操作
- 移動：`←`/`A`(左), `→`/`D`(右)
- ジャンプ：`Space`/`Enter`（重力・地面/プラットフォーム判定）
- 攻撃：**自動**（Vampire Survivors式。武器がクールダウンごとに自動発射）
- レベルアップ選択：`←`/`→`でカード移動, `Enter`/`Space`で決定（`1`/`2`/`3`キーでも直接選択）

### コアループ
1. 敵が左右からウェーブで出現しプレイヤーに接近
2. 自動攻撃で撃破 → **Gem**(XP) をドロップ、低確率で**HPポーション**ドロップ
3. Gem取得でXPバー上昇 → **レベルアップ**で時間停止しスキルカード3枚提示
4. カード選択で強化 → 難易度上昇（出現数・敵速度・敵HP）
5. 一定時間ごとに **ボス(Large Demon)** 出現

### 成長要素（スキルカードの例）
- 新武器解放：Spear / Battle Axe / Fireball / Lightning / Throwing Dagger
- 武器強化：ダメージ↑, 攻撃速度↑, 投射数↑, 範囲↑, 貫通
- ステータス：最大HP↑, 移動速度↑, 防御(被ダメ減), HP自動回復, Gem取得範囲↑

### プレイヤー戦闘
- 武器は所持リストを保持し各々独立クールダウンで自動発動
- 向いている方向 or 最寄りの敵方向へ発射（武器ごとに挙動定義）

## 4. ステージ
- 地面 + 浮遊プラットフォームの横スクロールステージ（ループ or 横長）
- パララックス背景：満月 + 城シルエット + 墓地/枯木の手前レイヤー
- カメラはプレイヤー追従（左右スクロール）

## 5. UI / HUD
- 上部：HPバー, レベル & XPバー, 生存タイマー, 撃破数, Gem数
- レベルアップ画面：3枚のスキルカード（アイコン+名前+効果, キーボード選択ハイライト）
- タイトル画面 / ゲームオーバー画面（リトライ）

## 6. ファイル構成
```
Grave Reaper/
├─ index.html
├─ serve.bat / serve.sh         # ローカルサーバ起動
├─ css/style.css
├─ tools/extract_sprites.py     # スプライト抽出
├─ assets/
│  ├─ source/  (元の5枚PNG)
│  └─ sprites/ (抽出後の個別PNG)
└─ src/
   ├─ main.js        # 起動・ゲームループ
   ├─ engine/        # loop, input, camera, sprite, animation, audio
   ├─ entities/      # player, enemy, projectile, pickup, boss
   ├─ systems/       # spawner, combat, leveling, collision
   ├─ ui/            # hud, levelup-cards, title, gameover
   └─ data/          # weapons, enemies, upgrades 定義
```

## 7. 実装マイルストーン
1. **基盤**：プロジェクト構成・ローカルサーバ・空Canvas起動
2. **アセット抽出**：extract_sprites.py で切り出し→目視確認→座標調整
3. **エンジン**：ゲームループ, 入力, スプライト描画, アニメ, カメラ, 物理(重力/ジャンプ/接地)
4. **プレイヤー**：移動・ジャンプ・アニメ
5. **敵 & スポナー**：出現・追跡・接触ダメージ・撃破
6. **自動攻撃 & 武器**：複数武器の自動発射と当たり判定
7. **ドロップ & XP**：Gem/ポーション・取得・XP・レベルアップ判定
8. **レベルアップUI**：3枚カード・キーボード選択・強化適用
9. **HUD & ステージ背景**：パララックス・墓地タイル
10. **ボス**：Large Demon 出現と攻撃パターン
11. **タイトル/ゲームオーバー・調整**：バランス・SE(絵文字/簡易合成音)・仕上げ

## 8. 補完方針
不足アセットは①既存スプライトの改変 ②簡易ドット絵生成 ③絵文字 の順で補完。効果音はWeb Audio APIで簡易合成 or 省略。
