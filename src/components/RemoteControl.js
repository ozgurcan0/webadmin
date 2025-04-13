'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Paper, LoadingOverlay, Slider, Group, ActionIcon, Stack } from '@mantine/core';
import { IconMaximize, IconMinimize, IconAdjustments } from '@tabler/icons-react';
import { wsService } from '@/services/websocket';
import { useNotifications } from '@/context/NotificationContext';
import { SessionSecurity } from '@/utils/sessionSecurity';

export default function RemoteControl({ clientId }) {
  const canvasRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [streamSettings, setStreamSettings] = useState({
    quality: 50,
    scale: 0.75
  });
  const { showStreamNotification } = useNotifications();

  useEffect(() => {
    let animationFrame;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };

    const setupStream = async () => {
      try {
        await wsService.connect(`wss://${process.env.NEXT_PUBLIC_WS_HOST}/remote`);
        
        wsService.sendCommand(clientId, {
          action: 'start_stream',
          settings: streamSettings
        });

        wsService.onMessage('screen_frame', ({ data, width, height }) => {
          setIsLoading(false);
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = `data:image/jpeg;base64,${data}`;
        });

        showStreamNotification('started');
      } catch (error) {
        showStreamNotification('error', error.message);
      }
    };

    const handleMouseEvent = (event) => {
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / canvas.width;
      const y = (event.clientY - rect.top) / canvas.height;

      wsService.sendCommand(clientId, {
        action: 'mouse_event',
        event_type: event.type,
        x,
        y
      });
    };

    const handleKeyEvent = (event) => {
      const modifiers = [];
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.altKey) modifiers.push('alt');
      if (event.shiftKey) modifiers.push('shift');

      wsService.sendCommand(clientId, {
        action: 'keyboard_event',
        event_type: event.type,
        key: event.key,
        modifiers
      });
    };

    if (canvas && clientId) {
      window.addEventListener('resize', handleResize);
      handleResize();

      canvas.addEventListener('mousedown', handleMouseEvent);
      canvas.addEventListener('mouseup', handleMouseEvent);
      canvas.addEventListener('mousemove', handleMouseEvent);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      
      window.addEventListener('keydown', handleKeyEvent);
      window.addEventListener('keyup', handleKeyEvent);

      setupStream();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseEvent);
        canvas.removeEventListener('mouseup', handleMouseEvent);
        canvas.removeEventListener('mousemove', handleMouseEvent);
      }
      window.removeEventListener('keydown', handleKeyEvent);
      window.removeEventListener('keyup', handleKeyEvent);
      
      wsService.disconnect();
      cancelAnimationFrame(animationFrame);
      showStreamNotification('stopped');
    };
  }, [clientId, streamSettings, showStreamNotification]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      canvasRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const updateStreamSettings = (newSettings) => {
    setStreamSettings(prev => {
      const updated = { ...prev, ...newSettings };
      wsService.sendCommand(clientId, {
        action: 'update_stream_settings',
        settings: updated
      });
      return updated;
    });
  };

  return (
    <Stack spacing="md">
      <Group position="right" spacing="xs">
        <Slider
          label="Quality"
          min={10}
          max={100}
          value={streamSettings.quality}
          onChange={(value) => updateStreamSettings({ quality: value })}
          style={{ width: 200 }}
        />
        <ActionIcon
          variant="light"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
        </ActionIcon>
      </Group>

      <Paper shadow="sm" style={{ position: 'relative', aspectRatio: '16/9' }}>
        <LoadingOverlay visible={isLoading} />
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'default'
          }}
        />
      </Paper>
    </Stack>
  );
}