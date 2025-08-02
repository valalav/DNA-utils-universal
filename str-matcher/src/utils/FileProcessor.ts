// 🔄 УПРОЩЕННЫЙ FileProcessor - работает только в памяти без IndexedDB
export class FileProcessor {
  private static CHUNK_SIZE = 1024 * 1024; // 1MB
  private static BATCH_SIZE = 1000; // Увеличиваем batch size для лучшей производительности

  // 🔄 УПРОЩЕННАЯ обработка файла - возвращает массив профилей
  static async processFile(file: File, onProgress: (progress: number) => void): Promise<any[]> {
    const fileSize = file.size;
    let offset = 0;
    let header: string[] = [];
    let buffer = '';
    const profiles: any[] = [];
    const uniqueKits = new Set<string>();

    console.log(`🔄 Начинаем обработку файла ${file.name} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

    // Читаем первый чанк для получения заголовка
    const firstChunkBlob = file.slice(0, this.CHUNK_SIZE);
    const firstChunkText = await this.readBlob(firstChunkBlob);
    const headerEnd = firstChunkText.indexOf('\n');
    header = firstChunkText.slice(0, headerEnd).split(',').map(h => h.trim());
    buffer = firstChunkText.slice(headerEnd + 1);

    console.log(`🔄 Заголовок CSV: ${header.slice(0, 10).join(', ')}...`);

    while (offset < fileSize) {
      const chunk = file.slice(offset, offset + this.CHUNK_SIZE);
      const chunkText = await this.readBlob(chunk);
      buffer += chunkText;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      // Обрабатываем строки в текущем чанке
      for (const line of lines) {
        if (!line.trim()) continue; // Пропускаем пустые строки
        
        const values = line.split(',');
        const kitNumber = values[0]?.trim();

        if (!kitNumber || uniqueKits.has(kitNumber)) continue;
        uniqueKits.add(kitNumber);

        const profile: {
          kitNumber: string;
          name: string;
          country: string;
          haplogroup: string;
          markers: Record<string, string>;
        } = {
          kitNumber,
          name: values[1]?.trim() || '',
          country: values[2]?.trim() || '',
          haplogroup: values[3]?.trim() || '',
          markers: {}
        };

        // Заполняем маркеры
        for (let i = 4; i < values.length && i < header.length; i++) {
          if (values[i]?.trim()) {
            profile.markers[header[i]] = values[i].trim();
          }
        }

        profiles.push(profile);

        // 🔄 Обновляем прогресс каждые BATCH_SIZE профилей
        if (profiles.length % this.BATCH_SIZE === 0) {
          const progress = (offset / fileSize) * 100;
          onProgress(progress);
          console.log(`🔄 Обработано ${profiles.length} профилей (${progress.toFixed(1)}%)`);
          
          // Небольшая пауза чтобы не блокировать UI
          await new Promise(r => setTimeout(r, 10));
        }
      }

      offset += this.CHUNK_SIZE;
      
      // Обновляем прогресс по чанкам
      const progress = (offset / fileSize) * 100;
      onProgress(progress);
    }

    // Обрабатываем оставшиеся данные в буфере
    if (buffer.trim()) {
      const values = buffer.split(',');
      const kitNumber = values[0]?.trim();

      if (kitNumber && !uniqueKits.has(kitNumber)) {
        uniqueKits.add(kitNumber);

        const profile = {
          kitNumber,
          name: values[1]?.trim() || '',
          country: values[2]?.trim() || '',
          haplogroup: values[3]?.trim() || '',
          markers: {} as Record<string, string>
        };

        for (let i = 4; i < values.length && i < header.length; i++) {
          if (values[i]?.trim()) {
            profile.markers[header[i]] = values[i].trim();
          }
        }

        profiles.push(profile);
      }
    }

    onProgress(100);
    console.log(`✅ Обработка завершена: ${profiles.length} уникальных профилей`);
    
    return profiles;
  }

  // 🔄 STREAMING парсинг для больших файлов с callback'ом
  static async processFileStreaming(
    file: File, 
    onProgress: (progress: number) => void,
    onBatch: (profiles: any[]) => void
  ): Promise<number> {
    const fileSize = file.size;
    let offset = 0;
    let header: string[] = [];
    let buffer = '';
    let totalProfiles = 0;
    const uniqueKits = new Set<string>();

    console.log(`🔄 Начинаем streaming обработку файла ${file.name}`);

    // Читаем заголовок
    const firstChunkBlob = file.slice(0, this.CHUNK_SIZE);
    const firstChunkText = await this.readBlob(firstChunkBlob);
    const headerEnd = firstChunkText.indexOf('\n');
    header = firstChunkText.slice(0, headerEnd).split(',').map(h => h.trim());
    buffer = firstChunkText.slice(headerEnd + 1);

    while (offset < fileSize) {
      const chunk = file.slice(offset, offset + this.CHUNK_SIZE);
      const chunkText = await this.readBlob(chunk);
      buffer += chunkText;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      const batchProfiles: any[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        
        const values = line.split(',');
        const kitNumber = values[0]?.trim();

        if (!kitNumber || uniqueKits.has(kitNumber)) continue;
        uniqueKits.add(kitNumber);

        const profile = {
          kitNumber,
          name: values[1]?.trim() || '',
          country: values[2]?.trim() || '',
          haplogroup: values[3]?.trim() || '',
          markers: {} as Record<string, string>
        };

        for (let i = 4; i < values.length && i < header.length; i++) {
          if (values[i]?.trim()) {
            profile.markers[header[i]] = values[i].trim();
          }
        }

        batchProfiles.push(profile);

        if (batchProfiles.length >= this.BATCH_SIZE) {
          onBatch([...batchProfiles]);
          totalProfiles += batchProfiles.length;
          batchProfiles.length = 0; // Очищаем массив
          
          await new Promise(r => setTimeout(r, 10)); // Пауза для UI
        }
      }

      // Отправляем оставшиеся профили в батче
      if (batchProfiles.length > 0) {
        onBatch([...batchProfiles]);
        totalProfiles += batchProfiles.length;
      }

      offset += this.CHUNK_SIZE;
      onProgress((offset / fileSize) * 100);
    }

    console.log(`✅ Streaming обработка завершена: ${totalProfiles} профилей`);
    return totalProfiles;
  }

  private static readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  }
}