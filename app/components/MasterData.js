'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadVehicles, upsertVehicles } from '../../lib/supabaseClient';

const COLS = [
  { key: 'vhid', label: 'VHCID' },
  { key: 'nopol_actual', label: 'Nopol Actual' },
  { key: 'branch', label: 'Branch' },
  { key: 'project', label: 'Project' },
  { key: 'nomor_rangka', label: 'Nomor Rangka' },
  { key: 'product', label: 'Product' },
];

const inputCls =
  'bg-panelAlt border border-border rounded-lg px-3 py-2 text-[13px] w-full outline-none focus:border-brand';

function parseRows(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    if (/^[-|]{3,}$/.test(line.replace(/[\s|]/g, '-'))) continue;
    let parts;
    if (line.includes('|')) {
      parts = line.split('|').map((s) => s.trim());
    } else if (line.includes('\t')) {
      parts = line.split('\t').map((s) => s.trim());
    } else if (line.includes(';')) {
      parts = line.split(';').map((s) => s.trim());
    } else {
      parts = line.split(/\s{2,}/).map((s) => s.trim());
    }
    parts = parts.filter((p) => p && !/^-{2,}$/.test(p));
    const first = (parts[0] || '').toLowerCase();
    if (first === 'vhid' || first === '#') continue;
    if (parts.length < 3) continue;
    rows.push({
      vhid: parts[0] || '',
      nopol_actual: parts[1] || '',
      branch: parts[2] || '',
      project: parts[3] || '',
      nomor_rangka: parts[4] || '',
      product: parts[5] || '',
    });
  }
  return rows;
}

export default function MasterData() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [flash, setFlash] = useState('');
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await loadVehicles();
      setVehicles(data || []);
      setErr('');
    } catch (e) {
      console.error(e);
      setErr(
        'Gagal memuat master data. Pastikan tabel dibuat: Supabase → SQL Editor → jalankan supabase/master_data.sql.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const branches = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.branch).filter(Boolean))).sort(),
    [vehicles]
  );

  const products = useMemo(
    () =>
      vehicles.reduce((acc, v) => {
        const k = v.product || '(kosong)';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}),
    [vehicles]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (branchFilter !== 'all' && v.branch !== branchFilter) return false;
      if (!q) return true;
      return [v.vhid, v.nopol_actual, v.nomor_rangka, v.branch, v.project, v.product]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [vehicles, query, branchFilter]);

  const preview = useMemo(() => (importText.trim() ? parseRows(importText) : []), [importText]);

  async function doImport() {
    if (!preview.length) {
      setErr('Tidak ada baris valid yang bisa diimpor.');
      return;
    }
    setErr('');
    try {
      const inserted = await upsertVehicles(preview);
      setImportText('');
      setShowImport(false);
      setFlash(`Berhasil menyimpan ${preview.length} kendaraan.`);
      setTimeout(() => setFlash(''), 4000);
      await refresh();
    } catch (e) {
      console.error(e);
      setErr('Gagal menyimpan: ' + e.message);
    }
  }

  return (
    <div>
      <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="font-display font-bold text-[15px]">Master Data Armada</div>
            <div className="text-[12.5px] text-textDim mt-0.5">
              Referensi unit (VHCID) yang dipakai semua modul. Edit file MD/markdown lalu impor, atau kelola langsung.
            </div>
          </div>
          <button
            onClick={() => setShowImport((v) => !v)}
            className="bg-brand text-[#1A0E00] rounded-lg px-3.5 py-2 text-[13px] font-semibold hover:bg-[#FF9640]"
          >
            + Impor dari Markdown
          </button>
        </div>

        {showImport && (
          <div className="mt-4 border-t border-borderSoft pt-4">
            <div className="text-[12.5px] text-textDim mb-2">
              Tempel tabel markdown / teks dengan 6 kolom: <b className="text-text">VHCID | Nopol Actual | Branch | Project | Nomor Rangka | Product</b>.
              Baris yang sudah ada (berdasarkan VHCID) akan diperbarui.
            </div>
            <textarea
              className={`${inputCls} resize-none font-mono text-[12px]`}
              rows={7}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'| VHCID | Nopol Actual | Branch | Project | Nomor Rangka | Product |\n|-------|--------------|--------|---------|--------------|---------|\n| TMC-0001 | B 1234 XYZ | BDL | EasyGo | MHMBMA12345678901 | GPS |'}
            />
            {importText.trim() && (
              <div className="text-[12px] text-textDim mt-2">
                Terdeteksi <b className="text-text">{preview.length}</b> baris valid.
              </div>
            )}
            <div className="flex gap-3 mt-3">
              <button onClick={doImport} className="bg-brand text-[#1A0E00] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#FF9640]">
                Simpan ke Database
              </button>
              <button onClick={() => setShowImport(false)} className="text-[13px] text-textDim hover:text-text">
                Batal
              </button>
            </div>
          </div>
        )}

        {flash && <div className="mt-4 text-[12.5px] text-ok font-semibold">{flash}</div>}
        {err && <div className="mt-4 text-[12.5px] text-danger font-semibold">{err}</div>}
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-panel border border-border rounded-[10px] p-4">
          <div className="text-[12px] text-textDim font-semibold">Total Unit</div>
          <div className="font-display text-3xl font-bold mt-1 text-text">{vehicles.length}</div>
        </div>
        <div className="bg-panel border border-border rounded-[10px] p-4">
          <div className="text-[12px] text-textDim font-semibold">Branch</div>
          <div className="font-display text-3xl font-bold mt-1 text-text">{branches.length}</div>
        </div>
        <div className="bg-panel border border-border rounded-[10px] p-4">
          <div className="text-[12px] text-textDim font-semibold">Produk</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(products).map(([k, n]) => (
              <span key={k} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-panelAlt text-text">
                {k} · {n}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-panel border border-border rounded-[10px] p-4">
          <div className="text-[12px] text-textDim font-semibold">Terlihat di Dashboard</div>
          <div className="text-[12px] text-textDim mt-2 leading-relaxed">
            Unit dari laporan vendor akan dipetakan ke VHCID melalui pemetaan otomatis.
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        <input
          className={`${inputCls} max-w-[260px]`}
          placeholder="Cari VHCID / nopol / rangka..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={`${inputCls} max-w-[180px]`} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="all">Semua Branch</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <div className="text-[12px] text-textDim self-center ml-auto">{shown.length} unit</div>
      </div>

      {/* Tabel */}
      <div className="bg-panel border border-border rounded-[10px] overflow-hidden">
        {loading ? (
          <div className="p-5 text-[13px] text-textDim">Memuat master data…</div>
        ) : shown.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-textDim">
            {vehicles.length === 0
              ? 'Belum ada master data. Buat tabel dulu (SQL Editor → supabase/master_data.sql), lalu impor data markdown.'
              : 'Tidak ada hasil yang cocok dengan filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] text-textDim border-b border-borderSoft">
                  <th className="px-4 py-3 font-semibold">#</th>
                  {COLS.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-semibold whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((v, i) => (
                  <tr key={v.id} className="border-b border-borderSoft last:border-b-0 hover:bg-panelAlt/40">
                    <td className="px-4 py-3 text-textFaint">{i + 1}</td>
                    {COLS.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-3 whitespace-nowrap ${c.key === 'vhid' ? 'font-semibold text-brand' : 'text-text'}`}
                      >
                        {v[c.key] || <span className="text-textFaint">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
