import { useState, useEffect } from 'react';
import { Table, Button, TextInput, Group, Text, ActionIcon } from '@mantine/core';
import { IconSearch, IconPlayerStop } from '@tabler/icons-react';
import { wsService } from '@/services/websocket';

export default function ProcessManager({ clientId }) {
  const [processes, setProcesses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      const interval = setInterval(() => {
        wsService.sendCommand(clientId, { command: 'process_list' });
      }, 5000);

      const handleProcessList = (response) => {
        if (response.client_id === clientId && response.data) {
          setProcesses(response.data);
          setLoading(false);
        }
      };

      wsService.onMessage('client_response', handleProcessList);
      wsService.sendCommand(clientId, { command: 'process_list' });

      return () => {
        clearInterval(interval);
        wsService.offMessage('client_response', handleProcessList);
      };
    }
  }, [clientId]);

  const filteredProcesses = processes.filter(process => 
    process.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div>
      <Group position="apart" mb="md">
        <Text weight={500}>Running Processes</Text>
        <TextInput
          placeholder="Search processes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<IconSearch size="1rem" />}
          style={{ width: 250 }}
        />
      </Group>

      <Table striped>
        <thead>
          <tr>
            <th>Process Name</th>
            <th>PID</th>
            <th>CPU %</th>
            <th>Memory %</th>
            <th>Uptime</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProcesses.map((process) => (
            <tr key={process.pid}>
              <td>{process.name}</td>
              <td>{process.pid}</td>
              <td>{process.cpu_percent?.toFixed(1)}%</td>
              <td>{process.memory_percent?.toFixed(1)}%</td>
              <td>{formatUptime(process.running_time)}</td>
              <td>
                <ActionIcon 
                  color="red" 
                  onClick={() => wsService.sendCommand(clientId, {
                    command: 'terminate_process',
                    pid: process.pid
                  })}
                >
                  <IconPlayerStop size="1.2rem" />
                </ActionIcon>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}