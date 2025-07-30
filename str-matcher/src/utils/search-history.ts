import type { HistoryItem, STRProfile } from './constants';

const HISTORY_KEY = 'str_matcher_history';
const MAX_HISTORY_ITEMS = 50;

interface SearchHistoryData {
  items: HistoryItem[];
  lastUpdated: string;
  version: '1.0';
}

export class SearchHistoryManager {
  private history: HistoryItem[];

  constructor() {
    this.history = [];
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      const savedData = localStorage.getItem(HISTORY_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData) as SearchHistoryData;
        this.history = parsed.items;
        
        // Очистка старых записей
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        this.history = this.history.filter(item => 
          new Date(item.timestamp) > monthAgo
        );
      }
    } catch (error) {
      console.error('Error loading search history:', error);
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      const data: SearchHistoryData = {
        items: this.history,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  addSearch(profile: STRProfile): void {
    const historyItem: HistoryItem = {
      ...profile,
      timestamp: new Date()
    };

    // Удаляем предыдущий поиск того же профиля, если есть
    this.history = this.history.filter(item => 
      item.kitNumber !== profile.kitNumber
    );

    // Добавляем новый поиск в начало
    this.history.unshift(historyItem);

    // Ограничиваем размер истории
    if (this.history.length > MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
    }

    this.saveHistory();
  }

  getHistory(): HistoryItem[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  removeItem(kitNumber: string): void {
    this.history = this.history.filter(item => 
      item.kitNumber !== kitNumber
    );
    this.saveHistory();
  }

  searchInHistory(query: string): HistoryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(item => 
      item.kitNumber.toLowerCase().includes(lowerQuery) ||
      (item.name?.toLowerCase().includes(lowerQuery)) ||
      (item.haplogroup?.toLowerCase().includes(lowerQuery)) ||
      (item.country?.toLowerCase().includes(lowerQuery))
    );
  }

  getRecentSearches(limit: number = 10): HistoryItem[] {
    return this.history.slice(0, limit);
  }

  getSearchesByHaplogroup(haplogroup: string): HistoryItem[] {
    return this.history.filter(item => 
      item.haplogroup?.startsWith(haplogroup)
    );
  }

  getSearchStatistics() {
    return {
      totalSearches: this.history.length,
      uniqueHaplogroups: new Set(
        this.history
          .map(item => item.haplogroup)
          .filter(Boolean)
      ).size,
      uniqueCountries: new Set(
        this.history
          .map(item => item.country)
          .filter(Boolean)
      ).size,
      searchesByMonth: this.getSearchesByMonth(),
    };
  }

  private getSearchesByMonth(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.history.forEach(item => {
      const date = new Date(item.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }
}

// Экспортируем singleton instance
export const searchHistory = new SearchHistoryManager();