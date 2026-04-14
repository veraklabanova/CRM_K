// ============================================================
// SCR-09 Contract Detail / Approve / Reject
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  getContract,
  getCustomer,
  submitToLegal,
  approveContract,
  rejectContract,
} from '../api/mockApi';
import type { Contract, Customer } from '../data/types';

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error' | 'empty'>('loading');
  const [contract, setContract] = useState<Contract | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [acting, setActing] = useState(false);
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
      const c = await getContract(id);
      setContract(c);
      const cust = await getCustomer(c.customer_id);
      setCustomer(cust);
      setState('default');
    } catch (err: any) {
      if (err?.status === 404) setState('empty');
      else {
        showError('Chyba pri nacitani smlouvy');
        setState('error');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAction = async () => {
    if (!id) return;
    setActing(true);
    try {
      let updated: Contract;
      switch (modal.action) {
        case 'submit_legal':
          updated = await submitToLegal(id);
          showSuccess('Smlouva odeslana k pravnimu schvaleni');
          break;
        case 'approve':
          updated = await approveContract(id);
          showSuccess('Smlouva schvalena');
          break;
        case 'reject':
          updated = await rejectContract(id);
          showSuccess('Smlouva zamitnuta');
          break;
        default:
          return;
      }
      setContract(updated);
    } catch (err: any) {
      showError(err?.message ?? 'Chyba pri akci');
    } finally {
      setActing(false);
      setModal({ open: false, action: '', title: '', message: '' });
    }
  };

  if (state === 'loading') return <LoadingSpinner size="lg" message="Nacitani smlouvy..." />;
  if (state === 'empty') return <div className="text-center py-12 text-gray-500">Smlouva nenalezena.</div>;
  if (state === 'error') return <div className="text-center py-12 text-red-600">Chyba pri nacitani dat.</div>;
  if (!contract) return null;

  const isLegal = currentRole === 'Legal/Compliance';
  const isDraft = contract.status === 'draft';
  const isPendingLegal = contract.status === 'pending_legal';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smlouva {contract.id}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={contract.status} />
            <StatusBadge status={contract.contract_type} variant="neutral" />
            <StatusBadge status={contract.approval_status} />
          </div>
        </div>
        <SecondaryButton onClick={() => navigate('/contracts')}>Zpet na seznam</SecondaryButton>
      </div>

      {/* Contract Detail */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Zakaznik</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <button
                onClick={() => navigate(`/customers/${contract.customer_id}`)}
                className="text-blue-600 hover:underline"
              >
                {customer?.legal_name ?? contract.customer_id}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Typ smlouvy</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.contract_type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Verze</dt>
            <dd className="mt-1 text-sm text-gray-900">v{contract.version}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Region</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.region}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">SLA Response</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.sla_response_hours}h</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">SLA Resolution</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.sla_resolution_hours}h</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Platnost od</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.start_date}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Platnost do</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.end_date}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Popis podminek</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.terms_description || '--'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Sluzby</dt>
            <dd className="mt-1 text-sm text-gray-900">{contract.services || '--'}</dd>
          </div>
          {contract.special_conditions && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Specialni podminky</dt>
              <dd className="mt-1 text-sm text-gray-900">{contract.special_conditions}</dd>
            </div>
          )}
          {contract.approved_by_legal_id && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Schvalil</dt>
              <dd className="mt-1 text-sm text-gray-900">{contract.approved_by_legal_id}</dd>
            </div>
          )}
          {contract.approved_at && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Schvaleno dne</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(contract.approved_at).toLocaleString('cs-CZ')}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Akce</h2>
        <div className="flex flex-wrap gap-3">
          {isDraft && (
            <PrimaryButton
              onClick={() =>
                setModal({
                  open: true,
                  action: 'submit_legal',
                  title: 'Odeslat Legal',
                  message: 'Opravdu chcete odeslat tuto smlouvu k pravnimu schvaleni?',
                })
              }
              disabled={acting}
            >
              Odeslat Legal
            </PrimaryButton>
          )}

          {isPendingLegal && isLegal && (
            <>
              <PrimaryButton
                onClick={() =>
                  setModal({
                    open: true,
                    action: 'approve',
                    title: 'Schvalit smlouvu',
                    message: 'Opravdu chcete schvalit tuto smlouvu?',
                  })
                }
                disabled={acting}
                className="!bg-green-600 hover:!bg-green-700"
              >
                Schvalit
              </PrimaryButton>
              <SecondaryButton
                onClick={() =>
                  setModal({
                    open: true,
                    action: 'reject',
                    title: 'Zamitnout smlouvu',
                    message: 'Opravdu chcete zamitnout tuto smlouvu? Vrati se do stavu draft.',
                  })
                }
                disabled={acting}
              >
                Zamitnout
              </SecondaryButton>
            </>
          )}

          {isPendingLegal && !isLegal && (
            <p className="text-sm text-gray-500 italic">
              Smlouva ceka na schvaleni pravnim oddelenim.
            </p>
          )}

          {!isDraft && !isPendingLegal && (
            <p className="text-sm text-gray-500 italic">
              Zadne dostupne akce pro aktualni stav smlouvy.
            </p>
          )}
        </div>
      </div>

      {/* Version History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Historie verzi</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span>v{contract.version} (aktualni)</span>
            <span>{new Date(contract.updated_at).toLocaleString('cs-CZ')}</span>
          </div>
          {contract.version > 1 && (
            <div className="flex justify-between text-gray-400">
              <span>v1 (puvodni)</span>
              <span>{new Date(contract.created_at).toLocaleString('cs-CZ')}</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, action: '', title: '', message: '' })}
        onConfirm={handleAction}
        title={modal.title}
        message={modal.message}
        variant={modal.action === 'reject' ? 'danger' : 'default'}
      />
    </div>
  );
}
