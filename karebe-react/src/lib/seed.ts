/**
 * Karebe React Demo Data Seeding Utility
 * Handles initialization and management of demo data in localStorage
 */

import {
  demoUsers,
  demoBranches,
  demoCategories,
  demoProducts,
  demoOrders,
  demoDeliveries,
  demoCart,
  DEMO_STORAGE_KEYS,
  type DemoUser,
  type DemoBranch,
  type DemoCategory,
  type DemoProduct,
  type DemoOrder,
  type DemoDeliveryAssignment,
  type DemoCartItem,
} from './demo-data';

// Logger utility for seeding operations
const logger = {
  info: (message: string) => console.log(`[KAREBE-SEED] ℹ️ ${message}`),
  success: (message: string) => console.log(`[KAREBE-SEED] ✅ ${message}`),
  warning: (message: string) => console.log(`[KAREBE-SEED] ⚠️ ${message}`),
  error: (message: string) => console.error(`[KAREBE-SEED] ❌ ${message}`),
};

// Seed result interface
export interface SeedResult {
  success: boolean;
  message: string;
  details?: {
    users: number;
    branches: number;
    categories: number;
    products: number;
    variants?: number;
    orders: number;
    deliveries: number;
    lastSeeded?: Date | null;
  };
  error?: Error;
}

/**
 * Check if demo data has already been seeded
 */
export function isDemoDataSeeded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_STORAGE_KEYS.SEEDED) === 'true';
}

/**
 * Get the date when demo data was last seeded
 */
export function getLastSeedDate(): Date | null {
  if (typeof window === 'undefined') return null;
  const dateStr = localStorage.getItem(DEMO_STORAGE_KEYS.SEED_DATE);
  return dateStr ? new Date(dateStr) : null;
}

/**
 * Seed all demo data into localStorage
 */
export function seedDemoData(force = false): SeedResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      message: 'Cannot seed data: not in browser environment',
    };
  }

  try {
    // Check if already seeded (unless force is true)
    if (isDemoDataSeeded() && !force) {
      logger.info('Demo data already exists. Use force=true to reseed.');
      return {
        success: true,
        message: 'Demo data already exists in localStorage',
        details: getSeedSummary() || undefined,
      };
    }

    if (force) {
      logger.warning('Force reseeding - clearing existing demo data...');
      clearDemoData();
    }

    logger.info('Starting demo data seeding...');

    // Seed users
    localStorage.setItem(DEMO_STORAGE_KEYS.USERS, JSON.stringify(demoUsers));
    logger.success(`Seeded ${demoUsers.length} users`);

    // Seed branches
    localStorage.setItem(DEMO_STORAGE_KEYS.BRANCHES, JSON.stringify(demoBranches));
    logger.success(`Seeded ${demoBranches.length} branches`);

    // Seed categories
    localStorage.setItem(DEMO_STORAGE_KEYS.CATEGORIES, JSON.stringify(demoCategories));
    logger.success(`Seeded ${demoCategories.length} categories`);

    // Seed products
    localStorage.setItem(DEMO_STORAGE_KEYS.PRODUCTS, JSON.stringify(demoProducts));
    logger.success(`Seeded ${demoProducts.length} products with ${demoProducts.reduce((acc, p) => acc + p.variants.length, 0)} variants`);

    // Seed orders
    localStorage.setItem(DEMO_STORAGE_KEYS.ORDERS, JSON.stringify(demoOrders));
    logger.success(`Seeded ${demoOrders.length} orders`);

    // Seed deliveries
    localStorage.setItem(DEMO_STORAGE_KEYS.DELIVERIES, JSON.stringify(demoDeliveries));
    logger.success(`Seeded ${demoDeliveries.length} delivery assignments`);

    // Seed cart (for customer)
    localStorage.setItem(DEMO_STORAGE_KEYS.CART, JSON.stringify(demoCart));
    logger.success(`Seeded ${demoCart.length} cart items`);

    // Mark as seeded
    localStorage.setItem(DEMO_STORAGE_KEYS.SEEDED, 'true');
    localStorage.setItem(DEMO_STORAGE_KEYS.SEED_DATE, new Date().toISOString());

    const summary = getSeedSummary();
    logger.success('Demo data seeding completed successfully!');
    logger.info(`Total products: ${summary?.products}, Orders: ${summary?.orders}, Users: ${summary?.users}`);

    return {
      success: true,
      message: 'Demo data seeded successfully',
      details: summary || undefined,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Seeding failed: ${err.message}`);
    return {
      success: false,
      message: `Seeding failed: ${err.message}`,
      error: err,
    };
  }
}

/**
 * Clear all demo data from localStorage
 */
export function clearDemoData(): void {
  if (typeof window === 'undefined') return;

  logger.info('Clearing demo data from localStorage...');

  Object.values(DEMO_STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });

  logger.success('Demo data cleared');
}

/**
 * Reset demo data (clear and re-seed)
 */
export function resetDemoData(): SeedResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      message: 'Cannot reset data: not in browser environment',
    };
  }

  logger.warning('Resetting demo data...');
  clearDemoData();
  return seedDemoData(true);
}

/**
 * Get seed summary/statistics
 */
export function getSeedSummary() {
  if (typeof window === 'undefined') return null;

  try {
    const users = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.USERS) || '[]') as DemoUser[];
    const branches = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.BRANCHES) || '[]') as DemoBranch[];
    const categories = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.CATEGORIES) || '[]') as DemoCategory[];
    const products = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.PRODUCTS) || '[]') as DemoProduct[];
    const orders = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.ORDERS) || '[]') as DemoOrder[];
    const deliveries = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.DELIVERIES) || '[]') as DemoDeliveryAssignment[];

    return {
      users: users.length,
      branches: branches.length,
      categories: categories.length,
      products: products.length,
      variants: products.reduce((acc, p) => acc + p.variants.length, 0),
      orders: orders.length,
      deliveries: deliveries.length,
      lastSeeded: getLastSeedDate(),
    };
  } catch {
    return null;
  }
}

/**
 * Get a demo user by credentials
 */
export function getDemoUserByCredentials(email: string, password: string): DemoUser | null {
  if (typeof window === 'undefined') return null;

  const users = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.USERS) || '[]') as DemoUser[];
  return users.find(u => u.email === email && u.password === password) || null;
}

/**
 * Get demo user by ID
 */
export function getDemoUserById(userId: string): DemoUser | null {
  if (typeof window === 'undefined') return null;

  const users = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.USERS) || '[]') as DemoUser[];
  return users.find(u => u.id === userId) || null;
}

/**
 * Get all demo users
 */
export function getAllDemoUsers(): DemoUser[] {
  if (typeof window === 'undefined') return [];

  return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.USERS) || '[]') as DemoUser[];
}

/**
 * Get demo products
 */
export function getDemoProducts(): DemoProduct[] {
  if (typeof window === 'undefined') return [];

  return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.PRODUCTS) || '[]') as DemoProduct[];
}

/**
 * Get demo categories
 */
export function getDemoCategories(): DemoCategory[] {
  if (typeof window === 'undefined') return [];

  return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.CATEGORIES) || '[]') as DemoCategory[];
}

/**
 * Get demo branches
 */
export function getDemoBranches(): DemoBranch[] {
  if (typeof window === 'undefined') return [];

  return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.BRANCHES) || '[]') as DemoBranch[];
}

/**
 * Get demo orders (optionally filtered by customer)
 */
export function getDemoOrders(customerId?: string): DemoOrder[] {
  if (typeof window === 'undefined') return [];

  const orders = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.ORDERS) || '[]') as DemoOrder[];
  if (customerId) {
    return orders.filter(o => o.customerId === customerId);
  }
  return orders;
}

/**
 * Get demo deliveries (optionally filtered by rider)
 */
export function getDemoDeliveries(riderId?: string): DemoDeliveryAssignment[] {
  if (typeof window === 'undefined') return [];

  const deliveries = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.DELIVERIES) || '[]') as DemoDeliveryAssignment[];
  if (riderId) {
    return deliveries.filter(d => d.riderId === riderId);
  }
  return deliveries;
}

/**
 * Get demo cart for a customer
 */
export function getDemoCart(customerId?: string): DemoCartItem[] {
  if (typeof window === 'undefined') return [];

  // For now, we use a single demo cart
  return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.CART) || '[]') as DemoCartItem[];
}

/**
 * Update demo cart
 */
export function updateDemoCart(cart: DemoCartItem[]): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(DEMO_STORAGE_KEYS.CART, JSON.stringify(cart));
}

/**
 * Add an order to demo data
 */
export function addDemoOrder(order: DemoOrder): void {
  if (typeof window === 'undefined') return;

  const orders = getDemoOrders();
  orders.push(order);
  localStorage.setItem(DEMO_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

/**
 * Update an order in demo data
 */
export function updateDemoOrder(orderId: string, updates: Partial<DemoOrder>): void {
  if (typeof window === 'undefined') return;

  const orders = getDemoOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates };
    localStorage.setItem(DEMO_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
}

/**
 * Add a delivery assignment
 */
export function addDemoDelivery(delivery: DemoDeliveryAssignment): void {
  if (typeof window === 'undefined') return;

  const deliveries = getDemoDeliveries();
  deliveries.push(delivery);
  localStorage.setItem(DEMO_STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
}

/**
 * Update a delivery assignment
 */
export function updateDemoDelivery(deliveryId: string, updates: Partial<DemoDeliveryAssignment>): void {
  if (typeof window === 'undefined') return;

  const deliveries = getDemoDeliveries();
  const index = deliveries.findIndex(d => d.id === deliveryId);
  if (index !== -1) {
    deliveries[index] = { ...deliveries[index], ...updates };
    localStorage.setItem(DEMO_STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
  }
}

/**
 * Update product stock
 */
export function updateDemoProductStock(productId: string, variantId: string, newStock: number): void {
  if (typeof window === 'undefined') return;

  const products = getDemoProducts();
  const product = products.find(p => p.id === productId);
  if (product) {
    const variant = product.variants.find(v => v.id === variantId);
    if (variant) {
      variant.stock = Math.max(0, newStock);
      localStorage.setItem(DEMO_STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  }
}

/**
 * Auto-initialize demo data on app startup
 * This should be called in main.tsx
 */
export function initializeDemoData(): SeedResult {
  // Only run in browser
  if (typeof window === 'undefined') {
    return {
      success: false,
      message: 'Skipped: not in browser environment',
    };
  }

  // Check if demo mode is enabled via environment or already seeded
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || true; // Default to true for now

  if (!isDemoMode && !isDemoDataSeeded()) {
    logger.info('Demo mode is disabled and no demo data exists');
    return {
      success: true,
      message: 'Demo mode disabled, skipping seed',
    };
  }

  // Seed if not already seeded
  if (!isDemoDataSeeded()) {
    logger.info('Demo data not found, initializing...');
    return seedDemoData();
  }

  logger.info('Demo data already initialized');
  return {
    success: true,
    message: 'Demo data already initialized',
    details: getSeedSummary() || undefined,
  };
}

// Export types for consumers
export type {
  DemoUser,
  DemoBranch,
  DemoCategory,
  DemoProduct,
  DemoProductVariant,
  DemoOrder,
  DemoOrderItem,
  DemoDeliveryAssignment,
  DemoCartItem,
} from './demo-data';
