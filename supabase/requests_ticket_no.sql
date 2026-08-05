-- ============================================================
-- MIGRASI: Nomor tiket penanganan (ticket_no)
-- Format: RQT-DDM-YYMMDD-XXXX (urutan harian), unik.
--
-- Cara pakai:
--   Supabase Dashboard > SQL Editor > New query > paste > Run.
-- Menambah kolom baru + menormalkan constraint status (5 status).
-- ============================================================

alter table public.tickets
  add column if not exists ticket_no text;

-- Indeks unik (nullable — tiket lama tanpa nomor tetap aman)
create unique index if not exists idx_tickets_ticket_no
  on public.tickets(ticket_no)
  where ticket_no is not null;

-- Normalkan constraint status kembali ke 5 status
-- (mengembalikan kondisi jika sebelumnya sempat ada 'diskusi_vendor')
alter table public.tickets
  drop constraint if exists tickets_status_check;

alter table public.tickets
  add constraint tickets_status_check
    check (status in ('baru','diproses','menunggu','selesai','batal'));