-- Synthetic integration checks in an isolated local database, after all migrations.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$
begin if v is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end; $$;
create function pg_temp.denied(command text,expected text) returns void language plpgsql as $$
begin
 begin execute command;
 exception when others then if position(expected in sqlerrm)>0 then raise notice 'PASS: %',expected; return; end if; raise; end;
 raise exception 'FAIL: expected %',expected;
end; $$;
create function pg_temp.actor(n integer) returns void language plpgsql as $$
declare uid text:='99999999-7100-4000-8000-'||lpad(n::text,12,'0');
begin perform set_config('request.jwt.claim.sub',uid,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true); end; $$;

insert into auth.users(id,email) select ('99999999-7100-4000-8000-'||lpad(n::text,12,'0'))::uuid,'cert-'||n||'@test.invalid' from generate_series(1,8) n;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.profiles(id,role,first_name,last_name,participation_activated_at)
 select ('99999999-7100-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 case when n=1 then 'league_admin' else 'participant' end,'Certificate','Person '||n,now() from generate_series(1,8) n;
insert into public.admin_settings(season_year,qualification_start,qualification_end,finale_date)
 values('CERT-TEST','2026-01-01','2026-01-02','2026-01-04');
insert into public.semifinal_eligibility(season_year,profile_id,status,league,class_label)
 select 'CERT-TEST',('99999999-7100-4000-8000-'||lpad(n::text,12,'0'))::uuid,'eligible','lead','U15-w' from generate_series(2,8) n;
insert into public.finale_registrations(profile_id,season_year,registration_status)
 select ('99999999-7100-4000-8000-'||lpad(n::text,12,'0'))::uuid,'CERT-TEST','registered' from generate_series(2,8) n;
insert into public.competition_day_events(season_year,phase) values('CERT-TEST','closed');
insert into public.competition_day_routes(event_id,route_number,name,grade,color)
 select id,1,'Certificate route','6a','blue' from public.competition_day_events where season_year='CERT-TEST';
insert into public.competition_day_results(event_id,route_id,profile_id,zone,flash,points)
 select e.id,r.id,('99999999-7100-4000-8000-'||lpad(n::text,12,'0'))::uuid,5,false,(10-n)*10
 from public.competition_day_events e join public.competition_day_routes r on r.event_id=e.id
 cross join generate_series(2,7) n where e.season_year='CERT-TEST';
insert into public.competition_final_exclusions(event_id,profile_id,status,reason)
 select id,'99999999-7100-4000-8000-000000000007','aw','Synthetic AW test' from public.competition_day_events where season_year='CERT-TEST';

select pg_temp.actor(2);
set local role authenticated;
select pg_temp.ok(public.get_my_certificates('CERT-TEST')->'finale'='null'::jsonb,'closed event alone does not publish');
select pg_temp.denied('select public.publish_finale_certificates(''CERT-TEST'')','LEAGUE_ADMIN_REQUIRED');
select pg_temp.denied('select public.get_certificate_publication(''CERT-TEST'')','LEAGUE_ADMIN_REQUIRED');
select pg_temp.denied('select * from public.finale_certificates','permission denied');
reset role;
set local role anon;
select pg_temp.denied('select public.publish_finale_certificates(''CERT-TEST'')','permission denied');
reset role;
select pg_temp.actor(1);
set local role authenticated;
select pg_temp.denied('select public.publish_finale_certificates(''CERT-TEST'')','FINAL_CLASSES_NOT_RELEASED');
reset role;
insert into public.competition_final_classes(event_id,league,class_label,phase)
 select id,'lead','U15-w','review' from public.competition_day_events where season_year='CERT-TEST';
insert into public.competition_final_entries(class_id,profile_id,semifinal_rank,semifinal_points,start_position,status)
 select c.id,('99999999-7100-4000-8000-'||lpad(n::text,12,'0'))::uuid,n-1,(10-n)*10,n-1,
 case when n=5 then 'dns' else 'ready' end
 from public.competition_final_classes c join public.competition_day_events e on e.id=c.event_id
 cross join generate_series(2,5) n where e.season_year='CERT-TEST';
insert into public.competition_final_attempts(entry_id,request_id,grip,is_top,seconds,reason)
 select en.id,gen_random_uuid(),case when en.semifinal_rank=1 then 10 when en.semifinal_rank=2 then 20 else 19 end,false,60,'Synthetic result'
 from public.competition_final_entries en join public.competition_final_classes c on c.id=en.class_id
 join public.competition_day_events e on e.id=c.event_id where e.season_year='CERT-TEST' and en.status='ready';
set local role authenticated;
select pg_temp.denied('select public.publish_finale_certificates(''CERT-TEST'')','FINAL_CLASSES_NOT_RELEASED');
reset role;
update public.competition_final_classes set phase='final' where event_id=(select id from public.competition_day_events where season_year='CERT-TEST');
set local role authenticated;
select pg_temp.denied('select public.publish_finale_certificates(''CERT-TEST'')','FINAL_RESULTS_NOT_REVIEWED');
reset role;
update public.competition_final_entries set checked_at=statement_timestamp() where class_id in
 (select c.id from public.competition_final_classes c join public.competition_day_events e on e.id=c.event_id where e.season_year='CERT-TEST') and status='ready';
set local role authenticated;
select public.publish_finale_certificates('CERT-TEST');
select pg_temp.ok((public.get_certificate_publication('CERT-TEST')->>'certificate_count')::int=5,'AW and no-result profiles excluded');
select pg_temp.ok(not (public.get_certificate_publication('CERT-TEST')->>'needs_refresh')::boolean,'new snapshot is current');
reset role;
select pg_temp.ok((select rank=3 and scoring_stage='final' from public.finale_certificates where season_year='CERT-TEST' and profile_id='99999999-7100-4000-8000-000000000002'),'semifinal winner gets actual final third place');
select pg_temp.ok((select rank=1 and scoring_stage='final' from public.finale_certificates where season_year='CERT-TEST' and profile_id='99999999-7100-4000-8000-000000000003'),'final winner is not given semifinal second place');
select pg_temp.ok((select rank=5 and scoring_stage='semifinal' from public.finale_certificates where season_year='CERT-TEST' and profile_id='99999999-7100-4000-8000-000000000006'),'non-finalist keeps explicit semifinal certificate');
select pg_temp.ok((select scoring_stage='semifinal' from public.finale_certificates where season_year='CERT-TEST' and profile_id='99999999-7100-4000-8000-000000000005'),'DNS has no invented final place');
select pg_temp.actor(2);
set local role authenticated;
select pg_temp.ok((public.get_my_certificates('CERT-TEST')->'finale'->>'rank')::int=3,'participant reads own final rank');
select pg_temp.ok(public.get_my_certificates('CERT-TEST')->'finale'->>'scoring_stage'='final','reader includes stage');
reset role;
select pg_temp.actor(8);
set local role authenticated;
select pg_temp.ok(public.get_my_certificates('CERT-TEST')->'finale'='null'::jsonb,'another participant cannot read winners certificate');
reset role;
update public.competition_final_classes set phase='review',updated_at=statement_timestamp()
 where event_id=(select id from public.competition_day_events where season_year='CERT-TEST');
select pg_temp.actor(1);
set local role authenticated;
select pg_temp.ok((public.get_certificate_publication('CERT-TEST')->>'needs_refresh')::boolean,'reopening marks publication stale');
select pg_temp.denied('select public.publish_finale_certificates(''CERT-TEST'')','FINAL_CLASSES_NOT_RELEASED');
reset role;
select pg_temp.ok((select rank=3 from public.finale_certificates where season_year='CERT-TEST' and profile_id='99999999-7100-4000-8000-000000000002'),'published snapshot stays unchanged');
update public.competition_final_attempts set grip=30 where entry_id in
 (select en.id from public.competition_final_entries en join public.competition_final_classes c on c.id=en.class_id join public.competition_day_events e on e.id=c.event_id
 where e.season_year='CERT-TEST' and en.profile_id='99999999-7100-4000-8000-000000000002');
update public.competition_final_classes set phase='final',updated_at=statement_timestamp()
 where event_id=(select id from public.competition_day_events where season_year='CERT-TEST');
set local role authenticated;
select public.publish_finale_certificates('CERT-TEST');
select pg_temp.ok((public.get_certificate_publication('CERT-TEST')->>'revision')::int=2,'republication increments revision');
reset role;
select pg_temp.ok((select rank=1 from public.finale_certificates where season_year='CERT-TEST' and profile_id='99999999-7100-4000-8000-000000000002'),'new publication applies corrected final place');
rollback;
