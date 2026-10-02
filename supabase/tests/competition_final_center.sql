-- Run after all competition migrations, including 20261002100300, in an isolated test database.
begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.denied(command text,expected text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when others then if position(expected in sqlerrm)>0 then raise notice 'PASS: %',expected; return; end if; raise; end;
  raise exception 'FAIL: expected %',expected;
end $$;

insert into auth.users(id,email) select ('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'final-test-'||n||'@test.invalid' from generate_series(1,8) n;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at)
  select ('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
    case when n=1 then 'league_admin' else 'participant' end,'Final','Person '||n,now() from generate_series(1,8) n;
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
  values('FINAL-TEST','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
  select 'FINAL-TEST',('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'eligible','lead','Testklasse' from generate_series(2,8) n;
insert into public.finale_registrations(profile_id,season_year,registration_status)
  select ('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'FINAL-TEST','registered' from generate_series(2,8) n;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_competition_config('FINAL-TEST',jsonb_build_object(
  'routes',(select jsonb_agg(jsonb_build_object('number',n,'name','Route '||n,'grade','6a','color','blue') order by n) from generate_series(1,5) n),
  'assignments',jsonb_build_array(jsonb_build_object('league','lead','class_label','Testklasse','route_numbers',jsonb_build_array(1,2,3,4,5))),
  'zone_points',jsonb_build_array(0,10,20,30,40,50,60,70,80,90,100),'flash_bonus',0));
select public.set_competition_phase('FINAL-TEST','open');
select public.set_competition_phase('FINAL-TEST','closed');
select public.set_competition_final_route('FINAL-TEST',1,'Finalroute',30);
select pg_temp.denied('select public.publish_competition_final_class(''FINAL-TEST'',''lead'',''Testklasse'',(public.get_competition_final_admin(''FINAL-TEST'')->''routes''->0->>''id'')::uuid,1::smallint,0)','Halbfinalergebnisse fehlen');
reset role;

-- Seven registered starters: sixth and seventh tie at the qualification boundary.
update public.competition_day_events set phase='draft' where season_year='FINAL-TEST';
set local role anon;
select pg_temp.ok(jsonb_array_length(public.get_competition_live('FINAL-TEST')->'classes')=0,'preparation does not expose semifinal names');
select pg_temp.ok(public.get_competition_live('NO-SUCH-SEASON')->'class_keys'='[]'::jsonb,'missing season has complete TV settings');
select pg_temp.denied('select * from public.competition_final_stations','permission denied');
reset role;
update public.competition_day_events set phase='closed' where season_year='FINAL-TEST';
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
  select ev.id,r.id,p.id,case when r.route_number=1 then greatest(1,8-n) else 0 end,false,
    case when r.route_number=1 then case when n>=7 then 10 else (8-n)*10 end else 0 end
  from public.competition_day_events ev join public.competition_day_routes r on r.event_id=ev.id
  cross join generate_series(2,8) n join public.profiles p on p.id=('99999999-7000-4000-8000-'||lpad(n::text,12,'0'))::uuid
  where ev.season_year='FINAL-TEST';
set local role authenticated;
select public.publish_competition_final_class('FINAL-TEST','lead','Testklasse',
  (public.get_competition_final_admin('FINAL-TEST')->'routes'->0->>'id')::uuid,1::smallint,0);
reset role;
select pg_temp.ok((select count(*)=7 from public.competition_final_entries),'all tied at sixth enter final');
select pg_temp.ok((select min(start_position)=1 and max(start_position)=7 from public.competition_final_entries),'start positions are contiguous');
select pg_temp.ok((select semifinal_rank=6 from public.competition_final_entries where profile_id='99999999-7000-4000-8000-000000000008'),'tie keeps semifinal rank');
set local role authenticated;
select pg_temp.denied('select public.move_competition_final_entry((public.get_competition_final_admin(''FINAL-TEST'')->''classes''->0->''entries''->0->>''entry_id'')::uuid,2,0)','FINAL_VERSION_CONFLICT');
select public.set_competition_final_password('FINAL-TEST','ABCDEFGHIJKLMNOPQRSTUVWX');
select pg_temp.denied('select public.move_competition_final_entry((public.get_competition_final_admin(''FINAL-TEST'')->''classes''->0->''entries''->0->>''entry_id'')::uuid,2,null)','FINAL_VERSION_CONFLICT');
select public.set_competition_final_phase((public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'id')::uuid,'running',1);
reset role;
select set_config('test.entry1',(select id::text from public.competition_final_entries where profile_id='99999999-7000-4000-8000-000000000002'),true);
select set_config('test.entry2',(select id::text from public.competition_final_entries where profile_id='99999999-7000-4000-8000-000000000003'),true);
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.denied('select public.get_competition_final_admin(''FINAL-TEST'')','permission denied');
select pg_temp.denied('select public.get_competition_final_station(''FINAL-TEST'',1::smallint,''WRONGCODEWRONGCODEWRONGCODE'')','FINAL_PASSWORD_INVALID');
select pg_temp.denied('select * from public.competition_final_access','permission denied');
select pg_temp.denied('select public.verify_competition_final_password(''FINAL-TEST'',''ABCDEFGHIJKLMNOPQRSTUVWX'')','permission denied');
select pg_temp.denied('select public.set_competition_final_password(''FINAL-TEST'',''Changed-Password-Demo'')','permission denied');
select pg_temp.ok(public.get_competition_final_station('FINAL-TEST',1::smallint,'ABCDEFGHIJKLMNOPQRSTUVWX')->'classes'=public.get_competition_final_station('FINAL-TEST',2::smallint,'ABCDEFGHIJKLMNOPQRSTUVWX')->'classes','both phones see the same classes with one password');
select public.submit_competition_final_attempt('FINAL-TEST',1::smallint,'ABCDEFGHIJKLMNOPQRSTUVWX',current_setting('test.entry1')::uuid,'99999999-7000-4000-8000-000000000101',20,false,200,2,'');
select public.submit_competition_final_attempt('FINAL-TEST',1::smallint,'ABCDEFGHIJKLMNOPQRSTUVWX',current_setting('test.entry1')::uuid,'99999999-7000-4000-8000-000000000101',20,false,200,2,'');
reset role;
select pg_temp.ok((select count(*)=1 from public.competition_final_attempts where entry_id=current_setting('test.entry1')::uuid),'retry is idempotent');
set local role anon;
select public.submit_competition_final_attempt('FINAL-TEST',2::smallint,'ABCDEFGHIJKLMNOPQRSTUVWX',current_setting('test.entry2')::uuid,'99999999-7000-4000-8000-000000000102',20,false,100,3,'');
select pg_temp.ok((public.get_competition_final_public('FINAL-TEST')->0->'entries'->0->>'name')='Final Person 2','better semifinal rank beats faster time at equal grip');
select pg_temp.ok(position('profile_id' in public.get_competition_live('FINAL-TEST')::text)=0,'public payload contains no internal IDs');
select pg_temp.ok(position('code_hash' in public.get_competition_live('FINAL-TEST')::text)=0 and position('reason' in public.get_competition_live('FINAL-TEST')::text)=0,'public TV excludes codes and internal reasons');
select pg_temp.denied('select public.get_competition_final_station(''FINAL-TEST'',1::smallint,null)','FINAL_PASSWORD_INVALID');
reset role;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.set_competition_final_phase((public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'id')::uuid,'review',4);
reset role;
update public.competition_day_results set points=points+10 where profile_id='99999999-7000-4000-8000-000000000008' and event_id=(select id from public.competition_day_events where season_year='FINAL-TEST') and route_id=(select id from public.competition_day_routes where event_id=(select id from public.competition_day_events where season_year='FINAL-TEST') and route_number=1);
set local role authenticated;
select public.set_competition_final_phase((public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'id')::uuid,'running',5,'Papierkorrektur nach Klassenstart; Finalfeld bleibt bestehen');
select pg_temp.ok(public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'phase'='running','started class can reopen after semifinal correction without replacing frozen field');
reset role;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.denied('select public.get_competition_final_admin(''FINAL-TEST'')','LEAGUE_ADMIN_REQUIRED');
select pg_temp.denied('select public.set_competition_live_display(''FINAL-TEST'',''final'',''[]''::jsonb,null,15)','LEAGUE_ADMIN_REQUIRED');
select pg_temp.denied('select public.set_competition_final_password(''FINAL-TEST'',''Changed-Password-Demo'')','LEAGUE_ADMIN_REQUIRED');
reset role;
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.set_competition_final_password('FINAL-TEST','Changed-Password-Demo');
reset role;
select pg_temp.ok((select password_hash<>'Changed-Password-Demo' and password_hash like '$2a$%' from public.competition_final_access where event_id=(select id from public.competition_day_events where season_year='FINAL-TEST')),'password stored as bcrypt hash');
select pg_temp.ok((select station_no=2 from public.competition_final_attempts where request_id='99999999-7000-4000-8000-000000000102'),'second phone is preserved in audit source');
set local role anon;
select pg_temp.denied('select public.get_competition_final_station(''FINAL-TEST'',1::smallint,''ABCDEFGHIJKLMNOPQRSTUVWX'')','FINAL_PASSWORD_INVALID');
select pg_temp.denied('select public.get_competition_final_station(''FINAL-TEST'',2::smallint,''ABCDEFGHIJKLMNOPQRSTUVWX'')','FINAL_PASSWORD_INVALID');
select pg_temp.denied('select public.submit_competition_final_attempt(''FINAL-TEST'',2::smallint,''ABCDEFGHIJKLMNOPQRSTUVWX'',current_setting(''test.entry2'')::uuid,''99999999-7000-4000-8000-000000000102'',20,false,100,3,'''')','FINAL_PASSWORD_INVALID');
select pg_temp.ok(public.get_competition_final_station('FINAL-TEST',1::smallint,'Changed-Password-Demo')->'classes'=public.get_competition_final_station('FINAL-TEST',2::smallint,'Changed-Password-Demo')->'classes','new password works on both phones');
select pg_temp.ok(position('password_hash' in public.get_competition_live('FINAL-TEST')::text)=0,'public endpoint excludes password hashes');
reset role;
-- Exercise the remaining ranking tie breakers using only this rolled-back fixture.
update public.competition_final_entries set semifinal_rank=2
where id in (current_setting('test.entry1')::uuid,current_setting('test.entry2')::uuid);
update public.competition_final_attempts set grip=30,is_top=false
where entry_id in (current_setting('test.entry1')::uuid,current_setting('test.entry2')::uuid) and counted;
select pg_temp.ok((public.get_competition_final_public('FINAL-TEST')->0->'entries'->0->>'name')='Final Person 3','time breaks equal grip and equal semifinal rank');
update public.competition_final_attempts set seconds=100 where entry_id=current_setting('test.entry1')::uuid and counted;
select pg_temp.ok((select count(*)=2 from jsonb_array_elements(public.get_competition_final_public('FINAL-TEST')->0->'entries') e where (e->>'rank')::integer=1),'complete tie shares first place');
update public.competition_final_attempts set is_top=true,seconds=300 where entry_id=current_setting('test.entry1')::uuid and counted;
select pg_temp.ok((public.get_competition_final_public('FINAL-TEST')->0->'entries'->0->>'name')='Final Person 2','TOP beats equal maximum grip even with slower time');
select set_config('request.jwt.claim.sub','99999999-7000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99999999-7000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
create function pg_temp.class_id() returns uuid language sql as $$ select (public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'id')::uuid $$;
create function pg_temp.version() returns integer language sql as $$ select (public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'version')::integer $$;
select public.set_competition_final_phase(pg_temp.class_id(),'review',pg_temp.version());
select pg_temp.denied('select public.set_competition_final_phase(pg_temp.class_id(),''final'',pg_temp.version())','Ergebnisse oder Papierabgleich fehlen');
do $$ declare e jsonb; begin
 for e in select value from jsonb_array_elements(public.get_competition_final_admin('FINAL-TEST')->'classes'->0->'entries') loop
  if (e->>'entry_id')::uuid not in (current_setting('test.entry1')::uuid,current_setting('test.entry2')::uuid) then
   perform public.set_competition_final_entry_status((e->>'entry_id')::uuid,'dns','Fixture: not started',pg_temp.version());
  end if;
 end loop;
end $$;
select public.check_competition_final_entry(current_setting('test.entry1')::uuid,pg_temp.version());
select public.check_competition_final_entry(current_setting('test.entry2')::uuid,pg_temp.version());
select public.set_competition_final_phase(pg_temp.class_id(),'final',pg_temp.version());
select pg_temp.ok(public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'phase'='final','checked results and explicit nonstarts allow final approval');
select pg_temp.denied('select public.set_competition_final_phase(pg_temp.class_id(),''review'',pg_temp.version(),null)','Klassenwechsel');
select public.set_competition_final_phase(pg_temp.class_id(),'review',pg_temp.version(),'Fixture: paper correction');
select pg_temp.ok(public.get_competition_final_admin('FINAL-TEST')->'classes'->0->>'phase'='review','official result reopens only with a reason');
select public.set_competition_final_entry_status(current_setting('test.entry2')::uuid,'incident','Fixture: technical incident',pg_temp.version());
select pg_temp.denied('select public.set_competition_final_phase(pg_temp.class_id(),''final'',pg_temp.version())','Ergebnisse oder Papierabgleich fehlen');
select pg_temp.ok((select e->>'rank' is null from jsonb_array_elements(public.get_competition_final_public('FINAL-TEST')->0->'entries') e where e->>'name'='Final Person 3'),'incident has no sporting rank');
reset role;
rollback;
