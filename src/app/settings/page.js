'use client';

import { useState } from 'react';
import { Card, Switch, Text, NumberInput, Group, Button, Stack, TextInput, Select, ColorInput } from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';
import DashboardLayout from '@/components/DashboardLayout';
import { wsService } from '@/services/websocket';

export default function Settings() {
  const [settings, setSettings] = useState({
    monitoring: {
      updateInterval: 5,
      enableNotifications: true,
      cpuThreshold: 80,
      memoryThreshold: 80,
    },
    security: {
      encryptionEnabled: true,
      logLevel: 'info',
      autoBlockSuspicious: true,
    },
    appearance: {
      theme: 'light',
      accentColor: '#1971c2',
      sidebarWidth: 250,
    }
  });

  const handleSave = () => {
    // Save settings to local storage
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Send settings to connected clients
    wsService.sendCommand(null, {
      command: 'update_settings',
      settings: settings
    });
  };

  return (
    <DashboardLayout>
      <Text size="xl" weight={700} mb="lg">Settings</Text>

      <Stack spacing="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text weight={500} mb="md">Monitoring Settings</Text>
          <Stack>
            <NumberInput
              label="Update Interval (seconds)"
              value={settings.monitoring.updateInterval}
              onChange={(value) => setSettings({
                ...settings,
                monitoring: { ...settings.monitoring, updateInterval: value }
              })}
              min={1}
              max={60}
            />
            <Switch
              label="Enable Notifications"
              checked={settings.monitoring.enableNotifications}
              onChange={(event) => setSettings({
                ...settings,
                monitoring: { ...settings.monitoring, enableNotifications: event.currentTarget.checked }
              })}
            />
            <NumberInput
              label="CPU Usage Alert Threshold (%)"
              value={settings.monitoring.cpuThreshold}
              onChange={(value) => setSettings({
                ...settings,
                monitoring: { ...settings.monitoring, cpuThreshold: value }
              })}
              min={0}
              max={100}
            />
            <NumberInput
              label="Memory Usage Alert Threshold (%)"
              value={settings.monitoring.memoryThreshold}
              onChange={(value) => setSettings({
                ...settings,
                monitoring: { ...settings.monitoring, memoryThreshold: value }
              })}
              min={0}
              max={100}
            />
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text weight={500} mb="md">Security Settings</Text>
          <Stack>
            <Switch
              label="Enable Encryption"
              checked={settings.security.encryptionEnabled}
              onChange={(event) => setSettings({
                ...settings,
                security: { ...settings.security, encryptionEnabled: event.currentTarget.checked }
              })}
            />
            <Select
              label="Log Level"
              value={settings.security.logLevel}
              onChange={(value) => setSettings({
                ...settings,
                security: { ...settings.security, logLevel: value }
              })}
              data={[
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' }
              ]}
            />
            <Switch
              label="Auto-block Suspicious Activities"
              checked={settings.security.autoBlockSuspicious}
              onChange={(event) => setSettings({
                ...settings,
                security: { ...settings.security, autoBlockSuspicious: event.currentTarget.checked }
              })}
            />
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text weight={500} mb="md">Appearance Settings</Text>
          <Stack>
            <Select
              label="Theme"
              value={settings.appearance.theme}
              onChange={(value) => setSettings({
                ...settings,
                appearance: { ...settings.appearance, theme: value }
              })}
              data={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System Default' }
              ]}
            />
            <ColorInput
              label="Accent Color"
              value={settings.appearance.accentColor}
              onChange={(value) => setSettings({
                ...settings,
                appearance: { ...settings.appearance, accentColor: value }
              })}
            />
            <NumberInput
              label="Sidebar Width (px)"
              value={settings.appearance.sidebarWidth}
              onChange={(value) => setSettings({
                ...settings,
                appearance: { ...settings.appearance, sidebarWidth: value }
              })}
              min={200}
              max={400}
            />
          </Stack>
        </Card>

        <Group position="right">
          <Button
            leftIcon={<IconDeviceFloppy size="1.2rem" />}
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Group>
      </Stack>
    </DashboardLayout>
  );
}