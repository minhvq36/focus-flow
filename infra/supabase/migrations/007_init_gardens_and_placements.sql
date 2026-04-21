create table if not exists public.gardens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    garden_index int not null check (garden_index between 1 and 20),
    grid_size int not null default 5 check (grid_size > 0), -- always square
    expansion_level int default 0 check (expansion_level >= 0), -- apply for garden level 20
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, garden_index)
);

-- NOTE: Collab with backend for control overlap placement. Too complex to enforce purely at DB level
create table if not exists public.garden_placements (
    id uuid primary key default gen_random_uuid(),
    garden_id uuid not null references public.gardens(id) on delete cascade,
    inventory_id uuid not null unique references public.inventory(id) on delete cascade, -- inventory global unique constraint to prevent double placement
    grid_x int not null check (grid_x >= 0),
    grid_y int not null check (grid_y >= 0),
    rotation smallint NOT NULL DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)),
    health_status varchar(50) default 'healthy' check (health_status in ('healthy', 'wilted')),
    wilted_at timestamptz default null,
    placed_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (garden_id, grid_x, grid_y)
);

create or replace function fn_sync_inventory_placement()
returns trigger language plpgsql as $$
begin
    if (TG_OP = 'INSERT') then
        update public.inventory set is_placed = true where id = new.inventory_id;
    elsif (TG_OP = 'DELETE') then
        update public.inventory set is_placed = false where id = old.inventory_id;
    elsif (TG_OP = 'UPDATE') then
        if (new.inventory_id <> old.inventory_id) then
            update public.inventory set is_placed = true where id = new.inventory_id;
            update public.inventory set is_placed = false where id = old.inventory_id;
        end if;
    
    end if;
    return null;
end;
$$;

create trigger trg_after_garden_placement_change
    after insert or update or delete on public.garden_placements
    for each row execute procedure fn_sync_inventory_placement();

create trigger trg_update_gardens_modtime
    before update on public.gardens
    for each row
    execute procedure fn_set_updated_at();

create trigger trg_update_garden_placements_modtime
    before update on public.garden_placements
    for each row
    execute procedure fn_set_updated_at();