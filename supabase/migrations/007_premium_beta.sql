begin;
-- Premium beta for every authenticated Studeo account, including future signups.
-- Keep accounting, authentication and row isolation; remove product daily caps.
create or replace function public.student_claim_ai() returns void language plpgsql security definer set search_path='' as $$
declare d date := (now() at time zone 'UTC')::date;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.student_ai_usage(user_id,day,attempts) values(auth.uid(),d,1)
 on conflict(user_id,day) do update set attempts=public.student_ai_usage.attempts+1;
end;$$;
revoke all on function public.student_claim_ai() from public,anon;
grant execute on function public.student_claim_ai() to authenticated;
commit;
