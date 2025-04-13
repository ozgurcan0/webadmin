'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { wsService } from '@/services/websocket';

const ClientContext = createContext({});

export function ClientProvider({ children }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [connectedClients, setConnectedClients] = useState([]);

  useEffect(() => {
    wsService.connect();

    const handleClientsUpdate = (clients) => {
      setConnectedClients(clients);
      if (clients.length > 0 && !selectedClient) {
        setSelectedClient(clients[0].id);
      } else if (clients.length === 0) {
        setSelectedClient(null);
      } else if (selectedClient && !clients.find(c => c.id === selectedClient)) {
        // If currently selected client disconnected, select the first available
        setSelectedClient(clients[0].id);
      }
    };

    wsService.onMessage('clients_updated', handleClientsUpdate);

    return () => {
      wsService.offMessage('clients_updated', handleClientsUpdate);
    };
  }, [selectedClient]);

  const value = {
    selectedClient,
    setSelectedClient,
    connectedClients,
    getClientById: (id) => connectedClients.find(c => c.id === id),
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

export const useClients = () => useContext(ClientContext);