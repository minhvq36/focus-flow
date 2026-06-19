create table if not exists public.economy_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    
    silver_change int not null default 0,
    gold_change int not null default 0,
    
    action_type varchar(50) not null check (action_type in (
        'task_reward',       -- Nhận từ task
        'shop_buy',          -- Mua đồ hệ thống
        'shop_sell',         -- Bán đồ cho hệ thống
        'market_buy',        -- Mua P2P
        'market_sell',       -- Bán P2P
        'market_fee',        -- Phí sàn P2P
        'iap_purchase',      -- Nạp tiền thật
        'gold_to_silver'     -- Đổi Vàng sang Bạc
    )),
    
    reference_id uuid,
    description text,
    created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_eco_trans_user ON public.economy_transactions(user_id, created_at desc);