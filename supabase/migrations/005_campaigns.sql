-- Phase 2D.2: Ad campaigns + daily spend for ROAS/CAC.
-- One campaign per product (product_id nullable for multi-product campaigns).
-- One spend row per (campaign, date).

CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta',   -- 'meta' | 'tiktok' | 'google' | 'other'
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE TABLE campaign_spend (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL,
  amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  UNIQUE(campaign_id, spend_date)
);

CREATE TABLE campaign_spend_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spend_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  spend_date DATE NOT NULL,
  amount DECIMAL(12,3) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES profiles(id)
);

CREATE OR REPLACE FUNCTION snapshot_campaign_spend()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO campaign_spend_history (
    spend_id, campaign_id, spend_date, amount, changed_at, changed_by
  ) VALUES (
    OLD.id, OLD.campaign_id, OLD.spend_date, OLD.amount,
    OLD.updated_at, OLD.updated_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_campaign_spend_update
  BEFORE UPDATE ON campaign_spend
  FOR EACH ROW EXECUTE FUNCTION snapshot_campaign_spend();

CREATE INDEX idx_campaigns_product_id ON campaigns(product_id);
CREATE INDEX idx_campaigns_active ON campaigns(active);
CREATE INDEX idx_campaign_spend_campaign_date ON campaign_spend(campaign_id, spend_date DESC);
CREATE INDEX idx_campaign_spend_date ON campaign_spend(spend_date DESC);
CREATE INDEX idx_campaign_spend_history_spend_id ON campaign_spend_history(spend_id);
