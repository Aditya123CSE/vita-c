alter table public.appointments replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception
  when duplicate_object then null;
end $$;
