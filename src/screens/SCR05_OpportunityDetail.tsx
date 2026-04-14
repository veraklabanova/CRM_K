// ============================================================
// SCR-05 Opportunity Detail — Pipeline transitions + Finance Gate
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import WarningBanner from '../components/WarningBanner';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  getOpportunity,
  getCustomer,
  transitionOpportunity,
  closeOpportunity,
} from '../api/mockApi';
import type { Opportunity, Customer, OpportunityStatus } from '../data/types';

const STATUS_TRANSITIONS: Record<string, OpportunityStatus[]> = {
  lead: ['qualified'],
  qualified: ['proposal'],
  proposal: ['negotiation'],
  negotiation: ['finance_review'],
};

export function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error' | 'empty'>('loading');
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; action: string; title: string; message: string }>({
    open: false,
    action: '',
    title: '',
    message: '',
  });

  const loadData = async () => {
    if (!id) return;
    setState('loading');
    try {
      const o = await getOpportunity(id);
      setOpp(o);
      const c = await getCustomer(o.customer_id);
      setCustomer(c);
      setState('default');
    } catch (err: any) {
      if (err?.status === 404) setState('empty');
      else {
        showError('Chyba pri nacitani prilezitosti');
        setState('error');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleTransition = async (newStatus: OpportunityStatus) => {
    if (!id) return;
    setActing(true);
    try {
      const updated = await transitionOpportunity(id, newStatus);
      setOpp(updated);
      showSuccess(`Status zmenen na ${newStatus}`);
    } catch (err: any) {
      showError(err?.message ?? 'Chyba pri zmene statusu');
    } finally {
      setActing(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    setActing(true);
    try {
      const updated = await closeOpportunity(id);
      setOpp(updated);
      if (updated.status === 'finance_review') {
        showError('Obchod byl presmerovan do Finance Review (finance gate)');
      } else {
        showSuccess('Obchod uspesne uzavren');
      }
    } catch (err: any) {
      showError(err?.message ?? 'Chyba pri uzavirani obchodu');
    } finally {
      setActing(false);
      setConfirmModal({ open: false, action: '', title: '', message: '' });
    }
  };

  const handleLost = async () => {
    if (!id) return;
    setActing(true);
    try {
      const updated = await transitionOpportunity(id, 'closed_lost');
      setOpp(updated);
      showSuccess('Obchod oznacen jako ztraceny');
    } catch (err: any) {
      showError(err?.message ?? 'Chyba pri zmene statusu');
    } finally {
      setActing(false);
      setConfirmModal({ open: false, action: '', title: '', message: '' });
    }
  };

  if (state === 'loading') return <LoadingSpinner size="lg" message="Nacitani prilezitosti..." />;
  if (state === 'empty') return <div className="text-center py-12 text-gray-500">Prilezitost nenalezena.</div>;
  if (state === 'error') return <div className="text-center py-12 text-red-600">Chyba pri nacitani dat.</div>;
  if (!opp) return null;

  const nextStatuses = STATUS_TRANSITIONS[opp.status] ?? [];
  const isFinanceBlocked = opp.finance_block_status === 'blocked';
  const isClosed = opp.status === 'closed_won' || opp.status === 'closed_lost';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{opp.opportunity_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={opp.status} />
            {isFinanceBlocked && <StatusBadge status="blocked" variant="danger" />}
          </div>
        </div>
        <SecondaryButton onClick={() => navigate('/pipeline')}>Zpet na pipeline</SecondaryButton>
      </div>

      {isFinanceBlocked && opp.status === 'finance_review' && (
        <WarningBanner message="Tento obchod je blokovany Finance Gate. Ceka na schvaleni financnim oddelenim." />
      )}

      {/* Detail info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Zakaznik</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <button
                onClick={() => navigate(`/customers/${opp.customer_id}`)}
                className="text-blue-600 hover:underline"
              >
                {customer?.legal_name ?? opp.customer_id}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Hodnota</dt>
            <dd className="mt-1 text-sm text-gray-900 font-semibold">
              {opp.value_eur.toLocaleString('cs-CZ')} EUR
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Pravdepodobnost</dt>
            <dd className="mt-1 text-sm text-gray-900">{opp.probability}%</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Ocekavane uzavreni</dt>
            <dd className="mt-1 text-sm text-gray-900">{opp.expected_close_date}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Region</dt>
            <dd className="mt-1 text-sm text-gray-900">{opp.region}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Vlastnik</dt>
            <dd className="mt-1 text-sm text-gray-900">{opp.owner_sales_id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Finance blokace</dt>
            <dd className="mt-1"><StatusBadge status={opp.finance_block_status} /></dd>
          </div>
          {opp.qualification_reason && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Duvod kvalifikace</dt>
              <dd className="mt-1 text-sm text-gray-900">{opp.qualification_reason}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Actions */}
      {!isClosed && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Akce</h2>
          <div className="flex flex-wrap gap-3">
            {nextStatuses.map((status) => (
              <PrimaryButton
                key={status}
                onClick={() => handleTransition(status)}
                loading={acting}
                disabled={acting}
              >
                Posunout na: {status.replace(/_/g, ' ')}
              </PrimaryButton>
            ))}

            {opp.status === 'negotiation' && (
              <PrimaryButton
                onClick={() =>
                  setConfirmModal({
                    open: true,
                    action: 'close',
                    title: 'Uzavrit obchod',
                    message: 'Opravdu chcete uzavrit tento obchod? Pokud ma zakaznik nesplacene pohledavky, bude obchod presmerovan do Finance Review.',
                  })
                }
                loading={acting}
                disabled={acting}
                className="!bg-green-600 hover:!bg-green-700"
              >
                Uzavrit obchod
              </PrimaryButton>
            )}

            {!isClosed && opp.status !== 'finance_review' && (
              <SecondaryButton
                onClick={() =>
                  setConfirmModal({
                    open: true,
                    action: 'lost',
                    title: 'Oznacit jako ztraceny',
                    message: 'Opravdu chcete oznacit tento obchod jako ztraceny?',
                  })
                }
                disabled={acting}
              >
                Ztraceno
              </SecondaryButton>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: '', title: '', message: '' })}
        onConfirm={confirmModal.action === 'close' ? handleClose : handleLost}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.action === 'lost' ? 'danger' : 'default'}
      />
    </div>
  );
}
