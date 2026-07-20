// Standalone sanity test for the scoring engine. Run with:  npx tsx lib/agent/scoring.sample-test.ts
// Not a unit-test-framework test (repo has none); it prints a ranked feed so the
// weighting/gating behavior is easy to eyeball against ~50 sample listings.

import { scoreListing, scoreAndRank } from './scoring';
import type { AgentListing, SavedSearch, TasteProfile } from './types';

const SAMPLE: AgentListing[] = [
  { title: 'Vintage Carhartt Detroit Jacket Brown Workwear', price: 95, url: 'u1', source: 'ebay' },
  { title: 'Carhartt WIP Bomber Jacket Size M Black', price: 70, url: 'u2', source: 'grailed' },
  { title: 'The North Face 90s Puffer Jacket', price: 60, url: 'u3', source: 'depop' },
  { title: 'Nike Vintage Windbreaker 90s Colorblock M', price: 45, url: 'u4', source: 'poshmark' },
  { title: 'Levis 501 Vintage Jeans 32x30 Medium Wash', price: 55, url: 'u5', source: 'ebay' },
  { title: 'Levis 505 Denim 29x30 Dark Wash', price: 48, url: 'u6', source: 'ebay' },
  { title: 'Wrangler Cowboy Cut Jeans 34x32', price: 30, url: 'u7', source: 'poshmark' },
  { title: 'Brown Leather Bomber Jacket Size M Distressed', price: 78, url: 'u8', source: 'grailed' },
  { title: 'Brown Leather Bomber Jacket Size L', price: 82, url: 'u9', source: 'depop' },
  { title: 'Polo Ralph Lauren Cable Knit Sweater M', price: 40, url: 'u10', source: 'ebay' },
  { title: 'Ralph Lauren Oxford Shirt Blue L', price: 25, url: 'u11', source: 'poshmark' },
  { title: 'Stussy Y2K Baggy Cargo Pants 32', price: 65, url: 'u12', source: 'grailed' },
  { title: 'Supreme Box Logo Hoodie Grey L', price: 220, url: 'u13', source: 'grailed' },
  { title: 'Champion Reverse Weave Crewneck M', price: 35, url: 'u14', source: 'depop' },
  { title: 'Adidas Samba OG Sneakers Size 8.5', price: 90, url: 'u15', source: 'ebay' },
  { title: 'New Balance 990v3 Grey 9', price: 130, url: 'u16', source: 'grailed' },
  { title: 'Dr Martens 1460 Boots Black 8.5', price: 75, url: 'u17', source: 'depop' },
  { title: 'Patagonia Fleece Vintage Retro-X M', price: 85, url: 'u18', source: 'poshmark' },
  { title: 'Columbia Fleece Jacket Navy L', price: 30, url: 'u19', source: 'ebay' },
  { title: 'Y2K Grunge Flannel Shirt Oversized', price: 22, url: 'u20', source: 'depop' },
  { title: 'Minimalist Beige Trench Coat M', price: 60, url: 'u21', source: 'grailed' },
  { title: 'Diesel Y2K Faded Denim Jacket', price: 50, url: 'u22', source: 'ebay' },
  { title: 'True Religion Baggy Jeans 34', price: 45, url: 'u23', source: 'poshmark' },
  { title: 'Nike Tech Fleece Joggers Black M', price: 55, url: 'u24', source: 'grailed' },
  { title: 'Vintage Coach Leather Bag Brown', price: 120, url: 'u25', source: 'ebay' },
  { title: 'Uniqlo Oversized Tee White L', price: 12, url: 'u26', source: 'depop' },
  { title: 'Gap Vintage Hoodie Grey M 90s', price: 28, url: 'u27', source: 'poshmark' },
  { title: 'Arcteryx Beta Jacket Gore-Tex M', price: 180, url: 'u28', source: 'grailed' },
  { title: 'Stone Island Overshirt Olive L', price: 210, url: 'u29', source: 'grailed' },
  { title: 'Vans Old Skool Black 9', price: 35, url: 'u30', source: 'ebay' },
  { title: 'Converse Chuck 70 High Cream 8.5', price: 45, url: 'u31', source: 'depop' },
  { title: 'Dickies 874 Work Pants 32x30 Navy', price: 25, url: 'u32', source: 'poshmark' },
  { title: 'Vintage Nike Swoosh Crewneck Workwear M', price: 42, url: 'u33', source: 'ebay' },
  { title: 'Brandy Melville Cropped Cardigan', price: 20, url: 'u34', source: 'depop' },
  { title: 'Tommy Hilfiger Sailing Jacket 90s L', price: 55, url: 'u35', source: 'ebay' },
  { title: 'Fear of God Essentials Hoodie Grey M', price: 90, url: 'u36', source: 'grailed' },
  { title: 'Vintage Leather Bomber Brown 90s M Distressed', price: 68, url: 'u37', source: 'ebay' },
  { title: 'Reebok Classic Nylon 9', price: 40, url: 'u38', source: 'poshmark' },
  { title: 'Minimalist Wool Overcoat Charcoal M', price: 110, url: 'u39', source: 'grailed' },
  { title: 'Y2K Baby Tee Pink S', price: 15, url: 'u40', source: 'depop' },
  { title: 'Carhartt Beanie Brown', price: 18, url: 'u41', source: 'ebay' },
  { title: 'Levis Sherpa Trucker Jacket M Vintage', price: 58, url: 'u42', source: 'ebay' },
  { title: 'Ralph Lauren Fleece Vest Navy M', price: 35, url: 'u43', source: 'poshmark' },
  { title: 'North Face Nuptse 700 Puffer Black M', price: 150, url: 'u44', source: 'grailed' },
  { title: 'Vintage Workwear Chore Coat Brown M', price: 62, url: 'u45', source: 'ebay' },
  { title: 'Nike Air Max 90 White 9.5', price: 80, url: 'u46', source: 'ebay' },
  { title: 'Grunge Y2K Leather Jacket Black M', price: 72, url: 'u47', source: 'depop' },
  { title: 'Gucci GG Belt Brown 90', price: 260, url: 'u48', source: 'grailed' },
  { title: 'Vintage Denim Jacket Levis 90s L', price: 50, url: 'u49', source: 'ebay' },
  { title: 'Minimalist White Button Down Shirt M', price: 24, url: 'u50', source: 'poshmark' },
];

const profile: TasteProfile = {
  user_id: 'demo',
  preferred_brands: ['carhartt', 'levis', 'the north face'],
  preferred_categories: ['outerwear', 'denim'],
  size_profile: { tops: 'M', denim: '32x30', shoes: '9' },
  price_ceiling: 80,
  style_tags: ['workwear', 'vintage', '90s'],
  era_preference: ['90s'],
};

const savedSearches: SavedSearch[] = [
  {
    id: 1,
    user_id: 'demo',
    query_text: 'brown leather bomber jacket size M',
    parsed_filters: {
      marketplaceQuery: 'brown leather bomber jacket',
      maxPrice: 80,
      categories: ['outerwear'],
      sizes: ['M'],
    },
    is_active: true,
  },
];

console.log('\n=== Full profile + saved search (threshold 0.6) ===');
const ranked = scoreAndRank(SAMPLE, profile, savedSearches, 0);
for (const { listing, result } of ranked.slice(0, 15)) {
  const flag = result.score >= 0.6 ? '✅' : '  ';
  console.log(
    `${flag} ${result.score.toFixed(3)}  ${listing.title.padEnd(48).slice(0, 48)}  — ${result.reason}`,
  );
}

const above = ranked.filter((r) => r.result.score >= 0.6);
console.log(`\n${above.length}/${SAMPLE.length} listings above 0.6 threshold.`);

console.log('\n=== Size gate check (denim, wrong waist should be gated) ===');
for (const url of ['u5', 'u6', 'u7', 'u32']) {
  const l = SAMPLE.find((x) => x.url === url)!;
  const r = scoreListing(l, profile, savedSearches);
  console.log(`  ${r.gated ? 'GATED' : 'ok   '} ${r.score.toFixed(3)}  ${l.title}`);
}

console.log('\n=== Cold start (brands only, no saved searches) ===');
const cold: TasteProfile = {
  user_id: 'cold',
  preferred_brands: ['nike', 'adidas'],
  preferred_categories: [],
  size_profile: {},
  price_ceiling: null,
  style_tags: [],
  era_preference: [],
};
for (const { listing, result } of scoreAndRank(SAMPLE, cold, [], 0).slice(0, 5)) {
  console.log(`  ${result.score.toFixed(3)}  ${listing.title}  — ${result.reason}`);
}
console.log('');
