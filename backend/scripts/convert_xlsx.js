const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const inputFile = path.resolve(__dirname, '../../R1b.xlsx');
const outputFile = path.resolve(__dirname, '../../scripts/downloads/R1b.csv');

console.log(`📖 Reading ${inputFile}...`);
try {
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`📄 Converting sheet "${sheetName}" to CSV...`);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    fs.writeFileSync(outputFile, csvContent);
    console.log(`✅ Saved to ${outputFile}`);
} catch (error) {
    console.error("❌ Conversion failed:", error.message);
    process.exit(1);
}
