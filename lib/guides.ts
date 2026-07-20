export type GuideSection = {
  id: string;
  heading: string;
  body: string[];
};

export type Guide = {
  slug: string;
  category: string;
  readTime: string;
  date: string;
  title: string;
  subtitle: string;
  excerpt: string;
  image: string;
  icon: 'search' | 'fit' | 'leaf' | 'shield';
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-search-vintage',
    category: 'vintage shopping',
    readTime: '8 min read',
    date: 'May 2026',
    title: 'How to Search for Vintage Clothing Online',
    subtitle:
      'The keyword tricks, brand cues, and platform quirks that separate a great find from an endless scroll.',
    excerpt:
      'Expert tips for finding authentic vintage across eBay, Grailed, Depop, and Poshmark. Learn keyword strategy, era cues, and how to read a listing.',
    image: '/editorial/guide-vintage-rack.png',
    icon: 'search',
    sections: [
      {
        id: 'why-search-is-hard',
        heading: 'Why vintage search is hard',
        body: [
          'Vintage lives in a long tail. The exact jacket you want might be listed once, by one seller, under a title they typed in thirty seconds. There is no clean catalog, no consistent sizing, and no shared vocabulary. One person calls it a "blokecore Adidas track top," another calls it a "vintage 90s trefoil jacket."',
          'That fragmentation is exactly why a single keyword search rarely works. The trick is to think in the language sellers actually use, then search several phrasings of the same idea. This is the core of what naya automates: you describe the piece once, and we translate it into the queries each marketplace responds to.',
        ],
      },
      {
        id: 'keyword-strategy',
        heading: 'Build a keyword stack',
        body: [
          'Start broad, then layer. A strong query usually has four parts: era or decade, brand or maker, garment type, and a defining detail. For example, "90s Carhartt detroit jacket blanket lined" will out-perform "carhartt jacket" every time.',
          'Keep a few synonyms ready for each part. Denim sellers say "faded," "worn in," "broken in," and "distressed" to mean similar things. Search all of them. Spelling variants matter too, since misspelled listings get fewer bids and lower prices.',
        ],
      },
      {
        id: 'read-the-listing',
        heading: 'Read the listing like a buyer',
        body: [
          'Measurements beat tags. Vintage sizing has drifted across decades, so a labeled medium can fit like a modern extra-small. Always shop to the flat measurements (pit to pit, length, waist) and compare them to a garment you already own.',
          'Photos tell the truth that titles hide. Look for the inside tags, the stitching, and any flaws shown in natural light. A seller who photographs flaws clearly is usually a seller you can trust.',
        ],
      },
      {
        id: 'let-naya-do-it',
        heading: 'Let naya run the search',
        body: [
          'Instead of repeating this across four sites, describe the piece to naya in one prompt. We expand it into the right query stack, search every marketplace at once, score listings for quality, and remove duplicates so you see the best version of each find.',
          'Then save the search. naya watches for new listings and price drops, so the next great find comes to you instead of the other way around.',
        ],
      },
    ],
  },
  {
    slug: 'fit-when-buying-online',
    category: 'fit & sizing',
    readTime: '7 min read',
    date: 'May 2026',
    title: 'How to Nail Fit When Buying Vintage Online',
    subtitle:
      'Most vintage is final sale. Here is how to buy with confidence using measurements, not labels.',
    excerpt:
      'Vintage sizing varies wildly by era and brand. Learn to read measurements, build a reference garment, and avoid the most expensive mistake in secondhand.',
    image: '/editorial/naya-fit-mirror.png',
    icon: 'fit',
    sections: [
      {
        id: 'the-fit-problem',
        heading: 'The vintage fit problem',
        body: [
          'Around a third of online clothing purchases get returned, and fit is the top reason. Vintage makes it worse: most sellers do not accept returns, and sizing has changed dramatically over the decades thanks to vanity sizing.',
          'A blazer labeled "medium" from 1985 might measure like a modern small. So the label is a hint, never a promise. The good news is that you can shop fit precisely if you commit to measurements.',
        ],
      },
      {
        id: 'reference-garment',
        heading: 'Build a reference garment',
        body: [
          'Pick one item from your closet that fits perfectly in each category: a tee, a button-up, a jacket, a pair of jeans. Lay each one flat and record the key measurements. Pit to pit and length for tops, waist and inseam for bottoms.',
          'Now you have a personal size chart that works across every brand and era. When a listing gives measurements, compare to your reference instead of guessing from the tag.',
        ],
      },
      {
        id: 'how-to-measure',
        heading: 'The measurements that matter',
        body: [
          'For tops, prioritize pit to pit (chest), shoulder width, and total length. For jackets, add sleeve length. For bottoms, measure the waist laid flat and double it, then check rise and inseam.',
          'If a seller has not listed measurements, ask. A quick message saves an expensive mistake, and most sellers will measure for a serious buyer.',
        ],
      },
      {
        id: 'naya-fit',
        heading: 'How naya helps with fit',
        body: [
          'Tell naya your measurements once and it factors them into your results, surfacing pieces that match your reference fit and quietly flagging the ones that will run too small or too boxy.',
          'Image search is coming next, so you will be able to see how a piece reads on a real body before you commit.',
        ],
      },
    ],
  },
  {
    slug: 'shop-secondhand-smart',
    category: 'secondhand shopping',
    readTime: '6 min read',
    date: 'April 2026',
    title: 'How to Shop Second-Hand Without Getting Burned',
    subtitle:
      'Spot the good sellers, dodge the bad listings, and build a wardrobe that costs less and lasts longer.',
    excerpt:
      'Find secondhand deals while helping the planet. Sustainable shopping strategies, designer for less, and how to avoid scams.',
    image: '/editorial/naya-editorial-denim.png',
    icon: 'leaf',
    sections: [
      {
        id: 'why-secondhand',
        heading: 'Why second-hand wins',
        body: [
          'Buying one used garment instead of new keeps it out of landfill and skips the water and carbon cost of manufacturing. It is also where the best clothes are: older garments were often made with heavier fabrics and better construction than their fast-fashion descendants.',
          'You get quality and character for a fraction of retail. The only tax is patience, and that is the part naya removes.',
        ],
      },
      {
        id: 'vet-the-seller',
        heading: 'Vet the seller first',
        body: [
          'Before the price, read the seller. Check their rating, how many items they have sold, and how they respond to questions. Clear photos, honest flaw notes, and real measurements are green flags.',
          'Be wary of stock photos, prices that seem too good, and pressure to move off-platform. Paying through the marketplace keeps your buyer protection intact.',
        ],
      },
      {
        id: 'care-and-keep',
        heading: 'Care so it lasts',
        body: [
          'A small repair kit and gentle washing extend the life of everything you buy. Wash less, air dry, and spot-treat instead of running full cycles. Vintage denim in particular ages beautifully when you wash it rarely and cold.',
          'Buying fewer, better pieces and caring for them is the whole game. It is cheaper over time and far kinder to the planet.',
        ],
      },
    ],
  },
  {
    slug: 'spot-fakes-authenticate',
    category: 'authentication',
    readTime: '9 min read',
    date: 'April 2026',
    title: 'How to Spot Fakes and Authenticate Vintage',
    subtitle:
      'Tags, stitching, hardware, and the small tells that reveal whether a piece is the real thing.',
    excerpt:
      'A practical guide to authenticating vintage and designer pieces online, from reading care tags to checking hardware and construction.',
    image: '/editorial/naya-hero.png',
    icon: 'shield',
    sections: [
      {
        id: 'start-with-the-tag',
        heading: 'Start with the tag',
        body: [
          'Brand tags evolved over time, and those changes are a dating tool. Fonts, logos, country of origin, and care symbols all shifted across decades. A "made in USA" tag with a union label, for instance, places many pieces before the late 1990s.',
          'Cross-reference the tag against known references for that brand and era. If the font or wording does not match the supposed decade, treat it as a warning sign.',
        ],
      },
      {
        id: 'construction-tells',
        heading: 'Read the construction',
        body: [
          'Counterfeits cut corners where you cannot see them. Check the stitching density, the evenness of seams, and whether patterns line up across panels. Quality hardware feels heavy and is usually branded; cheap zippers and snaps are a tell.',
          'On knitwear and denim, look at the weight and weave of the fabric. Real vintage tends to feel substantial because it was made to last.',
        ],
      },
      {
        id: 'when-in-doubt',
        heading: 'When in doubt, verify',
        body: [
          'For higher-value designer pieces, use the marketplace authentication services where available, and lean on community knowledge. Brand-specific forums and subreddits can date a piece from a single clear photo.',
          'And trust the seller signal. A long track record with detailed, honest listings is the strongest authentication of all.',
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
