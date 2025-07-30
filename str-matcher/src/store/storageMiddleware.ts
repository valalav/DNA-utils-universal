import { Middleware, AnyAction } from '@reduxjs/toolkit';
import type { UserProfile } from './userProfile';

const STORAGE_KEY = 'str_matcher_user_profile';

export const storageMiddleware: Middleware =
  store => next => (action: AnyAction) => {
    const result = next(action);

    if (
      typeof action === 'object' && 
      action !== null && 
      'type' in action && 
      typeof action.type === 'string' && 
      action.type.startsWith('userProfile/')
    ) {
      try {
        const state = store.getState();
        const profile: UserProfile = state.userProfile;
        
        console.log('Сохранение профиля пользователя:', profile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        console.log('Профиль пользователя успешно сохранен');
      } catch (error) {
        console.error('Ошибка сохранения профиля в хранилище:', error);
        if (error instanceof Error) {
          console.warn('Детали ошибки:', error.message);
        }
      }
    }
    
    return result;
  };

export function loadProfileFromStorage(): UserProfile | null {
  try {
    console.log('Загрузка профиля пользователя из хранилища...');
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      const profile = JSON.parse(stored);
      console.log('Профиль пользователя успешно загружен:', profile);
      return profile;
    }
    console.log('Профиль пользователя не найден в хранилище');
    return null;
  } catch (error) {
    console.error('Ошибка загрузки профиля из хранилища:', error);
    if (error instanceof Error) {
      console.warn('Детали ошибки:', error.message);
    }
    return null;
  }
}