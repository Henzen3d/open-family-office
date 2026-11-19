'use client';

import { useState, useCallback } from 'react';

export interface ConfirmationCardData {
  card_id: string;
  type: string;
  amount: number;
  formatted_amount: string;
  date: string;
  counterparty: string;
  category: string;
  entity_code: string;
  entity_name: string;
  account_name: string;
  status: 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'DISCARDED';
  clean_description: string;
  raw_text?: string;
  old_amount?: number;
  formatted_old_amount?: string;
  receipt_ref?: string;
  source_receipt?: string;
  is_revenue?: boolean;
}

export interface ClarificationQuestion {
  id?: string;
  question: string;
  options: string[];
  selectedOption?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  confirmationCard?: ConfirmationCardData;
  artifact?: any;
  clarification?: ClarificationQuestion;
  suggestions?: string[];
  isStreaming?: boolean;
  progressStep?: string;
  isError?: boolean;
}

export function useChatState() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [asdMode, setAsdMode] = useState<'none' | 'asd_80' | 'asd_strict'>('none');

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isOpen,
    setIsOpen,
    messages,
    setMessages,
    addMessage,
    clearMessages,
    isSending,
    setIsSending,
    asdMode,
    setAsdMode,
  };
}
