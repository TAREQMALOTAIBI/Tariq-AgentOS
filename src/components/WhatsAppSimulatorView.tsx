import React from 'react';
import { TelegramSimulatorView } from './TelegramSimulatorView';
import type { ApiKeyItem, SyncedMessage } from '../types/index';

interface WhatsAppSimulatorProps {
  apiKeys: ApiKeyItem[];
  messages: SyncedMessage[];
  onMessageSent: () => void;
  onNavigateTab: (tab: string) => void;
}

export const WhatsAppSimulatorView: React.FC<WhatsAppSimulatorProps> = (props) => {
  return <TelegramSimulatorView {...props} />;
};

export default WhatsAppSimulatorView;
