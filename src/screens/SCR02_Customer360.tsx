// ============================================================
// SCR-02 Customer 360 — Complete customer view
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import type { DataTableColumn } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getCustomer,
  getContactsByCustomer,
  getOpportunities,
  getContracts,
  getSupportCases,
} from '../api/mockApi';
import type { Customer, Contact, Opportunity, Contract, SupportCase } from '../data/types';

type TabKey = 'info' | 'contacts' | 'opportunities' | 'contracts' | 'cases';

export function Customer360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, isReadonly } = useRole();
  const { showError } = useToast();
  const readonly = isReadonly('SCR-02');

  const [state, setState] = useState<'loading' | 'default' | 'error' | 'empty'>('loading');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState('loading');

    Promise.all([
      getCustomer(id),
      getContactsByCustomer(id),
      getOpportunities({ }),
      getContracts({ customerId: id }),
      getSupportCases({ customerId: id }),
    ])
      .then(([cust, cont, opps, contr, sup]) => {
        if (cancelled) return;
        setCustomer(cust);
        setContacts(cont);
        setOpportunities(opps.filter((o) => o.customer_id === id));
        setContracts(contr);
        setCases(sup);
        setState('default');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 404) {
          setState('empty');
        } else {
          showError('Chyba pri nacitani zakaznika');
          setState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, showError]);

  if (state === 'loading') return <LoadingSpinner size="lg" message="Nacitani zakaznika..." />;
  if (state === 'empty' || !customer)
    return <div className="text-center py-12 text-gray-500">Zakaznik nenalezen.</div>;
  if (state === 'error')
    return <div className="text-center py-12 text-red-600">Chyba pri nacitani dat.</div>;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'info', label: 'Informace' },
    { key: 'contacts', label: 'Kontakty', count: contacts.length },
    { key: 'opportunities', label: 'Prilezitosti', count: opportunities.length },
    { key: 'contracts', label: 'Smlouvy', count: contracts.length },
    { key: 'cases', label: 'Podpora', count: cases.length },
  ];

  const contactCols: DataTableColumn[] = [
    { key: 'name', label: 'Jmeno' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefon' },
    { key: 'role', label: 'Role' },
    {
      key: 'is_primary',
      label: 'Primarni',
      render: (row: Contact) => (row.is_primary ? <StatusBadge status="active" variant="success" /> : ''),
    },
  ];

  const oppCols: DataTableColumn[] = [
    { key: 'opportunity_name', label: 'Nazev' },
    {
      key: 'value_eur',
      label: 'Hodnota',
      render: (row: Opportunity) => `${row.value_eur.toLocaleString('cs-CZ')} EUR`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Opportunity) => <StatusBadge status={row.status} />,
    },
    { key: 'expected_close_date', label: 'Ocekavane uzavreni' },
  ];

  const contractCols: DataTableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'contract_type', label: 'Typ' },
    {
      key: 'status',
      label: 'Status',
      render: (row: Contract) => <StatusBadge status={row.status} />,
    },
    { key: 'start_date', label: 'Od' },
    { key: 'end_date', label: 'Do' },
  ];

  const caseCols: DataTableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'subject', label: 'Predmet' },
    {
      key: 'priority',
      label: 'Priorita',
      render: (row: SupportCase) => <StatusBadge status={row.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: SupportCase) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.legal_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={customer.status} />
            <span className="text-sm text-gray-500">Region: {customer.primary_region}</span>
            <span className="text-sm text-gray-500">VAT: {customer.vat_id}</span>
          </div>
        </div>
        {!readonly && (
          <PrimaryButton onClick={() => navigate(`/customers/${id}/edit`)}>
            Editovat
          </PrimaryButton>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Pravni nazev</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.legal_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">VAT ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.vat_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Region</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.primary_region}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1"><StatusBadge status={customer.status} /></dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Account Manager</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.owning_account_manager_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Verze</dt>
              <dd className="mt-1 text-sm text-gray-900">v{customer.version}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Poznamky</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.notes ?? 'Zadne poznamky'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vytvoreno</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(customer.created_at).toLocaleString('cs-CZ')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Posledni uprava</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(customer.updated_at).toLocaleString('cs-CZ')}</dd>
            </div>
          </dl>
        </div>
      )}

      {activeTab === 'contacts' && (
        <DataTable columns={contactCols} data={contacts} emptyMessage="Zadne kontakty." />
      )}

      {activeTab === 'opportunities' && (
        <DataTable
          columns={oppCols}
          data={opportunities}
          onRowClick={(row) => navigate(`/opportunities/${row.id}`)}
          emptyMessage="Zadne prilezitosti."
        />
      )}

      {activeTab === 'contracts' && (
        <DataTable
          columns={contractCols}
          data={contracts}
          onRowClick={(row) => navigate(`/contracts/${row.id}`)}
          emptyMessage="Zadne smlouvy."
        />
      )}

      {activeTab === 'cases' && (
        <DataTable
          columns={caseCols}
          data={cases}
          onRowClick={(row) => navigate(`/support-cases/${row.id}`)}
          emptyMessage="Zadne pripady podpory."
        />
      )}
    </div>
  );
}
