-- Phase 2D: Monthly overhead entries for Net Profit calculation.
-- One row per (month, category). Period is the first day of the month (YYYY-MM-01).
-- History captured by BEFORE UPDATE trigger.

CREATE TABLE overhead_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period DATE NOT NULL,                -- first day of month (e.g. 2026-04-01)
  category TEXT NOT NULL,              -- 'salaries' | 'rent' | 'phone_internet' | 'subscriptions' | 'tax' | 'daily_pickup' | 'other'
  amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  UNIQUE(period, category)
);

CREATE TABLE overhead_entries_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL,
  period DATE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12,3) NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES profiles(id)
);

CREATE OR REPLACE FUNCTION snapshot_overhead_entries()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO overhead_entries_history (
    entry_id, period, category, amount, note, changed_at, changed_by
  ) VALUES (
    OLD.id, OLD.period, OLD.category, OLD.amount, OLD.note,
    OLD.updated_at, OLD.updated_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_overhead_entries_update
  BEFORE UPDATE ON overhead_entries
  FOR EACH ROW EXECUTE FUNCTION snapshot_overhead_entries();

CREATE INDEX idx_overhead_entries_period ON overhead_entries(period DESC);
CREATE INDEX idx_overhead_entries_history_entry_id ON overhead_entries_history(entry_id);
