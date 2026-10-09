-- 文獻研究白板 Supabase Schema
-- 在 Supabase Dashboard > SQL Editor 中執行此文件

-- 啟用 UUID
create extension if not exists "pgcrypto";

-- 文獻
create table if not exists papers (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  authors     text not null default '',
  year        integer not null default extract(year from now()),
  journal     text,
  abstract    text,
  doi         text,
  keywords    text[] not null default '{}',
  created_at  timestamptz not null default now(),
  user_id     text
);

-- 變數
create table if not exists variables (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  description text,
  type        text not null check (type in ('independent','dependent','mediator','moderator','control')),
  paper_ids   text[] not null default '{}',
  keywords    text[] not null default '{}'
);

-- 關係
create table if not exists relationships (
  id                 text primary key default gen_random_uuid()::text,
  from_variable_id   text not null references variables(id) on delete cascade,
  to_variable_id     text not null references variables(id) on delete cascade,
  direction          text not null check (direction in ('positive','negative','mixed','unknown')),
  strength           text check (strength in ('strong','moderate','weak')),
  explanation        text not null default '',
  original_text      text not null default '',
  paper_id           text not null references papers(id) on delete cascade,
  hypothesis_ids     text[] not null default '{}'
);

-- 假設/命題
create table if not exists hypotheses (
  id           text primary key default gen_random_uuid()::text,
  paper_id     text not null references papers(id) on delete cascade,
  number       text not null default '',
  content      text not null,
  type         text not null check (type in ('hypothesis','proposition')),
  supported    boolean,
  variable_ids text[] not null default '{}'
);

-- 節點位置
create table if not exists node_positions (
  variable_id text primary key references variables(id) on delete cascade,
  x           float not null,
  y           float not null
);

-- Row Level Security (開放公開讀寫，可依需求加Auth限制)
alter table papers enable row level security;
alter table variables enable row level security;
alter table relationships enable row level security;
alter table hypotheses enable row level security;
alter table node_positions enable row level security;

create policy "public read" on papers for select using (true);
create policy "public write" on papers for insert with check (true);
create policy "public update" on papers for update using (true);
create policy "public delete" on papers for delete using (true);

create policy "public read" on variables for select using (true);
create policy "public write" on variables for insert with check (true);
create policy "public update" on variables for update using (true);
create policy "public delete" on variables for delete using (true);

create policy "public read" on relationships for select using (true);
create policy "public write" on relationships for insert with check (true);
create policy "public update" on relationships for update using (true);
create policy "public delete" on relationships for delete using (true);

create policy "public read" on hypotheses for select using (true);
create policy "public write" on hypotheses for insert with check (true);
create policy "public update" on hypotheses for update using (true);
create policy "public delete" on hypotheses for delete using (true);

create policy "public read" on node_positions for select using (true);
create policy "public write" on node_positions for insert with check (true);
create policy "public update" on node_positions for update using (true);
create policy "public delete" on node_positions for delete using (true);
