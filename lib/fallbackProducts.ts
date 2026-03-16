/** Curated fallback when API returns empty — clickable cards that run a search */

export interface FallbackItem {
  title: string;
  query: string;
  price: string;
  image: string;
}

const PLACEHOLDER = 'https://placehold.co/400x533/f5f4f0/d4d2cc?text=naya';

export const FALLBACK_TRENDING: FallbackItem[] = [
  { title: 'Vintage Carhartt Jacket', query: 'vintage carhartt jacket', price: '$35–80', image: PLACEHOLDER },
  { title: 'Baggy Levi 550', query: 'baggy levi 550', price: '$25–50', image: PLACEHOLDER },
  { title: 'Vintage Nike Crewneck', query: 'vintage nike crewneck', price: '$20–45', image: PLACEHOLDER },
  { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', price: '$25–55', image: PLACEHOLDER },
  { title: 'Vintage Band Tee', query: 'vintage band tee', price: '$15–40', image: PLACEHOLDER },
  { title: 'Vintage Ralph Lauren', query: 'vintage ralph lauren', price: '$30–90', image: PLACEHOLDER },
];

export function getFallbackForCampus(campusName: string): FallbackItem[] {
  const campus = [
    { title: `Vintage ${campusName} Hoodie`, query: `vintage ${campusName.toLowerCase()} hoodie`, price: '$25–55', image: PLACEHOLDER },
    { title: `Vintage ${campusName} Crewneck`, query: `vintage ${campusName.toLowerCase()} crewneck`, price: '$20–50', image: PLACEHOLDER },
    { title: `${campusName} Merch`, query: `vintage ${campusName.toLowerCase()}`, price: '$20–60', image: PLACEHOLDER },
  ];
  const base = [
    { title: 'Vintage Carhartt Jacket', query: 'vintage carhartt jacket', price: '$35–80', image: PLACEHOLDER },
    { title: 'Nike Vintage Crewneck', query: 'vintage nike crewneck', price: '$20–45', image: PLACEHOLDER },
    { title: 'Baggy Levi 550', query: 'baggy levi 550', price: '$25–50', image: PLACEHOLDER },
    { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', price: '$25–55', image: PLACEHOLDER },
    { title: 'Vintage Band Tee', query: 'vintage band tee', price: '$15–40', image: PLACEHOLDER },
    { title: 'Vintage Ralph Lauren', query: 'vintage ralph lauren', price: '$30–90', image: PLACEHOLDER },
    { title: 'Vintage Denim Jacket', query: 'vintage denim jacket', price: '$40–85', image: PLACEHOLDER },
    { title: 'Vintage Streetwear', query: 'vintage streetwear', price: '$30–70', image: PLACEHOLDER },
  ];
  return [...campus, ...FALLBACK_TRENDING, ...base].slice(0, 18);
}
