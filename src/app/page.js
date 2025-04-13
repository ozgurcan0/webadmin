'use client';

import { useEffect, useState } from 'react';
import { Card, Grid, Text, Button, Group, Stack } from '@mantine/core';
import { IconPower, IconRefresh, IconScreenShare, IconTerminal2 } from '@tabler/icons-react';
import DashboardLayout from '@/components/DashboardLayout';
import { wsService } from '@/services/websocket';

export default function Home() {
  const [connectedClients, setConnectedClients] = useState([]);

  useEffect(() => {
    wsService.connect();

    const handleClientsUpdate = (clients) => {
      setConnectedClients(clients);
    };

    wsService.onMessage('clients_updated', handleClientsUpdate);

    return () => {
      wsService.offMessage('clients_updated', handleClientsUpdate);
      wsService.disconnect();
    };
  }, []);

  const handleCommand = (clientId, command) => {
    wsService.sendCommand(clientId, { command });
  };

  return (
    <DashboardLayout>
      <Text size="xl" weight={700} mb="lg">Connected Devices</Text>
      <Grid>
        {connectedClients.map((client) => (
          <Grid.Col key={client.id} span={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack>
                <Text weight={500}>{client.id}</Text>
                <Group position="apart" mt="md">
                  <Button 
                    leftIcon={<IconPower size="1.2rem" />} 
                    variant="light" 
                    color="red"
                    onClick={() => handleCommand(client.id, 'shutdown')}
                  >
                    Shutdown
                  </Button>
                  <Button 
                    leftIcon={<IconRefresh size="1.2rem" />}
                    variant="light"
                    onClick={() => handleCommand(client.id, 'restart')}
                  >
                    Restart
                  </Button>
                </Group>
                <Group position="apart">
                  <Button 
                    leftIcon={<IconScreenShare size="1.2rem" />}
                    variant="light"
                    onClick={() => handleCommand(client.id, 'screenshot')}
                  >
                    View Screen
                  </Button>
                  <Button 
                    leftIcon={<IconTerminal2 size="1.2rem" />}
                    variant="light"
                    onClick={() => handleCommand(client.id, 'get_system_info')}
                  >
                    System Info
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </DashboardLayout>
  );
}
