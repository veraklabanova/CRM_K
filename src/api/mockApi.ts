// ============================================================
// EnterpriseCRM — Mock API Layer
// Simulates backend with 300ms latency + RBAC enforcement
// ============================================================

import {
  users as seedUsers,
  customers as seedCustomers,
  contacts as seedContacts,
  opportunities as seedOpportunities,
  contracts as seedContracts,
  supportCases as seedSupportCases,
  conflicts as seedConflicts,
  auditRecords as seedAuditRecords,
} from '../data/seedData';

import type {
  Role,
  Customer,
  Contact,
  Opportunity,
  OpportunityStatus,
  Contract,
  SupportCase,
  Conflict,
  AuditRecord,
  EntityType,
} from '../data/types';

// ============================================================
// Mutable in-memory data stores (cloned from seed)
// ============================================================

let usersData = [...seedUsers];
let customersData = [...seedCustomers.map(c => ({ ...c }))];
let contactsData = [...seedContacts.map(c => ({ ...c }))];
let opportunitiesData = [...seedOpportunities.map(o => ({ ...o }))];
let contractsData = [...seedContracts.map(c => ({ ...c }))];
let supportCasesData = [...seedSupportCases.map(s => ({ ...s }))];
let conflictsData = [...seedConflicts.map(c => ({ ...c }))];
let auditRecordsData = [...seedAuditRecords.map(a => ({ ...a }))];

// Customers with outstanding receivables (finance gate trigger)
const CUSTOMERS_WITH_RECEIVABLES = ['CUS-001', 'CUS-005', 'CUS-010'];

// ============================================================
// Helpers
// ============================================================

const delay = (ms: number = 300): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const checkRbac = (userRole: Role, allowedRoles: Role[]): void => {
  if (!allowedRoles.includes(userRole)) {
    throw { status: 403, message: `Role "${userRole}" is not authorized for this action.` };
  }
};

const now = (): string => new Date().toISOString();

let auditCounter = auditRecordsData.length;
const nextAuditId = (): string => {
  auditCounter += 1;
  return `AUD-${String(auditCounter).padStart(4, '0')}`;
};

let oppCounter = opportunitiesData.length;
const nextOppId = (): string => {
  oppCounter += 1;
  return `OPP-${String(oppCounter).padStart(3, '0')}`;
};

let contractCounter = contractsData.length;
const nextContractId = (): string => {
  contractCounter += 1;
  return `CON-${String(contractCounter).padStart(3, '0')}`;
};

let caseCounter = supportCasesData.length;
const nextCaseId = (): string => {
  caseCounter += 1;
  return `SUP-${String(caseCounter).padStart(3, '0')}`;
};

// ============================================================
// Audit helper (public — used by DecisionContext too)
// ============================================================

export const addAuditRecord = (record: Partial<AuditRecord>): void => {
  const full: AuditRecord = {
    id: nextAuditId(),
    entity_type: record.entity_type ?? 'customer',
    entity_id: record.entity_id ?? '',
    action: record.action ?? 'unknown',
    actor_id: record.actor_id ?? 'SYSTEM',
    actor_name: record.actor_name ?? 'System',
    actor_role: record.actor_role ?? 'Management',
    old_value: record.old_value ?? null,
    new_value: record.new_value ?? null,
    justification: record.justification ?? null,
    created_at: record.created_at ?? now(),
  };
  auditRecordsData.push(full);
};

// ============================================================
// Customers
// ============================================================

export const getCustomers = async (): Promise<Customer[]> => {
  await delay();
  return [...customersData];
};

export const getCustomer = async (id: string): Promise<Customer> => {
  await delay();
  const c = customersData.find(c => c.id === id);
  if (!c) throw { status: 404, message: `Customer ${id} not found` };
  return { ...c };
};

export const updateCustomer = async (
  id: string,
  data: Partial<Customer>,
  currentVersion: number
): Promise<Customer> => {
  await delay();
  const idx = customersData.findIndex(c => c.id === id);
  if (idx === -1) throw { status: 404, message: `Customer ${id} not found` };

  const existing = customersData[idx];
  if (existing.version !== currentVersion) {
    throw {
      status: 409,
      message: `Version conflict: expected ${currentVersion}, server has ${existing.version}. Please reload.`,
    };
  }

  const oldValue = { ...existing };
  const updated: Customer = {
    ...existing,
    ...data,
    id: existing.id,
    version: existing.version + 1,
    updated_at: now(),
  };
  customersData[idx] = updated;

  addAuditRecord({
    entity_type: 'customer',
    entity_id: id,
    action: 'customer.updated',
    old_value: oldValue as unknown as Record<string, unknown>,
    new_value: updated as unknown as Record<string, unknown>,
  });

  return { ...updated };
};

// ============================================================
// Contacts
// ============================================================

export const getContactsByCustomer = async (customerId: string): Promise<Contact[]> => {
  await delay();
  return contactsData.filter(c => c.customer_id === customerId).map(c => ({ ...c }));
};

// ============================================================
// Opportunities
// ============================================================

export const getOpportunities = async (
  filters?: { status?: OpportunityStatus; region?: string }
): Promise<Opportunity[]> => {
  await delay();
  let result = [...opportunitiesData];
  if (filters?.status) result = result.filter(o => o.status === filters.status);
  if (filters?.region) result = result.filter(o => o.region === filters.region);
  return result.map(o => ({ ...o }));
};

export const getOpportunity = async (id: string): Promise<Opportunity> => {
  await delay();
  const o = opportunitiesData.find(o => o.id === id);
  if (!o) throw { status: 404, message: `Opportunity ${id} not found` };
  return { ...o };
};

export const createOpportunity = async (
  data: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>
): Promise<Opportunity> => {
  await delay();
  const opp: Opportunity = {
    ...data,
    id: nextOppId(),
    created_at: now(),
    updated_at: now(),
  };
  opportunitiesData.push(opp);

  addAuditRecord({
    entity_type: 'opportunity',
    entity_id: opp.id,
    action: 'opportunity.created',
    new_value: opp as unknown as Record<string, unknown>,
  });

  return { ...opp };
};

export const transitionOpportunity = async (
  id: string,
  newStatus: OpportunityStatus
): Promise<Opportunity> => {
  await delay();
  const idx = opportunitiesData.findIndex(o => o.id === id);
  if (idx === -1) throw { status: 404, message: `Opportunity ${id} not found` };

  const old = { ...opportunitiesData[idx] };
  opportunitiesData[idx] = {
    ...opportunitiesData[idx],
    status: newStatus,
    updated_at: now(),
  };

  addAuditRecord({
    entity_type: 'opportunity',
    entity_id: id,
    action: `opportunity.status_changed`,
    old_value: { status: old.status } as Record<string, unknown>,
    new_value: { status: newStatus } as Record<string, unknown>,
  });

  return { ...opportunitiesData[idx] };
};

export const closeOpportunity = async (id: string): Promise<Opportunity> => {
  await delay();
  const idx = opportunitiesData.findIndex(o => o.id === id);
  if (idx === -1) throw { status: 404, message: `Opportunity ${id} not found` };

  const opp = opportunitiesData[idx];

  // Finance gate check: if customer has receivables, block to finance_review
  if (CUSTOMERS_WITH_RECEIVABLES.includes(opp.customer_id)) {
    opportunitiesData[idx] = {
      ...opp,
      status: 'finance_review',
      finance_block_status: 'blocked',
      finance_review_entered_at: now(),
      updated_at: now(),
    };

    addAuditRecord({
      entity_type: 'opportunity',
      entity_id: id,
      action: 'opportunity.finance_gate_blocked',
      old_value: { status: opp.status, finance_block_status: opp.finance_block_status } as Record<string, unknown>,
      new_value: { status: 'finance_review', finance_block_status: 'blocked' } as Record<string, unknown>,
      justification: 'Customer has outstanding receivables — routed to finance review.',
    });

    return { ...opportunitiesData[idx] };
  }

  // No receivables — close normally
  opportunitiesData[idx] = {
    ...opp,
    status: 'closed_won',
    updated_at: now(),
  };

  addAuditRecord({
    entity_type: 'opportunity',
    entity_id: id,
    action: 'opportunity.closed_won',
    old_value: { status: opp.status } as Record<string, unknown>,
    new_value: { status: 'closed_won' } as Record<string, unknown>,
  });

  return { ...opportunitiesData[idx] };
};

// ============================================================
// Finance Reviews
// ============================================================

export const getFinanceReviews = async (): Promise<Opportunity[]> => {
  await delay();
  return opportunitiesData
    .filter(o => o.status === 'finance_review')
    .map(o => ({ ...o }));
};

export const financeDecide = async (
  oppId: string,
  decision: 'release' | 'maintain_block',
  justification: string
): Promise<Opportunity> => {
  await delay();
  const idx = opportunitiesData.findIndex(o => o.id === oppId);
  if (idx === -1) throw { status: 404, message: `Opportunity ${oppId} not found` };

  const opp = opportunitiesData[idx];
  if (opp.status !== 'finance_review') {
    throw { status: 400, message: `Opportunity ${oppId} is not in finance_review status.` };
  }

  if (decision === 'release') {
    opportunitiesData[idx] = {
      ...opp,
      status: 'negotiation',
      finance_block_status: 'released',
      updated_at: now(),
    };
  } else {
    opportunitiesData[idx] = {
      ...opp,
      status: 'closed_lost',
      finance_block_status: 'blocked',
      updated_at: now(),
    };
  }

  addAuditRecord({
    entity_type: 'opportunity',
    entity_id: oppId,
    action: `opportunity.finance_decision_${decision}`,
    old_value: { status: opp.status, finance_block_status: opp.finance_block_status } as Record<string, unknown>,
    new_value: {
      status: opportunitiesData[idx].status,
      finance_block_status: opportunitiesData[idx].finance_block_status,
    } as Record<string, unknown>,
    justification,
  });

  return { ...opportunitiesData[idx] };
};

// ============================================================
// Contracts
// ============================================================

export const getContracts = async (
  filters?: { status?: string; customerId?: string }
): Promise<Contract[]> => {
  await delay();
  let result = [...contractsData];
  if (filters?.status) result = result.filter(c => c.status === filters.status);
  if (filters?.customerId) result = result.filter(c => c.customer_id === filters.customerId);
  return result.map(c => ({ ...c }));
};

export const getContract = async (id: string): Promise<Contract> => {
  await delay();
  const c = contractsData.find(c => c.id === id);
  if (!c) throw { status: 404, message: `Contract ${id} not found` };
  return { ...c };
};

export const createContract = async (data: Partial<Contract>): Promise<Contract> => {
  await delay();
  const contract: Contract = {
    id: nextContractId(),
    customer_id: data.customer_id ?? '',
    contract_type: data.contract_type ?? 'master',
    version: 1,
    status: 'draft',
    sla_response_hours: data.sla_response_hours ?? 24,
    sla_resolution_hours: data.sla_resolution_hours ?? 72,
    start_date: data.start_date ?? now().slice(0, 10),
    end_date: data.end_date ?? '',
    terms_description: data.terms_description ?? '',
    region: data.region ?? 'CZ',
    services: data.services ?? '',
    special_conditions: data.special_conditions ?? null,
    approved_by_legal_id: null,
    approved_at: null,
    approval_status: 'pending',
    parent_contract_id: data.parent_contract_id ?? null,
    created_at: now(),
    updated_at: now(),
  };
  contractsData.push(contract);

  addAuditRecord({
    entity_type: 'contract',
    entity_id: contract.id,
    action: 'contract.created',
    new_value: contract as unknown as Record<string, unknown>,
  });

  return { ...contract };
};

export const submitToLegal = async (id: string): Promise<Contract> => {
  await delay();
  const idx = contractsData.findIndex(c => c.id === id);
  if (idx === -1) throw { status: 404, message: `Contract ${id} not found` };

  const old = { ...contractsData[idx] };
  if (old.status !== 'draft') {
    throw { status: 400, message: `Contract ${id} must be in draft status to submit to legal.` };
  }

  contractsData[idx] = { ...old, status: 'pending_legal', updated_at: now() };

  addAuditRecord({
    entity_type: 'contract',
    entity_id: id,
    action: 'contract.submitted_to_legal',
    old_value: { status: old.status } as Record<string, unknown>,
    new_value: { status: 'pending_legal' } as Record<string, unknown>,
  });

  return { ...contractsData[idx] };
};

export const approveContract = async (id: string): Promise<Contract> => {
  await delay();
  const idx = contractsData.findIndex(c => c.id === id);
  if (idx === -1) throw { status: 404, message: `Contract ${id} not found` };

  const old = { ...contractsData[idx] };
  if (old.status !== 'pending_legal') {
    throw { status: 400, message: `Contract ${id} must be in pending_legal status to approve.` };
  }

  contractsData[idx] = {
    ...old,
    status: 'active',
    approval_status: 'approved',
    approved_at: now(),
    updated_at: now(),
  };

  addAuditRecord({
    entity_type: 'contract',
    entity_id: id,
    action: 'contract.approved',
    old_value: { status: old.status, approval_status: old.approval_status } as Record<string, unknown>,
    new_value: { status: 'active', approval_status: 'approved' } as Record<string, unknown>,
  });

  return { ...contractsData[idx] };
};

export const rejectContract = async (id: string): Promise<Contract> => {
  await delay();
  const idx = contractsData.findIndex(c => c.id === id);
  if (idx === -1) throw { status: 404, message: `Contract ${id} not found` };

  const old = { ...contractsData[idx] };
  if (old.status !== 'pending_legal') {
    throw { status: 400, message: `Contract ${id} must be in pending_legal status to reject.` };
  }

  contractsData[idx] = {
    ...old,
    status: 'draft',
    approval_status: 'rejected',
    updated_at: now(),
  };

  addAuditRecord({
    entity_type: 'contract',
    entity_id: id,
    action: 'contract.rejected',
    old_value: { status: old.status, approval_status: old.approval_status } as Record<string, unknown>,
    new_value: { status: 'draft', approval_status: 'rejected' } as Record<string, unknown>,
  });

  return { ...contractsData[idx] };
};

// ============================================================
// Support Cases
// ============================================================

export const getSupportCases = async (
  filters?: { status?: string; customerId?: string }
): Promise<SupportCase[]> => {
  await delay();
  let result = [...supportCasesData];
  if (filters?.status) result = result.filter(s => s.status === filters.status);
  if (filters?.customerId) result = result.filter(s => s.customer_id === filters.customerId);
  return result.map(s => ({ ...s }));
};

export const getSupportCase = async (id: string): Promise<SupportCase> => {
  await delay();
  const s = supportCasesData.find(s => s.id === id);
  if (!s) throw { status: 404, message: `Support case ${id} not found` };
  return { ...s };
};

export const createSupportCase = async (data: Partial<SupportCase>): Promise<SupportCase> => {
  await delay();
  const sc: SupportCase = {
    id: nextCaseId(),
    customer_id: data.customer_id ?? '',
    contract_id: data.contract_id ?? null,
    subject: data.subject ?? '',
    description: data.description ?? '',
    status: 'open',
    priority: data.priority ?? 'medium',
    category: data.category ?? 'general',
    sla_deadline: data.sla_deadline ?? null,
    assigned_agent_id: data.assigned_agent_id ?? null,
    escalation_level: 0,
    contact_person: data.contact_person ?? null,
    created_at: now(),
    updated_at: now(),
  };
  supportCasesData.push(sc);

  addAuditRecord({
    entity_type: 'support_case',
    entity_id: sc.id,
    action: 'support_case.created',
    new_value: sc as unknown as Record<string, unknown>,
  });

  return { ...sc };
};

export const resolveSupportCase = async (id: string): Promise<SupportCase> => {
  await delay();
  const idx = supportCasesData.findIndex(s => s.id === id);
  if (idx === -1) throw { status: 404, message: `Support case ${id} not found` };

  const old = { ...supportCasesData[idx] };
  supportCasesData[idx] = { ...old, status: 'resolved', updated_at: now() };

  addAuditRecord({
    entity_type: 'support_case',
    entity_id: id,
    action: 'support_case.resolved',
    old_value: { status: old.status } as Record<string, unknown>,
    new_value: { status: 'resolved' } as Record<string, unknown>,
  });

  return { ...supportCasesData[idx] };
};

export const escalateSupportCase = async (id: string): Promise<SupportCase> => {
  await delay();
  const idx = supportCasesData.findIndex(s => s.id === id);
  if (idx === -1) throw { status: 404, message: `Support case ${id} not found` };

  const old = { ...supportCasesData[idx] };
  const newLevel = Math.min(old.escalation_level + 1, 3);
  supportCasesData[idx] = {
    ...old,
    status: 'escalated',
    escalation_level: newLevel,
    updated_at: now(),
  };

  addAuditRecord({
    entity_type: 'support_case',
    entity_id: id,
    action: 'support_case.escalated',
    old_value: { status: old.status, escalation_level: old.escalation_level } as Record<string, unknown>,
    new_value: { status: 'escalated', escalation_level: newLevel } as Record<string, unknown>,
  });

  return { ...supportCasesData[idx] };
};

// ============================================================
// Conflicts
// ============================================================

export const getConflicts = async (
  filters?: { status?: string; type?: string }
): Promise<Conflict[]> => {
  await delay();
  let result = [...conflictsData];
  if (filters?.status) result = result.filter(c => c.status === filters.status);
  if (filters?.type) result = result.filter(c => c.type === filters.type);
  return result.map(c => ({ ...c }));
};

export const getConflict = async (id: string): Promise<Conflict> => {
  await delay();
  const c = conflictsData.find(c => c.id === id);
  if (!c) throw { status: 404, message: `Conflict ${id} not found` };
  return { ...c };
};

export const resolveConflict = async (
  id: string,
  decision: string,
  justification: string,
  resolvedBy: string
): Promise<Conflict> => {
  await delay();
  const idx = conflictsData.findIndex(c => c.id === id);
  if (idx === -1) throw { status: 404, message: `Conflict ${id} not found` };

  const old = { ...conflictsData[idx] };
  if (old.status === 'resolved') {
    throw { status: 400, message: `Conflict ${id} is already resolved.` };
  }

  conflictsData[idx] = {
    ...old,
    status: 'resolved',
    resolution_decision: decision,
    resolution_justification: justification,
    resolved_by_id: resolvedBy,
    resolved_at: now(),
  };

  addAuditRecord({
    entity_type: 'conflict',
    entity_id: id,
    action: 'conflict.resolved',
    old_value: { status: old.status } as Record<string, unknown>,
    new_value: {
      status: 'resolved',
      resolution_decision: decision,
      resolved_by_id: resolvedBy,
    } as Record<string, unknown>,
    justification,
  });

  return { ...conflictsData[idx] };
};

export const escalateConflict = async (id: string): Promise<Conflict> => {
  await delay();
  const idx = conflictsData.findIndex(c => c.id === id);
  if (idx === -1) throw { status: 404, message: `Conflict ${id} not found` };

  const old = { ...conflictsData[idx] };
  conflictsData[idx] = { ...old, status: 'escalated_l3' };

  addAuditRecord({
    entity_type: 'conflict',
    entity_id: id,
    action: 'conflict.escalated_l3',
    old_value: { status: old.status } as Record<string, unknown>,
    new_value: { status: 'escalated_l3' } as Record<string, unknown>,
  });

  return { ...conflictsData[idx] };
};

// ============================================================
// Audit Records
// ============================================================

export const getAuditRecords = async (
  filters?: { entityType?: EntityType; entityId?: string; dateFrom?: string; dateTo?: string }
): Promise<AuditRecord[]> => {
  await delay();
  let result = [...auditRecordsData];
  if (filters?.entityType) result = result.filter(a => a.entity_type === filters.entityType);
  if (filters?.entityId) result = result.filter(a => a.entity_id === filters.entityId);
  if (filters?.dateFrom) result = result.filter(a => a.created_at >= filters.dateFrom!);
  if (filters?.dateTo) result = result.filter(a => a.created_at <= filters.dateTo!);
  return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const exportAuditCsv = async (
  filters?: { entityType?: EntityType; entityId?: string; dateFrom?: string; dateTo?: string }
): Promise<string> => {
  const records = await getAuditRecords(filters);

  const header = 'id,entity_type,entity_id,action,actor_id,actor_name,actor_role,justification,created_at';
  const rows = records.map(r =>
    [
      r.id,
      r.entity_type,
      r.entity_id,
      r.action,
      r.actor_id,
      `"${r.actor_name}"`,
      r.actor_role,
      r.justification ? `"${r.justification.replace(/"/g, '""')}"` : '',
      r.created_at,
    ].join(',')
  );

  return [header, ...rows].join('\n');
};

// ============================================================
// RBAC helper (exported for screens to use before calling)
// ============================================================

export { checkRbac };

// ============================================================
// Data accessors (for DecisionContext and other contexts)
// ============================================================

export const getUsers = () => [...usersData];
export const getUserById = (id: string) => usersData.find(u => u.id === id) ?? null;
