-- ============================================================
-- SAJ AL-REEF — Supabase Schema v2
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
-- FRESH DATABASE: run the entire file top to bottom.
-- UPGRADING FROM v1: the CREATE TABLE blocks are safe to skip
--   (IF NOT EXISTS), and the ALTER TABLE blocks at the bottom
--   add only new columns — existing data is untouched.
-- ============================================================

-- ── Original tables (idempotent — safe to re-run) ─────────────

create table if not exists menu_items (
  id          bigint  primary key generated always as identity,
  name        text    not null,
  description text,
  price       integer not null default 0,
  category    text    not null default 'm',
  emoji       text    default '🍽️',
  hot         boolean default false
);

create table if not exists restaurant_tables (
  n      integer primary key,
  status text    not null default 'g'
);

create table if not exists orders (
  id         text        primary key,
  table_ref  text        not null default 'T1',
  items      text        not null,
  time       text        not null,
  status     text        not null default 'new',
  created_at timestamptz default now()
);

create table if not exists alerts (
  id         bigint      primary key generated always as identity,
  table_ref  text        not null,
  type       text        not null,
  emoji      text        default '👨‍🍽️',
  time       text        not null,
  created_at timestamptz default now()
);

create table if not exists reservations (
  id        bigint  primary key generated always as identity,
  time      text    not null,
  table_ref text    not null,
  name      text    not null,
  confirmed boolean default false
);

create table if not exists queue (
  id        text primary key,
  table_ref text not null,
  items     text not null,
  waiter    text not null,
  status    text not null default 'assigned'
);

create table if not exists offers (
  id          bigint  primary key generated always as identity,
  title       text    not null,
  description text,
  active      boolean default true
);

create table if not exists notifications (
  id         bigint      primary key generated always as identity,
  table_ref  text        not null,
  message    text        not null,
  time       text        not null,
  color      text        not null default '#DCA95C',
  created_at timestamptz default now()
);

-- ── v2: Add columns to restaurant_tables ─────────────────────
alter table restaurant_tables
  add column if not exists floor               integer default 1,
  add column if not exists label              text    default '',
  add column if not exists capacity           integer default 4,
  add column if not exists current_session_id text    default null;

-- ── v2: New table — sessions ──────────────────────────────────
-- One session = one customer visit from arrival to payment.
create table if not exists sessions (
  id         text        primary key,
  table_id   integer     not null references restaurant_tables(n),
  started_at timestamptz default now(),
  closed_at  timestamptz,
  total      integer     default 0,
  paid       boolean     default false
);

-- ── v2: Add columns to orders ─────────────────────────────────
alter table orders
  add column if not exists session_id text references sessions(id),
  add column if not exists total      integer default 0;

-- ── v2: New table — ratings ───────────────────────────────────
-- Replaces the RATING: hack in the notifications table.
create table if not exists ratings (
  id         bigint      primary key generated always as identity,
  session_id text        references sessions(id),
  table_id   integer     references restaurant_tables(n),
  food       integer     not null check (food    between 1 and 5),
  service    integer     not null check (service between 1 and 5),
  overall    integer     not null check (overall between 1 and 5),
  comment    text        default '',
  created_at timestamptz default now()
);

-- ── v2: New table — stock_items ───────────────────────────────
-- Replaces the localStorage-based stock management.
create table if not exists stock_items (
  id         bigint      primary key generated always as identity,
  name       text        not null,
  current    numeric     default 0,
  minimum    numeric     default 0,
  unit       text        default 'كغ',
  updated_at timestamptz default now()
);

-- ── v2: Add columns to reservations ──────────────────────────
alter table reservations
  add column if not exists guests  integer default 2,
  add column if not exists phone   text    default '',
  add column if not exists notes   text    default '',
  add column if not exists section text    default '';

-- ── v2: Add table_id FK to alerts ────────────────────────────
alter table alerts
  add column if not exists table_id integer references restaurant_tables(n);

-- ── Enable Realtime ───────────────────────────────────────────
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table restaurant_tables;
alter publication supabase_realtime add table offers;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table ratings;
alter publication supabase_realtime add table stock_items;

-- ── Row Level Security ────────────────────────────────────────
alter table menu_items         enable row level security;
alter table orders             enable row level security;
alter table alerts             enable row level security;
alter table reservations       enable row level security;
alter table queue              enable row level security;
alter table restaurant_tables  enable row level security;
alter table offers             enable row level security;
alter table notifications      enable row level security;
alter table sessions           enable row level security;
alter table ratings            enable row level security;
alter table stock_items        enable row level security;

create policy "public read-write" on menu_items        for all to anon using (true) with check (true);
create policy "public read-write" on orders            for all to anon using (true) with check (true);
create policy "public read-write" on alerts            for all to anon using (true) with check (true);
create policy "public read-write" on reservations      for all to anon using (true) with check (true);
create policy "public read-write" on queue             for all to anon using (true) with check (true);
create policy "public read-write" on restaurant_tables for all to anon using (true) with check (true);
create policy "public read-write" on offers            for all to anon using (true) with check (true);
create policy "public read-write" on notifications     for all to anon using (true) with check (true);
create policy "public read-write" on sessions          for all to anon using (true) with check (true);
create policy "public read-write" on ratings           for all to anon using (true) with check (true);
create policy "public read-write" on stock_items       for all to anon using (true) with check (true);
