create or replace function fn_set_updated_at()
returns trigger
security definer
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;