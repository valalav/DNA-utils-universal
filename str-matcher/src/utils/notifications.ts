import { useState, useEffect } from 'react';
import { logger } from './logger';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  details?: string;
  timestamp: number;
  duration?: number;
  isRead: boolean;
}

interface NotificationOptions {
  duration?: number;
  details?: string;
  onClick?: () => void;
}

class NotificationManager {
  private static instance: NotificationManager;
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private maxNotifications: number = 100;

  private constructor() {
    // Приватный конструктор для синглтона
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  private createNotification(
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ): Notification {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = {
      id,
      type,
      message,
      details: options.details,
      timestamp: Date.now(),
      duration: options.duration,
      isRead: false
    };

    this.notifications.unshift(notification);

    // Ограничиваем количество уведомлений
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Автоматическое удаление по истечении времени
    if (options.duration) {
      setTimeout(() => {
        this.remove(id);
      }, options.duration);
    }

    this.notify();
    logger.debug('New notification', notification);

    return notification;
  }

  success(message: string, options?: NotificationOptions): Notification {
    return this.createNotification('success', message, {
      duration: 5000,
      ...options
    });
  }

  info(message: string, options?: NotificationOptions): Notification {
    return this.createNotification('info', message, {
      duration: 5000,
      ...options
    });
  }

  warning(message: string, options?: NotificationOptions): Notification {
    return this.createNotification('warning', message, {
      duration: 7000,
      ...options
    });
  }

  error(message: string, options?: NotificationOptions): Notification {
    return this.createNotification('error', message, {
      duration: 10000,
      ...options
    });
  }

  remove(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.notify();
    }
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
      this.notify();
    }
  }

  clear(): void {
    this.notifications = [];
    this.notify();
  }

  clearRead(): void {
    this.notifications = this.notifications.filter(n => !n.isRead);
    this.notify();
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  getByType(type: NotificationType): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  // Группировка схожих уведомлений
  private shouldGroupNotifications(n1: Notification, n2: Notification): boolean {
    return (
      n1.type === n2.type &&
      n1.message === n2.message &&
      Math.abs(n1.timestamp - n2.timestamp) < 1000
    );
  }

  getGroupedNotifications(): Notification[] {
    const grouped: Notification[] = [];
    let currentGroup: Notification[] = [];

    this.notifications.forEach(notification => {
      if (
        currentGroup.length > 0 &&
        this.shouldGroupNotifications(currentGroup[0], notification)
      ) {
        currentGroup.push(notification);
      } else {
        if (currentGroup.length > 0) {
          grouped.push({
            ...currentGroup[0],
            message: currentGroup.length > 1 
              ? `${currentGroup[0].message} (${currentGroup.length})`
              : currentGroup[0].message
          });
        }
        currentGroup = [notification];
      }
    });

    if (currentGroup.length > 0) {
      grouped.push({
        ...currentGroup[0],
        message: currentGroup.length > 1 
          ? `${currentGroup[0].message} (${currentGroup.length})`
          : currentGroup[0].message
      });
    }

    return grouped;
  }
}

// Экспортируем синглтон
export const notifications = NotificationManager.getInstance();

// Хук для работы с уведомлениями в компонентах
export function useNotifications() {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notifications.subscribe(setNotificationsList);
    return unsubscribe;
  }, []);

  return {
    notifications: notificationsList,
    unreadCount: notificationsList.filter(n => !n.isRead).length,
    markAsRead: notifications.markAsRead.bind(notifications),
    remove: notifications.remove.bind(notifications),
    clear: notifications.clear.bind(notifications),
    clearRead: notifications.clearRead.bind(notifications)
  };
}