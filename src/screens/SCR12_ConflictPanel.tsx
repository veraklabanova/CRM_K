// ============================================================
// SCR-12 Conflict Panel — Conflict list
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import type { DataTableColumn } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { getConflicts, getCustomers } from '../api/mockApi';
import type { Conflict } from '../data/types';

const TYPE_LABELS: Record<string, string> = {
  data_ownership: 'Vlastnictvi dat',
  deal_vs_finance: 'Obchod vs. Finance',
  local_vs_global: 'Lokalni vs. Globalni',
  verbal_vs_written: 'Ustni vs. Pisemne',
  sla_exception: 'SLA výjimka',
};

function getSlaInfo(deadline: string | null): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (!deadline) return { label: '--', variant: 'neutral' };
  const diff = new Date(deadline).getTime() - Date.now();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 0) return { label: 'Preterminovan', variant: 'danger' };
  if (hours < 24) return { label: `${hours}h`, variant: 'warning' };
  return { label: `${hours}h`, variant: 'success' };
}

export function ConflictPanel() {
  const navigate = useNavigate();
  const { showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error'>('loading');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([getConflicts(), getCustomers()])
      .then(([conf, custs]) => {
        if (cancelled) return;
        setConflicts(conf);
        const map: Record<string, string> = {};
        custs.forEach((c) => (map[c.id] = c.legal_name));
        setCustomerMap(map);
        setState('default');
      })
      .catch(() => {
        if (cancelled) return;
        showError('Chyba při načítání konfliktu');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [showError]);

  if (state === 'loading') return <LoadingSpinner size="lg" message="Načítání konfliktu..." />;
  if (state === 'error')
    return <div className="text-center py-12 text-red-600">Chyba při načítání dat.</div>;

  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID' },
    {
      key: 'type',
      label: 'Typ',
      render: (row: Conflict) => TYPE_LABELS[row.type] ?? row.type,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Conflict) => <StatusBadge status={row.status} />,
    },
    {
      key: 'customer_id',
      label: 'Zákazník',
      render: (row: Conflict) => customerMap[row.customer_id] ?? row.customer_id,
    },
    {
      key: 'trigger_source_type',
      label: 'Zdroj',
      render: (row: Conflict) => `${row.trigger_source_type} (${row.trigger_source_id})`,
    },
    {
      key: 'sla_deadline',
      label: 'SLA',
      render: (row: Conflict) => {
        const info = getSlaInfo(row.sla_deadline);
        return <StatusBadge status={info.label} variant={info.variant} />;
      },
    },
    {
      key: 'created_at',
      label: 'Vytvořeno',
      render: (row: Conflict) => new Date(row.created_at).toLocaleDateString('cs-CZ'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Konflikty</h1>
        <p className="text-sm text-gray-500 mt-1">{conflicts.length} konfliktu</p>
      </div>

      <DataTable
        columns={columns}
        data={conflicts}
        onRowClick={(row) => navigate(`/conflicts/${row.id}`)}
        emptyMessage="Žádné konflikty."
      />
    </div>
  );
}
