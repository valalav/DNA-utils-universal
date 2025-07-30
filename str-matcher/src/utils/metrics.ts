import { STRMatch } from './constants';
import { logger } from './logger';

interface Metric {
  name: string;
  value: number;
  timestamp: number;
}

interface MetricsOptions {
  maxDataPoints?: number;
  aggregationInterval?: number; // в миллисекундах
}

class MetricsCollector {
  private metrics: Map<string, Metric[]>;
  private maxDataPoints: number;
  private aggregationInterval: number;

  constructor(options: MetricsOptions = {}) {
    this.metrics = new Map();
    this.maxDataPoints = options.maxDataPoints || 1000;
    this.aggregationInterval = options.aggregationInterval || 60000; // 1 минута
  }

  trackMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricData = this.metrics.get(name)!;
    metricData.push({
      name,
      value,
      timestamp: Date.now()
    });

    // Ограничиваем количество точек данных
    if (metricData.length > this.maxDataPoints) {
      metricData.shift();
    }

    // Логируем метрику
    logger.debug(`Metric tracked: ${name}`, { value });
  }

  getMetric(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }

  getAggregatedMetric(name: string, aggregationType: 'avg' | 'sum' | 'max' | 'min'): number {
    const metrics = this.getMetric(name);
    if (!metrics.length) return 0;

    const values = metrics.map(m => m.value);
    switch (aggregationType) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      default:
        return 0;
    }
  }

  // Метрики для сравнения STR
  trackSTRComparison(matches: STRMatch[]): void {
    this.trackMetric('total_matches', matches.length);
    
    if (matches.length > 0) {
      const distances = matches.map(m => m.distance);
      this.trackMetric('avg_genetic_distance', 
        distances.reduce((a, b) => a + b, 0) / distances.length
      );
      this.trackMetric('max_genetic_distance', Math.max(...distances));
      
      const identicalPercents = matches.map(m => m.percentIdentical);
      this.trackMetric('avg_identical_percent',
        identicalPercents.reduce((a, b) => a + b, 0) / identicalPercents.length
      );
    }
  }

  // Метрики производительности
  trackPerformance(operation: string, duration: number): void {
    this.trackMetric(`performance_${operation}`, duration);
  }

  // Получение статистики за период
  getStatistics(startTime: number, endTime: number = Date.now()): Record<string, any> {
    const stats: Record<string, any> = {};

    this.metrics.forEach((metrics, name) => {
      const periodMetrics = metrics.filter(
        m => m.timestamp >= startTime && m.timestamp <= endTime
      );

      if (periodMetrics.length > 0) {
        const values = periodMetrics.map(m => m.value);
        stats[name] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          last: values[values.length - 1]
        };
      }
    });

    return stats;
  }

  // Экспорт метрик
  exportMetrics(): string {
    const data = Array.from(this.metrics.entries()).map(([name, metrics]) => {
      return {
        name,
        metrics: metrics.map(m => ({
          timestamp: new Date(m.timestamp).toISOString(),
          value: m.value
        }))
      };
    });

    return JSON.stringify(data, null, 2);
  }
}

// Экспортируем синглтон
export const metricsCollector = new MetricsCollector();