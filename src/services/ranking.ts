import { LEADERBOARD_SIZE, LEADERBOARD_STORAGE_KEY } from '../game/constants';
import type { RankingEntry } from '../game/types';

const parseRanking = (raw: string | null): RankingEntry[] => {
  if (!raw) {
    return [];
  }

  try {
    const data = JSON.parse(raw) as RankingEntry[];
    return data
      .filter((entry) => Number.isFinite(entry.score) && typeof entry.date === 'string')
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
  } catch {
    return [];
  }
};

export const getRanking = (): RankingEntry[] =>
  parseRanking(window.localStorage.getItem(LEADERBOARD_STORAGE_KEY));

export const saveScore = (score: number): RankingEntry[] => {
  const ranking = getRanking();
  const updated = [...ranking, { score, date: new Date().toISOString() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, LEADERBOARD_SIZE);

  window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};
