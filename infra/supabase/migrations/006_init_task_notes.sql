create table if not exists public.task_notes (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint task_note_must_have_content check (char_length(trim(content))>0 and char_length(content)<=22000)
);

-- Index for foreign keys: task_id, user_id
create index if not exists idx_task_notes_task_id on public.task_notes(task_id, created_at desc); -- for querying notes of a task, order by created_at desc for recent first
create index if not exists idx_task_notes_user_id on public.task_notes(user_id);

create or replace function fn_enforce_task_note_limit()
returns trigger
security definer
set search_path = public
as $$
declare
    v_note_count int;
begin
    perform id from public.tasks
    where id = new.task_id
    and user_id = new.user_id
    for update;

    if not found then
        raise exception 'task_not_owned'
            using detail = 'User does not own this task.';
    end if;

    select count(*) into v_note_count
    from public.task_notes
    where task_id = new.task_id;

    if v_note_count >= 5 then
        raise exception 'note_limit_exceeded'
            using detail = 'Each task can only have a maximum of 5 notes.';
    end if;

    return new;
end;
$$ language plpgsql;

create trigger trg_task_notes_limit
    before insert on public.task_notes
    for each row
    execute procedure fn_enforce_task_note_limit();

create trigger trg_update_task_notes_modtime
    before update on public.task_notes
    for each row
    execute procedure fn_set_updated_at();