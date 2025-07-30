import { useState, useEffect } from 'react';
import { logger } from './logger';
import { metricsCollector } from './metrics';

type EventCallback = (...args: any[]) => void;
type EventType = string;

interface EventSubscription {
  type: EventType;
  callback: EventCallback;
  once: boolean;
}

class EventManager {
  private static instance: EventManager;
  private listeners: Map<EventType, Set<EventSubscription>> = new Map();
  private eventHistory: Array<{
    type: EventType;
    data: any;
    timestamp: number;
  }> = [];
  private readonly maxHistoryLength = 100;

  private constructor() {}

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  on(type: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const subscription: EventSubscription = { type, callback, once: false };
    this.listeners.get(type)!.add(subscription);

    return () => this.off(type, callback);
  }

  once(type: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const subscription: EventSubscription = { type, callback, once: true };
    this.listeners.get(type)!.add(subscription);

    return () => this.off(type, callback);
  }

  off(type: EventType, callback: EventCallback): void {
    const subscriptions = this.listeners.get(type);
    if (!subscriptions) return;

    subscriptions.forEach(subscription => {
      if (subscription.callback === callback) {
        subscriptions.delete(subscription);
      }
    });

    if (subscriptions.size === 0) {
      this.listeners.delete(type);
    }
  }

  emit(type: EventType, ...args: any[]): void {
    const subscriptions = this.listeners.get(type);
    if (!subscriptions) return;

    const timestamp = Date.now();
    this.eventHistory.push({
      type,
      data: args,
      timestamp
    });

    if (this.eventHistory.length > this.maxHistoryLength) {
      this.eventHistory.shift();
    }

    logger.debug(`Event emitted: ${type}`, { args });
    metricsCollector.trackMetric(`event_${type}`, 1);

    // Создаем копию для итерации, так как коллбэки могут модифицировать Set
    const subscriptionsCopy = Array.from(subscriptions);
    
    subscriptionsCopy.forEach(subscription => {
      try {
        subscription.callback(...args);
        
        if (subscription.once) {
          subscriptions.delete(subscription);
        }
      } catch (error) {
        logger.error(`Error in event handler for ${type}`, error as Error);
      }
    });

    if (subscriptions.size === 0) {
      this.listeners.delete(type);
    }
  }

  // Асинхронная версия emit
  async emitAsync(type: EventType, ...args: any[]): Promise<void> {
    const subscriptions = this.listeners.get(type);
    if (!subscriptions) return;

    const timestamp = Date.now();
    this.eventHistory.push({
      type,
      data: args,
      timestamp
    });

    logger.debug(`Async event emitted: ${type}`, { args });
    metricsCollector.trackMetric(`event_${type}_async`, 1);

    const promises = Array.from(subscriptions).map(async subscription => {
      try {
        await subscription.callback(...args);
        
        if (subscription.once) {
          subscriptions.delete(subscription);
        }
      } catch (error) {
        logger.error(`Error in async event handler for ${type}`, error as Error);
      }
    });

    await Promise.all(promises);

    if (subscriptions.size === 0) {
      this.listeners.delete(type);
    }
  }

  getEventHistory(): Array<{
    type: EventType;
    data: any;
    timestamp: number;
  }> {
    return [...this.eventHistory];
  }

  clearEventHistory(): void {
    this.eventHistory = [];
  }

  // Вспомогательные методы для анализа событий
  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.eventHistory.forEach(event => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });
    return stats;
  }

  getEventTimeline(startTime?: number, endTime?: number): Array<{
    type: EventType;
    count: number;
    timeRange: string;
  }> {
    const start = startTime || Math.min(...this.eventHistory.map(e => e.timestamp));
    const end = endTime || Math.max(...this.eventHistory.map(e => e.timestamp));
    const interval = Math.max(Math.floor((end - start) / 10), 1000); // минимум 1 секунда

    const timeline: Record<string, { type: EventType; count: number; timeRange: string }> = {};

    this.eventHistory
      .filter(event => event.timestamp >= start && event.timestamp <= end)
      .forEach(event => {
        const timeSlot = Math.floor((event.timestamp - start) / interval);
        const rangeStart = new Date(start + timeSlot * interval);
        const rangeEnd = new Date(start + (timeSlot + 1) * interval);
        const timeRange = `${rangeStart.toISOString()} - ${rangeEnd.toISOString()}`;

        if (!timeline[timeRange]) {
          timeline[timeRange] = {
            type: event.type,
            count: 0,
            timeRange
          };
        }

        timeline[timeRange].count++;
      });

    return Object.values(timeline);
  }
}

// Экспортируем синглтон
export const events = EventManager.getInstance();

// Предопределенные типы событий
export const EventTypes = {
  // События профиля
  PROFILE_LOADED: 'profile:loaded',
  PROFILE_UPDATED: 'profile:updated',
  PROFILE_DELETED: 'profile:deleted',

  // События поиска
  SEARCH_STARTED: 'search:started',
  SEARCH_COMPLETED: 'search:completed',
  SEARCH_FAILED: 'search:failed',

  // События маркеров
  MARKER_CHANGED: 'marker:changed',
  MARKER_REMOVED: 'marker:removed',

  // События базы данных
  DATABASE_LOADED: 'database:loaded',
  DATABASE_UPDATED: 'database:updated',
  DATABASE_CLEARED: 'database:cleared',

  // События UI
  UI_THEME_CHANGED: 'ui:theme_changed',
  UI_LANGUAGE_CHANGED: 'ui:language_changed',
  UI_ERROR: 'ui:error'
} as const;

// Хук для работы с событиями в компонентах
export function useEventListener(type: EventType, callback: EventCallback) {
  useEffect(() => {
    const unsubscribe = events.on(type, callback);
    return unsubscribe;
  }, [type, callback]);
}

// Хук для отслеживания специфичных событий STR
export function useSTREvents() {
  const [lastSearch, setLastSearch] = useState<{
    timestamp: number;
    matches: number;
  } | null>(null);

  useEffect(() => {
    const handleSearchComplete = (matches: number) => {
      setLastSearch({
        timestamp: Date.now(),
        matches
      });
    };

    events.on(EventTypes.SEARCH_COMPLETED, handleSearchComplete);
    return () => events.off(EventTypes.SEARCH_COMPLETED, handleSearchComplete);
  }, []);

  return {
    lastSearch,
    emitSearchStarted: () => events.emit(EventTypes.SEARCH_STARTED),
    emitSearchCompleted: (matches: number) => events.emit(EventTypes.SEARCH_COMPLETED, matches),
    emitSearchFailed: (error: Error) => events.emit(EventTypes.SEARCH_FAILED, error)
  };
}