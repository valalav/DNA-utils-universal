import { logger } from './logger';
import { notifications } from './notifications';
// import { i18n } from './i18n'; // ⚠️ Модуль не найден, временно отключен

// ⚡ УЛУЧШЕННАЯ ЗАГЛУШКА для i18n до его реализации
const i18n = {
  t: (key: string, options?: any) => {
    if (typeof options === 'string') return options;
    if (options && typeof options === 'object' && 'default' in options) {
      return options.default || key;
    }
    return key;
  }
};

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorCategory = 'validation' | 'network' | 'data' | 'system' | 'user';

interface ErrorDetails {
  code: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  context?: Record<string, any>;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorDetails[] = [];
  private readonly maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Основной метод обработки ошибок
  handle(
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, any>
  ): void {
    const errorDetails = this.createErrorDetails(error, category, severity, context);
    
    // Логируем ошибку
    this.logError(errorDetails);

    // Уведомляем пользователя
    this.notifyUser(errorDetails);

    // Отправляем в систему мониторинга, если критическая
    if (severity === 'critical') {
      this.reportToCrashlytics(errorDetails);
    }
  }

  // Обработка ошибок валидации
  handleValidationError(
    error: Error | string,
    context?: Record<string, any>
  ): void {
    this.handle(error, 'validation', 'low', context);
  }

  // Обработка сетевых ошибок
  handleNetworkError(
    error: Error | string,
    context?: Record<string, any>
  ): void {
    this.handle(error, 'network', 'medium', context);
  }

  // Обработка ошибок данных
  handleDataError(
    error: Error | string,
    context?: Record<string, any>
  ): void {
    this.handle(error, 'data', 'medium', context);
  }

  // Обработка системных ошибок
  handleSystemError(
    error: Error | string,
    context?: Record<string, any>
  ): void {
    this.handle(error, 'system', 'critical', context);
  }

  // Обработка пользовательских ошибок
  handleUserError(
    error: Error | string,
    context?: Record<string, any>
  ): void {
    this.handle(error, 'user', 'low', context);
  }

  // Создание деталей ошибки
  private createErrorDetails(
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, any>
  ): ErrorDetails {
    const message = typeof error === 'string' ? error : error.message;
    const code = this.generateErrorCode(category, severity);

    return {
      code,
      message,
      severity,
      category,
      timestamp: new Date(),
      context: {
        ...(typeof error === 'object' ? { stack: error.stack } : {}),
        ...context
      }
    };
  }

  // Генерация кода ошибки
  private generateErrorCode(
    category: ErrorCategory,
    severity: ErrorSeverity
  ): string {
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const severityLevel = {
      low: '1',
      medium: '2',
      high: '3',
      critical: '4'
    }[severity];
    const timestamp = Date.now().toString(36);

    return `${categoryPrefix}${severityLevel}${timestamp}`;
  }

  // Логирование ошибки
  private logError(errorDetails: ErrorDetails): void {
    this.errorLog.unshift(errorDetails);
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }

    logger.error(
      `[${errorDetails.code}] ${errorDetails.message}`,
      errorDetails.context
    );
  }

  // Уведомление пользователя
  private notifyUser(errorDetails: ErrorDetails): void {
    const message = this.getLocalizedErrorMessage(errorDetails);
    
    switch (errorDetails.severity) {
      case 'critical':
        notifications.error(message, {
          duration: 0, // Не скрывать автоматически
          details: i18n.t('error.criticalErrorDetails')
        });
        break;
      case 'high':
        notifications.error(message, {
          duration: 10000
        });
        break;
      case 'medium':
        notifications.warning(message, {
          duration: 7000
        });
        break;
      case 'low':
        notifications.info(message, {
          duration: 5000
        });
        break;
    }
  }

  // Получение локализованного сообщения об ошибке
  private getLocalizedErrorMessage(errorDetails: ErrorDetails): string {
    const baseKey = `error.${errorDetails.category}`;
    const specificKey = `${baseKey}.${errorDetails.code}`;

    // Пробуем получить специфичное сообщение для кода ошибки
    const message = i18n.t(specificKey, { 
      default: i18n.t(baseKey, { 
        default: errorDetails.message 
      })
    });

    return message;
  }

  // Отправка критических ошибок в систему мониторинга
  private reportToCrashlytics(errorDetails: ErrorDetails): void {
    // Здесь можно добавить интеграцию с системой мониторинга
    console.error('[Crashlytics]', errorDetails);
  }

  // Получение статистики ошибок
  getErrorStats(): Record<string, number> {
    return this.errorLog.reduce((stats, error) => {
      stats[error.category] = (stats[error.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  }

  // Получение последних ошибок
  getRecentErrors(count: number = 10): ErrorDetails[] {
    return this.errorLog.slice(0, count);
  }

  // Очистка лога ошибок
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Проверка наличия критических ошибок
  hasCriticalErrors(): boolean {
    return this.errorLog.some(error => error.severity === 'critical');
  }
}

// Экспортируем синглтон
export const errorHandler = ErrorHandler.getInstance();

// Глобальный обработчик необработанных ошибок
export function setupGlobalErrorHandling(): void {
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      errorHandler.handleSystemError(error || String(message), {
        source,
        lineno,
        colno
      });
      return true;
    };

    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.handleSystemError(event.reason, {
        type: 'unhandledrejection'
      });
    });
  }
}

// Обертка для асинхронных функций
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  category: ErrorCategory = 'system',
  context?: Record<string, any>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    errorHandler.handle(error as Error, category, 'medium', context);
    throw error;
  }
}

// Утилиты для работы с ошибками
export function isNetworkError(error: any): boolean {
  return error instanceof TypeError && 
    (error.message.includes('network') || error.message.includes('fetch'));
}

export function isTimeoutError(error: any): boolean {
  return error.name === 'AbortError' || 
    error.message.includes('timeout') ||
    error.message.includes('Timeout');
}

export function getErrorCode(error: any): string | null {
  if (typeof error === 'object' && error !== null) {
    return error.code || error.errorCode || null;
  }
  return null;
}
