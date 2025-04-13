'use client';

import { useState } from 'react';
import { Card, Grid, Text, Button, TextInput, Stack, Table, ActionIcon, Switch, Modal } from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import DashboardLayout from '@/components/DashboardLayout';
import { wsService } from '@/services/websocket';
import { useNotifications } from '@/context/NotificationContext';

export default function AccessControl() {
  const [blockedWebsites, setBlockedWebsites] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const { showNotification } = useNotifications();
  const [showAddAppModal, setShowAddAppModal] = useState(false);

  const websiteForm = useForm({
    initialValues: {
      website: '',
    },
    validate: {
      website: (value) => {
        if (!value) return 'Website URL is required';
        const urlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
        if (!urlPattern.test(value)) return 'Invalid website format (e.g., example.com)';
        return null;
      },
    },
  });

  const appForm = useForm({
    initialValues: {
      appName: '',
      processName: '',
    },
    validate: {
      appName: (value) => (!value ? 'Application name is required' : null),
      processName: (value) => (!value ? 'Process name is required' : null),
    },
  });

  const handleBlockWebsite = async (values) => {
    try {
      if (!selectedClient) {
        showNotification({
          title: 'Error',
          message: 'Please select a client first',
          type: 'error',
        });
        return;
      }

      wsService.sendCommand(selectedClient, { 
        command: 'block_website',
        website: values.website
      });

      setBlockedWebsites(prev => [...prev, { url: values.website, blocked: true }]);
      websiteForm.reset();

      showNotification({
        title: 'Success',
        message: `Website ${values.website} has been blocked`,
        type: 'success',
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to block website',
        type: 'error',
      });
    }
  };

  const handleBlockApp = async (values) => {
    try {
      if (!selectedClient) {
        showNotification({
          title: 'Error',
          message: 'Please select a client first',
          type: 'error',
        });
        return;
      }

      wsService.sendCommand(selectedClient, { 
        command: 'block_application',
        app_name: values.processName
      });

      setShowAddAppModal(false);
      appForm.reset();

      showNotification({
        title: 'Success',
        message: `Application ${values.appName} has been blocked`,
        type: 'success',
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to block application',
        type: 'error',
      });
    }
  };

  const handleRemoveWebsite = (index) => {
    const website = blockedWebsites[index];
    if (selectedClient && website) {
      wsService.sendCommand(selectedClient, {
        command: 'unblock_website',
        website: website.url
      });
      
      setBlockedWebsites(prev => prev.filter((_, i) => i !== index));
      
      showNotification({
        title: 'Success',
        message: `Website ${website.url} has been unblocked`,
        type: 'success',
      });
    }
  };

  const handleToggleBlock = (index) => {
    const website = blockedWebsites[index];
    if (selectedClient && website) {
      const command = website.blocked ? 'unblock_website' : 'block_website';
      wsService.sendCommand(selectedClient, {
        command,
        website: website.url
      });

      setBlockedWebsites(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], blocked: !updated[index].blocked };
        return updated;
      });

      showNotification({
        title: 'Success',
        message: `Website ${website.url} has been ${website.blocked ? 'unblocked' : 'blocked'}`,
        type: 'success',
      });
    }
  };

  return (
    <DashboardLayout>
      <Text size="xl" weight={700} mb="lg">Access Control</Text>

      <Grid>
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack>
              <Text weight={500}>Website Restrictions</Text>
              
              <form onSubmit={websiteForm.onSubmit(handleBlockWebsite)}>
                <Grid align="flex-end">
                  <Grid.Col span={8}>
                    <TextInput
                      label="Website URL"
                      placeholder="Enter website URL to block (e.g., facebook.com)"
                      {...websiteForm.getInputProps('website')}
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <Button
                      leftIcon={<IconPlus size="1.2rem" />}
                      type="submit"
                      disabled={!selectedClient}
                    >
                      Add Restriction
                    </Button>
                  </Grid.Col>
                </Grid>
              </form>

              <Table>
                <thead>
                  <tr>
                    <th>Website</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedWebsites.map((site, index) => (
                    <tr key={index}>
                      <td>{site.url}</td>
                      <td>
                        <Switch
                          checked={site.blocked}
                          onChange={() => handleToggleBlock(index)}
                        />
                      </td>
                      <td>
                        <ActionIcon
                          color="red"
                          onClick={() => handleRemoveWebsite(index)}
                        >
                          <IconTrash size="1.2rem" />
                        </ActionIcon>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack>
              <Text weight={500}>Application Control</Text>
              <Button
                leftIcon={<IconPlus size="1.2rem" />}
                onClick={() => setShowAddAppModal(true)}
                disabled={!selectedClient}
              >
                Block New Application
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Modal
        opened={showAddAppModal}
        onClose={() => setShowAddAppModal(false)}
        title="Block Application"
      >
        <form onSubmit={appForm.onSubmit(handleBlockApp)}>
          <Stack>
            <TextInput
              label="Application Name"
              placeholder="Display name for the application"
              {...appForm.getInputProps('appName')}
            />
            <TextInput
              label="Process Name"
              placeholder="Exact process name (e.g., chrome.exe)"
              {...appForm.getInputProps('processName')}
            />
            <Button type="submit">Block Application</Button>
          </Stack>
        </form>
      </Modal>
    </DashboardLayout>
  );
}