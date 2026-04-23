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
    for update to authenticated using ( (select auth.uid()) = id )
    with check ( (select auth.uid()) = id ); -- TODO: Check if need to restrict fields that can be updated by user (avatar, created_at)

alter table public.user_frames enable row level security;
create policy "allow_read_for_owner" on public.user_frames
    for select to authenticated 
    using ( (select auth.uid()) = user_id );

alter table public.user_private enable row level security;
create policy "allow_read_for_owner" on public.user_private
    for select to authenticated 
    using ( (select auth.uid()) = user_id );

alter table public.user_wallets enable row level security;
create policy "allow_read_for_owner" on public.user_wallets
    for select to authenticated 
    using ( (select auth.uid()) = user_id );

alter table public.tasks enable row level security;
create policy "allow_read_for_owner" on public.tasks
    for select to authenticated 
    using ( (select auth.uid()) = user_id );
create policy "allow_insert_for_owner" on public.tasks
    for insert to authenticated 
    with check ( (select auth.uid()) = user_id ); -- ATTACH: insert with sanitizer
create policy "allow_update_for_owner" on public.tasks
    for update to authenticated 
    using (
        (select auth.uid()) = user_id
        and deleted_at is null
        )
    with check (
        (select auth.uid()) = user_id
        and deleted_at is null
        ); -- ATTACH: update with protected trigger

alter table public.task_notes enable row level security;
create policy "allow_read_for_owner" on public.task_notes
    for select to authenticated 
    using (
        exists (
            select 1 from public.tasks t
            where t.id = task_id
             and t.deleted_at is null
             and user_id = (select auth.uid())
        )
    );
create policy "allow_insert_for_owner" on public.task_notes
    for insert to authenticated
    with check (
        exists (
            select 1 from public.tasks t
            where t.id = task_id
             and t.deleted_at is null
             and user_id = (select auth.uid())
        )
    );
create policy "allow_update_for_owner" on public.task_notes
    for update to authenticated
    using (
        exists (
            select 1 from public.tasks t
            where t.id = task_id
             and t.deleted_at is null
             and user_id = (select auth.uid())
        )
    )
    with check (
        exists (
            select 1 from public.tasks t
            where t.id = task_id
             and t.deleted_at is null
             and user_id = (select auth.uid())
        )
    );
create policy "allow_delete_for_owner" on public.task_notes
    for delete to authenticated
    using (
        exists (
            select 1 from public.tasks t
            where t.id = task_id
             and t.deleted_at is null
             and user_id = (select auth.uid())
        )
    );

alter table public.task_daily_quotas enable row level security;
create policy "allow_read_for_owner" on public.task_daily_quotas
    for select to authenticated
    using ( (select auth.uid()) = user_id );

alter table public.inventory enable row level security;
create policy "allow_read_for_owner" on public.inventory
    for select to authenticated
    using ( (select auth.uid()) = user_id );

alter table public.user_gardens enable row level security;
create policy "allow_public_gardens_view" on public.user_gardens
    for select to authenticated
    using ( true );

alter table public.garden_placements enable row level security;
create policy "allow_public_garden_placements_view" on public.garden_placements
    for select to authenticated
    using ( true );
create policy "allow_insert_garden_placements_for_owner" on public.garden_placements
    for insert to authenticated
    with check (
        exists (
            select 1 from public.user_gardens ug
            where ug.id = user_garden_id
             and ug.user_id = (select auth.uid())
        )
    );
create policy "allow_update_garden_placements_for_owner" on public.garden_placements
    for update to authenticated
    using (
        exists (
            select 1 from public.user_gardens ug
            where ug.id = user_garden_id
             and ug.user_id = (select auth.uid())
        )
    )
    with check (
        exists (
            select 1 from public.user_gardens ug
            where ug.id = user_garden_id
             and ug.user_id = (select auth.uid())
        )
    );
create policy "allow_delete_garden_placements_for_owner" on public.garden_placements
    for delete to authenticated
    using (
        exists (
            select 1 from public.user_gardens ug
            where ug.id = user_garden_id
             and ug.user_id = (select auth.uid())
        )
    );

alter table public.reward_rolls enable row level security;
create policy "allow_read_for_owner" on public.reward_rolls
    for select to authenticated
    using ( (select auth.uid()) = user_id );
