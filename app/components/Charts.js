'use client';

import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { fmtDateHuman, computeKPIs, flattenSnapshot } from '../../lib/parseWorkbook';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const axisOpts = {
  ticks: { color: '#8A96B2', font: { size: 10 } },
  grid: { color: '#1A2438' },
};

// Dua sumbu independen:
// - Kesegaran update (3 bucket, klasifikasi seluruh unit -> total 100%)
// - Kesehatan perangkat (gangguan vs normal)
const FRESHNESS_META = [
  { key: 'outOfService', countKey: 'outOfServiceCount', label: 'OUT OF SERVICE (>30 hari)', color: '#A855F7', bg: 'rgba(168,85,247,0.16)' },
  { key: 'notUpdate', countKey: 'notUpdateCount', label: 'NOT UPDATE (7-30 hari)', color: '#F5A623', bg: 'rgba(245,166,35,0.14)' },
  { key: 'update', countKey: 'updateCount', label: 'UPDATE (<7 hari)', color: '#34D399', bg: 'rgba(52,211,153,0.14)' },
];

const FAULT_COLOR = '#F0554A';

export function TrendChart({ dateList, snapshots }) {
  if (dateList.length < 2) {
    return (
      <div className="text-[12.5px] text-textDim">
        Butuh minimal 2 hari snapshot untuk menampilkan tren. Unggah laporan besok untuk mengaktifkan grafik ini.
      </div>
    );
  }

  const series = FRESHNESS_META.map((s) => ({ ...s, data: [] }));
  const faultPct = [];

  dateList.forEach((d) => {
    const recs = flattenSnapshot(snapshots[d]);
    const k = computeKPIs(recs);
    series.forEach((s) => {
      s.data.push(k.total ? +((k[s.countKey] / k.total) * 100).toFixed(1) : 0);
    });
    faultPct.push(k.total ? +((k.faultCount / k.total) * 100).toFixed(1) : 0);
  });

  const data = {
    labels: dateList.map(fmtDateHuman),
    datasets: [
      ...series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: s.bg,
        tension: 0.3,
        fill: true,
        pointRadius: 2,
      })),
      {
        label: '% Gangguan Perangkat',
        data: faultPct,
        borderColor: FAULT_COLOR,
        backgroundColor: 'transparent',
        borderDash: [6, 4],
        tension: 0.3,
        fill: false,
        pointRadius: 2,
        yAxisID: 'yFault',
      },
    ],
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        plugins: { legend: { labels: { color: '#8A96B2', font: { size: 11 } } } },
        scales: {
          x: axisOpts,
          y: { ...axisOpts, beginAtZero: true, max: 100, stacked: true },
          yFault: { display: false, beginAtZero: true, max: 100, stacked: false },
        },
      }}
    />
  );
}

const doughnutOpts = {
  plugins: { legend: { position: 'bottom', labels: { color: '#8A96B2', font: { size: 11 }, boxWidth: 10 } } },
  cutout: '62%',
};

export function StatusChart({ records }) {
  const k = computeKPIs(records);

  const freshnessData = {
    labels: FRESHNESS_META.map((s) => s.label),
    datasets: [
      {
        data: FRESHNESS_META.map((s) => k[s.countKey]),
        backgroundColor: FRESHNESS_META.map((s) => s.color),
        borderWidth: 0,
      },
    ],
  };

  const healthData = {
    labels: ['Gangguan Perangkat', 'Normal'],
    datasets: [
      {
        data: [k.faultCount, Math.max(0, k.total - k.faultCount)],
        backgroundColor: [FAULT_COLOR, '#22304A'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="text-[12.5px] font-semibold">Kesegaran Update</div>
        <div className="text-[11px] text-textDim mb-2">Klasifikasi seluruh unit — total 100%.</div>
        <Doughnut data={freshnessData} options={doughnutOpts} />
      </div>
      <div>
        <div className="text-[12.5px] font-semibold">Kesehatan Perangkat</div>
        <div className="text-[11px] text-textDim mb-2">Gangguan video/storage vs normal.</div>
        <Doughnut data={healthData} options={doughnutOpts} />
      </div>
    </div>
  );
}
