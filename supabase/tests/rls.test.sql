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

-- ───────────── ONE Business: tenant isolation ─────────────
reset role;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'carol@acme.test', now(), '{"account_type":"business","company_name":"Acme"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'dave@acme.test', now(), '{"account_type":"business"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'vic@acme.test', now(), '{"account_type":"business"}'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'eve@globex.test', now(), '{"account_type":"admin"}');
do $$ begin
  assert (select account_type from public.profiles where email = 'carol@acme.test') = 'business', 'FAIL: business account type from sign-up';
  assert (select account_type from public.profiles where email = 'eve@globex.test') = 'personal', 'FAIL: unknown account type must fall back to personal';
  assert (select role from public.profiles where email = 'eve@globex.test') = 'user', 'FAIL: sign-up metadata must never grant admin';
  assert (select company_name from public.user_preferences where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Acme', 'FAIL: company name stored';
end $$;
insert into public.organizations (id, name, owner_id) values
  ('0a000000-0000-0000-0000-00000000000a', 'Acme', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('0b000000-0000-0000-0000-00000000000b', 'Globex', 'bbbbbbbb-0000-0000-0000-000000000001');
insert into public.organization_members (org_id, user_id, role) values
  ('0a000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner'),
  ('0a000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000002', 'employee'),
  ('0a000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000003', 'viewer'),
  ('0b000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000001', 'owner');
do $$ begin
  begin
    insert into public.organization_members (org_id, user_id, role) values ('0a000000-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000001', 'owner');
    raise exception 'FAIL: second business owner';
  exception when unique_violation then null; end;
end $$;

-- Carol (owner) creates a project; Dave (employee) adds a task in Carol's project.
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
insert into public.projects (id, user_id, org_id, name) values ('0c000000-0000-0000-0000-00000000000c', auth.uid(), '0a000000-0000-0000-0000-00000000000a', 'Website relaunch');
insert into public.memories (user_id, org_id, title) values (auth.uid(), '0a000000-0000-0000-0000-00000000000a', 'Acme contract');
insert into public.memories (user_id, title) values (auth.uid(), 'Carol private note');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false);
insert into public.tasks (user_id, org_id, title, project_id, assignee_id) values (auth.uid(), '0a000000-0000-0000-0000-00000000000a', 'Draft sitemap', '0c000000-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from public.memories) = 1, 'FAIL: employee must see company memory but not the owner''s private note';
  assert (select count(*) from public.organization_members) = 3, 'FAIL: member list of own company';
  begin
    insert into public.tasks (user_id, org_id, title, assignee_id) values (auth.uid(), '0a000000-0000-0000-0000-00000000000a', 'x', 'bbbbbbbb-0000-0000-0000-000000000001');
    raise exception 'FAIL: assigned to a non-member';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;

-- Viewer can read but not write.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000003', false);
do $$ begin
  assert (select count(*) from public.tasks) = 1, 'FAIL: viewer reads company tasks';
  begin
    insert into public.memories (user_id, org_id, title) values (auth.uid(), '0a000000-0000-0000-0000-00000000000a', 'viewer write');
    raise exception 'FAIL: viewer wrote';
  exception when insufficient_privilege then null; end;
  update public.tasks set title = 'changed by viewer';
  assert not found, 'FAIL: viewer updated';
end $$;

-- Eve (other company) sees nothing of Acme and cannot write into it.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000001', false);
do $$ begin
  assert (select count(*) from public.memories) = 0, 'FAIL: cross-tenant memory read';
  assert (select count(*) from public.tasks) = 0, 'FAIL: cross-tenant task read';
  assert (select count(*) from public.projects) = 0, 'FAIL: cross-tenant project read';
  assert (select count(*) from public.organizations) = 1, 'FAIL: cross-tenant organization read';
  assert (select count(*) from public.organization_members) = 1, 'FAIL: cross-tenant member read';
  begin
    insert into public.memories (user_id, org_id, title) values (auth.uid(), '0a000000-0000-0000-0000-00000000000a', 'intrusion');
    raise exception 'FAIL: cross-tenant insert';
  exception when insufficient_privilege then null; end;
  -- Own company task pointing at Acme's project is rejected by the scope check.
  begin
    insert into public.tasks (user_id, org_id, title, project_id) values (auth.uid(), '0b000000-0000-0000-0000-00000000000b', 'x', '0c000000-0000-0000-0000-00000000000c');
    raise exception 'FAIL: cross-tenant reference';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- Personal rows can't point at company rows either.
  begin
    insert into public.tasks (user_id, title, project_id) values (auth.uid(), 'x', '0c000000-0000-0000-0000-00000000000c');
    raise exception 'FAIL: personal → company reference';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- Users cannot switch their account type or read admin-only tables.
  begin
    update public.profiles set account_type = 'business' where id = auth.uid();
    if found then raise exception 'FAIL: account type changed by user'; end if;
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.platform_settings;
    raise exception 'FAIL: platform_settings readable';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.organization_invites;
    raise exception 'FAIL: invites readable';
  exception when insufficient_privilege then null; end;
end $$;

-- A removed member loses access immediately, even to rows they created.
reset role;
update public.organization_members set status = 'removed' where user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false);
do $$ begin
  assert (select count(*) from public.tasks) = 0, 'FAIL: removed member still reads company tasks';
end $$;
reset role;

-- Cascade delete removes all private data
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from public.memories where user_id = '11111111-1111-1111-1111-111111111111') = 0, 'FAIL: cascade';
end $$;

select 'ALL RLS TESTS PASSED' as result;
