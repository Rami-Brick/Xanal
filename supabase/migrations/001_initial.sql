-- ============================================================
-- 001_initial.sql - Xanal initial schema
-- Run this manually in the Supabase Dashboard SQL editor.
-- ============================================================

-- ============================================================
-- Converty OAuth tokens (one row per store)
-- ============================================================
CREATE TABLE converty_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Products (synced from Converty)
-- ============================================================
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  converty_id TEXT NOT NULL UNIQUE,
  reference INTEGER,
  name TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10,3) NOT NULL DEFAULT 0,
  compare_price DECIMAL(10,3) DEFAULT 0,
  cost DECIMAL(10,3) DEFAULT 0,
  delivery_price DECIMAL(10,3) DEFAULT 0,
  delivery_cost DECIMAL(10,3) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  track_stock BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  slug TEXT,
  image_url TEXT,
  categories TEXT[],
  is_deleted BOOLEAN DEFAULT false,
  converty_created_at TIMESTAMPTZ,
  converty_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Orders (synced from Converty)
-- ============================================================
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  converty_id TEXT NOT NULL UNIQUE,
  reference INTEGER,
  status TEXT NOT NULL,
  attempt INTEGER,
  barcode TEXT,

  -- Customer info (flattened)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_city TEXT,

  -- Pricing (TND, 3 decimal places)
  total_price DECIMAL(10,3) NOT NULL DEFAULT 0,
  delivery_price DECIMAL(10,3) DEFAULT 0,   -- What customer pays
  delivery_cost DECIMAL(10,3) DEFAULT 0,    -- What company pays
  base_price DECIMAL(10,3) DEFAULT 0,

  -- Meta
  delivery_company TEXT,
  payment_status TEXT,
  refunded BOOLEAN DEFAULT false,
  is_test BOOLEAN DEFAULT false,
  note TEXT,

  -- Status history as JSONB
  history JSONB DEFAULT '[]'::jsonb,

  converty_created_at TIMESTAMPTZ,
  converty_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Order items (one row per product per order)
-- ============================================================
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  converty_product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit DECIMAL(10,3) NOT NULL,
  selected_variants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Sync log
-- ============================================================
CREATE TABLE sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,        -- 'orders' | 'products' | 'full'
  status TEXT NOT NULL,           -- 'started' | 'completed' | 'failed'
  records_synced INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  triggered_by TEXT DEFAULT 'cron'  -- 'cron' | 'manual'
);

-- ============================================================
-- App user profiles (linked to Supabase Auth)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'mod', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_converty_created ON orders(converty_created_at DESC);
CREATE INDEX idx_orders_reference ON orders(reference);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_products_converty_id ON products(converty_id);
CREATE INDEX idx_sync_log_type_status ON sync_log(sync_type, status);
CREATE INDEX idx_sync_log_started_at ON sync_log(started_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE converty_tokens ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read orders, order_items, products
CREATE POLICY "Authenticated users can read orders"
  ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read order_items"
  ON order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT TO authenticated USING (true);

-- Only admins can read sync_log
CREATE POLICY "Admin can read sync_log"
  ON sync_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Profiles: all authenticated users can read, users can update their own
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Converty tokens: no direct user access (service role only)
CREATE POLICY "No direct user access to tokens"
  ON converty_tokens FOR ALL TO authenticated USING (false);

-- ============================================================
-- Profiles trigger: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'viewer'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Analytics views
-- ============================================================

-- Daily order summary
CREATE OR REPLACE VIEW daily_order_summary AS
SELECT
  DATE(converty_created_at) AS date,
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
  COUNT(*) FILTER (WHERE status = 'returned') AS returned_orders,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_orders,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_orders,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
  SUM(total_price) FILTER (WHERE status = 'delivered') AS delivered_revenue,
  SUM(delivery_cost) FILTER (WHERE status = 'delivered') AS total_delivery_cost,
  SUM(total_price) AS total_potential_revenue
FROM orders
WHERE is_test = false
GROUP BY DATE(converty_created_at)
ORDER BY date DESC;

-- Product performance
CREATE OR REPLACE VIEW product_performance AS
SELECT
  p.id,
  p.name,
  p.price,
  p.cost,
  p.image_url,
  COUNT(DISTINCT oi.order_id) AS total_orders,
  SUM(oi.quantity) AS total_units_sold,
  SUM(oi.quantity * oi.price_per_unit) AS total_revenue,
  SUM(oi.quantity * p.cost) AS total_cost,
  SUM(oi.quantity * oi.price_per_unit) - SUM(oi.quantity * p.cost) AS gross_profit
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered' AND o.is_test = false
GROUP BY p.id, p.name, p.price, p.cost, p.image_url;
