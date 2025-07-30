import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Repository } from '../utils/constants';

interface UserSettings {
  markerCount: number;
  maxDistance: number;
  maxMatches: number;
  markerSortOrder: 'default' | 'mutation_rate';
  repositories: Repository[];
  theme: 'light' | 'dark';
  language: string;
  performance: {
    useWorkers: boolean;
    batchSize: number;
    cacheResults: boolean;
  };
}

interface UserState {
  id: string | null;
  settings: UserSettings;
  isAuthenticated: boolean;
  lastSyncTime: Date | null;
}

const initialState: UserState = {
  id: null,
  settings: {
    markerCount: 37,
    maxDistance: 25,
    maxMatches: 200,
    markerSortOrder: 'mutation_rate',
    repositories: [],
    theme: 'light',
    language: 'en',
    performance: {
      useWorkers: true,
      batchSize: 100,
      cacheResults: true
    }
  },
  isAuthenticated: false,
  lastSyncTime: null
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<string>) {
      state.id = action.payload;
      state.isAuthenticated = true;
      state.lastSyncTime = new Date();
    },
    updateSettings(state, action: PayloadAction<Partial<UserSettings>>) {
      state.settings = { 
        ...state.settings, 
        ...action.payload 
      };
      state.lastSyncTime = new Date();
    },
    addRepository(state, action: PayloadAction<Repository>) {
      state.settings.repositories.push(action.payload);
      state.lastSyncTime = new Date();
    },
    removeRepository(state, action: PayloadAction<string>) {
      state.settings.repositories = state.settings.repositories.filter(
        repo => repo.id !== action.payload
      );
      state.lastSyncTime = new Date();
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.settings.theme = action.payload;
    },
    setLanguage(state, action: PayloadAction<string>) {
      state.settings.language = action.payload;
    },
    updatePerformanceSettings(
      state,
      action: PayloadAction<Partial<UserSettings['performance']>>
    ) {
      state.settings.performance = {
        ...state.settings.performance,
        ...action.payload
      };
    },
    logout(state) {
      state.id = null;
      state.isAuthenticated = false;
      state.lastSyncTime = null;
    }
  }
});

export const { 
  setUser, 
  updateSettings, 
  addRepository, 
  removeRepository,
  setTheme,
  setLanguage,
  updatePerformanceSettings,
  logout 
} = userSlice.actions;

export default userSlice.reducer;