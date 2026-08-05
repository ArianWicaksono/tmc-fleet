import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ini akan tampil di console browser kalau .env.local belum diisi dengan benar.
  console.warn(
    'Supabase belum dikonfigurasi. Cek file .env.local — lihat .env.local.example untuk contoh.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mengambil semua snapshot dari database, dikelompokkan per tanggal
// dengan bentuk yang sama seperti versi artifact sebelumnya:
// { "2026-07-17": { date, updatedAt, projects: { "BJU VALE": [...] } }, ... }
export async function loadAllSnapshots() {
  const { data, error } = await supabase
    .from('snapshots')
    .select('date, project, records, updated_at')
    .order('date', { ascending: true });

  if (error) throw error;

  const snapshots = {};
  (data || []).forEach((row) => {
    const dateStr = row.date;
    if (!snapshots[dateStr]) {
      snapshots[dateStr] = { date: dateStr, updatedAt: row.updated_at, projects: {} };
    }
    snapshots[dateStr].projects[row.project] = row.records;
  });
  const dateList = Object.keys(snapshots).sort();
  return { snapshots, dateList };
}

// Menyimpan (upsert) hasil parsing satu file untuk satu tanggal.
// projects: { projectName: records[] }
export async function saveSnapshot(dateStr, projects) {
  const rows = Object.keys(projects).map((project) => ({
    date: dateStr,
    project,
    records: projects[project],
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('snapshots').upsert(rows, { onConflict: 'date,project' });
  if (error) throw error;
}

export async function saveUploadLog(log) {
  const { error } = await supabase.from('upload_logs').insert([log]);
  if (error) throw error;
}

export async function loadUploadLogs() {
  const { data, error } = await supabase
    .from('upload_logs')
    .select('filename,report_date,project_names,file_hash,status,message,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

// ---- Tiket (Report) ----

async function nextTicketNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `RQT-DDM-${yy}${mm}${dd}-`;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { count, error } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end);

  if (error) throw error;
  return prefix + String((count || 0) + 1).padStart(4, '0');
}

async function logEvent(ticketId, status, note = '') {
  const { error } = await supabase
    .from('ticket_events')
    .insert([{ ticket_id: ticketId, status, note }]);
  if (error) throw error;
}

export async function loadTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function loadTicketEvents(ticketId) {
  const { data, error } = await supabase
    .from('ticket_events')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createTicket(payload) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketNo = await nextTicketNo();
    const { data, error } = await supabase
      .from('tickets')
      .insert([{ ...payload, ticket_no: ticketNo }])
      .select()
      .single();

    if (!error) {
      await logEvent(data.id, 'baru', 'Tiket dibuat');
      return data;
    }

    const msg = error.message || '';
    if (!/unique|duplicate|ticket_no/i.test(msg)) throw error;
  }
  throw new Error('Gagal membuat nomor tiket unik.');
}

export async function updateTicketStatus(id, nextStatus) {
  const now = new Date().toISOString();
  const updates = {
    status: nextStatus,
    updated_at: now,
    resolved_at:
      nextStatus === 'selesai' || nextStatus === 'batal' ? now : null,
  };

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  await logEvent(id, nextStatus, 'Status diperbarui');
  return data;
}

// ---- Master Data ----

export async function loadVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('vhid', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertVehicles(rows) {
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({
    vhid: r.vhid,
    nopol_actual: r.nopol_actual,
    branch: r.branch,
    project: r.project,
    nomor_rangka: r.nomor_rangka,
    product: r.product,
    updated_at: now,
  }));
  const { data, error } = await supabase
    .from('vehicles')
    .upsert(payload, { onConflict: 'vhid' });

  if (error) throw error;
  return data || [];
}
