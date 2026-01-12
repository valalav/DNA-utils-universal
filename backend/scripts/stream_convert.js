const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const inputFile = path.resolve(__dirname, '../../R1b.xlsx');
const outputFile = path.resolve(__dirname, '../../scripts/downloads/R1b.csv');

console.log(`📖 Streaming ${inputFile} -> ${outputFile}...`);

async function convert() {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(inputFile, {
        sharedStrings: 'cache',
        hyperlinks: 'ignore',
        worksheets: 'emit',
    });

    const writeStream = fs.createWriteStream(outputFile);
    let rowCount = 0;

    for await (const worksheetReader of workbookReader) {
        console.log(`📄 Processing worksheet: ${worksheetReader.name}`);
        for await (const row of worksheetReader) {
            // Convert row text values to CSV line
            // row.values is 1-indexed array. format CSV manually to avoid heavy libs
            const values = row.values;
            if (!values || values.length === 0) continue;

            // Remove index 0 (empty)
            if (Array.isArray(values)) values.shift();

            const line = values.map(v => {
                if (v === null || v === undefined) return '';
                const s = String(v).replace(/"/g, '""');
                return `"${s}"`;
            }).join(',') + '\n';

            writeStream.write(line);
            rowCount++;
            if (rowCount % 10000 === 0) console.log(`   Rows: ${rowCount}`);
        }
    }

    writeStream.end();
    console.log(`✅ Done. Total rows: ${rowCount}`);
}

convert().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
