// 敵スポナー：緩やかな時間上昇 ＋ プレイヤーHPに応じた動的難易度。
//
// ・timeFactor : ステージ内経過時間で緩やかに上昇（rampRate で速さ調整）
// ・intensity  : プレイヤーが無傷だと上昇、被弾すると低下（難易度ごとに反応差）
// ・最終強度 = timeFactor × ステージ補正 × intensity × 難易度倍率

import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { FinalBoss } from '../entities/finalboss.js';
import { getAvailableEnemyTypes, MIDBOSS_DEF } from '../data/enemies.js';
import { BOSS_SPAWN_TIME, NUM_STAGES } from '../data/stages.js';
import { camera } from '../engine/camera.js';

const SPAWN_MARGIN = 40;
const BASE_SPAWN_INTERVAL = 1.9;
const MIN_SPAWN_INTERVAL = 0.4;
const BOSS_BASE_HP = 32000;   // ラージデーモンの基礎HP（難易度・ステージで更に増加）
const FINALBOSS_BASE_HP = 350000; // 最終ボス基礎HP（難易度で増加。後半はプレイヤーが高Lvなので高め。要調整）
const SUMMON_DEMON_HP = 14000;    // 最終ボスが召喚するラージデーモン（手下）の基礎HP

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export class Spawner {
  constructor(difficulty) {
    this.diff = difficulty || {
      hpMul: 1, dmgMul: 1, speedMul: 1, spawnMul: 1,
      rampRate: 0.003, intensityMax: 1.25, adaptUp: 0.06, adaptDown: 0.3,
    };
    this.spawnTimer = 0;
    this.spawnInterval = BASE_SPAWN_INTERVAL;
    this.bossSpawned = false;
    this.stage = 1;
    this.intensity = 1.0;     // 動的難易度（HP状況で増減）
    this.lastHp = null;
    this.difficultyScale = 1;
    this.midbossTimer = this._nextMidbossDelay(true);
  }

  // 中ボス出現までの待ち時間（初回は長め、その後は不定期）
  _nextMidbossDelay(first) {
    return first ? 45 + Math.random() * 30      // 初回 45〜75秒
                 : 50 + Math.random() * 50;     // 以降 50〜100秒
  }

  resetForNewStage(stage) {
    this.bossSpawned = false;
    this.stage = stage;
    this.midbossTimer = this._nextMidbossDelay(true);
    // 次ステージでは少しだけ落ち着かせる
    this.intensity = clamp(this.intensity * 0.85, 0.8, this.diff.intensityMax);
  }

  // プレイヤーHPの推移から intensity を更新
  updateIntensity(dt, player) {
    const d = this.diff;
    if (this.lastHp === null) this.lastHp = player.hp;
    const hpRatio = player.hp / player.maxHp;
    const tookDamage = player.hp < this.lastHp - 0.01;

    if (tookDamage) {
      // 被弾＝苦しい兆候。即座に少し下げる（敵を弱める）
      this.intensity -= d.adaptDown * 0.6;
    }
    if (hpRatio > 0.85) {
      // 余裕あり → ジリジリ強化
      this.intensity += d.adaptUp * dt;
    } else if (hpRatio < 0.5) {
      // 劣勢 → 徐々に緩める
      this.intensity -= d.adaptDown * dt;
    }
    this.intensity = clamp(this.intensity, 0.7, d.intensityMax);
    this.lastHp = player.hp;
  }

  update(dt, stageElapsed, enemies, bosses, player, totalEnemyTime) {
    const level = player ? player.level : 1;
    const d = this.diff;

    if (player) this.updateIntensity(dt, player);

    // 緩やかな時間上昇 ＋ ステージ補正 ＋ 動的強度
    const timeFactor = 1 + stageElapsed * d.rampRate;
    const stageBonus = 1 + (this.stage - 1) * 0.25;
    this.difficultyScale = timeFactor * stageBonus * this.intensity;

    // 出現間隔（intensity が高いほど短く）
    this.spawnInterval = clamp(
      BASE_SPAWN_INTERVAL - stageElapsed * 0.0015 * (this.stage) - (this.intensity - 1) * 0.6,
      MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL
    );

    // 同時出現数（intensity・ステージ・難易度 spawnMul で増減）
    let spawnCount = 1 + Math.floor(stageElapsed / 70) + (this.stage - 1);
    spawnCount = Math.round(spawnCount * this.intensity * d.spawnMul);
    spawnCount = clamp(spawnCount, 1, 9);

    const isFinalStage = this.stage >= NUM_STAGES;

    // 中ボス（デーモン）：通常ステージのみ不定期出現。最終ステージはラスボスに集中。
    if (!this.bossSpawned && !isFinalStage) {
      this.midbossTimer -= dt;
      if (this.midbossTimer <= 0) {
        this.spawnMidBoss(enemies);
        this.midbossTimer = this._nextMidbossDelay(false);
      }
    }

    // ボス出現：通常ステージは開始5分後。最終ステージは突入と同時にラスボス降臨。
    const bossDue = isFinalStage ? 0 : BOSS_SPAWN_TIME;
    if (!this.bossSpawned && stageElapsed >= bossDue && bosses.length === 0) {
      if (isFinalStage) {
        this.spawnFinalBoss(bosses);
      } else {
        this.spawnBoss(bosses);
        // ラージデーモンは中ボスを数体引き連れて出現
        const minions = 2 + Math.floor((this.stage - 1) / 2);  // stage1:2 〜 stage4:3
        for (let i = 0; i < minions; i++) this.spawnMidBoss(enemies);
      }
      this.bossSpawned = true;
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      const count = this.bossSpawned ? Math.max(1, Math.floor(spawnCount / 2)) : spawnCount;
      for (let i = 0; i < count; i++) this.spawnEnemy(enemies, totalEnemyTime);
    }
  }

  spawnEnemy(enemies, totalEnemyTime) {
    const available = getAvailableEnemyTypes(totalEnemyTime);
    if (available.length === 0) return;
    const def = available[Math.floor(Math.random() * available.length)];

    const fromRight = Math.random() > 0.5;
    const spawnX = fromRight
      ? camera.x + camera.width + SPAWN_MARGIN + Math.random() * 60
      : camera.x - SPAWN_MARGIN - def.width - Math.random() * 60;
    const spawnY = def.flying ? 70 + Math.random() * 110 : 240 - def.height;

    const e = new Enemy(spawnX, spawnY, def, 1);   // base stats; scale below
    const s = this.difficultyScale;
    // HPは強度にしっかり比例、攻撃・速度は緩やかに（理不尽さ回避）
    e.hp = Math.max(1, Math.floor(def.hp * s * this.diff.hpMul));
    e.maxHp = e.hp;
    e.damage = Math.max(1, Math.floor(def.damage * (1 + (s - 1) * 0.5) * this.diff.dmgMul));
    e.speed = def.speed * (1 + (s - 1) * 0.15) * this.diff.speedMul;
    enemies.push(e);
  }

  // 中ボス（小型デーモン）を出現させる（enemies 配列へ＝倒してもステージは進まない）
  spawnMidBoss(enemies) {
    const def = MIDBOSS_DEF;
    const fromRight = Math.random() > 0.5;
    const spawnX = fromRight
      ? camera.x + camera.width + 50
      : camera.x - 50 - def.width;
    const spawnY = 240 - def.height;
    const e = new Enemy(spawnX, spawnY, def, 1);
    const stageMul = 1 + (this.stage - 1) * 0.35;
    e.hp = Math.floor(def.hp * this.diff.hpMul * stageMul * (0.8 + this.intensity * 0.2));
    e.maxHp = e.hp;
    e.damage = Math.max(1, Math.floor(def.damage * this.diff.dmgMul));
    e.projDmg = Math.max(1, Math.floor(def.projDmg * this.diff.dmgMul));
    enemies.push(e);
  }

  spawnBoss(bosses) {
    const fromRight = Math.random() > 0.5;
    const spawnX = fromRight
      ? camera.x + camera.width + 60
      : camera.x - 60 - 72;
    const stageMul = 1 + (this.stage - 1) * 0.4;
    const b = new Boss(spawnX, 240 - 72, 1);
    b.hp = Math.floor(BOSS_BASE_HP * this.diff.hpMul * stageMul);
    b.maxHp = b.hp;
    b.damage = Math.max(1, Math.floor(b.damage * this.diff.dmgMul * stageMul));
    bosses.push(b);
  }

  // 最終ボス（Magic Caster）：ステージ5突入と同時に画面内へ降臨
  spawnFinalBoss(bosses) {
    const spawnX = camera.x + camera.width * 0.72;   // 画面右手に登場
    const b = new FinalBoss(spawnX, 240 - 96, 1);
    b.hp = Math.floor(FINALBOSS_BASE_HP * this.diff.hpMul);
    b.maxHp = b.hp;
    b.damage = Math.max(1, Math.floor(b.damage * this.diff.dmgMul));
    bosses.push(b);
  }

  // 最終ボスが召喚するラージデーモン（手下）。bosses[] へ追加するが isSummon で
  // ステージ進行・勝利判定の対象外にする。同時召喚は最大2体。
  spawnSummonedDemon(bosses, source) {
    const alive = bosses.filter(b => b.isSummon && !b.dead).length;
    if (alive >= 2) return;
    const baseX = source ? source.getCenterX() : camera.x + camera.width / 2;
    const sx = baseX + (Math.random() < 0.5 ? -100 : 100);
    const b = new Boss(sx, 240 - 72, 1);
    b.isSummon = true;
    b.breathTimer = 1e9;        // 召喚デーモンはブレスしない（過負荷防止・近接の手下）
    const hp = Math.floor(SUMMON_DEMON_HP * this.diff.hpMul);
    b.hp = hp;
    b.maxHp = hp;
    b.damage = Math.max(1, Math.floor(b.damage * this.diff.dmgMul));
    bosses.push(b);
  }

  // HUD等のデバッグ表示用
  getIntensity() { return this.intensity; }
}
