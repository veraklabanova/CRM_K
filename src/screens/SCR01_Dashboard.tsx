// ============================================================
// SCR-01 Dashboard — Role-specific landing page
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getOpportunities,
  getFinanceReviews,
  getSupportCases,
  getConflicts,
  getCustomers,
} from '../api/mockApi';

interface DashboardCounts {
  pipeline: number;
  financeReviews: number;
  supportCases: number;
  conflicts: number;
  customers: number;
  openCases: number;
  escalatedCases: number;
  awaitingDecision: number;
}

export function Dashboard() {
  const { currentRole, hasAccess } = useRole();
  const { showError } = useToast();
  const navigate = useNavigate();

  const [state, setState] = useState<'loading' | 'default' | 'error'>('loading');
  const [counts, setCounts] = useState<DashboardCounts>({
    pipeline: 0,
    financeReviews: 0,
    supportCases: 0,
    conflicts: 0,
    customers: 0,
    openCases: 0,
    escalatedCases: 0,
    awaitingDecision: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([
      getOpportunities(),
      getFinanceReviews(),
      getSupportCases(),
      getConflicts(),
      getCustomers(),
    ])
      .then(([opps, reviews, cases, conflicts, customers]) => {
        if (cancelled) return;
        setCounts({
          pipeline: opps.filter((o) => !['closed_won', 'closed_lost'].includes(o.status)).length,
          financeReviews: reviews.length,
          supportCases: cases.length,
          conflicts: conflicts.length,
          customers: customers.length,
          openCases: cases.filter((c) => ['open', 'in_progress'].includes(c.status)).length,
          escalatedCases: cases.filter((c) => c.status === 'escalated').length,
          awaitingDecision: conflicts.filter((c) => c.status === 'awaiting_decision').length,
        });
        setState('default');
      })
      .catch((err) => {
        if (cancelled) return;
        showError('Chyba pri nacitani dashboardu');
        console.error('Dashboard load error', err);
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [showError]);

  if (state === 'loading') {
    return <LoadingSpinner size="lg" message="Nacitani dashboardu..." />;
  }

  if (state === 'error') {
    return (
      <div className="text-center py-12 text-red-600">
        Chyba pri nacitani dat. Zkuste obnovit stranku.
      </div>
    );
  }

  const widgets: {
    label: string;
    count: number;
    variant: 'info' | 'warning' | 'danger' | 'success';
    path: string;
    screenId: string;
    description: string;
  }[] = [
    {
      label: 'Pipeline',
      count: counts.pipeline,
      variant: 'info',
      path: '/pipeline',
      screenId: 'SCR-04',
      description: 'Aktivnich prilezitosti',
    },
    {
      label: 'Finance Review',
      count: counts.financeReviews,
      variant: 'warning',
      path: '/finance-reviews',
      screenId: 'SCR-06',
      description: 'Ceka na schvaleni',
    },
    {
      label: 'Podpora',
      count: counts.openCases,
      variant: 'info',
      path: '/support-cases',
      screenId: 'SCR-10',
      description: 'Otevrenych pripadu',
    },
    {
      label: 'Eskalovane pripady',
      count: counts.escalatedCases,
      variant: 'danger',
      path: '/support-cases',
      screenId: 'SCR-10',
      description: 'Vyzaduje pozornost',
    },
    {
      label: 'Konflikty',
      count: counts.awaitingDecision,
      variant: 'warning',
      path: '/conflicts',
      screenId: 'SCR-12',
      description: 'Ceka na rozhodnuti',
    },
    {
      label: 'Zakaznici',
      count: counts.customers,
      variant: 'success',
      path: '/customers/CUS-001',
      screenId: 'SCR-02',
      description: 'Celkem v systemu',
    },
  ];

  const visibleWidgets = widgets.filter((w) => hasAccess(w.screenId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Prehled pro roli: <span className="font-medium text-gray-700">{currentRole}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleWidgets.map((widget) => (
          <button
            key={widget.label}
            onClick={() => navigate(widget.path)}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
                {widget.label}
              </h3>
              <StatusBadge status={String(widget.count)} variant={widget.variant} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{widget.count}</div>
            <p className="text-xs text-gray-500 mt-1">{widget.description}</p>
          </button>
        ))}
      </div>

      {visibleWidgets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Pro vasi roli nejsou k dispozici zadne widgety.
        </div>
      )}
    </div>
  );
}
