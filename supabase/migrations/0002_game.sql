-- Two Minds 2.0 — game rules on the server.
-- Scores are always computed here from the answer and its timing; the app only says which option was tapped.

-- ============================================================ helpers (not exposed to the API)
create function game.me() returns uuid language plpgsql stable as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'not signed in' using errcode = '28000'; end if;
  return u;
end $$;

create function game.need_profile() returns uuid language plpgsql stable security definer set search_path = public as $$
declare u uuid := game.me();
begin
  if not exists (select 1 from profiles where id = u) then raise exception 'create your profile first' using errcode = 'P0002'; end if;
  return u;
end $$;

-- 11..20 points by speed, doubled in the bonus round (same rule as the original game)
create function game.points(left_ms int, t int, bonus boolean) returns int language sql immutable as $$
  select least(20, greatest(11, 10 + ceil(greatest(left_ms, 0)::numeric / t * 10)::int)) * (case when bonus then 2 else 1 end)
$$;

create function game.week_of(ts timestamptz default now()) returns date language sql stable as $$
  select date_trunc('week', ts at time zone 'utc')::date
$$;

create function game.new_code() returns text language plpgsql volatile as $$
declare alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.profiles where code = c);
  end loop;
  return c;
end $$;

-- 7 random answer orders, flattened (7 x 4)
create function game.new_orders() returns smallint[] language sql volatile as $$
  select array_agg(x order by r, k)::smallint[] from (
    select r, row_number() over (partition by r order by random()) k, x
    from generate_series(0, 6) r, generate_series(0, 3) x
  ) s
$$;

-- Seven questions for these players: ones nobody here has seen come first; if a topic runs out,
-- the ones seen longest ago come back first. Easier questions first, the hardest in the bonus round.
create function game.pick(p_topic text, p_users uuid[]) returns bigint[] language sql volatile security definer set search_path = public as $$
  with seen_by as (
    select question_id, count(*) n, max(seen_at) last from seen where user_id = any(p_users) group by question_id
  ), chosen as (
    select q.id, q.difficulty from questions q left join seen_by s on s.question_id = q.id
    where q.status = 'live' and (p_topic in ('mixed','daily') or q.topic_id = p_topic)
    order by coalesce(s.n, 0), s.last nulls first, random()
    limit 7
  )
  select array_agg(id order by difficulty, random()) from chosen
$$;

create function game.are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where user_a = least(a, b) and user_b = greatest(a, b) and status = 'accepted')
$$;

create function game.bot_for(p_qids bigint[], p_level int, p_t int) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare acc numeric := (array[0.45, 0.66, 0.85])[p_level + 1];
        lo int := (array[3500, 2200, 1200])[p_level + 1]; hi int := (array[8500, 7000, 4500])[p_level + 1];
        picks jsonb := '[]'; d int; a numeric; r int;
begin
  for r in 1..7 loop
    select difficulty into d from questions where id = p_qids[r];
    a := least(0.95, greatest(0.2, acc - (coalesce(d, 2) - 2) * 0.1));
    picks := picks || jsonb_build_array(jsonb_build_array(
      case when random() < a then 0 else 1 + floor(random() * 3)::int end,
      least(p_t - 300, lo + floor(random() * (hi - lo))::int)));
  end loop;
  return jsonb_build_object('name', (array['Bot Rookie','Bot Pro','Bot Genius'])[p_level + 1], 'level', p_level, 'lv', (array[3, 9, 18])[p_level + 1], 'picks', picks);
end $$;

create function game.player_card(u uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'username', username, 'name', name, 'color', color, 'frame', frame, 'xp', xp) from profiles where id = u
$$;

-- what the app gets to know about a match: never question ids, answers or bot picks
create function game.match_view(m uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', x.id, 'mode', x.mode, 'topic', x.topic_id, 'time_ms', x.time_ms, 'status', x.status, 'host', x.host,
    'practice', x.practice, 'created_at', x.created_at, 'started_at', x.started_at,
    'bot', case when x.bot is null then null else jsonb_build_object('name', x.bot->>'name', 'level', (x.bot->>'level')::int, 'lv', (x.bot->>'lv')::int) end,
    'players', (select coalesce(jsonb_agg(game.player_card(p.user_id) || jsonb_build_object('seat', p.seat, 'state', p.state, 'score', p.score, 'result', p.result, 'xp_gained', p.xp) order by p.seat), '[]')
                from match_players p where p.match_id = x.id))
  from matches x where x.id = m
$$;

-- ============================================================ profile
create function public.create_profile(p_username text, p_name text, p_color text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.me(); un text := lower(btrim(p_username));
begin
  if un !~ '^[a-z0-9_]{3,16}$' then raise exception 'Usernames are 3 to 16 letters, numbers or _' using errcode = '22023'; end if;
  if exists (select 1 from profiles where username = un and id <> u) then raise exception 'That username is taken' using errcode = '23505'; end if;
  insert into profiles (id, username, name, color, code) values (u, un, btrim(p_name), lower(p_color), game.new_code())
  on conflict (id) do update set username = excluded.username, name = excluded.name, color = excluded.color;
  return game.player_card(u) || (select jsonb_build_object('code', code) from profiles where id = u);
end $$;

create function public.update_profile(p_name text default null, p_color text default null, p_frame text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile();
begin
  update profiles set name = coalesce(nullif(btrim(p_name), ''), name), color = coalesce(lower(p_color), color),
    frame = case when p_frame is null then frame when p_frame = '' then null else p_frame end, last_seen = now()
  where id = u;
  return game.player_card(u);
end $$;

create function public.my_profile() returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(p) - 'is_admin' || jsonb_build_object('is_admin', p.is_admin,
    'week', coalesce((select jsonb_build_object('points', points, 'games', games) from weekly where user_id = p.id and week = game.week_of()), '{"points":0,"games":0}'),
    'topics', coalesce((select jsonb_object_agg(topic_id, jsonb_build_object('xp', xp, 'played', played, 'won', won, 'best', best)) from topic_stats where user_id = p.id), '{}'))
  from profiles p where p.id = auth.uid()
$$;

-- ============================================================ friends
create function public.friend_request(p_who text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); w text := lower(regexp_replace(btrim(p_who), '^@', '')); t uuid; f friendships;
begin
  select id into t from profiles where username = w or code = regexp_replace(w, '[^a-z0-9]', '', 'g');
  if t is null then return 'not_found'; end if;
  if t = u then return 'self'; end if;
  select * into f from friendships where user_a = least(u, t) and user_b = greatest(u, t);
  if found then
    if f.status = 'accepted' then return 'already'; end if;
    if f.requester <> u then          -- they asked me already: that's a yes
      update friendships set status = 'accepted', accepted_at = now() where user_a = f.user_a and user_b = f.user_b;
      return 'accepted';
    end if;
    return 'pending';
  end if;
  insert into friendships (user_a, user_b, status, requester) values (least(u, t), greatest(u, t), 'pending', u);
  return 'sent';
end $$;

create function public.friend_respond(p_other uuid, p_accept boolean) returns text
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile();
begin
  if p_accept then
    update friendships set status = 'accepted', accepted_at = now()
    where user_a = least(u, p_other) and user_b = greatest(u, p_other) and status = 'pending' and requester = p_other;
    return case when found then 'accepted' else 'none' end;
  end if;
  delete from friendships where user_a = least(u, p_other) and user_b = greatest(u, p_other) and status = 'pending';
  return 'removed';
end $$;

-- also cancels a request I sent
create function public.friend_remove(p_other uuid) returns text
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile();
begin
  delete from friendships where user_a = least(u, p_other) and user_b = greatest(u, p_other);
  return 'removed';
end $$;

create function public.friends_list() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(game.player_card(o) || jsonb_build_object(
      'status', f.status, 'incoming', f.status = 'pending' and f.requester <> auth.uid(),
      'week', coalesce((select points from weekly w where w.user_id = o and w.week = game.week_of()), 0),
      'last_seen', (select last_seen from profiles where id = o))
    order by f.status, f.accepted_at desc nulls last), '[]')
  from friendships f, lateral (select case when f.user_a = auth.uid() then f.user_b else f.user_a end o) x
  where auth.uid() in (f.user_a, f.user_b)
$$;

-- ============================================================ matches
create function public.start_match(p_mode text, p_topic text, p_opponent uuid default null, p_bot_level int default 1, p_time_ms int default 10000, p_rematch uuid default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); m uuid; ids bigint[]; ord smallint[]; d date := (now() at time zone 'utc')::date; prac boolean := false;
begin
  if p_mode not in ('bot','live','challenge','daily') then raise exception 'unknown mode %', p_mode using errcode = '22023'; end if;
  if p_time_ms not in (10000, 15000) then p_time_ms := 10000; end if;
  if p_mode <> 'daily' and p_topic <> 'mixed' and not exists (select 1 from topics where id = p_topic) then raise exception 'unknown topic' using errcode = '22023'; end if;
  if p_opponent is not null and (p_opponent = u or not game.are_friends(u, p_opponent)) then raise exception 'you can only invite friends' using errcode = '42501'; end if;
  if p_mode = 'live' and p_opponent is null then raise exception 'pick a friend to play live' using errcode = '22023'; end if;

  if p_mode = 'daily' then
    -- the same seven questions for everyone today; the first play counts, replays are practice
    select qids, orders into ids, ord from daily where day = d;
    if ids is null then
      ids := game.pick('daily', '{}'); ord := game.new_orders();
      insert into daily (day, qids, orders) values (d, ids, ord) on conflict (day) do nothing;
      select qids, orders into ids, ord from daily where day = d;
    end if;
    prac := exists (select 1 from matches x join match_players p on p.match_id = x.id where x.mode = 'daily' and x.day = d and p.user_id = u and not x.practice);
    p_topic := 'daily';
  else
    ids := game.pick(p_topic, array_remove(array[u, p_opponent], null)); ord := game.new_orders();
  end if;
  if coalesce(array_length(ids, 1), 0) < 7 then raise exception 'not enough questions in this topic yet' using errcode = 'P0001'; end if;

  insert into matches (mode, topic_id, qids, orders, time_ms, status, host, bot, practice, day, rematch_of, started_at)
  values (p_mode, p_topic, ids, ord, p_time_ms, case when p_mode = 'live' then 'waiting' else 'playing' end, u,
          case when p_mode = 'bot' then game.bot_for(ids, least(2, greatest(0, p_bot_level)), p_time_ms) end,
          prac, case when p_mode = 'daily' then d end, p_rematch, case when p_mode <> 'live' then now() end)
  returning id into m;
  insert into match_players (match_id, user_id, seat, state) values (m, u, 1, case when p_mode = 'live' then 'ready' else 'playing' end);
  if p_opponent is not null then
    insert into match_players (match_id, user_id, seat, state) values (m, p_opponent, 2, 'invited');
  end if;
  return game.match_view(m);
end $$;

-- accept a live invite, or take on a challenge link (anyone signed in can play a challenge)
create function public.join_match(p_match uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); x matches; p match_players;
begin
  select * into x from matches where id = p_match for update;
  if not found then raise exception 'match not found' using errcode = 'P0002'; end if;
  select * into p from match_players where match_id = p_match and user_id = u;
  if x.mode = 'live' then
    if not found or p.state not in ('invited','ready') then raise exception 'this invite is not for you' using errcode = '42501'; end if;
    if x.status <> 'waiting' then raise exception 'this match has already started or ended' using errcode = 'P0001'; end if;
    update match_players set state = 'ready' where match_id = p_match and user_id = u;
    if not exists (select 1 from match_players where match_id = p_match and state <> 'ready') then
      update matches set status = 'playing', started_at = now() where id = p_match;
      update match_players set state = 'playing' where match_id = p_match;
    end if;
  elsif x.mode = 'challenge' then
    if x.status = 'cancelled' then raise exception 'this challenge was withdrawn' using errcode = 'P0001'; end if;
    if not found then
      insert into match_players (match_id, user_id, seat, state)
      values (p_match, u, (select coalesce(max(seat), 0) + 1 from match_players where match_id = p_match), 'playing');
    elsif p.state = 'invited' then
      update match_players set state = 'playing', joined_at = now() where match_id = p_match and user_id = u;
    end if;
  else
    raise exception 'this match can not be joined' using errcode = 'P0001';
  end if;
  return game.match_view(p_match);
end $$;

create function public.leave_match(p_match uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); x matches;
begin
  select * into x from matches where id = p_match for update;
  if not found or not exists (select 1 from match_players where match_id = p_match and user_id = u) then raise exception 'match not found' using errcode = 'P0002'; end if;
  if x.status = 'waiting' then
    update matches set status = 'cancelled', ended_at = now() where id = p_match;     -- declined or withdrawn invite
    update match_players set state = 'left' where match_id = p_match and user_id = u;
  elsif x.status = 'playing' and exists (select 1 from match_players where match_id = p_match and user_id = u and state <> 'done') then
    -- walking out: every round left counts as no answer
    perform public.finish_match(p_match, true);
  end if;
  return game.match_view(p_match);
end $$;

-- One round: serves the question (starting the clock on the server) and marks it seen.
create function public.get_round(p_match uuid, p_round int) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); x matches; p match_players; q questions; opts text[]; i int; ghost int; done_rounds int;
begin
  select * into x from matches where id = p_match;
  select * into p from match_players where match_id = p_match and user_id = u;
  if x.id is null or p.user_id is null then raise exception 'match not found' using errcode = 'P0002'; end if;
  if x.status <> 'playing' or p.state <> 'playing' then raise exception 'match is not in play' using errcode = 'P0001'; end if;
  if p_round < 0 or p_round > 6 then raise exception 'bad round' using errcode = '22023'; end if;
  select count(*) into done_rounds from answers where match_id = p_match and user_id = u and choice is not null;
  if p_round > done_rounds then raise exception 'answer the earlier rounds first' using errcode = 'P0001'; end if;

  insert into answers (match_id, user_id, round) values (p_match, u, p_round) on conflict do nothing;
  update match_players set last_active = now() where match_id = p_match and user_id = u;
  select * into q from questions where id = x.qids[p_round + 1];
  insert into seen (user_id, question_id) values (u, q.id) on conflict (user_id, question_id) do update set seen_at = now();
  for i in 0..3 loop
    opts[i + 1] := case when x.orders[p_round * 4 + i + 1] = 0 then q.a else q.w[x.orders[p_round * 4 + i + 1]] end;
  end loop;
  -- when the other side "answers": the bot's time, or the challenger's (only the time, never the pick)
  if x.bot is not null then ghost := (x.bot->'picks'->p_round->>1)::int;
  elsif x.mode = 'challenge' and u <> x.host then
    select case when choice = -1 then null else ms end into ghost from answers where match_id = p_match and user_id = x.host and round = p_round;
  end if;
  return jsonb_build_object('round', p_round, 'q', q.q, 'options', to_jsonb(opts), 'time_ms', x.time_ms, 'bonus', p_round = 6,
    'topic', q.topic_id, 'new', q.added_at > now() - interval '7 days' and q.source <> 'bank', 'ghost_ms', ghost);
end $$;

-- An answer: p_option is the position tapped (0..3) or -1 for time-out; p_ms is the app's own timing.
-- The server keeps the app honest: the time can't be shorter than what the server measured, less 2 s of network slack.
create function public.submit_answer(p_match uuid, p_round int, p_option int, p_ms int) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); x matches; a answers; elapsed int; v_ms int; orig int; pts int; total int;
        right_pos int; opp jsonb := null; o answers; gpick int; gms int; gpts int; i int;
begin
  select * into x from matches where id = p_match;
  select * into a from answers where match_id = p_match and user_id = u and round = p_round for update;
  if x.id is null or a.match_id is null then raise exception 'round not served' using errcode = 'P0001'; end if;
  if a.choice is not null then raise exception 'already answered' using errcode = 'P0001'; end if;

  elapsed := (extract(epoch from (now() - a.served_at)) * 1000)::int;
  if p_option between 0 and 3 and elapsed <= x.time_ms + 5000 then
    v_ms := least(x.time_ms, greatest(coalesce(p_ms, x.time_ms), elapsed - 2000, 0));
    orig := x.orders[p_round * 4 + p_option + 1];
  else
    v_ms := x.time_ms; orig := -1;
  end if;
  pts := case when orig = 0 then game.points(x.time_ms - v_ms, x.time_ms, p_round = 6) else 0 end;
  update answers set choice = orig, ms = v_ms, points = pts, answered_at = now() where match_id = p_match and user_id = u and round = p_round;
  update match_players set last_active = now() where match_id = p_match and user_id = u;
  select sum(points) into total from answers where match_id = p_match and user_id = u;

  for i in 0..3 loop if x.orders[p_round * 4 + i + 1] = 0 then right_pos := i; end if; end loop;

  -- the other side's answer for this round, now that mine is in
  if x.bot is not null then
    gpick := (x.bot->'picks'->p_round->>0)::int; gms := (x.bot->'picks'->p_round->>1)::int;
    gpts := case when gpick = 0 then game.points(x.time_ms - gms, x.time_ms, p_round = 6) else 0 end;
    opp := jsonb_build_object('option', (select k from generate_series(0, 3) k where x.orders[p_round * 4 + k + 1] = gpick), 'ms', gms, 'points', gpts);
  else
    select an.* into o from answers an
    where an.match_id = p_match and an.user_id <> u and an.round = p_round and an.choice is not null
      and (x.mode <> 'challenge' or an.user_id = x.host or u = x.host)
    order by (an.user_id = x.host) desc limit 1;
    if o.match_id is not null then
      opp := jsonb_build_object('user', o.user_id, 'option', case when o.choice = -1 then -1 else (select k from generate_series(0, 3) k where x.orders[p_round * 4 + k + 1] = o.choice) end, 'ms', o.ms, 'points', o.points);
    end if;
  end if;
  return jsonb_build_object('round', p_round, 'right', right_pos, 'you', jsonb_build_object('option', case when orig = -1 then -1 else p_option end, 'ms', v_ms, 'points', pts, 'total', total), 'opp', opp);
end $$;

-- the other player's answer to a round, once I've answered it (live matches poll this while waiting)
create function public.round_result(p_match uuid, p_round int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := game.me(); x matches; o answers;
begin
  if not exists (select 1 from answers where match_id = p_match and user_id = u and round = p_round and choice is not null) then return null; end if;
  select * into x from matches where id = p_match;
  select an.* into o from answers an where an.match_id = p_match and an.user_id <> u and an.round = p_round and an.choice is not null limit 1;
  if o.match_id is null then return null; end if;
  return jsonb_build_object('user', o.user_id, 'option', case when o.choice = -1 then -1 else (select k from generate_series(0, 3) k where x.orders[p_round * 4 + k + 1] = o.choice) end, 'ms', o.ms, 'points', o.points);
end $$;

-- End of my match: totals and, once the result is known, XP, streak, weekly and season points, topic level, badges.
-- Call again while waiting for a live opponent: if they've gone quiet for a round and a half, the match is settled without them.
create function public.finish_match(p_match uuid, p_quit boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); x matches; me match_players; o match_players; opp_total int; res text;
begin
  select * into x from matches where id = p_match for update;
  select * into me from match_players where match_id = p_match and user_id = u;
  if x.id is null or me.user_id is null then raise exception 'match not found' using errcode = 'P0002'; end if;
  if x.status = 'cancelled' then return game.match_view(p_match); end if;

  if me.state <> 'done' then
    if x.status <> 'playing' then raise exception 'match is not in play' using errcode = 'P0001'; end if;
    perform game.close_player(p_match, u, case when p_quit and x.mode in ('live','quick') then 'l' end);

    if x.mode not in ('live','quick') then
      -- measured against the bot, or against the challenger; my own challenge or the Daily Duel has no opponent yet
      if x.bot is not null then
        select coalesce(sum(case when (e->>0)::int = 0 then game.points(x.time_ms - (e->>1)::int, x.time_ms, ord = 7) else 0 end), 0)
        into opp_total from jsonb_array_elements(x.bot->'picks') with ordinality t(e, ord);
      elsif x.mode = 'challenge' and u <> x.host then
        select score into opp_total from match_players where match_id = p_match and user_id = x.host and state = 'done';
      end if;
      select * into me from match_players where match_id = p_match and user_id = u;
      res := case when opp_total is null then 'p' when me.score > opp_total then 'w' when me.score < opp_total then 'l' else 'd' end;
      update match_players set result = res where match_id = p_match and user_id = u;
      if x.mode <> 'challenge' then update matches set status = 'done', ended_at = now() where id = p_match; end if;
      perform game.reward(p_match, u);
      return game.match_view(p_match);
    end if;
  end if;

  if x.mode in ('live','quick') and x.status = 'playing' then
    -- an opponent who stopped answering is closed out
    for o in select * from match_players where match_id = p_match and user_id <> u and state <> 'done' loop
      if o.last_active < now() - make_interval(secs => x.time_ms / 1000.0 * 1.5 + 15) then
        perform game.close_player(p_match, o.user_id, 'l');
      end if;
    end loop;
    if not exists (select 1 from match_players where match_id = p_match and state <> 'done') then
      perform game.settle(p_match);
    end if;
  end if;
  return game.match_view(p_match);
end $$;

-- mark a player done: unanswered rounds count as no answer
create function game.close_player(p_match uuid, u uuid, p_result text) returns void language plpgsql volatile security definer set search_path = public as $$
declare t int; r int;
begin
  select time_ms into t from matches where id = p_match;
  for r in 0..6 loop
    insert into answers (match_id, user_id, round, answered_at, choice, ms, points) values (p_match, u, r, now(), -1, t, 0)
    on conflict (match_id, user_id, round) do update set choice = coalesce(answers.choice, -1), ms = coalesce(answers.ms, t), answered_at = coalesce(answers.answered_at, now());
  end loop;
  update match_players set state = 'done', finished_at = now(), result = p_result,
    score = (select coalesce(sum(points), 0) from answers where match_id = p_match and user_id = u)
  where match_id = p_match and user_id = u;
end $$;

-- both live players are done: decide, then reward each
create function game.settle(p_match uuid) returns void language plpgsql volatile security definer set search_path = public as $$
declare p record;
begin
  update match_players mp set result = case
      when mp.result = 'l' then 'l'                                                   -- walked out or went quiet
      when exists (select 1 from match_players o where o.match_id = p_match and o.user_id <> mp.user_id and o.result = 'l') then 'w'
      when mp.score > (select max(score) from match_players o where o.match_id = p_match and o.user_id <> mp.user_id) then 'w'
      when mp.score < (select max(score) from match_players o where o.match_id = p_match and o.user_id <> mp.user_id) then 'l'
      else 'd' end
  where match_id = p_match;
  update matches set status = 'done', ended_at = now() where id = p_match;
  for p in select user_id from match_players where match_id = p_match loop perform game.reward(p_match, p.user_id); end loop;
end $$;

-- XP and stats for one player once their result is known (runs once per player)
create function game.reward(p_match uuid, u uuid) returns void language plpgsql volatile security definer set search_path = public as $$
declare x matches; me match_players; v_xp int; right_n int; today date := (now() at time zone 'utc')::date;
        prof profiles; season_now text := to_char(now() at time zone 'utc', 'YYYY-MM'); b text[]; counts boolean; tcount int;
begin
  select * into x from matches where id = p_match;
  select * into me from match_players where match_id = p_match and user_id = u for update;
  if me.rewarded or me.result is null then return; end if;
  update match_players set rewarded = true where match_id = p_match and user_id = u;
  select count(*) filter (where choice = 0) into right_n from answers where match_id = p_match and user_id = u;
  -- practice replays and matches where nothing was answered earn nothing (a walk-out still counts as a loss)
  counts := not x.practice and (right_n > 0 or exists (select 1 from answers where match_id = p_match and user_id = u and choice > 0) or me.result = 'l');
  if not counts then return; end if;
  v_xp := me.score + case me.result when 'w' then 50 when 'd' then 20 else 0 end;
  update match_players set xp = v_xp where match_id = p_match and user_id = u;

  update profiles set
    xp = profiles.xp + v_xp,
    played = played + (me.result <> 'p')::int,
    won = won + (me.result = 'w')::int, lost = lost + (me.result = 'l')::int, drawn = drawn + (me.result = 'd')::int,
    correct = correct + right_n, answered = answered + 7, perfect = perfect + (right_n = 7)::int,
    best_score = greatest(best_score, me.score),
    win_streak = case me.result when 'w' then win_streak + 1 when 'p' then win_streak else 0 end,
    streak_best = greatest(streak_best, case when streak_day = today then streak_cur when streak_day = today - 1 then streak_cur + 1 else 1 end),
    streak_cur = case when streak_day = today then streak_cur when streak_day = today - 1 then streak_cur + 1 else 1 end,
    streak_day = today,
    season_pts = case when season = season_now then season_pts else 0 end + case when x.mode = 'bot' then 0 else v_xp end,
    season = season_now, last_seen = now()
  where id = u;

  if x.mode <> 'bot' then
    insert into weekly (user_id, week, points, games) values (u, game.week_of(), v_xp, 1)
    on conflict (user_id, week) do update set points = weekly.points + excluded.points, games = weekly.games + 1;
  end if;

  if exists (select 1 from topics where id = x.topic_id) then
    insert into topic_stats (user_id, topic_id, xp, played, won, best) values (u, x.topic_id, v_xp, 1, (me.result = 'w')::int, me.score)
    on conflict (user_id, topic_id) do update set xp = topic_stats.xp + excluded.xp, played = topic_stats.played + 1,
      won = topic_stats.won + excluded.won, best = greatest(topic_stats.best, excluded.best);
  end if;

  select * into prof from profiles where id = u;
  select count(*) into tcount from topic_stats where user_id = u;
  b := prof.badges;
  if prof.won >= 1 then b := b || 'first_win'::text; end if;
  if prof.won >= 10 then b := b || 'win10'::text; end if;
  if prof.win_streak >= 3 then b := b || 'streak3'::text; end if;
  if right_n = 7 then b := b || 'perfect'::text; end if;
  if me.score >= 140 then b := b || 'score140'::text; end if;
  if me.result = 'd' then b := b || 'draw'::text; end if;
  if tcount >= 5 then b := b || 'topics5'::text; end if;
  if tcount >= 12 then b := b || 'topics12'::text; end if;
  if x.mode = 'daily' then b := b || 'daily1'::text; end if;
  if prof.streak_cur >= 7 then b := b || 'streak7'::text; end if;
  if prof.streak_cur >= 30 then b := b || 'streak30'::text; end if;
  if x.mode = 'challenge' and u <> x.host and me.result = 'w' then b := b || 'ldw'::text; end if;
  if x.mode in ('live','quick') and me.result = 'w' then b := b || 'live_win'::text; end if;
  update profiles set badges = (select coalesce(array_agg(distinct e order by e), '{}') from unnest(b) e) where id = u;
end $$;

-- ============================================================ quick match
-- Call every few seconds while searching. Returns the match once someone else is searching the same topic.
create function public.quick_match(p_topic text, p_time_ms int default 10000) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); other uuid; m uuid; ids bigint[];
begin
  if p_time_ms not in (10000, 15000) then p_time_ms := 10000; end if;
  if p_topic <> 'mixed' and not exists (select 1 from topics where id = p_topic) then raise exception 'unknown topic' using errcode = '22023'; end if;
  -- someone may already have matched me
  select x.id into m from matches x join match_players p on p.match_id = x.id
  where p.user_id = u and x.mode = 'quick' and x.status = 'playing' and p.state = 'playing' and x.created_at > now() - interval '2 minutes'
    and not exists (select 1 from answers where match_id = x.id and user_id = u)
  order by x.created_at desc limit 1;
  if m is not null then delete from quick_queue where user_id = u; return game.match_view(m); end if;

  delete from quick_queue where created_at < now() - interval '30 seconds';
  select user_id into other from quick_queue
  where topic_id = p_topic and time_ms = p_time_ms and user_id <> u
  order by created_at limit 1 for update skip locked;
  if other is null then
    insert into quick_queue (user_id, topic_id, time_ms) values (u, p_topic, p_time_ms)
    on conflict (user_id) do update set topic_id = excluded.topic_id, time_ms = excluded.time_ms, created_at = now();
    return null;
  end if;
  delete from quick_queue where user_id in (u, other);
  ids := game.pick(p_topic, array[u, other]);
  if coalesce(array_length(ids, 1), 0) < 7 then raise exception 'not enough questions in this topic yet' using errcode = 'P0001'; end if;
  insert into matches (mode, topic_id, qids, orders, time_ms, status, host, started_at)
  values ('quick', p_topic, ids, game.new_orders(), p_time_ms, 'playing', other, now()) returning id into m;
  insert into match_players (match_id, user_id, seat, state) values (m, other, 1, 'playing'), (m, u, 2, 'playing');
  return game.match_view(m);
end $$;

create function public.cancel_quick() returns void language sql volatile security definer set search_path = public as $$
  delete from quick_queue where user_id = auth.uid()
$$;

-- ============================================================ reading
create function public.get_match(p_match uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  -- players can always look; anyone signed in can look at a challenge (to decide whether to take it on)
  if not game.in_match(p_match) and not exists (select 1 from matches where id = p_match and mode = 'challenge') then
    raise exception 'match not found' using errcode = 'P0002';
  end if;
  return game.match_view(p_match);
end $$;

-- every question with the right answer and everyone's pick, once I've finished
create function public.match_detail(p_match uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare u uuid := game.me(); x matches;
begin
  select * into x from matches where id = p_match;
  if not exists (select 1 from match_players where match_id = p_match and user_id = u and state = 'done') then raise exception 'finish the match first' using errcode = '42501'; end if;
  return game.match_view(p_match) || jsonb_build_object('rounds', (
    select jsonb_agg(jsonb_build_object('round', r - 1, 'q', q.q, 'a', q.a, 'question_id', null,
      'picks', (select jsonb_object_agg(an.user_id, jsonb_build_object('choice', an.choice, 'text', case when an.choice between 1 and 3 then q.w[an.choice] when an.choice = 0 then q.a end, 'ms', an.ms, 'points', an.points))
                from answers an join match_players mp on mp.match_id = an.match_id and mp.user_id = an.user_id
                where an.match_id = p_match and an.round = r - 1 and (mp.state = 'done' or an.user_id = u)),
      'bot', case when x.bot is null then null else jsonb_build_object('choice', (x.bot->'picks'->(r::int - 1)->>0)::int,
             'ms', (x.bot->'picks'->(r::int - 1)->>1)::int,
             'points', case when (x.bot->'picks'->(r::int - 1)->>0)::int = 0 then game.points(x.time_ms - (x.bot->'picks'->(r::int - 1)->>1)::int, x.time_ms, r = 7) else 0 end,
             'text', case when (x.bot->'picks'->(r::int - 1)->>0)::int between 1 and 3 then q.w[(x.bot->'picks'->(r::int - 1)->>0)::int] else q.a end) end)
      order by r)
    from unnest(x.qids) with ordinality t(qid, r) join questions q on q.id = t.qid));
end $$;

create function public.my_history(p_limit int default 30, p_before timestamptz default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(game.match_view(x.id) order by x.created_at desc), '[]') from (
    select m.id, m.created_at from matches m join match_players p on p.match_id = m.id
    where p.user_id = auth.uid() and p.state = 'done' and (p_before is null or m.created_at < p_before)
    order by m.created_at desc limit least(p_limit, 100)
  ) x
$$;

-- head-to-head record against one player
create function public.head_to_head(p_other uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('w', count(*) filter (where me.score > o.score), 'l', count(*) filter (where me.score < o.score), 'd', count(*) filter (where me.score = o.score))
  from match_players me join match_players o on o.match_id = me.match_id and o.user_id = p_other
  join matches m on m.id = me.match_id
  where me.user_id = auth.uid() and me.state = 'done' and o.state = 'done' and m.mode in ('live','quick','challenge')
$$;

-- what's waiting for me: friend requests, live invites, challenges from friends, new results on my challenges
create function public.my_inbox() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'requests', (select count(*) from friendships where status = 'pending' and requester <> auth.uid() and auth.uid() in (user_a, user_b)),
    'invites', coalesce((select jsonb_agg(game.match_view(m.id) order by m.created_at desc) from matches m join match_players p on p.match_id = m.id
                where p.user_id = auth.uid() and p.state = 'invited' and m.mode = 'live' and m.status = 'waiting' and m.created_at > now() - interval '15 minutes'), '[]'),
    'challenges', coalesce((select jsonb_agg(game.match_view(m.id) order by m.created_at desc) from matches m join match_players p on p.match_id = m.id
                where p.user_id = auth.uid() and p.state = 'invited' and m.mode = 'challenge' and m.status = 'playing'
                  and exists (select 1 from match_players h where h.match_id = m.id and h.user_id = m.host and h.state = 'done')), '[]'),
    'results', coalesce((select jsonb_agg(jsonb_build_object('match', m.id, 'topic', m.topic_id, 'my_score', mine.score, 'player', game.player_card(o.user_id), 'score', o.score, 'at', o.finished_at) order by o.finished_at desc)
                from matches m join match_players mine on mine.match_id = m.id and mine.user_id = auth.uid()
                join match_players o on o.match_id = m.id and o.user_id <> auth.uid() and o.state = 'done'
                where m.mode = 'challenge' and m.host = auth.uid() and o.finished_at > now() - interval '3 days'), '[]'))
$$;

-- ============================================================ leaderboards
create function public.weekly_board(p_scope text default 'friends') returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(game.player_card(w.user_id) || jsonb_build_object('points', w.points, 'games', w.games, 'me', w.user_id = auth.uid()) order by w.points desc), '[]')
  from (select * from weekly where week = game.week_of() and (p_scope = 'all' or user_id = auth.uid() or game.are_friends(auth.uid(), user_id))
        order by points desc limit 50) w
$$;

create function public.topic_board(p_topic text, p_scope text default 'all') returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(game.player_card(t.user_id) || jsonb_build_object('xp', t.xp, 'best', t.best, 'played', t.played, 'me', t.user_id = auth.uid()) order by t.xp desc), '[]')
  from (select * from topic_stats where topic_id = p_topic and (p_scope = 'all' or user_id = auth.uid() or game.are_friends(auth.uid(), user_id))
        order by xp desc limit 50) t
$$;

-- how many questions each topic has, and how many I haven't seen yet
create function public.topic_counts() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(topic_id, jsonb_build_object('total', n, 'fresh', n - s, 'new', nw)), '{}') from (
    select q.topic_id, count(*) n, count(s.question_id) s, count(*) filter (where q.added_at > now() - interval '7 days' and q.source <> 'bank') nw
    from questions q left join seen s on s.question_id = q.id and s.user_id = auth.uid()
    where q.status = 'live' group by q.topic_id) c
$$;

-- ============================================================ community questions
create function public.suggest_question(p_topic text, p_q text, p_a text, p_w text[]) returns bigint
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); id bigint;
begin
  if (select count(*) from submissions where user_id = u and created_at > now() - interval '1 day') >= 20 then
    raise exception 'that''s plenty for today, thanks!' using errcode = 'P0001';
  end if;
  if array_length(p_w, 1) <> 3 or (select count(distinct lower(btrim(x))) from unnest(p_w || p_a) x) <> 4 then
    raise exception 'give one right answer and three different wrong ones' using errcode = '22023';
  end if;
  insert into submissions (user_id, topic_id, q, a, w) values (u, p_topic, btrim(p_q), btrim(p_a), array(select btrim(x) from unnest(p_w) x)) returning submissions.id into id;
  return id;
end $$;

create function public.review_queue() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (select is_admin from profiles where id = auth.uid()) then raise exception 'admins only' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object('by', game.player_card(s.user_id)) order by s.created_at) from submissions s where s.status = 'pending'), '[]');
end $$;

create function public.review_submission(p_id bigint, p_approve boolean) returns text
language plpgsql volatile security definer set search_path = public as $$
declare s submissions;
begin
  if not (select is_admin from profiles where id = auth.uid()) then raise exception 'admins only' using errcode = '42501'; end if;
  update submissions set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now() where id = p_id and status = 'pending' returning * into s;
  if s.id is null then return 'none'; end if;
  if p_approve then
    insert into questions (topic_id, q, a, w, difficulty, source, source_id, license, norm)
    values (s.topic_id, s.q, s.a, s.w, 2, 'community', s.id::text, 'community', game.norm(s.q))
    on conflict (norm) do nothing;
  end if;
  return case when p_approve then 'approved' else 'rejected' end;
end $$;

-- flag a wrong question from a match you played; three flags hide it until an admin looks
create function public.report_question(p_match uuid, p_round int, p_reason text default null) returns text
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := game.need_profile(); qid bigint;
begin
  if not game.in_match(p_match) then raise exception 'match not found' using errcode = 'P0002'; end if;
  select qids[p_round + 1] into qid from matches where id = p_match;
  insert into reports (user_id, question_id, reason) values (u, qid, left(p_reason, 200)) on conflict do nothing;
  if found then
    update questions set reports = reports + 1, status = case when reports + 1 >= 3 then 'hidden' else status end where id = qid;
  end if;
  return 'thanks';
end $$;

-- ============================================================ question normalisation (also used by imports)
create function game.norm(t text) returns text language sql immutable as $$
  select regexp_replace(lower(t), '[[:space:]!-/:-@[-`{-~]+', '', 'g')
$$;

-- ============================================================ permissions
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
-- the row-level security checks call three helpers as the signed-in user; nothing else in "game" is callable
revoke execute on all functions in schema game from public, anon, authenticated;
grant usage on schema game to authenticated;
grant execute on function game.in_match(uuid), game.answered(uuid, smallint), game.match_over(uuid) to authenticated;
