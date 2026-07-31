'use client';

const SEGMENTS = [
  { key: 'outOfService', label: 'OUT OF SERVICE (>30 hari)', bar: 'bg-[#A855F7]' },
  { key: 'notUpdate', label: 'NOT UPDATE (7-30 hari)', bar: 'bg-warn' },
  { key: 'update', label: 'UPDATE (<7 hari)', bar: 'bg-ok' },
];

export default function StatusBoard({ records }) {
  const byProject = {};
  records.forEach((r) => {
    byProject[r.project] = byProject[r.project] || [];
    byProject[r.project].push(r);
  });
  const projects = Object.keys(byProject).sort();

  return (
    <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
      <div className="font-display font-bold text-[15px]">Kesegaran Update per Proyek</div>
      <div className="text-[12.5px] text-textDim mb-4">
        Proporsi unit per kategori kesegaran update (total 100%) — jumlah gangguan perangkat ditampilkan di kolom kanan.
      </div>

      {projects.length === 0 && <div className="text-[12.5px] text-textDim">Tidak ada data.</div>}

      {projects.map((proj) => {
        const rs = byProject[proj];
        const total = rs.length;
        const counts = { outOfService: 0, notUpdate: 0, update: 0 };
        rs.forEach((r) => {
          if (counts[r.freshness] !== undefined) counts[r.freshness]++;
        });
        const fault = rs.filter((r) => r.isFault).length;
        return (
          <div key={proj} className="flex items-center gap-3.5 py-2.5 border-b border-borderSoft last:border-b-0">
            <div className="w-[190px] shrink-0 text-[13px] font-semibold">{proj}</div>
            <div className="flex-1 h-[22px] rounded-[5px] overflow-hidden flex bg-panelAlt border border-borderSoft">
              {SEGMENTS.map((s) => (
                <div key={s.key} className={`h-full ${s.bar}`} style={{ width: `${total ? (counts[s.key] / total) * 100 : 0}%` }} />
              ))}
            </div>
            <div className="w-[150px] text-right font-mono text-[12px] text-textDim shrink-0">
              <b className="text-text">{total}</b> unit
              {fault > 0 ? <> · <b className="text-danger">{fault}</b> gangguan</> : ''}
            </div>
          </div>
        );
      })}

      <div className="flex gap-4 mt-3.5 flex-wrap">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[12px] text-textDim">
            <span className={`w-2.5 h-2.5 rounded-[3px] ${s.bar} inline-block`} /> {s.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[12px] text-textDim">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-danger inline-block" /> Gangguan perangkat (jumlah di kolom kanan)
        </div>
      </div>
    </div>
  );
}
