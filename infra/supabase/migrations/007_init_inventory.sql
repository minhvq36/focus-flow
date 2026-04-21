create table if not exists public.inventory (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    item_id uuid not null references public.items(id) on delete restrict,
    is_placed boolean default false, -- Optimization to filter available items in UI
    acquired_at timestamptz default now()
);