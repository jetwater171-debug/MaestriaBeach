alter table public.stores
  add column if not exists subscription_status text default 'trial',
  add column if not exists plan_name text default 'Profissional',
  add column if not exists monthly_fee numeric default 197,
  add column if not exists subscription_due_date timestamptz,
  add column if not exists amount_paid numeric default 0,
  add column if not exists last_payment_at timestamptz,
  add column if not exists admin_incident text;

create index if not exists stores_subscription_status_idx
  on public.stores (subscription_status);

create index if not exists stores_subscription_due_date_idx
  on public.stores (subscription_due_date);
