import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|bmp|mp4|webm|mov|avi|mp3|wav|ogg|m4a|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip)$/i;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_EXT.test(file.originalname)) cb(null, true);
  else cb(new Error('File type not allowed. Use images, video, audio, PDF, Office docs, or ZIP.'));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function detectMessageType(mime, filename) {
  if (mime?.startsWith('image/')) return 'image';
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.startsWith('audio/')) return 'audio';
  if (/pdf|document|spreadsheet|presentation|msword|excel|powerpoint/i.test(mime || '')) return 'document';
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(filename || '')) return 'document';
  return 'file';
}
