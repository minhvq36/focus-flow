create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 255),
    todos jsonb not null default '[]'::jsonb, 
    penalty_mode boolean not null default false,
    status text not null default 'active' 
        check (status in ('active', 'paused', 'submitted', 'given_up')),
    registered_duration_min int not null check (registered_duration_min > 0),
    started_at timestamptz,
    actual_duration_sec int default 0 check (actual_duration_sec >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    deleted_at timestamptz,
    constraint task_must_have_todos check (jsonb_array_length(todos)>0 and jsonb_array_length(todos)<=50) -- TODO: need valid with backend to handle nested deep structured + valid with frontend for max length of kind of text
);

create index if not exists idx_tasks_user_active 
on public.tasks (user_id) 
where (deleted_at is null and status = 'active');

create trigger trg_update_tasks_modtime
    before update on public.tasks
    for each row
    execute procedure fn_set_updated_at();