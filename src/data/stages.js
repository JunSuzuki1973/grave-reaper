// 全5ステージ。ステージは生存時間で進行し、背景が切り替わる。
// ラージデーモン（ボス）は7分(420秒)生存で出現し、撃破で全クリア。

export const STAGE_DURATION = 60;     // （未使用）参考値
export const BOSS_SPAWN_TIME = 300;   // 各ステージ開始から5分でボス出現

export const STAGES = [
  { num: 1, name: '呪われた墓地',   bg: 1 },
  { num: 2, name: '亡者の森',       bg: 2 },
  { num: 3, name: '魔城の城門',     bg: 3 },
  { num: 4, name: '魔城・大広間',   bg: 4 },
  { num: 5, name: '魔王の玉座',     bg: 5, final: true },
];

export const NUM_STAGES = STAGES.length;

export function getStage(num) {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, num - 1))];
}

// 生存時間から現在のステージ番号（1..5）を算出
export function stageForTime(elapsed) {
  return Math.min(NUM_STAGES, Math.floor(elapsed / STAGE_DURATION) + 1);
}
