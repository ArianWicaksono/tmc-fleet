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
