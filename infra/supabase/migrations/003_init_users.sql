create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name varchar(50) not null check (char_length(trim(display_name)) >= 1),
    bio varchar(255),
    avatar_url text,
    active_frame_id uuid references public.frames(id) on delete set null default null,
    level int not null default 1 CHECK (level > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Index for foreign key: active_frame_id
create index if not exists idx_users_active_frame_id on public.users(active_frame_id);

create table if not exists public.user_frames (
    id uuid primary key default gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    frame_id uuid NOT NULL REFERENCES public.frames(id) ON DELETE RESTRICT,
    acquired_at timestamptz DEFAULT now(),
    UNIQUE(user_id, frame_id)
);

-- Index for foreign key: frame_id
create index if not exists idx_user_frames_frame_id on public.user_frames(frame_id);

create table if not exists public.user_private (
    user_id uuid primary key references public.users(id) on delete cascade,
    email varchar(255) unique not null,
    plan_type text default 'free' references public.plan_quotas(plan_type),
    updated_at timestamptz not null default now()
);

-- Index for foreign key: plan_type
create index if not exists idx_user_private_plan_type on public.user_private(plan_type);

create table if not exists public.user_wallets (
    user_id uuid primary key references public.users(id) on delete cascade,
    silver_balance bigint not null default 0 check (silver_balance >= 0),
    gold_balance int not null default 0 check (gold_balance >= 0),
    total_exp int not null default 0 check (total_exp >= 0),
    updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
    v_starter_garden_id uuid;
begin
    select g.id into v_starter_garden_id
    from public.gardens as g
    where g.id = '00000000-0000-0000-0000-000000000001';

    if v_starter_garden_id is null then
        raise exception 'SYSTEM NOT READY: starter garden is missing'
        using
            errcode = 'Z0001',
            detail = 'Starter garden with id 00000000-0000-0000-0000-000000000001 is not found. User registration blocked.';
    end if;

    insert into public.users (id, display_name)
    values (new.id, split_part(new.email, '@', 1))
    on conflict (id) do nothing;

    insert into public.user_private (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;

    insert into public.user_wallets (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.user_gardens (user_id, garden_id)
    values (new.id, '00000000-0000-0000-0000-000000000001')
    on conflict do nothing;

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create trigger trg_update_users_modtime
    before update on public.users
    for each row
    execute procedure fn_set_updated_at();

create trigger trg_update_user_private_modtime
    before update on public.user_private
    for each row
    execute procedure fn_set_updated_at();

create trigger trg_update_user_wallets_modtime
    before update on public.user_wallets
    for each row
    execute procedure fn_set_updated_at();


