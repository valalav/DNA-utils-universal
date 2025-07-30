import { configureStore } from '@reduxjs/toolkit';
import userProfileReducer from './userProfile';
import { storageMiddleware } from './storageMiddleware';

export const store = configureStore({
  reducer: {
    userProfile: userProfileReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['payload.lastSyncTime'],
        ignoredPaths: ['userProfile.lastSyncTime']
      }
    }).concat(storageMiddleware),
  devTools: process.env.NODE_ENV !== 'production'
});

// Типы для использования в компонентах
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Логирование инициализации store
console.log('Redux store инициализирован');

// Подписка на изменения состояния
store.subscribe(() => {
  const state = store.getState();
  console.log('Состояние обновлено:', state);
});