/**
 * Attachment upload helpers for the dashboard modals.
 *
 * A contract's files live under `uploads/<contract id>/`, the same convention
 * FileUploader, FileBrowser and the drawer's document list already use.
 */
import { storageApi } from '../api/contracts';
import { FILE_CONSTRAINTS } from './constants';
import { isRetryableError } from './network';

/**
 * Storage keys must be ASCII-safe.
 *
 * `đ`/`Đ` are single code points that NFD does not decompose, so a plain
 * normalize-then-strip silently deletes them - "Hợp đồng" would come out as
 * "Hop-ong". They are mapped explicitly before the strip.
 */
export const sanitizeFileName = (name) =>
  String(name)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining accents left behind by NFD
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '');

/**
 * Checks one file against the app's shared size/type limits.
 * @returns {string|null} an error key, or null when the file is acceptable
 */
export const validateAttachment = (file) => {
  if (file.size > FILE_CONSTRAINTS.maxSize) return 'tooLarge';
  const ext = `.${String(file.name).split('.').pop()?.toLowerCase()}`;
  const typeOk = FILE_CONSTRAINTS.allowedTypes.includes(file.type);
  const extOk = FILE_CONSTRAINTS.allowedExtensions.includes(ext);
  return typeOk || extOk ? null : 'badType';
};

/**
 * Uploads files for a contract, best effort: one failure doesn't abort the rest.
 * @returns {Promise<{uploaded: string[], failed: {name: string, message: string}[]}>}
 */
export const uploadAttachments = async (contractId, files, folder = '') => {
  const uploaded = [];
  const failed = [];

  for (const file of files || []) {
    const name = sanitizeFileName(file.name) || `file-${file.lastModified || 0}-${file.size}`;
    const path = `uploads/${contractId}/${folder ? `${folder}/` : ''}${name}`;
    try {
      await storageApi.upload(path, file);
      uploaded.push(name);
    } catch (err) {
      // An upload can commit before its response is lost. A matching existing
      // object is success; a different object is never overwritten on retry.
      try {
        if (isRetryableError(err) || Number(err.statusCode || err.status) === 409) {
          const existing = await storageApi.download(path);
          if (existing.size === file.size) {
            const [left, right] = await Promise.all([existing.arrayBuffer(), file.arrayBuffer()]);
            const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', left), crypto.subtle.digest('SHA-256', right)]);
            if (new Uint8Array(a).every((byte, index) => byte === new Uint8Array(b)[index])) {
              uploaded.push(name);
              continue;
            }
          }
        }
      } catch { /* retain the file for explicit retry */ }
      failed.push({ name: file.name, file, message: err?.message || 'upload failed' });
    }
  }

  return { uploaded, failed };
};

/**
 * Removes files from a contract's folder, best effort, mirroring
 * uploadAttachments. Names come from the storage listing, so they are already
 * the sanitized keys.
 * @returns {Promise<{deleted: string[], failed: {name: string, message: string}[]}>}
 */
export const deleteAttachments = async (contractId, names) => {
  const deleted = [];
  const failed = [];

  for (const name of names || []) {
    try {
      await storageApi.delete(`uploads/${contractId}/${name}`);
      deleted.push(name);
    } catch (err) {
      failed.push({ name, message: err?.message || 'delete failed' });
    }
  }

  return { deleted, failed };
};
