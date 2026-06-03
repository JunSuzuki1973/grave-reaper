// Skill card / upgrade definitions

export const UPGRADE_DEFS = [
  // ── 武器解放 ──
  {
    id: 'unlock_spear',
    name: '聖なる槍',
    desc: '貫通する槍を習得',
    cat: '武器解放',
    icon: 'icon_sword',
    iconEmoji: '🏹',
    category: 'unlock',
    weaponId: 'spear',
    apply(state) {
      if (!state.unlockedWeapons.includes('spear')) {
        state.unlockedWeapons.push('spear');
        state.weaponCooldowns['spear'] = 0;
      }
    },
  },
  {
    id: 'unlock_axe',
    name: 'バトルアックス',
    desc: '重い斧を習得',
    cat: '武器解放',
    icon: 'icon_sword',
    iconEmoji: '🪓',
    category: 'unlock',
    weaponId: 'axe',
    apply(state) {
      if (!state.unlockedWeapons.includes('axe')) {
        state.unlockedWeapons.push('axe');
        state.weaponCooldowns['axe'] = 0;
      }
    },
  },
  {
    id: 'unlock_fireball',
    name: 'ファイアボール',
    desc: '炎の弾を習得',
    cat: '武器解放',
    icon: 'icon_sword',
    iconEmoji: '🔥',
    category: 'unlock',
    weaponId: 'fireball',
    apply(state) {
      if (!state.unlockedWeapons.includes('fireball')) {
        state.unlockedWeapons.push('fireball');
        state.weaponCooldowns['fireball'] = 0;
      }
    },
  },
  {
    id: 'unlock_lightning',
    name: 'ライトニング',
    desc: '貫通する電撃を習得',
    cat: '武器解放',
    icon: 'icon_sword',
    iconEmoji: '⚡',
    category: 'unlock',
    weaponId: 'lightning',
    apply(state) {
      if (!state.unlockedWeapons.includes('lightning')) {
        state.unlockedWeapons.push('lightning');
        state.weaponCooldowns['lightning'] = 0;
      }
    },
  },
  {
    id: 'unlock_dagger',
    name: '投げナイフ',
    desc: '連射できる短剣を習得',
    cat: '武器解放',
    icon: 'icon_sword',
    iconEmoji: '🗡️',
    category: 'unlock',
    weaponId: 'dagger',
    apply(state) {
      if (!state.unlockedWeapons.includes('dagger')) {
        state.unlockedWeapons.push('dagger');
        state.weaponCooldowns['dagger'] = 0;
      }
    },
  },

  // ── 全体攻撃（AoE）解放 ──
  {
    id: 'unlock_thunder',
    name: '落雷',
    desc: '天から雷が複数の敵を撃つ',
    cat: '全体攻撃',
    icon: 'icon_wind',
    iconEmoji: '🌩️',
    category: 'unlock',
    weaponId: 'thunder',
    apply(state) {
      if (!state.unlockedWeapons.includes('thunder')) {
        state.unlockedWeapons.push('thunder');
        state.weaponCooldowns['thunder'] = 0;
      }
    },
  },
  {
    id: 'unlock_holynova',
    name: '聖光波',
    desc: '画面内の敵全体に光の波動',
    cat: '全体攻撃',
    icon: 'icon_shield',
    iconEmoji: '💥',
    category: 'unlock',
    weaponId: 'holynova',
    apply(state) {
      if (!state.unlockedWeapons.includes('holynova')) {
        state.unlockedWeapons.push('holynova');
        state.weaponCooldowns['holynova'] = 0;
      }
    },
  },

  // ── 武器強化 ──
  {
    id: 'dmg_up',
    name: 'パワーアップ',
    desc: '全武器の威力 +20%',
    cat: '武器強化',
    icon: 'icon_sword',
    iconEmoji: '⚔️',
    category: 'weapon',
    apply(state) { state.damageMultiplier = (state.damageMultiplier || 1) * 1.2; },
  },
  {
    id: 'speed_up',
    name: 'ヘイスト',
    desc: '攻撃速度 +15%',
    cat: '武器強化',
    icon: 'icon_wind',
    iconEmoji: '💨',
    category: 'weapon',
    apply(state) { state.attackSpeedMultiplier = (state.attackSpeedMultiplier || 1) * 1.15; },
  },
  {
    id: 'multi_shot',
    name: 'マルチショット',
    desc: '主武器の弾を1発追加',
    cat: '武器強化',
    icon: 'icon_sword',
    iconEmoji: '✨',
    category: 'weapon',
    apply(state) { state.multiShot = (state.multiShot || 1) + 1; },
  },
  {
    id: 'range_up',
    name: 'ロングリーチ',
    desc: '全武器の射程 +30%',
    cat: '武器強化',
    icon: 'icon_sword',
    iconEmoji: '📏',
    category: 'weapon',
    apply(state) { state.rangeMultiplier = (state.rangeMultiplier || 1) * 1.3; },
  },
  {
    id: 'pierce',
    name: 'ピアシング',
    desc: '全武器に貫通を付与',
    cat: '武器強化',
    icon: 'icon_sword',
    iconEmoji: '🔱',
    category: 'weapon',
    apply(state) { state.allPiercing = true; },
  },

  // ── ステータス ──
  {
    id: 'max_hp_up',
    name: 'バイタリティ',
    desc: '最大HP +25',
    cat: 'ステータス',
    icon: 'icon_shield',
    iconEmoji: '❤️',
    category: 'stat',
    apply(state) {
      state.maxHp += 25;
      state.hp = Math.min(state.hp + 25, state.maxHp);
    },
  },
  {
    id: 'move_up',
    name: '俊足のブーツ',
    desc: '移動速度 +15%',
    cat: 'ステータス',
    icon: 'icon_wind',
    iconEmoji: '👟',
    category: 'stat',
    apply(state) { state.moveSpeedMultiplier = (state.moveSpeedMultiplier || 1) * 1.15; },
  },
  {
    id: 'defense_up',
    name: '鋼の肌',
    desc: '被ダメージ -15%',
    cat: 'ステータス',
    icon: 'icon_shield',
    iconEmoji: '🛡️',
    category: 'stat',
    apply(state) { state.defense = (state.defense || 0) + 0.15; },
  },
  {
    id: 'regen',
    name: 'ライフドレイン',
    desc: '毎秒HPを1回復',
    cat: 'ステータス',
    icon: 'icon_shield',
    iconEmoji: '💚',
    category: 'stat',
    apply(state) { state.regenPerSec = (state.regenPerSec || 0) + 1; },
  },
  {
    id: 'gem_range',
    name: 'マグネット',
    desc: 'ジェム取得範囲 +50%',
    cat: 'ステータス',
    icon: 'icon_wind',
    iconEmoji: '🧲',
    category: 'stat',
    apply(state) { state.gemRange = (state.gemRange || 60) * 1.5; },
  },
  {
    id: 'revive',
    name: 'セカンドライフ',
    desc: '死亡を1度だけ回避',
    cat: 'ステータス',
    icon: 'icon_shield',
    iconEmoji: '👼',
    category: 'stat',
    apply(state) { state.revives = (state.revives || 0) + 1; },
  },
  {
    id: 'xp_up',
    name: '賢者の知恵',
    desc: '獲得経験値 +25%',
    cat: 'ステータス',
    icon: 'icon_wind',
    iconEmoji: '📚',
    category: 'stat',
    apply(state) { state.xpMultiplier = (state.xpMultiplier || 1) * 1.25; },
  },
];

// 習得済みアップグレードを1つ巻き戻す（最終ボスの弱体化魔法で使用）。
// state は player。weaponの主武器(index0)は剥がさない。
export function revertUpgrade(id, s) {
  switch (id) {
    case 'unlock_spear':
    case 'unlock_axe':
    case 'unlock_fireball':
    case 'unlock_lightning':
    case 'unlock_dagger':
    case 'unlock_thunder':
    case 'unlock_holynova': {
      const def = UPGRADE_DEFS.find(u => u.id === id);
      const w = def && def.weaponId;
      if (w) {
        const i = s.unlockedWeapons.indexOf(w);
        if (i > 0) {                       // index0(主武器)は守る
          s.unlockedWeapons.splice(i, 1);
          delete s.weaponCooldowns[w];
        }
      }
      break;
    }
    case 'dmg_up':    s.damageMultiplier = Math.max(1, s.damageMultiplier / 1.2); break;
    case 'speed_up':  s.attackSpeedMultiplier = s.attackSpeedMultiplier / 1.15; break;
    case 'multi_shot':s.multiShot = Math.max(1, (s.multiShot || 1) - 1); break;
    case 'range_up':  s.rangeMultiplier = Math.max(1, s.rangeMultiplier / 1.3); break;
    case 'pierce':    s.allPiercing = false; break;
    case 'max_hp_up': s.maxHp = Math.max(20, s.maxHp - 25); s.hp = Math.min(s.hp, s.maxHp); break;
    case 'move_up':   s.moveSpeedMultiplier = s.moveSpeedMultiplier / 1.15; break;
    case 'defense_up':s.defense = Math.max(0, (s.defense || 0) - 0.15); break;
    case 'regen':     s.regenPerSec = Math.max(0, (s.regenPerSec || 0) - 1); break;
    case 'gem_range': s.gemRange = (s.gemRange || 60) / 1.5; break;
    case 'revive':    s.revives = Math.max(0, (s.revives || 0) - 1); break;
    case 'xp_up':     s.xpMultiplier = Math.max(1, s.xpMultiplier / 1.25); break;
  }
}

// Get available upgrades (filter out already-unlocked weapons)
export function getAvailableUpgrades(gameState) {
  return UPGRADE_DEFS.filter(u => {
    if (u.category === 'unlock' && gameState.unlockedWeapons.includes(u.weaponId)) {
      return false;
    }
    return true;
  });
}

// Pick 3 random unique upgrades
export function pickRandomUpgrades(gameState, count = 3) {
  const available = getAvailableUpgrades(gameState);
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
