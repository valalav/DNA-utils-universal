import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Repository } from '@/utils/constants';
import type { ColorSchemeName } from '@/config/colorSchemes';
import type { Language } from '@/config/translations';

export interface UserSettings {
  defaultMarkerCount: number;
  maxDistance: number;
  maxMatches: number;
  markerSortOrder: 'default' | 'mutation_rate';
  selectedRepositories: string[];
  customRepositories: Repository[];
  tableSettings: {
    pageSize: number;
    visibleColumns: string[];
    defaultSort?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    colorScheme: ColorSchemeName;
    customColorSchemes?: Array<{
      name: string;
      colors: Record<string, string>;
    }>;
    fontSize: 'small' | 'medium' | 'large';
    density: 'compact' | 'comfortable' | 'spacious';
    accentColor: string;
    language: Language;
  };
  performance: {
    useWorkers: boolean;
    chunkSize: number;
    cacheResults: boolean;
    maxCacheSize: number;
  };
  export: {
    defaultFormat: 'csv' | 'jpg';
    includeHaplogroups: boolean;
    dateFormat: string;
  };
}

export interface UserProfile {
  id: string | null;
  settings: UserSettings;
  lastSyncTime: Date | null;
}

const initialState: UserProfile = {
  id: null,
  settings: {
    defaultMarkerCount: 37,
    maxDistance: 25,
    maxMatches: 200,
    markerSortOrder: 'mutation_rate',
    selectedRepositories: [],
    customRepositories: [],
    tableSettings: {
      pageSize: 50,
      visibleColumns: ['kitNumber', 'name', 'country', 'haplogroup', 'distance'],
      defaultSort: {
        field: 'distance',
        direction: 'asc'
      }
    },
    appearance: {
      theme: 'system',
      colorScheme: 'classic',
      customColorSchemes: [],
      fontSize: 'medium',
      density: 'comfortable',
      accentColor: 'var(--primary)',
      language: 'en'
    },
    performance: {
      useWorkers: true,
      chunkSize: 1000,
      cacheResults: true,
      maxCacheSize: 100
    },
    export: {
      defaultFormat: 'csv',
      includeHaplogroups: true,
      dateFormat: 'YYYY-MM-DD'
    }
  },
  lastSyncTime: null
};

const userProfileSlice = createSlice({
  name: 'userProfile',
  initialState,
  reducers: {
    // Основные actions
    setProfile: (state, action: PayloadAction<UserProfile>) => {
      return { ...state, ...action.payload };
    },

    updateSettings: (state, action: PayloadAction<Partial<UserSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      state.lastSyncTime = new Date();
    },

    // Работа с репозиториями
    addCustomRepository: (state, action: PayloadAction<Repository>) => {
      state.settings.customRepositories.push(action.payload);
      state.lastSyncTime = new Date();
    },

    removeCustomRepository: (state, action: PayloadAction<string>) => {
      state.settings.customRepositories = state.settings.customRepositories
        .filter(repo => repo.id !== action.payload);
      state.lastSyncTime = new Date();
    },

    // Настройки внешнего вида
    updateAppearance: (state, action: PayloadAction<Partial<UserSettings['appearance']>>) => {
      state.settings.appearance = {
        ...state.settings.appearance,
        ...action.payload
      };
      state.lastSyncTime = new Date();
    },

    updateColorScheme: (state, action: PayloadAction<ColorSchemeName>) => {
      state.settings.appearance.colorScheme = action.payload;
      state.lastSyncTime = new Date();
    },

    addCustomColorScheme: (state, action: PayloadAction<{
      name: string;
      colors: Record<string, string>;
    }>) => {
      if (!state.settings.appearance.customColorSchemes) {
        state.settings.appearance.customColorSchemes = [];
      }
      state.settings.appearance.customColorSchemes.push(action.payload);
      state.lastSyncTime = new Date();
    },

    removeCustomColorScheme: (state, action: PayloadAction<string>) => {
      if (state.settings.appearance.customColorSchemes) {
        state.settings.appearance.customColorSchemes = 
          state.settings.appearance.customColorSchemes.filter(
            scheme => scheme.name !== action.payload
          );
        state.lastSyncTime = new Date();
      }
    },

    // Настройки таблицы
    updateTableSettings: (state, action: PayloadAction<Partial<UserSettings['tableSettings']>>) => {
      state.settings.tableSettings = {
        ...state.settings.tableSettings,
        ...action.payload
      };
    },

    // Настройки производительности
    updatePerformanceSettings: (state, action: PayloadAction<Partial<UserSettings['performance']>>) => {
      state.settings.performance = {
        ...state.settings.performance,
        ...action.payload
      };
    },

    // Сброс профиля
    resetProfile: () => initialState
  }
});

// Экспорт actions
export const {
  setProfile,
  updateSettings,
  addCustomRepository,
  removeCustomRepository,
  updateAppearance,
  updateColorScheme,
  addCustomColorScheme,
  removeCustomColorScheme,
  updateTableSettings,
  updatePerformanceSettings,
  resetProfile
} = userProfileSlice.actions;

// Селекторы
export const selectUserProfile = (state: { userProfile: UserProfile }) => state.userProfile;
export const selectUserSettings = (state: { userProfile: UserProfile }) => state.userProfile.settings;
export const selectAppearance = (state: { userProfile: UserProfile }) => state.userProfile.settings.appearance;
export const selectTableSettings = (state: { userProfile: UserProfile }) => state.userProfile.settings.tableSettings;
export const selectPerformanceSettings = (state: { userProfile: UserProfile }) => state.userProfile.settings.performance;
export const selectCustomColorSchemes = (state: { userProfile: UserProfile }) => 
  state.userProfile.settings.appearance.customColorSchemes || [];

export default userProfileSlice.reducer;