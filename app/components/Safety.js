'use client';

export default function Safety() {
  return (
    <div>
      <div className="bg-panel border border-border rounded-[10px] p-6 mb-5">
        <div className="font-display font-bold text-[16px] mb-1">Safety Report</div>
        <div className="text-[13px] text-textDim leading-relaxed">
          Modul ini masih dalam tahap perencanaan dan akan dibangun pada fase berikutnya.
        </div>
      </div>

      <div className="bg-panel border border-border rounded-[10px] p-5">
        <div className="font-display font-bold text-[15px] mb-3">Rencana Fitur</div>
        <ul className="space-y-2 text-[13px] text-textDim">
          <li className="flex gap-2">
            <span className="text-brand shrink-0">•</span>
            Rekap pelanggaran driver (kecepatan, SOP, dll.) per unit dan per pengemudi.
          </li>
          <li className="flex gap-2">
            <span className="text-brand shrink-0">•</span>
            Tren pelanggaran per periode untuk laporan keselamatan.
          </li>
          <li className="flex gap-2">
            <span className="text-brand shrink-0">•</span>
            Menggunakan master data <b className="text-text">vehicles_id</b> sebagai referensi.
          </li>
          <li className="flex gap-2">
            <span className="text-brand shrink-0">•</span>
            Prasyarat: login + RLS diaktifkan karena data bersifat sensitif.
          </li>
        </ul>
      </div>
    </div>
  );
}
