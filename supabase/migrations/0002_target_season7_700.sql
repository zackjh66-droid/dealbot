-- Project Zero target build: Fortnite 7.00 / CL-4629139.
-- The game archive itself is intentionally not stored in this repository.

insert into public.builds (
  season,
  channel,
  version,
  cl,
  build_label,
  package_family_name,
  launch_uri,
  active,
  sort_order,
  notes
) values (
  7,
  'season7',
  '7.00',
  'CL-4629139',
  'Season 7 · 7.00',
  'ProjectZero.ClientBridge',
  'projectzero-game://launch',
  true,
  0,
  'Primary Project Zero Xbox target. Content is supplied through the authenticated Project Zero content manifest.'
)
on conflict (version, cl) do update set
  season = excluded.season,
  channel = excluded.channel,
  build_label = excluded.build_label,
  package_family_name = excluded.package_family_name,
  launch_uri = excluded.launch_uri,
  active = true,
  sort_order = 0,
  notes = excluded.notes;
