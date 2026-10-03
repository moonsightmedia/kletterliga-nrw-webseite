-- Run after the cancellation migration, inside a rollback-only transaction.
-- Only aggregate assertions are returned; no contacts or names are logged.
begin;
set local statement_timeout='30s';
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from public.profiles where role='league_admin' and archived_at is null order by created_at limit 1),'role','authenticated')::text,true);
do $$ declare initial_pool jsonb; first_draw jsonb; second_draw jsonb; before_cancel jsonb;
 request uuid:=gen_random_uuid(); response jsonb; reset_request uuid:=gen_random_uuid(); ids uuid[];
 baseline integer; total integer;
begin
 select count(*) into baseline from public.competition_raffle_draws;
 initial_pool:=public.get_competition_raffle('2026','all',false,true);
 total:=(initial_pool->>'total_tickets')::integer;
 first_draw:=public.draw_competition_raffle('2026','all',false,gen_random_uuid(),'ROLLBACK CANCEL TEST',true);
 second_draw:=public.draw_competition_raffle('2026','all',false,gen_random_uuid(),'ROLLBACK CANCEL TEST',true);
 before_cancel:=public.get_competition_raffle('2026','all',false,true);
 -- A stale reset confirmation must not erase a concurrently-added win.
 begin
   perform public.cancel_competition_raffle_wins('2026',array[(first_draw->>'id')::uuid],true,gen_random_uuid());
   raise exception 'Stale reset incorrectly accepted';
 exception when invalid_parameter_value then
   if sqlerrm<>'RAFFLE_HISTORY_CHANGED' then raise; end if;
 end;
 response:=public.cancel_competition_raffle_wins('2026',array[(first_draw->>'id')::uuid],false,request);
 if response->>'cancelled_count'<>'1' then raise exception 'Single cancellation failed'; end if;
 if public.cancel_competition_raffle_wins('2026',array[(first_draw->>'id')::uuid],false,request)<>response then raise exception 'Cancellation retry not idempotent'; end if;
 if public.cancel_competition_raffle_wins('2026',array[(first_draw->>'id')::uuid],false,gen_random_uuid())->>'cancelled_count'<>'0' then raise exception 'Repeated cancellation returned another ticket'; end if;
 if (public.get_competition_raffle('2026','all',false,true)->>'total_tickets')::integer<>total-1 then raise exception 'Ticket not returned exactly once'; end if;
 if exists(select 1 from jsonb_array_elements(public.export_competition_raffle_winners('2026')) e where e->>'id'=first_draw->>'id') then raise exception 'Cancelled prize remained in export'; end if;
 begin
   perform public.draw_competition_raffle('2026','all',false,(first_draw->>'request_id')::uuid,'ROLLBACK CANCEL TEST',true);
   raise exception 'Old draw replay resurrected win';
 exception when invalid_parameter_value then
   if sqlerrm<>'RAFFLE_DRAW_CANCELLED' then raise; end if;
 end;
 begin
   perform public.cancel_competition_raffle_wins('2026',array[(second_draw->>'id')::uuid],false,request);
   raise exception 'Request conflict accepted';
 exception when invalid_parameter_value then
   if sqlerrm<>'RAFFLE_REQUEST_CONFLICT' then raise; end if;
 end;
 begin
   perform public.cancel_competition_raffle_wins('2026',array[gen_random_uuid()],false,gen_random_uuid());
   raise exception 'Unknown draw accepted';
 exception when invalid_parameter_value then
   if sqlerrm<>'RAFFLE_DRAW_NOT_FOUND' then raise; end if;
 end;
 begin
   update public.competition_raffle_draws set prize='MUTATION' where id=(first_draw->>'id')::uuid;
   raise exception 'Audit mutation allowed';
 exception when insufficient_privilege then null; end;
 select array_agg(id order by id) into ids from public.competition_raffle_active_draws
   where event_id=(initial_pool->>'event_id')::uuid;
 response:=public.cancel_competition_raffle_wins('2026',ids,true,reset_request);
 if (response->>'cancelled_count')::integer<>cardinality(ids) then raise exception 'Full reset mismatch'; end if;
 if public.cancel_competition_raffle_wins('2026',ids,true,reset_request)<>response then raise exception 'Reset retry failed'; end if;
 if jsonb_array_length(public.get_competition_raffle('2026','semifinal',true,true)->'history')<>0
   or jsonb_array_length(public.export_competition_raffle_winners('2026'))<>0 then raise exception 'Reset did not clear history and export'; end if;
 if exists(select 1 from jsonb_array_elements(public.get_competition_raffle('2026','all',false,false)->'entries') e where (e->>'wins')::integer<>0) then raise exception 'Single-win exclusion not restored'; end if;
 if (select count(*) from public.competition_raffle_draws)<>baseline+2 then raise exception 'Draw audit was erased'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from public.profiles where role='participant' and archived_at is null limit 1),'role','authenticated')::text,true);
do $$ begin
 begin
   perform public.cancel_competition_raffle_wins('2026',array[gen_random_uuid()],false,gen_random_uuid());
   raise exception 'Participant could cancel';
 exception when insufficient_privilege then null; end;
end $$;
select jsonb_build_object('single_cancel_and_ticket_restore',true,'reset_all',true,'idempotent',true,'stale_confirmation_denied',true,'old_draw_replay_denied',true,'audit_preserved',true,'participant_denied',true,
 'anon_denied',not has_function_privilege('anon','public.cancel_competition_raffle_wins(text,uuid[],boolean,uuid)','execute'),
 'ledger_private',not has_table_privilege('authenticated','public.competition_raffle_cancellations','select'),
 'view_private',not has_table_privilege('authenticated','public.competition_raffle_active_draws','select'),
 'test_changes_rolled_back',true) verified;
rollback;
