import * as XLSX from 'xlsx';

export const STALE_HOURS = 2; // legacy, kept for watchlist threshold
const FAULT_ALARMS = ['video lost', 'storage unit fault'];

// New day-based categories (user requested):
// - UPDATE: < 7 hari
// - NOT_UPDATE: 7 - 30 hari
// - OUT_OF_SERVICE: > 30 hari
export const DAY_MS = 24 * 60 * 60 * 1000;

export const DAY_CATEGORY_LABELS = {
  update: 'UPDATE',
  notUpdate: 'NOT UPDATE',
  outOfService: 'OUT OF SERVICE',
};

export function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function fmtDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function fmtDateHuman(dstr) {
  if (!dstr) return '';
  const [y, m, d] = dstr.split('-');
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d + ' ' + bulan[parseInt(m, 10) - 1] + ' ' + y;
}

// Nama file mengikuti pola vendor: "...-DDMMYYYY.xlsx"
export function extractDateFromFilename(name) {
  const m = name.match(/(\d{2})(\d{2})(\d{4})\.xlsx?$/i);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

// Konversi serial Excel (jumlah hari sejak 1899-12-30) menjadi Date.
function excelSerialToDate(num) {
  const ms = Math.round((num - 25569) * 86400000);
  return new Date(ms);
}

export function parsePositioningTime(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  if (typeof val === 'number') {
    const d = excelSerialToDate(val);
    return isNaN(d) ? null : d;
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    return new Date(
      parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]),
      parseInt(m[4]), parseInt(m[5]), parseInt(m[6])
    );
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export function isFaultAlarm(alarmStr) {
  if (!alarmStr) return false;
  const low = String(alarmStr).toLowerCase();
  return FAULT_ALARMS.some((k) => low.includes(k));
}

export function hasSafetyAlarm(alarmStr) {
  if (!alarmStr) return false;
  return /emergency|rollover|abnormality|seat belt|collision|over speed|departure alarm|distance too close|occlusion|receive call/i.test(
    alarmStr
  );
}

export function parseCoords(pos) {
  if (!pos) return null;
  const s = String(pos).trim();
  const m = s.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (!m) return null;
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

export function getDayCategory(staleDays) {
  if (staleDays === null || staleDays === undefined || staleDays === Infinity) return 'outOfService';
  if (staleDays > 30) return 'outOfService';
  if (staleDays >= 7) return 'notUpdate';
  return 'update';
}

export const UNIT_STATUS_LABELS = {
  fault: 'Gangguan Perangkat',
  outOfService: 'OUT OF SERVICE (>30 hari)',
  notUpdate: 'NOT UPDATE (7-30 hari)',
  update: 'UPDATE (<7 hari)',
};

// Status eksklusif per unit, dipakai bersama oleh semua visual ringkasan
// (kartu KPI, status board, grafik tren, dan doughnut).
// Prioritas: gangguan perangkat > out of service > not update > update.
export function getUnitStatus({ isFault, freshness }) {
  if (isFault) return 'fault';
  if (freshness === 'outOfService') return 'outOfService';
  if (freshness === 'notUpdate') return 'notUpdate';
  return 'update';
}

export function daysLabel(d) {
  if (d === Infinity || d === null || d === undefined) return 'tidak ada data';
  if (d === 0) return '0 hari';
  return `${d} hari`;
}

export function timeAgoLabel(ms) {
  if (ms === Infinity || ms === null || ms === undefined) return 'tidak ada data';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins + ' menit';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + ' jam';
  const days = Math.floor(hrs / 24);
  return days + ' hari ' + (hrs % 24) + ' jam';
}

// ---------------------------------------------------------------------------
// Deteksi & pemetaan kolom berbasis header.
// Tujuannya agar parser kebal terhadap pergeseran kolom: vendor bisa menyisipkan
// kolom info tambahan, urutan bisa berubah, dan nama header boleh sedikit
// bervariasi — selama ada baris header, kolom tetap terpetakan dengan benar.
// ---------------------------------------------------------------------------

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Alias nama kolom. Field yang lebih spesifik dicocokkan lebih dulu (FIELD_ORDER)
// agar tidak saling rebut — mis. "Positioning Time" vs "Position",
// atau "Vehicle Number" vs kolom "No".
const HEADER_ALIASES = {
  vehicle: ['vehicle', 'kendaraan', 'novehicle', 'nomorkendaraan', 'plat', 'plateno', 'unit'],
  company: ['company', 'perusahaan', 'client', 'customer', 'vendor', 'konsumen'],
  positioning: ['positioning', 'positioningtime', 'positiontime', 'gpstime', 'updatetime', 'lastupdate', 'timestamp', 'waktu', 'time'],
  alarm: ['alarm'],
  status: ['status'],
  position: ['position', 'location', 'coordinate', 'coordinates', 'posisi', 'lokasi', 'gps', 'alamat', 'address'],
  number: ['no', 'number', 'nomor', 'unitno', 'unitnumber', 'index', 'nohp'],
};

const FIELD_ORDER = ['vehicle', 'positioning', 'company', 'alarm', 'status', 'position', 'number'];

// Cari baris header dalam beberapa baris pertama (menoleransi baris judul di atasnya).
// Baris dianggap header bila memuat minimal 2 nama kolom yang dikenali.
function findHeaderRow(rows) {
  const keywords = ['vehicle', 'kendaraan', 'positioning', 'position', 'company', 'perusahaan', 'alarm', 'status', 'plat', 'number', 'nomor', 'no'];
  for (let i = 0; i < rows.length && i < 20; i++) {
    const row = rows[i];
    if (!row) continue;
    const cells = row.map(normalizeHeader);
    const hits = cells.filter((c) => keywords.some((k) => c.includes(k))).length;
    if (hits >= 2) return i;
  }
  return -1;
}

function detectColumnMap(headers) {
  const normHeaders = headers.map(normalizeHeader);
  const rawHeaders = headers.map((v) => String(v ?? '').trim());
  const map = {};
  const used = new Set();

  FIELD_ORDER.forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    for (let i = 0; i < normHeaders.length; i++) {
      if (used.has(i)) continue;
      const n = normHeaders[i];
      const raw = rawHeaders[i];
      if (field === 'positioning' && (n.includes('by') || n.includes('user') || n.includes('pic'))) continue;
      if (field === 'number') {
        // Kolom nomor dicocokkan secara eksak agar tidak menyerobot "Vehicle Number".
        if (raw === '#' || aliases.includes(n)) {
          map[field] = i;
          used.add(i);
          break;
        }
      } else if (n && aliases.some((a) => n.includes(a))) {
        map[field] = i;
        used.add(i);
        break;
      }
    }
  });
  return map;
}

// Posisi kolom default bila header tidak terdeteksi (template lama):
// Number, Vehicle Number, Company, Positioning Time, Alarm, Status, Position.
const FALLBACK_COL_MAP = { number: 0, vehicle: 1, company: 2, positioning: 3, alarm: 4, status: 5, position: 6 };

// Mem-parsing satu file .xlsx (ArrayBuffer) menjadi { projectName: records[] }.
// Posisi kolom dideteksi dari baris header (lihat detectColumnMap).
export function parseWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const projects = {};
  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, cellDates: true });
    if (!rows || rows.length < 1) return;

    const hIdx = findHeaderRow(rows);
    let colMap;
    let startRow;
    if (hIdx >= 0) {
      colMap = detectColumnMap(rows[hIdx]);
      startRow = hIdx + 1;
    } else {
      colMap = FALLBACK_COL_MAP;
      startRow = 0;
    }

    if (colMap.vehicle === undefined) {
      console.warn(`[parseWorkbook] Kolom kendaraan tidak ditemukan pada sheet "${sheetName}" — dilewati.`);
      return;
    }
    if (colMap.positioning === undefined) {
      console.warn(`[parseWorkbook] Kolom "Positioning Time" tidak ditemukan pada sheet "${sheetName}" — unit dianggap tanpa waktu update.`);
    }
    if (hIdx >= 0) {
      console.info(`[parseWorkbook] "${sheetName}": pemetaan kolom =`, colMap);
    }

    const records = [];
    for (let i = startRow; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every((c) => c === null || c === '')) continue;
      const get = (field) => (colMap[field] !== undefined ? r[colMap[field]] : undefined);
      const vehicle = get('vehicle');
      if (vehicle === undefined || vehicle === null || String(vehicle).trim() === '') continue;
      const number = get('number');
      const company = get('company') != null ? String(get('company')) : '';
      const posTime = parsePositioningTime(get('positioning'));
      const alarm = get('alarm') != null ? String(get('alarm')) : '';
      const status = get('status') != null ? String(get('status')) : '';
      const position = get('position') != null ? String(get('position')) : '';
      records.push({
        number,
        vehicle: String(vehicle),
        company,
        posTime: posTime ? posTime.getTime() : null,
        alarm,
        status,
        position,
      });
    }
    if (records.length) projects[sheetName] = records;
  });
  return projects;
}

// Meratakan seluruh proyek dalam satu snapshot tanggal menjadi satu array record,
// sambil menghitung status turunan (fault / stale / safety alarm) per unit.
export function flattenSnapshot(snapshot) {
  if (!snapshot || !snapshot.projects) return [];
  const out = [];
  Object.keys(snapshot.projects).forEach((proj) => {
    const rows = snapshot.projects[proj];
    const times = rows.map((r) => r.posTime).filter((t) => t !== null);
    const refTime = times.length ? Math.max(...times) : Date.now();
    rows.forEach((r) => {
      const staleMs = r.posTime !== null ? refTime - r.posTime : Infinity;
      const staleDays = r.posTime !== null ? Math.floor(staleMs / DAY_MS) : Infinity;
      const freshness = getDayCategory(staleDays);
      const isFault = isFaultAlarm(r.alarm);
      out.push({
        ...r,
        project: proj,
        refTime,
        isFault,
        isSafetyAlarm: hasSafetyAlarm(r.alarm),
        freshness,
        status: getUnitStatus({ isFault, freshness }),
        isStale: staleMs > STALE_HOURS * 3600 * 1000,
        staleMs,
        staleDays,
      });
    });
  });
  return out;
}

export function computeKPIs(records) {
  const total = records.length;
  const statusCounts = { fault: 0, outOfService: 0, notUpdate: 0, update: 0 };
  records.forEach((r) => {
    const key = r.status || getUnitStatus(r);
    if (statusCounts[key] !== undefined) statusCounts[key]++;
  });
  const faultCount = statusCounts.fault;
  const safetyCount = records.filter((r) => r.isSafetyAlarm).length;
  // Freshness: klasifikasi SELURUH unit (independen dari gangguan), total = 100%.
  const updateCount = records.filter((r) => r.freshness === 'update').length;
  const notUpdateCount = records.filter((r) => r.freshness === 'notUpdate').length;
  const outOfServiceCount = records.filter((r) => r.freshness === 'outOfService').length;
  const okCount = updateCount;
  const faultOutOfService = records.filter((r) => r.isFault && r.freshness === 'outOfService').length;
  const faultNotUpdate = records.filter((r) => r.isFault && r.freshness === 'notUpdate').length;
  return {
    total,
    faultCount,
    safetyCount,
    updateCount,
    notUpdateCount,
    outOfServiceCount,
    okCount,
    statusCounts,
    intersections: { faultOutOfService, faultNotUpdate },
  };
}
