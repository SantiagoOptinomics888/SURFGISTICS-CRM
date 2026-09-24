"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud, X } from "lucide-react";

export function DocumentDropSlot({
  label,
  description,
  files = [],
  received = false,
  multiple = false,
  accept,
  disabled,
  uploading,
  onFiles,
  onRemove,
}: {
  label: string;
  description: string;
  files?: File[];
  received?: boolean;
  multiple?: boolean;
  accept: string;
  disabled?: boolean;
  uploading?: boolean;
  onFiles: (files: File[]) => void;
  onRemove?: (index: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const done = received || files.length > 0;
  const pick = (list: FileList | null | undefined) => {
    const selected = Array.from(list ?? []);
    if (selected.length) onFiles(multiple ? selected : selected.slice(0, 1));
  };

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) pick(event.dataTransfer.files); }}
      className={`rounded-lg border-2 border-dashed p-3 transition-colors ${dragging ? "border-[#087FA3] bg-cyan-50" : done ? "border-emerald-200 bg-emerald-50/50" : "border-[#C9DCE1] bg-[#F8FBFC]"}`}
    >
      <input ref={input} type="file" aria-label={label} accept={accept} multiple={multiple} className="sr-only" onChange={(event) => { pick(event.target.files); event.target.value = ""; }} />
      <div className="flex flex-wrap items-center gap-3">
        {uploading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#087FA3]" /> : done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <UploadCloud className="h-5 w-5 shrink-0 text-[#087FA3]" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#24505F]">{label}</p>
          <p className="text-xs text-[#71858D]">{uploading ? "Uploading…" : dragging ? "Drop to add" : received ? "Received" : description}</p>
        </div>
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="rounded-md border border-[#CFDDE1] bg-white px-3 py-2 text-xs font-bold text-[#087FA3] hover:bg-cyan-50 disabled:opacity-50" aria-label={`${done ? "Add another" : "Add"} ${label}`}>
          {done && multiple ? "Add another" : done ? "Replace" : "Choose file"}
        </button>
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 pl-8">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-2 text-xs text-[#3F5963]">
              <span className="min-w-0 flex-1 break-all">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
              {onRemove && <button type="button" disabled={disabled} onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`} className="rounded p-1 text-[#71858D] hover:bg-white"><X className="h-3.5 w-3.5" /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
