// ============================================================
// SCR-12a Conflict Resolution Detail — Decision form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useDecision } from '../context/DecisionContext';
import { useToast } from '../components/Toast';
import SelectInput from '../components/SelectInput';
import TextInput from '../components/TextInput';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import WarningBanner from '../components/WarningBanner';
import ConfirmationModal from '../components/ConfirmationModal';
import { getConflict, getCustomer, resolveConflict, escalateConflict } from '../api/mockApi';
import type { Conflict, Customer } from '../data/types';

const TYPE_LABELS: Record<string, string> = {
  data_ownership: 'Vlastnictvi dat',
  deal_vs_finance: 'Obchod vs. Finance',
  local_vs_global: 'Lokalni vs. Globalni',
  verbal_vs_written: 'Ustni vs. Pisemne',
  sla_exception: 'SLA výjimka',
};

export function ConflictResolution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const { getStrategyForConflictType, canResolve, addDecision } = useDecision();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error' | 'empty'>('loading');
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [justification, setJustification] = useState('');
  const [justError, setJustError] = useState('');
  const [acting, setActing] = useState(false);
  const [escalateModal, setEscalateModal] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setState('loading');
    try {
      const c = await getConflict(id);
      setConflict(c);
      const cust = await getCustomer(c.customer_id);
      setCustomer(cust);
      setState('default');
    } catch (err: any) {
      if (err?.status === 404) setState('empty');
      else {
        showError('Chyba při načítání konfliktu');
        setState('error');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (state === 'loading') return <LoadingSpinner size="lg" message="Načítání konfliktu..." />;
  if (state === 'empty') return <div className="text-center py-12 text-gray-500">Konflikt nenalezen.</div>;
  if (state === 'error') return <div className="text-center py-12 text-red-600">Chyba při načítání dat.</div>;
  if (!conflict) return null;

  const strategy = getStrategyForConflictType(conflict.type);
  const isResolved = conflict.status === 'resolved' || conflict.status === 'escalated_l3';
  const canResolveThis = id ? canResolve(id) : false;
  const guardrailBlocked = !canResolveThis && !isResolved;

  const variantOptions = strategy
    ? strategy.variants.map((v) => ({
        value: v.id,
        label: `${v.label}${v.recommended ? ' (doporuceno)' : ''}`,
      }))
    : conflict.decision_options.map((opt, i) => ({
        value: `opt-${i}`,
        label: opt,
      }));

  const selectedVariantDetail = strategy?.variants.find((v) => v.id === selectedVariant);

  const handleResolve = async () => {
    if (!id || !conflict) return;

    if (justification.trim().length < 20) {
      setJustError('Zdůvodnění musí mít alespoň 20 znaků');
      return;
    }
    if (!selectedVariant) {
      showError('Vyberte variantu rozhodnutí');
      return;
    }
    setJustError('');
    setActing(true);

    try {
      // Add to decision log
      const variantLabel = selectedVariantDetail?.label ?? selectedVariant;
      const record = addDecision({
        conflictId: id,
        conflictType: conflict.type,
        kcsId: strategy?.kcsId ?? 'unknown',
        escalationLevel: 'L2',
        situation: conflict.description ?? `Konflikt ${conflict.type}`,
        chosenVariant: selectedVariant,
        chosenVariantLabel: variantLabel,
        decidedBy: currentUser.name,
        justification,
      });

      if (record?.guardrailCheck === 'blocked') {
        showError('Guardrail: Tento konflikt jiz byl vyresen.');
        setActing(false);
        return;
      }

      // Update conflict via API
      const updated = await resolveConflict(id, selectedVariant, justification, currentUser.id);
      setConflict(updated);
      showSuccess('Konflikt vyresen');
    } catch (err: any) {
      showError(err?.message ?? 'Chyba při řešení konfliktu');
    } finally {
      setActing(false);
    }
  };

  const handleEscalate = async () => {
    if (!id) return;
    setActing(true);
    try {
      const updated = await escalateConflict(id);
      setConflict(updated);
      showSuccess('Konflikt eskalovan na L3');
    } catch (err: any) {
      showError(err?.message ?? 'Chyba při eskalaci');
    } finally {
      setActing(false);
      setEscalateModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Konflikt {conflict.id}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={conflict.status} />
            <span className="text-sm text-gray-500">{TYPE_LABELS[conflict.type] ?? conflict.type}</span>
          </div>
        </div>
        <SecondaryButton onClick={() => navigate('/conflicts')}>Zpět na seznam</SecondaryButton>
      </div>

      {guardrailBlocked && (
        <WarningBanner message="Guardrail: Tento konflikt jiz byl vyresen v teto sesi a nelze ho znovu resit." />
      )}

      {/* Context */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Kontext konfliktu</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Typ</dt>
            <dd className="mt-1 text-sm text-gray-900">{TYPE_LABELS[conflict.type] ?? conflict.type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Zákazník</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <button
                onClick={() => navigate(`/customers/${conflict.customer_id}`)}
                className="text-blue-600 hover:underline"
              >
                {customer?.legal_name ?? conflict.customer_id}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Zdroj</dt>
            <dd className="mt-1 text-sm text-gray-900">{conflict.trigger_source_type} ({conflict.trigger_source_id})</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Ucastnici</dt>
            <dd className="mt-1 text-sm text-gray-900">{conflict.parties.join(', ')}</dd>
          </div>
          {conflict.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Popis</dt>
              <dd className="mt-1 text-sm text-gray-900">{conflict.description}</dd>
            </div>
          )}
          {conflict.sla_deadline && (
            <div>
              <dt className="text-sm font-medium text-gray-500">SLA Deadline</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(conflict.sla_deadline).toLocaleString('cs-CZ')}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Strategy Info */}
      {strategy && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            Strategie: {strategy.name} ({strategy.kcsId})
          </h3>
          <p className="text-xs text-blue-700">
            Typ řešení: {strategy.resolutionType} |
            Guardrail: {strategy.guardingInvariant} |
            Fallback: {strategy.fallbackIfTimeout}
          </p>
          {strategy.escalationPath.length > 0 && (
            <p className="text-xs text-blue-700 mt-1">
              Eskalacni cesta: {strategy.escalationPath.join(' -> ')}
              {strategy.escalationSlaMinutes != null && ` (SLA: ${strategy.escalationSlaMinutes} min)`}
            </p>
          )}
        </div>
      )}

      {/* Resolution form */}
      {conflict.status === 'resolved' && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Vyreseno</h3>
          <p className="text-sm text-green-700">Rozhodnuti: {conflict.resolution_decision}</p>
          <p className="text-sm text-green-700">Zdůvodnění: {conflict.resolution_justification}</p>
          <p className="text-xs text-green-600 mt-2">
            Vyresil: {conflict.resolved_by_id} dne {conflict.resolved_at ? new Date(conflict.resolved_at).toLocaleString('cs-CZ') : '--'}
          </p>
        </div>
      )}

      {conflict.status === 'escalated_l3' && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
          <h3 className="text-sm font-semibold text-amber-800">Eskalovano na L3</h3>
          <p className="text-sm text-amber-700">Tento konflikt byl eskalován na vyšší úroveň řešení.</p>
        </div>
      )}

      {!isResolved && canResolveThis && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Rozhodnuti</h2>

          <SelectInput
            label="Varianta rozhodnutí"
            value={selectedVariant}
            onChange={setSelectedVariant}
            options={variantOptions}
            placeholder="Vyberte variantu..."
            required
          />

          {selectedVariantDetail && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p className="text-gray-900">{selectedVariantDetail.description}</p>
              <p className="text-gray-600">Dopad: {selectedVariantDetail.impact}</p>
              <p className="text-gray-600">Riziko: {selectedVariantDetail.risk}</p>
            </div>
          )}

          <TextInput
            label="Zdůvodnění rozhodnutí"
            value={justification}
            onChange={(v) => {
              setJustification(v);
              if (v.trim().length >= 20) setJustError('');
            }}
            type="textarea"
            placeholder="Minimálně 20 znaků... Popište proč jste zvolili tuto variantu."
            error={justError}
            required
          />

          <div className="flex gap-3 pt-2">
            <PrimaryButton onClick={handleResolve} loading={acting} disabled={acting}>
              Rozhodnout
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setEscalateModal(true)}
              disabled={acting}
            >
              Eskalovat L3
            </SecondaryButton>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={escalateModal}
        onClose={() => setEscalateModal(false)}
        onConfirm={handleEscalate}
        title="Eskalovat na L3"
        message="Opravdu chcete eskalovat tento konflikt na úroveň L3? Rozhodnutí bude přeneseno na vyšší management."
        variant="danger"
      />
    </div>
  );
}
