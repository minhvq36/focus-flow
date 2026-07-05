create table if not exists public.user_gardens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    garden_id uuid not null references public.gardens(id) on delete cascade,
    expansion_level int not null default 0 check (expansion_level >= 0 and expansion_level <= 5), -- tracks how many times user has expanded this garden, validate logic in backend
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    last_watered_at timestamptz default null,
    auto_water_until timestamptz default null,
    unique (user_id, garden_id)
);

-- Index for foreign key: garden_id
create index if not exists idx_user_gardens_garden_id on public.user_gardens(garden_id);

-- NOTE: Collab with backend for control overlap placement. Too complex to enforce purely at DB level
create table if not exists public.garden_placements (
    id uuid primary key default gen_random_uuid(),
    user_garden_id uuid not null references public.user_gardens(id) on delete cascade,
    inventory_id uuid not null unique references public.inventory(id) on delete cascade, -- inventory global unique constraint to prevent double placement
    grid_x int not null check (grid_x >= 0),
    grid_y int not null check (grid_y >= 0),
    effective_width int not null default 1 check (effective_width > 0),
    effective_height int not null default 1 check (effective_height > 0),
    rotation smallint NOT NULL DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)),
    health_status varchar(50) default 'healthy' check (health_status in ('healthy', 'wilted')),
    wilted_at timestamptz default null,
    placed_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (user_garden_id, grid_x, grid_y)
);

create or replace function fn_reset_inventory_on_placement_delete()
returns trigger language plpgsql as $$
begin
  update public.inventory 
  set status = 'in_bag' 
  where id = old.inventory_id;
  
  return old;
end;
$$;

create trigger trg_reset_inventory_on_placement_delete
after delete on public.garden_placements
for each row execute function fn_reset_inventory_on_placement_delete();

create trigger trg_update_user_gardens_modtime
    before update on public.user_gardens
    for each row
    execute procedure fn_set_updated_at();

create trigger trg_update_garden_placements_modtime
    before update on public.garden_placements
    for each row
    execute procedure fn_set_updated_at();