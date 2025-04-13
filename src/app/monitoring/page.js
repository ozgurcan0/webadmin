'use client';

import { useState, useEffect } from 'react';
import { Card, Grid, Text, Progress, Stack } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import { wsService } from '@/services/websocket';

export default function Monitoring() {
  const [systemData, setSystemData] = useState({});
  const [historicalData, setHistoricalData] = useState({});

  useEffect(() => {
    wsService.connect();

    const handleSystemInfo = (response) => {
      if (response.data) {
        const clientId = response.client_id;
        setSystemData(prev => ({
          ...prev,
          [clientId]: response.data
        }));

        // Update historical data
        setHistoricalData(prev => {
          const oldData = prev[clientId] || [];
          return {
            ...prev,
            [clientId]: [...oldData, {
              time: new Date().toLocaleTimeString(),
              cpu: response.data.cpu_percent,
              memory: (response.data.memory_used / response.data.memory_total) * 100
            }].slice(-20) // Keep last 20 data points
          };
        });
      }
    };

    wsService.onMessage('client_response', handleSystemInfo);
    
    // Poll system info every 5 seconds
    const interval = setInterval(() => {
      Object.keys(systemData).forEach(clientId => {
        wsService.sendCommand(clientId, { command: 'get_system_info' });
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      wsService.offMessage('client_response', handleSystemInfo);
      wsService.disconnect();
    };
  }, [systemData]);

  const formatBytes = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <Text size="xl" weight={700} mb="lg">System Monitoring</Text>
      {Object.entries(systemData).map(([clientId, data]) => (
        <Card key={clientId} shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <Stack>
            <Text weight={500}>{data.hostname} ({clientId})</Text>
            <Text size="sm">OS: {data.os} {data.os_version}</Text>
            
            <Grid>
              <Grid.Col span={4}>
                <Text size="sm">CPU Usage</Text>
                <Progress value={data.cpu_percent} mb="md" label={`${data.cpu_percent}%`} size="xl" />
              </Grid.Col>
              <Grid.Col span={4}>
                <Text size="sm">Memory Usage</Text>
                <Progress 
                  value={(data.memory_used / data.memory_total) * 100} 
                  mb="md" 
                  label={`${formatBytes(data.memory_used)} / ${formatBytes(data.memory_total)}`}
                  size="xl"
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <Text size="sm">Disk Usage</Text>
                <Progress 
                  value={(data.disk_used / data.disk_total) * 100} 
                  mb="md" 
                  label={`${formatBytes(data.disk_used)} / ${formatBytes(data.disk_total)}`}
                  size="xl"
                />
              </Grid.Col>
            </Grid>

            <Text size="sm" weight={500} mt="md">Historical Usage</Text>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicalData[clientId] || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#1c7ed6" />
                <Line type="monotone" dataKey="memory" name="Memory %" stroke="#40c057" />
              </LineChart>
            </ResponsiveContainer>
          </Stack>
        </Card>
      ))}
    </DashboardLayout>
  );
}