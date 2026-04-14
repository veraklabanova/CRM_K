// ============================================================
// SCR-03 Customer Edit — Optimistic lock form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MergeDiffPanel from '../components/MergeDiffPanel';
import { getCustomer, updateCustomer, getUsers } from '../api/mockApi';
import type { Customer } from '../data/types';

const REGION_OPTIONS = [
  { value: 'CZ', label: 'CZ' },
  { value: 'DE', label: 'DE' },
  { value: 'AT', label: 'AT' },
  { value: 'PL', label: 'PL' },
];

export function CustomerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error' | 'conflict'>('loading');
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<Customer | null>(null);
  const [serverVersion, setServerVersion] = useState<Customer | null>(null);

  // Form fields
  const [legalName, setLegalName] = useState('');
  const [vatId, setVatId] = useState('');
  const [primaryRegion, setPrimaryRegion] = useState('');
  const [owningAm, setOwningAm] = useState('');
  const [amOptions, setAmOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState('loading');

    Promise.all([getCustomer(id), getUsers()])
      .then(([cust, users]) => {
        if (cancelled) return;
        setOriginal(cust);
        setLegalName(cust.legal_name);
        setVatId(cust.vat_id);
        setPrimaryRegion(cust.primary_region);
        setOwningAm(cust.owning_account_manager_id);
        setAmOptions(
          users
            .filter((u) => u.role === 'Account Manager')
            .map((u) => ({ value: u.id, label: u.name })),
        );
        setState('default');
      })
      .catch(() => {
        if (cancelled) return;
        showError('Chyba při načítání zákazníka');
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [id, showError]);

  const handleSave = async () => {
    if (!original || !id) return;
    setSaving(true);

    try {
      await updateCustomer(
        id,
        {
          legal_name: legalName,
          vat_id: vatId,
          primary_region: primaryRegion as Customer['primary_region'],
          owning_account_manager_id: owningAm,
          updated_by: currentUser.id,
        },
        original.version,
      );
      showSuccess('Zákazník úspěšně uložen');
      navigate(`/customers/${id}`);
    } catch (err: any) {
      if (err?.status === 409) {
        // Optimistic lock conflict
        try {
          const freshCustomer = await getCustomer(id);
          setServerVersion(freshCustomer);
          setState('conflict');
        } catch {
          showError('Nelze načíst aktuální data ze serveru');
        }
      } else {
        showError(err?.message ?? 'Chyba při ukládání');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptMine = async () => {
    if (!serverVersion || !id) return;
    setSaving(true);
    try {
      await updateCustomer(
        id,
        {
          legal_name: legalName,
          vat_id: vatId,
          primary_region: primaryRegion as Customer['primary_region'],
          owning_account_manager_id: owningAm,
          updated_by: currentUser.id,
        },
        serverVersion.version,
      );
      showSuccess('Zákazník úspěšně uložen (vaše změny)');
      navigate(`/customers/${id}`);
    } catch (err: any) {
      showError(err?.message ?? 'Chyba při ukládání');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptTheirs = () => {
    if (!serverVersion) return;
    setOriginal(serverVersion);
    setLegalName(serverVersion.legal_name);
    setVatId(serverVersion.vat_id);
    setPrimaryRegion(serverVersion.primary_region);
    setOwningAm(serverVersion.owning_account_manager_id);
    setServerVersion(null);
    setState('default');
    showSuccess('Načteny aktuální data ze serveru');
  };

  if (state === 'loading') return <LoadingSpinner size="lg" message="Načítání formuláře..." />;
  if (state === 'error')
    return <div className="text-center py-12 text-red-600">Chyba při načítání dat.</div>;

  const FIELD_LABELS: Record<string, string> = {
    legal_name: 'Právní název',
    vat_id: 'VAT ID',
    primary_region: 'Region',
    owning_account_manager_id: 'Account Manager',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Editace zákazníka</h1>
        <SecondaryButton onClick={() => navigate(`/customers/${id}`)}>Zrušit</SecondaryButton>
      </div>

      {state === 'conflict' && serverVersion && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
            Konflikt verzí! Zákazník byl změněn jiným uživatelem. Porovnejte změny a rozhodněte.
          </div>
          <MergeDiffPanel
            myChanges={{
              legal_name: legalName,
              vat_id: vatId,
              primary_region: primaryRegion,
              owning_account_manager_id: owningAm,
            }}
            theirChanges={{
              legal_name: serverVersion.legal_name,
              vat_id: serverVersion.vat_id,
              primary_region: serverVersion.primary_region,
              owning_account_manager_id: serverVersion.owning_account_manager_id,
            }}
            fieldLabels={FIELD_LABELS}
            onAcceptMine={handleAcceptMine}
            onAcceptTheirs={handleAcceptTheirs}
          />
        </div>
      )}

      {state === 'default' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <TextInput
            label="Právní název"
            value={legalName}
            onChange={setLegalName}
            required
          />
          <TextInput label="VAT ID" value={vatId} onChange={setVatId} required />
          <SelectInput
            label="Primární region"
            value={primaryRegion}
            onChange={setPrimaryRegion}
            options={REGION_OPTIONS}
            required
          />
          <SelectInput
            label="Account Manager"
            value={owningAm}
            onChange={setOwningAm}
            options={amOptions}
            required
          />

          <div className="flex gap-3 pt-4">
            <PrimaryButton onClick={handleSave} loading={saving}>
              Uložit
            </PrimaryButton>
            <SecondaryButton onClick={() => navigate(`/customers/${id}`)}>
              Zrušit
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
