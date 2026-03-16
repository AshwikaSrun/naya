/** Compare basket — add up to 3 items for side-by-side comparison */

export interface CompareProduct {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: string;
}

const STORAGE_KEY = 'naya-compare';
const MAX_ITEMS = 3;

export function getCompareItems(): CompareProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompareProduct[]) : [];
  } catch {
    return [];
  }
}

export function addToCompare(product: CompareProduct): boolean {
  const items = getCompareItems();
  if (items.some((i) => i.url === product.url)) return false;
  if (items.length >= MAX_ITEMS) return false;
  const updated = [...items, { ...product, source: product.source }];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('naya-compare-update'));
  return true;
}

export function removeFromCompare(url: string): void {
  const updated = getCompareItems().filter((i) => i.url !== url);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('naya-compare-update'));
}

export function clearCompare(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('naya-compare-update'));
}

export function isInCompare(url: string): boolean {
  return getCompareItems().some((i) => i.url === url);
}
