import { STRProfile } from '@/utils/constants';
import { DatabaseManager } from '@/utils/storage/indexedDB';
import Papa from 'papaparse';

interface CSVRow {
  'Kit Number'?: string;
  'Name'?: string;
  'Country'?: string;
  'Haplogroup'?: string;
  [key: string]: string | undefined;
}

export async function processLargeFile(
  file: File,
  onProgress: (progress: number) => void,
  dbManager: DatabaseManager
): Promise<STRProfile[]> {
  try {
    console.log('Начало обработки файла...');
    await dbManager.init(); // Инициализируем БД
    
    const text = await file.text();
    console.log(`Файл прочитан, размер: ${text.length} байт`);

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

          if (onProgress) {
            onProgress((profiles.length / 2000) * 100); // примерная оценка
          }
        },
        complete: async () => {
          try {
            console.log(`Парсинг завершен, найдено ${profiles.length} профилей`);
            if (profiles.length > 0) {
              console.log('Начало сохранения в базу данных...');
              await dbManager.saveProfiles(profiles);
              console.log('Сохранение завершено');
              
              // Получаем и проверяем сохраненные данные
              const savedProfiles = await dbManager.getProfiles();
              console.log(`Проверка: в базе ${savedProfiles.length} профилей`);
              
              resolve(savedProfiles);
            } else {
              reject(new Error('Не найдено валидных профилей'));
            }
          } catch (error) {
            console.error('Ошибка при сохранении:', error);
            reject(error);
          }
        },
        error: (error: Error) => {
          console.error('Ошибка парсинга:', error);
          reject(error);
        }
      });
    });

  } catch (error) {
    console.error('Критическая ошибка:', error);
    throw error;
  }
}