create table if not exists public.reward_rolls (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    roll_type varchar(20) not null default 'reward' check (roll_type in ('reward', 'penalty')),
    item_id uuid references public.items(id),
    silver_amount int default 0, -- âm nếu penalty trừ bạc sau này
    seed text,
    created_at timestamptz default now(),
    constraint unique_task_reward_per_user unique (task_id)
);

-- Indexes for foreign keys: task_id, user_id, item_id
create index if not exists idx_reward_rolls_task_id on public.reward_rolls(task_id);
create index if not exists idx_reward_rolls_user_id on public.reward_rolls(user_id);
create index if not exists idx_reward_rolls_item_id on public.reward_rolls(item_id);