begin;
-- Trigger functions are never meant to be called by API roles; EXECUTE is only checked when a trigger is created.
revoke all on function public.enforce_subject_limit() from public,anon,authenticated;
-- piano_piano_progress is used through RLS-protected select/insert/update only. TRUNCATE ignores RLS,
-- TRIGGER and REFERENCES are never needed by an API role.
revoke truncate,trigger,references on public.piano_piano_progress from public,anon,authenticated;
commit;
