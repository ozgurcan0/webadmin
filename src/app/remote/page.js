'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title } from '@mantine/core';
import RemoteControl from '@/components/RemoteControl';
import { useClient } from '@/context/ClientContext';
import { SessionSecurity } from '@/utils/sessionSecurity';
import { handleError, ErrorCodes } from '@/utils/errorHandler';
import { useNotifications } from '@/context/NotificationContext';

export default function RemotePage() {
  const router = useRouter();
  const { selectedClient } = useClient();
  const { showNotification } = useNotifications();

  useEffect(() => {
    try {
      // Validate session and permissions
      if (!SessionSecurity.validateSession()) {
        router.push('/login');
        return;
      }

      SessionSecurity.validatePermission('remote_control');
    } catch (error) {
      handleError(error, showNotification);
      router.push('/access');
    }
  }, [router, showNotification]);

  return (
    <Container size="xl">
      <Title order={2} mb="lg">Remote Control</Title>
      <RemoteControl clientId={selectedClient?.id} />
    </Container>
  );
}