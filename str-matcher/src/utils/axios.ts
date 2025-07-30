// c:\projects\DNA-utils-universal\str-matcher\src\utils\axios.ts
import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000 // Глобальный таймаут 15 секунд для всех запросов
});

// Добавляем перехватчик запросов для логирования
apiClient.interceptors.request.use(request => {
  // Логируем запросы только в режиме разработки
  if (process.env.NODE_ENV !== 'production') {
    console.log(`API Request: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
  }
  return request;
});

// Добавляем перехватчик ответов для логирования успешных запросов
apiClient.interceptors.response.use(
  response => {
    // Логируем успешные ответы только в режиме разработки
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Response Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  }
);

// Добавляем механизм повторных попыток для сетевых ошибок
apiClient.interceptors.response.use(undefined, async (error) => {
  // Параметры повторных попыток
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // мс
  
  // Проверяем, является ли ошибка повторяемой
  const isRetryableError = 
    !error.response ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNABORTED' ||
    error.message.includes('Network Error') ||
    (error.response && (error.response.status >= 500 || error.response.status === 429));
  
  // Получаем конфигурацию запроса
  const config = error.config;
  
  // Если конфиг не существует или это не повторяемая ошибка, просто отклоняем
  if (!config || !isRetryableError) {
    return Promise.reject(error);
  }
  
  // Устанавливаем счетчик попыток, если его нет
  config.__retryCount = config.__retryCount || 0;
  
  // Если у нас еще есть попытки, пробуем повторить запрос
  if (config.__retryCount < MAX_RETRIES) {
    config.__retryCount += 1;
    
    // Ждем перед повторной попыткой
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    
    console.log(`Повторная попытка запроса (${config.__retryCount}/${MAX_RETRIES}): ${config.url}`);
    
    // Повторяем запрос с той же конфигурацией
    return apiClient(config);
  }
  
  // Если все попытки исчерпаны, отклоняем с ошибкой
  console.error('API Response Error after retries:', error);
  return Promise.reject(error);
});