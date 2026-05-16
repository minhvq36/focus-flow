create table if not exists public.inventory (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    item_id uuid not null references public.items(id) on delete restrict,
    status varchar(20) NOT NULL DEFAULT 'in_bag' check (status in ('in_bag', 'placed', 'on_market')),
    acquired_at timestamptz default now()
);

-- Indexes for foreign keys: user_id, item_id
create index if not exists idx_inventory_user_id on public.inventory(user_id);
create index if not exists idx_inventory_item_id on public.inventory(item_id);
create index if not exists idx_inventory_penalty on public.inventory(user_id, status) where status != 'on_market';