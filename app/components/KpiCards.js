'use client';

import { fmtDateHuman } from '../../lib/parseWorkbook';

export default function KpiCards({ kpis, currentDate }) {
  const pct = (n) => (kpis.total ? Math.round((n / kpis.total) * 100) : 0);

  const cards = [
    { label: 'Total Armada Terpantau', value: kpis.total, sub: `pada ${fmtDateHuman(currentDate)}`, color: 'text-text' },
    { label: 'UPDATE (<7 hari)', value: kpis.updateCount, sub: `${pct(kpis.updateCount)}% dari total armada`, color: 'text-ok' },
    { label: 'NOT UPDATE (7-30 hari)', value: kpis.notUpdateCount, sub: `${pct(kpis.notUpdateCount)}% dari total armada`, color: 'text-warn' },
    { label: 'OUT OF SERVICE (>30 hari)', value: kpis.outOfServiceCount, sub: `${pct(kpis.outOfServiceCount)}% dari total armada`, color: 'text-[#A855F7]' },
    { label: 'Gangguan Perangkat', value: kpis.faultCount, sub: `${pct(kpis.faultCount)}% dari total armada`, color: 'text-danger' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-5">
      {cards.map((c) => (
        <div key={c.label} className="bg-panel border border-border rounded-[10px] p-4">
          <div className="text-[12px] text-textDim font-semibold uppercase tracking-wide">{c.label}</div>
          <div className={`font-display text-3xl font-bold mt-2 ${c.color}`}>{c.value}</div>
          <div className="text-[12px] text-textFaint mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
