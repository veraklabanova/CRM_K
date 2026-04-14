// ============================================================
// SCR-04 Pipeline Overview — Opportunities list
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
import { getOpportunities, getCustomers } from '../api/mockApi';
import type { Opportunity, Customer } from '../data/types';

export function PipelineOverview() {
  const navigate = useNavigate();
  const { isReadonly } = useRole();
  const { showError } = useToast();
  const readonly = isReadonly('SCR-04');

  const [state, setState] = useState<'loading' | 'default' | 'error'>('loading');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([getOpportunities(), getCustomers()])
      .then(([opps, custs]) => {
        if (cancelled) return;
        setOpportunities(opps);
        const map: Record<string, string> = {};
        custs.forEach((c) => {
          map[c.id] = c.legal_name;
        });
        setCustomerMap(map);
        setState('default');
      })
      .catch(() => {
        if (cancelled) return;
        showError('Chyba při načítání pipeline');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [showError]);

  if (state === 'loading') return <LoadingSpinner size="lg" message="Načítání pipeline..." />;
  if (state === 'error')
    return <div className="text-center py-12 text-red-600">Chyba při načítání dat.</div>;

  const columns: DataTableColumn[] = [
    { key: 'opportunity_name', label: 'Název' },
    {
      key: 'customer_id',
      label: 'Zákazník',
      render: (row: Opportunity) => customerMap[row.customer_id] ?? row.customer_id,
    },
    {
      key: 'value_eur',
      label: 'Hodnota (EUR)',
      render: (row: Opportunity) => row.value_eur.toLocaleString('cs-CZ'),
    },
    {
      key: 'probability',
      label: 'Pravděpodobnost',
      render: (row: Opportunity) => `${row.probability}%`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Opportunity) => <StatusBadge status={row.status} />,
    },
    { key: 'expected_close_date', label: 'Očekávané uzavření' },
    { key: 'region', label: 'Region' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">{opportunities.length} příležitostí</p>
        </div>
        {!readonly && (
          <PrimaryButton onClick={() => showError('Formulář pro novou příležitost není v prototypu k dispozici')}>
            Nová příležitost
          </PrimaryButton>
        )}
      </div>

      <DataTable
        columns={columns}
        data={opportunities}
        onRowClick={(row) => navigate(`/opportunities/${row.id}`)}
        emptyMessage="Žádné příležitosti v pipeline."
      />
    </div>
  );
}
