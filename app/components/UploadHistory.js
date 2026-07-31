'use client';

import { fmtDateHuman } from '../../lib/parseWorkbook';

export default function UploadHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
        <div className="font-display font-bold text-[15px] mb-2">Riwayat Upload</div>
        <div className="text-[12.5px] text-textDim">Belum ada file yang diunggah pada sesi ini.</div>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
      <div className="font-display font-bold text-[15px] mb-4">Riwayat Upload</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[12.5px] border-separate border-spacing-y-2">
          <thead>
            <tr className="text-textDim uppercase tracking-wide text-[10px]">
              <th className="pb-2 pr-3">Waktu</th>
              <th className="pb-2 pr-3">File</th>
              <th className="pb-2 pr-3">Tanggal laporan</th>
              <th className="pb-2 pr-3">Proyek</th>
              <th className="pb-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.file_hash} className="border-t border-borderSoft">
                <td className="py-3 pr-3 text-textDim">{item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '—'}</td>
                <td className="py-3 pr-3 font-medium">{item.filename}</td>
                <td className="py-3 pr-3">{item.report_date ? fmtDateHuman(item.report_date) : '—'}</td>
                <td className="py-3 pr-3">{item.project_names?.join(', ') || '—'}</td>
                <td className="py-3 pr-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${item.status === 'duplicate' ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}>
                    {item.status === 'duplicate' ? 'Duplikat' : 'Berhasil'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
