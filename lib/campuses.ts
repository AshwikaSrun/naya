export interface TrendingItem {
  label: string;  // aesthetic display (e.g. "vintage carhartt jacket flat lay")
  query: string; // backend search query
}

export interface CampusConfig {
  slug: string;
  name: string;
  mascot: string;
  color: string;        // primary school color (hex)
  colorSecondary: string; // secondary school color (hex)
  emoji: string;         // fun campus vibe emoji
  defaultTrending: TrendingItem[];
  merchQueries: { title: string; query: string }[];
  findCategories: { label: string; query: string }[];
}

const CAMPUS_LIST: CampusConfig[] = [
  {
    slug: 'purdue',
    name: 'Purdue',
    mascot: 'Boilermakers',
    color: '#CEB888',
    colorSecondary: '#000000',
    emoji: '🚂',
    defaultTrending: [
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'baggy levi 550 minimal', query: 'baggy levi 550' },
      { label: 'vintage purdue hoodie aesthetic', query: 'vintage purdue hoodie' },
      { label: 'vintage nike crewneck clean', query: 'vintage nike crewneck' },
      { label: 'y2k zip hoodie', query: 'y2k zip hoodie' },
    ],
    merchQueries: [
      { title: 'Vintage Purdue Hoodie', query: 'vintage purdue hoodie' },
      { title: 'Vintage Purdue Crewneck', query: 'vintage purdue crewneck' },
      { title: 'Vintage Boilermakers', query: 'vintage boilermakers' },
      { title: 'Purdue Varsity Jacket', query: 'purdue varsity jacket' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'purdue merch', query: 'vintage purdue' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
  },
  {
    slug: 'indiana',
    name: 'Indiana',
    mascot: 'Hoosiers',
    color: '#990000',
    colorSecondary: '#EEEDEB',
    emoji: '🏀',
    defaultTrending: [
      { label: 'vintage indiana hoodie aesthetic', query: 'vintage indiana hoodie' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike crewneck clean', query: 'vintage nike crewneck' },
      { label: 'baggy levi 550 minimal', query: 'baggy levi 550' },
      { label: 'vintage hoosiers', query: 'vintage hoosiers' },
    ],
    merchQueries: [
      { title: 'Vintage Indiana Hoodie', query: 'vintage indiana hoodie' },
      { title: 'Vintage Hoosiers Crewneck', query: 'vintage hoosiers crewneck' },
      { title: 'Vintage Indiana Tee', query: 'vintage indiana university tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'indiana merch', query: 'vintage indiana' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
  },
  {
    slug: 'michigan',
    name: 'Michigan',
    mascot: 'Wolverines',
    color: '#FFCB05',
    colorSecondary: '#00274C',
    emoji: '〽️',
    defaultTrending: [
      { label: 'vintage michigan hoodie aesthetic', query: 'vintage michigan hoodie' },
      { label: 'vintage wolverines jacket flat lay', query: 'vintage wolverines jacket' },
      { label: 'vintage carhartt detroit', query: 'vintage carhartt detroit' },
      { label: 'vintage nike crewneck clean', query: 'vintage nike crewneck' },
      { label: 'baggy levi 501 minimal', query: 'baggy levi 501' },
    ],
    merchQueries: [
      { title: 'Vintage Michigan Hoodie', query: 'vintage michigan hoodie' },
      { title: 'Vintage Wolverines Crewneck', query: 'vintage wolverines crewneck' },
      { title: 'Vintage Michigan Jacket', query: 'vintage michigan jacket' },
      { title: 'Vintage Michigan Tee', query: 'vintage michigan tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'michigan merch', query: 'vintage michigan' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
  },
  {
    slug: 'michigan-state',
    name: 'Michigan State',
    mascot: 'Spartans',
    color: '#18453B',
    colorSecondary: '#FFFFFF',
    emoji: '⚔️',
    defaultTrending: [
      { label: 'vintage michigan state hoodie aesthetic', query: 'vintage michigan state hoodie' },
      { label: 'vintage spartans crewneck clean', query: 'vintage spartans crewneck' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike', query: 'vintage nike' },
      { label: 'baggy levi jeans minimal', query: 'baggy levi jeans' },
    ],
    merchQueries: [
      { title: 'Vintage Spartans Hoodie', query: 'vintage michigan state hoodie' },
      { title: 'Vintage Spartans Crewneck', query: 'vintage spartans crewneck' },
      { title: 'Vintage MSU Tee', query: 'vintage michigan state tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'msu merch', query: 'vintage michigan state' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
  },
  {
    slug: 'illinois',
    name: 'Illinois',
    mascot: 'Fighting Illini',
    color: '#E84A27',
    colorSecondary: '#13294B',
    emoji: '🔶',
    defaultTrending: [
      { label: 'vintage illinois hoodie aesthetic', query: 'vintage illinois hoodie' },
      { label: 'vintage illini crewneck clean', query: 'vintage illini crewneck' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike', query: 'vintage nike' },
      { label: 'y2k zip hoodie', query: 'y2k zip hoodie' },
    ],
    merchQueries: [
      { title: 'Vintage Illinois Hoodie', query: 'vintage illinois hoodie' },
      { title: 'Vintage Illini Crewneck', query: 'vintage illini crewneck' },
      { title: 'Vintage Illinois Tee', query: 'vintage illinois tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'illinois merch', query: 'vintage illinois' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
  },
  {
    slug: 'wisconsin',
    name: 'Wisconsin',
    mascot: 'Badgers',
    color: '#C5050C',
    colorSecondary: '#FFFFFF',
    emoji: '🦡',
    defaultTrending: [
      { label: 'vintage wisconsin hoodie aesthetic', query: 'vintage wisconsin hoodie' },
      { label: 'vintage badgers crewneck clean', query: 'vintage badgers crewneck' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike', query: 'vintage nike' },
      { label: 'baggy levi 550 minimal', query: 'baggy levi 550' },
    ],
    merchQueries: [
      { title: 'Vintage Wisconsin Hoodie', query: 'vintage wisconsin hoodie' },
      { title: 'Vintage Badgers Crewneck', query: 'vintage badgers crewneck' },
      { title: 'Vintage Wisconsin Tee', query: 'vintage wisconsin tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'wisconsin merch', query: 'vintage wisconsin' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
    ambassador: 'Jordan P.',
  },
  {
    slug: 'ohio-state',
    name: 'Ohio State',
    mascot: 'Buckeyes',
    color: '#BB0000',
    colorSecondary: '#666666',
    emoji: '🌰',
    defaultTrending: [
      { label: 'vintage ohio state hoodie aesthetic', query: 'vintage ohio state hoodie' },
      { label: 'vintage buckeyes crewneck clean', query: 'vintage buckeyes crewneck' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike', query: 'vintage nike' },
      { label: 'baggy levi jeans minimal', query: 'baggy levi jeans' },
    ],
    merchQueries: [
      { title: 'Vintage Ohio State Hoodie', query: 'vintage ohio state hoodie' },
      { title: 'Vintage Buckeyes Crewneck', query: 'vintage buckeyes crewneck' },
      { title: 'Vintage Ohio State Jacket', query: 'vintage ohio state jacket' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'ohio state merch', query: 'vintage ohio state' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
  },
  {
    slug: 'penn-state',
    name: 'Penn State',
    mascot: 'Nittany Lions',
    color: '#041E42',
    colorSecondary: '#FFFFFF',
    emoji: '🦁',
    defaultTrending: [
      { label: 'vintage penn state hoodie aesthetic', query: 'vintage penn state hoodie' },
      { label: 'vintage nittany lions crewneck clean', query: 'vintage nittany lions crewneck' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike', query: 'vintage nike' },
      { label: 'y2k zip hoodie', query: 'y2k zip hoodie' },
    ],
    merchQueries: [
      { title: 'Vintage Penn State Hoodie', query: 'vintage penn state hoodie' },
      { title: 'Vintage Nittany Lions Crewneck', query: 'vintage nittany lions crewneck' },
      { title: 'Vintage Penn State Tee', query: 'vintage penn state tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'penn state merch', query: 'vintage penn state' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
    ambassador: 'Morgan S.',
  },
  {
    slug: 'texas',
    name: 'Texas',
    mascot: 'Longhorns',
    color: '#BF5700',
    colorSecondary: '#FFFFFF',
    emoji: '🤘',
    defaultTrending: [
      { label: 'vintage texas hoodie aesthetic', query: 'vintage texas hoodie' },
      { label: 'vintage longhorns crewneck clean', query: 'vintage longhorns crewneck' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike', query: 'vintage nike' },
      { label: 'vintage cowboy boots', query: 'vintage cowboy boots' },
    ],
    merchQueries: [
      { title: 'Vintage Texas Hoodie', query: 'vintage texas hoodie' },
      { title: 'Vintage Longhorns Crewneck', query: 'vintage longhorns crewneck' },
      { title: 'Vintage Texas Tee', query: 'vintage texas longhorns tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'texas merch', query: 'vintage texas longhorns' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'western • aesthetic', query: 'vintage western wear' },
    ],
  },
  {
    slug: 'arizona-state',
    name: 'Arizona State',
    mascot: 'Sun Devils',
    color: '#8C1D40',
    colorSecondary: '#FFC627',
    emoji: '😈',
    defaultTrending: [
      { label: 'vintage arizona state hoodie aesthetic', query: 'vintage arizona state hoodie' },
      { label: 'vintage sun devils crewneck clean', query: 'vintage sun devils crewneck' },
      { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
      { label: 'vintage nike', query: 'vintage nike' },
      { label: 'y2k zip hoodie', query: 'y2k zip hoodie' },
    ],
    merchQueries: [
      { title: 'Vintage ASU Hoodie', query: 'vintage arizona state hoodie' },
      { title: 'Vintage Sun Devils Crewneck', query: 'vintage sun devils crewneck' },
      { title: 'Vintage ASU Tee', query: 'vintage arizona state tee' },
    ],
    findCategories: [
      { label: 'carhartt • flat lay', query: 'vintage carhartt' },
      { label: 'nike vintage • clean', query: 'vintage nike' },
      { label: 'asu merch', query: 'vintage arizona state' },
      { label: 'baggy denim • minimal', query: 'baggy levi jeans' },
      { label: 'streetwear • aesthetic', query: 'vintage streetwear' },
    ],
  },
];

export const CAMPUSES: Record<string, CampusConfig> = Object.fromEntries(
  CAMPUS_LIST.map((c) => [c.slug, c])
);

export const ALL_CAMPUSES = CAMPUS_LIST;

export function getCampus(slug: string): CampusConfig | undefined {
  return CAMPUSES[slug.toLowerCase()];
}
