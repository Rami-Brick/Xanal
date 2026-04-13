-- Phase 2D.3: Cosmos settlement reconciliation.
-- Each settlement is a single payout event covering [period_from, period_to].
-- Expected is computed from delivered/returned orders in that range; actual is what Cosmos paid.

CREATE TABLE cosmos_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  settlement_date DATE NOT NULL,           -- when Cosmos actually paid
  actual_amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  CHECK (period_to >= period_from)
);

CREATE TABLE cosmos_settlements_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  settlement_date DATE NOT NULL,
  actual_amount DECIMAL(12,3) NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES profiles(id)
);

CREATE OR REPLACE FUNCTION snapshot_cosmos_settlements()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO cosmos_settlements_history (
    settlement_id, period_from, period_to, settlement_date,
    actual_amount, note, changed_at, changed_by
  ) VALUES (
    OLD.id, OLD.period_from, OLD.period_to, OLD.settlement_date,
    OLD.actual_amount, OLD.note, OLD.updated_at, OLD.updated_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_cosmos_settlements_update
  BEFORE UPDATE ON cosmos_settlements
  FOR EACH ROW EXECUTE FUNCTION snapshot_cosmos_settlements();

CREATE INDEX idx_cosmos_settlements_settlement_date ON cosmos_settlements(settlement_date DESC);
CREATE INDEX idx_cosmos_settlements_period ON cosmos_settlements(period_from, period_to);
CREATE INDEX idx_cosmos_settlements_history_id ON cosmos_settlements_history(settlement_id);
