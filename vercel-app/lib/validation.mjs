import { randomBytes } from 'node:crypto';
import { sourceHref } from './records.mjs';

export class WriteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function textField(form, name, {min = 0, max, label = name} = {}) {
  const value = form.get(name);
  if (typeof value !== 'string') throw new WriteError(400, `${label} is required.`);
  const text = value.trim();
  if (text.length < min || text.length > max) {
    throw new WriteError(400, `${label} must contain between ${min} and ${max} characters.`);
  }
  return text;
}

export function idField(form, name) {
  const value = textField(form, name, {min: 1, max: 19, label: name});
  if (!/^[1-9]\d*$/.test(value)) throw new WriteError(400, `${name} is invalid.`);
  return value;
}

export function choiceField(form, name, choices) {
  const value = textField(form, name, {min: 1, max: 40, label: name});
  if (!choices.includes(value)) throw new WriteError(400, `${name} is invalid.`);
  return value;
}

export function urlField(form, name) {
  const value = textField(form, name, {min: 1, max: 2000, label: 'Source URL'});
  const href = sourceHref(value);
  if (!href) throw new WriteError(400, 'Source URL must be a credential-free HTTP(S) URL.');
  return href;
}

export function slugFor(title) {
  const base = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 180).replace(/-$/, '') || 'record';
  return `${base}-${randomBytes(5).toString('hex')}`;
}

export function ownedResult(result, returnTo, message) {
  if (!result.rowCount) throw new WriteError(404, 'Record not found or not owned by this guest.');
  return {record: result.rows[0], returnTo, message};
}
