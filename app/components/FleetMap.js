'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const STATUS_COLORS = {
  fault: '#F0554A',
  outOfService: '#A855F7',
  notUpdate: '#F5A623',
  update: '#34D399',
};

const STATUS_LABELS = [
  { key: 'fault', label: 'Gangguan Perangkat' },
  { key: 'outOfService', label: 'OUT OF SERVICE' },
  { key: 'notUpdate', label: 'NOT UPDATE' },
  { key: 'update', label: 'UPDATE' },
];

function statusColor(r) {
  return STATUS_COLORS[r.status] || STATUS_COLORS.update;
}

export default function FleetMap({ records }) {
  const plotted = records
    .map((r) => {
      const m = String(r.position || '').trim().match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
      if (!m) return null;
      return { ...r, lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    })
    .filter(Boolean);

  return (
    <div>
      <MapContainer
        center={[-2.5, 118]}
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: '420px', width: '100%' }}
        className="border border-borderSoft"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {plotted.map((r, i) => (
          <CircleMarker
            key={i}
            center={[r.lat, r.lng]}
            radius={5}
            pathOptions={{ color: statusColor(r), fillColor: statusColor(r), fillOpacity: 0.85, weight: 1 }}
          >
            <Popup>
              <b>{r.vehicle}</b>
              <br />
              {r.project}
              <br />
              {r.alarm || 'Tidak ada alarm'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="flex flex-wrap gap-3 mt-2 text-[11.5px] text-textDim">
        {STATUS_LABELS.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[s.key] }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="text-xs text-textDim mt-1">
        {plotted.length} dari {records.length} unit (setelah filter) memiliki koordinat presisi dan ditampilkan di peta.
      </div>
    </div>
  );
}
