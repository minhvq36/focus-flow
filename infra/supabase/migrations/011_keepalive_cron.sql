-- =========================================================
-- 011: Keep-alive bằng Supabase Cron (pg_cron) — chống project bị PAUSE
-- =========================================================
-- Vấn đề: project Supabase gói Free bị tạm dừng khi ~7 ngày không có tín
--   hiệu hoạt động. Giai đoạn sandbox có thể nhiều ngày không ai đụng vào
--   -> DB bị pause, phải vào Dashboard restore thủ công.
-- Giải pháp: job pg_cron chạy NGAY TRONG DB (không phụ thuộc backend Go
--   có đang bật hay không), 6 ngày/lần ping 1 phát.
-- Vì sao ghi 1 dòng thay vì `select 1` cho "empty" tuyệt đối:
--   `select 1` là read-only và KHÔNG để lại dấu vết -> không kiểm chứng
--   được job có thực sự chạy hay không. Bảng heartbeat dưới đây luôn chỉ
--   có ĐÚNG 1 dòng (upsert tại chỗ, không phình data) nhưng có timestamp
--   + counter để soi lại, và tạo write thật (WAL) thay vì query rỗng.

create extension if not exists pg_cron;

-- ---------------------------------------------------------
-- Bảng heartbeat: 1 dòng duy nhất (CHECK id = 1)
-- ---------------------------------------------------------
create table if not exists public.system_heartbeat (
    id           smallint primary key default 1 check (id = 1),
    last_ping_at timestamptz not null default now(),
    ping_count   bigint      not null default 0
);

comment on table public.system_heartbeat is
    'Bảng 1 dòng cho job keep-alive (011). Không phải dữ liệu nghiệp vụ — chỉ để chứng minh cron còn sống.';

insert into public.system_heartbeat (id) values (1) on conflict (id) do nothing;

-- Backend-only: bật RLS và KHÔNG tạo policy nào -> anon/authenticated bị
-- chặn hoàn toàn qua PostgREST (cùng nguyên tắc với các bảng hệ thống khác).
alter table public.system_heartbeat enable row level security;

-- ---------------------------------------------------------
-- Hàm ping
-- ---------------------------------------------------------
create or replace function public.fn_keepalive_ping()
returns void
security definer
set search_path = public
as $$
    update public.system_heartbeat
       set last_ping_at = now(),
           ping_count   = ping_count + 1
     where id = 1;
$$ language sql;

revoke all on function public.fn_keepalive_ping() from public;

-- ---------------------------------------------------------
-- Lịch chạy: 03:17 UTC (10:17 giờ VN) các ngày 1,7,13,19,25,31
-- -> khoảng cách LỚN NHẤT giữa 2 lần chạy là 6 ngày (< ngưỡng 7 ngày).
--    pg_cron dùng giờ UTC.
-- ---------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'keepalive-heartbeat';

select cron.schedule(
    'keepalive-heartbeat',
    '17 3 */6 * *',
    $job$ select public.fn_keepalive_ping(); $job$
);

-- Kiểm tra sau khi chạy migration:
--   select jobid, jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select * from public.system_heartbeat;
--
-- LƯU Ý (nếu vẫn bị pause): cách tính "hoạt động" của Supabase thiên về
-- REQUEST đi vào project (API/Auth/DB connection từ ngoài), truy vấn nội
-- bộ của pg_cron có thể KHÔNG được tính. Khi đó đổi lệnh của job sang gọi
-- HTTP vào chính REST endpoint của project bằng pg_net (bật extension
-- pg_net trước, thay <PROJECT_REF> và <ANON_KEY>):
--
--   select cron.schedule(
--       'keepalive-heartbeat', '17 3 */6 * *',
--       $job$
--       select net.http_get(
--           url     := 'https://<PROJECT_REF>.supabase.co/rest/v1/',
--           headers := jsonb_build_object('apikey', '<ANON_KEY>')
--       );
--       $job$
--   );
--
-- Gỡ job: select cron.unschedule('keepalive-heartbeat');
