
create table if not exists public.frames (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    asset_url text not null,
    silver_price int DEFAULT null,
    gold_price int DEFAULT null,
    created_at timestamptz default now()
);

create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name varchar(255) not null check (char_length(display_name) >= 2),
    bio varchar(255),
    avatar_url text,
    active_frame_id uuid references public.frames(id) on delete set null default null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.user_frames (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    frame_id uuid not null references public.frames(id) on delete restrict,
    acquired_at timestamptz default now(),
    unique(user_id, frame_id)
);

create table if not exists public.user_private (
    user_id uuid primary key references public.users(id) on delete cascade,
    email varchar(255) unique not null,
    plan_type text default 'free' references public.plan_quotas(plan_type),
    updated_at timestamptz not null default now()
);

create table if not exists public.user_wallets (
    user_id uuid primary key references public.users(id) on delete cascade,
    silver_balance bigint not null default 0 check (silver_balance >= 0),
    gold_balance int not null default 0 check (gold_balance >= 0),
    updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
    insert into public.users (id, display_name)
    values (new.id, split_part(new.email, '@', 1))
    on conflict (id) do nothing;

    insert into public.user_private (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;

    insert into public.user_wallets (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.gardens (user_id, garden_index)
    values (new.id, 1)
    on conflict (user_id, garden_index) do nothing;

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


