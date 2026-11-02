-- RLS / privilege tests. Every check raises on failure.
\set ON_ERROR_STOP 1
grant all on all tables in schema public to service_role;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@one.test', now(), '{"requested_plan":"premium"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@one.test', null, '{"requested_plan":"owner"}');

do $$ begin
  assert (select count(*) from public.profiles) = 2, 'trigger must create profiles';
  assert (select role from public.profiles where email = 'bob@one.test') = 'user', 'new users are never elevated';
  assert (select requested_plan from public.user_preferences where user_id = '22222222-2222-2222-2222-222222222222') is null, 'invalid requested plan ignored';
  assert (select email_verified from public.profiles where email = 'alice@one.test'), 'confirmed email reflected';
end $$;

-- Alice (authenticated) creates content
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
insert into public.memories (user_id, title, content) values (auth.uid(), 'Alice secret', 'insurance 4711');
insert into public.ai_conversations (id, user_id, title) values ('33333333-3333-3333-3333-333333333333', auth.uid(), 'conv');

-- Alice cannot write rows for Bob
do $$ begin
  begin
    insert into public.memories (user_id, title) values ('22222222-2222-2222-2222-222222222222', 'spoof');
    raise exception 'FAIL: inserted row for another user';
  exception when insufficient_privilege then null; end;
end $$;

-- Alice cannot elevate herself
do $$ begin
  begin
    update public.profiles set role = 'owner' where id = auth.uid();
    if found then raise exception 'FAIL: profile update allowed'; end if;
  exception when insufficient_privilege then null; end;
end $$;

-- Alice cannot read admin tables
do $$ begin
  begin
    perform * from public.audit_logs;
    raise exception 'FAIL: audit_logs readable';
  exception when insufficient_privilege then null; end;
end $$;

-- Billing webhook records are server-only
do $$ begin
  begin
    perform * from public.billing_events;
    raise exception 'FAIL: billing_events readable';
  exception when insufficient_privilege then null; end;
end $$;

-- Bob sees nothing of Alice's
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert (select count(*) from public.memories) = 0, 'FAIL: Bob sees Alice memories';
  assert (select count(*) from public.profiles) = 1, 'FAIL: Bob sees other profiles';
  update public.memories set title = 'hacked';
  assert not found, 'FAIL: Bob updated Alice memory';
  delete from public.memories;
  assert not found, 'FAIL: Bob deleted Alice memory';
  -- Bob cannot attach a message to Alice's conversation (composite FK)
  begin
    insert into public.ai_messages (user_id, conversation_id, role, content) values (auth.uid(), '33333333-3333-3333-3333-333333333333', 'user', 'x');
    raise exception 'FAIL: cross-user message';
  exception when foreign_key_violation then null; end;
end $$;

-- Anonymous: nothing
reset role;
set role anon;
do $$ begin
  begin
    perform * from public.memories;
    raise exception 'FAIL: anon read';
  exception when insufficient_privilege then null; end;
end $$;

-- Service role (server) can manage plans; trigger allows it
reset role;
set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set plan = 'premium' where email = 'alice@one.test';
reset role;

-- Owner bootstrap + single-owner guarantee + append-only audit log
select public.one_promote_owner('11111111-1111-1111-1111-111111111111');
select public.one_promote_owner('22222222-2222-2222-2222-222222222222');
do $$ begin
  assert (select count(*) from public.profiles where role = 'owner') = 1, 'FAIL: more than one owner';
  begin
    delete from public.audit_logs;
    raise exception 'FAIL: audit log deletable';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Storage path must be inside the owner's folder
do $$ begin
  begin
    insert into public.documents (user_id, file_name, mime_type, size_bytes, storage_path)
      values ('11111111-1111-1111-1111-111111111111', 'x.pdf', 'application/pdf', 1, '22222222-2222-2222-2222-222222222222/x.pdf');
    raise exception 'FAIL: foreign storage path';
  exception when check_violation then null; end;
end $$;

-- Cascade delete removes all private data
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from public.memories) = 0, 'FAIL: cascade';
end $$;

select 'ALL RLS TESTS PASSED' as result;
