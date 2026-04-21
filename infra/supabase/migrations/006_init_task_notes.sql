create table if not exists public.task_notes (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint task_note_must_have_content check (char_length(trim(content))>0 and char_length(content)<=22000)
);

create index if not exists idx_task_notes_task_id on public.task_notes(task_id desc);

create trigger trg_update_task_notes_modtime
    before update on public.task_notes
    for each row
    execute procedure fn_set_updated_at();