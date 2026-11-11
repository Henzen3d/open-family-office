'use client';

import { useState, useEffect, useCallback } from 'react';

export interface BankAccountItem {
  id: string;
  name: string;
  bank_name?: string;
  entity_code: string;
  holder: string;
  purpose: string;
  balance: number;
  formatted_balance?: string;
  account_type?: string;
  color: string;
  active: boolean;
  notes?: string;
  last_adjusted_at?: string;
}

export interface ConsolidatedBalances {
  total_cash: number;
  formatted_total: string;
  accounts: BankAccountItem[];
  segregation_status?: string;
  last_updated?: string;
}

export function useAccountsState() {
  const [balances, setBalances] = useState<ConsolidatedBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEntity, setActiveEntity] = useState<'all' | 'fix' | 'facilita' | 'pf'>('all');

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/py/accounts');
      if (res.ok) {
        const data = await res.json();
        setBalances(data);
      } else {
        // Fallback to direct /api/accounts
        const fallbackRes = await fetch('/api/accounts');
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setBalances(data);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar contas bancárias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    balances,
    loading,
    error,
    activeEntity,
    setActiveEntity,
    reloadAccounts: fetchAccounts,
  };
}
