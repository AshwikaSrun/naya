/** Price alerts — saved searches with max price threshold */

export interface PriceAlert {
  id: string;
  query: string;
  maxPrice: number;
  createdAt: number;
}

const STORAGE_KEY = 'naya-price-alerts';

export function getPriceAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PriceAlert[]) : [];
  } catch {
    return [];
  }
}

export function addPriceAlert(query: string, maxPrice: number): PriceAlert {
  const alerts = getPriceAlerts();
  const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const alert: PriceAlert = { id, query, maxPrice, createdAt: Date.now() };
  const updated = [alert, ...alerts.filter((a) => !(a.query.toLowerCase() === query.toLowerCase() && a.maxPrice === maxPrice))].slice(0, 10);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return alert;
}

export function removePriceAlert(id: string): void {
  const updated = getPriceAlerts().filter((a) => a.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
