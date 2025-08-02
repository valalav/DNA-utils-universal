import { STRProfile } from '@/utils/constants';
import Papa from 'papaparse';

interface CSVRow {
  'Kit Number'?: string;
  'Name'?: string;
  'Country'?: string;
  'Haplogroup'?: string;
  [key: string]: string | undefined;
}

// 🔄 УПРОЩЕННАЯ обработка больших файлов - работает только в памяти
export async function processLargeFile(
  file: File,
  onProgress: (progress: number) => void
): Promise<STRProfile[]> {
  try {
    console.log(`🔄 Начало обработки файла ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
    
    const text = await file.text();
    console.log(`🔄 Файл прочитан, размер: ${text.length} байт`);

    const profiles: STRProfile[] = [];
    const processedKits = new Set<string>();

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        chunk: (results: Papa.ParseResult<CSVRow>) => {
          if (!results.data || !Array.isArray(results.data)) {
            return;
          }

          results.data.forEach((row: any) => {
            const kitNumber = row['Kit Number'];
            if (!kitNumber || processedKits.has(kitNumber)) {
              return;
            }

            processedKits.add(kitNumber);
            
            const profile: STRProfile = {
              kitNumber,
              name: row['Name'] || '',
              country: row['Country'] || '',
              haplogroup: row['Haplogroup'] || '',
              markers: {}
            };

            // Копируем маркеры
            Object.entries(row).forEach(([key, value]) => {
              if (key !== 'Kit Number' && 
                  key !== 'Name' && 
                  key !== 'Country' && 
                  key !== 'Haplogroup' && 
                  value) {
                profile.markers[key] = String(value).trim();
              }
            });

            if (Object.keys(profile.markers).length > 0) {
              profiles.push(profile);
            }
          });

          // Обновляем прогресс
          if (onProgress) {
            const estimatedTotal = Math.max(profiles.length * 2, 1000); // Примерная оценка
            const progress = Math.min((profiles.length / estimatedTotal) * 100, 95);
            onProgress(progress);
          }
        },
        complete: () => {
          try {
            console.log(`✅ Парсинг завершен: найдено ${profiles.length} уникальных профилей`);
            onProgress(100);
            
            if (profiles.length > 0) {
              resolve(profiles);
            } else {
              reject(new Error('Не найдено валидных профилей в файле'));
            }
          } catch (error) {
            console.error('❌ Ошибка при завершении парсинга:', error);
            reject(error);
          }
        },
        error: (error: Error) => {
          console.error('❌ Ошибка парсинга CSV:', error);
          reject(error);
        }
      });
    });

  } catch (error) {
    console.error('❌ Критическая ошибка при обработке файла:', error);
    throw error;
  }
}

// 🔄 STREAMING обработка для очень больших файлов
export async function processLargeFileStreaming(
  file: File,
  onProgress: (progress: number) => void,
  onBatch: (profiles: STRProfile[]) => void,
  batchSize: number = 1000
): Promise<number> {
  try {
    console.log(`🔄 Начало streaming обработки файла ${file.name}`);
    
    const text = await file.text();
    const processedKits = new Set<string>();
    let totalProfiles = 0;
    let currentBatch: STRProfile[] = [];

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        chunk: (results: Papa.ParseResult<CSVRow>) => {
          if (!results.data || !Array.isArray(results.data)) {
            return;
          }

          results.data.forEach((row: any) => {
            const kitNumber = row['Kit Number'];
            if (!kitNumber || processedKits.has(kitNumber)) {
              return;
            }

            processedKits.add(kitNumber);
            
            const profile: STRProfile = {
              kitNumber,
              name: row['Name'] || '',
              country: row['Country'] || '',
              haplogroup: row['Haplogroup'] || '',
              markers: {}
            };

            // Копируем маркеры
            Object.entries(row).forEach(([key, value]) => {
              if (key !== 'Kit Number' && 
                  key !== 'Name' && 
                  key !== 'Country' && 
                  key !== 'Haplogroup' && 
                  value) {
                profile.markers[key] = String(value).trim();
              }
            });

            if (Object.keys(profile.markers).length > 0) {
              currentBatch.push(profile);
              totalProfiles++;

              // Отправляем батч когда он заполнен
              if (currentBatch.length >= batchSize) {
                onBatch([...currentBatch]);
                currentBatch = [];
                
                // Обновляем прогресс
                const estimatedTotal = Math.max(totalProfiles * 2, 1000);
                const progress = Math.min((totalProfiles / estimatedTotal) * 100, 95);
                onProgress(progress);
              }
            }
          });
        },
        complete: () => {
          try {
            // Отправляем последний батч
            if (currentBatch.length > 0) {
              onBatch([...currentBatch]);
            }
            
            console.log(`✅ Streaming обработка завершена: ${totalProfiles} профилей`);
            onProgress(100);
            resolve(totalProfiles);
          } catch (error) {
            console.error('❌ Ошибка при завершении streaming:', error);
            reject(error);
          }
        },
        error: (error: Error) => {
          console.error('❌ Ошибка streaming парсинга:', error);
          reject(error);
        }
      });
    });

  } catch (error) {
    console.error('❌ Критическая ошибка при streaming обработке:', error);
    throw error;
  }
}