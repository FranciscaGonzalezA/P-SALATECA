import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';
import JSZip from 'jszip';

const sourcePath = 'C:/Users/Fran GA/.codex/attachments/f9f3e2af-5ecf-4a10-a58e-c193c8d1dc9c/pasted-text.txt';
const outputDir = 'C:/Users/Fran GA/OneDrive - UNIVERSIDAD ANDRES BELLO/Documentos/universidad/2026 2do semestre/P-SALATECA/outputs/019ff159-2223-7053-bb43-1dba0bca7893';
const outputPath = path.join(outputDir, 'cartelera-importacion-admin-2026-08-11.xlsx');

const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const headers = ['Fecha parseada', 'Fecha texto', 'Pelicula', 'Sala', 'URL'];
const excludedTitles = new Set([
  'Función sorpresa',
  'ESPECIAL PEDRO CHASKEL',
  'Butterfly + The crossing',
]);
const importRecords = source.records.filter((record) => !excludedTitles.has(record.movieTitle));
const rows = importRecords.map((record) => [
  `${record.screeningDate} ${record.screeningTime}:00`,
  '',
  record.movieTitle,
  record.venueName,
  record.sourceUrl,
]);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add('Cartelera');
sheet.showGridLines = false;

sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length).values = [headers, ...rows];
sheet.getRange('A1:E1').format = {
  fill: '#2F5D50',
  font: { bold: true, color: '#FFFFFF' },
  verticalAlignment: 'center',
  rowHeight: 28,
  borders: { preset: 'outside', style: 'thin', color: '#21443A' },
};
sheet.getRange(`A2:E${rows.length + 1}`).format = {
  verticalAlignment: 'center',
  borders: {
    insideHorizontal: { style: 'thin', color: '#E3DED4' },
  },
};
sheet.getRange(`A2:B${rows.length + 1}`).format.numberFormat = '@';
sheet.getRange(`C2:E${rows.length + 1}`).format.wrapText = true;
sheet.getRange(`A2:A${rows.length + 1}`).format.columnWidth = 24;
sheet.getRange(`B2:B${rows.length + 1}`).format.columnWidth = 20;
sheet.getRange(`C2:C${rows.length + 1}`).format.columnWidth = 34;
sheet.getRange(`D2:D${rows.length + 1}`).format.columnWidth = 38;
sheet.getRange(`E2:E${rows.length + 1}`).format.columnWidth = 56;
sheet.getRange(`A2:E${rows.length + 1}`).format.rowHeight = 30;

const table = sheet.tables.add(`A1:E${rows.length + 1}`, true, 'CarteleraImportTable');
table.style = 'TableStyleMedium2';
table.showFilterButton = true;
sheet.freezePanes.freezeRows(1);
sheet.freezePanes.freezeColumns(2);

const inspection = await workbook.inspect({
  kind: 'table',
  range: 'Cartelera!A1:E8',
  include: 'values,formulas',
  tableMaxRows: 8,
  tableMaxCols: 5,
});
console.log('INSPECT_CARTELERA');
console.log(inspection.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});
console.log('INSPECT_ERRORS');
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({
  sheetName: 'Cartelera',
  range: 'A1:E12',
  scale: 1.2,
  format: 'png',
});
await fs.writeFile(
  path.join(outputDir, 'preview-cartelera-importacion-admin.png'),
  new Uint8Array(await preview.arrayBuffer()),
);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

// artifact-tool exporta el tipo principal como Default para XML. ExcelJS, usado por
// el backend, espera que workbook.xml aparezca como Override en [Content_Types].xml.
const zip = await JSZip.loadAsync(await fs.readFile(outputPath));
const contentTypesFile = zip.file('[Content_Types].xml');
if (!contentTypesFile) throw new Error('El XLSX exportado no contiene [Content_Types].xml.');
const contentTypes = await contentTypesFile.async('string');
const compatibleContentTypes = contentTypes.replace(
  '<Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" />',
  '<Default Extension="xml" ContentType="application/xml" /><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" />',
);
if (compatibleContentTypes === contentTypes) {
  throw new Error('No fue posible aplicar la compatibilidad de Content Types del XLSX.');
}
zip.file('[Content_Types].xml', compatibleContentTypes);
const relationshipFixes = [
  ['_rels/.rels', [['Target="/xl/workbook.xml"', 'Target="xl/workbook.xml"']]],
  [
    'xl/_rels/workbook.xml.rels',
    [
      ['Target="/xl/styles.xml"', 'Target="styles.xml"'],
      ['Target="/xl/theme/theme1.xml"', 'Target="theme/theme1.xml"'],
      ['Target="/xl/sharedStrings.xml"', 'Target="sharedStrings.xml"'],
      ['Target="/xl/worksheets/sheet1.xml"', 'Target="worksheets/sheet1.xml"'],
    ],
  ],
  [
    'xl/worksheets/_rels/sheet1.xml.rels',
    [['Target="/xl/tables/table1.xml"', 'Target="../tables/table1.xml"']],
  ],
];
for (const [entryName, replacements] of relationshipFixes) {
  const entry = zip.file(entryName);
  if (!entry) throw new Error(`El XLSX exportado no contiene ${entryName}.`);
  let xml = await entry.async('string');
  for (const [from, to] of replacements) xml = xml.replace(from, to);
  zip.file(entryName, xml);
}
for (const entryName of [
  'xl/workbook.xml',
  'xl/styles.xml',
  'xl/sharedStrings.xml',
  'xl/worksheets/sheet1.xml',
  'xl/tables/table1.xml',
]) {
  const entry = zip.file(entryName);
  if (!entry) throw new Error(`El XLSX exportado no contiene ${entryName}.`);
  const xml = (await entry.async('string'))
    .replaceAll('<x:', '<')
    .replaceAll('</x:', '</')
    .replaceAll('xmlns:x=', 'xmlns=');
  zip.file(entryName, xml);
}
await fs.writeFile(
  outputPath,
  await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
);
console.log(`OUTPUT=${outputPath}`);
console.log(`ROWS=${rows.length}`);
