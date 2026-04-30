create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 255),
    todos jsonb not null default '[]'::jsonb, 
    penalty_mode boolean not null default false,
    status text not null default 'active' 
        check (status in ('active', 'paused', 'submitted', 'given_up')),
    registered_duration_min int not null check (registered_duration_min >= 25),
    started_at timestamptz,
    actual_duration_sec int default 0 check (actual_duration_sec >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    deleted_at timestamptz,
    constraint task_must_have_todos check (jsonb_array_length(todos)>0 and jsonb_array_length(todos)<=50) -- DONE: need valid with backend to handle nested deep structured + valid with frontend for max length of kind of text
);

create index if not exists idx_tasks_user_id on public.tasks(user_id);

create trigger trg_update_tasks_modtime
    before update on public.tasks
    for each row
    execute procedure fn_set_updated_at();


-- TODO: hard test
create or replace function tasks_insert_sanitize()
returns trigger
set search_path = public
as $$
begin
    -- Force initial state
    new.status := 'active';
    new.actual_duration_sec := 0;
    new.started_at := now();
    new.completed_at := null;
    new.deleted_at := null;

    -- Ensure timestamps
    new.created_at := now();

    return new;
end;
$$ language plpgsql;

create trigger trg_tasks_insert_sanitize
    before insert on public.tasks
    for each row
    execute procedure tasks_insert_sanitize();

create or replace function public.fn_tasks_protect_system_fields()
returns trigger
set search_path = public
as $$
begin
    -- Allow backend (service role) to bypass all checks
    if pg_has_role(current_user, 'postgres', 'member')
        or auth.role() = 'service_role' then
        return new;
    end if;

    -- Prevent changing immutable fields
    if new.created_at is distinct from old.created_at then
        raise exception 'Cannot modify created_at'
        using
            errcode = 'DB002',
            detail = format('Immutable field created_at cannot be modified. Old: %s, Attempted: %s', old.created_at, new.created_at);
    end if;

    -- Prevent modifying system-managed fields
    if (
        new.penalty_mode is distinct from old.penalty_mode or
        new.status is distinct from old.status or
        new.started_at is distinct from old.started_at or
        new.actual_duration_sec is distinct from old.actual_duration_sec or
        new.completed_at is distinct from old.completed_at or
        new.deleted_at is distinct from old.deleted_at
    ) then
        raise exception 'System-managed fields cannot be modified directly'
        using
            errcode = 'DB003',
            detail = 'Only backend service role can modify system-managed fields (penalty_mode, status, started_at, actual_duration_sec, completed_at, deleted_at)';
    end if;

    return new;
end;
$$ language plpgsql;

create trigger trg_tasks_protect_system_fields
before update on public.tasks
for each row
execute function public.fn_tasks_protect_system_fields();

