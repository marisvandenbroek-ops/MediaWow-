-- Update 48: shiftleaders mogen ook lijsten aanmaken en aanpassen (net als de directie)
drop policy if exists cl_insert on public.checklists;
create policy cl_insert on public.checklists for insert to authenticated with check (public.is_planner());
drop policy if exists cl_update on public.checklists;
create policy cl_update on public.checklists for update to authenticated using (public.is_planner()) with check (public.is_planner());
