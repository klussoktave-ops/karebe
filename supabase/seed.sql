-- Seed data for Karebe

-- Categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
('cat-wines', 'Wines', 'wines', 'Fine wines from around the world', 1),
('cat-spirits', 'Spirits', 'spirits', 'Premium spirits and liquors', 2),
('cat-beers', 'Beers', 'beers', 'Local and imported beers', 3),
('cat-champagne', 'Champagne', 'champagne', 'Champagne and sparkling wines', 4),
('cat-ciders', 'Ciders', 'ciders', 'Refreshing ciders', 5),
('cat-mixers', 'Mixers', 'mixers', 'Drink mixers and accessories', 6)
ON CONFLICT (id) DO NOTHING;

-- Branches
INSERT INTO branches (id, name, is_main, location, phone, lat, lng, operating_hours) VALUES
('branch-wangige', 'Karebe Wangige', true, 'Wangige, Nairobi', '+254700000001', -1.2745, 36.7819, '{"open": "08:00", "close": "22:00"}'),
('branch-westlands', 'Karebe Westlands', false, 'Westlands, Nairobi', '+254700000002', -1.2644, 36.8019, '{"open": "10:00", "close": "23:00"}'),
('branch-kilimani', 'Karebe Kilimani', false, 'Kilimani, Nairobi', '+254700000003', -1.2936, 36.7841, '{"open": "09:00", "close": "22:00"}')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, name, description, category_id, price, compare_price, stock_quantity, is_available, is_visible, is_featured, tags, branch_id) VALUES
('prod-001', 'Red Wine Selection', 'Premium red wine', 'cat-wines', 2500, 3000, 50, true, true, true, '["red", "wine", "premium"]', NULL),
('prod-002', 'White Wine Selection', 'Crisp white wine', 'cat-wines', 2200, 2800, 45, true, true, true, '["white", "wine"]', NULL),
('prod-003', 'Whiskey 750ml', 'Premium blended whiskey', 'cat-spirits', 3500, 4200, 30, true, true, true, '["whiskey", "spirit"]', NULL),
('prod-004', 'Vodka 1L', 'Premium vodka', 'cat-spirits', 2800, 3200, 40, true, true, false, '["vodka", "spirit"]', NULL),
('prod-005', 'Beer Pack 6x500ml', 'Local lager beer', 'cat-beers', 1200, 1500, 100, true, true, true, '["beer", "local"]', NULL),
('prod-006', 'Champagne Brut', 'French champagne', 'cat-champagne', 5500, 6500, 15, true, true, false, '["champagne", "celebration"]', NULL),
('prod-007', 'Gin 750ml', 'Premium gin', 'cat-spirits', 2600, 3100, 25, true, true, false, '["gin", "spirit"]', NULL),
('prod-008', 'Cider 500ml', 'Apple cider', 'cat-ciders', 450, 550, 60, true, true, false, '["cider", "refreshing"]', NULL)
ON CONFLICT (id) DO NOTHING;

-- Product Variants
INSERT INTO product_variants (id, product_id, volume, price, compare_price, stock, sku, is_default) VALUES
('var-001-1', 'prod-001', '750ml', 2500, 3000, 25, 'RW-750', true),
('var-001-2', 'prod-001', '1.5L', 4500, 5500, 25, 'RW-150', false),
('var-002-1', 'prod-002', '750ml', 2200, 2800, 20, 'WW-750', true),
('var-002-2', 'prod-002', '1.5L', 4000, 4800, 25, 'WW-150', false),
('var-003-1', 'prod-003', '750ml', 3500, 4200, 15, 'WH-750', true),
('var-003-2', 'prod-003', '1L', 4500, 5500, 15, 'WH-1L', false),
('var-004-1', 'prod-004', '1L', 2800, 3200, 40, 'VD-1L', true),
('var-005-1', 'prod-005', '6x500ml', 1200, 1500, 100, 'BEER-6PK', true),
('var-006-1', 'prod-006', '750ml', 5500, 6500, 15, 'CHAMP-750', true),
('var-007-1', 'prod-007', '750ml', 2600, 3100, 25, 'GIN-750', true),
('var-008-1', 'prod-008', '500ml', 450, 550, 60, 'CID-500', true)
ON CONFLICT (id) DO NOTHING;
