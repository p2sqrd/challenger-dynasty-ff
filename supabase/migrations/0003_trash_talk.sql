-- Trash Talk forum: managers post screenshots of bad trade offers (and/or
-- text). Images live in a public Storage bucket; posts reference them by path.

create table if not exists trash_talk_posts (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers(id),
  body text,
  image_path text,
  created_at timestamptz not null default now(),
  -- A post must have text, an image, or both.
  constraint trash_talk_has_content check (body is not null or image_path is not null)
);

create index trash_talk_posts_created_idx on trash_talk_posts (created_at desc);

alter table trash_talk_posts enable row level security;
create policy "authenticated read" on trash_talk_posts for select to authenticated using (true);

-- Public bucket: images are readable by URL; uploads/deletes go through the
-- server (service key), so no storage RLS policies are needed.
insert into storage.buckets (id, name, public)
values ('trash-talk', 'trash-talk', true)
on conflict (id) do nothing;
