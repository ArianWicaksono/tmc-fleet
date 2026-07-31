'use client';

import { timeAgoLabel } from '../../lib/parseWorkbook';

const STYLE = {
  notUpdate: { label: 'NOT UPDATE (7-30 hari)', border: 'border-l-warn', badge: 'bg-warn/15 text-warn' },
  outOfService: { label: 'OUT OF SERVICE (>30 hari)', border: 'border-l-[#A855F7]', badge: 'bg-[#A855F7]/15 text-[#A855F7]' },
};

export default function Watchlist({ records }) {
  const watch = records
    .filter((r) => r.freshness !== 'update')
    .sort((a, b) => b.staleDays - a.staleDays)
    .slice(0, 8);

  if (!watch.length) {
    return (
      <div className="text-[12.5px] text-textDim">
        Tidak ada unit yang tergolong lama tidak update — semua unit masih dalam kategori UPDATE (&lt;7 hari). Bagus.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {watch.map((r, i) => {
        const st = STYLE[r.freshness] || STYLE.notUpdate;
        return (
          <div key={i} className={`bg-panelAlt border border-borderSoft border-l-[3px] ${st.border} rounded-lg p-2.5 text-[12.5px]`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono font-semibold text-[13px]">{r.vehicle}</div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${st.badge}`}>{st.label}</span>
            </div>
            <div className="text-textDim mt-0.5">{r.project}{r.company ? ` · ${r.company}` : ''}</div>
            <div className="text-textDim mt-0.5">Terakhir update: {timeAgoLabel(r.staleMs)} lalu</div>
          </div>
        );
      })}
    </div>
  );
}
