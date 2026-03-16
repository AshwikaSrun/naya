/** Curated fallback when API returns empty — clickable cards that run a search */

export interface FallbackItem {
  title: string;
  query: string;
  price: string;
  image: string;
}

const F = (path: string) => `/finds/${path}`;

// Campus slug -> image filenames (hoodie, crewneck) — exported for college page
export const CAMPUS_IMAGES: Record<string, { hoodie: string; crewneck: string }> = {
  purdue: { hoodie: 'purduevintagehoodie.jpg', crewneck: 'purduevintagecrewneck.jpg' },
  indiana: { hoodie: 'indianavintagehoodie.jpg', crewneck: 'indianavintagecrewneck.jpg' },
  michigan: { hoodie: 'michiganvintagehoodie.jpg', crewneck: 'michiganvintagecrewneck.jpg' },
  'michigan-state': { hoodie: 'michstatevintagehoodie.jpg', crewneck: 'michstatecrewneck.jpg' },
  illinois: { hoodie: 'Illinoisvintagehoodie.jpg', crewneck: 'illinoisvintagecrewneck.jpg' },
  wisconsin: { hoodie: 'wisconsinvintagehoodie.jpg', crewneck: 'wisconsinvintagecrewneck.jpg' },
  'ohio-state': { hoodie: 'ohiostatevintagehoodie.jpg', crewneck: 'ohiostatevintagecrewneck.jpg' },
  'penn-state': { hoodie: 'pennstatevintagehoodie.jpg', crewneck: 'pennstatevintagecrewneck.jpg' },
  texas: { hoodie: 'texasvintagehoodie.jpg', crewneck: 'texasvintagehoodie.jpg' },
  'arizona-state': { hoodie: 'arizonastatevintagehoodie.jpg', crewneck: 'arizonavintagecrewneck.jpg' },
};

const STOCK = {
  hoodie: F('purduevintagehoodie.jpg'),
  crewneck: F('purduevintagecrewneck.jpg'),
  jacket: F('vintagecarharttjacket.jpg'),
  jacket1: F('vintagecarharttjacket1.jpg'),
  jacket2: F('vintagecarharttjacket2.jpg'),
  jacket3: F('vintagecarharttjacket3.jpg'),
  denim: F('denim.jpg'),
  denim1: F('denim1.jpg'),
  denim2: F('denim2.jpg'),
  denim3: F('denim3.jpg'),
  tee: F('tee.jpg'),
  tee1: F('tee1.jpg'),
  tee2: F('tee2.jpg'),
  vintage: F('vintage.jpg'),
  vintage1: F('vintage1.jpg'),
  vintage2: F('vintage2.jpg'),
  streetwear: F('streetwear.jpg'),
  streetwear1: F('streetwear1.jpg'),
  streetwear2: F('streetwear2.jpg'),
  streetwear3: F('streetwear3.jpg'),
};

export const FALLBACK_TRENDING: FallbackItem[] = [
  { title: 'Vintage Carhartt Jacket Flat Lay', query: 'vintage carhartt jacket', price: '$35–80', image: STOCK.jacket },
  { title: 'Baggy Levi 550 Minimal', query: 'baggy levi 550', price: '$25–50', image: STOCK.denim1 },
  { title: 'Vintage Nike Crewneck Clean', query: 'vintage nike crewneck', price: '$20–45', image: STOCK.crewneck },
  { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', price: '$25–55', image: STOCK.hoodie },
  { title: 'Vintage Band Tee Aesthetic', query: 'vintage band tee', price: '$15–40', image: STOCK.tee },
  { title: 'Vintage Ralph Lauren', query: 'vintage ralph lauren', price: '$30–90', image: STOCK.vintage },
];

export function getFallbackForCampus(campusName: string): FallbackItem[] {
  const slug = campusName.toLowerCase().replace(/\s+/g, '-');
  const campusImgs = CAMPUS_IMAGES[slug] || { hoodie: 'purduevintagehoodie.jpg', crewneck: 'purduevintagecrewneck.jpg' };

  const campus = [
    { title: `Vintage ${campusName} Hoodie Aesthetic`, query: `vintage ${campusName.toLowerCase()} hoodie`, price: '$25–55', image: F(campusImgs.hoodie) },
    { title: `Vintage ${campusName} Crewneck Clean`, query: `vintage ${campusName.toLowerCase()} crewneck`, price: '$20–50', image: F(campusImgs.crewneck) },
    { title: `${campusName} Merch`, query: `vintage ${campusName.toLowerCase()}`, price: '$20–60', image: F(campusImgs.hoodie) },
  ];
  const base = [
    { title: 'Vintage Carhartt Jacket Flat Lay', query: 'vintage carhartt jacket', price: '$35–80', image: STOCK.jacket3 },
    { title: 'Nike Vintage Crewneck Clean', query: 'vintage nike crewneck', price: '$20–45', image: STOCK.crewneck },
    { title: 'Baggy Levi 550 Minimal', query: 'baggy levi 550', price: '$25–50', image: STOCK.denim1 },
    { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', price: '$25–55', image: STOCK.hoodie },
    { title: 'Vintage Band Tee Aesthetic', query: 'vintage band tee', price: '$15–40', image: STOCK.tee1 },
    { title: 'Vintage Ralph Lauren', query: 'vintage ralph lauren', price: '$30–90', image: STOCK.vintage1 },
    { title: 'Vintage Denim Jacket Flat Lay', query: 'vintage denim jacket', price: '$40–85', image: STOCK.jacket2 },
    { title: 'Vintage Streetwear Aesthetic', query: 'vintage streetwear', price: '$30–70', image: STOCK.streetwear1 },
  ];
  return [...campus, ...FALLBACK_TRENDING, ...base].slice(0, 18);
}
