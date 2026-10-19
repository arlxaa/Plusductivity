-- Phase 5: track when a todo was completed for the weekly stats page.
alter table todos add column if not exists completed_at timestamptz;

-- Backfill: done tasks count as completed at creation time.
update todos set completed_at = created_at where is_done and completed_at is null;
