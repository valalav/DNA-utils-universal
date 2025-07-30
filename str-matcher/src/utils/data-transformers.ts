import { STRProfile, STRMatch } from './constants';
import { logger } from './logger';

interface TransformationOptions {
  includeNulls?: boolean;
  sortMarkers?: boolean;
  validateData?: boolean;
}

export class DataTransformer {
  // Преобразование в формат FTDNA
  static toFTDNAFormat(profile: STRProfile): Record<string, any> {
    return {
      'Kit Number': profile.kitNumber,
      'Name': profile.name || '',
      'Country': profile.country || '',
      'Haplogroup': profile.haplogroup || '',
      ...profile.markers
    };
  }

  // Преобразование из формата FTDNA
  static fromFTDNAFormat(data: Record<string, any>): STRProfile {
    const markers: Record<string, string> = {};
    const baseFields = ['Kit Number', 'Name', 'Country', 'Haplogroup'];
    
    Object.entries(data).forEach(([key, value]) => {
      if (!baseFields.includes(key)) {
        markers[key] = String(value);
      }
    });

    return {
      kitNumber: data['Kit Number'],
      name: data['Name'],
      country: data['Country'],
      haplogroup: data['Haplogroup'],
      markers
    };
  }

  // Преобразование в табличный формат
  static toTableFormat(
    matches: STRMatch[],
    options: TransformationOptions = {}
  ): Array<Record<string, any>> {
    const { includeNulls = false, sortMarkers = true } = options;

    return matches.map(match => {
      const baseData: Record<string, string | number> = {
        kitNumber: match.profile.kitNumber,
        name: match.profile.name || '',
        country: match.profile.country || '',
        haplogroup: match.profile.haplogroup || '',
        geneticDistance: match.distance,
        comparedMarkers: match.comparedMarkers,
        percentIdentical: match.percentIdentical
      };

      if (!includeNulls) {
        Object.entries(baseData).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            delete baseData[key];
          }
        });
      }

      const markerData = sortMarkers 
        ? this.getSortedMarkers(match.profile.markers)
        : match.profile.markers;

      return {
        ...baseData,
        ...markerData
      };
    });
  }

  // Преобразование в формат для визуализации
  static toVisualizationFormat(matches: STRMatch[]): any {
    return matches.map(match => ({
      id: match.profile.kitNumber,
      data: {
        name: match.profile.name,
        country: match.profile.country,
        haplogroup: match.profile.haplogroup,
        distance: match.distance,
        markers: Object.entries(match.profile.markers).map(([key, value]) => ({
          marker: key,
          value: value
        }))
      },
      metrics: {
        geneticDistance: match.distance,
        percentIdentical: match.percentIdentical,
        comparedMarkers: match.comparedMarkers
      }
    }));
  }

  // Преобразование в формат для экспорта
  static toExportFormat(
    matches: STRMatch[],
    format: 'csv' | 'json' | 'xml'
  ): string {
    switch (format) {
      case 'csv':
        return this.toCSV(this.toTableFormat(matches));
      case 'json':
        return JSON.stringify(matches, null, 2);
      case 'xml':
        return this.toXML(matches);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Преобразование для сравнения маркеров
  static toComparisonFormat(profile1: STRProfile, profile2: STRProfile): {
    matches: Record<string, boolean>;
    differences: Record<string, { value1: string; value2: string }>;
  } {
    const matches: Record<string, boolean> = {};
    const differences: Record<string, { value1: string; value2: string }> = {};

    const allMarkers = new Set([
      ...Object.keys(profile1.markers),
      ...Object.keys(profile2.markers)
    ]);

    allMarkers.forEach(marker => {
      const value1 = profile1.markers[marker];
      const value2 = profile2.markers[marker];

      if (value1 && value2) {
        if (value1 === value2) {
          matches[marker] = true;
        } else {
          differences[marker] = { value1, value2 };
        }
      }
    });

    return { matches, differences };
  }

  // Приватные вспомогательные методы
  private static getSortedMarkers(
    markers: Record<string, string>
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(markers).sort(([a], [b]) => a.localeCompare(b))
    );
  }

  private static toCSV(data: Array<Record<string, any>>): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ];

    return csv.join('\n');
  }

  private static toXML(matches: STRMatch[]): string {
    const xmlEntries = matches.map(match => `
      <match>
        <profile>
          <kitNumber>${this.escapeXML(match.profile.kitNumber)}</kitNumber>
          <name>${this.escapeXML(match.profile.name || '')}</name>
          <country>${this.escapeXML(match.profile.country || '')}</country>
          <haplogroup>${this.escapeXML(match.profile.haplogroup || '')}</haplogroup>
          <markers>
            ${Object.entries(match.profile.markers).map(([key, value]) => `
              <marker name="${this.escapeXML(key)}">${this.escapeXML(value)}</marker>
            `).join('')}
          </markers>
        </profile>
        <distance>${match.distance}</distance>
        <comparedMarkers>${match.comparedMarkers}</comparedMarkers>
        <percentIdentical>${match.percentIdentical}</percentIdentical>
      </match>
    `);

    return `<?xml version="1.0" encoding="UTF-8"?>
<matches>
  ${xmlEntries.join('')}
</matches>`;
  }

  private static escapeXML(str: string): string {
    const entityMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };
    return str.replace(/[&<>"']/g, s => entityMap[s]);
  }
}

// Экспортируем вспомогательные функции
export const toFTDNAFormat = DataTransformer.toFTDNAFormat.bind(DataTransformer);
export const fromFTDNAFormat = DataTransformer.fromFTDNAFormat.bind(DataTransformer);
export const toTableFormat = DataTransformer.toTableFormat.bind(DataTransformer);
export const toVisualizationFormat = DataTransformer.toVisualizationFormat.bind(DataTransformer);
export const toExportFormat = DataTransformer.toExportFormat.bind(DataTransformer);
export const toComparisonFormat = DataTransformer.toComparisonFormat.bind(DataTransformer);