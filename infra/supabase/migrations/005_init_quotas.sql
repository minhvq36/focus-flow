create table if not exists public.task_daily_quotas (
    user_id uuid not null references public.users(id) on delete cascade,
    target_date date not null default current_date,
    usage_count int default 0 check (usage_count >= 0),
    primary key (user_id, target_date)
);

create or replace function fn_enforce_task_quota()
returns trigger
security definer
set search_path = public
as $$
declare
    v_daily_limit int;
begin
    select q.daily_task_limit into v_daily_limit
    from public.user_private up
    join public.plan_quotas q on up.plan_type = q.plan_type
    where up.user_id = new.user_id;

    v_daily_limit := coalesce(v_daily_limit, 3);

    insert into public.task_daily_quotas (user_id, target_date, usage_count)
    values (new.user_id, current_date, 1)
    on conflict (user_id, target_date) 
    do update set usage_count = task_daily_quotas.usage_count + 1
    where task_daily_quotas.usage_count < v_daily_limit;

    if not found then
        raise exception 'quota_exceeded' 
            using detail = 'User has exceeded the daily task limit (' || v_daily_limit || ' task/day).';
    end if;

    return new;
end;
$$ language plpgsql;

create trigger trg_pre_insert_task_quota
    before insert on public.tasks
    for each row
    execute procedure fn_enforce_task_quota();