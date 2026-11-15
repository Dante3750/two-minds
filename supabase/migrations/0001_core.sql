-- Two Minds 2.0 — core schema.
-- Everything a client may change goes through the functions at the bottom (security definer, checked);
-- tables are read-only to clients and row-level security decides which rows they see.
-- Internal helpers live in the "game" schema, which the Supabase API does not expose.

create schema if not exists game;

-- ============================================================ topics
create table public.topics (
  id        text primary key check (id ~ '^[a-z0-9_]{2,24}$'),
  name      text not null,
  icon      text not null,
  color     text not null check (color ~ '^#[0-9a-f]{6}$'),
  category  text not null,
  position  int  not null default 100
);

-- ============================================================ players
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  name         text not null check (char_length(btrim(name)) between 1 and 24),
  color        text not null default '#ff6b5a' check (color ~ '^#[0-9a-f]{6}$'),
  frame        text check (frame in ('bronze','silver','gold','plat','diamond','flame')),
  code         text not null unique check (code ~ '^[a-z2-9]{6}$'),
  xp           int  not null default 0,
  played       int  not null default 0,
  won          int  not null default 0,
  lost         int  not null default 0,
  drawn        int  not null default 0,
  correct      int  not null default 0,
  answered     int  not null default 0,
  perfect      int  not null default 0,
  best_score   int  not null default 0,
  win_streak   int  not null default 0,
  streak_cur   int  not null default 0,
  streak_best  int  not null default 0,
  streak_day   date,
  season       text,
  season_pts   int  not null default 0,
  badges       text[] not null default '{}',
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);

create table public.topic_stats (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null references public.topics(id),
  xp       int not null default 0,
  played   int not null default 0,
  won      int not null default 0,
  best     int not null default 0,
  primary key (user_id, topic_id)
);
create index on public.topic_stats (topic_id, xp desc);

create table public.weekly (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week    date not null,                       -- Monday (UTC) of the week
  points  int  not null default 0,
  games   int  not null default 0,
  primary key (user_id, week)
);
create index on public.weekly (week, points desc);

-- user_a < user_b, so a pair has exactly one row
create table public.friendships (
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  status      text not null check (status in ('pending','accepted')),
  requester   uuid not null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index on public.friendships (user_b);

-- ============================================================ questions
create table public.questions (
  id          bigserial primary key,
  topic_id    text not null references public.topics(id),
  q           text not null check (char_length(q) between 3 and 300),
  a           text not null check (char_length(a) between 1 and 120),
  w           text[] not null check (array_length(w, 1) = 3),
  difficulty  smallint not null default 2 check (difficulty between 1 and 3),
  source      text not null default 'bank',     -- bank | opentdb | triviaapi | community
  source_id   text,
  license     text,
  status      text not null default 'live' check (status in ('live','hidden')),
  reports     int  not null default 0,
  added_at    timestamptz not null default now(),
  norm        text not null unique              -- normalised question text, stops duplicates
);
create index on public.questions (topic_id, status);
create index on public.questions (added_at desc);

-- who has seen which question: this is what keeps questions from repeating
create table public.seen (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  seen_at     timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ============================================================ matches
create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  mode        text not null check (mode in ('bot','live','quick','challenge','daily')),
  topic_id    text not null,                    -- a topic id or 'mixed' / 'daily'
  qids        bigint[] not null,
  orders      smallint[] not null,              -- 7 x 4: answer order on screen, as indexes into [right, wrong1..3]
  time_ms     int not null default 10000 check (time_ms in (10000, 15000)),
  status      text not null default 'playing' check (status in ('waiting','playing','done','cancelled')),
  host        uuid not null references public.profiles(id) on delete cascade,
  bot         jsonb,                            -- {name, level, picks:[[orig, ms] x7]}; never sent to clients whole
  practice    boolean not null default false,
  day         date,
  rematch_of  uuid,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  ended_at    timestamptz
);
create index on public.matches (host, created_at desc);

create table public.match_players (
  match_id    uuid not null references public.matches(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  seat        smallint not null,
  state       text not null default 'playing' check (state in ('invited','ready','playing','done','left')),
  score       int not null default 0,
  result      text check (result in ('w','l','d','p')),
  xp          int not null default 0,
  rewarded    boolean not null default false,
  last_active timestamptz not null default now(),
  joined_at   timestamptz not null default now(),
  finished_at timestamptz,
  primary key (match_id, user_id)
);
create index on public.match_players (user_id, joined_at desc);

create table public.answers (
  match_id    uuid not null references public.matches(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  round       smallint not null check (round between 0 and 6),
  served_at   timestamptz not null default now(),
  answered_at timestamptz,
  choice      smallint check (choice between -1 and 3),   -- 0 right, 1..3 wrong, -1 no answer
  ms          int,
  points      int not null default 0,
  primary key (match_id, user_id, round)
);

create table public.daily (
  day     date primary key,
  qids    bigint[] not null,
  orders  smallint[] not null
);

create table public.quick_queue (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  topic_id   text not null,
  time_ms    int not null,
  created_at timestamptz not null default now()
);

-- ============================================================ community
create table public.submissions (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  topic_id    text not null references public.topics(id),
  q           text not null check (char_length(q) between 8 and 300),
  a           text not null check (char_length(a) between 1 and 120),
  w           text[] not null check (array_length(w, 1) = 3),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.reports (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ============================================================ row-level security
alter table public.topics        enable row level security;
alter table public.profiles      enable row level security;
alter table public.topic_stats   enable row level security;
alter table public.weekly        enable row level security;
alter table public.friendships   enable row level security;
alter table public.questions     enable row level security;
alter table public.seen          enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;
alter table public.answers       enable row level security;
alter table public.daily         enable row level security;
alter table public.quick_queue   enable row level security;
alter table public.submissions   enable row level security;
alter table public.reports       enable row level security;

-- clients never write tables directly; every change goes through a checked function
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

create function game.in_match(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from match_players where match_id = m and user_id = auth.uid())
$$;

create function game.answered(m uuid, r smallint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from answers where match_id = m and user_id = auth.uid() and round = r and choice is not null)
$$;
create function game.match_over(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = m and status in ('done','cancelled'))
$$;

create policy "topics are public"        on public.topics        for select using (true);
create policy "profiles for players"     on public.profiles      for select to authenticated using (true);
create policy "topic stats for players"  on public.topic_stats   for select to authenticated using (true);
create policy "weekly for players"       on public.weekly        for select to authenticated using (true);
create policy "my friendships"           on public.friendships   for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "my matches"               on public.matches       for select to authenticated using (game.in_match(id));
create policy "players of my matches"    on public.match_players for select to authenticated using (game.in_match(match_id));
-- your own answers; someone else's only once you've answered that round too (or the match is over)
create policy "answers I may see"        on public.answers       for select to authenticated using (
  user_id = auth.uid()
  or (game.in_match(match_id) and (game.answered(match_id, round) or game.match_over(match_id)))
);
create policy "my submissions"           on public.submissions   for select to authenticated using (user_id = auth.uid());
-- questions, seen, daily, quick_queue, reports: no policies, so clients can't read them at all

-- the bot's answers and full question ids stay server-side
revoke select on public.matches from anon, authenticated;
grant select (id, mode, topic_id, time_ms, status, host, practice, day, rematch_of, created_at, started_at, ended_at) on public.matches to authenticated;

-- live updates for the app
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.match_players, public.answers, public.friendships, public.matches;
  end if;
end $$;
