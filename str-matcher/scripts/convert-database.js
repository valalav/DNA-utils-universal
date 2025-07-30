// scripts/convert-database.js
const fs = require('fs');
const Papa = require('papaparse');

// Разбиваем большой файл на части по 10000 записей
const CHUNK_SIZE = 10000;
const inputFile = process.argv[2];
const outputDir = './';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let currentChunk = [];
let chunkIndex = 0;
let header;

// Читаем CSV построчно
fs.createReadStream(inputFile)
  .pipe(Papa.parse(Papa.NODE_STREAM_INPUT, { header: true }))
  .on('data', (row) => {
    if (!header) {
      header = Object.keys(row);
    }

    const profile = {
      kitNumber: row['Kit Number'],
      name: row['Name'] || '',
      country: row['Country'] || '',
      haplogroup: row['Haplogroup'] || '',
      markers: {}
    };

    // Добавляем только непустые маркеры
    header.forEach(key => {
      if (!['Kit Number', 'Name', 'Country', 'Haplogroup'].includes(key) && row[key]) {
        profile.markers[key] = row[key];
      }
    });

    currentChunk.push(profile);

    // Когда чанк заполнен, сохраняем его
    if (currentChunk.length >= CHUNK_SIZE) {
      fs.writeFileSync(
        `${outputDir}/chunk_${chunkIndex}.json`, 
        JSON.stringify(currentChunk)
      );
      currentChunk = [];
      chunkIndex++;
    }
  })
  .on('end', () => {
    // Сохраняем последний чанк
    if (currentChunk.length > 0) {
      fs.writeFileSync(
        `${outputDir}/chunk_${chunkIndex}.json`, 
        JSON.stringify(currentChunk)
      );
    }

    // Сохраняем метаданные
    fs.writeFileSync(
      `${outputDir}/metadata.json`,
      JSON.stringify({
        chunks: chunkIndex + 1,
        totalRecords: (chunkIndex * CHUNK_SIZE) + currentChunk.length
      })
    );
  });