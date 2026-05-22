create table if not exists public.plan_quotas (
    plan_type text primary key,
    daily_task_limit int not null,
    details jsonb default null
);

create table if not exists public.frames (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    asset_url text not null,
    silver_price int DEFAULT null,
    gold_price int DEFAULT null,
    is_purchasable boolean default true,
    unlock_condition jsonb default null,
    details jsonb default null,
    created_at timestamptz default now()
);

-- TODO: Check performance when backend have to query for item details for inven and shop -> rpc
create table if not exists public.items (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    type varchar(50) not null check (type in ('flower', 'structure', 'decoration', 'path')),
    rarity varchar(50) not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'eternal')),
    asset_key varchar(255) not null unique,
    height int default 1 check (height > 0),
    width int default 1 check (width > 0),
    silver_price int DEFAULT NULL CHECK (silver_price > 0),
    gold_price int DEFAULT NULL CHECK (gold_price > 0),
    buyback_silver int DEFAULT NULL CHECK (buyback_silver > 0),
    buyback_gold int DEFAULT NULL CHECK (buyback_gold > 0),
    is_purchasable boolean default true, -- for app shop selling
    can_wilt boolean default false,
    unlock_condition jsonb default null,
    details jsonb default null,
    created_at timestamptz default now()
);

create unique index if not exists items_asset_key_idx on public.items(asset_key);

create table if not exists public.gardens (
    id uuid primary key default gen_random_uuid(),
    garden_index int not null,
    grid_size int not null default 5 check (grid_size > 0), -- always square, NOTE: Only base size no update
    is_expandable boolean not null default false, -- if false, the map cannot be expanded
    unlock_condition jsonb default null,
    details jsonb default null,
    created_at timestamptz default now()
);

-- TODO/IMPORTANT: Add Seed data for frames, items, gardens app
insert into public.plan_quotas (plan_type, daily_task_limit)
values 
    ('free', 3),
    ('pro', 10),
    ('premium', 16)
on conflict (plan_type) do update set daily_task_limit = excluded.daily_task_limit;

insert into public.gardens (id, garden_index, grid_size, is_expandable)
values
    ('00000000-0000-0000-0000-000000000001', 1, 5, false),
    ('00000000-0000-0000-0000-000000000002', 2, 7, false),
    ('00000000-0000-0000-0000-000000000003', 3, 9, false),
    ('00000000-0000-0000-0000-000000000004', 4, 11, false),
    ('00000000-0000-0000-0000-000000000005', 5, 15, false),
    ('00000000-0000-0000-0000-000000000006', 6, 20, false),
    ('00000000-0000-0000-0000-000000000007', 7, 25, true)
on conflict do nothing;