// ============================================================
// EnterpriseCRM — DecisionContext
// Phase D2: Decision Layer Level 2
// Runtime decision log, strategies, pattern detection,
// change protocol export
// ============================================================

import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecisionVariant {
  id: string;
  label: string;
  description: string;
  recommended: boolean;
  impact: string;
  risk: string;
}

export interface DecisionStrategy {
  kcsId: string;
  name: string;
  resolutionType: string;
  escalationPath: string[];
  escalationSlaMinutes: number | null;
  fallbackIfTimeout: string;
  guardingInvariant: string;
  transientState: string;
  auditRequired: boolean;
  variants: DecisionVariant[];
}

export interface DecisionRecord {
  id: string; // DR-001, DR-002...
  conflictId: string;
  conflictType: string;
  kcsId: string;
  escalationLevel: string;
  situation: string;
  chosenVariant: string;
  chosenVariantLabel: string;
  decidedBy: string;
  justification: string;
  timestamp: string;
  guardrailCheck: 'passed' | 'blocked';
}

export interface PatternEntry {
  key: string; // e.g. "deal_vs_finance:release"
  conflictType: string;
  variant: string;
  count: number;
  isChangeCandidate: boolean; // count >= 3
  suggestedChange: string;
}

export interface ChangeProtocol {
  version: string;
  context: {
    problem: string;
    frequency: number;
    trigger: string;
    actors: string[];
  };
  proposal: {
    variants: string[];
    recommendation: string;
  };
  impact: {
    scope: string;
    risk: string;
  };
  trace: {
    decisionRecords: string[];
    kcsId: string;
  };
  confidence: 'low' | 'medium' | 'high';
}

// ---------------------------------------------------------------------------
// Hardcoded Decision Strategies (KCS-01 through KCS-08)
// Based on PA MACHINE_DATA
// ---------------------------------------------------------------------------

export const DECISION_STRATEGIES: DecisionStrategy[] = [
  {
    kcsId: 'KCS-01',
    name: 'Preventive Guard — Duplicitni zakaznik',
    resolutionType: 'preventive_guard',
    escalationPath: [],
    escalationSlaMinutes: null,
    fallbackIfTimeout: 'Draft ulozen + Conflict vytvoren',
    guardingInvariant: 'Zakaznik se stejnym VAT ID nesmi existovat duplicitne',
    transientState: 'merge_required',
    auditRequired: true,
    variants: [
      {
        id: 'kcs01-merge',
        label: 'Sloucit zaznamy',
        description: 'Slouci duplicitni zaznamy do jednoho zakaznika. Kontakty a historie budou zachovany.',
        recommended: true,
        impact: 'Sjednoceni dat, zachovani historie',
        risk: 'Nizke — automaticka migrace kontaktu',
      },
      {
        id: 'kcs01-keep-separate',
        label: 'Ponechat oddelene',
        description: 'Oba zaznamy zustanou — vyzaduje rucni oznaceni duvodu.',
        recommended: false,
        impact: 'Mozna datova nekonzistence',
        risk: 'Stredni — riziko duplicitnich obchodu',
      },
      {
        id: 'kcs01-archive-older',
        label: 'Archivovat starsi zaznam',
        description: 'Starsi zaznam bude preveden do stavu inactive. Novejsi zaznam bude primarni.',
        recommended: false,
        impact: 'Ztrata historickych dat',
        risk: 'Stredni — historie starsiho zaznamu nebude dostupna',
      },
    ],
  },
  {
    kcsId: 'KCS-02',
    name: 'Finance Gate — Schvaleni obchodu',
    resolutionType: 'manual_escalation',
    escalationPath: ['Finance Manager', 'VP Finance'],
    escalationSlaMinutes: 240,
    fallbackIfTimeout: 'Eskalace FM -> VP, po 72h notifikace managementu',
    guardingInvariant: 'Obchod > 100k EUR musi mit finance approval',
    transientState: 'finance_review',
    auditRequired: true,
    variants: [
      {
        id: 'kcs02-approve',
        label: 'Schvalit obchod',
        description: 'Finance gate schvalen — obchod pokracuje v pipeline.',
        recommended: false,
        impact: 'Obchod postoupi do dalsi faze',
        risk: 'Nizke — standardni postup',
      },
      {
        id: 'kcs02-reject',
        label: 'Zamítnout obchod',
        description: 'Finance gate zamitnut — obchod bude vracen ke kvalifikaci.',
        recommended: false,
        impact: 'Obchod se vraci k prepracovani',
        risk: 'Stredni — mozna ztrata obchodu',
      },
      {
        id: 'kcs02-conditional',
        label: 'Podmínecne schvalit',
        description: 'Schvaleni s podminkami — vyzaduje splneni dalsich kriterii pred uzavrenim.',
        recommended: true,
        impact: 'Obchod pokracuje s omezenimi',
        risk: 'Nizke — zachovava kontrolu',
      },
    ],
  },
  {
    kcsId: 'KCS-03',
    name: 'Smlouva — Pravni schvaleni',
    resolutionType: 'manual_escalation',
    escalationPath: ['Legal Team', 'Chief Legal Officer'],
    escalationSlaMinutes: 2880,
    fallbackIfTimeout: 'Po 7 dnech automaticke zamitnuti',
    guardingInvariant: 'Smlouva musi byt schvalena pravnim pred aktivaci',
    transientState: 'pending_legal',
    auditRequired: true,
    variants: [
      {
        id: 'kcs03-approve',
        label: 'Schvalit smlouvu',
        description: 'Smlouva je v souladu s pravnimi pozadavky a muze byt aktivovana.',
        recommended: true,
        impact: 'Smlouva prejde do stavu active',
        risk: 'Nizke — standardni postup',
      },
      {
        id: 'kcs03-reject',
        label: 'Zamítnout smlouvu',
        description: 'Smlouva nesplnuje pravni pozadavky. Vyzaduje prepracovani.',
        recommended: false,
        impact: 'Smlouva se vraci do draft stavu',
        risk: 'Stredni — zpozdeni dodavky',
      },
      {
        id: 'kcs03-amend',
        label: 'Pozadovat upravu',
        description: 'Smlouva vyzaduje drobne upravy pred schvalenim.',
        recommended: false,
        impact: 'Smlouva se vraci k uprave s konkretnimi pozadavky',
        risk: 'Nizke — kratke zpozdeni',
      },
    ],
  },
  {
    kcsId: 'KCS-04',
    name: 'Smlouva — Zmena podmínek',
    resolutionType: 'manual_escalation',
    escalationPath: ['Account Manager', 'Legal Team'],
    escalationSlaMinutes: 480,
    fallbackIfTimeout: 'Po 48h plati smlouva v puvodni verzi',
    guardingInvariant: 'Zmena SLA podminek vyzaduje souhlas obou stran',
    transientState: 'amendment_pending',
    auditRequired: true,
    variants: [
      {
        id: 'kcs04-accept-change',
        label: 'Prijmout zmenu',
        description: 'Zmena podminek je akceptovana — novy amendment bude vytvoren.',
        recommended: true,
        impact: 'Nova verze smlouvy s upravenymi podminkami',
        risk: 'Nizke — oboustranny souhlas',
      },
      {
        id: 'kcs04-reject-change',
        label: 'Odmitnout zmenu',
        description: 'Zmena je odmitnuta — puvodni podminky zustavaji v platnosti.',
        recommended: false,
        impact: 'Smlouva zustava beze zmeny',
        risk: 'Stredni — nespokojenost klienta',
      },
    ],
  },
  {
    kcsId: 'KCS-05',
    name: 'SLA vyjímka',
    resolutionType: 'manual_escalation',
    escalationPath: ['Support Manager', 'Regional Director'],
    escalationSlaMinutes: 2880,
    fallbackIfTimeout: 'Po 48h vyjimka zamitnuta',
    guardingInvariant: 'SLA vyjimka musi byt schvalena managerem',
    transientState: 'sla_exception_pending',
    auditRequired: true,
    variants: [
      {
        id: 'kcs05-grant-exception',
        label: 'Udelit vyjimku',
        description: 'SLA vyjimka je schvalena — case dostane prodlouzeny deadline.',
        recommended: false,
        impact: 'Prodlouzeni SLA deadline',
        risk: 'Stredni — precedent pro dalsi pripady',
      },
      {
        id: 'kcs05-deny-exception',
        label: 'Zamítnout vyjimku',
        description: 'SLA vyjimka je zamitnuta — puvodni SLA deadline zustava.',
        recommended: true,
        impact: 'SLA zustava beze zmeny, eskalace pokracuje',
        risk: 'Nizke — zachovani standardu',
      },
      {
        id: 'kcs05-partial-extension',
        label: 'Castecne prodlouzeni',
        description: 'SLA deadline prodlouzen o 50% puvodniho casu.',
        recommended: false,
        impact: 'Kompromis mezi standardem a vyjimkou',
        risk: 'Nizke — omezeny dopad',
      },
    ],
  },
  {
    kcsId: 'KCS-06',
    name: 'Korekcni zaznam — Oprava dat',
    resolutionType: 'correction_record',
    escalationPath: [],
    escalationSlaMinutes: null,
    fallbackIfTimeout: 'Korekcni zaznam (append-only)',
    guardingInvariant: 'Oprava dat je append-only, puvodni hodnota musi byt zachovana',
    transientState: 'correction_pending',
    auditRequired: true,
    variants: [
      {
        id: 'kcs06-apply-correction',
        label: 'Aplikovat opravu',
        description: 'Korekcni zaznam bude pridan. Puvodni data zustanou v historii.',
        recommended: true,
        impact: 'Data budou opravena, plny audit trail',
        risk: 'Nizke — append-only princip',
      },
      {
        id: 'kcs06-reject-correction',
        label: 'Zamítnout opravu',
        description: 'Oprava je zamitnuta — soucasna data zustavaji v platnosti.',
        recommended: false,
        impact: 'Zadna zmena dat',
        risk: 'Stredni — potencialne nekorektni data zustavaji',
      },
    ],
  },
  {
    kcsId: 'KCS-07',
    name: 'Automaticky retry — Systemovy konflikt',
    resolutionType: 'automatic',
    escalationPath: [],
    escalationSlaMinutes: null,
    fallbackIfTimeout: 'Retry 3x -> Conflict system_failure',
    guardingInvariant: 'Systemove konflikty se pokusi vyresit automaticky',
    transientState: 'retrying',
    auditRequired: true,
    variants: [
      {
        id: 'kcs07-retry',
        label: 'Opakovat operaci',
        description: 'System se pokusi o automaticky retry operace (max 3 pokusy).',
        recommended: true,
        impact: 'Automaticke reseni bez zasahu uzivatele',
        risk: 'Nizke — omezeny pocet pokusu',
      },
      {
        id: 'kcs07-manual-override',
        label: 'Manualni zasah',
        description: 'Preskocit automaticky retry a resit manualne.',
        recommended: false,
        impact: 'Vyzaduje zasah technickeho tymu',
        risk: 'Stredni — delsi doba reseni',
      },
    ],
  },
  {
    kcsId: 'KCS-08',
    name: 'Varovani — Konflikt lokalni vs. globalni',
    resolutionType: 'manual_escalation',
    escalationPath: ['Regional Director', 'Management'],
    escalationSlaMinutes: 0,
    fallbackIfTimeout: 'WarningBanner + manualni rozhodnuti',
    guardingInvariant: 'Lokalni vs. globalni politika musi byt rozhodnuta managementem',
    transientState: 'awaiting_decision',
    auditRequired: true,
    variants: [
      {
        id: 'kcs08-follow-global',
        label: 'Dodrzet globalni politiku',
        description: 'Uplatnit globalni firemni politiku — lokalni vyjimka nebude udelena.',
        recommended: true,
        impact: 'Konzistence napric regiony',
        risk: 'Stredni — lokalni tym muze byt nespokojen',
      },
      {
        id: 'kcs08-grant-local-exception',
        label: 'Udelit lokalni vyjimku',
        description: 'Povolit odchylku od globalni politiky pro tento region/pripad.',
        recommended: false,
        impact: 'Lokalni flexibilita, ale precedent',
        risk: 'Vysoke — precedent pro dalsi regiony',
      },
      {
        id: 'kcs08-escalate-board',
        label: 'Eskalovat na board',
        description: 'Rozhodnuti presahuje pravomoci regional directora — eskalovat na vedeni.',
        recommended: false,
        impact: 'Rozhodnuti bude na urovni vedeni spolecnosti',
        risk: 'Nizke — ale delsi cas na rozhodnuti',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Conflict type to KCS mapping
// ---------------------------------------------------------------------------

const CONFLICT_TYPE_TO_KCS: Record<string, string> = {
  data_ownership: 'KCS-01',
  deal_vs_finance: 'KCS-02',
  local_vs_global: 'KCS-08',
  verbal_vs_written: 'KCS-04',
  sla_exception: 'KCS-05',
};

// ---------------------------------------------------------------------------
// Pre-seeded Decision Records (for demo / presentation)
// Based on resolved conflicts from seed data (CNF-002, CNF-004, CNF-006,
// CNF-008, CNF-010) + additional records to demonstrate pattern detection
// ---------------------------------------------------------------------------

const SEED_DECISION_RECORDS: DecisionRecord[] = [
  // --- Resolved conflicts from seed data ---
  {
    id: 'DR-001',
    conflictId: 'CNF-002',
    conflictType: 'data_ownership',
    kcsId: 'KCS-01',
    escalationLevel: 'L2 — Management',
    situation: 'Zakaznik Prager Industrie registrovan v CZ i DE — spor o vlastnictvi uctu mezi CZ a DE tymem.',
    chosenVariant: 'kcs01-merge',
    chosenVariantLabel: 'Sloucit zaznamy',
    decidedBy: 'Tomas Cerny (Management)',
    justification: 'Zakaznik registrovan v CZ, primarni kontakt Praha. DE tym bude sekundarnim spravcem.',
    timestamp: '2026-02-15T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-002',
    conflictId: 'CNF-004',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L2 — Finance Controller',
    situation: 'Opportunity OPP-008 (Bohemia Tech, 1.8M EUR) blokovana finance gate — zakaznik ma otevrenou pohledavku 45k EUR.',
    chosenVariant: 'kcs02-conditional',
    chosenVariantLabel: 'Podmínecne schvalit',
    decidedBy: 'Karel Dvorak (Finance Controller)',
    justification: 'Strategicky vyznam zakaznika opravnuje kompromis. Podmineno uhrazenim pohledavky do 30 dnu.',
    timestamp: '2026-02-28T16:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-003',
    conflictId: 'CNF-006',
    conflictType: 'local_vs_global',
    kcsId: 'KCS-08',
    escalationLevel: 'L2 — Regional Director',
    situation: 'AT region pozaduje odlisne compliance prilohy ke smlouve — odchylka od globalni smluvni sablony.',
    chosenVariant: 'kcs08-grant-local-exception',
    chosenVariantLabel: 'Udelit lokalni vyjimku',
    decidedBy: 'Anna Kralova (Regional Director)',
    justification: 'AT pozadavky legitimni (GDPR specifika), neovlivnuji globalni smlouvu. Vyjimka s casovym omezenim 12 mesicu.',
    timestamp: '2026-01-25T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-004',
    conflictId: 'CNF-008',
    conflictType: 'verbal_vs_written',
    kcsId: 'KCS-04',
    escalationLevel: 'L2 — Account Manager',
    situation: 'Zakaznik Krakow Steel tvrdi, ze Sales slibil 2 bezplatne servisni navstevy rocne — ve smlouve neni.',
    chosenVariant: 'kcs04-accept-change',
    chosenVariantLabel: 'Prijmout zmenu',
    decidedBy: 'Martin Vesely (Legal/Compliance)',
    justification: 'Ustni dohoda neprukazna, ale kompromis chrani vztah. Reseni: 1x zdarma + 1x sleva 50%.',
    timestamp: '2026-02-05T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-005',
    conflictId: 'CNF-010',
    conflictType: 'sla_exception',
    kcsId: 'KCS-05',
    escalationLevel: 'L2 — Support Manager',
    situation: 'Gdansk Shipping pozaduje SLA vyjimku pro infrastrukturni incidenty — standardni SLA 4h je nedostatecne pro HW problemy.',
    chosenVariant: 'kcs05-grant-exception',
    chosenVariantLabel: 'Udelit vyjimku',
    decidedBy: 'Karel Dvorak (Finance Controller)',
    justification: 'Opodstatnena vyjimka pro kategorii infrastrukturnich incidentu. SLA prodlouzeno na 8h pro HW.',
    timestamp: '2026-02-15T10:00:00Z',
    guardrailCheck: 'passed',
  },

  // --- Additional records for pattern detection (Level 2) ---
  // 3x deal_vs_finance:kcs02-conditional → triggers change candidate threshold
  {
    id: 'DR-006',
    conflictId: 'CNF-HIST-001',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L2 — Finance Controller',
    situation: 'Opportunity pro Dresden Elektronik (750k EUR) — pohledavka 22k EUR.',
    chosenVariant: 'kcs02-conditional',
    chosenVariantLabel: 'Podmínecne schvalit',
    decidedBy: 'Karel Dvorak (Finance Controller)',
    justification: 'Pohledavka mala vzhledem k hodnote dealu. Podmineno uhrazenim do 14 dnu.',
    timestamp: '2026-01-20T10:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-007',
    conflictId: 'CNF-HIST-002',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L2 — Finance Controller',
    situation: 'Opportunity pro Berlin Automotive (2.1M EUR) — pohledavka 85k EUR po splatnosti.',
    chosenVariant: 'kcs02-conditional',
    chosenVariantLabel: 'Podmínecne schvalit',
    decidedBy: 'Karel Dvorak (Finance Controller)',
    justification: 'Automotive segment strategicky — podmineno splatkovym kalendarem.',
    timestamp: '2026-02-10T09:00:00Z',
    guardrailCheck: 'passed',
  },
  // 3x sla_exception:kcs05-grant-exception → another change candidate
  {
    id: 'DR-008',
    conflictId: 'CNF-HIST-003',
    conflictType: 'sla_exception',
    kcsId: 'KCS-05',
    escalationLevel: 'L2 — Support Manager',
    situation: 'Skoda Machinery pozaduje SLA vyjimku pro planovane odstavky.',
    chosenVariant: 'kcs05-grant-exception',
    chosenVariantLabel: 'Udelit vyjimku',
    decidedBy: 'Eva Prochazkova (Support Agent)',
    justification: 'Planovane odstavky jsou legitimni duvod pro casovou vyjimku.',
    timestamp: '2026-01-10T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-009',
    conflictId: 'CNF-HIST-004',
    conflictType: 'sla_exception',
    kcsId: 'KCS-05',
    escalationLevel: 'L2 — Support Manager',
    situation: 'Wiener Logistik — SLA vyjimka pro migraci na novy system.',
    chosenVariant: 'kcs05-grant-exception',
    chosenVariantLabel: 'Udelit vyjimku',
    decidedBy: 'Eva Prochazkova (Support Agent)',
    justification: 'Migrace potrvá 2 týdny, docasne prodlouzeni SLA opodstatnene.',
    timestamp: '2026-01-28T11:00:00Z',
    guardrailCheck: 'passed',
  },
  // 2x deal_vs_finance:kcs02-approve (below threshold, no change candidate)
  {
    id: 'DR-010',
    conflictId: 'CNF-HIST-005',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L1 — Finance Controller',
    situation: 'Opportunity pro Moravska Strojirna (320k EUR) — zadne pohledavky.',
    chosenVariant: 'kcs02-approve',
    chosenVariantLabel: 'Schvalit obchod',
    decidedBy: 'Karel Dvorak (Finance Controller)',
    justification: 'Zakaznik bez pohledavek, standardni schvaleni.',
    timestamp: '2026-03-01T09:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-011',
    conflictId: 'CNF-HIST-006',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L1 — Finance Controller',
    situation: 'Opportunity pro Salzburg Pharma (480k EUR) — pohledavka uhrazena pred schvalenim.',
    chosenVariant: 'kcs02-approve',
    chosenVariantLabel: 'Schvalit obchod',
    decidedBy: 'Karel Dvorak (Finance Controller)',
    justification: 'Pohledavka uhrazena vcera, schvaleni bez podminek.',
    timestamp: '2026-03-05T14:00:00Z',
    guardrailCheck: 'passed',
  },
  // 1x verbal_vs_written:kcs04-reject-change
  {
    id: 'DR-012',
    conflictId: 'CNF-HIST-007',
    conflictType: 'verbal_vs_written',
    kcsId: 'KCS-04',
    escalationLevel: 'L2 — Account Manager',
    situation: 'Warsaw Digital tvrdi, ze Sales slibil rozsireny support — neni ve smlouve.',
    chosenVariant: 'kcs04-reject-change',
    chosenVariantLabel: 'Odmitnout zmenu',
    decidedBy: 'Jan Novak (Account Manager)',
    justification: 'Zadny dukaz o ustnim prislibu. Plati podminky dle smlouvy CTR-013.',
    timestamp: '2026-03-08T10:00:00Z',
    guardrailCheck: 'passed',
  },
  // 1x guardrail blocked attempt (demo of guardrail)
  {
    id: 'DR-013',
    conflictId: 'CNF-002',
    conflictType: 'data_ownership',
    kcsId: 'KCS-01',
    escalationLevel: 'L2 — Management',
    situation: 'Pokus o opetovne rozhodnuti CNF-002 (jiz vyreseno).',
    chosenVariant: 'kcs01-keep-separate',
    chosenVariantLabel: 'Ponechat oddelene',
    decidedBy: 'Hans Mueller (Sales)',
    justification: 'DE tym nesouhlasi s predchozim rozhodnutim.',
    timestamp: '2026-02-16T09:00:00Z',
    guardrailCheck: 'blocked',
  },
];

// ---------------------------------------------------------------------------
// Suggested change messages for pattern detection
// ---------------------------------------------------------------------------

const SUGGESTED_CHANGES: Record<string, string> = {
  'kcs02-approve': 'Automatizovat schvaleni — presunout z L2 na L1 pro standardni obchody',
  'kcs02-reject': 'Zavest preventivni guard — blokovat nekvalifikovane obchody pred finance gate',
  'kcs02-conditional': 'Standardizovat podminky — vytvorit sablonu podminenych schvaleni',
  'kcs03-approve': 'Automatizovat pravni schvaleni pro standardni smlouvy',
  'kcs03-reject': 'Zavest predchozi pravni review — snizit pocet zamitnuti',
  'kcs03-amend': 'Standardizovat smluvni sablony — snizit pocet uprav',
  'kcs04-accept-change': 'Automatizovat prijimani zmen pod urcitou hodnotou',
  'kcs04-reject-change': 'Zavest jasnejsi pravidla pro akceptovatelne zmeny',
  'kcs05-grant-exception': 'Revidovat SLA parametry — prilis mnoho vyjimek',
  'kcs05-deny-exception': 'SLA standardy jsou adekvátní — zadna zmena',
  'kcs05-partial-extension': 'Formalizovat castecne prodlouzeni jako standardni postup',
  'kcs01-merge': 'Automatizovat slucovani — presunout z L2 na L1',
  'kcs01-keep-separate': 'Revidovat pravidla duplicity — prilis mnoho pripadu',
  'kcs01-archive-older': 'Zavest automatickou archivaci zastaralych zaznamu',
  'kcs06-apply-correction': 'Automatizovat korekce — presunout z L2 na L1',
  'kcs06-reject-correction': 'Zprisnit validaci dat pri vstupu',
  'kcs07-retry': 'Automaticky retry funguje — zachovat',
  'kcs07-manual-override': 'Zlepsit automaticky retry mechanismus',
  'kcs08-follow-global': 'Globalni politika funguje — zadna zmena',
  'kcs08-grant-local-exception': 'Formalizovat regionalni vyjimky do politiky',
  'kcs08-escalate-board': 'Delegovat vice pravomoci na regional directors',
};

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface DecisionContextValue {
  // Core decision log
  decisions: DecisionRecord[];
  addDecision: (record: Omit<DecisionRecord, 'id' | 'timestamp' | 'guardrailCheck'>) => DecisionRecord | null;

  // Strategy lookup
  strategies: DecisionStrategy[];
  getStrategyForConflictType: (conflictType: string) => DecisionStrategy | undefined;
  getStrategyByKcsId: (kcsId: string) => DecisionStrategy | undefined;

  // Guardrails
  canResolve: (conflictId: string) => boolean;
  resolvedConflictIds: Set<string>;

  // Level 2 — Pattern detection
  patterns: Map<string, number>;
  getPatterns: () => PatternEntry[];
  getChangeCandidates: () => PatternEntry[];
  exportChangeProtocol: (patternKey: string) => ChangeProtocol | null;
}

const DecisionContext = createContext<DecisionContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface DecisionProviderProps {
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers — compute initial state from seed records
// ---------------------------------------------------------------------------

function buildInitialResolvedIds(records: DecisionRecord[]): Set<string> {
  const ids = new Set<string>();
  for (const r of records) {
    if (r.guardrailCheck === 'passed') ids.add(r.conflictId);
  }
  return ids;
}

function buildInitialPatterns(records: DecisionRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of records) {
    if (r.guardrailCheck !== 'passed') continue;
    const key = `${r.conflictType}:${r.chosenVariant}`;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

export const DecisionProvider: React.FC<DecisionProviderProps> = ({ children }) => {
  const [decisions, setDecisions] = useState<DecisionRecord[]>(SEED_DECISION_RECORDS);
  const [resolvedConflictIds, setResolvedConflictIds] = useState<Set<string>>(
    () => buildInitialResolvedIds(SEED_DECISION_RECORDS),
  );
  const [patterns, setPatterns] = useState<Map<string, number>>(
    () => buildInitialPatterns(SEED_DECISION_RECORDS),
  );
  const counterRef = useRef(SEED_DECISION_RECORDS.length);

  // --- Strategy lookup ---

  const getStrategyByKcsId = useCallback(
    (kcsId: string): DecisionStrategy | undefined =>
      DECISION_STRATEGIES.find((s) => s.kcsId === kcsId),
    [],
  );

  const getStrategyForConflictType = useCallback(
    (conflictType: string): DecisionStrategy | undefined => {
      const kcsId = CONFLICT_TYPE_TO_KCS[conflictType];
      if (!kcsId) return undefined;
      return getStrategyByKcsId(kcsId);
    },
    [getStrategyByKcsId],
  );

  // --- Guardrail check ---

  const canResolve = useCallback(
    (conflictId: string): boolean => !resolvedConflictIds.has(conflictId),
    [resolvedConflictIds],
  );

  // --- Add decision ---

  const addDecision = useCallback(
    (
      record: Omit<DecisionRecord, 'id' | 'timestamp' | 'guardrailCheck'>,
    ): DecisionRecord | null => {
      // Guardrail: block re-resolution
      if (resolvedConflictIds.has(record.conflictId)) {
        // Create a blocked record for audit
        counterRef.current += 1;
        const blockedRecord: DecisionRecord = {
          ...record,
          id: `DR-${String(counterRef.current).padStart(3, '0')}`,
          timestamp: new Date().toISOString(),
          guardrailCheck: 'blocked',
        };
        setDecisions((prev) => [...prev, blockedRecord]);
        return blockedRecord;
      }

      counterRef.current += 1;
      const newRecord: DecisionRecord = {
        ...record,
        id: `DR-${String(counterRef.current).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        guardrailCheck: 'passed',
      };

      setDecisions((prev) => [...prev, newRecord]);
      setResolvedConflictIds((prev) => new Set(prev).add(record.conflictId));

      // Update pattern counts
      const patternKey = `${record.conflictType}:${record.chosenVariant}`;
      setPatterns((prev) => {
        const next = new Map(prev);
        next.set(patternKey, (next.get(patternKey) ?? 0) + 1);
        return next;
      });

      return newRecord;
    },
    [resolvedConflictIds],
  );

  // --- Pattern detection (Level 2) ---

  const getPatterns = useCallback((): PatternEntry[] => {
    const entries: PatternEntry[] = [];
    patterns.forEach((count, key) => {
      const [conflictType, variant] = key.split(':');
      entries.push({
        key,
        conflictType,
        variant,
        count,
        isChangeCandidate: count >= 3,
        suggestedChange:
          SUGGESTED_CHANGES[variant] ??
          `Analyzovat opakujici se rozhodnuti typu ${conflictType}`,
      });
    });
    return entries.sort((a, b) => b.count - a.count);
  }, [patterns]);

  const getChangeCandidates = useCallback((): PatternEntry[] => {
    return getPatterns().filter((p) => p.isChangeCandidate);
  }, [getPatterns]);

  // --- Change Protocol export (Level 2) ---

  const exportChangeProtocol = useCallback(
    (patternKey: string): ChangeProtocol | null => {
      const count = patterns.get(patternKey);
      if (!count) return null;

      const [conflictType, variant] = patternKey.split(':');
      const kcsId = CONFLICT_TYPE_TO_KCS[conflictType] ?? 'unknown';
      const strategy = getStrategyByKcsId(kcsId);

      // Find all decision records matching this pattern
      const matchingRecords = decisions.filter(
        (d) =>
          d.conflictType === conflictType &&
          d.chosenVariant === variant &&
          d.guardrailCheck === 'passed',
      );

      const actors = [...new Set(matchingRecords.map((r) => r.decidedBy))];
      const allVariants = strategy?.variants.map((v) => v.label) ?? [];

      let confidence: 'low' | 'medium' | 'high' = 'low';
      if (count >= 5) confidence = 'high';
      else if (count >= 3) confidence = 'medium';

      return {
        version: '1.0',
        context: {
          problem: `Opakujici se rozhodnuti typu "${conflictType}" s variantou "${variant}" (${count}x)`,
          frequency: count,
          trigger: strategy?.guardingInvariant ?? 'Neznamy trigger',
          actors,
        },
        proposal: {
          variants: allVariants,
          recommendation:
            SUGGESTED_CHANGES[variant] ??
            `Analyzovat a automatizovat rozhodnuti typu ${conflictType}`,
        },
        impact: {
          scope: `Vsechny konflikty typu ${conflictType} v systemu`,
          risk: count >= 5
            ? 'Nizke — dostatek dat pro automatizaci'
            : 'Stredni — doporuceno dalsi sledovani',
        },
        trace: {
          decisionRecords: matchingRecords.map((r) => r.id),
          kcsId,
        },
        confidence,
      };
    },
    [patterns, decisions, getStrategyByKcsId],
  );

  // --- Context value ---

  const value = useMemo<DecisionContextValue>(
    () => ({
      decisions,
      addDecision,
      strategies: DECISION_STRATEGIES,
      getStrategyForConflictType,
      getStrategyByKcsId,
      canResolve,
      resolvedConflictIds,
      patterns,
      getPatterns,
      getChangeCandidates,
      exportChangeProtocol,
    }),
    [
      decisions,
      addDecision,
      getStrategyForConflictType,
      getStrategyByKcsId,
      canResolve,
      resolvedConflictIds,
      patterns,
      getPatterns,
      getChangeCandidates,
      exportChangeProtocol,
    ],
  );

  return (
    <DecisionContext.Provider value={value}>{children}</DecisionContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDecision(): DecisionContextValue {
  const context = useContext(DecisionContext);
  if (!context) {
    throw new Error('useDecision must be used within a DecisionProvider');
  }
  return context;
}

export default DecisionContext;
