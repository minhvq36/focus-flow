alter table public.plan_quotas enable row level security;
create policy "allow_read_for_all_auth_users" on public.plan_quotas
    for select to authenticated using (true);

alter table public.frames enable row level security;
create policy "allow_read_for_all_auth_users" on public.frames
    for select to authenticated using (true);

alter table public.items enable row level security;
create policy "allow_read_for_all_auth_users" on public.items
    for select to authenticated using (true);

alter table public.gardens enable row level security;
create policy "allow_read_for_all_auth_users" on public.gardens
    for select to authenticated using (true);

alter table public.users enable row level security;
create policy "allow_read_for_all_auth_users" on public.users
    for select to authenticated using (true);
create policy "allow_update_for_owner" on public.users
    for update to authenticated using ( auth.uid() = id )
    with check ( auth.uid() = id );

alter table public.user_frames enable row level security;
create policy "allow_read_for_owner" on public.user_frames
    for select to authenticated 
    using ( auth.uid() = user_id );

alter table public.user_private enable row level security;
create policy "allow_read_for_owner" on public.user_private
    for select to authenticated 
    using ( auth.uid() = user_id );

alter table public.user_wallets enable row level security;
create policy "allow_read_for_owner" on public.user_wallets
    for select to authenticated 
    using ( auth.uid() = user_id );

alter table public.tasks enable row level security;
create policy "allow_read_for_owner" on public.tasks
    for select to authenticated 
    using ( auth.uid() = user_id );
create policy "allow_insert_for_owner" on public.tasks
    for insert to authenticated 
    with check ( auth.uid() = user_id );
create policy "allow_update_for_owner" on public.tasks
    for update to authenticated 
    using ( auth.uid() = user_id )
    with check ( auth.uid() = user_id );

alter table public.task_notes enable row level security;
alter table public.task_daily_quotas enable row level security;
alter table public.inventory enable row level security;
alter table public.user_gardens enable row level security;
alter table public.garden_placements enable row level security;
alter table public.reward_rolls enable row level security;
