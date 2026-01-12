const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// CSV файлы и их гаплогруппы
const imports = [
  { file: '../../scripts/downloads/aadna.csv', haplogroup: 'Ancient' },
  { file: '../../scripts/downloads/E.csv', haplogroup: 'E-M96' },
  { file: '../../scripts/downloads/G.csv', haplogroup: 'G-M201' },
  { file: '../../scripts/downloads/I.csv', haplogroup: 'I-M170' },
  { file: '../../scripts/downloads/J1.csv', haplogroup: 'J-M267' },
  { file: '../../scripts/downloads/J2.csv', haplogroup: 'J-M172' },
  { file: '../../scripts/downloads/r1a.csv', haplogroup: 'R-M420' },
  { file: '../../scripts/downloads/Others.csv', haplogroup: 'Other' },
  { file: '../../scripts/downloads/Genopoisk.csv', haplogroup: 'Various' }
];

console.log('🔄 Starting reimport of all CSV files...\n');

let totalImported = 0;
let totalErrors = 0;

imports.forEach(({ file, haplogroup }, index) => {
  const filePath = path.resolve(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${file} - file not found`);
    return;
  }

  console.log(`\n[${index + 1}/${imports.length}] Importing ${path.basename(file)} (${haplogroup})...`);

  try {
    const result = execSync(
      `node "${path.join(__dirname, 'import-csv-to-postgres.js')}" --file="${filePath}" --haplogroup="${haplogroup}"`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        stdio: 'pipe'
      }
    );

    // Извлекаем количество импортированных профилей
    const match = result.match(/✅ Successfully imported (\d+)/);
    if (match) {
      const count = parseInt(match[1]);
      totalImported += count;
      console.log(`✅ Imported ${count} profiles from ${path.basename(file)}`);
    }
  } catch (error) {
    totalErrors++;
    console.error(`❌ Error importing ${file}:`);
    console.error(error.stdout || error.message);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Import Summary:`);
console.log(`   Total profiles imported: ${totalImported.toLocaleString()}`);
console.log(`   Files with errors: ${totalErrors}`);
console.log('='.repeat(60));

if (totalErrors > 0) {
  process.exit(1);
}
