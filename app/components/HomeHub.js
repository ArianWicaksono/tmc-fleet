'use client';

const MODULES = [
  {
    key: 'dashboard',
    name: 'Dashcam Monitoring',
    desc: 'Kesegaran update, gangguan perangkat, peta sebaran, dan tren harian armada dashcam/GPS.',
    grad: 'linear-gradient(135deg, #6EA8FF, #2563EB)',
    initial: 'D',
    status: 'Aktif',
  },
  {
    key: 'gps',
    name: 'GPS Update',
    desc: 'Live dari vendor VTS: unit GPS yang tidak update, distribusi lama offline, dan daftar detail armada.',
    grad: 'linear-gradient(135deg, #34D399, #059669)',
    initial: 'G',
    status: 'Aktif',
  },
  {
    key: 'tickets',
    name: 'Tiket Report',
    desc: 'Permintaan user: pindah, update, aktivasi, nonaktif perangkat — lengkap dengan alurnya.',
    grad: 'radial-gradient(circle at 30% 30%, #FFA94D, #F5821F)',
    initial: 'T',
    status: 'Aktif',
  },
  // {
  //   key: 'master',
  //   name: 'Master Data',
  //   desc: 'Referensi armada: VHCID, nopol, branch, project, nomor rangka, dan produk.',
  //   grad: 'linear-gradient(135deg, #4ADE80, #16A34A)',
  //   initial: 'M',
  //   status: 'Aktif',
  // },
  {
    key: 'safety',
    name: 'Safety Report',
    desc: 'Data pelanggaran driver untuk laporan keselamatan (dalam perencanaan).',
    grad: 'linear-gradient(135deg, #C084FC, #9333EA)',
    initial: 'S',
    status: 'On-Progres',
  },
];

const MONITOR = MODULES.filter((m) => m.key !== 'master');
const REFERENCE = MODULES.filter((m) => m.key === 'master');

function ModuleCard({ m, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(m.key)}
      className={`group bg-panel border border-border rounded-[12px] p-5 text-left hover:border-brand/50 hover:bg-panelAlt/50 transition-colors ${
        m.status === 'Rencana' ? 'opacity-75' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center font-display font-bold text-[15px] text-white shrink-0 shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
          style={{ background: m.grad }}
        >
          {m.initial}
        </div>
        <span
          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
            m.status === 'Aktif' ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn'
          }`}
        >
          {m.status}
        </span>
      </div>
      <div className="font-display font-bold text-[15px] mt-3">{m.name}</div>
      <div className="text-[12.5px] text-textDim mt-1 leading-relaxed">{m.desc}</div>
      <div
        className={`text-[12px] font-semibold mt-3 ${
          m.status === 'Aktif' ? 'text-brand' : 'text-textFaint'
        }`}
      >
        {m.status === 'Aktif' ? 'Buka Modul →' : 'Dalam Perencanaan'}
      </div>
    </button>
  );
}

export default function HomeHub({ onNavigate }) {
  return (
    <div>
      <div className="bg-panel border border-border rounded-[10px] p-6 mb-6">
        <div className="font-display font-bold text-[20px]">
          Monev Armada — Pusat Aplikasi
        </div>
        <div className="text-[13px] text-textDim mt-1 max-w-[640px] leading-relaxed">
          Satu platform untuk monitoring dashcam/GPS, pelacakan permintaan perangkat, dan (nanti)
          laporan keselamatan. Pilih modul di bawah atau gunakan navigasi di bar atas.
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[11.5px] text-textFaint font-bold uppercase tracking-wide mb-2.5">
          Monitoring
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MONITOR.map((m) => (
            <ModuleCard key={m.key} m={m} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* <div>
        <div className="text-[11.5px] text-textFaint font-bold uppercase tracking-wide mb-2.5">
          Referensi
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REFERENCE.map((m) => (
            <ModuleCard key={m.key} m={m} onNavigate={onNavigate} />
          ))}
        </div>
      </div> */}
    </div>
  );
}
