export class FileProcessor {
  private static CHUNK_SIZE = 1024 * 1024; // 1MB
  private static BATCH_SIZE = 100;

  static async processFile(file: File, onProgress: (progress: number) => void, dbManager: any): Promise<any[]> {
    const fileSize = file.size;
    let offset = 0;
    let header: string[] = [];
    let buffer = '';
    const profiles: any[] = [];
    const uniqueKits = new Set<string>();

    // Читаем первый чанк для получения заголовка
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

      for (const line of lines) {
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

        for (let i = 4; i < values.length && i < header.length; i++) {
          if (values[i]?.trim()) {
            profile.markers[header[i]] = values[i].trim();
          }
        }

        profiles.push(profile);

        if (profiles.length >= this.BATCH_SIZE) {
          await dbManager.saveProfiles(profiles.splice(0));
          onProgress((offset / fileSize) * 100);
          await new Promise(r => setTimeout(r, 50));
        }
      }

      offset += this.CHUNK_SIZE;
    }

    if (profiles.length > 0) {
      await dbManager.saveProfiles(profiles);
    }

    return dbManager.getProfiles();
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