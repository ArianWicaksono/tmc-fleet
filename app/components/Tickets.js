'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadTickets,
  loadTicketEvents,
  createTicket,
  updateTicketStatus,
} from '../../lib/supabaseClient';

const STATUS = {
  baru:     { label: 'Baru',           dot: 'bg-info' },
  diproses: { label: 'Diproses',       dot: 'bg-warn' },
  menunggu: { label: 'Konfirmasi User',  dot: 'bg-[#A855F7]' },
  selesai:  { label: 'Selesai',        dot: 'bg-ok' },
  batal:    { label: 'Batal',          dot: 'bg-danger' },
};

const STATUS_ORDER = ['baru', 'diproses', 'menunggu', 'selesai', 'batal'];

const NEXT = {
  baru:     ['diproses', 'menunggu', 'selesai', 'batal'],
  diproses: ['menunggu', 'selesai', 'batal'],
  menunggu: ['diproses', 'selesai'],
  selesai:  [],
  batal:    [],
};

const PERANGKAT = ['GPS', 'Dashcam'];
const AKSI = ['Pindah', 'Update', 'Aktivasi', 'Nonaktif'];
const PRIORITAS = ['Rendah', 'Sedang', 'Tinggi'];

const AGING_WARN = 7;
const AGING_CRIT = 30;

const chipCls = 'rounded-lg px-3 py-2 text-[12px] font-semibold border text-left';

const STATUS_BTN = {
  diproses: 'bg-warn/15 text-warn border-warn/40 hover:bg-warn/25',
  menunggu: 'bg-[#A855F7]/15 text-[#C084FC] border-[#A855F7]/40 hover:bg-[#A855F7]/25',
  selesai: 'bg-ok/15 text-ok border-ok/40 hover:bg-ok/25',
  batal: 'bg-danger/15 text-danger border-danger/40 hover:bg-danger/25',
};

const inputCls =
  'bg-panelAlt border border-border rounded-lg px-3 py-2 text-[13px] w-full outline-none focus:border-brand';

const perangkatCls = {
  GPS: 'bg-info/15 text-info',
  Dashcam: 'bg-warn/15 text-warn',
};

const prioCls = {
  Rendah: 'bg-panelAlt text-textDim',
  Sedang: 'bg-[#A855F7]/15 text-[#C084FC]',
  Tinggi: 'bg-danger/15 text-danger',
};

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days} hari`;
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h} jam`;
  const m = Math.floor(ms / 60000);
  if (m >= 1) return `${m} menit`;
  return 'baru saja';
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function splitUnits(unit) {
  return String(unit || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ageWarn(createdAt, status) {
  if (status === 'selesai' || status === 'batal') return null;
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days >= AGING_CRIT) return { days, level: 'crit' };
  if (days >= AGING_WARN) return { days, level: 'warn' };
  return null;
}

const EMPTY_FORM = {
  perangkat: 'GPS',
  aksi: 'Pindah',
  unit: '',
  judul: '',
  pengaju: '',
  kontak: '',
  prioritas: 'Sedang',
  deskripsi: '',
};

function UnitChips({ unit, limit }) {
  const units = splitUnits(unit);
  if (!units.length) return <span className="text-textFaint">—</span>;
  const shown = limit ? units.slice(0, limit) : units;
  const rest = units.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((u, i) => (
        <span
          key={`${u}-${i}`}
          className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-panel border border-borderSoft text-text"
        >
          {u}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-panelAlt text-textDim">
          +{rest}
        </span>
      )}
    </div>
  );
}

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [flash, setFlash] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [dragOverCol, setDragOverCol] = useState(null);
  const dragId = useRef(null);
  const wasDrag = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await loadTickets();
      setTickets(data || []);
      setErr('');
    } catch (e) {
      console.error(e);
      setErr(
        'Gagal memuat tiket. Pastikan tabel dibuat (supabase/requests.sql) dan migrasi nomor tiket dijalankan (supabase/requests_ticket_no.sql).'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function loadEventsFor(ticketId) {
    try {
      setEvents(await loadTicketEvents(ticketId));
    } catch (e) {
      console.error(e);
      setEvents([]);
    }
  }

  async function openDetail(t) {
    setSelected(t);
    await loadEventsFor(t.id);
  }

  function closeDetail() {
    setSelected(null);
    setEvents([]);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.unit.trim() && !form.judul.trim()) {
      setErr('Isi minimal Judul atau minimal 1 Unit.');
      return;
    }
    setErr('');
    try {
      const units = splitUnits(form.unit);
      const created = await createTicket({
        ...form,
        unit: units.join('\n'),
        status: 'baru',
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setFlash(`Tiket ${created.ticket_no} berhasil dibuat.`);
      setTimeout(() => setFlash(''), 4000);
      await refresh();
      await openDetail(created);
    } catch (err2) {
      console.error(err2);
      setErr('Gagal menyimpan tiket: ' + err2.message);
    }
  }

  async function move(id, next) {
    try {
      await updateTicketStatus(id, next);
      setFlash(`Status → ${STATUS[next].label}.`);
      setTimeout(() => setFlash(''), 3000);
      await refresh();
      if (selected && selected.id === id) {
        const now = new Date().toISOString();
        setSelected({
          ...selected,
          status: next,
          updated_at: now,
          resolved_at: next === 'selesai' || next === 'batal' ? now : null,
        });
        await loadEventsFor(id);
      }
    } catch (e) {
      console.error(e);
      setErr('Gagal mengubah status: ' + e.message);
    }
  }

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const counts = STATUS_ORDER.reduce(
    (acc, k) => ((acc[k] = tickets.filter((t) => t.status === k).length), acc),
    {}
  );

  const byPerangkat = PERANGKAT.map((p) => ({
    key: p,
    n: tickets.filter((t) => t.perangkat === p).length,
  }));
  const byAksi = AKSI.map((a) => ({
    key: a,
    n: tickets.filter((t) => t.aksi === a).length,
  }));

  const columns = STATUS_ORDER.filter(
    (s) => filterStatus === 'all' || filterStatus === s
  );

  return (
    <div>
      {/* Header + form */}
      <div className="bg-panel border border-border rounded-[10px] p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="font-display font-bold text-[15px]">
              Tiket (Report) — Monev Permintaan User
            </div>
            <div className="text-[12.5px] text-textDim mt-0.5">
              Catat & proses permintaan GPS/Dashcam (pindah, update, aktivasi,
              nonaktif) — bisa banyak unit sekaligus. Seret kartu antar kolom
              untuk ubah status.
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-brand text-[#1A0E00] rounded-lg px-3.5 py-2 text-[13px] font-semibold hover:bg-[#FF9640]"
          >
            + Tambah Tiket
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-borderSoft pt-5">
            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">Perangkat</label>
              <select className={inputCls} value={form.perangkat} onChange={(e) => set('perangkat', e.target.value)}>
                {PERANGKAT.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">Aksi</label>
              <select className={inputCls} value={form.aksi} onChange={(e) => set('aksi', e.target.value)}>
                {AKSI.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">Prioritas</label>
              <select className={inputCls} value={form.prioritas} onChange={(e) => set('prioritas', e.target.value)}>
                {PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">
                Unit / Kendaraan <span className="text-textFaint font-normal">— bisa banyak, pisahkan koma</span>
              </label>
              <input
                className={inputCls}
                value={form.unit}
                placeholder="B 1234 XYZ, DD 8021 AA, CTS038 / DD 8021 AA"
                onChange={(e) => set('unit', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">Judul / Topik</label>
              <input
                className={inputCls}
                value={form.judul}
                placeholder="mis. Pindah dashcam dari unit A ke unit B"
                onChange={(e) => set('judul', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">Pengaju</label>
              <input
                className={inputCls}
                value={form.pengaju}
                placeholder="Nama / user"
                onChange={(e) => set('pengaju', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">Kontak</label>
              <input
                className={inputCls}
                value={form.kontak}
                placeholder="No HP (opsional)"
                onChange={(e) => set('kontak', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11.5px] text-textDim font-semibold mb-1.5">Deskripsi</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                value={form.deskripsi}
                placeholder="Detail permintaan / alamat / kendala..."
                onChange={(e) => set('deskripsi', e.target.value)}
              />
            </div>

            <div className="flex items-end justify-end gap-2 pb-0.5">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-[13px] font-semibold text-textDim hover:text-text rounded-lg border border-border">
                Batal
              </button>
              <button type="submit" className="bg-brand text-[#1A0E00] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#FF9640]">
                Simpan
              </button>
            </div>
          </form>
        )}

        {flash && (
          <div className="mt-5 text-[12.5px] text-ok font-semibold">{flash}</div>
        )}
        {err && (
          <div className="mt-5 text-[12.5px] text-danger font-semibold">{err}</div>
        )}
      </div>

      {/* Filter status */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 mb-5">
        <button
          onClick={() => setFilterStatus('all')}
          className={`${chipCls} ${filterStatus === 'all' ? 'bg-brand text-[#1A0E00] border-brand' : 'bg-panel text-text border-border'}`}
        >
          Semua · {tickets.length}
        </button>
        {STATUS_ORDER.map((k) => (
          <button
            key={k}
            onClick={() => setFilterStatus(k)}
            className={`${chipCls} ${
              filterStatus === k
                ? 'bg-brand text-[#1A0E00] border-brand'
                : 'bg-panel text-textDim border-border'
            }`}
          >
            {STATUS[k].label} · {counts[k]}
          </button>
        ))}
      </div>

      {/* Ringkasan jenis */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-[12px] text-textDim font-semibold self-center mr-1">Perangkat:</span>
        {byPerangkat.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full font-semibold bg-panelAlt text-text">
            {p.key} <span className="text-textDim font-bold">{p.n}</span>
          </span>
        ))}
        <span className="text-[12px] text-textDim font-semibold self-center mx-2">·</span>
        <span className="text-[12px] text-textDim font-semibold self-center mr-1">Aksi:</span>
        {byAksi.map((a) => (
          <span key={a.key} className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full font-semibold bg-panelAlt text-text">
            {a.key} <span className="text-textDim font-bold">{a.n}</span>
          </span>
        ))}
      </div>

      {/* Kanban per status */}
      {loading ? (
        <div className="text-[13px] text-textDim">Memuat tiket…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {columns.map((s) => {
            const cards = tickets.filter((t) => t.status === s);
            return (
              <div
                key={s}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(s);
                }}
                onDragLeave={() => setDragOverCol((c) => (c === s ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  if (dragId.current) move(dragId.current, s);
                }}
                className={`bg-panel border border-border rounded-[10px] p-3 transition-shadow ${
                  dragOverCol === s ? 'ring-2 ring-brand/50 border-brand/40' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS[s].dot}`} />
                  <span className="font-semibold text-[13px]">{STATUS[s].label}</span>
                  <span className="text-[12px] text-textDim ml-auto">{cards.length}</span>
                </div>
                {cards.length === 0 ? (
                  <div className="text-[12px] text-textFaint text-center py-4 border border-dashed border-borderSoft rounded-lg">
                    Kosong
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {cards.map((t) => {
                      const aging = ageWarn(t.created_at, t.status);
                      return (
                        <div
                          key={t.id}
                          draggable
                          onMouseDown={() => { wasDrag.current = false; }}
                          onDragStart={() => { dragId.current = t.id; }}
                          onDragEnd={() => { dragId.current = null; wasDrag.current = true; }}
                          onClick={() => {
                            if (wasDrag.current) { wasDrag.current = false; return; }
                            openDetail(t);
                          }}
                          className="bg-panelAlt border border-borderSoft rounded-lg p-2.5 text-[12px] cursor-grab active:cursor-grabbing hover:border-brand/40"
                        >
                          {t.ticket_no && (
                            <div className="font-mono text-[10.5px] font-bold text-brand mb-1">
                              {t.ticket_no}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${prioCls[t.prioritas] || prioCls.Sedang}`}>
                              {t.prioritas}
                            </span>
                            <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${perangkatCls[t.perangkat] || perangkatCls.GPS}`}>
                              {t.perangkat}
                            </span>
                            <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-[#A855F7]/15 text-[#C084FC]">
                              {t.aksi}
                            </span>
                          </div>
                          <div className="font-semibold text-[13px] mt-1.5">
                            {t.judul || '(tanpa judul)'}
                          </div>
                          <div className="mt-1">
                            <UnitChips unit={t.unit} limit={3} />
                          </div>
                          <div className="text-textDim mt-1">
                            {t.pengaju ? `Pengaju: ${t.pengaju}` : ''}
                          </div>
                          <div className="text-textFaint mt-1.5">
                            Dibuat {timeAgo(t.created_at)} lalu
                          </div>
                          {aging && (
                            <div
                              className={`mt-1 font-semibold text-[11px] ${
                                aging.level === 'crit' ? 'text-danger' : 'text-warn'
                              }`}
                            >
                              ⚠ {aging.level === 'crit' ? 'LEWAT 30 hari!' : `>${AGING_WARN} hari`} ({aging.days} hari)
                            </div>
                          )}
                          {NEXT[s].length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {NEXT[s].map((n) => (
                                <button
                                  key={n}
                                  onClick={(ev) => { ev.stopPropagation(); move(t.id, n); }}
                                  className={`px-2 py-0.5 rounded font-semibold text-[11px] border ${STATUS_BTN[n]}`}
                                >
                                  → {STATUS[n].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Popup detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={closeDetail} />
          <div className="relative bg-panel border border-border rounded-[14px] max-w-[560px] w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-borderSoft">
              <div>
                <div className="font-mono text-[13px] font-bold text-brand">
                  {selected.ticket_no || '—'}
                </div>
                <div className="font-display font-bold text-[17px] mt-1">
                  {selected.judul || '(tanpa judul)'}
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="text-[22px] leading-none text-textDim hover:text-text"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full font-semibold bg-panelAlt text-text">
                  <span className={`w-2 h-2 rounded-full ${STATUS[selected.status].dot}`} />
                  {STATUS[selected.status].label}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${prioCls[selected.prioritas] || prioCls.Sedang}`}>
                  {selected.prioritas}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${perangkatCls[selected.perangkat] || perangkatCls.GPS}`}>
                  {selected.perangkat}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#A855F7]/15 text-[#C084FC]">
                  {selected.aksi}
                </span>
              </div>

              <div>
                <div className="text-[11px] text-textFaint font-bold uppercase tracking-wide mb-1.5">
                  Unit ({splitUnits(selected.unit).length})
                </div>
                <UnitChips unit={selected.unit} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-[11px] text-textFaint font-semibold">Pengaju</div>
                  <div className="text-text mt-0.5">{selected.pengaju || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-textFaint font-semibold">Kontak</div>
                  <div className="text-text mt-0.5">{selected.kontak || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-textFaint font-semibold">Dibuat</div>
                  <div className="text-text mt-0.5">{fmtTime(selected.created_at)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-textFaint font-semibold">
                    {selected.resolved_at ? 'Selesai/Batal' : 'Terakhir diubah'}
                  </div>
                  <div className="text-text mt-0.5">{fmtTime(selected.resolved_at || selected.updated_at)}</div>
                </div>
              </div>

              {selected.deskripsi && (
                <div>
                  <div className="text-[11px] text-textFaint font-bold uppercase tracking-wide mb-1.5">Deskripsi</div>
                  <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">{selected.deskripsi}</div>
                </div>
              )}

              <div>
                <div className="text-[11px] text-textFaint font-bold uppercase tracking-wide mb-1.5">
                  Riwayat Penanganan
                </div>
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <div className="text-[12px] text-textFaint">Belum ada riwayat.</div>
                  ) : (
                    events.map((ev, i) => (
                      <div key={ev.id || i} className="flex gap-2.5 text-[12.5px]">
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${STATUS[ev.status]?.dot || 'bg-border'}`} />
                        <div>
                          <div className="text-text">
                            {STATUS[ev.status]?.label || ev.status}
                            {ev.note ? <span className="text-textDim"> · {ev.note}</span> : null}
                          </div>
                          <div className="text-textFaint text-[11px]">{fmtTime(ev.created_at)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {NEXT[selected.status].length > 0 && (
              <div className="px-5 py-4 border-t border-borderSoft flex flex-wrap gap-2">
                <span className="text-[12px] text-textDim self-center font-semibold mr-1">Ubah status:</span>
                {NEXT[selected.status].map((n) => (
                  <button
                    key={n}
                    onClick={() => move(selected.id, n)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-[12px] border ${STATUS_BTN[n]}`}
                  >
                    → {STATUS[n].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
