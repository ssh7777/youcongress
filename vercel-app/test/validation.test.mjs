import test from 'node:test';
import assert from 'node:assert/strict';
import {choiceField, idField, ownedResult, slugFor, textField, urlField, WriteError} from '../lib/validation.mjs';

function form(values) {
  return {get(name) { return values[name]; }};
}

test('mutation text is trimmed and bounded', () => {
  assert.equal(textField(form({title: '  A policy  '}), 'title', {min: 3, max: 20}), 'A policy');
  assert.throws(() => textField(form({title: 'x'}), 'title', {min: 3, max: 20}), WriteError);
  assert.throws(() => textField(form({title: 'x'.repeat(21)}), 'title', {min: 3, max: 20}), WriteError);
  assert.throws(() => textField(form({}), 'title', {min: 0, max: 20}), WriteError);
});

test('identifiers and operation choices reject malformed input', () => {
  assert.equal(idField(form({id: '42'}), 'id'), '42');
  for (const id of ['0', '-1', '1.5', 'abc', '1;DROP']) assert.throws(() => idField(form({id}), 'id'), WriteError);
  assert.equal(choiceField(form({position: 'for'}), 'position', ['for', 'against']), 'for');
  assert.throws(() => choiceField(form({position: 'delete'}), 'position', ['for', 'against']), WriteError);
});

test('source URLs remain credential-free HTTP(S)', () => {
  assert.equal(urlField(form({source_url: 'https://example.com/source'}), 'source_url'), 'https://example.com/source');
  for (const source_url of ['javascript:alert(1)', 'https://user:pass@example.com', 'relative/path']) {
    assert.throws(() => urlField(form({source_url}), 'source_url'), WriteError);
  }
});

test('generated slugs are bounded URL-safe unique values', () => {
  const first = slugFor('  Café & AI: Safety?  ');
  const second = slugFor('  Café & AI: Safety?  ');
  assert.match(first, /^cafe-ai-safety-[a-f0-9]{10}$/);
  assert.notEqual(first, second);
  assert.ok(slugFor('x'.repeat(500)).length <= 191);
});

test('missing ownership results are not treated as successful writes', () => {
  assert.throws(() => ownedResult({rowCount: 0, rows: []}, '/explore', 'no'), error => error instanceof WriteError && error.status === 404);
  const result = ownedResult({rowCount: 1, rows: [{id: '1'}]}, '/explore', 'saved');
  assert.equal(result.record.id, '1');
});
