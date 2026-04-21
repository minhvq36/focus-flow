-- TODO: Check performance when backend have to query for item details for inven and shop -> rpc
create table if not exists public.items (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    type varchar(50) not null check (type in ('flower', 'structure', 'decoration', 'path')),
    rarity varchar(50) not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    asset_key varchar(255) not null,
    height int default 1 check (height > 0),
    width int default 1 check (width > 0),
    silver_price int DEFAULT NULL CHECK (silver_price > 0),
    gold_price int DEFAULT NULL CHECK (gold_price > 0),
    buyback_silver int DEFAULT NULL CHECK (buyback_silver > 0),
    buyback_gold int DEFAULT NULL CHECK (buyback_gold > 0),
    is_purchasable boolean default true,
    can_wilt boolean default false,
    created_at timestamptz default now()
);

create table if not exists public.inventory (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    item_id uuid not null references public.items(id) on delete restrict,
    is_placed boolean default false, -- Optimization to filter available items in UI
    acquired_at timestamptz default now()
);