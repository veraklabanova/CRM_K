// ============================================================
// SCR-13 Audit Log — Filterable list with CSV export
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';
import SelectInput from '../components/SelectInput';
import TextInput from '../components/TextInput';
import DataTable from '../components/DataTable';
import type { DataTableColumn } from '../components/DataTable';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { getAuditRecords, exportAuditCsv } from '../api/mockApi';
import type { AuditRecord, EntityType } from '../data/types';

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Vse' },
  { value: 'customer', label: 'Zakaznik' },
  { value: 'contact', label: 'Kontakt' },
  { value: 'opportunity', label: 'Prilezitost' },
  { value: 'contract', label: 'Smlouva' },
  { value: 'support_case', label: 'Podpora' },
  { value: 'conflict', label: 'Konflikt' },
];

export function AuditLog() {
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<'loading' | 'default' | 'error'>('loading');
  const [records, setRecords] = useState<AuditRecord[]>([]);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setState('loading');
    try {
      const filters: { entityType?: EntityType; dateFrom?: string; dateTo?: string } = {};
      if (entityType) filters.entityType = entityType as EntityType;
      if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) filters.dateTo = new Date(dateTo + 'T23:59:59').toISOString();

      const data = await getAuditRecords(filters);
      setRecords(data);
      setState('default');
    } catch {
      showError('Chyba pri nacitani audit logu');
      setState('error');
    }
  }, [entityType, dateFrom, dateTo, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const filters: { entityType?: EntityType; dateFrom?: string; dateTo?: string } = {};
      if (entityType) filters.entityType = entityType as EntityType;
      if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) filters.dateTo = new Date(dateTo + 'T23:59:59').toISOString();

      const csv = await exportAuditCsv(filters);

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('CSV export uspesne stazen');
    } catch {
      showError('Chyba pri exportu CSV');
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID' },
    {
      key: 'entity_type',
      label: 'Typ entity',
      render: (row: AuditRecord) => row.entity_type.replace(/_/g, ' '),
    },
    { key: 'entity_id', label: 'Entity ID' },
    { key: 'action', label: 'Akce' },
    { key: 'actor_name', label: 'Aktér' },
    { key: 'actor_role', label: 'Role' },
    {
      key: 'justification',
      label: 'Zduvodneni',
      render: (row: AuditRecord) =>
        row.justification ? (
          <span title={row.justification} className="truncate max-w-[200px] block">
            {row.justification}
          </span>
        ) : (
          <span className="text-gray-400">--</span>
        ),
    },
    {
      key: 'created_at',
      label: 'Cas',
      render: (row: AuditRecord) => new Date(row.created_at).toLocaleString('cs-CZ'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <PrimaryButton onClick={handleExport} loading={exporting}>
          Export CSV
        </PrimaryButton>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectInput
            label="Typ entity"
            value={entityType}
            onChange={setEntityType}
            options={ENTITY_TYPE_OPTIONS}
          />
          <TextInput
            label="Datum od"
            value={dateFrom}
            onChange={setDateFrom}
            type="date"
          />
          <TextInput
            label="Datum do"
            value={dateTo}
            onChange={setDateTo}
            type="date"
          />
        </div>
      </div>

      {/* Results */}
      {state === 'loading' ? (
        <LoadingSpinner message="Nacitani audit zaznamu..." />
      ) : state === 'error' ? (
        <div className="text-center py-12 text-red-600">Chyba pri nacitani dat.</div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{records.length} zaznamu</p>
          <DataTable
            columns={columns}
            data={records}
            emptyMessage="Zadne audit zaznamy odpovidajici filtrum."
          />
        </>
      )}
    </div>
  );
}
