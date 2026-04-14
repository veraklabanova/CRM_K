// ============================================================
// EnterpriseCRM — DecisionPanel
// Phase D2: Modal for making decisions on conflicts
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDecision } from '../context/DecisionContext';
import type { DecisionRecord, DecisionVariant, DecisionStrategy } from '../context/DecisionContext';
import { useRole } from '../context/RoleContext';
import { useToast } from '../components/Toast';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DecisionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conflictId: string;
  conflictType: string;
  situation: string;
  onDecisionMade?: (record: DecisionRecord) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getEscalationBadgeColor(level: string): string {
  switch (level) {
    case 'preventive_guard':
      return 'bg-blue-100 text-blue-800';
    case 'manual_escalation':
      return 'bg-orange-100 text-orange-800';
    case 'correction_record':
      return 'bg-purple-100 text-purple-800';
    case 'automatic':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DecisionPanel: React.FC<DecisionPanelProps> = ({
  isOpen,
  onClose,
  conflictId,
  conflictType,
  situation,
  onDecisionMade,
}) => {
  const { addDecision, getStrategyForConflictType, canResolve } = useDecision();
  const { currentUser } = useRole();
  const { showSuccess, showError } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [slaRemainingMs, setSlaRemainingMs] = useState<number | null>(null);

  const strategy: DecisionStrategy | undefined = useMemo(
    () => getStrategyForConflictType(conflictType),
    [conflictType, getStrategyForConflictType],
  );

  // --- SLA countdown ---
  useEffect(() => {
    if (!isOpen || !strategy?.escalationSlaMinutes) {
      setSlaRemainingMs(null);
      return;
    }

    // Simulate SLA start from now for the prototype
    const slaMs = strategy.escalationSlaMinutes * 60 * 1000;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, slaMs - elapsed);
      setSlaRemainingMs(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen, strategy]);

  // --- Reset on open ---
  useEffect(() => {
    if (isOpen) {
      setSelectedVariant(null);
      setJustification('');
      setAuditNote('');
    }
  }, [isOpen]);

  // --- Confirm handler ---
  const handleConfirm = useCallback(() => {
    if (!strategy || !selectedVariant) return;

    const variant = strategy.variants.find((v) => v.id === selectedVariant);
    if (!variant) return;

    if (justification.trim().length < 20) {
      showError('Zduvodneni musi mit alespon 20 znaku.');
      return;
    }

    if (!canResolve(conflictId)) {
      showError('Guardrail: Tento konflikt jiz byl vyresen. Opakované reseni neni povoleno.');
      return;
    }

    const record = addDecision({
      conflictId,
      conflictType,
      kcsId: strategy.kcsId,
      escalationLevel: strategy.resolutionType,
      situation,
      chosenVariant: variant.id,
      chosenVariantLabel: variant.label,
      decidedBy: currentUser.name,
      justification: justification.trim() + (auditNote.trim() ? ` [Poznamka: ${auditNote.trim()}]` : ''),
    });

    if (record && record.guardrailCheck === 'blocked') {
      showError('Guardrail: Tento konflikt jiz byl vyresen. Rozhodnuti zaznamenano jako blokovane.');
      return;
    }

    if (record) {
      showSuccess(`Rozhodnuti ${record.id} ulozeno.`);
      onDecisionMade?.(record);
      onClose();
    }
  }, [
    strategy,
    selectedVariant,
    justification,
    auditNote,
    conflictId,
    conflictType,
    situation,
    currentUser.name,
    canResolve,
    addDecision,
    showSuccess,
    showError,
    onDecisionMade,
    onClose,
  ]);

  if (!isOpen) return null;

  if (!strategy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Strategie nenalezena</h2>
          <p className="text-sm text-gray-600 mb-4">
            Pro typ konfliktu <strong>{conflictType}</strong> nebyla nalezena rozhodovaci strategie.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Zavrit
          </button>
        </div>
      </div>
    );
  }

  const isValid = selectedVariant !== null && justification.trim().length >= 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{strategy.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-gray-500">{strategy.kcsId}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEscalationBadgeColor(strategy.resolutionType)}`}
                >
                  {strategy.resolutionType.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Zavrit"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* SLA countdown */}
          {slaRemainingMs !== null && strategy.escalationSlaMinutes && strategy.escalationSlaMinutes > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-700">
                SLA: {formatTimeRemaining(slaRemainingMs)}
              </span>
              <span className="text-xs text-gray-500">
                ({strategy.escalationSlaMinutes} min)
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Context section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Kontext situace</h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{situation}</p>
          </div>

          {/* Guardrail info */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 rounded-lg p-3">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <span className="font-medium text-blue-800">Guardrail:</span>{' '}
              <span className="text-blue-700">{strategy.guardingInvariant}</span>
            </div>
          </div>

          {/* Escalation path */}
          {strategy.escalationPath.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Eskalacni cesta:</span>{' '}
              {strategy.escalationPath.join(' \u2192 ')}
            </div>
          )}

          {/* Variants */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Varianty rozhodnuti</h3>
            <div className="space-y-2">
              {strategy.variants.map((variant: DecisionVariant) => (
                <label
                  key={variant.id}
                  className={`block border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedVariant === variant.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="decision-variant"
                      value={variant.id}
                      checked={selectedVariant === variant.id}
                      onChange={() => setSelectedVariant(variant.id)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{variant.label}</span>
                        {variant.recommended && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                            Doporuceno
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{variant.description}</p>
                      <div className="flex gap-4 mt-1.5 text-[11px]">
                        <span className="text-gray-500">
                          <span className="font-medium">Dopad:</span> {variant.impact}
                        </span>
                        <span className="text-gray-500">
                          <span className="font-medium">Riziko:</span> {variant.risk}
                        </span>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Fallback info */}
          <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
            <span className="font-medium">Fallback pri vyprseni SLA:</span>{' '}
            {strategy.fallbackIfTimeout}
          </div>

          {/* Justification */}
          <div>
            <label htmlFor="dp-justification" className="block text-sm font-semibold text-gray-700 mb-1">
              Zduvodneni rozhodnuti <span className="text-red-500">*</span>
            </label>
            <textarea
              id="dp-justification"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Minimalne 20 znaku..."
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                justification.length > 0 && justification.trim().length < 20
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
            />
            <div className="text-right text-[11px] text-gray-400 mt-0.5">
              {justification.trim().length}/20 min
            </div>
          </div>

          {/* Audit note */}
          <div>
            <label htmlFor="dp-audit-note" className="block text-sm font-medium text-gray-600 mb-1">
              Auditni poznamka <span className="text-gray-400">(volitelna)</span>
            </label>
            <textarea
              id="dp-audit-note"
              rows={2}
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder="Doplnujici informace pro audit..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Zrusit
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Potvrdit rozhodnuti
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionPanel;
