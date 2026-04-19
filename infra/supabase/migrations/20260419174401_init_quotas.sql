create table if not exists public.plan_quotas (
    plan_type text primary key,
    daily_task_limit int not null
);

insert into public.plan_quotas (plan_type, daily_task_limit)
values 
    ('free', 3),
    ('pro', 10),
    ('premium', 16)
on conflict (plan_type) do update set daily_task_limit = excluded.daily_task_limit;

create table if not exists public.task_daily_quotas (
    user_id uuid not null references public.users(id) on delete cascade,
    target_date date not null default current_date,
    usage_count int default 0 check (usage_count >= 0),
    primary key (user_id, target_date)
);

create or replace function fn_enforce_task_quota()
returns trigger as $$
declare
    v_daily_limit int;
begin
    select q.daily_task_limit into v_daily_limit
    from public.users u
    join public.plan_quotas q on u.plan_type = q.plan_type
    where u.id = new.user_id;

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

/* trigger: giữ nguyên */
create trigger trg_pre_insert_task_quota
    before insert on public.tasks
    for each row
    execute procedure fn_enforce_task_quota();