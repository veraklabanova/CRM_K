// ============================================================
// SCR-07 Finance Gate Decision — Approve/Block opportunity
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import WarningBanner from '../components/WarningBanner';
import { getOpportunity, getCustomer, financeDecide } from '../api/mockApi';
import type { Opportunity, Customer } from '../data/types';

export function FinanceGateDecision() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error' | 'empty' | 'success'>('loading');
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [decision, setDecision] = useState<string>('');
  const [justification, setJustification] = useState('');
  const [justError, setJustError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState('loading');

    getOpportunity(id)
      .then(async (o) => {
        if (cancelled) return;
        setOpp(o);
        const c = await getCustomer(o.customer_id);
        if (cancelled) return;
        setCustomer(c);
        setState('default');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 404) setState('empty');
        else {
          showError('Chyba pri nacitani');
          setState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, showError]);

  const handleSubmit = async () => {
    if (!id || !opp) return;

    if (justification.trim().length < 10) {
      setJustError('Zduvodneni musi mit alespon 10 znaku');
      return;
    }
    if (!decision) {
      showError('Vyberte rozhodnuti');
      return;
    }

    setJustError('');
    setSubmitting(true);

    try {
      const updated = await financeDecide(
        id,
        decision as 'release' | 'maintain_block',
        justification,
      );
      setOpp(updated);
      setState('success');
      showSuccess(
        decision === 'release'
          ? 'Finance gate uvolnen — obchod pokracuje'
          : 'Finance gate potvrzen — obchod zamitnut',
      );
    } catch (err: any) {
      showError(err?.message ?? 'Chyba pri ukladani rozhodnuti');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') return <LoadingSpinner size="lg" message="Nacitani..." />;
  if (state === 'empty') return <div className="text-center py-12 text-gray-500">Prilezitost nenalezena.</div>;
  if (state === 'error') return <div className="text-center py-12 text-red-600">Chyba pri nacitani dat.</div>;
  if (!opp) return null;

  if (state === 'success') {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-green-800 mb-2">Rozhodnuti ulozeno</h2>
          <p className="text-sm text-green-700">
            Obchod {opp.opportunity_name} — status: <StatusBadge status={opp.status} />
          </p>
        </div>
        <SecondaryButton onClick={() => navigate('/finance-reviews')}>
          Zpet na Finance Review
        </SecondaryButton>
      </div>
    );
  }

  const isInReview = opp.status === 'finance_review';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finance Gate Decision</h1>
        <SecondaryButton onClick={() => navigate('/finance-reviews')}>Zpet</SecondaryButton>
      </div>

      {!isInReview && (
        <WarningBanner message={`Tato prilezitost neni ve stavu finance_review (aktualni: ${opp.status}).`} />
      )}

      {/* Opportunity Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail prilezitosti</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Nazev</dt>
            <dd className="text-sm text-gray-900">{opp.opportunity_name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Hodnota</dt>
            <dd className="text-sm text-gray-900 font-semibold">{opp.value_eur.toLocaleString('cs-CZ')} EUR</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Zakaznik</dt>
            <dd className="text-sm text-gray-900">{customer?.legal_name ?? opp.customer_id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Region</dt>
            <dd className="text-sm text-gray-900">{opp.region}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd><StatusBadge status={opp.status} /></dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Finance blokace</dt>
            <dd><StatusBadge status={opp.finance_block_status} /></dd>
          </div>
        </dl>
      </div>

      {/* Customer Finance Summary */}
      {customer && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Financni souhrn zakaznika</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Zakaznik</dt>
              <dd className="text-sm text-gray-900">{customer.legal_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">VAT</dt>
              <dd className="text-sm text-gray-900">{customer.vat_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd><StatusBadge status={customer.status} /></dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Region</dt>
              <dd className="text-sm text-gray-900">{customer.primary_region}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Decision Form */}
      {isInReview && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Rozhodnuti</h2>

          <SelectInput
            label="Rozhodnuti"
            value={decision}
            onChange={setDecision}
            options={[
              { value: 'release', label: 'Uvolnit (release) — obchod pokracuje' },
              { value: 'maintain_block', label: 'Udrzet blokaci — obchod zamitnut' },
            ]}
            placeholder="Vyberte rozhodnuti..."
            required
          />

          <TextInput
            label="Zduvodneni"
            value={justification}
            onChange={(v) => {
              setJustification(v);
              if (v.trim().length >= 10) setJustError('');
            }}
            type="textarea"
            placeholder="Minimalne 10 znaku..."
            error={justError}
            required
          />

          <div className="flex gap-3 pt-2">
            <PrimaryButton onClick={handleSubmit} loading={submitting} disabled={submitting}>
              Potvrdit rozhodnuti
            </PrimaryButton>
            <SecondaryButton onClick={() => navigate('/finance-reviews')}>Zrusit</SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
