import { markers, palindromes } from './constants';
import Papa from 'papaparse';
import type { STRProfile } from './constants';
import { dbManager } from '@/utils/storage/indexedDB';

interface CSVRow {
  'Kit Number'?: string;
  'Name'?: string;
  'Country'?: string;
  'Haplogroup'?: string;
  [key: string]: string | undefined;
}

// Кэш для оптимизации очистки значений
const valueCache = new Map<string, string>();

export function cleanValue(value: any): string {
  if (!value) return '';
  
  const key = String(value);
  if (valueCache.has(key)) {
    return valueCache.get(key)!;
  }

  const cleaned = String(value)
    .trim()
    .replace(/\u00a0/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '');

  if (valueCache.size > 10000) valueCache.clear();
  valueCache.set(key, cleaned);
  return cleaned;
}

function processPalindromicMarker(value: string, marker: string): string {
  if (!(marker in palindromes)) return value;

  const values = value.split(/[-,]/);
  if (values.length !== palindromes[marker as keyof typeof palindromes]) {
    return value;
  }

  return values
    .map(v => cleanValue(v))
    .sort((a, b) => Number(a) - Number(b))
    .join('-');
}

const BATCH_SIZE = 2000; // Увеличиваем размер пакета

export function parseCSVData(text: string, onProgress?: (progress: number) => void): Promise<STRProfile[]> {
  return new Promise((resolve, reject) => {
    const profiles: STRProfile[] = [];
    const processedKits = new Set<string>();
    
    Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      chunk: (results: Papa.ParseResult<CSVRow>) => {
        const validProfiles = results.data
          .filter(row => {
            const kitNumber = row['Kit Number'];
            return kitNumber && !processedKits.has(kitNumber);
          })
          .map(row => {
            const kitNumber = row['Kit Number']!;
            processedKits.add(kitNumber);

            return {
              kitNumber,
              name: row['Name'] || '',
              country: row['Country'] || '', 
              haplogroup: row['Haplogroup'] || '',
              markers: Object.fromEntries(
                markers
                  .filter(marker => row[marker])
                  .map(marker => [marker, row[marker]!])
              )
            };
          });

        profiles.push(...validProfiles);
      },
      complete: () => resolve(profiles),
      error: (error: Error) => reject(error)
    });
  });
}


// Остальной код остается без изменений
export class ProfileIndex {
  private index: Map<string, Map<string, Set<string>>> = new Map();

  constructor(profiles: STRProfile[]) {
    this.buildIndex(profiles);
  }

  private buildIndex(profiles: STRProfile[]) {
    profiles.forEach(profile => {
      Object.entries(profile.markers).forEach(([marker, value]) => {
        if (!this.index.has(marker)) {
          this.index.set(marker, new Map());
        }
        
        const markerIndex = this.index.get(marker)!;
        if (!markerIndex.has(value)) {
          markerIndex.set(value, new Set());
        }
        
        markerIndex.get(value)!.add(profile.kitNumber);
      });
    });
  }

  findMatchingProfiles(marker: string, value: string): Set<string> {
    return this.index.get(marker)?.get(value) || new Set();
  }

  getMarkerValues(marker: string): string[] {
    return Array.from(this.index.get(marker)?.keys() || []);
  }
}

const resultCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function getCachedResult<T>(key: string, compute: () => T): T {
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const result = compute();
  resultCache.set(key, { data: result, timestamp: Date.now() });
  return result;
}

export function clearCache() {
  valueCache.clear();
  resultCache.clear();
}