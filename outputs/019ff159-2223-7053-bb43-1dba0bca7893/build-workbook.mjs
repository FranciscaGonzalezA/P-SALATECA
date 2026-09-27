import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const sourcePath = 'C:/Users/Fran GA/.codex/attachments/f9f3e2af-5ecf-4a10-a58e-c193c8d1dc9c/pasted-text.txt';
const outputDir = 'C:/Users/Fran GA/OneDrive - UNIVERSIDAD ANDRES BELLO/Documentos/universidad/2026 2do semestre/P-SALATECA/outputs/019ff159-2223-7053-bb43-1dba0bca7893';
const outputPath = path.join(outputDir, 'cartelera-scrapers-2026-08-11.xlsx');

const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const records = source.records;
const report = source.report;
const runDate = new Date('2026-08-11T12:00:00Z');

const colors = {
  forest: '#2F5D50',
  forestDark: '#21443A',
  cream: '#F3EFE7',
  creamLight: '#FBF9F4',
  white: '#FFFFFF',
  ink: '#252622',
  muted: '#6D716B',
  line: '#D9D4CA',
  rust: '#C8683B',
  greenSoft: '#DDEDE5',
  redSoft: '#F6DDDD',
  red: '#A53B3F',
};

const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add('Resumen');
const recordsSheet = workbook.worksheets.add('Funciones');
const sourcesSheet = workbook.worksheets.add('Fuentes');

for (const sheet of [summarySheet, recordsSheet, sourcesSheet]) {
  sheet.showGridLines = false;
}

// Hoja Funciones
const recordHeaders = [
  'Película',
  'Recinto',
  'Clave película',
  'Clave recinto',
  'Fecha',
  'Hora',
  'Inicio UTC',
  'Zona horaria',
  'Tipo fuente',
  'URL fuente',
  'ID fuente',
  'Capturado UTC',
  'Clave duplicado',
  'Estado',
];

const timeValue = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60 + minutes) / 1440;
};

const recordRows = records.map((record) => [
  record.movieTitle,
  record.venueName,
  record.movieKey,
  record.venueKey,
  new Date(`${record.screeningDate}T12:00:00Z`),
  timeValue(record.screeningTime),
  new Date(record.startsAt),
  record.sourceTimezone,
  record.sourceType,
  record.sourceUrl,
  record.sourceRecordKey,
  new Date(record.capturedAt),
  record.duplicateKey,
  null,
]);

recordsSheet.getRangeByIndexes(0, 0, recordRows.length + 1, recordHeaders.length).values = [
  recordHeaders,
  ...recordRows,
];
recordsSheet.getRange('N2').formulas = [["=IF(E2>='Resumen'!$B$8,\"Próxima\",\"Pasada\")"]];
recordsSheet.getRange(`N2:N${recordRows.length + 1}`).fillDown();
recordsSheet.getRange(`A1:N${recordRows.length + 1}`).format.font = { color: colors.ink };
recordsSheet.getRange('A1:N1').format = {
  fill: colors.forest,
  font: { bold: true, color: colors.white },
  rowHeight: 28,
  verticalAlignment: 'center',
};
recordsSheet.getRange(`E2:E${recordRows.length + 1}`).format.numberFormat = 'yyyy-mm-dd';
recordsSheet.getRange(`F2:F${recordRows.length + 1}`).format.numberFormat = 'hh:mm';
recordsSheet.getRange(`G2:G${recordRows.length + 1}`).format.numberFormat = 'yyyy-mm-dd hh:mm';
recordsSheet.getRange(`L2:L${recordRows.length + 1}`).format.numberFormat = 'yyyy-mm-dd hh:mm';
recordsSheet.getRange(`A2:N${recordRows.length + 1}`).format.verticalAlignment = 'center';
recordsSheet.getRange(`A2:B${recordRows.length + 1}`).format.wrapText = true;
recordsSheet.getRange(`J2:M${recordRows.length + 1}`).format.wrapText = true;
recordsSheet.getRange(`N2:N${recordRows.length + 1}`).conditionalFormats.add('containsText', {
  text: 'Próxima',
  format: { fill: colors.greenSoft, font: { color: colors.forestDark, bold: true } },
});
recordsSheet.getRange(`N2:N${recordRows.length + 1}`).conditionalFormats.add('containsText', {
  text: 'Pasada',
  format: { fill: colors.cream, font: { color: colors.muted } },
});

const recordsTable = recordsSheet.tables.add(`A1:N${recordRows.length + 1}`, true, 'FuncionesTable');
recordsTable.style = 'TableStyleMedium2';
recordsTable.showFilterButton = true;
recordsSheet.freezePanes.freezeRows(1);
recordsSheet.freezePanes.freezeColumns(2);

const recordWidths = [28, 32, 24, 30, 12, 10, 20, 18, 13, 42, 46, 20, 50, 12];
recordWidths.forEach((width, index) => {
  recordsSheet.getRangeByIndexes(0, index, recordRows.length + 1, 1).format.columnWidth = width;
});

// Hoja Fuentes
const sourceHeaders = [
  'ID',
  'Nombre',
  'Tipo',
  'URL',
  'Estado',
  'Registros crudos',
  'Aceptados',
  'Rechazados',
  'Duplicados',
  'Error',
];

const sourceRows = report.sources.map((item) => [
  item.id,
  item.name,
  item.sourceType,
  item.sourceUrl,
  item.status === 'succeeded' ? 'Correcto' : 'Falló',
  item.rawRecords.length,
  item.normalization?.summary.accepted ?? 0,
  item.normalization?.summary.rejected ?? 0,
  item.normalization?.summary.duplicates ?? 0,
  item.error ?? '',
]);

sourcesSheet.getRangeByIndexes(0, 0, sourceRows.length + 1, sourceHeaders.length).values = [
  sourceHeaders,
  ...sourceRows,
];
sourcesSheet.getRange('A1:J1').format = {
  fill: colors.forest,
  font: { bold: true, color: colors.white },
  rowHeight: 28,
  verticalAlignment: 'center',
};
sourcesSheet.getRange(`A2:J${sourceRows.length + 1}`).format.verticalAlignment = 'center';
sourcesSheet.getRange(`D2:D${sourceRows.length + 1}`).format.wrapText = true;
sourcesSheet.getRange(`J2:J${sourceRows.length + 1}`).format.wrapText = true;
sourcesSheet.getRange(`F2:I${sourceRows.length + 1}`).format.numberFormat = '#,##0';
sourcesSheet.getRange(`E2:E${sourceRows.length + 1}`).conditionalFormats.add('containsText', {
  text: 'Correcto',
  format: { fill: colors.greenSoft, font: { color: colors.forestDark, bold: true } },
});
sourcesSheet.getRange(`E2:E${sourceRows.length + 1}`).conditionalFormats.add('containsText', {
  text: 'Falló',
  format: { fill: colors.redSoft, font: { color: colors.red, bold: true } },
});
const sourcesTable = sourcesSheet.tables.add(`A1:J${sourceRows.length + 1}`, true, 'FuentesTable');
sourcesTable.style = 'TableStyleMedium2';
sourcesTable.showFilterButton = true;
sourcesSheet.freezePanes.freezeRows(1);
const sourceWidths = [22, 27, 13, 46, 13, 16, 12, 12, 12, 34];
sourceWidths.forEach((width, index) => {
  sourcesSheet.getRangeByIndexes(0, index, sourceRows.length + 1, 1).format.columnWidth = width;
});

// Hoja Resumen
summarySheet.mergeCells('A1:H2');
summarySheet.getRange('A1').values = [['Cartelera consolidada · Scrapers']];
summarySheet.getRange('A1:H2').format = {
  fill: colors.forestDark,
  font: { bold: true, color: colors.white },
  horizontalAlignment: 'left',
  verticalAlignment: 'center',
  rowHeight: 28,
};

summarySheet.getRange('A4:D4').values = [[
  'Funciones procesadas',
  'Funciones próximas',
  'Fuentes correctas',
  'Fuentes con error',
]];
summarySheet.getRange('A5:D5').formulas = [[
  `=COUNTA('Funciones'!$A$2:$A$${recordRows.length + 1})`,
  `=COUNTIF('Funciones'!$E$2:$E$${recordRows.length + 1},\">=\"&$B$8)`,
  `=COUNTIF('Fuentes'!$E$2:$E$${sourceRows.length + 1},\"Correcto\")`,
  `=COUNTIF('Fuentes'!$E$2:$E$${sourceRows.length + 1},\"Falló\")`,
]];
summarySheet.getRange('A4:D4').format = {
  fill: colors.cream,
  font: { bold: true, color: colors.muted },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  wrapText: true,
  rowHeight: 30,
};
summarySheet.getRange('A5:D5').format = {
  fill: colors.creamLight,
  font: { bold: true, color: colors.forestDark },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  numberFormat: '#,##0',
  rowHeight: 34,
  borders: { preset: 'outside', style: 'thin', color: colors.line },
};

summarySheet.getRange('A7:A10').values = [[
  'Inicio de ejecución',
], [
  'Fecha de referencia',
], [
  'Fin de ejecución',
], [
  'Tasa de aceptación',
]];
summarySheet.getRange('B7:B10').values = [[
  new Date(report.startedAt),
], [
  runDate,
], [
  new Date(report.finishedAt),
], [
  null,
]];
summarySheet.getRange('B10').formulas = [[
  `=SUM('Fuentes'!$G$2:$G$${sourceRows.length + 1})/MAX(1,SUM('Fuentes'!$F$2:$F$${sourceRows.length + 1}))`,
]];
summarySheet.getRange('A7:A10').format = { font: { bold: true, color: colors.ink } };
summarySheet.getRange('B7:B9').format.numberFormat = 'yyyy-mm-dd hh:mm';
summarySheet.getRange('B8').format.numberFormat = 'yyyy-mm-dd';
summarySheet.getRange('B10').format.numberFormat = '0.0%';

summarySheet.getRange('A12:D12').values = [['Fuente', 'Estado', 'Registros', 'Aceptados']];
summarySheet.getRange('A12:D12').format = {
  fill: colors.forest,
  font: { bold: true, color: colors.white },
  rowHeight: 26,
};
const summarySourceFormulas = sourceRows.map((_, index) => {
  const sourceRow = index + 2;
  return [
    `='Fuentes'!B${sourceRow}`,
    `='Fuentes'!E${sourceRow}`,
    `='Fuentes'!F${sourceRow}`,
    `='Fuentes'!G${sourceRow}`,
  ];
});
summarySheet.getRangeByIndexes(12, 0, summarySourceFormulas.length, 4).formulas = summarySourceFormulas;
summarySheet.getRange(`B13:B${12 + sourceRows.length}`).conditionalFormats.add('containsText', {
  text: 'Correcto',
  format: { fill: colors.greenSoft, font: { color: colors.forestDark } },
});
summarySheet.getRange(`B13:B${12 + sourceRows.length}`).conditionalFormats.add('containsText', {
  text: 'Falló',
  format: { fill: colors.redSoft, font: { color: colors.red, bold: true } },
});
summarySheet.getRange(`C13:D${12 + sourceRows.length}`).format.numberFormat = '#,##0';
summarySheet.getRange(`A12:D${12 + sourceRows.length}`).format.borders = {
  insideHorizontal: { style: 'thin', color: colors.line },
  bottom: { style: 'thin', color: colors.line },
};

summarySheet.getRange('F4:H4').merge();
summarySheet.getRange('F4').values = [['Notas de calidad']];
summarySheet.getRange('F4:H4').format = {
  fill: colors.rust,
  font: { bold: true, color: colors.white },
  verticalAlignment: 'center',
};
summarySheet.getRange('F5:H8').merge();
summarySheet.getRange('F5').values = [[
  '10 de 11 fuentes respondieron. Cine UC devolvió HTTP 403. Passline Alameda y Goethe Chile respondieron sin funciones vigentes. No hubo registros rechazados ni duplicados.',
]];
summarySheet.getRange('F5:H8').format = {
  fill: colors.creamLight,
  font: { color: colors.ink },
  wrapText: true,
  verticalAlignment: 'top',
  borders: { preset: 'outside', style: 'thin', color: colors.line },
};

summarySheet.getRange('A25:H25').merge();
summarySheet.getRange('A25').values = [[
  'Fuente: ejecución del scraper capturada el 11 de agosto de 2026. Las URLs originales están disponibles en las hojas Funciones y Fuentes.',
]];
summarySheet.getRange('A25:H25').format = {
  fill: colors.cream,
  font: { color: colors.muted },
  wrapText: true,
  rowHeight: 28,
};

summarySheet.freezePanes.freezeRows(2);
summarySheet.getRange('A1:H25').format.font = { name: 'Aptos' };
summarySheet.getRange('A:A').format.columnWidth = 26;
summarySheet.getRange('B:B').format.columnWidth = 19;
summarySheet.getRange('C:D').format.columnWidth = 18;
summarySheet.getRange('E:E').format.columnWidth = 3;
summarySheet.getRange('F:H').format.columnWidth = 18;

await fs.mkdir(outputDir, { recursive: true });

const summaryPreview = await workbook.render({
  sheetName: 'Resumen',
  range: 'A1:H25',
  scale: 1.5,
  format: 'png',
});
await fs.writeFile(
  path.join(outputDir, 'preview-resumen.png'),
  new Uint8Array(await summaryPreview.arrayBuffer()),
);

const recordsPreview = await workbook.render({
  sheetName: 'Funciones',
  range: 'A1:N14',
  scale: 1,
  format: 'png',
});
await fs.writeFile(
  path.join(outputDir, 'preview-funciones.png'),
  new Uint8Array(await recordsPreview.arrayBuffer()),
);

const sourcesPreview = await workbook.render({
  sheetName: 'Fuentes',
  range: 'A1:J12',
  scale: 1.2,
  format: 'png',
});
await fs.writeFile(
  path.join(outputDir, 'preview-fuentes.png'),
  new Uint8Array(await sourcesPreview.arrayBuffer()),
);

const keyInspection = await workbook.inspect({
  kind: 'table',
  range: 'Resumen!A1:H25',
  include: 'values,formulas',
  tableMaxRows: 25,
  tableMaxCols: 8,
});
console.log('INSPECT_SUMMARY');
console.log(keyInspection.ndjson);

const errorInspection = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});
console.log('INSPECT_ERRORS');
console.log(errorInspection.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`OUTPUT=${outputPath}`);
console.log(`RECORDS=${records.length}`);
console.log(`SOURCES=${report.sources.length}`);
