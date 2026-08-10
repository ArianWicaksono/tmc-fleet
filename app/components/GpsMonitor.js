'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

function parseISO(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function hoursAgo(d) {
  if (!d) return null;
  return (Date.now() - d.getTime()) / 3600000;
}

function ageBucket(hours) {
  if (hours === null) return 'unknown';
  if (hours < 24 * 7) return 'under7';
  if (hours < 24 * 30) return 'w7to30';
  return 'over30';
}

const BUCKETS = {
  under7: { label: '1–7 hari',       badge: 'bg-info/15 text-info',        bar: 'bg-info' },
  w7to30: { label: '7–30 hari',      badge: 'bg-warn/15 text-warn',        bar: 'bg-warn' },
  over30: { label: '>30 hari (Kritis)', badge: 'bg-danger/15 text-danger', bar: 'bg-danger' },
  unknown: { label: 'Tidak diketahui', badge: 'bg-panelAlt text-textDim',  bar: 'bg-border' },
};

const BUCKET_ORDER = ['under7', 'w7to30', 'over30', 'unknown'];

function fmtDateTime(d) {
  if (!d) return '—';
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtAge(hours) {
  if (hours === null) return '—';
  const days = Math.floor(hours / 24);
  const hrs = Math.floor(hours % 24);
  if (days >= 1) return `${days} hari${hrs ? ` ${hrs} jam` : ''}`;
  return `${hrs} jam`;
}

function kpiCls(color) {
  return {
    'bg-ok/15 text-ok': true,
    'bg-info/15 text-info': true,
    'bg-warn/15 text-warn': true,
    'bg-danger/15 text-danger': true,
    'bg-panelAlt text-textDim': true,
  }[color] || 'bg-panelAlt text-textDim';
}

export default function GpsMonitor() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [search, setSearch] = useState('');
  const [fCompany, setFCompany] = useState('');
  const [fBucket, setFBucket] = useState('');
  const [sortKey, setSortKey] = useState('hours');
  const [sortDir, setSortDir] = useState(-1);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/gps');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json.Data || []);
      setFetchedAt(new Date());
    } catch (e) {
      console.error(e);
      setError(e.message || 'Gagal memuat data GPS.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const records = useMemo(() => {
    return data.map((r) => {
      const gpsTime = parseISO(r.gps_time);
      const stime = parseISO(r.stime);
      const hours = hoursAgo(gpsTime || stime);
      return {
        raw: r,
        nopol: r.nopol || r.gps_sn || '—',
        company: r.company_nm || '',
        carType: r.car_type || '',
        carModel: r.car_model || '',
        gpsSn: r.gps_sn || '',
        gsmNo: r.gsm_no || '',
        lastTime: gpsTime || stime,
        lastTimeLabel: fmtDateTime(gpsTime || stime),
        hours,
        ageLabel: fmtAge(hours),
        bucket: ageBucket(hours),
        addr: r.addr || '',
        speed: r.speed ?? 0,
        statusVehicle: r.currentStatusVehicle?.ket || '',
        statusDur: r.currentStatusVehicle?.parking?.duration?.text || '',
        lat: r.lat,
        lon: r.lon,
      };
    });
  }, [data]);

  const counts = useMemo(() => {
    const total = records.length;
    const bucketCounts = BUCKET_ORDER.reduce((acc, k) => ((acc[k] = 0), acc), {});
    const companyCounts = {};
    records.forEach((r) => {
      bucketCounts[r.bucket] = (bucketCounts[r.bucket] || 0) + 1;
      const c = r.company || '(tanpa company)';
      companyCounts[c] = (companyCounts[c] || 0) + 1;
    });
    const companies = Object.entries(companyCounts)
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n);
    return { total, bucketCounts, companies };
  }, [records]);

  const filtered = useMemo(() => {
    let out = records.filter((r) => {
      if (search && !`${r.nopol} ${r.gpsSn} ${r.addr} ${r.company}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (fCompany && r.company !== fCompany) return false;
      if (fBucket && r.bucket !== fBucket) return false;
      return true;
    });
    out = out.slice().sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (av === null || av === undefined) av = '';
      if (bv === null || bv === undefined) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return av > bv ? sortDir : av < bv ? -sortDir : 0;
    });
    return out;
  }, [records, search, fCompany, fBucket, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(-1); }
  }

  const kpis = [
    { label: 'Total Unit Bermasalah', value: counts.total, color: 'bg-danger/15 text-danger', sub: 'GPS tidak update' },
    { label: '1–7 Hari', value: counts.bucketCounts.under7, color: 'bg-info/15 text-info', sub: 'segera dipantau' },
    { label: '7–30 Hari', value: counts.bucketCounts.w7to30, color: 'bg-warn/15 text-warn', sub: 'perlu tindakan' },
    { label: '>30 Hari (Kritis)', value: counts.bucketCounts.over30, color: 'bg-panelAlt text-textDim', sub: 'offline berkepanjangan' },
  ];

  const maxBucket = Math.max(1, ...BUCKET_ORDER.map((k) => counts.bucketCounts[k] || 0));

  return (
    <div>
      <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="font-display font-bold text-[15px]">GPS Update — Monitoring Online</div>
            <div className="text-[12.5px] text-textDim mt-0.5">
              Data langsung dari vendor VTS (API GPS). Menampilkan unit yang <b className="text-text">tidak update GPS</b>.
              Diperbarui{' '}
              {fetchedAt ? (
                <span className="text-text">
                  {fetchedAt.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  pukul {fetchedAt.toLocaleTimeString('id-ID')}
                </span>
              ) : (
                'segera...'
              )}{' '}
              WITA.
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="bg-brand text-[#1A0E00] rounded-lg px-3.5 py-2 text-[13px] font-semibold hover:bg-[#FF9640] disabled:opacity-60"
          >
            {loading ? 'Memuat...' : '↻ Muat Ulang Data'}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-[12.5px] text-danger font-semibold bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5">
            ⚠ {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-[13px] text-textDim">Memuat data GPS dari vendor…</div>
      ) : records.length === 0 ? (
        <div className="text-center py-14 text-textDim bg-panel border border-border rounded-[10px]">
          <div className="font-display text-[16px] text-text mb-1">Tidak ada data</div>
          <div className="text-[12.5px]">Belum ada laporan unit GPS tidak update dari vendor.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {kpis.map((k) => (
              <div key={k.label} className="bg-panel border border-border rounded-[10px] p-4">
                <div className="text-[11.5px] text-textDim font-semibold">{k.label}</div>
                <div className={`inline-flex items-center mt-1 text-[24px] font-bold font-display leading-none ${k.color.split(' ')[1]}`}>
                  {k.value}
                </div>
                <div className="text-[11.5px] text-textFaint mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="font-display font-bold text-[15px]">Distribusi Lama Tidak Update</div>
              <div className="text-[11.5px] text-textFaint">{counts.total} unit</div>
            </div>
            <div className="space-y-2">
              {BUCKET_ORDER.map((k) => {
                const n = counts.bucketCounts[k] || 0;
                const b = BUCKETS[k];
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap w-[130px] text-center ${b.badge}`}>
                      {b.label}
                    </span>
                    <div className="flex-1 h-4 bg-panelAlt border border-borderSoft rounded overflow-hidden">
                      <div
                        className={`h-full ${b.bar}`}
                        style={{ width: `${(n / maxBucket) * 100}%`, transition: 'width .4s' }}
                      />
                    </div>
                    <span className="text-[12.5px] font-mono font-semibold w-8 text-right">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-panel border border-border rounded-[10px] p-5">
            <div className="font-display font-bold text-[15px] mb-3.5">Daftar Unit GPS Tidak Update</div>

            <div className="flex gap-2.5 flex-wrap mb-4">
              <input
                type="text"
                placeholder="Cari nopol / no. GPS / alamat / company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[220px] bg-panel border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
              <select value={fCompany} onChange={(e) => setFCompany(e.target.value)} className="min-w-[180px] bg-panel border border-border rounded-lg px-3 py-2 text-[13px]">
                <option value="">Semua Company</option>
                {counts.companies.map((c) => (
                  <option key={c.name} value={c.name}>{c.name} · {c.n}</option>
                ))}
              </select>
              <select value={fBucket} onChange={(e) => setFBucket(e.target.value)} className="min-w-[160px] bg-panel border border-border rounded-lg px-3 py-2 text-[13px]">
                <option value="">Semua Kategori</option>
                {BUCKET_ORDER.map((k) => (
                  <option key={k} value={k}>{BUCKETS[k].label}</option>
                ))}
              </select>
            </div>

            <div className="text-[12px] text-textDim mb-2.5">{filtered.length} dari {records.length} unit ditampilkan · urut terlama tidak update</div>

            <div className="max-h-[600px] overflow-auto border border-borderSoft rounded-lg">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    {[
                      { key: 'nopol', label: 'Kendaraan' },
                      { key: 'company', label: 'Company' },
                      { key: 'carType', label: 'Tipe' },
                      { key: 'lastTime', label: 'Update Terakhir' },
                      { key: 'hours', label: 'Lama Tidak Update' },
                      { key: 'bucket', label: 'Kategori' },
                      { key: 'statusVehicle', label: 'Status' },
                      { key: 'addr', label: 'Lokasi Terakhir' },
                    ].map((c) => (
                      <th
                        key={c.key}
                        onClick={() => toggleSort(c.key)}
                        className="text-left text-[11px] uppercase tracking-wide text-textDim px-2.5 py-2 border-b border-border cursor-pointer select-none sticky top-0 bg-panel hover:text-text"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map((r, i) => (
                    <tr key={i} className={r.bucket === 'over30' ? 'bg-danger/10' : r.bucket === 'w7to30' ? 'bg-warn/10' : r.bucket === 'under7' ? 'bg-info/5' : ''}>
                      <td className="px-2.5 py-2 border-b border-borderSoft font-mono font-semibold align-top">{r.nopol}</td>
                      <td className="px-2.5 py-2 border-b border-borderSoft align-top">{r.company}</td>
                      <td className="px-2.5 py-2 border-b border-borderSoft align-top">{r.carType}{r.carModel ? ` · ${r.carModel}` : ''}</td>
                      <td className="px-2.5 py-2 border-b border-borderSoft font-mono align-top">{r.lastTimeLabel}</td>
                      <td className="px-2.5 py-2 border-b border-borderSoft font-mono text-[13px] align-top">
                        {r.bucket === 'over30' && <span className="mr-1">⚠</span>}
                        {r.ageLabel}
                      </td>
                      <td className="px-2.5 py-2 border-b border-borderSoft align-top">
                        <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${BUCKETS[r.bucket].badge}`}>
                          {BUCKETS[r.bucket].label}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 border-b border-borderSoft align-top text-textDim">
                        {r.statusVehicle}
                        {r.speed > 0 && <div className="text-[11px] font-mono">{r.speed.toFixed(0)} km/j</div>}
                        {r.statusDur && <div className="text-[11px] text-textFaint">{r.statusDur}</div>}
                      </td>
                      <td className="px-2.5 py-2 border-b border-borderSoft align-top text-textDim max-w-[240px]">{r.addr || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
