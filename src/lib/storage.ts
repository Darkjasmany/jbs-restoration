import { getAccessToken, getBrowserSupabase } from './supabase';

export type Bucket = 'projects' | 'site';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export const extensionFor = (mime: string) => EXTENSIONS[mime] ?? 'bin';

export const publicUrl = (bucket: Bucket, path: string) => `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

function readError(xhr: XMLHttpRequest): string {
  if (xhr.status === 413) return 'The file is larger than the allowed size.';
  if (xhr.status === 401 || xhr.status === 403) return 'Your session expired. Please sign in again.';
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string };
    if (body.message) return body.message;
  } catch {
    /* respuesta no JSON */
  }
  return `Upload failed (${xhr.status}).`;
}

/** Sube un archivo directo a Supabase Storage con progreso real (XHR). No pasa por el Worker. */
export async function uploadObject(opts: {
  bucket: Bucket;
  path: string;
  file: Blob;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Your session expired. Please sign in again.');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${opts.bucket}/${opts.path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', ANON_KEY);
    xhr.setRequestHeader('Content-Type', opts.file.type || 'application/octet-stream');
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(readError(xhr))));
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and retry.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    opts.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(opts.file);
  });
}

export async function removeObjects(bucket: Bucket, paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await getBrowserSupabase().storage.from(bucket).remove(paths);
  if (error) throw error;
}
