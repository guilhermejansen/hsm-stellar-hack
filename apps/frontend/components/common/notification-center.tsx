'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, XCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { formatRelativeDate } from '@/lib/utils';

/**
 * Notification Center Component
 * 
 * Central hub for system notifications, alerts, and updates
 */

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationCenterProps {
  notificationCount: number;
}

export function NotificationCenter({ notificationCount }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Mock notifications for demo
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: 'Transaction Executed',
        message: 'Transaction #abc123 has been successfully executed on Stellar network',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        read: false,
        actionUrl: '/dashboard/transactions/abc123'
      },
      {
        id: '2',
        type: 'warning',
        title: 'Approval Required',
        message: 'New transaction awaiting your approval: 5,000 XLM transfer',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        read: false,
        actionUrl: '/approve/def456'
      },
      {
        id: '3',
        type: 'info',
        title: 'System Maintenance',
        message: 'Scheduled maintenance completed. All systems operational.',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        read: true,
      },
      {
        id: '4',
        type: 'error',
        title: 'HSM Alert',
        message: 'Temporary HSM connectivity issue resolved',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        read: true,
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-error-500" />;
      default:
        return <Clock className="w-4 h-4 text-stellar-500" />;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5 text-corporate-600 dark:text-corporate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-stellar-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <Badge variant="warning" className="w-fit">
                {unreadCount} unread
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-corporate-50 dark:hover:bg-corporate-800 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-stellar-50 dark:bg-stellar-900/20' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-stellar-500 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-corporate-600 dark:text-corporate-300 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-corporate-500 dark:text-corporate-400 mt-2">
                              {formatRelativeDate(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="h-6 w-6 p-0 text-corporate-400 hover:text-corporate-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-corporate-300 mx-auto mb-4" />
                  <p className="text-sm text-corporate-600 dark:text-corporate-300">
                    No notifications
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}