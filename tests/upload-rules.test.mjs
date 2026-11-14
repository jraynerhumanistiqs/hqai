// Unit tests for record upload rules (components/people/upload-rules.ts),
// which the documents route enforces. Imports the real module.
// Run: node --test tests/upload-rules.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkUpload, sanitiseFileName, MAX_UPLOAD_BYTES } from '../components/people/upload-rules.ts'

test('allowed types pass with the stored content type', () => {
  for (const [name, mime] of [
    ['a.pdf', 'application/pdf'], ['b.DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['c.doc', 'application/msword'], ['d.jpeg', 'image/jpeg'], ['e.JPG', 'image/jpeg'], ['f.png', 'image/png'], ['g.heic', 'image/heic'],
  ]) {
    const r = checkUpload(name, 1000)
    assert.equal(r.ok, true, name)
    assert.equal(r.mime, mime)
  }
})

test('anything else, empty files and files over 10 MB are rejected', () => {
  assert.equal(checkUpload('evil.exe', 10).ok, false)
  assert.equal(checkUpload('page.html', 10).ok, false)
  assert.equal(checkUpload('noext', 10).ok, false)
  assert.equal(checkUpload('a.pdf', 0).ok, false)
  assert.equal(checkUpload('a.pdf', MAX_UPLOAD_BYTES).ok, true)
  assert.equal(checkUpload('a.pdf', MAX_UPLOAD_BYTES + 1).ok, false)
})

test('sanitiseFileName strips paths and odd characters and caps length', () => {
  assert.equal(sanitiseFileName('../../etc/passwd.pdf'), 'passwd.pdf')
  assert.equal(sanitiseFileName('C:\\Users\\me\\Contract (signed).pdf'), 'Contract _signed_.pdf')
  assert.equal(sanitiseFileName('..hidden.png'), 'hidden.png')
  const long = sanitiseFileName('x'.repeat(300) + '.docx')
  assert.ok(long.length <= 100)
  assert.ok(long.endsWith('.docx'))
  assert.ok(!/[\\/]/.test(sanitiseFileName('a/b\\c.pdf')))
})
