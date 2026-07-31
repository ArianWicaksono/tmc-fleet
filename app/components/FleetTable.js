'use client';

import { useMemo, useState } from 'react';
import { DAY_CATEGORY_LABELS, daysLabel } from '../../lib/parseWorkbook';

const COLUMNS = [
  { key: 'number', label: '#' },
  { key: 'vehicle', label: 'Kendaraan' },
  { key: 'project', label: 'Proyek' },
  { key: 'company', label: 'Company' },
  { key: 'posTime', label: 'Update Terakhir' },
  { key: 'staleMs', label: 'Lama Tidak Update' },
  { key: 'alarm', label: 'Alarm' },
  { key: 'status', label: 'Status' },
  { key: 'position', label: 'Posisi' },
];

const FRESHNESS_OPTIONS = [
  { key: 'update', label: 'UPDATE (<7 hari)', classes: 'bg-ok/15 text-ok' },
  { key: 'notUpdate', label: 'NOT UPDATE (7-30 hari)', classes: 'bg-[#FFF4D8] text-[#9B7600]' },
  { key: 'outOfService', label: 'OUT OF SERVICE (>30 hari)', classes: 'bg-warn/15 text-warn' },
];

function StatusTag({ r }) {
  const freshnessLabel = DAY_CATEGORY_LABELS[r.freshness] || 'UNKNOWN';
  const freshnessStyle = {
    update: 'bg-ok/15 text-ok',
    notUpdate: 'bg-[#FFF4D8] text-[#9B7600]',
    outOfService: 'bg-danger/15 text-danger',
  }[r.freshness] || 'bg-panelAlt text-textDim';

  const badge = (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10.5px] font-semibold ${freshnessStyle}`}>
      {freshnessLabel}
    </span>
  );

  if (r.isFault) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-danger/15 text-danger">GANGGUAN</span>
        {badge}
      </span>
    );
  }

  if (r.isSafetyAlarm) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-info/15 text-info">ALARM</span>
        {badge}
      </span>
    );
  }

  return badge;
}

export default function FleetTable({ records }) {
  const [search, setSearch] = useState('');
  const [fProj, setFProj] = useState('');
  const [fComp, setFComp] = useState('');
  const [showFault, setShowFault] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showCritical, setShowCritical] = useState(false);
  const [freshnessFilters, setFreshnessFilters] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);

  const projects = useMemo(() => [...new Set(records.map((r) => r.project))].sort(), [records]);
  const companies = useMemo(() => [...new Set(records.map((r) => r.company).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => {
    let out = records.filter((r) => {
      if (search && !r.vehicle.toLowerCase().includes(search.toLowerCase())) return false;
      if (fProj && r.project !== fProj) return false;
      if (fComp && r.company !== fComp) return false;
      if (showFault && !r.isFault) return false;
      if (showSafety && !r.isSafetyAlarm) return false;
      if (showCritical && !(r.isFault && (r.freshness === 'notUpdate' || r.freshness === 'outOfService'))) return false;
      if (freshnessFilters.length && !freshnessFilters.includes(r.freshness)) return false;
      return true;
    });
    if (sortKey) {
      out = out.slice().sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (av === null || av === undefined) av = '';
        if (bv === null || bv === undefined) bv = '';
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        return av > bv ? sortDir : av < bv ? -sortDir : 0;
      });
    }
    return out;
    }, [records, search, fProj, fComp, showFault, showSafety, showCritical, freshnessFilters, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(1); }
  }

  function handleFreshnessToggle(key) {
    setFreshnessFilters((current) => {
      const next = current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key];

      if (key === 'outOfService' && !current.includes(key) && next.length === 1) {
        setSortKey('staleDays');
        setSortDir(-1);
      }

      return next;
    });
  }

  return (
    <div className="bg-panel border border-border rounded-[10px] p-5">
      <div className="font-display font-bold text-[15px] mb-3.5">Tabel Detail Armada</div>

      <div className="flex gap-2.5 flex-wrap mb-4">
        <input
          type="text"
          placeholder="Cari nomor kendaraan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] bg-panel border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
        />
        <select value={fProj} onChange={(e) => setFProj(e.target.value)} className="min-w-[150px] bg-panel border border-border rounded-lg px-3 py-2 text-[13px]">
          <option value="">Semua Proyek</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={fComp} onChange={(e) => setFComp(e.target.value)} className="min-w-[150px] bg-panel border border-border rounded-lg px-3 py-2 text-[13px]">
          <option value="">Semua Company</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <label className="inline-flex items-center gap-2 text-[13px] text-textDim">
          <input
            type="checkbox"
            checked={showFault}
            onChange={(e) => setShowFault(e.target.checked)}
            className="accent-danger"
          />
          Gangguan Perangkat
        </label>
        <label className="inline-flex items-center gap-2 text-[13px] text-textDim">
          <input
            type="checkbox"
            checked={showSafety}
            onChange={(e) => setShowSafety(e.target.checked)}
            className="accent-info"
          />
          Alarm Keselamatan
        </label>
        <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-danger">
          <input
            type="checkbox"
            checked={showCritical}
            onChange={(e) => setShowCritical(e.target.checked)}
            className="accent-danger"
          />
          ⚠ Unit Kritis (gangguan + tidak update)
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FRESHNESS_OPTIONS.map((opt) => {
          const active = freshnessFilters.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleFreshnessToggle(opt.key)}
              className={`rounded-lg border px-3 py-2 text-[13px] font-semibold ${opt.classes} ${active ? 'border-brand shadow-sm' : 'border-border bg-panel'}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="text-[12px] text-textDim mb-2.5">{filtered.length} dari {records.length} unit ditampilkan</div>

      <div className="max-h-[560px] overflow-auto border border-borderSoft rounded-lg">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
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
            {filtered.slice(0, 500).map((r, i) => {
              const needsAttention = r.isFault && (r.freshness === 'notUpdate' || r.freshness === 'outOfService');
              return (
                <tr
                  key={i}
                  className={`group ${needsAttention ? 'border-l-4 border-danger/70 bg-danger/10' : r.isFault ? 'bg-danger/10' : r.freshness === 'notUpdate' ? 'bg-warn/10' : r.freshness === 'outOfService' ? 'bg-[#A855F7]/10' : ''}`}
                >
                  <td className="px-2.5 py-2 border-b border-borderSoft font-mono align-top">
                    {needsAttention && <span className="mr-1 text-danger">⚠️</span>}
                    {r.number ?? ''}
                  </td>
                  <td className="px-2.5 py-2 border-b border-borderSoft font-mono font-semibold align-top">{r.vehicle}</td>
                  <td className="px-2.5 py-2 border-b border-borderSoft align-top">{r.project}</td>
                  <td className="px-2.5 py-2 border-b border-borderSoft align-top">{r.company}</td>
                  <td className="px-2.5 py-2 border-b border-borderSoft font-mono align-top">
                    {r.posTime ? new Date(r.posTime).toLocaleString('id-ID') : '—'}
                  </td>
                  <td className="px-2.5 py-2 border-b border-borderSoft font-mono text-[13px] align-top">
                    {daysLabel(r.staleDays)}
                  </td>
                  <td className="px-2.5 py-2 border-b border-borderSoft align-top">
                    <StatusTag r={r} />
                    {r.alarm && <div className="mt-1 text-textDim">{r.alarm}</div>}
                  </td>
                  <td className="px-2.5 py-2 border-b border-borderSoft align-top text-textDim">{r.status}</td>
                  <td className="px-2.5 py-2 border-b border-borderSoft align-top text-textDim max-w-[220px]">{r.position || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
