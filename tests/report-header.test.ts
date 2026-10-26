import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { test } from 'node:test';
import { createReportFile } from '../src/reports';
import { createDefaultState } from '../src/state/defaults';

/** Читаем ZIP через центральный каталог, включая записи с data descriptor. */
function readEntry(zip: Buffer, name: string): Buffer {
  const end = zip.lastIndexOf(Buffer.from('PK\x05\x06', 'binary'));
  let offset = zip.readUInt32LE(end + 16);
  while (zip.readUInt32LE(offset) === 0x02014b50) {
    const length = zip.readUInt16LE(offset + 28);
    const entryName = zip.subarray(offset + 46, offset + 46 + length).toString();
    if (entryName === name) {
      const local = zip.readUInt32LE(offset + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + zip.readUInt32LE(offset + 20));
      return zip.readUInt16LE(offset + 10) === 8 ? inflateRawSync(data) : data;
    }
    offset += 46 + length + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
  }
  throw new Error(`В отчете нет ${name}`);
}

for (const kind of ['kziCurrent', 'uziCurrent'] as const) {
  test(`${kind}: скачиваемый файл содержит повторяемый колонтитул и логотип CheckU`, async () => {
    const { blob } = await createReportFile(kind, createDefaultState());
    const zip = Buffer.from(await blob.arrayBuffer());
    const header = readEntry(zip, 'word/header1.xml').toString();
    assert.match(header, /cybersec@ussc\.ru/);
    assert.match(header, /379-98-34/);
    assert.match(header, /Ткачей, дом 6/);
    const rels = readEntry(zip, 'word/_rels/header1.xml.rels').toString();
    const target = rels.match(/Target="(media\/[^\"]+\.png)"/)?.[1];
    assert.ok(target, 'Связь колонтитула с изображением');
    assert.equal(readEntry(zip, `word/${target}`).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const document = readEntry(zip, 'word/document.xml').toString();
    assert.match(document, /w:headerReference w:type="default"/);
    assert.doesNotMatch(document, /<w:titlePg\s*\/>/);
    assert.match(readEntry(zip, 'word/styles.xml').toString(), /w:styleId="checkuHeader"/);
  });
}
