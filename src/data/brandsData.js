export const CATEGORIES = ['All', 'Dining', 'Retail', 'Beauty', 'Fuel', 'Grocery'];

export const PROMO_BY_CATEGORY = {
  All: {
    id: 'brand-deals',
    title: 'Find brand deals',
    badge: 'Explore',
  },
  Dining: {
    id: 'brand-deals',
    title: 'Find brand deals',
    subtitle: 'Dining campaigns · Direct payouts',
    badge: 'Dining',
  },
  Retail: {
    id: 'brand-deals',
    title: 'Find brand deals',
    subtitle: 'Retail campaigns · Direct payouts',
    badge: 'Retail',
  },
  Beauty: {
    id: 'brand-deals',
    title: 'Find brand deals',
    subtitle: 'Beauty campaigns · Direct payouts',
    badge: 'Beauty',
  },
  Fuel: {
    id: 'brand-deals',
    title: 'Find brand deals',
    subtitle: 'Mobility campaigns · Direct payouts',
    badge: 'Fuel',
  },
  Grocery: {
    id: 'brand-deals',
    title: 'Find brand deals',
    subtitle: 'Grocery campaigns · Direct payouts',
    badge: 'Grocery',
  },
};

export const BRAND_DEAL_SECTIONS = [
  {
    id: 'restaurants',
    category: 'Restaurants',
    deals: [
      { id: 'mcdonalds', brandName: "McDonald's", paymentAmount: '$1,200', logoKey: 'mcdonalds' },
      { id: 'dominos', brandName: "Domino's", paymentAmount: '$850', logoKey: 'dominos' },
      { id: 'starbucks', brandName: 'Starbucks', paymentAmount: '$950', logoKey: 'starbucks' },
      { id: 'chipotle', brandName: 'Chipotle', paymentAmount: '$1,100', logoKey: 'chipotle' },
    ],
  },
  {
    id: 'sports',
    category: 'Sports',
    deals: [
      { id: 'nike', brandName: 'Nike', paymentAmount: '$2,500', logoKey: 'nike' },
      { id: 'reebok', brandName: 'Reebok', paymentAmount: '$1,400', logoKey: 'reebok' },
      { id: 'puma', brandName: 'Puma', paymentAmount: '$1,750', logoKey: 'puma' },
      { id: 'gymshark', brandName: 'Gymshark', paymentAmount: '$2,000', logoKey: 'gymshark' },
    ],
  },
  {
    id: 'clothing',
    category: 'Clothing',
    deals: [
      { id: 'zara', brandName: 'Zara', paymentAmount: '$1,600', logoKey: 'zara' },
      { id: 'adidas', brandName: 'Adidas', paymentAmount: '$2,200', logoKey: 'adidas' },
      { id: 'uniqlo', brandName: 'Uniqlo', paymentAmount: '$1,300', logoKey: 'uniqlo' },
      { id: 'hm', brandName: 'H&M', paymentAmount: '$900', logoKey: 'hm' },
    ],
  },
  {
    id: 'tech',
    category: 'Tech',
    deals: [
      { id: 'playstation', brandName: 'PlayStation', paymentAmount: '$3,000', logoKey: 'playstation' },
      { id: 'spotify', brandName: 'Spotify', paymentAmount: '$1,450', logoKey: 'spotify' },
      { id: 'apple', brandName: 'Apple', paymentAmount: '$4,000', logoKey: 'apple' },
      { id: 'sony', brandName: 'Sony', paymentAmount: '$2,100', logoKey: 'sony' },
    ],
  },
];

export const USER_PROFILES = [
  { name: 'Jacob Jones', miles: '48,250 miles' },
  { name: 'Jacob Business', miles: '112,900 miles' },
];

