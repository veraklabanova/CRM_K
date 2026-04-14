import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
}

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  active: 'success',
  closed_won: 'success',
  resolved: 'success',
  approved: 'success',
  closed: 'success',
  finance_review: 'warning',
  awaiting_decision: 'warning',
  pending_legal: 'warning',
  escalated: 'warning',
  pending: 'warning',
  in_progress: 'warning',
  amendment_pending: 'warning',
  closed_lost: 'danger',
  terminated: 'danger',
  expired: 'danger',
  rejected: 'danger',
  blocked: 'danger',
  open: 'info',
  lead: 'info',
  qualified: 'info',
  detected: 'info',
};

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant }) => {
  const resolvedVariant = variant ?? STATUS_VARIANT_MAP[status] ?? 'neutral';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT_CLASSES[resolvedVariant]}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
