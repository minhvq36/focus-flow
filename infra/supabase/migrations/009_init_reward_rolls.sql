create table if not exists public.reward_rolls (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    item_id uuid references public.items(id),
    silver_amount int default 0,
    seed text, -- tracing from backend task_id + user_id + timestamp for audit and anticheating
    created_at timestamptz default now()
);

-- Indexes for foreign keys: task_id, user_id, item_id
create index if not exists idx_reward_rolls_task_id on public.reward_rolls(task_id);
create index if not exists idx_reward_rolls_user_id on public.reward_rolls(user_id);
create index if not exists idx_reward_rolls_item_id on public.reward_rolls(item_id);

create or replace function fn_submit_task_reward(
    p_task_id uuid,
    p_user_id uuid,
    p_item_id uuid,
    p_silver_amount int,
    p_seed text
) returns void
security definer
set search_path = public
as $$
begin
    update public.user_wallets
    set silver_balance = silver_balance + p_silver_amount
    where user_id = p_user_id;

    if not found then
        raise exception 'wallet not found for user %', p_user_id;
    end if;

    if p_item_id is not null then
        insert into public.inventory (user_id, item_id, is_placed)
        values (p_user_id, p_item_id, false);
    end if;

    insert into public.reward_rolls (task_id, user_id, item_id, silver_amount, seed)
    values (p_task_id, p_user_id, p_item_id, p_silver_amount, p_seed);

    update public.tasks as t
    set status = 'submitted', 
        completed_at = now()
    where t.id = p_task_id and status != 'submitted';

    if not found then
        raise exception 'task % already submitted or not found', p_task_id;
    end if;
end;
$$ language plpgsql;