// ============================================================
// EnterpriseCRM — TypeScript Types
// Based on PRD_CRM_Korporat_v1_revised.md database model
// ============================================================

// --- Enums / Union Types ---

export type Role =
  | 'Account Manager'
  | 'Sales'
  | 'Finance Controller'
  | 'Support Agent'
  | 'Legal/Compliance'
  | 'Management'
  | 'Regional Director';

export type Region = 'CZ' | 'DE' | 'AT' | 'PL';

export type CustomerStatus = 'active' | 'inactive' | 'merge_required';

export type OpportunityStatus =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'finance_review'
  | 'closed_won'
  | 'closed_lost';

export type FinanceBlockStatus = 'none' | 'blocked' | 'released';

export type ContractStatus =
  | 'draft'
  | 'pending_legal'
  | 'active'
  | 'amendment_pending'
  | 'correction_pending'
  | 'expired'
  | 'terminated';

export type ContractType = 'master' | 'amendment' | 'addendum';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type SupportCaseStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'escalated'
  | 'dispute_pending'
  | 'sla_exception_pending'
  | 'resolved'
  | 'closed';

export type SupportCasePriority = 'low' | 'medium' | 'high' | 'critical';

export type ConflictType =
  | 'data_ownership'
  | 'deal_vs_finance'
  | 'local_vs_global'
  | 'verbal_vs_written'
  | 'sla_exception';

export type ConflictStatus =
  | 'detected'
  | 'under_review'
  | 'awaiting_decision'
  | 'resolved'
  | 'escalated_l3';

export type TriggerSourceType = 'opportunity' | 'contract' | 'support_case';

export type EntityType =
  | 'customer'
  | 'contact'
  | 'opportunity'
  | 'contract'
  | 'support_case'
  | 'conflict';

// --- Interfaces ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  region: Region;
}

export interface Customer {
  id: string;
  legal_name: string;
  vat_id: string;
  status: CustomerStatus;
  primary_region: Region;
  owning_account_manager_id: string;
  notes: string | null;
  version: number;
  created_at: string; // ISO 8601
  updated_at: string;
  updated_by: string;
}

export interface Contact {
  id: string;
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  region: Region | null;
  created_at: string;
}

export interface Opportunity {
  id: string;
  customer_id: string;
  opportunity_name: string;
  status: OpportunityStatus;
  value_eur: number; // EUR (whole euros, not cents — for prototype display)
  probability: number; // 0-100
  expected_close_date: string; // ISO date
  region: Region;
  owner_sales_id: string;
  finance_block_status: FinanceBlockStatus;
  finance_review_entered_at: string | null;
  qualification_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  customer_id: string;
  contract_type: ContractType;
  version: number;
  status: ContractStatus;
  sla_response_hours: number;
  sla_resolution_hours: number;
  start_date: string; // ISO date
  end_date: string; // ISO date
  terms_description: string;
  region: Region;
  services: string;
  special_conditions: string | null;
  approved_by_legal_id: string | null;
  approved_at: string | null;
  approval_status: ApprovalStatus;
  parent_contract_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportCase {
  id: string;
  customer_id: string;
  contract_id: string | null;
  subject: string;
  description: string;
  status: SupportCaseStatus;
  priority: SupportCasePriority;
  category: string;
  sla_deadline: string | null;
  assigned_agent_id: string | null;
  escalation_level: number; // 0-3
  contact_person: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  status: ConflictStatus;
  customer_id: string;
  trigger_source_type: TriggerSourceType;
  trigger_source_id: string;
  parties: string[]; // user IDs involved
  description: string | null;
  decision_options: string[];
  resolution_decision: string | null;
  resolution_justification: string | null;
  resolved_by_id: string | null;
  resolved_at: string | null;
  sla_deadline: string | null;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  actor_role: Role;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  justification: string | null;
  created_at: string;
}
