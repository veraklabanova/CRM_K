// ============================================================
// SCR-10 Support Cases List — with SLA indicators
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import type { DataTableColumn } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSupportCases, getCustomers } from '../api/mockApi';
import type { SupportCase } from '../data/types';

function getSlaStatus(slaDeadline: string | null): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (!slaDeadline) return { label: 'N/A', variant: 'neutral' };
  const deadline = new Date(slaDeadline).getTime();
  const now = Date.now();
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return { label: 'Preterminovan', variant: 'danger' };
  if (hoursLeft < 4) return { label: `${Math.max(0, Math.round(hoursLeft))}h`, variant: 'danger' };
  if (hoursLeft < 24) return { label: `${Math.round(hoursLeft)}h`, variant: 'warning' };
  return { label: `${Math.round(hoursLeft)}h`, variant: 'success' };
}

export function SupportCasesList() {
  const navigate = useNavigate();
  const { isReadonly } = useRole();
  const { showError } = useToast();
  const readonly = isReadonly('SCR-10');

  const [state, setState] = useState<'loading' | 'default' | 'error'>('loading');
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([getSupportCases(), getCustomers()])
      .then(([sc, custs]) => {
        if (cancelled) return;
        setCases(sc);
        const map: Record<string, string> = {};
        custs.forEach((c) => (map[c.id] = c.legal_name));
        setCustomerMap(map);
        setState('default');
      })
      .catch(() => {
        if (cancelled) return;
        showError('Chyba při načítání pripadu podpory');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [showError]);

  if (state === 'loading') return <LoadingSpinner size="lg" message="Načítání pripadu..." />;
  if (state === 'error')
    return <div className="text-center py-12 text-red-600">Chyba při načítání dat.</div>;

  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'subject', label: 'Předmět' },
    {
      key: 'customer_id',
      label: 'Zákazník',
      render: (row: SupportCase) => customerMap[row.customer_id] ?? row.customer_id,
    },
    {
      key: 'priority',
      label: 'Priorita',
      render: (row: SupportCase) => {
        const variantMap: Record<string, 'info' | 'warning' | 'danger' | 'neutral'> = {
          low: 'neutral',
          medium: 'info',
          high: 'warning',
          critical: 'danger',
        };
        return <StatusBadge status={row.priority} variant={variantMap[row.priority] ?? 'neutral'} />;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: SupportCase) => <StatusBadge status={row.status} />,
    },
    {
      key: 'sla_deadline',
      label: 'SLA',
      render: (row: SupportCase) => {
        const sla = getSlaStatus(row.sla_deadline);
        return <StatusBadge status={sla.label} variant={sla.variant} />;
      },
    },
    {
      key: 'escalation_level',
      label: 'Eskalace',
      render: (row: SupportCase) =>
        row.escalation_level > 0 ? (
          <StatusBadge status={`L${row.escalation_level}`} variant="warning" />
        ) : (
          <span className="text-gray-400">--</span>
        ),
    },
    { key: 'category', label: 'Kategorie' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Podpora</h1>
        <p className="text-sm text-gray-500 mt-1">
          {cases.length} pripadu
          {readonly && ' (pouze pro cteni)'}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={cases}
        onRowClick={(row) => navigate(`/support-cases/${row.id}`)}
        emptyMessage="Žádné případy podpory."
      />
    </div>
  );
}
