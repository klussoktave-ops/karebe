/**
 * Demo Data for Karebe React
 * Rich seed dataset for development and demonstration
 */

// Demo Users
export interface DemoUser {
  id: string;
  email: string;
  password: string;
  role: 'super-admin' | 'admin' | 'rider' | 'customer';
  name: string;
  phone?: string;
  branchId?: string;
  avatar?: string;
}

export const demoUsers: DemoUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'owner@karebe.com',
    password: 'owner123',
    role: 'super-admin',
    name: 'John Karebe',
    phone: '+254712345678',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  },
  {
    id: 'user-admin-001',
    email: 'admin@karebe.com',
    password: 'admin123',
    role: 'admin',
    name: 'Grace Muthoni',
    phone: '+254723456789',
    branchId: 'branch-wangige',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'rider@karebe.com',
    password: 'rider123',
    role: 'rider',
    name: 'John Rider',
    phone: '+254798765432',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  },
  {
    id: 'user-customer-001',
    email: 'customer@karebe.com',
    password: 'customer123',
    role: 'customer',
    name: 'Sarah Wanjiku',
    phone: '+254734567890',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  },
];

// Demo Branches
export interface DemoBranch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  coordinates?: { lat: number; lng: number };
}

export const demoBranches: DemoBranch[] = [
  {
    id: 'branch-wangige',
    name: 'Wangige Main',
    address: 'Wangige Town Centre, Off Waiyaki Way, Kiambu County',
    phone: '+254720123456',
    email: 'wangige@karebe.com',
    isActive: true,
    coordinates: { lat: -1.2195, lng: 36.7088 },
  },
  {
    id: 'branch-karura',
    name: 'Karura Branch',
    address: 'Karura Shopping Centre, Kiambu Road',
    phone: '+254720123457',
    email: 'karura@karebe.com',
    isActive: true,
    coordinates: { lat: -1.2305, lng: 36.8169 },
  },
  {
    id: 'branch-city',
    name: 'City Center',
    address: 'Moi Avenue, Next to Hilton Hotel, Nairobi CBD',
    phone: '+254720123458',
    email: 'city@karebe.com',
    isActive: true,
    coordinates: { lat: -1.2863, lng: 36.8172 },
  },
];

// Demo Categories
export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  sortOrder: number;
}

export const demoCategories: DemoCategory[] = [
  {
    id: 'cat-whiskey',
    name: 'Whiskey',
    slug: 'whiskey',
    description: 'Premium Scotch, Bourbon, and Irish whiskies from around the world',
    image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&h=300&fit=crop',
    sortOrder: 1,
  },
  {
    id: 'cat-wine',
    name: 'Wine',
    slug: 'wine',
    description: 'Fine wines from South Africa, France, Italy, and Chile',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
    sortOrder: 2,
  },
  {
    id: 'cat-vodka',
    name: 'Vodka',
    slug: 'vodka',
    description: 'Premium and flavored vodkas for every occasion',
    image: 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=400&h=300&fit=crop',
    sortOrder: 3,
  },
  {
    id: 'cat-gin',
    name: 'Gin',
    slug: 'gin',
    description: 'Craft and premium gins with unique botanical blends',
    image: 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=400&h=300&fit=crop',
    sortOrder: 4,
  },
  {
    id: 'cat-beer',
    name: 'Beer',
    slug: 'beer',
    description: 'Local and imported beers, lagers, and craft brews',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop',
    sortOrder: 5,
  },
  {
    id: 'cat-rum',
    name: 'Rum',
    slug: 'rum',
    description: 'Caribbean and spiced rums for cocktails and sipping',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
    sortOrder: 6,
  },
];

// Product Variant
export interface DemoProductVariant {
  id: string;
  size: string;
  volumeMl: number;
  price: number;
  comparePrice?: number;
  stock: number;
  sku: string;
  barcode?: string;
}

// Demo Products
export interface DemoProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brand: string;
  country: string;
  alcoholContent: number;
  images: string[];
  variants: DemoProductVariant[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export const demoProducts: DemoProduct[] = [
  // Whiskey Products
  {
    id: 'prod-jw-black-001',
    name: 'Johnnie Walker Black Label',
    slug: 'johnnie-walker-black-label',
    description: 'A true icon, Johnnie Walker Black Label is the benchmark for all other deluxe blends. Created using only whiskies aged for a minimum of 12 years from the four corners of Scotland, it has an unmistakably smooth, deep, complex character.',
    categoryId: 'cat-whiskey',
    brand: 'Johnnie Walker',
    country: 'Scotland',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1614313511387-1436b2f0b875?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-jw-black-750', size: '750ml', volumeMl: 750, price: 4500, comparePrice: 5200, stock: 45, sku: 'JW-BLACK-750' },
      { id: 'var-jw-black-1000', size: '1L', volumeMl: 1000, price: 5800, stock: 32, sku: 'JW-BLACK-1000' },
      { id: 'var-jw-black-375', size: '375ml', volumeMl: 375, price: 2500, stock: 28, sku: 'JW-BLACK-375' },
    ],
    tags: ['scotch', 'blend', 'premium', 'best-seller'],
    isActive: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 156,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-jw-blue-001',
    name: 'Johnnie Walker Blue Label',
    slug: 'johnnie-walker-blue-label',
    description: 'Johnnie Walker Blue Label is an unrivaled masterpiece. It is an exquisite blend made from some of Scotland\'s rarest and most exceptional whiskies. Only one in every ten thousand casks has the elusive quality, character and flavor to deliver the remarkable signature taste.',
    categoryId: 'cat-whiskey',
    brand: 'Johnnie Walker',
    country: 'Scotland',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-jw-blue-750', size: '750ml', volumeMl: 750, price: 25000, stock: 12, sku: 'JW-BLUE-750' },
      { id: 'var-jw-blue-1000', size: '1L', volumeMl: 1000, price: 32000, comparePrice: 35000, stock: 8, sku: 'JW-BLUE-1000' },
    ],
    tags: ['scotch', 'ultra-premium', 'luxury', 'rare'],
    isActive: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 89,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-jack-daniels-001',
    name: 'Jack Daniel\'s Old No. 7',
    slug: 'jack-daniels-old-no-7',
    description: 'Mellowed drop by drop through 10-feet of sugar maple charcoal, then matured in handcrafted barrels of our own making. It\'s how Jack Daniel himself did it over a century ago. And how we still do it today.',
    categoryId: 'cat-whiskey',
    brand: 'Jack Daniel\'s',
    country: 'USA',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-jd-750', size: '750ml', volumeMl: 750, price: 3200, stock: 56, sku: 'JD-750' },
      { id: 'var-jd-1000', size: '1L', volumeMl: 1000, price: 4200, stock: 40, sku: 'JD-1000' },
    ],
    tags: ['tennessee', 'bourbon', 'classic', 'best-seller'],
    isActive: true,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 203,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-glenfiddich-12-001',
    name: 'Glenfiddich 12 Year Old',
    slug: 'glenfiddich-12-year-old',
    description: 'Carefully matured in the finest American oak and European oak sherry casks for at least 12 years, it is mellowed in oak marrying tuns to create its sweet and subtle oak flavors. Creamy with a long, smooth and mellow finish.',
    categoryId: 'cat-whiskey',
    brand: 'Glenfiddich',
    country: 'Scotland',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1614313511387-1436b2f0b875?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-glen-12-750', size: '750ml', volumeMl: 750, price: 5200, stock: 35, sku: 'GLEN-12-750' },
    ],
    tags: ['single-malt', 'speyside', 'aged', 'premium'],
    isActive: true,
    isFeatured: false,
    rating: 4.7,
    reviewCount: 124,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-jameson-001',
    name: 'Jameson Irish Whiskey',
    slug: 'jameson-irish-whiskey',
    description: 'Jameson Irish Whiskey is a blended Irish whiskey. What\'s that we hear you say. Well, first we take the best of pot still and fine grain whiskeys. Then we triple distill them – not because we have to, because we want to as it gives it its signature smoothness.',
    categoryId: 'cat-whiskey',
    brand: 'Jameson',
    country: 'Ireland',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-jameson-750', size: '750ml', volumeMl: 750, price: 2800, stock: 48, sku: 'JAMESON-750' },
      { id: 'var-jameson-1000', size: '1L', volumeMl: 1000, price: 3800, stock: 30, sku: 'JAMESON-1000' },
    ],
    tags: ['irish', 'smooth', 'affordable', 'best-seller'],
    isActive: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 178,
    createdAt: '2024-01-15T10:00:00Z',
  },

  // Vodka Products
  {
    id: 'prod-absolut-001',
    name: 'Absolut Vodka',
    slug: 'absolut-vodka',
    description: 'Absolut Vodka is a Swedish vodka made exclusively from natural ingredients, and unlike some other vodkas, it doesn\'t contain any added sugar. In fact Absolut is as clean as vodka can be. Still, it has a certain taste: Rich, full-bodied and complex, yet smooth and mellow.',
    categoryId: 'cat-vodka',
    brand: 'Absolut',
    country: 'Sweden',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-absolut-750', size: '750ml', volumeMl: 750, price: 2200, stock: 60, sku: 'ABSOLUT-750' },
      { id: 'var-absolut-1000', size: '1L', volumeMl: 1000, price: 2900, stock: 45, sku: 'ABSOLUT-1000' },
    ],
    tags: ['swedish', 'classic', 'smooth', 'best-seller'],
    isActive: true,
    isFeatured: true,
    rating: 4.4,
    reviewCount: 145,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-grey-goose-001',
    name: 'Grey Goose Vodka',
    slug: 'grey-goose-vodka',
    description: 'Grey Goose is the result of an absolute determination to create a French vodka unlike any other. Expressed in each bottle of Grey Goose is the essence of the finest ingredients from France; soft winter wheat from in and around Picardy plus pure spring water.',
    categoryId: 'cat-vodka',
    brand: 'Grey Goose',
    country: 'France',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-grey-750', size: '750ml', volumeMl: 750, price: 5500, stock: 25, sku: 'GREY-750' },
      { id: 'var-grey-1000', size: '1L', volumeMl: 1000, price: 7200, stock: 18, sku: 'GREY-1000' },
    ],
    tags: ['french', 'premium', 'luxury', 'smooth'],
    isActive: true,
    isFeatured: false,
    rating: 4.6,
    reviewCount: 98,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-smirnoff-001',
    name: 'Smirnoff Red Label',
    slug: 'smirnoff-red-label',
    description: 'Smirnoff Red is a brand of vodka that is renowned for its smooth taste and versatility. It is triple-distilled from grain and filtered ten times through charcoal for an exceptionally pure-tasting, smooth spirit.',
    categoryId: 'cat-vodka',
    brand: 'Smirnoff',
    country: 'UK',
    alcoholContent: 37.5,
    images: [
      'https://images.unsplash.com/photo-1575023782549-62ca0d244b39?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-smirnoff-750', size: '750ml', volumeMl: 750, price: 1500, stock: 80, sku: 'SMIRNOFF-750' },
      { id: 'var-smirnoff-1000', size: '1L', volumeMl: 1000, price: 2000, stock: 65, sku: 'SMIRNOFF-1000' },
    ],
    tags: ['affordable', 'mixing', 'classic', 'best-seller'],
    isActive: true,
    isFeatured: false,
    rating: 4.2,
    reviewCount: 234,
    createdAt: '2024-01-15T10:00:00Z',
  },

  // Gin Products
  {
    id: 'prod-bombay-001',
    name: 'Bombay Sapphire Gin',
    slug: 'bombay-sapphire-gin',
    description: 'Bombay Sapphire is a London Dry gin, which is produced through vapor infusion. The ten botanicals used are almond, lemon peel, liquorice, juniper berries, orris root, angelica, coriander, cassia, cubeb, and grains of paradise.',
    categoryId: 'cat-gin',
    brand: 'Bombay Sapphire',
    country: 'UK',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-bombay-750', size: '750ml', volumeMl: 750, price: 3500, stock: 40, sku: 'BOMBAY-750' },
      { id: 'var-bombay-1000', size: '1L', volumeMl: 1000, price: 4800, stock: 28, sku: 'BOMBAY-1000' },
    ],
    tags: ['london-dry', 'botanical', 'premium', 'classic'],
    isActive: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 112,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-tanqueray-001',
    name: 'Tanqueray London Dry Gin',
    slug: 'tanqueray-london-dry-gin',
    description: 'Tanqueray London Dry Gin is made with an expertly crafted recipe that blends the four distinct botanicals of juniper, coriander, angelica and licorice. The result is a perfectly balanced spirit that has a unique herbal quality and dry finish.',
    categoryId: 'cat-gin',
    brand: 'Tanqueray',
    country: 'UK',
    alcoholContent: 43.1,
    images: [
      'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-tanqueray-750', size: '750ml', volumeMl: 750, price: 3200, stock: 38, sku: 'TANQUERAY-750' },
      { id: 'var-tanqueray-1000', size: '1L', volumeMl: 1000, price: 4200, stock: 25, sku: 'TANQUERAY-1000' },
    ],
    tags: ['london-dry', 'classic', 'botanical', 'best-seller'],
    isActive: true,
    isFeatured: false,
    rating: 4.4,
    reviewCount: 156,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-hendricks-001',
    name: 'Hendrick\'s Gin',
    slug: 'hendricks-gin',
    description: 'Hendrick\'s is an unusual gin created from eleven fine botanicals. The curious, yet marvelous, infusions of rose & cucumber imbue the spirit with its uniquely balanced flavor.',
    categoryId: 'cat-gin',
    brand: 'Hendrick\'s',
    country: 'Scotland',
    alcoholContent: 41.4,
    images: [
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-hendricks-750', size: '750ml', volumeMl: 750, price: 4800, stock: 22, sku: 'HENDRICKS-750' },
    ],
    tags: ['craft', 'botanical', 'unique', 'premium'],
    isActive: true,
    isFeatured: true,
    rating: 4.7,
    reviewCount: 87,
    createdAt: '2024-01-15T10:00:00Z',
  },

  // Wine Products
  {
    id: 'prod-four-cousins-001',
    name: 'Four Cousins Natural Sweet Red',
    slug: 'four-cousins-natural-sweet-red',
    description: 'South Africa\'s favorite wine! A smooth and easy-drinking wine with a soft, sweet finish. Perfect for any occasion, from casual gatherings to special celebrations.',
    categoryId: 'cat-wine',
    brand: 'Four Cousins',
    country: 'South Africa',
    alcoholContent: 11.5,
    images: [
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-fc-red-750', size: '750ml', volumeMl: 750, price: 950, stock: 100, sku: 'FC-RED-750' },
      { id: 'var-fc-red-1500', size: '1.5L', volumeMl: 1500, price: 1800, stock: 45, sku: 'FC-RED-1500' },
    ],
    tags: ['sweet', 'red', 'south-african', 'best-seller', 'affordable'],
    isActive: true,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 312,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-four-cousins-002',
    name: 'Four Cousins Natural Sweet White',
    slug: 'four-cousins-natural-sweet-white',
    description: 'A deliciously sweet white wine with tropical fruit flavors and a refreshing finish. Light, fruity and perfect for warm days or pairing with spicy foods.',
    categoryId: 'cat-wine',
    brand: 'Four Cousins',
    country: 'South Africa',
    alcoholContent: 11,
    images: [
      'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-fc-white-750', size: '750ml', volumeMl: 750, price: 950, stock: 85, sku: 'FC-WHITE-750' },
    ],
    tags: ['sweet', 'white', 'south-african', 'fruity', 'affordable'],
    isActive: true,
    isFeatured: false,
    rating: 4.4,
    reviewCount: 198,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-4th-street-001',
    name: '4th Street Sweet Red',
    slug: '4th-street-sweet-red',
    description: '4th Street Sweet Red is a vibrant, easy-drinking wine that\'s perfect for everyday enjoyment. Bursting with ripe red fruit flavors and a smooth, sweet finish.',
    categoryId: 'cat-wine',
    brand: '4th Street',
    country: 'South Africa',
    alcoholContent: 10.5,
    images: [
      'https://images.unsplash.com/photo-1586370434639-0fe43b2d32e6?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-4th-red-750', size: '750ml', volumeMl: 750, price: 850, stock: 90, sku: '4TH-RED-750' },
    ],
    tags: ['sweet', 'red', 'south-african', 'entry-level', 'party'],
    isActive: true,
    isFeatured: false,
    rating: 4.3,
    reviewCount: 245,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-capel-wine-001',
    name: 'Capel Vale Debut Cabernet Sauvignon',
    slug: 'capel-vale-debut-cabernet-sauvignon',
    description: 'A classic Australian Cabernet Sauvignon with rich blackcurrant flavors, hints of mint and a smooth tannin structure. Perfect with grilled meats and hearty dishes.',
    categoryId: 'cat-wine',
    brand: 'Capel Vale',
    country: 'Australia',
    alcoholContent: 13.5,
    images: [
      'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-capel-cab-750', size: '750ml', volumeMl: 750, price: 1800, stock: 40, sku: 'CAPEL-CAB-750' },
    ],
    tags: ['dry', 'red', 'australian', 'full-bodied', 'dinner'],
    isActive: true,
    isFeatured: false,
    rating: 4.2,
    reviewCount: 76,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-jacobs-creek-001',
    name: 'Jacob\'s Creek Shiraz',
    slug: 'jacobs-creek-shiraz',
    description: 'A full-bodied Australian Shiraz with rich plum and spice flavors, smooth tannins and a lingering finish. An excellent example of Australian winemaking.',
    categoryId: 'cat-wine',
    brand: 'Jacob\'s Creek',
    country: 'Australia',
    alcoholContent: 13.8,
    images: [
      'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-jacob-shiraz-750', size: '750ml', volumeMl: 750, price: 2200, stock: 35, sku: 'JACOB-SHIRAZ-750' },
    ],
    tags: ['dry', 'red', 'australian', 'shiraz', 'premium'],
    isActive: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 112,
    createdAt: '2024-01-15T10:00:00Z',
  },

  // Beer Products
  {
    id: 'prod-tusker-001',
    name: 'Tusker Lager',
    slug: 'tusker-lager',
    description: 'Kenya\'s iconic beer! Tusker Lager is a refreshing, crisp lager with a distinct golden color and a balanced, malty taste. Brewed with 100% African ingredients.',
    categoryId: 'cat-beer',
    brand: 'Tusker',
    country: 'Kenya',
    alcoholContent: 4.2,
    images: [
      'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-tusker-500', size: '500ml Bottle', volumeMl: 500, price: 220, stock: 200, sku: 'TUSKER-500' },
      { id: 'var-tusker-330', size: '330ml Can', volumeMl: 330, price: 180, stock: 150, sku: 'TUSKER-330' },
      { id: 'var-tusker-pack', size: '6-Pack (500ml)', volumeMl: 3000, price: 1200, stock: 80, sku: 'TUSKER-6PACK' },
    ],
    tags: ['lager', 'kenyan', 'best-seller', 'refreshing', 'local'],
    isActive: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 456,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-whitecap-001',
    name: 'Whitecap Lager',
    slug: 'whitecap-lager',
    description: 'Whitecap Lager is a premium Kenyan beer with a smooth, clean taste and a refreshing finish. Perfect for those who appreciate quality brewing.',
    categoryId: 'cat-beer',
    brand: 'Whitecap',
    country: 'Kenya',
    alcoholContent: 4.2,
    images: [
      'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-whitecap-500', size: '500ml Bottle', volumeMl: 500, price: 200, stock: 180, sku: 'WHITECAP-500' },
    ],
    tags: ['lager', 'kenyan', 'smooth', 'local', 'premium'],
    isActive: true,
    isFeatured: false,
    rating: 4.3,
    reviewCount: 234,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-heniken-001',
    name: 'Heineken',
    slug: 'heineken',
    description: 'Heineken is a full-bodied premium lager with deep golden color, a mild bitter taste and a balanced hop aroma. The world\'s most international premium beer.',
    categoryId: 'cat-beer',
    brand: 'Heineken',
    country: 'Netherlands',
    alcoholContent: 5,
    images: [
      'https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-heineken-500', size: '500ml Bottle', volumeMl: 500, price: 350, stock: 120, sku: 'HEINEKEN-500' },
      { id: 'var-heineken-330', size: '330ml Can', volumeMl: 330, price: 280, stock: 100, sku: 'HEINEKEN-330' },
    ],
    tags: ['lager', 'premium', 'imported', 'international'],
    isActive: true,
    isFeatured: true,
    rating: 4.4,
    reviewCount: 189,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-guinness-001',
    name: 'Guinness Foreign Extra Stout',
    slug: 'guinness-foreign-extra-stout',
    description: 'Guinness Foreign Extra Stout is a bold, full-bodied stout with complex flavors of roasted malt, fruit and a characteristic bittersweet finish.',
    categoryId: 'cat-beer',
    brand: 'Guinness',
    country: 'Ireland',
    alcoholContent: 7.5,
    images: [
      'https://images.unsplash.com/photo-1546636889-ba9fdd63583e?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-guinness-500', size: '500ml Bottle', volumeMl: 500, price: 320, stock: 90, sku: 'GUINNESS-500' },
    ],
    tags: ['stout', 'dark', 'imported', 'full-bodied', 'strong'],
    isActive: true,
    isFeatured: false,
    rating: 4.6,
    reviewCount: 145,
    createdAt: '2024-01-15T10:00:00Z',
  },

  // Rum Products
  {
    id: 'prod-captain-morgan-001',
    name: 'Captain Morgan Spiced Gold',
    slug: 'captain-morgan-spiced-gold',
    description: 'Captain Morgan Spiced Gold is a premium spirit drink made with the finest Caribbean rum, adventurous spices and natural flavors. It is matured in bourbon barrels.',
    categoryId: 'cat-rum',
    brand: 'Captain Morgan',
    country: 'Jamaica',
    alcoholContent: 35,
    images: [
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-captain-750', size: '750ml', volumeMl: 750, price: 2200, stock: 55, sku: 'CAPTAIN-750' },
      { id: 'var-captain-1000', size: '1L', volumeMl: 1000, price: 2900, stock: 40, sku: 'CAPTAIN-1000' },
    ],
    tags: ['spiced', 'caribbean', 'best-seller', 'mixing', 'smooth'],
    isActive: true,
    isFeatured: true,
    rating: 4.4,
    reviewCount: 167,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-bacardi-001',
    name: 'Bacardi Carta Blanca',
    slug: 'bacardi-carta-blanca',
    description: 'Bacardi Carta Blanca is a light tasting and aromatic white rum with delicate floral and fruity notes. Perfect for mixing in classic cocktails like Mojitos and Daiquiris.',
    categoryId: 'cat-rum',
    brand: 'Bacardi',
    country: 'Puerto Rico',
    alcoholContent: 37.5,
    images: [
      'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-bacardi-750', size: '750ml', volumeMl: 750, price: 2400, stock: 60, sku: 'BACARDI-750' },
      { id: 'var-bacardi-1000', size: '1L', volumeMl: 1000, price: 3100, stock: 45, sku: 'BACARDI-1000' },
    ],
    tags: ['white', 'cuban-style', 'cocktails', 'classic', 'mixing'],
    isActive: true,
    isFeatured: false,
    rating: 4.3,
    reviewCount: 198,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-havana-001',
    name: 'Havana Club 7 Year Old',
    slug: 'havana-club-7-year-old',
    description: 'Havana Club 7 Year Old is a beautifully Cuban rum, aged in oak barrels for a warm, complex taste with notes of cocoa, vanilla, and sweet tobacco.',
    categoryId: 'cat-rum',
    brand: 'Havana Club',
    country: 'Cuba',
    alcoholContent: 40,
    images: [
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=600&fit=crop',
    ],
    variants: [
      { id: 'var-havana-750', size: '750ml', volumeMl: 750, price: 3800, stock: 30, sku: 'HAVANA-750' },
    ],
    tags: ['aged', 'cuban', 'premium', 'sipping', 'smooth'],
    isActive: true,
    isFeatured: true,
    rating: 4.7,
    reviewCount: 87,
    createdAt: '2024-01-15T10:00:00Z',
  },
];

// Demo Orders
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'mpesa' | 'card' | 'cash';

export interface DemoOrderItem {
  productId: string;
  productName: string;
  variantId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DemoOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  branchId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  items: DemoOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  mpesaCode?: string;
  riderId?: string;
  riderName?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export const demoOrders: DemoOrder[] = [
  {
    id: 'order-001',
    orderNumber: 'KRB-240301-001',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Muthiga Estate, House 45, Waiyaki Way',
    deliveryNotes: 'Call when you reach the gate',
    branchId: 'branch-wangige',
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-jw-black-001', productName: 'Johnnie Walker Black Label', variantId: 'var-jw-black-750', size: '750ml', quantity: 1, unitPrice: 4500, subtotal: 4500 },
      { productId: 'prod-four-cousins-001', productName: 'Four Cousins Natural Sweet Red', variantId: 'var-fc-red-750', size: '750ml', quantity: 2, unitPrice: 950, subtotal: 1900 },
    ],
    subtotal: 6400,
    deliveryFee: 200,
    total: 6600,
    mpesaCode: 'MPESA123456',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    createdAt: '2024-03-01T10:30:00Z',
    updatedAt: '2024-03-01T14:20:00Z',
    deliveredAt: '2024-03-01T14:15:00Z',
  },
  {
    id: 'order-002',
    orderNumber: 'KRB-240301-002',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Muthiga Estate, House 45, Waiyaki Way',
    branchId: 'branch-wangige',
    status: 'out_for_delivery',
    paymentStatus: 'paid',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-tusker-001', productName: 'Tusker Lager', variantId: 'var-tusker-pack', size: '6-Pack (500ml)', quantity: 2, unitPrice: 1200, subtotal: 2400 },
      { productId: 'prod-absolut-001', productName: 'Absolut Vodka', variantId: 'var-absolut-750', size: '750ml', quantity: 1, unitPrice: 2200, subtotal: 2200 },
    ],
    subtotal: 4600,
    deliveryFee: 200,
    total: 4800,
    mpesaCode: 'MPESA789012',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    createdAt: '2024-03-01T16:00:00Z',
    updatedAt: '2024-03-01T16:15:00Z',
  },
  {
    id: 'order-003',
    orderNumber: 'KRB-240302-001',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'ABC Place, Westlands, Office 302',
    branchId: 'branch-city',
    status: 'processing',
    paymentStatus: 'paid',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-grey-goose-001', productName: 'Grey Goose Vodka', variantId: 'var-grey-750', size: '750ml', quantity: 1, unitPrice: 5500, subtotal: 5500 },
      { productId: 'prod-bombay-001', productName: 'Bombay Sapphire Gin', variantId: 'var-bombay-750', size: '750ml', quantity: 1, unitPrice: 3500, subtotal: 3500 },
      { productId: 'prod-tanqueray-001', productName: 'Tanqueray London Dry Gin', variantId: 'var-tanqueray-750', size: '750ml', quantity: 1, unitPrice: 3200, subtotal: 3200 },
    ],
    subtotal: 12200,
    deliveryFee: 300,
    total: 12500,
    mpesaCode: 'MPESA345678',
    createdAt: '2024-03-02T09:00:00Z',
    updatedAt: '2024-03-02T09:05:00Z',
  },
  {
    id: 'order-004',
    orderNumber: 'KRB-240302-002',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Karura, Off Kiambu Road, Plot 12',
    branchId: 'branch-karura',
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-jameson-001', productName: 'Jameson Irish Whiskey', variantId: 'var-jameson-1000', size: '1L', quantity: 1, unitPrice: 3800, subtotal: 3800 },
      { productId: 'prod-four-cousins-002', productName: 'Four Cousins Natural Sweet White', variantId: 'var-fc-white-750', size: '750ml', quantity: 3, unitPrice: 950, subtotal: 2850 },
    ],
    subtotal: 6650,
    deliveryFee: 150,
    total: 6800,
    createdAt: '2024-03-02T14:30:00Z',
    updatedAt: '2024-03-02T14:30:00Z',
  },
  {
    id: 'order-005',
    orderNumber: 'KRB-240302-003',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Westgate Mall, 3rd Floor, Mwanzi Road',
    branchId: 'branch-city',
    status: 'ready',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    items: [
      { productId: 'prod-jw-blue-001', productName: 'Johnnie Walker Blue Label', variantId: 'var-jw-blue-750', size: '750ml', quantity: 1, unitPrice: 25000, subtotal: 25000 },
    ],
    subtotal: 25000,
    deliveryFee: 500,
    total: 25500,
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    createdAt: '2024-03-02T18:00:00Z',
    updatedAt: '2024-03-02T18:30:00Z',
  },
  {
    id: 'order-006',
    orderNumber: 'KRB-240303-001',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Muthiga Estate, House 45, Waiyaki Way',
    branchId: 'branch-wangige',
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-captain-morgan-001', productName: 'Captain Morgan Spiced Gold', variantId: 'var-captain-750', size: '750ml', quantity: 2, unitPrice: 2200, subtotal: 4400 },
      { productId: 'prod-tusker-001', productName: 'Tusker Lager', variantId: 'var-tusker-pack', size: '6-Pack (500ml)', quantity: 3, unitPrice: 1200, subtotal: 3600 },
      { productId: 'prod-heniken-001', productName: 'Heineken', variantId: 'var-heineken-500', size: '500ml Bottle', quantity: 6, unitPrice: 350, subtotal: 2100 },
    ],
    subtotal: 10100,
    deliveryFee: 200,
    total: 10300,
    mpesaCode: 'MPESA901234',
    createdAt: '2024-03-03T11:00:00Z',
    updatedAt: '2024-03-03T11:05:00Z',
  },
  {
    id: 'order-007',
    orderNumber: 'KRB-240303-002',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Kilimani, Ngong Road, Apartment 5B',
    branchId: 'branch-city',
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-glenfiddich-12-001', productName: 'Glenfiddich 12 Year Old', variantId: 'var-glen-12-750', size: '750ml', quantity: 1, unitPrice: 5200, subtotal: 5200 },
      { productId: 'prod-jacobs-creek-001', productName: 'Jacob\'s Creek Shiraz', variantId: 'var-jacob-shiraz-750', size: '750ml', quantity: 2, unitPrice: 2200, subtotal: 4400 },
    ],
    subtotal: 9600,
    deliveryFee: 250,
    total: 9850,
    mpesaCode: 'MPESA567890',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    createdAt: '2024-03-03T15:00:00Z',
    updatedAt: '2024-03-03T17:30:00Z',
    deliveredAt: '2024-03-03T17:20:00Z',
  },
  {
    id: 'order-008',
    orderNumber: 'KRB-240303-003',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Karen, Bogani Road, House 78',
    branchId: 'branch-city',
    status: 'cancelled',
    paymentStatus: 'refunded',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-jack-daniels-001', productName: 'Jack Daniel\'s Old No. 7', variantId: 'var-jd-1000', size: '1L', quantity: 1, unitPrice: 4200, subtotal: 4200 },
    ],
    subtotal: 4200,
    deliveryFee: 300,
    total: 4500,
    mpesaCode: 'MPESA111222',
    createdAt: '2024-03-03T19:00:00Z',
    updatedAt: '2024-03-03T19:30:00Z',
  },
  {
    id: 'order-009',
    orderNumber: 'KRB-240304-001',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Runda, Mimosa Drive, House 12',
    branchId: 'branch-karura',
    status: 'out_for_delivery',
    paymentStatus: 'paid',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-havana-001', productName: 'Havana Club 7 Year Old', variantId: 'var-havana-750', size: '750ml', quantity: 1, unitPrice: 3800, subtotal: 3800 },
      { productId: 'prod-bacardi-001', productName: 'Bacardi Carta Blanca', variantId: 'var-bacardi-750', size: '750ml', quantity: 1, unitPrice: 2400, subtotal: 2400 },
      { productId: 'prod-smirnoff-001', productName: 'Smirnoff Red Label', variantId: 'var-smirnoff-1000', size: '1L', quantity: 1, unitPrice: 2000, subtotal: 2000 },
    ],
    subtotal: 8200,
    deliveryFee: 400,
    total: 8600,
    mpesaCode: 'MPESA333444',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    createdAt: '2024-03-04T10:00:00Z',
    updatedAt: '2024-03-04T10:30:00Z',
  },
  {
    id: 'order-010',
    orderNumber: 'KRB-240304-002',
    customerId: 'user-customer-001',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    customerEmail: 'customer@karebe.com',
    deliveryAddress: 'Muthiga Estate, House 45, Waiyaki Way',
    branchId: 'branch-wangige',
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'mpesa',
    items: [
      { productId: 'prod-hendricks-001', productName: 'Hendrick\'s Gin', variantId: 'var-hendricks-750', size: '750ml', quantity: 1, unitPrice: 4800, subtotal: 4800 },
      { productId: 'prod-whitecap-001', productName: 'Whitecap Lager', variantId: 'var-whitecap-500', size: '500ml Bottle', quantity: 12, unitPrice: 200, subtotal: 2400 },
    ],
    subtotal: 7200,
    deliveryFee: 200,
    total: 7400,
    createdAt: '2024-03-04T14:00:00Z',
    updatedAt: '2024-03-04T14:00:00Z',
  },
];

// Demo Delivery Assignments
export interface DemoDeliveryAssignment {
  id: string;
  orderId: string;
  riderId: string;
  riderName: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  pickupBranchId: string;
  pickupBranchName: string;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export const demoDeliveries: DemoDeliveryAssignment[] = [
  {
    id: 'delivery-001',
    orderId: 'order-002',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    status: 'in_transit',
    pickupBranchId: 'branch-wangige',
    pickupBranchName: 'Wangige Main',
    deliveryAddress: 'Muthiga Estate, House 45, Waiyaki Way',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    assignedAt: '2024-03-01T16:15:00Z',
    pickedUpAt: '2024-03-01T16:30:00Z',
    notes: 'Customer requested call upon arrival',
  },
  {
    id: 'delivery-002',
    orderId: 'order-005',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    status: 'assigned',
    pickupBranchId: 'branch-city',
    pickupBranchName: 'City Center',
    deliveryAddress: 'Westgate Mall, 3rd Floor, Mwanzi Road',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    assignedAt: '2024-03-02T18:30:00Z',
    notes: 'High-value order - cash payment on delivery',
  },
  {
    id: 'delivery-003',
    orderId: 'order-001',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    status: 'delivered',
    pickupBranchId: 'branch-wangige',
    pickupBranchName: 'Wangige Main',
    deliveryAddress: 'Muthiga Estate, House 45, Waiyaki Way',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    assignedAt: '2024-03-01T10:35:00Z',
    pickedUpAt: '2024-03-01T10:45:00Z',
    deliveredAt: '2024-03-01T14:15:00Z',
  },
  {
    id: 'delivery-004',
    orderId: 'order-007',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    status: 'delivered',
    pickupBranchId: 'branch-city',
    pickupBranchName: 'City Center',
    deliveryAddress: 'Kilimani, Ngong Road, Apartment 5B',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    assignedAt: '2024-03-03T15:05:00Z',
    pickedUpAt: '2024-03-03T15:20:00Z',
    deliveredAt: '2024-03-03T17:20:00Z',
    notes: 'Delivered to security at gate',
  },
  {
    id: 'delivery-005',
    orderId: 'order-009',
    riderId: '550e8400-e29b-41d4-a716-446655440000',
    riderName: 'Peter Ochieng',
    status: 'picked_up',
    pickupBranchId: 'branch-karura',
    pickupBranchName: 'Karura Branch',
    deliveryAddress: 'Runda, Mimosa Drive, House 12',
    customerName: 'Sarah Wanjiku',
    customerPhone: '+254734567890',
    assignedAt: '2024-03-04T10:30:00Z',
    pickedUpAt: '2024-03-04T10:45:00Z',
  },
];

// Demo Cart Items (for initial customer cart)
export interface DemoCartItem {
  productId: string;
  variantId: string;
  quantity: number;
  addedAt: string;
}

export const demoCart: DemoCartItem[] = [
  {
    productId: 'prod-jw-black-001',
    variantId: 'var-jw-black-750',
    quantity: 1,
    addedAt: '2024-03-04T09:00:00Z',
  },
  {
    productId: 'prod-four-cousins-001',
    variantId: 'var-fc-red-750',
    quantity: 2,
    addedAt: '2024-03-04T09:05:00Z',
  },
];

// LocalStorage Keys
export const DEMO_STORAGE_KEYS = {
  USERS: 'karebe_demo_users',
  BRANCHES: 'karebe_demo_branches',
  CATEGORIES: 'karebe_demo_categories',
  PRODUCTS: 'karebe_demo_products',
  ORDERS: 'karebe_demo_orders',
  DELIVERIES: 'karebe_demo_deliveries',
  CART: 'karebe_demo_cart',
  SEEDED: 'karebe_demo_seeded',
  SEED_DATE: 'karebe_demo_seed_date',
} as const;

// Demo Settings
export const demoSettings = {
  appName: 'Karebe Wine & Spirits',
  currency: 'KES',
  currencySymbol: 'KSh',
  deliveryFeeBase: 200,
  deliveryFeePerKm: 50,
  minOrderAmount: 500,
  maxDeliveryDistanceKm: 20,
  mpesaPaybill: '123456',
  supportPhone: '+254720123456',
  supportEmail: 'support@karebe.com',
} as const;

// Helper function to format price
export function formatPrice(price: number): string {
  return `${demoSettings.currencySymbol} ${price.toLocaleString('en-KE')}`;
}

// Helper to get all products count
export function getTotalProductsCount(): number {
  return demoProducts.length;
}

// Helper to get total variants count
export function getTotalVariantsCount(): number {
  return demoProducts.reduce((acc, product) => acc + product.variants.length, 0);
}

// Helper to get total stock value
export function getTotalStockValue(): number {
  return demoProducts.reduce((acc, product) => {
    return acc + product.variants.reduce((variantAcc, variant) => {
      return variantAcc + (variant.price * variant.stock);
    }, 0);
  }, 0);
}

// Helper to get orders by status
export function getOrdersByStatus(status: OrderStatus): DemoOrder[] {
  return demoOrders.filter(order => order.status === status);
}

// Helper to get pending deliveries
export function getPendingDeliveries(): DemoDeliveryAssignment[] {
  return demoDeliveries.filter(d => d.status !== 'delivered');
}

// Helper to get low stock products (less than 20)
export function getLowStockProducts(): DemoProduct[] {
  return demoProducts.filter(product => 
    product.variants.some(variant => variant.stock < 20)
  );
}
