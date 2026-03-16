/** Sustainability impact tracking — listings explored, garments in circulation */

const STORAGE_KEY = 'naya-impact-stats';

export interface ImpactStats {
  listingsExplored: number;
  searchesRun: number;
  lastUpdated: number;
}

export function getImpactStats(): ImpactStats {
  if (typeof window === 'undefined') return { listingsExplored: 0, searchesRun: 0, lastUpdated: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpactStats) : { listingsExplored: 0, searchesRun: 0, lastUpdated: 0 };
  } catch {
    return { listingsExplored: 0, searchesRun: 0, lastUpdated: 0 };
  }
}

export function recordSearch(resultCount: number): void {
  const stats = getImpactStats();
  const updated: ImpactStats = {
    listingsExplored: stats.listingsExplored + resultCount,
    searchesRun: stats.searchesRun + 1,
    lastUpdated: Date.now(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function recordProductView(): void {
  const stats = getImpactStats();
  const updated: ImpactStats = {
    ...stats,
    listingsExplored: stats.listingsExplored + 1,
    lastUpdated: Date.now(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
