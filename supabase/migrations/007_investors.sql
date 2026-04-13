-- Phase 2D.5: Investor module — deals + payouts + waterfall.
-- A deal is one investment in one product launch.
-- Payouts are manual entries (capital_return or profit_share).

CREATE TABLE investor_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_name TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  capital_deployed DECIMAL(12,3) NOT NULL DEFAULT 0,
  profit_share_pct DECIMAL(5,2) NOT NULL DEFAULT 0,    -- e.g., 30.00 for 30%
  loss_share_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',                -- 'active' | 'closed'
  started_at DATE NOT NULL,
  closed_at DATE,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  CHECK (profit_share_pct >= 0 AND profit_share_pct <= 100),
  CHECK (loss_share_pct >= 0 AND loss_share_pct <= 100),
  CHECK (status IN ('active', 'closed'))
);

CREATE TABLE investor_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES investor_deals(id) ON DELETE CASCADE,
  payout_date DATE NOT NULL,
  amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  payout_type TEXT NOT NULL,                           -- 'capital_return' | 'profit_share'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  CHECK (payout_type IN ('capital_return', 'profit_share')),
  CHECK (amount >= 0)
);

CREATE TABLE investor_deals_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL,
  investor_name TEXT NOT NULL,
  product_id UUID,
  capital_deployed DECIMAL(12,3) NOT NULL,
  profit_share_pct DECIMAL(5,2) NOT NULL,
  loss_share_pct DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL,
  started_at DATE NOT NULL,
  closed_at DATE,
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES profiles(id)
);

CREATE OR REPLACE FUNCTION snapshot_investor_deals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO investor_deals_history (
    deal_id, investor_name, product_id, capital_deployed,
    profit_share_pct, loss_share_pct, status,
    started_at, closed_at, note, changed_at, changed_by
  ) VALUES (
    OLD.id, OLD.investor_name, OLD.product_id, OLD.capital_deployed,
    OLD.profit_share_pct, OLD.loss_share_pct, OLD.status,
    OLD.started_at, OLD.closed_at, OLD.note,
    OLD.updated_at, OLD.updated_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_investor_deals_update
  BEFORE UPDATE ON investor_deals
  FOR EACH ROW EXECUTE FUNCTION snapshot_investor_deals();

CREATE INDEX idx_investor_deals_status ON investor_deals(status);
CREATE INDEX idx_investor_deals_product_id ON investor_deals(product_id);
CREATE INDEX idx_investor_payouts_deal_id ON investor_payouts(deal_id);
CREATE INDEX idx_investor_payouts_date ON investor_payouts(payout_date DESC);
CREATE INDEX idx_investor_deals_history_deal_id ON investor_deals_history(deal_id);
