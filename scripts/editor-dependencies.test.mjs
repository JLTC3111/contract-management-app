import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

test('editor attribute merging cannot inherit executable attributes from JSON', () => {
  const untrusted = JSON.parse('{"__proto__":{"onerror":"untrusted-handler","src":"invalid:"},"title":"Contract"}');
  const merged = mergeAttributes({ class: 'contract' }, untrusted);
  assert.equal(Object.getPrototypeOf(merged), Object.prototype);
  assert.equal(merged.onerror, undefined);
  assert.equal(merged.src, undefined);
  assert.equal(merged.title, 'Contract');
  assert.equal(merged.class, 'contract');
});

test('the upgraded editor preserves existing formatted contract document data', () => {
  const original = {
    type: 'doc', content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agreement' }] },
      { type: 'paragraph', content: [
        { type: 'text', text: 'Payment ', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'is due in 30 days.' },
      ] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Signed by both parties' }] },
      ] }] },
    ],
  };
  const schema = getSchema([StarterKit]);
  const document = schema.nodeFromJSON(original);
  document.check();
  // ProseMirror uses null-prototype attribute maps; persisted JSON must match.
  assert.deepEqual(JSON.parse(JSON.stringify(document.toJSON())), original);
});
