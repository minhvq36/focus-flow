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
alter table public.user_frames enable row level security;
alter table public.user_private enable row level security;
alter table public.user_wallets enable row level security;
alter table public.tasks enable row level security;
alter table public.task_notes enable row level security;
alter table public.task_daily_quotas enable row level security;
alter table public.inventory enable row level security;
alter table public.gardens enable row level security;
alter table public.garden_placements enable row level security;
alter table public.reward_rolls enable row level security;
