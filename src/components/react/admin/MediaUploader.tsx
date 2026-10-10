import { useEffect, useRef, useState } from 'react';
import { extensionFor, publicUrl, uploadObject, type Bucket } from '../../../lib/storage';

export type UploadedMedia = {
  type: 'image' | 'video';
  storage_path: string;
  url: string;
  width: number | null;
  height: number | null;
};

type Props = {
  bucket: Bucket;
  folder: string;
  accept: string;
  label: string;
  maxSizeMB: number;
  multiple?: boolean;
  optimizeImages?: boolean;
  disabled?: boolean;
  hint?: string;
  onUploaded: (items: UploadedMedia[]) => void;
};

type QueueItem = {
  key: string;
  file: File;
  preview: string;
  status: 'preparing' | 'uploading' | 'error';
  progress: number;
  error?: string;
};

const CONCURRENCY = 3;
const MAX_DIMENSION = 2400;
const MAX_RAW_MB = 60;

type Prepared = { blob: Blob; mime: string; width: number | null; height: number | null };

async function prepareImage(file: File): Promise<Prepared> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (webp && (scale < 1 || webp.size < file.size)) return { blob: webp, mime: 'image/webp', width: w, height: h };
    return { blob: file, mime: file.type, width, height };
  } catch {
    return { blob: file, mime: file.type, width: null, height: null };
  }
}

export function MediaUploader({ bucket, folder, accept, label, maxSizeMB, multiple = true, optimizeImages = true, disabled = false, hint, onUploaded }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;
  const queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(() => () => queueRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const patch = (key: string, changes: Partial<QueueItem>) => setQueue((q) => q.map((i) => (i.key === key ? { ...i, ...changes } : i)));

  const dismiss = (item: QueueItem) => {
    URL.revokeObjectURL(item.preview);
    setQueue((q) => q.filter((i) => i.key !== item.key));
  };

  const accepted = accept.split(',').map((a) => a.trim());
  const isAccepted = (f: File) => accepted.some((a) => (a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a));

  async function uploadItem(item: QueueItem) {
    patch(item.key, { status: 'preparing', progress: 0, error: undefined });
    try {
      const isImage = item.file.type.startsWith('image/');
      const prepared: Prepared =
        isImage && optimizeImages ? await prepareImage(item.file) : { blob: item.file, mime: item.file.type, width: null, height: null };

      if (prepared.blob.size > maxSizeMB * 1024 * 1024) throw new Error(`This file is larger than ${maxSizeMB} MB.`);

      const path = `${folder}/${crypto.randomUUID()}.${extensionFor(prepared.mime)}`;
      const body = prepared.blob.type === prepared.mime ? prepared.blob : new Blob([prepared.blob], { type: prepared.mime });

      patch(item.key, { status: 'uploading' });
      await uploadObject({ bucket, path, file: body, onProgress: (progress) => patch(item.key, { progress }) });

      dismiss(item);
      onUploadedRef.current([{ type: isImage ? 'image' : 'video', storage_path: path, url: publicUrl(bucket, path), width: prepared.width, height: prepared.height }]);
    } catch (e) {
      patch(item.key, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed.' });
    }
  }

  function handleFiles(list: FileList | File[]) {
    setNotice(null);
    const incoming = Array.from(list);
    const problems: string[] = [];
    const items: QueueItem[] = [];

    for (const file of incoming.slice(0, multiple ? 30 : 1)) {
      if (!isAccepted(file)) problems.push(`${file.name}: file type not supported.`);
      else if (file.size > MAX_RAW_MB * 1024 * 1024) problems.push(`${file.name}: file is too large.`);
      else items.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: 'preparing', progress: 0 });
    }
    if (!multiple && incoming.length > 1) problems.push('Only one file can be added here.');
    if (problems.length) setNotice(problems.join(' '));
    if (!items.length) return;

    setQueue((q) => [...q, ...items]);
    let next = 0;
    const worker = async () => {
      while (next < items.length) await uploadItem(items[next++]);
    };
    void Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition focus-within:ring-2 focus-within:ring-brand-500 ${
          dragging ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white hover:border-slate-400'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-slate-600">
          Drop files here or <span className="font-medium text-brand-700 underline">choose from your device</span>
        </span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </label>

      {notice && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {notice}
        </p>
      )}

      {queue.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {queue.map((item) => (
            <li key={item.key} className="flex items-center gap-3 rounded-lg bg-white p-2 ring-1 ring-slate-200">
              {item.file.type.startsWith('image/') ? (
                <img src={item.preview} alt="" className="h-12 w-12 flex-none rounded-md object-cover" />
              ) : (
                <video src={item.preview} muted className="h-12 w-12 flex-none rounded-md bg-slate-900 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                {item.status === 'error' ? (
                  <p className="text-xs text-red-700">{item.error}</p>
                ) : (
                  <>
                    <div
                      role="progressbar"
                      aria-label={`Uploading ${item.file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.progress}
                      className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
                    >
                      <div className="h-full bg-brand-600 transition-[width]" style={{ width: `${item.status === 'preparing' ? 3 : item.progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.status === 'preparing' ? 'Preparing…' : `${item.progress}%`}</p>
                  </>
                )}
              </div>
              {item.status === 'error' && (
                <div className="flex flex-none gap-1 text-sm">
                  <button type="button" onClick={() => void uploadItem(item)} className="rounded-md px-2 py-1 font-medium text-brand-700 hover:bg-brand-50">
                    Retry
                  </button>
                  <button type="button" onClick={() => dismiss(item)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">
                    Dismiss
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
