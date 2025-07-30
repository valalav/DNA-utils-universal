import axios from 'axios';

// Не устанавливаем baseURL глобально, так как он может отличаться для разных запросов
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9003/api'; 