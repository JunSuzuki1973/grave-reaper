// Leveling and skill application system

import { pickRandomUpgrades } from '../data/upgrades.js';
import { playLevelUp } from '../engine/audio.js';

export class LevelingSystem {
  constructor() {
    this.pendingLevelUps = 0;
    this.currentChoices = [];
  }

  update(player) {
    // Check for level up
    if (player.checkLevelUp()) {
      this.pendingLevelUps++;
      playLevelUp();
      return true; // Signal to pause game
    }
    return false;
  }

  prepareChoices(player) {
    this.currentChoices = pickRandomUpgrades(player, 3);
    return this.currentChoices;
  }

  applyUpgrade(index, player) {
    const upgrade = this.currentChoices[index];
    if (!upgrade) return;
    upgrade.apply(player);
    // 習得履歴を記録（最終ボスの弱体化魔法で剥がす対象）
    if (player.acquiredUpgrades) player.acquiredUpgrades.push(upgrade.id);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
  }

  hasPending() {
    return this.pendingLevelUps > 0;
  }
}
