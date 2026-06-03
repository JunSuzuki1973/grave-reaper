// 難易度設定。「初心者」を基準とし、上位ほど敵が強化される。
//
// 各値の意味:
//  hpMul/dmgMul/speedMul/spawnMul … 静的な基礎倍率（難易度の下限）
//  rampRate   … 時間経過で敵が強くなる速さ（小さいほど緩やか）
//  intensityMax … 動的難易度の上限（プレイヤーが無傷だとここまで上がる）
//  adaptUp    … 無傷・好調時に1秒あたり intensity が上がる量
//  adaptDown  … 被弾・劣勢時に1秒あたり intensity が下がる量
//
// 動的難易度: プレイヤーがダメージをほぼ受けていない（＝余裕がある）と
// 敵が強く・多くなり、HPが減って苦しい時は敵が弱く・少なくなる。
// その反応の強さを難易度ごとに変える（初心者は緩やか、ナイトメアは過激）。

export const DIFFICULTIES = [
  {
    id: 'beginner',
    name: '初心者',
    desc: ['基準・最も易しい', '上昇はとても緩やか', 'まずはここから'],
    color: '#7ee787',
    hpMul: 1.0, dmgMul: 0.85, speedMul: 1.0, spawnMul: 1.0,
    rampRate: 0.0030, intensityMax: 1.25, adaptUp: 0.06, adaptDown: 0.30,
  },
  {
    id: 'intermediate',
    name: '中級',
    desc: ['歯ごたえあり', '敵HP +40% / 攻撃 +15%', '上昇は標準的'],
    color: '#ffd24a',
    hpMul: 1.4, dmgMul: 1.15, speedMul: 1.08, spawnMul: 1.2,
    rampRate: 0.0055, intensityMax: 1.6, adaptUp: 0.14, adaptDown: 0.22,
  },
  {
    id: 'advanced',
    name: '上級',
    desc: ['熟練者向け', '敵HP +100% / 攻撃 +50%', '好調だと一気に強化'],
    color: '#ff8c42',
    hpMul: 2.0, dmgMul: 1.5, speedMul: 1.18, spawnMul: 1.4,
    rampRate: 0.0085, intensityMax: 2.1, adaptUp: 0.26, adaptDown: 0.16,
  },
  {
    id: 'nightmare',
    name: 'ナイトメア',
    desc: ['悪夢級', '敵HP +200% / 攻撃 +120%', '無傷だと激化・多数・高速'],
    color: '#ff4d6d',
    hpMul: 3.0, dmgMul: 2.2, speedMul: 1.35, spawnMul: 1.8,
    rampRate: 0.0120, intensityMax: 2.8, adaptUp: 0.42, adaptDown: 0.10,
  },
];

export function getDifficulty(id) {
  return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0];
}
