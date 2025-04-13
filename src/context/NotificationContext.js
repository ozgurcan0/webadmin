'use client';

import { createContext, useContext } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
  const showNotification = ({ title, message, type = 'info', duration = 5000 }) => {
    const icons = {
      success: <IconCheck />,
      error: <IconX />,
      warning: <IconAlertTriangle />,
      info: <IconInfoCircle />
    };

    const colors = {
      success: 'green',
      error: 'red',
      warning: 'orange',
      info: 'blue'
    };

    notifications.show({
      title,
      message,
      icon: icons[type],
      color: colors[type],
      autoClose: duration
    });
  };

  const showStreamNotification = (status, details = '') => {
    const notifications = {
      started: {
        title: 'Screen Streaming Started',
        message: 'Remote control session is now active',
        type: 'success'
      },
      stopped: {
        title: 'Screen Streaming Stopped',
        message: 'Remote control session ended',
        type: 'info'
      },
      error: {
        title: 'Streaming Error',
        message: `Failed to stream screen: ${details}`,
        type: 'error'
      },
      reconnecting: {
        title: 'Connection Lost',
        message: 'Attempting to reconnect...',
        type: 'warning'
      }
    };

    const notification = notifications[status];
    if (notification) {
      showNotification(notification);
    }
  };

  const showConnectionNotification = (status, details = '') => {
    const notifications = {
      connected: {
        title: 'Client Connected',
        message: details || 'Successfully connected to remote client',
        type: 'success'
      },
      disconnected: {
        title: 'Client Disconnected',
        message: details || 'Connection to remote client lost',
        type: 'warning'
      },
      error: {
        title: 'Connection Error',
        message: details || 'Failed to connect to remote client',
        type: 'error'
      }
    };

    const notification = notifications[status];
    if (notification) {
      showNotification(notification);
    }
  };

  const showCommandNotification = (status, command, details = '') => {
    const notifications = {
      success: {
        title: 'Command Executed',
        message: `Successfully executed: ${command}`,
        type: 'success'
      },
      error: {
        title: 'Command Failed',
        message: `Failed to execute ${command}: ${details}`,
        type: 'error'
      }
    };

    const notification = notifications[status];
    if (notification) {
      showNotification(notification);
    }
  };

  return (
    <NotificationContext.Provider value={{
      showNotification,
      showStreamNotification,
      showConnectionNotification,
      showCommandNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);