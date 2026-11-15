-- Two Minds 2.0 — fresh questions every week from free sources, imported inside the database.
--   Open Trivia DB (opentdb.com), CC BY-SA 4.0
--   The Trivia API (the-trivia-api.com), CC BY-NC 4.0 (free for non-commercial use; credited in the app)
-- A weekly schedule queues the requests; a once-a-minute tick sends one request at a time (both sites ask
-- for gentle use) and files the answer. New questions are matched against existing ones and skipped if
-- already known, so running it again is always safe.

create table if not exists game.import_runs (
  id          bigserial primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  queue       jsonb not null,                 -- requests still to make
  pending     bigint,                         -- pg_net request id we're waiting on
  pending_item jsonb,
  token       text,                           -- Open Trivia DB session token (avoids getting the same questions back)
  added       jsonb not null default '{}',    -- topic -> new questions this run
  fetched     int not null default 0,
  log         text[] not null default '{}'
);

-- source category -> our topic
create table if not exists game.import_map (source text, category text, topic_id text, primary key (source, category));
insert into game.import_map values
  ('opentdb','9','gk'), ('opentdb','10','books'), ('opentdb','11','hollywood'), ('opentdb','12','music'), ('opentdb','13','music'),
  ('opentdb','14','tv'), ('opentdb','15','gaming'), ('opentdb','16','gaming'), ('opentdb','17','science'), ('opentdb','18','tech'),
  ('opentdb','19','brain'), ('opentdb','20','mythology'), ('opentdb','21','sports'), ('opentdb','22','geography'), ('opentdb','23','history'),
  ('opentdb','24','gk'), ('opentdb','25','art'), ('opentdb','26','hollywood'), ('opentdb','27','animals'), ('opentdb','28','tech'),
  ('opentdb','29','tv'), ('opentdb','30','tech'), ('opentdb','31','tv'), ('opentdb','32','tv'),
  ('triviaapi','music','music'), ('triviaapi','sport_and_leisure','sports'), ('triviaapi','film_and_tv','hollywood'),
  ('triviaapi','arts_and_literature','books'), ('triviaapi','history','history'), ('triviaapi','society_and_culture','gk'),
  ('triviaapi','science','science'), ('triviaapi','geography','geography'), ('triviaapi','food_and_drink','food'),
  ('triviaapi','general_knowledge','gk')
on conflict do nothing;

create or replace function game.b64(t text) returns text language sql immutable as $$
  select convert_from(decode(t, 'base64'), 'UTF8')
$$;

-- file one batch of questions; returns how many were new
create or replace function game.import_rows(p_source text, p_rows jsonb, p_run bigint) returns int
language plpgsql volatile security definer set search_path = public as $$
declare r jsonb; topic text; q text; a text; w text[]; d int; n int := 0; cat text; sid text; lic text;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    if p_source = 'opentdb' then
      if game.b64(r->>'type') <> 'multiple' then continue; end if;
      q := game.b64(r->>'question'); a := game.b64(r->>'correct_answer');
      w := array(select game.b64(x) from jsonb_array_elements_text(r->'incorrect_answers') x);
      cat := game.b64(r->>'category'); d := case game.b64(r->>'difficulty') when 'easy' then 1 when 'hard' then 3 else 2 end;
      sid := null; lic := 'CC BY-SA 4.0 · Open Trivia DB';
      topic := (select topic_id from game.import_map m where m.source = 'opentdb' and m.category = (r->>'_cat'));
    else
      if coalesce(r->>'type', 'text_choice') <> 'text_choice' then continue; end if;
      q := coalesce(r->'question'->>'text', r->>'question'); a := r->>'correctAnswer';
      w := array(select x from jsonb_array_elements_text(r->'incorrectAnswers') x);
      d := case r->>'difficulty' when 'easy' then 1 when 'hard' then 3 else 2 end;
      sid := r->>'id'; lic := 'CC BY-NC 4.0 · The Trivia API';
      topic := (select topic_id from game.import_map m where m.source = 'triviaapi' and m.category = r->>'category');
      -- the Trivia API tags some questions; cricket and India ones go to our own topics
      if r->'tags' ? 'cricket' then topic := 'cricket'; elsif r->'regions' ? 'IN' or r->'tags' ? 'india' then topic := 'india'; end if;
    end if;
    q := btrim(q); a := btrim(a);
    if topic is null or not exists (select 1 from topics where id = topic) then continue; end if;
    if char_length(q) not between 8 and 300 or char_length(a) not between 1 and 120 or array_length(w, 1) <> 3
       or exists (select 1 from unnest(w) x where char_length(btrim(x)) not between 1 and 120)
       or (select count(distinct lower(btrim(x))) from unnest(w || a) x) <> 4
       or q ~* '(which of the following|all of the above|none of the above)' then continue; end if;
    insert into questions (topic_id, q, a, w, difficulty, source, source_id, license, norm)
    values (topic, q, a, array(select btrim(x) from unnest(w) x), d, p_source, sid, lic, game.norm(q))
    on conflict (norm) do nothing;
    if found then
      n := n + 1;
      if p_run is not null then
        update game.import_runs set added = jsonb_set(added, array[topic], to_jsonb(coalesce((added->>topic)::int, 0) + 1)) where id = p_run;
      end if;
    end if;
  end loop;
  return n;
end $$;

-- handle one answer from a source; may put follow-up requests at the front of the queue
create or replace function game.import_handle(p_run bigint, p_item jsonb, p_status int, p_body text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare j jsonb; code int; rows jsonb; got int; front jsonb := '[]';
begin
  if p_status is distinct from 200 then
    -- rate limited or a hiccup: try this one again later, at most three times
    if coalesce((p_item->>'try')::int, 0) < 3 then front := jsonb_build_array(p_item || jsonb_build_object('try', coalesce((p_item->>'try')::int, 0) + 1)); end if;
  elsif p_item->>'src' = 'opentdb-token' then
    j := p_body::jsonb;
    update game.import_runs set token = j->>'token' where id = p_run;
  elsif p_item->>'src' = 'opentdb' then
    j := p_body::jsonb; code := (j->>'response_code')::int;
    if code = 0 then
      rows := (select jsonb_agg(e || jsonb_build_object('_cat', p_item->>'cat')) from jsonb_array_elements(j->'results') e);
      got := game.import_rows('opentdb', coalesce(rows, '[]'), p_run);
      update game.import_runs set fetched = fetched + jsonb_array_length(coalesce(rows, '[]')) where id = p_run;
      front := jsonb_build_array(p_item - 'try');                                    -- same category again: the token gives the next batch
    elsif code = 1 and (p_item->>'amount')::int > 10 then
      front := jsonb_build_array(p_item || '{"amount": 10}');                         -- fewer than asked left: take smaller bites
    elsif code in (2, 3) then
      front := jsonb_build_array('{"src":"opentdb-token"}'::jsonb, p_item);           -- token expired
    elsif code = 5 and coalesce((p_item->>'try')::int, 0) < 5 then
      front := jsonb_build_array(p_item || jsonb_build_object('try', coalesce((p_item->>'try')::int, 0) + 1));
    end if;                                                                           -- 4: this category is used up
  elsif p_item->>'src' = 'triviaapi' then
    j := p_body::jsonb;
    if jsonb_typeof(j) = 'array' then
      got := game.import_rows('triviaapi', j, p_run);
      update game.import_runs set fetched = fetched + jsonb_array_length(j) where id = p_run;
    end if;
  end if;
  update game.import_runs set queue = front || queue, pending = null, pending_item = null where id = p_run;
end $$;

create or replace function game.import_url(p_item jsonb, p_token text) returns text language sql immutable as $$
  select case p_item->>'src'
    when 'opentdb-token' then 'https://opentdb.com/api_token.php?command=request'
    when 'opentdb' then 'https://opentdb.com/api.php?type=multiple&encode=base64&amount=' || coalesce(p_item->>'amount', '50') || '&category=' || (p_item->>'cat') || coalesce('&token=' || p_token, '')
    when 'triviaapi' then 'https://the-trivia-api.com/v2/questions?limit=50&categories=' || (p_item->>'cat')
  end
$$;

-- start a run: every Open Trivia DB category until used up, and 4 random batches per Trivia API category
create or replace function game.import_start() returns bigint language plpgsql volatile security definer set search_path = public as $$
declare q jsonb; id bigint;
begin
  if exists (select 1 from game.import_runs where finished_at is null and started_at > now() - interval '1 day') then return null; end if;
  update game.import_runs set finished_at = now(), log = log || 'abandoned'::text where finished_at is null;
  select '[{"src":"opentdb-token"}]'::jsonb
      || (select jsonb_agg(jsonb_build_object('src', 'opentdb', 'cat', category, 'amount', 50) order by category::int) from game.import_map where source = 'opentdb')
      || (select jsonb_agg(jsonb_build_object('src', 'triviaapi', 'cat', category)) from game.import_map, generate_series(1, 4) where source = 'triviaapi')
  into q;
  insert into game.import_runs (queue) values (q) returning import_runs.id into id;
  return id;
end $$;

-- runs every minute: collect the last answer, send the next request
create or replace function game.import_tick() returns text language plpgsql volatile security definer set search_path = public as $$
declare run game.import_runs; resp record; item jsonb;
begin
  select * into run from game.import_runs where finished_at is null order by id desc limit 1;
  if run.id is null then return 'idle'; end if;
  if run.pending is not null then
    execute 'select status_code, content, error_msg from net._http_response where id = $1' into resp using run.pending;
    if resp is null then
      return 'waiting';
    end if;
    perform game.import_handle(run.id, run.pending_item, resp.status_code, resp.content);
    select * into run from game.import_runs where id = run.id;
  end if;
  if jsonb_array_length(run.queue) = 0 then
    update game.import_runs set finished_at = now() where id = run.id;
    return 'finished';
  end if;
  item := run.queue->0;
  execute 'select net.http_get(url := $1, timeout_milliseconds := 20000)' into run.pending using game.import_url(item, run.token);
  update game.import_runs set pending = run.pending, pending_item = item, queue = queue - 0 where id = run.id;
  return 'sent';
end $$;

-- what the last runs brought in (for the admin screen)
create or replace function public.import_status() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce((select is_admin from profiles where id = auth.uid()), false) then raise exception 'admins only' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('started', started_at, 'finished', finished_at, 'fetched', fetched, 'added', added, 'left', jsonb_array_length(queue)) order by id desc)
                   from (select * from game.import_runs order by id desc limit 8) r), '[]');
end $$;
revoke execute on function public.import_status() from public, anon;
grant execute on function public.import_status() to authenticated;
revoke execute on all functions in schema game from public, anon, authenticated;
grant execute on function game.in_match(uuid), game.answered(uuid, smallint), game.match_over(uuid) to authenticated;

-- schedules (only on Supabase, where pg_net and pg_cron exist)
do $$ begin
  begin
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_net / pg_cron not available here; the weekly import is off (fine for local tests)';
    return;
  end;
  perform cron.unschedule(jobname) from cron.job where jobname in ('twominds-import-weekly', 'twominds-import-tick');
  perform cron.schedule('twominds-import-weekly', '0 3 * * 1', 'select game.import_start()');      -- Mondays 03:00 UTC
  perform cron.schedule('twominds-import-tick', '* * * * *', 'select game.import_tick()');
  perform game.import_start();                                                                     -- first run right away
end $$;
