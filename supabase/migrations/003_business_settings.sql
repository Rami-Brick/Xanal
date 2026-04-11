-- Phase 2B: Business settings for financial calculations
-- One active row for global fees, one row per product for COGS.
-- History tables are populated by BEFORE UPDATE triggers.

-- Global business fee configuration (single active row)
CREATE TABLE business_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cosmos_delivery_fee DECIMAL(10,3) NOT NULL DEFAULT 7,
  cosmos_return_fee DECIMAL(10,3) NOT NULL DEFAULT 2,
  packing_cost_per_package DECIMAL(10,3) NOT NULL DEFAULT 0,
  converty_fee_rate DECIMAL(6,4) NOT NULL DEFAULT 0.003,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Product-level cost configuration (one row per product)
CREATE TABLE product_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_cogs DECIMAL(10,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  UNIQUE(product_id)
);

-- Audit trail: business_settings
CREATE TABLE business_settings_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id UUID NOT NULL REFERENCES business_settings(id),
  cosmos_delivery_fee DECIMAL(10,3) NOT NULL,
  cosmos_return_fee DECIMAL(10,3) NOT NULL,
  packing_cost_per_package DECIMAL(10,3) NOT NULL,
  converty_fee_rate DECIMAL(6,4) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES profiles(id)
);

-- Audit trail: product_costs
CREATE TABLE product_costs_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_cost_id UUID NOT NULL,
  product_id UUID NOT NULL,
  unit_cogs DECIMAL(10,3) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES profiles(id)
);

-- Trigger: snapshot business_settings before update
CREATE OR REPLACE FUNCTION snapshot_business_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO business_settings_history (
    settings_id, cosmos_delivery_fee, cosmos_return_fee,
    packing_cost_per_package, converty_fee_rate,
    changed_at, changed_by
  ) VALUES (
    OLD.id, OLD.cosmos_delivery_fee, OLD.cosmos_return_fee,
    OLD.packing_cost_per_package, OLD.converty_fee_rate,
    OLD.updated_at, OLD.updated_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_business_settings_update
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION snapshot_business_settings();

-- Trigger: snapshot product_costs before update
CREATE OR REPLACE FUNCTION snapshot_product_costs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO product_costs_history (
    product_cost_id, product_id, unit_cogs,
    changed_at, changed_by
  ) VALUES (
    OLD.id, OLD.product_id, OLD.unit_cogs,
    OLD.updated_at, OLD.updated_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_product_costs_update
  BEFORE UPDATE ON product_costs
  FOR EACH ROW EXECUTE FUNCTION snapshot_product_costs();

-- Indexes
CREATE INDEX idx_product_costs_product_id ON product_costs(product_id);
CREATE INDEX idx_product_costs_history_product_id ON product_costs_history(product_id);
CREATE INDEX idx_business_settings_history_changed_at ON business_settings_history(changed_at DESC);

-- Seed initial settings row with CEO-provided defaults
INSERT INTO business_settings (
  cosmos_delivery_fee, cosmos_return_fee,
  packing_cost_per_package, converty_fee_rate
) VALUES (7, 2, 0, 0.003);
