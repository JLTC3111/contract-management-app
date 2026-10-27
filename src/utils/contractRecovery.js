import { contractsApi } from '../api/contracts';
import { CONTRACT_CATEGORIES } from './constants';
import { contractEditPayload, getContractStage } from './stages';
import { deleteAttachments, uploadAttachments } from './uploads';

export const contractForm = (contract = {}) => ({
  title: contract.title || '', category: contract.category || CONTRACT_CATEGORIES.find((c) => c !== 'All'),
  stage: getContractStage(contract), author: contract.author || '', client_name: contract.client_name || '',
  contract_value: contract.contract_value ?? '', expiry_date: contract.expiry_date ? String(contract.expiry_date).slice(0, 10) : '',
});

/** Carry only fields the user edited onto the newer revision. */
export function mergeContractDraft(base, mine, latest) {
  const previous = contractForm(base);
  const theirs = contractForm(latest);
  const merged = { ...theirs };
  const conflicts = [];
  for (const key of Object.keys(previous)) {
    if (String(mine[key] ?? '') === String(previous[key] ?? '')) continue;
    merged[key] = mine[key];
    if (String(theirs[key] ?? '') !== String(previous[key] ?? '') && String(theirs[key] ?? '') !== String(mine[key] ?? '')) {
      conflicts.push({ key, mine: mine[key], theirs: theirs[key] });
    }
  }
  return { merged, theirs, conflicts };
}

export async function saveContractEdit(target, updates, attachments, removedFiles, folder) {
  const contract = await contractsApi.update(target.id, contractEditPayload(target, updates), { expectedRevision: target.revision });
  const deleted = await deleteAttachments(target.id, removedFiles);
  const uploaded = await uploadAttachments(target.id, attachments, folder);
  return { contract, deleted, uploaded };
}
