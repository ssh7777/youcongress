import test from 'node:test';
import assert from 'node:assert/strict';
import {repository, pageNumber, searchTerm, sourceHref, csvCell, sourceRecordsCsv, PAGE_SIZE} from '../lib/records.mjs';

test('untrusted pagination and search are bounded', () => {
  for (const value of [-1, 'no', '1.5', Infinity, undefined]) assert.equal(pageNumber(value), 1);
  assert.equal(pageNumber('999999'), 10000);
  assert.equal(searchTerm('a'.repeat(300)).length, 200);
  assert.equal(searchTerm(['query']), '');
});
test('source links permit only credential-free HTTP(S)', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', '/local', 'https://user:pass@example.com', null]) assert.equal(sourceHref(value), null);
  assert.equal(sourceHref('https://example.com/source'), 'https://example.com/source');
});
test('search never interpolates SQL and escapes wildcard input', async () => {
  const calls = [];
  const repo = repository(async (...args) => {calls.push(args); return {rows: []};});
  await repo.statements("%' OR 1=1 --_", 2);
  const [sql, values] = calls[0];
  assert.ok(!sql.includes('OR 1=1'));
  assert.ok(sql.includes('policy_statements'));
  assert.equal(values[0], "%' OR 1=1 --_");
  assert.equal(values[1], "%\\%' OR 1=1 --\\_%");
  assert.deepEqual(values.slice(2), [PAGE_SIZE + 1, PAGE_SIZE]);
});
test('pagination uses one extra row and does not expose it', async () => {
  const repo = repository(async () => ({rows: Array.from({length: 25}, (_, id) => ({id}))}));
  const result = await repo.statements();
  assert.equal(result.items.length, 24);
  assert.equal(result.hasMore, true);
});
test('statement lookup passes the slug as data and returns missing records', async () => {
  const repo = repository(async (sql, values) => {
    assert.equal(sql.includes('DROP'), false);
    assert.deepEqual(values, ["'; DROP TABLE users; --"]);
    return {rows: []};
  });
  assert.equal(await repo.statement("'; DROP TABLE users; --"), null);
  assert.equal(await repo.statement('a'.repeat(251)), null);
});
test('quotes read the quotes table only, with author text on the quote', async () => {
  const calls = [];
  const repo = repository(async (...args) => {calls.push(args); return {rows: []};});
  await repo.quotes('7', 3);
  const [sql, values] = calls[0];
  assert.ok(sql.includes('FROM quotes q'));
  assert.ok(!sql.includes('users'));
  assert.deepEqual(values, ['7', PAGE_SIZE + 1, 2 * PAGE_SIZE]);
});
test('vote tallies default to zero and sum recorded values only', async () => {
  const repo = repository(async (sql, values) => {
    assert.deepEqual(values, ['9']);
    return {rows: [{value: 'for', n: 4}, {value: 'against', n: 1}]};
  });
  assert.deepEqual(await repo.statementTallies('9'), {for: 4, abstain: 0, against: 1});
});
test('intelligence posts are bounded like every other listing', async () => {
  const calls = [];
  const repo = repository(async (...args) => {calls.push(args); return {rows: []};});
  await repo.intelligencePosts('2');
  const [, values] = calls[0];
  assert.deepEqual(values, [PAGE_SIZE + 1, PAGE_SIZE]);
});
test('CSV cells defuse spreadsheet formulas and the export credits APX', () => {
  for (const value of ['=cmd()', '+1', '-1', '@user', '\t=SUM(A1)', '\n=SUM(A1)']) assert.equal(csvCell(value)[1], "'");
  assert.equal(csvCell('plain'), '"plain"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  const csv = sourceRecordsCsv({id: '1', title: 'T'}, [{id: '2', author_name: 'A', content: '=1+1', source_url: 'https://e.com', source_text: 'S', date: '2026-01-01', date_precision: 'day'}]);
  assert.ok(csv.includes('attribution APX'));
  const legacyName = ['you', 'congress'].join('');
  assert.ok(!csv.toLowerCase().includes(legacyName));
  assert.ok(csv.includes('"\'=1+1"'));
});
