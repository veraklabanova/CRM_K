// ============================================================
// EnterpriseCRM — DecisionLogDrawer
// Phase D2: Slide-in drawer with decision log + strategic insights
// ============================================================

import React, { useState, useCallback } from 'react';
import { useDecision } from '../context/DecisionContext';
import type { DecisionRecord, PatternEntry } from '../context/DecisionContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DecisionLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConflictTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    data_ownership: 'bg-indigo-100 text-indigo-800',
    deal_vs_finance: 'bg-orange-100 text-orange-800',
    local_vs_global: 'bg-teal-100 text-teal-800',
    verbal_vs_written: 'bg-pink-100 text-pink-800',
    sla_exception: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[type] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function GuardrailBadge({ status }: { status: 'passed' | 'blocked' }) {
  return status === 'passed' ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      blocked
    </span>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Decision record card
// ---------------------------------------------------------------------------

function DecisionCard({ record }: { record: DecisionRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-gray-900">{record.id}</span>
            <ConflictTypeBadge type={record.conflictType} />
            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
              {record.escalationLevel.replace(/_/g, ' ')}
            </span>
            <GuardrailBadge status={record.guardrailCheck} />
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{record.situation}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          aria-label={expanded ? 'Sbalit' : 'Rozbalit'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
          <div>
            <span className="font-medium text-gray-700">Zvolená varianta:</span>{' '}
            {record.chosenVariantLabel}
          </div>
          <div>
            <span className="font-medium text-gray-700">Rozhodl:</span> {record.decidedBy}
          </div>
          <div>
            <span className="font-medium text-gray-700">Zdůvodnění:</span> {record.justification}
          </div>
          <div>
            <span className="font-medium text-gray-700">Čas:</span> {formatTimestamp(record.timestamp)}
          </div>
          <div>
            <span className="font-medium text-gray-700">KCS:</span>{' '}
            <span className="font-mono">{record.kcsId}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Konflikt:</span>{' '}
            <span className="font-mono">{record.conflictId}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategic Insights tab
// ---------------------------------------------------------------------------

function StrategicInsightsTab() {
  const { getPatterns, exportChangeProtocol } = useDecision();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const patterns = getPatterns();

  const handleExport = useCallback(
    async (patternKey: string) => {
      const protocol = exportChangeProtocol(patternKey);
      if (!protocol) return;

      const json = JSON.stringify(protocol, null, 2);

      try {
        await navigator.clipboard.writeText(json);
        setCopiedKey(patternKey);
        setTimeout(() => setCopiedKey(null), 2000);
      } catch {
        // Fallback: download as file
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `change-protocol-${patternKey.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setCopiedKey(patternKey);
        setTimeout(() => setCopiedKey(null), 2000);
      }
    },
    [exportChangeProtocol],
  );

  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">Zatím žádné patterny</p>
        <p className="text-xs mt-1">Patterny se objeví po více rozhodnutích.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Patterny se identifikují při opakovaných rozhodnutích. Pokud se stejná kombinace typ+varianta
        objeví 3x a více, stává se kandidátem na změnu procesu.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-3 font-semibold text-gray-700">Pattern</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Počet</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Status</th>
              <th className="text-right py-2 pl-3 font-semibold text-gray-700">Akce</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((pattern: PatternEntry) => (
              <tr
                key={pattern.key}
                className={`border-b border-gray-100 ${pattern.isChangeCandidate ? 'bg-yellow-50' : ''}`}
              >
                <td className="py-2 pr-3">
                  <div className="font-medium text-gray-900">
                    {pattern.conflictType.replace(/_/g, ' ')}
                  </div>
                  <div className="text-gray-500">{pattern.variant}</div>
                  {pattern.isChangeCandidate && (
                    <div className="text-[10px] text-amber-700 mt-0.5 italic">
                      {pattern.suggestedChange}
                    </div>
                  )}
                </td>
                <td className="text-center py-2 px-3">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      pattern.isChangeCandidate
                        ? 'bg-yellow-200 text-yellow-900'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {pattern.count}
                  </span>
                </td>
                <td className="text-center py-2 px-3">
                  {pattern.isChangeCandidate ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-200 text-yellow-900">
                      Change Candidate
                    </span>
                  ) : (
                    <span className="text-gray-400">Sledováno</span>
                  )}
                </td>
                <td className="text-right py-2 pl-3">
                  {pattern.isChangeCandidate && (
                    <button
                      onClick={() => handleExport(pattern.key)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 transition-colors"
                    >
                      {copiedKey === pattern.key ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Kopírováno
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Exportovat CR
                        </>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------

type TabId = 'decisions' | 'strategic';

const DecisionLogDrawer: React.FC<DecisionLogDrawerProps> = ({ isOpen, onClose }) => {
  const { decisions } = useDecision();
  const [activeTab, setActiveTab] = useState<TabId>('decisions');

  const sortedDecisions = [...decisions].reverse();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Decision Log</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Zavřít"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setActiveTab('decisions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'decisions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Rozhodnutí
              {decisions.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px]">
                  {decisions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('strategic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'strategic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Strategic
              <span className="ml-1 text-[10px] opacity-70">(L2)</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5" style={{ height: 'calc(100% - 120px)' }}>
          {activeTab === 'decisions' && (
            <>
              {sortedDecisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">Zatím žádná rozhodnutí</p>
                  <p className="text-xs mt-1">Rozhodnutí se objeví po vyřešení konfliktu.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedDecisions.map((record: DecisionRecord) => (
                    <DecisionCard key={record.id} record={record} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'strategic' && <StrategicInsightsTab />}
        </div>
      </div>
    </>
  );
};

export default DecisionLogDrawer;
