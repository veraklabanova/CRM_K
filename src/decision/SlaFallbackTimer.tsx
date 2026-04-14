// ============================================================
// EnterpriseCRM — SlaFallbackTimer
// Phase D2: Background SLA fallback check (15s interval)
// Auto-resolves conflicts that have passed their SLA deadline
// ============================================================

import React, { useEffect, useRef } from 'react';
import { useDecision } from '../context/DecisionContext';
import { conflicts } from '../data/seedData';

const SLA_CHECK_INTERVAL_MS = 15_000; // 15 seconds

/**
 * SlaFallbackTimer is a headless component (no visible UI).
 * It runs a periodic check every 15 seconds looking for conflicts
 * in `awaiting_decision` status whose `sla_deadline` has passed.
 * When found, it auto-resolves with timeout_fallback variant.
 *
 * Render this once in App.tsx or AppLayout.
 */
const SlaFallbackTimer: React.FC = () => {
  const { addDecision, resolvedConflictIds } = useDecision();
  const resolvedRef = useRef(resolvedConflictIds);

  // Keep ref in sync so we don't depend on the Set in the interval closure
  useEffect(() => {
    resolvedRef.current = resolvedConflictIds;
  }, [resolvedConflictIds]);

  useEffect(() => {
    const checkSlaFallbacks = () => {
      const now = new Date();

      for (const conflict of conflicts) {
        // Only check awaiting_decision conflicts with an SLA deadline
        if (conflict.status !== 'awaiting_decision') continue;
        if (!conflict.sla_deadline) continue;

        // Skip if already resolved
        if (resolvedRef.current.has(conflict.id)) continue;

        const deadline = new Date(conflict.sla_deadline);
        if (now <= deadline) continue;

        // SLA has expired — auto-resolve with timeout fallback
        addDecision({
          conflictId: conflict.id,
          conflictType: conflict.type,
          kcsId: `KCS-fallback`,
          escalationLevel: 'timeout_fallback',
          situation: `SLA deadline vyprselo pro konflikt ${conflict.id}. Automaticke reseni systemem.`,
          chosenVariant: 'timeout_fallback',
          chosenVariantLabel: 'Timeout Fallback',
          decidedBy: 'System (timeout fallback)',
          justification: 'Automaticke reseni — SLA deadline vyprselo bez manuálního rozhodnutí. Aplikovan fallback dle strategie.',
        });

        console.log(
          `[SlaFallbackTimer] Auto-resolved conflict ${conflict.id} (type: ${conflict.type}) — SLA deadline passed.`,
        );
      }
    };

    // Run once immediately on mount
    checkSlaFallbacks();

    // Then every 15 seconds
    const interval = setInterval(checkSlaFallbacks, SLA_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [addDecision]);

  // No visible UI
  return null;
};

export default SlaFallbackTimer;
