-- FR2, revised after analyzing the team's real Monday usage: earned points use
-- partial credit per status label, and «Ikke behov» GRANTS the step's share
-- (no denominator rescaling). Each label therefore carries its own earned
-- share: Ferdig=1, Har gitt tilbakemelding=0.75, Trenger tilbakemelding=0.5,
-- Under arbeid=0.25, Ikke startet=0, Ikke behov=1.
--
-- is_done stays (drives «% ferdige videoer» in the FR3 report) and
-- is_not_applicable stays as UI/report semantics; neither drives the earned
-- calculation anymore.

alter table public.column_labels
  add column progress numeric not null default 0
  check (progress >= 0 and progress <= 1);

comment on column public.column_labels.progress is
  'Share of a step''s point weight earned when a cell carries this label (FR2). 0-1.';

-- Backfill any existing labels (none in production today, but keeps the
-- migration correct wherever it runs). The partial-credit labels can only be
-- matched by their template titles here — semantics-in-data (progress) is
-- exactly what this migration introduces.
update public.column_labels set progress = 1 where is_done or is_not_applicable;
update public.column_labels set progress = 0.25
  where title = 'Under arbeid' and not is_done and not is_not_applicable;
update public.column_labels set progress = 0.5
  where title = 'Trenger tilbakemelding' and not is_done and not is_not_applicable;
update public.column_labels set progress = 0.75
  where title = 'Har gitt tilbakemelding' and not is_done and not is_not_applicable;

-- The pre-progress column comments described the old earned model; refresh them.
comment on column public.column_labels.is_done is
  'Marks the «Ferdig» label; drives «% ferdige videoer» (FR3). Earned points read progress, not this flag.';
comment on column public.column_labels.is_not_applicable is
  'Marks «Ikke behov»; informational for UI/reports. Earned points read progress (=1 for this label), not this flag.';
