-- Full migration for contracts and payments
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null,
  contract_date timestamptz not null default now(),
  client_name text,
  client_company_name text,
  client_email text,
  client_phone text,
  total_premium numeric,
  down_payment numeric,
  monthly_payment numeric,
  number_of_payments int,
  first_due_date date,
  last_due_date date,
  terms text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists payment_schedules (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id) on delete cascade,
  sequence int not null,
  label text,
  amount numeric not null,
  due_date date,
  status text not null default 'pending',
  checkout_id text,
  checkout_url text,
  square_payment_id text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists square_payments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references payment_schedules(id) on delete cascade,
  square_checkout_id text,
  square_payment_id text,
  receipt_url text,
  amount numeric,
  currency text,
  status text,
  created_at timestamptz default now()
);

create index if not exists payment_schedules_contract_idx on payment_schedules(contract_id);
create index if not exists payment_schedules_due_date_idx on payment_schedules(due_date);
