/**
 * Attachment upload helpers for the dashboard modals.
 *
 * A contract's files live under `uploads/<contract id>/`, the same convention
 * FileUploader, FileBrowser and the drawer's document list already use.
 */
import { storageApi } from '../api/contracts';
import { FILE_CONSTRAINTS } from './constants';

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
export const uploadAttachments = async (contractId, files) => {
  const uploaded = [];
  const failed = [];

  for (const file of files || []) {
    const name = sanitizeFileName(file.name) || `file-${Date.now()}`;
    try {
      await storageApi.upload(`uploads/${contractId}/${name}`, file);
      uploaded.push(name);
    } catch (err) {
      failed.push({ name: file.name, message: err?.message || 'upload failed' });
    }
  }

  return { uploaded, failed };
};
