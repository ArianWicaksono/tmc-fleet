'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

import { loadAllSnapshots, saveSnapshot, saveUploadLog, loadUploadLogs } from '../lib/supabaseClient';
import {
  parseWorkbook,
  extractDateFromFilename,
  flattenSnapshot,
  computeKPIs,
  fmtDate,
  fmtDateHuman,
} from '../lib/parseWorkbook';

import UploadZone from './components/UploadZone';
import UploadHistory from './components/UploadHistory';
import ThemeToggle from './components/ThemeToggle';
import KpiCards from './components/KpiCards';
import StatusBoard from './components/StatusBoard';
import { TrendChart, StatusChart } from './components/Charts';
import Watchlist from './components/Watchlist';
import FleetTable from './components/FleetTable';

const FleetMap = dynamic(() => import('./components/FleetMap'), {
  ssr: false,
  loading: () => <div className="text-textDim text-sm">Memuat peta...</div>,
});

async function hashArrayBuffer(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function DashboardPage() {
  const [snapshots, setSnapshots] = useState({});
  const [dateList, setDateList] = useState([]);
  const [currentDate, setCurrentDate] = useState(null);
  const [tab, setTab] = useState('mgmt');
  const [statusHtml, setStatusHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadHistory, setUploadHistory] = useState([]);

  const refreshSnapshots = useCallback(async () => {
    try {
      const { snapshots: s, dateList: dl } = await loadAllSnapshots();
      setSnapshots(s);
      setDateList(dl);
      setCurrentDate((prev) => (prev && dl.includes(prev) ? prev : dl[dl.length - 1] || null));
    } catch (err) {
      console.error(err);
      setStatusHtml('<span class="text-danger">Gagal memuat data dari database. Cek konfigurasi Supabase di .env.local.</span>');
    }
  }, []);

  const refreshUploadHistory = useCallback(async () => {
    try {
      const history = await loadUploadLogs();
      setUploadHistory(history);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshSnapshots(), refreshUploadHistory()])
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [refreshSnapshots, refreshUploadHistory]);

  const currentRecords = currentDate ? flattenSnapshot(snapshots[currentDate] || { projects: {} }) : [];
  const kpis = computeKPIs(currentRecords);
  const snapshotLabel = currentDate ? fmtDateHuman(currentDate) : 'Belum ada data';

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => /\.(xlsx|xls)$/i.test(f.name));
    if (!files.length) {
      setStatusHtml('Tidak ada file .xlsx yang valid.');
      return;
    }

    const knownHashes = new Set(uploadHistory.map((item) => item.file_hash));

    for (const file of files) {
      setStatusHtml(`Memproses ${file.name}...`);
      try {
        const buf = await file.arrayBuffer();
        const fileHash = await hashArrayBuffer(buf);
        const projects = parseWorkbook(buf);
        let dateStr = extractDateFromFilename(file.name);
        if (!dateStr) {
          const manual = window.prompt(
            `Tanggal tidak terdeteksi dari nama file "${file.name}". Masukkan tanggal laporan (YYYY-MM-DD):`,
            fmtDate(new Date())
          );
          if (!manual) continue;
          dateStr = manual;
        }

        const projectNames = Object.keys(projects);
        const duplicate = knownHashes.has(fileHash);
        const logEntry = {
          filename: file.name,
          report_date: dateStr,
          project_names: projectNames,
          file_hash: fileHash,
          status: duplicate ? 'duplicate' : 'success',
          message: duplicate ? 'File sudah pernah diupload sebelumnya.' : `Upload ${projectNames.length} proyek berhasil.`,
        };

        if (duplicate) {
          await saveUploadLog(logEntry);
          setStatusHtml(
            `<span class="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full font-semibold bg-warn/15 text-warn">⚠ File ${file.name} sudah pernah diupload, tidak diproses ulang.</span>`
          );
        } else {
          await saveSnapshot(dateStr, projects);
          await saveUploadLog(logEntry);
          knownHashes.add(fileHash);
          setStatusHtml(
            `<span class="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full font-semibold bg-ok/15 text-ok">✓ ${file.name} tersimpan untuk ${fmtDateHuman(dateStr)}</span>`
          );
        }

        setUploadHistory((prev) => [logEntry, ...prev].slice(0, 50));
      } catch (err) {
        console.error(err);
        setStatusHtml(
          `<span class="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full font-semibold bg-danger/15 text-danger">✗ Gagal memproses ${file.name}</span>`
        );
      }
    }

    await Promise.all([refreshSnapshots(), refreshUploadHistory()]);
  }

  const records = currentRecords;

  return (
    <div className="min-h-screen pb-16">
      <header className="flex items-center gap-4 px-7 py-4 border-b border-border flex-wrap bg-gradient-to-b from-brand/[0.06] to-transparent">
        <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-display font-bold text-[13px] text-[#1A0E00] shrink-0 shadow-[0_0_0_3px_rgba(245,130,31,0.15)]"
             style={{ background: 'radial-gradient(circle at 30% 30%, #FFA94D, #F5821F)' }}>
          TMC
        </div>
        <div className="mr-auto">
          <div className="font-display font-bold text-[18px]">Dashcam Monitor</div>
          <div className="text-[12px] text-textDim mt-0.5">TMC EasyGo — Transport Management Center</div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <ThemeToggle />
          <label className="inline-flex items-center gap-2 border border-brand bg-brand text-[#1A0E00] rounded-lg px-3 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#FF9640]">
            + Unggah Laporan
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>
      </header>

      <main className="px-7 py-5 max-w-[1440px] mx-auto">
        <UploadZone onFiles={handleFiles} statusHtml={statusHtml} />

        <div className="grid gap-5 mb-5">
          <div className="bg-panel border border-border rounded-[10px] p-4">
            <div className="text-[12px] text-textDim font-semibold mb-3">Snapshot Terbaru</div>
            <div className="text-[14px] font-semibold text-text">{snapshotLabel}</div>
            <div className="text-[12px] text-textDim mt-2">
              Menampilkan ringkasan data terbaru untuk monitoring harian vendor.
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 mb-5 border-b border-border overflow-x-auto">
          {[
            { key: 'mgmt', label: 'Ringkasan (Management)' },
            { key: 'ops', label: 'Operasional (Detail)' },
            { key: 'history', label: 'Riwayat Upload' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`bg-transparent border-none pb-2.5 px-1.5 text-[14px] font-semibold -mb-px border-b-2 ${
                tab === t.key ? 'text-text border-brand' : 'text-textDim border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-textDim text-sm">Memuat data...</div>}

        {!loading && dateList.length === 0 && (
          <div className="text-center py-16 px-5 text-textDim">
            <div className="font-display text-[17px] text-text mb-1.5">Belum ada data</div>
            <div>Unggah file laporan harian pertama Anda untuk mulai melihat dashboard.</div>
          </div>
        )}

        {!loading && dateList.length > 0 && tab === 'mgmt' && (
          <>
            <KpiCards kpis={kpis} currentDate={currentDate} />
            <StatusBoard records={records} />
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
              <div className="bg-panel border border-border rounded-[10px] p-5">
                <div className="font-display font-bold text-[15px]">Tren Harian</div>
                <div className="text-[12.5px] text-textDim mb-4">
                  Komposisi kesegaran update (%) per hari — tiga kategori selalu berjumlah 100%. Garis putus-putus =
                  persentase gangguan perangkat (dimensi terpisah). Semakin banyak snapshot diunggah, semakin akurat.
                </div>
                <TrendChart dateList={dateList} snapshots={snapshots} />
              </div>
              <div className="bg-panel border border-border rounded-[10px] p-5">
                <div className="font-display font-bold text-[15px]">Kesehatan & Kesegaran Armada</div>
                <div className="text-[12.5px] text-textDim mb-4">Hari yang sedang dilihat.</div>
                <StatusChart records={records} />
              </div>
            </div>
          </>
        )}

        {!loading && dateList.length > 0 && tab === 'ops' && (
          <>
            <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
              <div className="font-display font-bold text-[15px]">Watchlist — Paling Lama Tidak Update</div>
              <div className="text-[12.5px] text-textDim mb-4">
                Unit dengan kategori NOT UPDATE (7-30 hari) dan OUT OF SERVICE (&gt;30 hari), diurutkan dari yang terlama.
              </div>
              <Watchlist records={records} />
            </div>

            <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
              <div className="font-display font-bold text-[15px]">Peta Sebaran Unit</div>
              <div className="text-[12.5px] text-textDim mb-4">
                Hanya unit dengan koordinat GPS presisi yang tampil (bukan alamat teks).
              </div>
              <FleetMap records={records} />
            </div>

            <FleetTable records={records} />
          </>
        )}

        {!loading && tab === 'history' && <UploadHistory history={uploadHistory} />}

        <div className="text-[12px] text-textDim bg-panelAlt border border-borderSoft rounded-lg px-3 py-2.5 mt-4 leading-relaxed">
          Data tersimpan di database Supabase bersama — siapa pun yang membuka URL dashboard ini melihat data yang
          sama, real-time. Definisi <b className="text-text">gangguan perangkat</b> mengikuti konvensi vendor: alarm{' '}
          <i>Video lost</i> atau <i>Storage unit fault</i>. Kategori kesegaran dihitung dari selisih hari update
          terakhir unit terhadap waktu laporan terbaru pada proyek tersebut:{' '}
          <b className="text-text">UPDATE</b> &lt;7 hari, <b className="text-text">NOT UPDATE</b> 7–30 hari, dan{' '}
          <b className="text-text">OUT OF SERVICE</b> &gt;30 hari. Kesegaran dan gangguan adalah dua dimensi
          terpisah: ketiga kategori kesegaran selalu berjumlah 100% dari seluruh armada, sedangkan persentase
          gangguan berdiri sendiri.
        </div>
      </main>
    </div>
  );
}
