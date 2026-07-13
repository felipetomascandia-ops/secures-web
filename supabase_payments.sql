-- Migration: payments table for admin Payment Links
-- Run this in your Supabase SQL editor or migration pipeline

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  square_checkout_id text,
  square_url text,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  customer text,
  email text,
  phone text,
  description text,
  contract_id uuid,
  created_by uuid,
  created_at timestamptz default now(),
  expires_at timestamptz
);

create index if not exists payments_created_at_idx on payments (created_at);
