import type { STRProfile } from '@/utils/constants';
import { markers } from '@/utils/constants';

export const parseCSVData = async (csvText: string): Promise<STRProfile[]> => {
  try {
    // Разбиваем текст на строки и фильтруем пустые
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 1) throw new Error('CSV file is empty or invalid');

    // Парсим заголовки
    const headers = lines[0].split(/\t|,/).map(h => h.trim());
    
    // Определяем индексы колонок
    const kitIndex = headers.findIndex(h => 
      h.toLowerCase().includes('kit') || 
      h.toLowerCase() === 'id' || 
      h.toLowerCase() === 'number'
    );
    const nameIndex = headers.findIndex(h => 
      h.toLowerCase() === 'name' || 
      h.toLowerCase().includes('paternal')
    );
    const countryIndex = headers.findIndex(h => 
      h.toLowerCase() === 'country' || 
      h.toLowerCase().includes('origin')
    );
    const haplogroupIndex = headers.findIndex(h => 
      h.toLowerCase().includes('haplo') || 
      h.toLowerCase() === 'subclade'
    );

    // Проверяем наличие хотя бы ID/Kit колонки или маркеров
    const hasMarkers = headers.some(h => markers.includes(h));
    if (kitIndex === -1 && !hasMarkers) {
      throw new Error('No kit number column or markers found');
    }

    // Создаем профили
    const profiles: STRProfile[] = [];
    let profileCounter = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/\t|,/).map(v => v.trim());
      
      const profile: STRProfile = {
        kitNumber: kitIndex >= 0 ? values[kitIndex] || `AUTO_${++profileCounter}` : `AUTO_${++profileCounter}`,
        markers: {}
      };

      if (nameIndex >= 0) profile.name = values[nameIndex];
      if (countryIndex >= 0) profile.country = values[countryIndex];
      if (haplogroupIndex >= 0) profile.haplogroup = values[haplogroupIndex];

      // Собираем маркеры
      headers.forEach((header, index) => {
        if (markers.includes(header) && values[index]) {
          profile.markers[header] = values[index];
        }
      });

      // Добавляем профиль только если есть маркеры
      if (Object.keys(profile.markers).length > 0) {
        profiles.push(profile);
      }
    }

    if (profiles.length === 0) {
      throw new Error('No valid profiles found in CSV');
    }

    return profiles;

  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
};