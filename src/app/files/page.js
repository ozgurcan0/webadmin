'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Text, Group, Button, Breadcrumbs, ActionIcon, Stack, Progress, Modal } from '@mantine/core';
import { IconFolder, IconFile, IconArrowUp, IconDownload, IconTrash, IconX } from '@tabler/icons-react';
import DashboardLayout from '@/components/DashboardLayout';
import { wsService } from '@/services/websocket';
import { useNotifications } from '@/context/NotificationContext';

export default function FileExplorer() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ title: 'Root', path: '/' }]);
  const [transfers, setTransfers] = useState(new Map());
  const [selectedClient, setSelectedClient] = useState(null);
  const { showNotification } = useNotifications();

  useEffect(() => {
    const handleFileList = (response) => {
      if (response.data && !response.data.error) {
        setFiles(response.data.items || []);
        updateBreadcrumbs(response.data.current_path);
      } else if (response.data?.error) {
        showNotification({
          title: 'Error',
          message: response.data.error,
          type: 'error'
        });
      }
    };

    const handleFileChunk = (response) => {
      if (response.type === 'file_chunk') {
        setTransfers(prev => {
          const newTransfers = new Map(prev);
          const transfer = newTransfers.get(response.file_path) || {
            progress: 0,
            chunks: [],
            totalSize: response.total_size
          };

          if (response.error) {
            showNotification({
              title: 'Transfer Error',
              message: response.error,
              type: 'error'
            });
            newTransfers.delete(response.file_path);
          } else if (response.complete) {
            // Download completed file
            const blob = new Blob(transfer.chunks.map(chunk => 
              Uint8Array.from(atob(chunk), c => c.charCodeAt(0))
            ));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.file_path.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            newTransfers.delete(response.file_path);

            showNotification({
              title: 'Download Complete',
              message: `File ${response.file_path} has been downloaded`,
              type: 'success'
            });
          } else {
            transfer.progress = response.progress;
            transfer.chunks.push(response.chunk);
            newTransfers.set(response.file_path, transfer);
          }
          
          return newTransfers;
        });
      }
    };

    wsService.onMessage('client_response', handleFileList);
    wsService.onMessage('file_chunk', handleFileChunk);
    listFiles(currentPath);

    return () => {
      wsService.offMessage('client_response', handleFileList);
      wsService.offMessage('file_chunk', handleFileChunk);
    };
  }, [currentPath, showNotification]);

  const updateBreadcrumbs = (path) => {
    const parts = path.split(/[\\/]/).filter(Boolean);
    const crumbs = [{ title: 'Root', path: '/' }];
    let currentPath = '';
    
    parts.forEach(part => {
      currentPath += '/' + part;
      crumbs.push({ title: part, path: currentPath });
    });
    
    setBreadcrumbs(crumbs);
  };

  const listFiles = (path) => {
    wsService.sendCommand(selectedClient, { 
      command: 'list_directory',
      path: path 
    });
  };

  const downloadFile = (file) => {
    if (!selectedClient) {
      showNotification({
        title: 'Error',
        message: 'Please select a client first',
        type: 'error'
      });
      return;
    }

    setTransfers(prev => {
      const newTransfers = new Map(prev);
      newTransfers.set(file.path, {
        progress: 0,
        chunks: [],
        name: file.name,
        size: file.size
      });
      return newTransfers;
    });

    wsService.sendCommand(selectedClient, {
      command: 'download_file',
      path: file.path
    });
  };

  const deleteItem = async (item) => {
    if (!selectedClient) {
      showNotification({
        title: 'Error',
        message: 'Please select a client first',
        type: 'error'
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${item.name}?`)) {
      return;
    }

    wsService.sendCommand(selectedClient, {
      command: 'delete_file',
      path: item.path
    });

    // Refresh the current directory
    listFiles(currentPath);
  };

  const navigateToFolder = (path) => {
    setCurrentPath(path);
    listFiles(path);
  };

  const navigateUp = () => {
    const parentPath = currentPath.split(/[\\/]/).slice(0, -1).join('/') || '/';
    navigateToFolder(parentPath);
  };

  const formatFileSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const cancelTransfer = (path) => {
    setTransfers(prev => {
      const newTransfers = new Map(prev);
      newTransfers.delete(path);
      return newTransfers;
    });
  };

  return (
    <DashboardLayout>
      <Stack>
        <Group position="apart">
          <Text size="xl" weight={700}>File Explorer</Text>
          <Button
            leftIcon={<IconArrowUp size="1.2rem" />}
            variant="light"
            onClick={navigateUp}
            disabled={currentPath === '/'}
          >
            Up
          </Button>
        </Group>

        <Breadcrumbs>
          {breadcrumbs.map((crumb, index) => (
            <Button
              key={index}
              variant="subtle"
              compact
              onClick={() => navigateToFolder(crumb.path)}
            >
              {crumb.title}
            </Button>
          ))}
        </Breadcrumbs>

        {transfers.size > 0 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text weight={500} mb="md">Active Transfers</Text>
            <Stack>
              {Array.from(transfers.entries()).map(([path, transfer]) => (
                <Group key={path} position="apart" noWrap>
                  <Text size="sm" style={{ flexGrow: 1 }}>{path.split('/').pop()}</Text>
                  <Progress 
                    value={transfer.progress} 
                    style={{ width: '60%' }}
                    size="xl"
                    label={`${Math.round(transfer.progress)}%`}
                  />
                  <ActionIcon color="red" onClick={() => cancelTransfer(path)}>
                    <IconX size="1.2rem" />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Card>
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.sort((a, b) => (b.is_directory - a.is_directory)).map((file, index) => (
                <tr key={index}>
                  <td>
                    <Group spacing="sm">
                      {file.is_directory ? (
                        <IconFolder size="1.2rem" stroke={1.5} />
                      ) : (
                        <IconFile size="1.2rem" stroke={1.5} />
                      )}
                      <Text
                        style={{ cursor: file.is_directory ? 'pointer' : 'default' }}
                        onClick={() => file.is_directory && navigateToFolder(file.path)}
                      >
                        {file.name}
                      </Text>
                    </Group>
                  </td>
                  <td>{file.is_directory ? '--' : formatFileSize(file.size)}</td>
                  <td>{formatDate(file.modified)}</td>
                  <td>
                    <Group spacing="xs">
                      {!file.is_directory && (
                        <ActionIcon
                          color="blue"
                          onClick={() => downloadFile(file)}
                          disabled={transfers.has(file.path)}
                        >
                          <IconDownload size="1.2rem" />
                        </ActionIcon>
                      )}
                      <ActionIcon
                        color="red"
                        onClick={() => deleteItem(file)}
                      >
                        <IconTrash size="1.2rem" />
                      </ActionIcon>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}