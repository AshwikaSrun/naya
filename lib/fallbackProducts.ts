/** Curated fallback when API returns empty — clickable cards that run a search */

export interface FallbackItem {
  title: string;
  query: string;
  price: string;
  image: string;
}

const S = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&h=533&fit=crop`;

// Unsplash stock photos: vintage clothing, hoodie, jacket, crewneck, denim, tee, streetwear
const STOCK = {
  hoodie: S('1618899809786-62c2d5ec2174'),      // man in gray hoodie
  crewneck: S('1549153166-54374660cb65'),       // crewneck + denim jacket
  jacket: S('1732165289122-713c00969877'),      // jacket on rack
  denim: S('1541099649105-f69ad21f3246'),      // denim
  tee: S('1521572163474-6864f9cf17ab'),        // vintage tee
  vintage: S('1770012117407-02aa4bd203ec'),     // vintage clothing racks
  streetwear: S('1503341504251-d5f5391f1b55'), // streetwear
};

export const FALLBACK_TRENDING: FallbackItem[] = [
  { title: 'Vintage Carhartt Jacket Flat Lay', query: 'vintage carhartt jacket', price: '$35–80', image: STOCK.jacket },
  { title: 'Baggy Levi 550 Minimal', query: 'baggy levi 550', price: '$25–50', image: STOCK.denim },
  { title: 'Vintage Nike Crewneck Clean', query: 'vintage nike crewneck', price: '$20–45', image: STOCK.crewneck },
  { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', price: '$25–55', image: STOCK.hoodie },
  { title: 'Vintage Band Tee Aesthetic', query: 'vintage band tee', price: '$15–40', image: STOCK.tee },
  { title: 'Vintage Ralph Lauren', query: 'vintage ralph lauren', price: '$30–90', image: STOCK.vintage },
];

export function getFallbackForCampus(campusName: string): FallbackItem[] {
  const campus = [
    { title: `Vintage ${campusName} Hoodie Aesthetic`, query: `vintage ${campusName.toLowerCase()} hoodie`, price: '$25–55', image: STOCK.hoodie },
    { title: `Vintage ${campusName} Crewneck Clean`, query: `vintage ${campusName.toLowerCase()} crewneck`, price: '$20–50', image: STOCK.crewneck },
    { title: `${campusName} Merch`, query: `vintage ${campusName.toLowerCase()}`, price: '$20–60', image: STOCK.jacket },
  ];
  const base = [
    { title: 'Vintage Carhartt Jacket Flat Lay', query: 'vintage carhartt jacket', price: '$35–80', image: STOCK.jacket },
    { title: 'Nike Vintage Crewneck Clean', query: 'vintage nike crewneck', price: '$20–45', image: STOCK.crewneck },
    { title: 'Baggy Levi 550 Minimal', query: 'baggy levi 550', price: '$25–50', image: STOCK.denim },
    { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', price: '$25–55', image: STOCK.hoodie },
    { title: 'Vintage Band Tee Aesthetic', query: 'vintage band tee', price: '$15–40', image: STOCK.tee },
    { title: 'Vintage Ralph Lauren', query: 'vintage ralph lauren', price: '$30–90', image: STOCK.vintage },
    { title: 'Vintage Denim Jacket Flat Lay', query: 'vintage denim jacket', price: '$40–85', image: STOCK.jacket },
    { title: 'Vintage Streetwear Aesthetic', query: 'vintage streetwear', price: '$30–70', image: STOCK.streetwear },
  ];
  return [...campus, ...FALLBACK_TRENDING, ...base].slice(0, 18);
}
