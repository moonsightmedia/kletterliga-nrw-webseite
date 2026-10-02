-- Isolated synthetic attendance integration scenarios. All fixtures roll back.
-- Run after 20261002180000_competition_attendance.sql on the local QA database.
begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.denied(command text,label text,expected text default null) returns void language plpgsql as $$
begin
  begin execute command;
  exception when others then
    if sqlstate not in ('42501','40001','P0001','23505') then raise; end if;
    if expected is not null and position(expected in sqlerrm)=0 then raise; end if;
    raise notice 'PASS: %',label; return;
  end;
  raise exception 'FAIL: accepted forbidden action: %',label;
end $$;
create function pg_temp.person(n integer) returns uuid language sql immutable as $$
  select ('99999999-8400-4000-8000-'||lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.row_for(n integer,p_password text default null) returns jsonb language sql as $$
  select r from (select public.get_competition_attendance('ATTENDANCE-TEST',p_password) as d) payload
    cross join lateral jsonb_array_elements(d->'rows') r
    where r->>'profile_id'=pg_temp.person(n)::text
$$;
create function pg_temp.version_for(n integer,p_password text default null) returns integer language sql as $$
  select (pg_temp.row_for(n,p_password)->>'version')::integer
$$;

insert into auth.users(id,email) select pg_temp.person(n),'attendance-test-'||n||'@test.invalid' from generate_series(1,12) n;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at,archived_at)
  select pg_temp.person(n),case when n=1 then 'league_admin' when n=12 then 'gym_admin' else 'participant' end,
    'Attendance','Person '||n,case when n=4 then null else now() end,case when n=5 then now() else null end
  from generate_series(1,12) n;
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
  values('ATTENDANCE-TEST','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
  select 'ATTENDANCE-TEST',pg_temp.person(n),'eligible','lead','Youth'
  from generate_series(2,11) n where n<>6;
insert into public.finale_registrations(profile_id,season_year,registration_status)
  select pg_temp.person(n),'ATTENDANCE-TEST','registered' from (values(2),(7),(8)) p(n);
select set_config('request.jwt.claim.sub',pg_temp.person(1)::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(1),'role','authenticated')::text,true);
set local role authenticated;
select public.save_competition_config('ATTENDANCE-TEST',jsonb_build_object(
  'routes',(select jsonb_agg(jsonb_build_object('number',n,'name','Fixture route '||n,'grade','6a','color','blue') order by n) from generate_series(1,10) n),
  'assignments',jsonb_build_array(
    jsonb_build_object('league','lead','class_label','Youth','route_numbers',jsonb_build_array(1,2,3,4,5)),
    jsonb_build_object('league','toprope','class_label','Adults','route_numbers',jsonb_build_array(6,7,8,9,10))),
  'zone_points',jsonb_build_array(0,10,20,30,40,50,60,70,80,90,100),'flash_bonus',0));
do $$ begin
  perform set_config('test.attendance_password',gen_random_uuid()::text,true);
  perform set_config('test.attendance_new_password',gen_random_uuid()::text,true);
end $$;
select public.set_competition_attendance_password('ATTENDANCE-TEST',current_setting('test.attendance_password'));
select pg_temp.denied($s$select public.set_competition_attendance_password('ATTENDANCE-TEST','üüüüüü')$s$,'password requires twelve characters rather than twelve UTF-8 bytes');
select public.set_competition_staff('ATTENDANCE-TEST',pg_temp.person(1),true);
select public.set_competition_phase('ATTENDANCE-TEST','open');
select set_config('test.route',(public.get_competition_staff_routes('ATTENDANCE-TEST')->0->>'id'),true);
select set_config('test.qr',(public.get_competition_staff_routes('ATTENDANCE-TEST')->0->>'qr_token'),true);
select set_config('test.other_route',(public.get_competition_staff_routes('ATTENDANCE-TEST')->5->>'id'),true);
select set_config('test.other_qr',(public.get_competition_staff_routes('ATTENDANCE-TEST')->5->>'qr_token'),true);
select pg_temp.ok(pg_temp.row_for(2)->>'status'='expected','existing registration is not silently checked in');
select pg_temp.ok((pg_temp.row_for(2)->>'version')::integer=0,'new attendance has zero version');
select pg_temp.ok((pg_temp.row_for(2)->>'route_count')::integer=5,'admin sees configured route count');
reset role;
-- Simulate a configuration inconsistency discovered after opening.
update public.semifinal_eligibility set class_label='Unconfigured' where profile_id=pg_temp.person(7) and season_year='ATTENDANCE-TEST';
set local role authenticated;

-- Normal participant has neither reception list nor reception write permissions.
select set_config('request.jwt.claim.sub',pg_temp.person(2)::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(2),'role','authenticated')::text,true);
select pg_temp.denied($s$select public.get_competition_attendance('ATTENDANCE-TEST')$s$,'participant cannot read attendee list');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'arrive',0,gen_random_uuid())$s$,'participant cannot check themself in');
select pg_temp.ok((public.get_competition_day('ATTENDANCE-TEST')->'check_in'->>'required')::boolean,'participant sees required check-in');
select pg_temp.ok(public.get_competition_day('ATTENDANCE-TEST')->'check_in'->>'status'='expected','participant sees expected before arrival');
select pg_temp.denied($s$select public.submit_competition_result('ATTENDANCE-TEST',current_setting('test.route')::uuid,5,false,current_setting('test.qr'))$s$,'registered participant cannot submit before crew check-in');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.denied($s$select public.get_competition_attendance('ATTENDANCE-TEST')$s$,'anonymous user cannot read attendee list');
select pg_temp.denied($s$select public.get_competition_attendance('ATTENDANCE-TEST','not-valid')$s$,'wrong reception password is rejected');
select pg_temp.denied('select * from public.competition_attendance','direct attendance table is private');
select pg_temp.denied('select * from public.competition_attendance_access','password hashes cannot be read directly');
select pg_temp.denied('select * from public.competition_attendance_requests','idempotency responses cannot be read directly');
select pg_temp.denied('select * from public.competition_attendance_audit','internal attendance audit cannot be read directly');
select pg_temp.denied('select * from public.competition_attendance_registration_permits','registration permits cannot be manipulated directly');
select pg_temp.denied($s$select public.has_competition_registration_permit(pg_temp.person(3),'ATTENDANCE-TEST')$s$,'registration permit helper is not a public RPC');
select pg_temp.ok(position('email' in public.get_competition_attendance('ATTENDANCE-TEST',current_setting('test.attendance_password'))::text)=0
  and position('phone' in public.get_competition_attendance('ATTENDANCE-TEST',current_setting('test.attendance_password'))::text)=0,
  'reception list omits contact details');
select set_config('test.arrival_request',gen_random_uuid()::text,true);
select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'arrive',0,current_setting('test.arrival_request')::uuid,null,current_setting('test.attendance_password'));
select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'arrive',0,current_setting('test.arrival_request')::uuid,null,current_setting('test.attendance_password'));
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(3),'arrive',0,current_setting('test.arrival_request')::uuid,null,current_setting('test.attendance_password'))$s$,'same request ID with different participant is rejected','ATTENDANCE_REQUEST_CONFLICT');
select pg_temp.ok(pg_temp.version_for(2,current_setting('test.attendance_password'))=1,'arrival retry does not increment version twice');
select pg_temp.ok(pg_temp.row_for(2,current_setting('test.attendance_password'))->>'checked_in_at' is not null,'arrival records server timestamp');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'arrive',0,gen_random_uuid(),null,current_setting('test.attendance_password'))$s$,'stale arrival version rejected','ATTENDANCE_CONFLICT');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'undo',1,gen_random_uuid(),'Test undo',current_setting('test.attendance_password'))$s$,'crew cannot revoke arrival');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(8),'absent',0,gen_random_uuid(),'No show',current_setting('test.attendance_password'))$s$,'crew cannot exclude no-show participant');
select pg_temp.denied($s$select public.set_competition_phase('ATTENDANCE-TEST','closed')$s$,'reception access gives no competition administration rights');
select pg_temp.denied($s$select public.get_competition_final_station('ATTENDANCE-TEST',1::smallint,current_setting('test.attendance_password'))$s$,'reception password grants no final-station access');
select pg_temp.denied($s$select public.get_competition_judge_routes('ATTENDANCE-TEST',current_setting('test.attendance_password'))$s$,'reception password grants no route QR access');

-- Late registrations use existing approved accounts; never silently approve/activate.
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(3),'arrive',0,gen_random_uuid(),null,current_setting('test.attendance_password'))$s$,'nonregistrant requires explicit late-register action');
select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(3),'late-register',0,gen_random_uuid(),null,current_setting('test.attendance_password'));
select pg_temp.ok((pg_temp.row_for(3,current_setting('test.attendance_password'))->>'registered')::boolean
  and pg_temp.row_for(3,current_setting('test.attendance_password'))->>'status'='arrived','late registration explicitly registers and arrives');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(4),'late-register',0,gen_random_uuid(),null,current_setting('test.attendance_password'))$s$,'inactive Liga account cannot be late-registered');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(5),'late-register',0,gen_random_uuid(),null,current_setting('test.attendance_password'))$s$,'archived account cannot be late-registered');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(6),'late-register',0,gen_random_uuid(),null,current_setting('test.attendance_password'))$s$,'unapproved account cannot be late-registered');
select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(7),'arrive',0,gen_random_uuid(),null,current_setting('test.attendance_password'));
select pg_temp.ok((pg_temp.row_for(7,current_setting('test.attendance_password'))->>'route_count')::integer=0,'existing arrival keeps missing-route warning visible');
reset role;

-- Real participant submission still checks selected route and QR after arrival.
select pg_temp.ok((select count(*)=1 from public.competition_attendance_audit a
  join public.competition_day_events e on e.id=a.event_id where e.season_year='ATTENDANCE-TEST' and a.profile_id=pg_temp.person(2)),
  'idempotent retries leave exactly one attendance audit entry');
select pg_temp.ok((select actor_kind='crew' and actor_id is null and before_data->>'status'='expected'
  and after_data->>'status'='arrived' and before_data->>'version'='0' and after_data->>'version'='1'
  from public.competition_attendance_audit a join public.competition_day_events e on e.id=a.event_id
  where e.season_year='ATTENDANCE-TEST' and a.profile_id=pg_temp.person(2)),
  'crew provenance and before/after values are preserved without invented actor account');
select set_config('request.jwt.claim.sub',pg_temp.person(2)::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(2),'role','authenticated')::text,true);
set local role authenticated;
select public.submit_competition_result('ATTENDANCE-TEST',current_setting('test.route')::uuid,0,false,current_setting('test.qr'));
select pg_temp.ok(jsonb_array_length(public.get_competition_day('ATTENDANCE-TEST')->'results')=1,'explicit zero result is distinct from missing after check-in');
select pg_temp.denied($s$select public.submit_competition_result('ATTENDANCE-TEST',current_setting('test.other_route')::uuid,5,false,current_setting('test.other_qr'))$s$,'correct QR for wrong class route is denied','COMPETITION_QR_INVALID');
select pg_temp.denied($s$select public.submit_competition_result('ATTENDANCE-TEST',current_setting('test.route')::uuid,5,false,'wrong QR')$s$,'wrong QR is denied after check-in','COMPETITION_QR_INVALID');
reset role;

-- Administrator can reverse arrival with a reason; credential rotation revokes retries.
select set_config('request.jwt.claim.sub',pg_temp.person(1)::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(1),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'undo',1,gen_random_uuid())$s$,'admin undo requires a reason');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'undo',1,gen_random_uuid(),'Mistaken arrival')$s$,'admin cannot revoke arrival while recorded results exist','ATTENDANCE_RESULTS_EXIST');
select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(3),'undo',1,gen_random_uuid(),'Mistaken arrival');
select pg_temp.ok(pg_temp.row_for(3)->>'status'='expected' and pg_temp.version_for(3)=2,'admin undo restores expected and increments version');
reset role;
select pg_temp.ok((select actor_kind='admin' and actor_id=pg_temp.person(1) and reason='Mistaken arrival'
  and before_data->>'status'='arrived' and after_data->>'status'='expected'
  from public.competition_attendance_audit a join public.competition_day_events e on e.id=a.event_id
  where e.season_year='ATTENDANCE-TEST' and a.profile_id=pg_temp.person(3) and action='undo'),
  'admin correction records real actor, reason and before/after status');
set local role authenticated;
select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(8),'absent',0,gen_random_uuid(),'No show confirmed by crew');
select pg_temp.ok(pg_temp.row_for(8)->>'status'='absent','no show is an explicit separate status');
select public.set_competition_attendance_password('ATTENDANCE-TEST',current_setting('test.attendance_new_password'));
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.denied($s$select public.get_competition_attendance('ATTENDANCE-TEST',current_setting('test.attendance_password'))$s$,'old reception password cannot read after rotation');
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(2),'arrive',0,current_setting('test.arrival_request')::uuid,null,current_setting('test.attendance_password'))$s$,'old password cannot replay an earlier successful request after rotation');
select pg_temp.ok(pg_temp.row_for(2,current_setting('test.attendance_new_password'))->>'status'='arrived','new reception password reads existing arrivals');
select pg_temp.ok(position('checked_in_at' in public.get_competition_live('ATTENDANCE-TEST')::text)=0
  and position('password_hash' in public.get_competition_live('ATTENDANCE-TEST')::text)=0
  and position('actor_id' in public.get_competition_live('ATTENDANCE-TEST')::text)=0,'public TV omits reception provenance and access credentials');
reset role;

-- Missing five-route setup and final publication block late registration independently.
update public.semifinal_eligibility set class_label='Unconfigured' where profile_id=pg_temp.person(11) and season_year='ATTENDANCE-TEST';
set local role anon;
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(11),'late-register',0,gen_random_uuid(),null,current_setting('test.attendance_new_password'))$s$,'late registration requires five assigned routes');
reset role;
insert into public.competition_final_classes(event_id,league,class_label,phase)
  select id,'lead','Youth','published' from public.competition_day_events where season_year='ATTENDANCE-TEST';
set local role anon;
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(9),'late-register',0,gen_random_uuid(),null,current_setting('test.attendance_new_password'))$s$,'published final field blocks late registration');
reset role;
delete from public.competition_final_classes where event_id=(select id from public.competition_day_events where season_year='ATTENDANCE-TEST');
update public.competition_day_events set submission_deadline_at=clock_timestamp()-interval '1 minute' where season_year='ATTENDANCE-TEST';
set local role anon;
select pg_temp.denied($s$select public.set_competition_attendance('ATTENDANCE-TEST',pg_temp.person(10),'late-register',0,gen_random_uuid(),null,current_setting('test.attendance_new_password'))$s$,'server deadline blocks late registration');
reset role;
select set_config('request.jwt.claim.sub',pg_temp.person(1)::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(1),'role','authenticated')::text,true);
set local role authenticated;
select public.enter_competition_semifinal_result('ATTENDANCE-TEST',pg_temp.person(8),current_setting('test.route')::uuid,4,'Paper result after deadline');
reset role;
select pg_temp.ok((select count(*)=1 from public.competition_day_results where profile_id=pg_temp.person(8)),'reasoned admin aftercare remains possible without arrival and after deadline');
select pg_temp.ok((select status='eligible' from public.semifinal_eligibility where profile_id=pg_temp.person(4) and season_year='ATTENDANCE-TEST')
  and (select participation_activated_at is null from public.profiles where id=pg_temp.person(4)),'late registration never activates an inactive account');
select pg_temp.ok((select count(*)=0 from public.finale_registrations where season_year='ATTENDANCE-TEST' and profile_id in (pg_temp.person(4),pg_temp.person(5),pg_temp.person(6),pg_temp.person(9),pg_temp.person(10),pg_temp.person(11))),
  'denied late registrations leave no registration rows behind');

-- Explicit no-show must unblock the final without fabricating five zero results.
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_enabled,finale_registration_deadline,finale_date)
  values('ATTENDANCE-FINAL','2026-01-01','2026-01-02',false,'2026-01-03','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
  select 'ATTENDANCE-FINAL',pg_temp.person(n),'eligible','lead','Final fixture' from (values(2),(8)) p(n);
insert into public.finale_registrations(profile_id,season_year,registration_status)
  select pg_temp.person(n),'ATTENDANCE-FINAL','registered' from (values(2),(8)) p(n);
set local role authenticated;
select public.save_competition_config('ATTENDANCE-FINAL',jsonb_build_object(
  'routes',(select jsonb_agg(jsonb_build_object('number',n,'name','Fixture '||n,'grade','6a','color','blue') order by n) from generate_series(1,5) n),
  'assignments',jsonb_build_array(jsonb_build_object('league','lead','class_label','Final fixture','route_numbers',jsonb_build_array(1,2,3,4,5))),
  'zone_points',jsonb_build_array(0,10,20,30,40,50,60,70,80,90,100),'flash_bonus',0));
select public.set_competition_phase('ATTENDANCE-FINAL','open');
select public.set_competition_attendance('ATTENDANCE-FINAL',pg_temp.person(2),'arrive',0,gen_random_uuid());
select public.set_competition_phase('ATTENDANCE-FINAL','closed');
select public.set_competition_final_route('ATTENDANCE-FINAL',1,'Final fixture route',30);
reset role;
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
  select ev.id,r.id,pg_temp.person(2),5,false,50 from public.competition_day_events ev
    join public.competition_day_routes r on r.event_id=ev.id where ev.season_year='ATTENDANCE-FINAL';
set local role authenticated;
select pg_temp.denied($s$select public.publish_competition_final_class('ATTENDANCE-FINAL','lead','Final fixture',(public.get_competition_final_admin('ATTENDANCE-FINAL')->'routes'->0->>'id')::uuid,1::smallint,0)$s$,
  'unresolved absent participant still blocks final','Halbfinalergebnisse fehlen');
select public.set_competition_attendance('ATTENDANCE-FINAL',pg_temp.person(8),'absent',0,gen_random_uuid(),'Crew confirmed no-show');
select public.publish_competition_final_class('ATTENDANCE-FINAL','lead','Final fixture',(public.get_competition_final_admin('ATTENDANCE-FINAL')->'routes'->0->>'id')::uuid,1::smallint,0);
reset role;
select pg_temp.ok((select count(*)=1 from public.competition_final_entries en join public.competition_final_classes c on c.id=en.class_id join public.competition_day_events e on e.id=c.event_id where e.season_year='ATTENDANCE-FINAL'),
  'explicit no-show permits final publication for available starter only');
select pg_temp.ok((select count(*)=0 from public.competition_day_results r join public.competition_day_events e on e.id=r.event_id where e.season_year='ATTENDANCE-FINAL' and r.profile_id=pg_temp.person(8)),
  'absence does not create invented zero scores');

-- App/TV exclude only an explicitly confirmed DNS. Real zeros and expected
-- registrants remain, and withdrawal must not erase earned semifinal results.
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
  select ev.id,r.id,pg_temp.person(3),1,false,10 from public.competition_day_events ev
    join public.competition_day_routes r on r.event_id=ev.id
    where ev.season_year='ATTENDANCE-TEST' and r.route_number=1;
insert into public.competition_final_exclusions(event_id,profile_id,status,reason,actor_id)
  select id,pg_temp.person(3),'withdrawn','Withdrew after a valid semifinal result',pg_temp.person(1)
    from public.competition_day_events where season_year='ATTENDANCE-TEST';
set local role authenticated;
select pg_temp.ok(not exists(select 1 from jsonb_array_elements(public.list_competition_standings('ATTENDANCE-TEST')) r
  where r->>'profile_id'=pg_temp.person(8)::text),'App ranking excludes explicit DNS rather than assigning a regular zero rank');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(public.list_competition_standings('ATTENDANCE-TEST')) r
  where r->>'profile_id'=pg_temp.person(2)::text and (r->>'points')::numeric=0 and (r->>'completed_routes')::integer=1),
  'App keeps a genuinely completed zero result');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(public.list_competition_standings('ATTENDANCE-TEST')) r
  where r->>'profile_id'=pg_temp.person(7)::text and (r->>'completed_routes')::integer=0),'App keeps an unresolved expected registrant');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(public.list_competition_standings('ATTENDANCE-TEST')) r
  where r->>'profile_id'=pg_temp.person(3)::text and (r->>'points')::numeric=10),'withdrawal retains earned semifinal sporting result');
select pg_temp.ok(
  (select jsonb_agg(jsonb_build_array(r->>'name',r->>'league',r->>'class_label',r->'rank',r->'points',r->'completed_routes') order by r->>'name')
    from jsonb_array_elements(public.list_competition_standings('ATTENDANCE-TEST')) r)
  =
  (select jsonb_agg(jsonb_build_array(r->>'name',c->>'league',c->>'class_label',r->'rank',r->'points',r->'completed') order by r->>'name')
    from jsonb_array_elements(public.get_competition_live('ATTENDANCE-TEST')->'classes') c cross join lateral jsonb_array_elements(c->'entries') r),
  'App and TV use the same eligible semifinal set, ranks, points and route counts');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.ok(not exists(select 1 from jsonb_array_elements(public.get_competition_live('ATTENDANCE-TEST')->'classes') c
  cross join lateral jsonb_array_elements(c->'entries') r where r->>'name'='Attendance Person 8'),'anonymous TV excludes explicit no-show');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(public.get_competition_live('ATTENDANCE-TEST')->'classes') c
  cross join lateral jsonb_array_elements(c->'entries') r where r->>'name'='Attendance Person 2' and r->'completed'='1'::jsonb
  and r->'points'='0'::jsonb),'anonymous TV retains genuine zero score');
reset role;
rollback;
