// 戦闘システム：自動攻撃・当たり判定・ダメージ・AoE攻撃・エフェクト

import { Projectile } from '../entities/projectile.js';
import { WEAPON_DEFS } from '../data/weapons.js';
import { playAttack, playEnemyDeath, playLevelUp, playCurse } from '../engine/audio.js';
import { camera } from '../engine/camera.js';

const GROUND_Y = 240;

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function nearestEnemy(px, py, enemies) {
  let best = null, bestDist = Infinity;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.getCenterX() - px, dy = e.getCenterY() - py;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

function onScreen(e) {
  const cx = e.getCenterX();
  return cx > camera.x - 30 && cx < camera.x + camera.width + 30;
}

export class CombatSystem {
  constructor() {
    this.projectiles = [];
    this.enemyProjectiles = [];   // 敵の弾（プレイヤーを狙う）
    this.effects = [];            // 一時的な視覚エフェクト（雷・波動）
    this.fireZones = [];          // ボスのファイアブレスで地面に残る炎
    this.playerBurnCd = 0;        // 炎ダメージのティック間隔
    this.hexes = [];              // 最終ボスの弱体化魔法（テレグラフ→発動）
    this.pendingCurseNotice = false; // 弱体化が命中したフレームに立つ（main がバナー表示）
  }

  update(dt, player, enemies, bosses, pickups) {
    if (player.dead) return;

    const allEnemies = [...enemies, ...bosses];

    // 防御オーラ（ボス・中ボスが周囲の敵を硬くする）
    this.applyDefenseAuras(enemies, bosses);

    this.handleWeaponFire(dt, player, allEnemies);
    this.handleEnemyFire(dt, player, enemies);
    this.updateEnemyProjectiles(dt, player);
    this.updateFireZones(dt, player);
    this.updateHexes(dt, player);

    // 投射物の更新
    for (const proj of this.projectiles) proj.update(dt);

    // 投射物 vs 敵
    for (const proj of this.projectiles) {
      if (proj.dead) continue;
      for (const enemy of allEnemies) {
        if (enemy.dead) continue;
        if (proj.alreadyHit && proj.alreadyHit(enemy)) continue;
        if (overlaps(proj.getBounds(), enemy.getBounds())) {
          enemy.takeDamage(proj.damage);
          if (enemy.dead) playEnemyDeath();
          proj.onHitEnemy(enemy);
          if (proj.dead) break;
        }
      }
    }

    // エフェクトの寿命管理
    for (const fx of this.effects) fx.t += dt;
    this.effects = this.effects.filter(fx => fx.t < fx.dur);

    // プレイヤー vs 敵（被ダメージ）
    const playerBounds = player.getBounds();
    for (const enemy of allEnemies) {
      if (enemy.dead) continue;
      if (overlaps(playerBounds, enemy.getBounds())) player.takeDamage(enemy.damage);
    }

    // ピックアップ
    const gemRange = player.gemRange;
    const px = player.getCenterX(), py = player.getCenterY();
    for (const pickup of pickups.gems) {
      if (pickup.dead) continue;
      pickup.update(dt, px, py, gemRange);
      if (pickup.dead) player.gainXP(pickup.xpValue);
    }
    for (const pickup of pickups.potions) {
      if (pickup.dead) continue;
      pickup.update(dt);
      if (overlaps(playerBounds, pickup.getBounds())) pickup.collect(player);
    }

    this.projectiles = this.projectiles.filter(p => !p.dead);
    pickups.gems = pickups.gems.filter(g => !g.dead);
    pickups.potions = pickups.potions.filter(p => !p.dead);
  }

  // 遠隔攻撃する敵が画面内でプレイヤーへ弾を発射
  handleEnemyFire(dt, player, enemies) {
    const px = player.getCenterX(), py = player.getCenterY();
    for (const e of enemies) {
      if (e.dead || !e.ranged) continue;
      e.shootTimer -= dt;
      if (e.shootTimer > 0) continue;
      e.shootTimer = e.shootCd;
      if (!onScreen(e)) continue;            // 画面外の敵は撃たない
      const ex = e.getCenterX(), ey = e.getCenterY();
      let dx = px - ex, dy = py - ey;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      this.enemyProjectiles.push({
        x: ex, y: ey,
        vx: dx * e.projSpeed, vy: dy * e.projSpeed,
        r: 6, dmg: e.projDmg, color: e.projColor,
        life: 4,
      });
    }
  }

  updateEnemyProjectiles(dt, player) {
    const pb = player.getBounds();
    for (const p of this.enemyProjectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      // プレイヤーへの命中（円 vs 矩形を簡易にAABBで）
      if (p.x > pb.x && p.x < pb.x + pb.w && p.y > pb.y && p.y < pb.y + pb.h) {
        player.takeDamage(p.dmg);
        p.life = 0;
      }
      if (p.y > 280 || p.y < -40) p.life = 0;
    }
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p.life > 0);
  }

  // ── 防御オーラ：ボス・中ボスが周囲(または全体)の敵を硬くする ──
  applyDefenseAuras(enemies, bosses) {
    // オーラ源を収集（ラージデーモン=強、中ボス=弱、HP比で減衰）
    const sources = [];
    for (const b of bosses) {
      if (b.dead) continue;
      if (typeof b.getAura === 'function') {
        sources.push({ x: b.getCenterX(), y: b.getCenterY(), aura: b.getAura(), range: b.auraRange || 9999 });
      }
    }
    for (const e of enemies) {
      if (e.dead || !e.isMidBoss) continue;
      const aura = e.auraStrength * Math.max(0, e.hp / e.maxHp);
      sources.push({ x: e.getCenterX(), y: e.getCenterY(), aura, range: e.auraRange || 160, self: e });
    }

    for (const e of enemies) {
      if (e.dead) continue;
      let best = 0;                         // 最大のオーラ軽減量を採用
      for (const s of sources) {
        if (s.self === e) continue;         // 自分自身のオーラでは硬くならない
        const dx = e.getCenterX() - s.x, dy = e.getCenterY() - s.y;
        if (dx * dx + dy * dy <= s.range * s.range) best = Math.max(best, s.aura);
      }
      e.defenseMul = 1 - best;              // 例: aura0.7 → 被ダメージ30%
    }
  }

  // ── ボスのファイアブレス：広範囲に地面炎を生成 ──
  // req.final（最終ボス）はラージデーモンより広範囲・高火力。
  spawnFireField(req) {
    // プレイヤー方向を中心に広く焼く。複数の炎パッチを横に並べる。
    const baseX = req.fromX;
    const reach = req.final ? 460 : 360;     // 火炎の到達幅
    const dir = req.dir;
    const patches = req.final ? (req.phase2 ? 20 : 16)
                              : (req.phase2 ? 14 : 10);
    const life = req.final ? 6.5 : (req.phase2 ? 6.0 : 4.5);
    const dmg = req.final ? (req.phase2 ? 40 : 32)
                          : (req.phase2 ? 26 : 20);
    for (let i = 0; i < patches; i++) {
      const t = i / (patches - 1);
      // ボス前方へ扇状に。プレイヤー位置もカバー。
      const x = baseX + dir * (40 + t * reach) + (Math.random() - 0.5) * 30;
      this.fireZones.push({
        x: x - 22, y: GROUND_Y - 30, w: 44, h: 40,
        life: life + Math.random() * 0.8,
        ignite: i * 0.05,         // 着火ディレイ（手前から燃え広がる）
        t: 0,
        dmg,
      });
    }
  }

  // ── 最終ボスの闇のオーブ連射：プレイヤー方向へ扇状の弾幕 ──
  spawnBossVolley(req) {
    const { fromX, fromY, toX, toY, count, spread, speed, dmg, color } = req;
    const baseAng = Math.atan2(toY - fromY, toX - fromX);
    for (let i = 0; i < count; i++) {
      const off = count > 1 ? (i - (count - 1) / 2) * (spread / (count - 1)) : 0;
      const a = baseAng + off;
      this.enemyProjectiles.push({
        x: fromX, y: fromY,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: 8, dmg, color: color || '#cc55ff',
        life: 5,
      });
    }
  }

  // ── 最終ボスの弱体化魔法：指定位置に魔法陣を出し、テレグラフ後に発動 ──
  // 発動時にプレイヤーが範囲内なら applyCurse（レベル＆スキル低下）。
  spawnHex(req) {
    this.hexes.push({
      x: req.x, y: req.y,
      r: req.radius || 85,
      t: 0,
      telegraph: req.telegraph || 1.3,
      resolved: false,
    });
  }

  updateHexes(dt, player) {
    for (const h of this.hexes) {
      h.t += dt;
      if (!h.resolved && h.t >= h.telegraph) {
        h.resolved = true;
        const dx = player.getCenterX() - h.x;
        const dy = player.getCenterY() - h.y;
        if (dx * dx + dy * dy <= h.r * h.r) {
          player.applyCurse();
          this.pendingCurseNotice = true;
          playCurse();
        }
      }
    }
    // 発動後 0.5秒だけ余韻を残して消す
    this.hexes = this.hexes.filter(h => h.t < h.telegraph + 0.5);
  }

  updateFireZones(dt, player) {
    this.playerBurnCd -= dt;
    const pb = player.getBounds();
    for (const f of this.fireZones) {
      f.t += dt;
      if (f.t < f.ignite) continue;          // まだ着火していない
      f.life -= dt;
      // プレイヤーが炎に触れたら大ダメージ（0.4秒ごとのティック）
      if (this.playerBurnCd <= 0 &&
          overlaps(pb, { x: f.x, y: f.y, w: f.w, h: f.h })) {
        player.takeDamage(f.dmg);
        this.playerBurnCd = 0.4;
      }
    }
    this.fireZones = this.fireZones.filter(f => f.life > 0);
  }

  handleWeaponFire(dt, player, enemies) {
    for (const weaponId of player.unlockedWeapons) {
      const wDef = WEAPON_DEFS[weaponId];
      if (!wDef) continue;

      player.weaponCooldowns[weaponId] = (player.weaponCooldowns[weaponId] || 0);
      player.weaponCooldowns[weaponId] -= dt * player.attackSpeedMultiplier;

      if (player.weaponCooldowns[weaponId] <= 0) {
        player.weaponCooldowns[weaponId] = wDef.cooldown;
        if (wDef.type === 'strike')      this.fireStrike(wDef, player, enemies);
        else if (wDef.type === 'nova')   this.fireNova(wDef, player, enemies);
        else                             this.fireWeapon(wDef, player, enemies);
      }
    }
  }

  // 範囲ダメージを与えるヘルパー
  areaDamage(cx, cy, radius, dmg, enemies) {
    const r2 = radius * radius;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.getCenterX() - cx, dy = e.getCenterY() - cy;
      if (dx * dx + dy * dy <= r2) {
        e.takeDamage(dmg);
        if (e.dead) playEnemyDeath();
      }
    }
  }

  // ── 落雷：画面内のランダムな敵に天から雷を落とす ──
  fireStrike(def, player, enemies) {
    const dmg = Math.floor(def.damage * player.damageMultiplier);
    const radius = def.radius * (player.rangeMultiplier || 1);
    const targets = enemies.filter(e => !e.dead && onScreen(e));

    const n = Math.min(def.strikes + (player.multiShot - 1), Math.max(1, targets.length));
    const chosen = [];
    if (targets.length > 0) {
      const pool = targets.slice();
      for (let i = 0; i < n && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        chosen.push(pool.splice(idx, 1)[0]);
      }
    } else {
      // 敵がいなければプレイヤー前方へ落とす
      chosen.push({ getCenterX: () => player.getCenterX() + (player.facingRight ? 60 : -60), getCenterY: () => GROUND_Y });
    }

    for (const t of chosen) {
      const x = t.getCenterX();
      const y = t.getCenterY ? t.getCenterY() : GROUND_Y;
      this.areaDamage(x, y, radius, dmg, enemies);
      this.effects.push({ type: 'strike', x, y, radius, t: 0, dur: 0.35 });
    }
    playAttack();
  }

  // ── 聖光波：プレイヤー中心の全体ダメージ ──
  fireNova(def, player, enemies) {
    const dmg = Math.floor(def.damage * player.damageMultiplier);
    const radius = def.radius * (player.rangeMultiplier || 1);
    const cx = player.getCenterX(), cy = player.getCenterY();
    this.areaDamage(cx, cy, radius, dmg, enemies);
    this.effects.push({ type: 'nova', x: cx, y: cy, radius, t: 0, dur: 0.45 });
    playLevelUp(); // 明るいアルペジオを流用
  }

  fireWeapon(wDef, player, enemies) {
    const px = player.getCenterX(), py = player.getCenterY();
    const nearest = nearestEnemy(px, py, enemies);

    let dx, dy;
    if (nearest) {
      dx = nearest.getCenterX() - px; dy = nearest.getCenterY() - py;
      const dist = Math.hypot(dx, dy) || 1;
      dx /= dist; dy /= dist;
    } else {
      dx = player.facingRight ? 1 : -1; dy = 0;
    }

    const speed = wDef.speed;
    const shots = player.multiShot;
    const isMain = player.unlockedWeapons[0] === wDef.id;

    if (wDef.id === 'axe') {
      const vx = (player.facingRight ? 1 : -1) * speed * 0.7;
      this.projectiles.push(new Projectile(px, py, vx, -speed * 0.7, wDef, player));
      playAttack();
      return;
    }

    if (isMain && shots > 1) {
      const spread = 0.3;
      for (let i = 0; i < shots; i++) {
        const off = (i - (shots - 1) / 2) * spread;
        const cos = Math.cos(off), sin = Math.sin(off);
        const vx = (dx * cos - dy * sin) * speed;
        const vy = (dx * sin + dy * cos) * speed;
        this.projectiles.push(new Projectile(px, py, vx, vy, wDef, player));
      }
    } else {
      this.projectiles.push(new Projectile(px, py, dx * speed, dy * speed, wDef, player));
    }
    playAttack();
  }

  draw(ctx, camX) {
    this.drawFireZones(ctx, camX);
    this.drawHexes(ctx, camX);
    for (const proj of this.projectiles) proj.draw(ctx, camX);
    this.drawEnemyProjectiles(ctx, camX);
    this.drawEffects(ctx, camX);
  }

  // 弱体化魔法の魔法陣：テレグラフ中は脈動する紫の輪、発動時に閃光
  drawHexes(ctx, camX) {
    for (const h of this.hexes) {
      const sx = h.x - camX;
      const sy = h.y;
      if (!h.resolved) {
        const p = h.t / h.telegraph;             // 0→1 充填
        ctx.save();
        // 外周リング
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(h.t * 18);
        ctx.strokeStyle = '#cc55ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, h.r, 0, Math.PI * 2);
        ctx.stroke();
        // 充填していく内側リング（発動タイミングの予告）
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ff99ff';
        ctx.beginPath();
        ctx.arc(sx, sy, h.r * p, 0, Math.PI * 2);
        ctx.stroke();
        // 内部の薄い塗り
        ctx.globalAlpha = 0.12 + 0.12 * p;
        ctx.fillStyle = '#8800cc';
        ctx.beginPath();
        ctx.arc(sx, sy, h.r, 0, Math.PI * 2);
        ctx.fill();
        // ルーン的な十字
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#ddaaff';
        ctx.beginPath();
        ctx.moveTo(sx - h.r, sy); ctx.lineTo(sx + h.r, sy);
        ctx.moveTo(sx, sy - h.r); ctx.lineTo(sx, sy + h.r);
        ctx.stroke();
        ctx.restore();
      } else {
        // 発動の閃光（余韻でフェード）
        const f = Math.max(0, 1 - (h.t - h.telegraph) / 0.5);
        ctx.save();
        ctx.globalAlpha = 0.7 * f;
        ctx.fillStyle = '#dd66ff';
        ctx.beginPath();
        ctx.arc(sx, sy, h.r * (1 + (1 - f) * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawFireZones(ctx, camX) {
    for (const f of this.fireZones) {
      if (f.t < f.ignite) continue;
      const sx = f.x - camX;
      // 寿命に応じて明滅する炎（複数の揺らめく舌）
      const fade = Math.min(1, f.life / 1.2);
      const flick = 0.7 + Math.random() * 0.3;
      ctx.save();
      ctx.globalAlpha = fade * 0.85;
      // 下の濃い赤
      ctx.fillStyle = '#7a1500';
      ctx.fillRect(sx, f.y + f.h * 0.6, f.w, f.h * 0.4);
      // 炎の舌
      const tongues = 4;
      for (let i = 0; i < tongues; i++) {
        const tx = sx + (i + 0.5) * (f.w / tongues);
        const fh = f.h * (0.6 + Math.random() * 0.4) * flick;
        const fw = f.w / tongues * 0.9;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(tx - fw / 2, f.y + f.h);
        ctx.quadraticCurveTo(tx, f.y + f.h - fh * 1.2, tx + fw / 2, f.y + f.h);
        ctx.fill();
        ctx.fillStyle = '#ffaa22';
        ctx.beginPath();
        ctx.moveTo(tx - fw / 4, f.y + f.h);
        ctx.quadraticCurveTo(tx, f.y + f.h - fh * 0.7, tx + fw / 4, f.y + f.h);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawEnemyProjectiles(ctx, camX) {
    for (const p of this.enemyProjectiles) {
      const sx = p.x - camX, sy = p.y;
      // 光るオーブ（外周グロー＋芯）
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, p.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawEffects(ctx, camX) {
    for (const fx of this.effects) {
      const p = fx.t / fx.dur;        // 0→1
      const sx = fx.x - camX;
      if (fx.type === 'strike') {
        // 天から着弾点へ伸びる雷柱（点滅しながらフェード）
        const alpha = (1 - p) * (Math.random() > 0.4 ? 1 : 0.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        // 縦に細長い雷ビーム
        const beamW = 14 + Math.sin(fx.t * 60) * 3;
        const grad = ctx.createLinearGradient(sx, 0, sx, fx.y);
        grad.addColorStop(0, 'rgba(200,235,255,0.9)');
        grad.addColorStop(1, 'rgba(120,170,255,0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - beamW / 2, 0, beamW, fx.y);
        // 着弾点の閃光リング
        ctx.strokeStyle = 'rgba(220,240,255,' + (1 - p) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, fx.y, fx.radius * (0.5 + p * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (fx.type === 'nova') {
        // プレイヤー中心の拡がる光輪
        const sy = fx.y;
        const r = fx.radius * p;
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.85;
        ctx.strokeStyle = '#ffe9a8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (1 - p) * 0.25;
        ctx.fillStyle = '#fff4cc';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
