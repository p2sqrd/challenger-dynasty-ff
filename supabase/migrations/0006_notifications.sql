-- Notifications: in-app feed (the nav bell) + a dedupe log so time-based
-- reminders (24h/3h/1h before a deadline) each fire only once.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers(id),
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_manager_idx on notifications (manager_id, created_at desc);

alter table notifications enable row level security;
create policy "authenticated read" on notifications for select to authenticated using (true);

-- One row per (reminder, threshold) already sent. Server-only, no read policy.
create table reminder_log (
  key text primary key,
  created_at timestamptz not null default now()
);

alter table reminder_log enable row level security;
