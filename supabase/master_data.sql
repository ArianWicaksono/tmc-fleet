-- ============================================================
-- Master Data Armada — Fase 2
-- Golden record yang dipakai semua modul (dashboard, tiket, safety).
--
-- Cara pakai:
--   Supabase Dashboard > SQL Editor > New query > paste > Run.
-- Skrip ini ADDITIVE: tidak mengubah tabel yang sudah ada.
-- RLS nonaktif (internal, tanpa login) — aktifkan saat fase Safety.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- 1) vehicles — 6 kolom utama (keputusan pemilik sistem)
--    vhid        = PK, stabil
--    nopol_actual= plat terpasang (dapat berubah -> bukan key)
--    branch      = cabang
--    project     = kelompok proyek
--    nomor_rangka= VIN, immutable
--    product     = jenis perangkat/produk (GPS/Dashcam/model)
--    + valid_from/valid_to agar perubahan nopol/cabang tidak menimpa riwayat
-- ------------------------------------------------------------------
create table if not exists public.vehicles (
  id           uuid        primary key default gen_random_uuid(),
  vhid         text        not null unique,
  nopol_actual text        not null default '',
  branch       text        not null default '',
  project      text        not null default '',
  nomor_rangka text        not null default '',
  product      text        not null default '',
  valid_from   date        not null default current_date,
  valid_to     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 2) vehicle_mapping — petakan teks unit dari laporan vendor -> vhid.
--    Unit tanpa pemetaan ditandai unmapped (metrik kualitas data).
--    (Tabel drivers sengaja TIDAK dibuat sekarang; belum ada datanya.
--     Akan ditambahkan di fase modul Safety.)
-- ------------------------------------------------------------------
create table if not exists public.vehicle_mapping (
  id          uuid        primary key default gen_random_uuid(),
  vendor_unit text        not null unique,  -- teks unit sebagaimana di laporan
  vehicle_id  uuid        references public.vehicles(id) on delete cascade,
  mapped_by   text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Akses langsung utk anon key (internal, tanpa login)
alter table public.vehicles         disable row level security;
alter table public.vehicle_mapping  disable row level security;

-- Indeks umum
create index if not exists idx_vehicles_nopol  on public.vehicles(nopol_actual);
create index if not exists idx_vehicles_branch on public.vehicles(branch);
create index if not exists idx_vehicles_project on public.vehicles(project);
create index if not exists idx_vehicles_rangka on public.vehicles(nomor_rangka);
create index if not exists idx_mapping_vendor  on public.vehicle_mapping(vendor_unit);