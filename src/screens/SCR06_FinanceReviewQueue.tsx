// ============================================================
// SCR-06 Finance Review Queue — Opps in finance_review
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import type { DataTableColumn } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { getFinanceReviews, getCustomers } from '../api/mockApi';
import type { Opportunity } from '../data/types';

export function FinanceReviewQueue() {
  const navigate = useNavigate();
  const { isReadonly } = useRole();
  const { showError } = useToast();
  const readonly = isReadonly('SCR-06');

  const [state, setState] = useState<'loading' | 'default' | 'error'>('loading');
  const [reviews, setReviews] = useState<Opportunity[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([getFinanceReviews(), getCustomers()])
      .then(([revs, custs]) => {
        if (cancelled) return;
        setReviews(revs);
        const map: Record<string, string> = {};
        custs.forEach((c) => (map[c.id] = c.legal_name));
        setCustomerMap(map);
        setState('default');
      })
      .catch(() => {
        if (cancelled) return;
        showError('Chyba pri nacitani finance review');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [showError]);

  if (state === 'loading') return <LoadingSpinner size="lg" message="Nacitani Finance Review..." />;
  if (state === 'error')
    return <div className="text-center py-12 text-red-600">Chyba pri nacitani dat.</div>;

  const getTimeInReview = (enteredAt: string | null): string => {
    if (!enteredAt) return '--';
    const diff = Date.now() - new Date(enteredAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  const columns: DataTableColumn[] = [
    { key: 'opportunity_name', label: 'Nazev prilezitosti' },
    {
      key: 'customer_id',
      label: 'Zakaznik',
      render: (row: Opportunity) => customerMap[row.customer_id] ?? row.customer_id,
    },
    {
      key: 'value_eur',
      label: 'Hodnota (EUR)',
      render: (row: Opportunity) => row.value_eur.toLocaleString('cs-CZ'),
    },
    {
      key: 'finance_block_status',
      label: 'Status blokace',
      render: (row: Opportunity) => <StatusBadge status={row.finance_block_status} />,
    },
    {
      key: 'finance_review_entered_at',
      label: 'Doba v review',
      render: (row: Opportunity) => (
        <span className={`font-medium ${
          row.finance_review_entered_at &&
          Date.now() - new Date(row.finance_review_entered_at).getTime() > 4 * 60 * 60 * 1000
            ? 'text-red-600'
            : 'text-gray-900'
        }`}>
          {getTimeInReview(row.finance_review_entered_at)}
        </span>
      ),
    },
    { key: 'region', label: 'Region' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance Review Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          {reviews.length} prilezitosti ceka na schvaleni
          {readonly && ' (pouze pro cteni)'}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={reviews}
        onRowClick={(row) => navigate(`/finance-reviews/${row.id}`)}
        emptyMessage="Zadne prilezitosti ve Finance Review."
      />
    </div>
  );
}
