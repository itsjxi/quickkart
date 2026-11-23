/** App-wide settings. */

export const API_BASE = 'https://dummyjson.com';

/** DummyJSON categories that make sense for a quick-commerce store. */
export const STORE_CATEGORIES = [
  'groceries',
  'kitchen-accessories',
  'home-decoration',
  'skin-care',
  'beauty',
  'fragrances',
];

/**
 * Store aisles. Grocery products are split by their tags; other categories map whole.
 * Order here is the order shown in the aisle bar.
 */
export const AISLES = [
  { id: 'fruits-veg', label: 'Fruits & Vegetables', icon: '🥦', tags: ['fruits', 'vegetables'] },
  { id: 'dairy', label: 'Dairy & Eggs', icon: '🥛', tags: ['dairy'] },
  { id: 'meat', label: 'Meat & Seafood', icon: '🍗', tags: ['meat', 'seafood'] },
  { id: 'beverages', label: 'Beverages', icon: '🧃', tags: ['beverages', 'coffee'] },
  { id: 'pantry', label: 'Pantry & Snacks', icon: '🍯', tags: ['cooking essentials', 'condiments', 'grains', 'desserts', 'health supplements'] },
  { id: 'pets', label: 'Pet Care', icon: '🐾', tags: ['pet supplies'] },
  { id: 'household', label: 'Home & Household', icon: '🧻', tags: ['household essentials'], categories: ['home-decoration'] },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳', categories: ['kitchen-accessories'] },
  { id: 'beauty', label: 'Beauty & Personal Care', icon: '💄', categories: ['beauty', 'skin-care', 'fragrances'] },
];

export const OTHER_AISLE = { id: 'other', label: 'More', icon: '🛍️' };

export const PRICING = {
  currency: 'USD',
  locale: 'en-US',
  freeDeliveryThreshold: 20,
  deliveryFee: 2.49,
  handlingFee: 0.49,
};

/** The promise on the banner. */
export const DELIVERY_ETA_MINUTES = 10;

export const REQUEST_TIMEOUT_MS = 10_000;
