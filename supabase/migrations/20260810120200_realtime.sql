-- Add board-scoped content tables to the realtime publication so clients get
-- postgres_changes events (filtered client-side by board_id). RLS is enforced
-- per event, so a subscriber without board access receives nothing.
-- Soft delete is an UPDATE, so the full new row ships without replica identity full.
alter publication supabase_realtime add table public.chapters;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.columns;
alter publication supabase_realtime add table public.column_labels;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.cell_values;
alter publication supabase_realtime add table public.board_functions;
alter publication supabase_realtime add table public.board_member_functions;

-- cell_values has no deleted_at and its PK (item_id, column_id) excludes board_id,
-- so a hard DELETE would ship a replica-identity payload without board_id and the
-- RLS check would drop the event. Full replica identity puts board_id in the old
-- row so DELETE events reach the right subscribers. (Cell clears are UPDATEs to an
-- empty value, but this covers cascade deletes too.)
alter table public.cell_values replica identity full;
