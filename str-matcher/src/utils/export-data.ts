import type { STRMatch } from './constants';
import { formatMarkerValue } from './formatters';

interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeMetadata?: boolean;
  selectedColumns?: string[];
  dateFormat?: string;
}

class DataExporter {
  private static instance: DataExporter;

  private constructor() {}

  static getInstance(): DataExporter {
    if (!DataExporter.instance) {
      DataExporter.instance = new DataExporter();
    }
    return DataExporter.instance;
  }

  async exportMatches(matches: STRMatch[], options: ExportOptions): Promise<void> {
    switch (options.format) {
      case 'csv':
        await this.exportToCSV(matches, options);
        break;
      case 'json':
        await this.exportToJSON(matches, options);
        break;
      case 'excel':
        await this.exportToExcel(matches, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private async exportToCSV(matches: STRMatch[], options: ExportOptions): Promise<void> {
    const { includeMetadata = true, selectedColumns = [] } = options;

    // Подготовка заголовков
    const headers = [
      'Kit Number',
      'Name',
      'Country',
      'Haplogroup',
      'Genetic Distance',
      'Compared Markers',
      'Identical Markers',
      'Percent Identical'
    ];

    if (selectedColumns.length > 0) {
      headers.push(...selectedColumns);
    }

    // Подготовка строк данных
    const rows = matches.map(match => {
      const row = [
        match.profile.kitNumber,
        match.profile.name || '',
        match.profile.country || '',
        match.profile.haplogroup || '',
        match.distance.toString(),
        match.comparedMarkers.toString(),
        match.identicalMarkers.toString(),
        match.percentIdentical.toFixed(1)
      ];

      if (selectedColumns.length > 0) {
        selectedColumns.forEach(column => {
          const value = match.profile.markers[column];
          row.push(value ? formatMarkerValue(column, value) : '');
        });
      }

      return row;
    });

    // Добавление метаданных
    if (includeMetadata) {
      const metadata = [
        ['Export Date', new Date().toISOString()],
        ['Total Matches', matches.length.toString()],
        ['']
      ];
      rows.unshift(...metadata);
    }

    // Формирование CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(this.escapeCSV).join(','))
    ].join('\n');

    // Загрузка файла
    this.downloadFile(csv, 'str_matches.csv', 'text/csv');
  }

  private async exportToJSON(matches: STRMatch[], options: ExportOptions): Promise<void> {
    const { includeMetadata = true } = options;

    const data = {
      matches: matches.map(match => ({
        kitNumber: match.profile.kitNumber,
        name: match.profile.name,
        country: match.profile.country,
        haplogroup: match.profile.haplogroup,
        geneticDistance: match.distance,
        comparedMarkers: match.comparedMarkers,
        identicalMarkers: match.identicalMarkers,
        percentIdentical: match.percentIdentical,
        markers: match.profile.markers
      }))
    };

    if (includeMetadata) {
      Object.assign(data, {
        metadata: {
          exportDate: new Date().toISOString(),
          totalMatches: matches.length,
          version: '1.0'
        }
      });
    }

    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, 'str_matches.json', 'application/json');
  }

  private async exportToExcel(matches: STRMatch[], options: ExportOptions): Promise<void> {
    // Для Excel потребуется дополнительная библиотека, например exceljs
    throw new Error('Excel export not implemented yet');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const dataExporter = DataExporter.getInstance();