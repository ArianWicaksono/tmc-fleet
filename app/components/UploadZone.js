'use client';

import { useRef, useState } from 'react';

export default function UploadZone({ onFiles, statusHtml }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`border-[1.5px] border-dashed rounded-[10px] p-5 flex items-center gap-4 mb-5 transition-colors ${
        dragOver ? 'border-brand bg-brand/5' : 'border-border bg-panelAlt'
      }`}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <div className="w-[46px] h-[46px] rounded-[10px] bg-panel border border-border flex items-center justify-center shrink-0 text-xl">
        ⬆
      </div>
      <div className="flex-1 min-w-[220px]">
        <div className="font-semibold text-[14px]">Tarik & lepas file Excel harian di sini, atau klik untuk memilih file</div>
        <div className="text-[12.5px] text-textDim mt-1 leading-relaxed">
          Mendukung banyak file sekaligus (mis. VMS1 &amp; VMS2). Tanggal terdeteksi otomatis dari nama file.
        </div>
        <div className="text-[12.5px] mt-2.5 min-h-[16px]" dangerouslySetInnerHTML={{ __html: statusHtml }} />
      </div>
      <button
        type="button"
        className="border border-border rounded-lg px-3 py-2 text-[13px] font-semibold hover:border-brand"
        onClick={() => inputRef.current?.click()}
      >
        Pilih File
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
