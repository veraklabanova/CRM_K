// ============================================================
// SCR-11 Support Case Detail — SLA countdown + actions
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
import { getSupportCase, getCustomer, resolveSupportCase, escalateSupportCase } from '../api/mockApi';
import type { SupportCase, Customer } from '../data/types';

function formatCountdown(deadline: string | null): string {
  if (!deadline) return 'Neni nastaveno';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'PRETERMINOVANO';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export function SupportCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error' | 'empty'>('loading');
  const [supportCase, setSupportCase] = useState<SupportCase | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [acting, setActing] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [modal, setModal] = useState<{ open: boolean; action: string; title: string; message: string }>({
    open: false,
    action: '',
    title: '',
    message: '',
  });

  const loadData = async () => {
    if (!id) return;
    setState('loading');
    try {
      const sc = await getSupportCase(id);
      setSupportCase(sc);
      const c = await getCustomer(sc.customer_id);
      setCustomer(c);
      setState('default');
    } catch (err: any) {
      if (err?.status === 404) setState('empty');
      else {
        showError('Chyba při načítání případů');
        setState('error');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // SLA countdown timer
  useEffect(() => {
    if (!supportCase?.sla_deadline) return;
    const update = () => setCountdown(formatCountdown(supportCase.sla_deadline));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [supportCase?.sla_deadline]);

  const handleAction = async () => {
    if (!id) return;
    setActing(true);
    try {
      let updated: SupportCase;
      switch (modal.action) {
        case 'resolve':
          updated = await resolveSupportCase(id);
          showSuccess('Pripad vyresen');
          break;
        case 'escalate':
          updated = await escalateSupportCase(id);
          showSuccess('Pripad eskalovan');
          break;
        case 'sla_exception':
          showSuccess('Žádost o SLA výjimku odeslána (simulace)');
          setModal({ open: false, action: '', title: '', message: '' });
          setActing(false);
          return;
        case 'verbal_promise':
          showSuccess('Ústní příslib zaznamenán (simulace)');
          setModal({ open: false, action: '', title: '', message: '' });
          setActing(false);
          return;
        default:
          return;
      }
      setSupportCase(updated);
    } catch (err: any) {
      showError(err?.message ?? 'Chyba při akci');
    } finally {
      setActing(false);
      setModal({ open: false, action: '', title: '', message: '' });
    }
  };

  if (state === 'loading') return <LoadingSpinner size="lg" message="Načítání pripadu..." />;
  if (state === 'empty') return <div className="text-center py-12 text-gray-500">Případ nenalezen.</div>;
  if (state === 'error') return <div className="text-center py-12 text-red-600">Chyba při načítání dat.</div>;
  if (!supportCase) return null;

  const isOverdue = supportCase.sla_deadline && new Date(supportCase.sla_deadline).getTime() < Date.now();
  const isClosed = supportCase.status === 'resolved' || supportCase.status === 'closed';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pripad {supportCase.id}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={supportCase.status} />
            <StatusBadge status={supportCase.priority} variant={
              supportCase.priority === 'critical' ? 'danger' :
              supportCase.priority === 'high' ? 'warning' : 'info'
            } />
            {supportCase.escalation_level > 0 && (
              <StatusBadge status={`Eskalace L${supportCase.escalation_level}`} variant="warning" />
            )}
          </div>
        </div>
        <SecondaryButton onClick={() => navigate('/support-cases')}>Zpět na seznam</SecondaryButton>
      </div>

      {isOverdue && !isClosed && (
        <WarningBanner message="SLA deadline byl překročen! Vyžaduje okamžitou pozornost." />
      )}

      {/* SLA Countdown */}
      {supportCase.sla_deadline && !isClosed && (
        <div className={`rounded-lg border p-4 ${isOverdue ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
              SLA Deadline
            </span>
            <span className={`text-2xl font-bold ${isOverdue ? 'text-red-800' : 'text-blue-800'}`}>
              {countdown}
            </span>
          </div>
          <p className="text-xs mt-1 text-gray-500">
            Deadline: {new Date(supportCase.sla_deadline).toLocaleString('cs-CZ')}
          </p>
        </div>
      )}

      {/* Case Detail */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Predmet</dt>
            <dd className="mt-1 text-sm text-gray-900 font-semibold">{supportCase.subject}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Popis</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{supportCase.description}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Zákazník</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <button
                onClick={() => navigate(`/customers/${supportCase.customer_id}`)}
                className="text-blue-600 hover:underline"
              >
                {customer?.legal_name ?? supportCase.customer_id}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Kategorie</dt>
            <dd className="mt-1 text-sm text-gray-900">{supportCase.category}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Priorita</dt>
            <dd className="mt-1"><StatusBadge status={supportCase.priority} /></dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Eskalacni uroven</dt>
            <dd className="mt-1 text-sm text-gray-900">L{supportCase.escalation_level}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Přiřazený agent</dt>
            <dd className="mt-1 text-sm text-gray-900">{supportCase.assigned_agent_id ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Kontaktni osoba</dt>
            <dd className="mt-1 text-sm text-gray-900">{supportCase.contact_person ?? '--'}</dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      {!isClosed && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Akce</h2>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton
              onClick={() =>
                setModal({
                  open: true,
                  action: 'resolve',
                  title: 'Vyřešit případ',
                  message: 'Opravdu chcete označit tento případ jako vyřešený?',
                })
              }
              disabled={acting}
              className="!bg-green-600 hover:!bg-green-700"
            >
              Vyreseno
            </PrimaryButton>

            <SecondaryButton
              onClick={() =>
                setModal({
                  open: true,
                  action: 'escalate',
                  title: 'Eskalovat',
                  message: `Eskalovat na úroveň L${supportCase.escalation_level + 1}?`,
                })
              }
              disabled={acting || supportCase.escalation_level >= 3}
            >
              Eskalovat
            </SecondaryButton>

            <SecondaryButton
              onClick={() =>
                setModal({
                  open: true,
                  action: 'sla_exception',
                  title: 'SLA výjimka',
                  message: 'Odeslat žádost o SLA výjimku?',
                })
              }
              disabled={acting}
            >
              SLA výjimka
            </SecondaryButton>

            <SecondaryButton
              onClick={() =>
                setModal({
                  open: true,
                  action: 'verbal_promise',
                  title: 'Ustni prislib',
                  message: 'Zaznamenat ústní příslib zákazníkovi?',
                })
              }
              disabled={acting}
            >
              Ustni prislib
            </SecondaryButton>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, action: '', title: '', message: '' })}
        onConfirm={handleAction}
        title={modal.title}
        message={modal.message}
        variant={modal.action === 'escalate' ? 'danger' : 'default'}
      />
    </div>
  );
}
