import { logger } from './logger';
import { notifications } from './notifications';
import { i18n } from './i18n';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { STRProfile } from './constants';

interface FileProcessingOptions {
  onProgress?: (progress: number) => void;
  skipEmptyRows?: boolean;
  validateData?: boolean;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

class FileHandler {
  private static readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.txt'];
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB для чтения по частям

  static async processFile(
    file: File,
    options: FileProcessingOptions = {}
  ): Promise<STRProfile[]> {
    const {
      onProgress,
      skipEmptyRows = true,
      validateData = true,
      maxFileSize = this.DEFAULT_MAX_FILE_SIZE,
      allowedExtensions = this.ALLOWED_EXTENSIONS
    } = options;

    // Проверка размера файла
    if (file.size > maxFileSize) {
      throw new Error(i18n.t('error.fileTooLarge', {
        maxSize: `${maxFileSize / (1024 * 1024)}MB`
      }));
    }

    // Проверка расширения
    const extension = this.getFileExtension(file.name).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      throw new Error(i18n.t('error.invalidFileType'));
    }

    try {
      switch (extension) {
        case '.csv':
          return await this.processCSV(file, { onProgress, skipEmptyRows, validateData });
        case '.xlsx':
        case '.xls':
          return await this.processExcel(file, { onProgress, skipEmptyRows, validateData });
        case '.txt':
          return await this.processTXT(file, { onProgress, skipEmptyRows, validateData });
        default:
          throw new Error(i18n.t('error.unsupportedFileType'));
      }
    } catch (error) {
      logger.error('File processing error', error as Error);
      throw error;
    }
  }

  private static getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 1);
  }

  private static async processCSV(
    file: File,
    options: FileProcessingOptions
  ): Promise<STRProfile[]> {
    return new Promise((resolve, reject) => {
      const profiles: STRProfile[] = [];
      let headerRow: string[] = [];
      let rowCount = 0;
      let totalRows = 0;

      // Сначала подсчитаем общее количество строк
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        totalRows = text.split('\n').length - 1; // -1 для заголовка

        // Теперь обрабатываем файл
        Papa.parse(file, {
          header: false,
          skipEmptyLines: options.skipEmptyRows,
          chunk: (results, parser) => {
            // Обработка заголовков
            if (rowCount === 0) {
              headerRow = results.data[0] as string[];
              rowCount++;
              return;
            }

            // Обработка данных
            results.data.forEach((row: unknown) => {
              try {
                if (Array.isArray(row) && row.every(item => typeof item === 'string')) {
                  const profile = this.createProfileFromRow(row, headerRow);
                  if (profile) {
                    profiles.push(profile);
                  }
                }
              } catch (error) {
                logger.warn('Row processing error', { row, error });
              }
            });
          },
          complete: () => {
            resolve(profiles);
          },
          error: (error) => {
            reject(new Error(`CSV parsing error: ${error.message}`));
          }
        });
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  }

  private static async processExcel(
    file: File,
    options: FileProcessingOptions
  ): Promise<STRProfile[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headerRow = jsonData[0] as string[];
          const profiles: STRProfile[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            try {
              const profile = this.createProfileFromRow(jsonData[i] as string[], headerRow);
              if (profile && (!options.validateData || this.validateProfile(profile))) {
                profiles.push(profile);
              }
            } catch (error) {
              logger.warn('Row processing error', { row: i, error });
            }

            if (options.onProgress) {
              options.onProgress((i / (jsonData.length - 1)) * 100);
            }
          }

          resolve(profiles);
        } catch (error) {
          reject(new Error(`Excel parsing error: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static async processTXT(
    file: File,
    options: FileProcessingOptions
  ): Promise<STRProfile[]> {
    // Реализация чтения текстового файла с разделителями
    const text = await this.readFileAsText(file, options.onProgress);
    const lines = text.split('\n');
    const headerRow = lines[0].split('\t').map(h => h.trim());
    const profiles: STRProfile[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line && options.skipEmptyRows) continue;

      try {
        const values = line.split('\t');
        const profile = this.createProfileFromRow(values, headerRow);
        if (profile && (!options.validateData || this.validateProfile(profile))) {
          profiles.push(profile);
        }
      } catch (error) {
        logger.warn('Row processing error', { line: i, error });
      }

      if (options.onProgress) {
        options.onProgress((i / (lines.length - 1)) * 100);
      }
    }

    return profiles;
  }

  private static createProfileFromRow(
    row: string[],
    headers: string[]
  ): STRProfile | null {
    const profile: STRProfile = {
      kitNumber: '',
      markers: {}
    };

    headers.forEach((header, index) => {
      const value = row[index]?.trim();
      if (!value) return;

      switch (header.toLowerCase()) {
        case 'kit number':
        case 'kitnumber':
        case 'kit':
          profile.kitNumber = value;
          break;
        case 'name':
          profile.name = value;
          break;
        case 'country':
          profile.country = value;
          break;
        case 'haplogroup':
          profile.haplogroup = value;
          break;
        default:
          // Проверяем, является ли заголовок маркером STR
          if (this.isSTRMarker(header)) {
            profile.markers[header] = value;
          }
      }
    });

    return profile.kitNumber ? profile : null;
  }

  private static isSTRMarker(header: string): boolean {
    // Упрощенная проверка формата маркера
    return /^DYS\d+|^Y-GATA/.test(header);
  }

  private static validateProfile(profile: STRProfile): boolean {
    if (!profile.kitNumber) return false;
    if (Object.keys(profile.markers).length === 0) return false;
    
    // Дополнительные проверки...
    return true;
  }

  private static async readFileAsText(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress((event.loaded / event.total) * 100);
        }
      };
      reader.readAsText(file);
    });
  }
}

export default FileHandler;