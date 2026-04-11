-- ============================================================
-- 002_sync_improvements.sql
-- Run this manually in the Supabase Dashboard SQL editor.
-- ============================================================

-- Add missing index for converty_updated_at (used by incremental sync)
CREATE INDEX IF NOT EXISTS idx_orders_converty_updated_at
  ON orders (converty_updated_at DESC);

-- Add store_id to sync_log so each sync run is traceable to a store
ALTER TABLE sync_log
  ADD COLUMN IF NOT EXISTS store_id TEXT;

-- Index for filtering sync_log by store
CREATE INDEX IF NOT EXISTS idx_sync_log_store_id
  ON sync_log (store_id);
