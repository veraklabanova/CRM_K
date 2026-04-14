// ============================================================
// SCR-08 Contracts List
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import type { DataTableColumn } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { getContracts, getCustomers } from '../api/mockApi';
import type { Contract } from '../data/types';

export function ContractsList() {
  const navigate = useNavigate();
  const { showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error'>('loading');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([getContracts(), getCustomers()])
      .then(([contr, custs]) => {
        if (cancelled) return;
        setContracts(contr);
        const map: Record<string, string> = {};
        custs.forEach((c) => (map[c.id] = c.legal_name));
        setCustomerMap(map);
        setState('default');
      })
      .catch(() => {
        if (cancelled) return;
        showError('Chyba pri nacitani smluv');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [showError]);

  if (state === 'loading') return <LoadingSpinner size="lg" message="Nacitani smluv..." />;
  if (state === 'error')
    return <div className="text-center py-12 text-red-600">Chyba pri nacitani dat.</div>;

  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID' },
    {
      key: 'customer_id',
      label: 'Zakaznik',
      render: (row: Contract) => customerMap[row.customer_id] ?? row.customer_id,
    },
    {
      key: 'contract_type',
      label: 'Typ',
      render: (row: Contract) => row.contract_type.charAt(0).toUpperCase() + row.contract_type.slice(1),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Contract) => <StatusBadge status={row.status} />,
    },
    {
      key: 'sla_response_hours',
      label: 'SLA Response',
      render: (row: Contract) => `${row.sla_response_hours}h`,
    },
    { key: 'start_date', label: 'Od' },
    { key: 'end_date', label: 'Do' },
    { key: 'region', label: 'Region' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smlouvy</h1>
          <p className="text-sm text-gray-500 mt-1">{contracts.length} smluv</p>
        </div>
        <PrimaryButton onClick={() => showError('Formular pro novou smlouvu neni v prototypu k dispozici')}>
          Nova smlouva
        </PrimaryButton>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        onRowClick={(row) => navigate(`/contracts/${row.id}`)}
        emptyMessage="Zadne smlouvy."
      />
    </div>
  );
}
