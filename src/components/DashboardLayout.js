import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, AppShell, Navbar, Header, Text, NavLink, Title, Group, Select, Badge } from '@mantine/core';
import { IconDesktop, IconChartLine, IconSettings, IconUsers, IconShieldLock, IconFile, IconBell, IconDeviceDesktop } from '@tabler/icons-react';
import { useClients } from '@/context/ClientContext';
import { useNotifications } from '@/context/NotificationContext';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedClient, setSelectedClient, connectedClients } = useClients();
  const { showNotification } = useNotifications();

  const menuItems = [
    { label: 'Connected Devices', icon: IconDesktop, path: '/' },
    { label: 'Remote Control', icon: IconDeviceDesktop, path: '/remote' },
    { label: 'Monitoring', icon: IconChartLine, path: '/monitoring' },
    { label: 'Access Control', icon: IconShieldLock, path: '/access' },
    { label: 'File Explorer', icon: IconFile, path: '/files' },
    { label: 'Settings', icon: IconSettings, path: '/settings' },
  ];

  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 250 }} p="xs">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              active={pathname === item.path}
              label={
                <Group position="apart" style={{ width: '100%' }}>
                  <Text>{item.label}</Text>
                  {item.path === '/' && connectedClients.length > 0 && (
                    <Badge size="sm" variant="filled" color="blue">
                      {connectedClients.length}
                    </Badge>
                  )}
                </Group>
              }
              icon={<item.icon size="1.2rem" stroke={1.5} />}
              onClick={() => router.push(item.path)}
              color="blue"
            />
          ))}
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          <Group position="apart" style={{ height: '100%' }}>
            <Title order={3}>Remote Desktop Management</Title>
            <Group>
              <Select
                placeholder="Select client"
                value={selectedClient}
                onChange={setSelectedClient}
                data={connectedClients.map(client => ({
                  value: client.id,
                  label: `${client.hostname || 'Unknown'} (${client.id})`
                }))}
                style={{ width: 300 }}
                searchable
                clearable
                nothingFound="No clients connected"
              />
            </Group>
          </Group>
        </Header>
      }
    >
      <Box p="md">
        {children}
      </Box>
    </AppShell>
  );
}