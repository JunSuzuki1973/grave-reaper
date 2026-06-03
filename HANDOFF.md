# Grave Reaper — 開発ハンドオフ（次セッション用）

最終更新ビルド: **v16**

## v15〜v16 の変更（最新）— 全画面表示
- **全画面トグル**を実装。**Fキー**または**右上の ⛶ ボタン**で切替（`main.js` の `toggleFullscreen`、Fullscreen API。webkitプレフィックス対応）。
- `document.documentElement` を全画面化。body は黒背景・flex中央寄せなのでキャンバスは中央維持。`fullscreenchange`/`webkitfullscreenchange` で `resizeCanvas()` を再実行。
- **スケーリング方式（v16で改良）**: `resizeCanvas` を分岐。
  - **通常ウィンドウ時**：ピクセルパーフェクトな整数倍（最大8×）。
  - **全画面時**：アスペクト比16:9を維持したまま**モニターいっぱいにフィット**（`Math.min(innerW/480, innerH/270)`、非整数倍も許可）。480×270は厳密に16:9なので16:9モニターでは黒帯なしで全面拡大。`image-rendering:pixelated`のため非整数倍でもドット感は維持（ピクセル幅が僅かに不均一になる程度）。
- ボタンは `index.html` の `#fs-btn`＋`style.css`。タイトルに操作ヒント表示（`title.js`）。
- 画像アセット変更なし → `ASSET_VERSION` は 11 のまま。

## v14 の変更 — 最終ボス強化・弱体化魔法・召喚・中ボス増強
- **最終ボスHP大幅増**: `FINALBOSS_BASE_HP` 95000→**350000**（`spawner.js`）。後半はプレイヤーが高Lvで火力過多なため。**最終ボスのオーラは自分自身を硬くしない**（`applyDefenseAuras`はenemies[]のみ、`Boss.takeDamage`はdefenseMul非適用）＝防御は生HPのみ。要プレイテスト調整。
- **中ボスHP増**: `MIDBOSS_DEF.hp` 1400→**4000**（`enemies.js`）。
- **ラージデーモンが中ボスを引き連れて出現**: `spawner.js` のボス出現時に `2 + floor((stage-1)/2)` 体の中ボスを同時スポーン（stage1:2〜stage4:3）。
- **最終ボスがラージデーモンを召喚**: `FinalBoss` が `pendingSummon` を立て、main が `spawner.spawnSummonedDemon()` で `Boss(isSummon=true)` を bosses[] に追加（同時最大2体・HP `SUMMON_DEMON_HP=14000`・ブレス無効）。**`isSummon` の死亡では勝利/進行しない**（`processDeadEnemies` で `!b.isSummon` のみ bossDied）。
- **弱体化魔法（広範囲・回避可能）**: `FinalBoss` が `pendingHex`→`combat.spawnHex()`。プレイヤー現在地に**紫の魔法陣（テレグラフ1.3秒）**を設置、発動時に範囲内なら `player.applyCurse()`＝**レベル-1＋ランダムに習得スキル1つ剥奪**。テレグラフ中に走って逃げれば回避可。命中時はバナー＋`playCurse()`。
  - スキル剥奪機構: `player.acquiredUpgrades[]`（`leveling.applyUpgrade`で記録）＋ `upgrades.js revertUpgrade(id, player)`（各強化を逆算。主武器index0は剥がさない）。`player.applyCurse()` がランダム1件を巻き戻し＆レベルダウン。
- バランス調整値（要プレイテスト）: `FINALBOSS_BASE_HP`/`SUMMON_DEMON_HP`/`MIDBOSS_DEF.hp`/召喚CD(14s)/弱体化CD(12s)/弱体化半径(85-100)/テレグラフ(1.3s)。
- 画像アセット変更なし → `ASSET_VERSION` は 11 のまま。ビルドは v14（`index.html` ?v=14 / `title.js`）。

## v13 の変更
- **ボス白フラッシュ修正**: ラージデーモンは毎フレーム多数ヒットで `hitFlash=1` が連続リセットされ白ティント(0.5)が張り付き「体全体が白く見える」バグ。`boss.js` で加算式・低上限(0.6)＋描画上限(0.3)＋淡色(#ffd0d0)に変更（`enemy.js`の中ボスと同方式）。
- **最終ボス「Magic Caster（魔導師リッチ）」追加** → `src/entities/finalboss.js`（`Boss`を継承）。
  - 素材: `FinalBoss.png`(2048×1152のショーケースシート)から背景フラッドフィルで抽出 → `enemy_final_0/_1`(idle 2フレーム)・`enemy_final_cast`(詠唱/攻撃ポーズ)。`ASSET_VERSION`=11。
  - **ステージ5を最終決戦に再構成**: `stages.js` の stage5 に `final:true`。`spawner.js` は最終ステージで**突入と同時に**(stageElapsed≧0) `spawnFinalBoss()` を実行（通常ボスの5分待ちをスキップ、中ボスは出さない）。雑魚は引き続き出現し最終ボスのオーラで強化される。
  - **ラージデーモンより格上**: 防御オーラ最大0.88(画面全体／ラージは0.70)、ファイアブレス広範囲・高火力(`combat.spawnFireField` の `req.final` 分岐: patches16-20/reach460/dmg32-40)、**闇のオーブ連射**(`combat.spawnBossVolley`／`pendingVolley`→main経由で敵弾生成)。基礎HP `FINALBOSS_BASE_HP=95000`(`spawner.js`、要プレイテスト調整)。
  - **BGM**: `audio.js` に `setBGMTrack(src)` 追加。`main.js setStage()` で最終ステージ突入時 `FinalBoss.mp3`、通常ステージは `Clockwork_Catacomb.mp3` に切替。
  - 最終ボス撃破で従来通り全クリア勝利。
- `serve.py`: 起動CWDに依存せずスクリプト位置を配信ルートにするよう堅牢化（`directory=ROOT`）。
- 注意: Claude内蔵のpreview MCP(launch.json経由)は当環境ではサーバーがハングして使えなかった。検証は `python serve.py` 直起動＋ブラウザ`Ctrl+F5` で行うこと（HANDOFF従来手順）。



ブラウザで動くレトロ横スクロールアクション。コンセプト＝**『魔界村』×『Vampire Survivors』**
（ゴシックホラー世界観・横スクロール・ジャンプ ＋ 自動攻撃・Gem収集・レベルアップでスキル選択）。

---

## 0. まず最初にやること（次セッションの開始手順）

1. 開発サーバーを起動（**no-cache版を必ず使う**）:
   ```
   cd "E:\Users\PC\Documents\Grave Reaper"
   python serve.py        # または serve.bat をダブルクリック
   ```
   → http://localhost:8080
2. ブラウザで開き、`Ctrl+F5`。**タイトル右下の「build vNN」表示**で最新読込を確認。
3. 変更を反映したら **必ずビルド番号を上げる**（後述「キャッシュ対策」）。

---

## 1. 技術スタック / 実行環境

- **HTML5 Canvas + 素のJavaScript (ES Modules)**。ビルドツール無し。
- 内部解像度 **480×270**。JSで**整数倍スケール**（最大5倍）して表示（`main.js` の `resizeCanvas`）。
- **2枚のCanvas構成**:
  - `#game-canvas` … ドット絵世界（`image-rendering: pixelated`）
  - `#ui-canvas` … HUD・カード等の**文字を鮮明に描く高解像度オーバーレイ**（DPR対応）。
    UIの座標は480×270論理系のまま（`uiCtx.setTransform`でスケール）。文字がボヤけないための要。
- 固定タイムステップ 1/60秒（`engine/loop.js`）。
- **OS**: Windows。PowerShellはパスのスペースに注意（`PowerShell`ツールを使う）。Python 3.13 + Pillow 利用可。

### キャッシュ対策（重要・ハマりどころ）
- ブラウザがJS/画像を**強烈にキャッシュ**する。対策は2層:
  1. `serve.py` が `Cache-Control: no-store` を送る（`python -m http.server` は送らないので使わない）。
  2. URLにバージョンクエリ。**変更時は以下を全て同じ番号に上げる**:
     - `index.html` の `main.js?v=NN` と `style.css?v=NN`
     - `src/engine/sprites.js` の `ASSET_VERSION`（**画像を更新した時は必須**）
     - `src/ui/title.js` の `build vNN` 表示
- 「修正が反映されない」と言われたら**まずキャッシュを疑う**。`build vNN`表示が古ければキャッシュ、新しければ実バグ。

---

## 2. アセット（重要な経緯）

### 元素材（ユーザー提供、`assets/source/` と直下に原本）
- `download.png`→`players.png`（Dark Knight / Dark Mage）
- `download (1).png`→`enemies.png`（敵10種：番号付き「GHOSTS 'N GOBLINS ENEMY SHEET」）
- `download (2).png`→`weapons.png`（武器エフェクト）
- `download (3).png`→`items.png`（Gem/ポーション/アイコン）
- `download (4).png`→`tiles.png`（背景・タイル素材）
- `Stage1〜5.png` … **各ステージの横長一枚背景**（2688×1152）→ `assets/backgrounds/stage1〜5.png`

### スプライト抽出（`tools/` のPythonスクリプト）
- 元シートは**ラベル文字・装飾枠・パレット見本が混在するショーケース型**。これが諸問題の元凶だった。
- `tools/segment.py` … 背景(黒)に対する境界検出ユーティリティ。
- `tools/extract_sprites.py` / `extract_sprites2.py` … 初期抽出（座標手動調整）。
- `tools/extract_enemies_clean.py` … 敵のラベル混入を除去する再抽出。
- 抽出物は `assets/sprites/`（59ファイル、命名は下記参照）。

#### 抽出で繰り返しハマった点（次も注意）
1. **ラベル文字の混入** → フレーム0/1で文字が変化し「点滅」して見える。y範囲をラベル下に絞る。
2. **隣接スプライトの巻き込み** → 例: werewolf_1がgargoyleを巻き込み点滅。**列密度スキャンでゼロ間隙を見つけて境界確定**するのが確実。
3. **左右の切れ** → x範囲が狭いと右半分が欠ける（ghostで発生）。列密度で実content範囲を確認。
4. **点線の装飾枠** → 連結成分フィルタ（小blob除去）で消す。
- スプライトの抽出をやり直す時は、**列密度スキャン → ルーラー付きクロップを画像で目視 → 抽出 → モンタージュで再確認**の手順を踏むこと。

#### スプライト命名規則
```
player_knight_{idle,walk0,walk1,walk2,jump,attack}
player_mage_{idle,walk0,walk1,walk2,jump,cast}
enemy_{zombie,skeleton,bat,ghost,devil,werewolf,gargoyle,dragon,dracula}_{0,1}  (dragon/dracula は _0,_1,_2)
enemy_boss_{0,1}   ← ラージデーモン（10番）。_0=メイス立ち, _1=火炎ブレス
fx_{sword,spear,axe,fireball,lightning,dagger}_0   ← 各1枚ストリップ
item_gem_{red,blue,green}, item_potion, item_chest_{closed,open}, icon_{shield,wind,sword}
deco_{tree0,tree1,gravestone0,gravestone1,gravestone2}, tile_ground, bg_moon, bg_castle, bg_sky
```
- 背景は `getBackground(stage)` で `assets/backgrounds/stageN.png` をロード（`sprites.js`）。

#### 素材の向き（落とし穴）
- 描画は「**素材は右向き**」前提（`flip = !facingRight`）。
- **ドラゴンだけ左向き素材** → `enemies.js`で `faceLeft:true`、`enemy.js`で `flip = faceLeft ? facingRight : !facingRight`。
- 新しい左向き素材を足す時は `faceLeft:true` を付ける。
- ボス(デーモン)は前向き気味で、`boss.js`は自然アスペクト比で**足元中心・高さ120px**に大きく描画。

---

## 3. ファイル構成と責務

```
index.html        … 2canvas構成 + no-cache meta + ?v=NN
serve.py          … no-cacheヘッダ付き開発サーバー（推奨）
serve.bat         … python serve.py を呼ぶ
css/style.css     … レイアウト（スケールはJS側）
src/
  main.js         … 状態機械(TITLE/PLAYING/LEVELUP/GAMEOVER)・背景スクロール・ステージ進行・ループ配線
  engine/
    loop.js       … 固定タイムステップ
    input.js      … キー入力（←/A,→/D, Space/Enter, 1-4）
    camera.js     … プレイヤー追従
    sprites.js    … 画像ロード＋drawSprite/drawSpriteTinted＋getBackground。ASSET_VERSIONここ
    animation.js  … フレームアニメ
    audio.js      … Web Audio効果音 ＋ BGM(initBGM/startBGM, Clockwork_Catacomb.mp3)
  entities/
    player.js     … 移動/重力/ジャンプ/被弾/再生, charId別(knight/mage), xpForLevel()
    enemy.js      … 雑魚・中ボス共通。defenseMul(防御オーラ被適用), ranged, faceLeft, isMidBoss
    boss.js       … ラージデーモン。fireBreath(pendingFireBreath), getAura(), phase2突進
    projectile.js … プレイヤー武器の弾
    pickup.js     … Gem(磁力吸引)/ポーション
  systems/
    spawner.js    … 動的難易度＋時間/ステージ補正、ボス(5分)、中ボス不定期、難易度倍率適用
    combat.js     … 自動攻撃/当たり判定/AoE武器/敵弾/防御オーラ計算/炎フィールド/エフェクト
    leveling.js   … XP→レベル→カード
  ui/
    hud.js        … HP/XP/タイマー/撃破/Gem/ステージ/難易度/強度インジケータ
    levelup.js    … 日本語スキルカード3枚（uiCtxに鮮明描画）
    title.js      … タイトル→キャラ選択→難易度選択。右下に build vNN
    gameover.js   … ゲームオーバー/全クリア勝利
  data/
    weapons.js    … 武器6種 + AoE(thunder=落雷, holynova=聖光波)
    enemies.js    … 敵9種 + MIDBOSS_DEF(中ボスdemon)。ranged/faceLeft/isMidBoss/aura
    upgrades.js   … スキルカード18種(日本語)。カテゴリ: 武器解放/全体攻撃/武器強化/ステータス
    difficulty.js … 4難易度(初心者/中級/上級/ナイトメア) + 動的難易度パラメータ
    stages.js     … 全5ステージ定義, BOSS_SPAWN_TIME=300(5分), stageForTime
```

---

## 4. ゲーム仕様の現状（v12時点）

### 操作 / フロー
- 移動 `←/A` `→/D`、ジャンプ `Space/Enter`、**攻撃は自動**。
- タイトル → **キャラ選択**(Knight HP120/剣, Mage HP80/火球・攻撃速い) → **難易度選択** → ゲーム。
- レベルアップ時に時間停止、**スキルカード3枚**(`←→`/`1-3`/Enter)。
- カード選択UI・HUDは日本語・大きめフォント・鮮明（ui-canvas）。

### ステージ / ボス
- **時間自動切替はしない**。各ステージ開始から **5分(`BOSS_SPAWN_TIME=300`)でラージデーモン出現** → **撃破で次ステージ**。
- 全5ステージ。ステージ5のボス撃破で**勝利**。全ボスは現状ラージデーモン共通。
- ボス出現10秒前に予告バナー。
- **ラージデーモン**: 基礎HP `BOSS_BASE_HP=32000` ×難易度hpMul×ステージ(1+(stage-1)*0.4)。
  - **ファイアブレス**: 約5秒毎、プレイヤー方向に扇状の**地面炎**(10〜14個)を生成。触れると0.4秒毎に大ダメージ(20/26)。`boss.js`が`pendingFireBreath`をセット→`main.js`が`combat.spawnFireField()`。
  - **防御オーラ**: 生存中、画面全体の敵の被ダメージを最大70%軽減。**ボスHP比で減衰**（`getAura()`）。
- **中ボス(demon, `MIDBOSS_DEF`)**: 各ステージ中に**不定期出現**(初回45-75s, 以降50-100s)。`enemies`配列管理（倒してもステージは進まない）。**ファイアボール発射**＋**防御オーラ(最大40%/範囲170px)**。基礎HP1400。

### 難易度（`difficulty.js`）= 静的倍率 ＋ 動的難易度
- 静的: hpMul/dmgMul/speedMul/spawnMul（初心者は基準、上位ほど高い。初心者はdmgMul0.85で攻撃弱め）。
- **動的難易度(intensity)**: `spawner.updateIntensity()` が**プレイヤーHPの増減を常時監視**。
  - 無傷・好調(HP>85%)→intensity上昇→敵が強く・多く・速く。
  - 被弾・劣勢(HP<50%)→intensity低下→敵が弱く・少なく。
  - 反応の鋭さ/上限は難易度別（初心者=緩やか/上限1.25、ナイトメア=過激/上限2.8）。
  - HUD右上に「強度 xN.NN」表示（緑→赤）。
- 時間上昇は `rampRate`（緩やか）＋ステージ補正(1+(stage-1)*0.25)。
- **敵のステータススケーリングは spawner.spawnEnemy に一元化**（enemy.jsは基礎値, scale=1で生成）。二重適用に注意。

### 防御オーラの仕組み（`combat.applyDefenseAuras`）
- 毎フレーム全敵の`defenseMul`を再計算。オーラ源=ボス(getAura)＋中ボス(auraStrength×HP比)。
- 範囲内の敵は `defenseMul = 1 - 最大オーラ`。`enemy.takeDamage`が`defenseMul`を乗算。
- 発生源自身は自分のオーラ対象外。青い盾エフェクト表示。

### XP曲線（`player.xpForLevel`）
- `50 + 18*level + 12*level^2`（二次）。**レベルが上がるほど必要XP急増**＝後半レベルアップ頻度低下（アクション性維持）。

### 武器（`weapons.js`）/ スキル（`upgrades.js`）
- 近接: sword, axe ／ 遠隔: spear(貫通), fireball, lightning(貫通), dagger(連射)
- **全体攻撃(AoE)**: `thunder`(落雷=ランダム複数体に範囲雷撃), `holynova`(聖光波=画面内全体)
- スキルカード18種。`unlock`系は所持済み武器を除外して提示。

---

## 5. これまでの主要な修正履歴（同じ轍を踏まないため）

- 敵フレームのラベル文字混入による点滅 → ラベル除外y範囲で全敵再抽出。
- ボススプライトのミスクロップ → ラージデーモン(#10)を正しく再抽出。`enemy_boss_0/1`。
- ゴーストの欠け → x範囲が狭く右側が切れていた → content範囲を計測して再抽出。
- 狼男の点滅 → werewolf_1がgargoyleを巻き込み → ゼロ間隙で境界確定し再抽出。
- ドラゴンが後ろ向き → 素材が左向き → `faceLeft:true`。
- 背景の矛盾（パーツ合成で木が空に浮く等）→ **ステージ横長一枚絵のミラータイリング・スクロール**に刷新。
- UI文字のボヤけ → **ui-canvas(高解像度オーバーレイ)** 導入。
- 被弾時の白い箱フラッシュ → `drawSpriteTinted`でシルエットのみ淡く着色。
- 初心者が鬼畜 → 時間上昇を緩和＋HP連動の動的難易度導入。
- ボスのファイアブレスが届かない → **地面炎上の広範囲攻撃**に変更。

---

## 6. 既知のTODO / 改善余地（次セッション候補）

- [ ] ステージ1〜4のボスは共通のラージデーモン（ステージ5は専用の最終ボスMagic Casterに刷新済 v13）。1〜4も個性付け余地あり。
- [ ] 最終ボスのバランス調整（`FINALBOSS_BASE_HP`・オーラ0.88・ブレス火力・オーブ連射数）。要プレイテスト。
- [ ] バランス調整は実プレイ依存（ボスHP・intensity係数・XP曲線・中ボス頻度）。要プレイテスト。
- [ ] ボスのHPバー・ラベルは game-canvas に描画（やや低解像度）。気になるならui-canvasへ移行可。
- [ ] サウンドはWeb Audio合成＋BGM1曲のみ。ボス専用BGM等の余地。
- [ ] モバイル/タッチ操作は未対応（PC前提）。
- [ ] 効果音: ファイアブレス/中ボス出現の専用SE未追加。
- [ ] 未使用コード: `stages.js` の `STAGE_DURATION`/`stageForTime`、`drawStars`/`STARS`/`BASE_DECOS`（背景刷新で不使用）。掃除候補。

---

## 7. 変更時のチェックリスト
1. コード編集 → `node --check <file>` で構文確認。
2. 画像を更新した → `ASSET_VERSION` を上げる。
3. ビルド番号を `index.html`(main.js/css ?v=) と `title.js`(build vNN) で揃えて上げる。
4. サーバー稼働確認 → `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/`。
5. ユーザーには「`Ctrl+F5` で build vNN を確認」と案内。
