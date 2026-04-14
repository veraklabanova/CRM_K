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
    name: 'Preventive Guard — Duplicitní zákazník',
    resolutionType: 'preventive_guard',
    escalationPath: [],
    escalationSlaMinutes: null,
    fallbackIfTimeout: 'Draft uložen + Conflict vytvořen',
    guardingInvariant: 'Zákazník se stejným VAT ID nesmí existovat duplicitně',
    transientState: 'merge_required',
    auditRequired: true,
    variants: [
      {
        id: 'kcs01-merge',
        label: 'Sloučit záznamy',
        description: 'Sloučí duplicitní záznamy do jednoho zákazníka. Kontakty a historie budou zachovány.',
        recommended: true,
        impact: 'Sjednocení dat, zachování historie',
        risk: 'Nízké — automatická migrace kontaktů',
      },
      {
        id: 'kcs01-keep-separate',
        label: 'Ponechat oddělené',
        description: 'Oba záznamy zůstanou — vyžaduje ruční označení důvodu.',
        recommended: false,
        impact: 'Možná datová nekonzistence',
        risk: 'Střední — riziko duplicitních obchodů',
      },
      {
        id: 'kcs01-archive-older',
        label: 'Archivovat starší záznam',
        description: 'Starší záznam bude převeden do stavu inactive. Novější záznam bude primární.',
        recommended: false,
        impact: 'Ztráta historických dat',
        risk: 'Střední — historie staršího záznamu nebude dostupná',
      },
    ],
  },
  {
    kcsId: 'KCS-02',
    name: 'Finance Gate — Schválení obchodu',
    resolutionType: 'manual_escalation',
    escalationPath: ['Finance Manager', 'VP Finance'],
    escalationSlaMinutes: 240,
    fallbackIfTimeout: 'Eskalace FM -> VP, po 72h notifikace managementu',
    guardingInvariant: 'Obchod > 100k EUR musí mít finance approval',
    transientState: 'finance_review',
    auditRequired: true,
    variants: [
      {
        id: 'kcs02-approve',
        label: 'Schválit obchod',
        description: 'Finance gate schválen — obchod pokračuje v pipeline.',
        recommended: false,
        impact: 'Obchod postoupí do další fáze',
        risk: 'Nízké — standardní postup',
      },
      {
        id: 'kcs02-reject',
        label: 'Zamítnout obchod',
        description: 'Finance gate zamítnut — obchod bude vrácen ke kvalifikaci.',
        recommended: false,
        impact: 'Obchod se vrací k přepracování',
        risk: 'Střední — možná ztráta obchodu',
      },
      {
        id: 'kcs02-conditional',
        label: 'Podmíněně schválit',
        description: 'Schválení s podmínkami — vyžaduje splnění dalších kritérií před uzavřením.',
        recommended: true,
        impact: 'Obchod pokračuje s omezeními',
        risk: 'Nízké — zachovává kontrolu',
      },
    ],
  },
  {
    kcsId: 'KCS-03',
    name: 'Smlouva — Právní schválení',
    resolutionType: 'manual_escalation',
    escalationPath: ['Legal Team', 'Chief Legal Officer'],
    escalationSlaMinutes: 2880,
    fallbackIfTimeout: 'Po 7 dnech automatické zamítnutí',
    guardingInvariant: 'Smlouva musí být schválena právním před aktivací',
    transientState: 'pending_legal',
    auditRequired: true,
    variants: [
      {
        id: 'kcs03-approve',
        label: 'Schválit smlouvu',
        description: 'Smlouva je v souladu s právními požadavky a může být aktivována.',
        recommended: true,
        impact: 'Smlouva přejde do stavu active',
        risk: 'Nízké — standardní postup',
      },
      {
        id: 'kcs03-reject',
        label: 'Zamítnout smlouvu',
        description: 'Smlouva nesplňuje právní požadavky. Vyžaduje přepracování.',
        recommended: false,
        impact: 'Smlouva se vrací do draft stavu',
        risk: 'Střední — zpoždění dodávky',
      },
      {
        id: 'kcs03-amend',
        label: 'Požadovat úpravu',
        description: 'Smlouva vyžaduje drobné úpravy před schválením.',
        recommended: false,
        impact: 'Smlouva se vrací k úpravě s konkrétními požadavky',
        risk: 'Nízké — krátké zpoždění',
      },
    ],
  },
  {
    kcsId: 'KCS-04',
    name: 'Smlouva — Změna podmínek',
    resolutionType: 'manual_escalation',
    escalationPath: ['Account Manager', 'Legal Team'],
    escalationSlaMinutes: 480,
    fallbackIfTimeout: 'Po 48h platí smlouva v původní verzi',
    guardingInvariant: 'Změna SLA podmínek vyžaduje souhlas obou stran',
    transientState: 'amendment_pending',
    auditRequired: true,
    variants: [
      {
        id: 'kcs04-accept-change',
        label: 'Přijmout změnu',
        description: 'Změna podmínek je akceptována — nový amendment bude vytvořen.',
        recommended: true,
        impact: 'Nová verze smlouvy s upravenými podmínkami',
        risk: 'Nízké — oboustranný souhlas',
      },
      {
        id: 'kcs04-reject-change',
        label: 'Odmítnout změnu',
        description: 'Změna je odmítnuta — původní podmínky zůstávají v platnosti.',
        recommended: false,
        impact: 'Smlouva zůstává beze změny',
        risk: 'Střední — nespokojenost klienta',
      },
    ],
  },
  {
    kcsId: 'KCS-05',
    name: 'SLA výjimka',
    resolutionType: 'manual_escalation',
    escalationPath: ['Support Manager', 'Regional Director'],
    escalationSlaMinutes: 2880,
    fallbackIfTimeout: 'Po 48h výjimka zamítnuta',
    guardingInvariant: 'SLA výjimka musí být schválena managerem',
    transientState: 'sla_exception_pending',
    auditRequired: true,
    variants: [
      {
        id: 'kcs05-grant-exception',
        label: 'Udělit výjimku',
        description: 'SLA výjimka je schválena — case dostane prodloužený deadline.',
        recommended: false,
        impact: 'Prodloužení SLA deadline',
        risk: 'Střední — precedent pro další případy',
      },
      {
        id: 'kcs05-deny-exception',
        label: 'Zamítnout výjimku',
        description: 'SLA výjimka je zamítnuta — původní SLA deadline zůstává.',
        recommended: true,
        impact: 'SLA zůstává beze změny, eskalace pokračuje',
        risk: 'Nízké — zachování standardu',
      },
      {
        id: 'kcs05-partial-extension',
        label: 'Částečné prodloužení',
        description: 'SLA deadline prodloužen o 50% původního času.',
        recommended: false,
        impact: 'Kompromis mezi standardem a výjimkou',
        risk: 'Nízké — omezený dopad',
      },
    ],
  },
  {
    kcsId: 'KCS-06',
    name: 'Korekční záznam — Oprava dat',
    resolutionType: 'correction_record',
    escalationPath: [],
    escalationSlaMinutes: null,
    fallbackIfTimeout: 'Korekční záznam (append-only)',
    guardingInvariant: 'Oprava dat je append-only, původní hodnota musí být zachována',
    transientState: 'correction_pending',
    auditRequired: true,
    variants: [
      {
        id: 'kcs06-apply-correction',
        label: 'Aplikovat opravu',
        description: 'Korekční záznam bude přidán. Původní data zůstanou v historii.',
        recommended: true,
        impact: 'Data budou opravena, plný audit trail',
        risk: 'Nízké — append-only princip',
      },
      {
        id: 'kcs06-reject-correction',
        label: 'Zamítnout opravu',
        description: 'Oprava je zamítnuta — současná data zůstávají v platnosti.',
        recommended: false,
        impact: 'Žádná změna dat',
        risk: 'Střední — potenciálně nekorektní data zůstávají',
      },
    ],
  },
  {
    kcsId: 'KCS-07',
    name: 'Automatický retry — Systémový konflikt',
    resolutionType: 'automatic',
    escalationPath: [],
    escalationSlaMinutes: null,
    fallbackIfTimeout: 'Retry 3x -> Conflict system_failure',
    guardingInvariant: 'Systémové konflikty se pokusí vyřešit automaticky',
    transientState: 'retrying',
    auditRequired: true,
    variants: [
      {
        id: 'kcs07-retry',
        label: 'Opakovat operaci',
        description: 'Systém se pokusí o automatický retry operace (max 3 pokusy).',
        recommended: true,
        impact: 'Automatické řešení bez zásahu uživatele',
        risk: 'Nízké — omezený počet pokusů',
      },
      {
        id: 'kcs07-manual-override',
        label: 'Manuální zásah',
        description: 'Přeskočit automatický retry a řešit manuálně.',
        recommended: false,
        impact: 'Vyžaduje zásah technického týmu',
        risk: 'Střední — delší doba řešení',
      },
    ],
  },
  {
    kcsId: 'KCS-08',
    name: 'Varování — Konflikt lokální vs. globální',
    resolutionType: 'manual_escalation',
    escalationPath: ['Regional Director', 'Management'],
    escalationSlaMinutes: 0,
    fallbackIfTimeout: 'WarningBanner + manuální rozhodnutí',
    guardingInvariant: 'Lokální vs. globální politika musí být rozhodnuta managementem',
    transientState: 'awaiting_decision',
    auditRequired: true,
    variants: [
      {
        id: 'kcs08-follow-global',
        label: 'Dodržet globální politiku',
        description: 'Uplatnit globální firemní politiku — lokální výjimka nebude udělena.',
        recommended: true,
        impact: 'Konzistence napříč regiony',
        risk: 'Střední — lokální tým může být nespokojen',
      },
      {
        id: 'kcs08-grant-local-exception',
        label: 'Udělit lokální výjimku',
        description: 'Povolit odchylku od globální politiky pro tento region/případ.',
        recommended: false,
        impact: 'Lokální flexibilita, ale precedent',
        risk: 'Vysoké — precedent pro další regiony',
      },
      {
        id: 'kcs08-escalate-board',
        label: 'Eskalovat na board',
        description: 'Rozhodnutí přesahuje pravomoci regional directora — eskalovat na vedení.',
        recommended: false,
        impact: 'Rozhodnutí bude na úrovni vedení společnosti',
        risk: 'Nízké — ale delší čas na rozhodnutí',
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
    situation: 'Zákazník Prager Industrie registrován v CZ i DE — spor o vlastnictví účtu mezi CZ a DE týmem.',
    chosenVariant: 'kcs01-merge',
    chosenVariantLabel: 'Sloučit záznamy',
    decidedBy: 'Tomáš Černý (Management)',
    justification: 'Zákazník registrován v CZ, primární kontakt Praha. DE tým bude sekundárním správcem.',
    timestamp: '2026-02-15T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-002',
    conflictId: 'CNF-004',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L2 — Finance Controller',
    situation: 'Opportunity OPP-008 (Bohemia Tech, 1.8M EUR) blokována finance gate — zákazník má otevřenou pohledávku 45k EUR.',
    chosenVariant: 'kcs02-conditional',
    chosenVariantLabel: 'Podmíněně schválit',
    decidedBy: 'Karel Dvořák (Finance Controller)',
    justification: 'Strategický význam zákazníka opravňuje kompromis. Podmíněno uhrazením pohledávky do 30 dnů.',
    timestamp: '2026-02-28T16:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-003',
    conflictId: 'CNF-006',
    conflictType: 'local_vs_global',
    kcsId: 'KCS-08',
    escalationLevel: 'L2 — Regional Director',
    situation: 'AT region požaduje odlišné compliance přílohy ke smlouvě — odchylka od globální smluvní šablony.',
    chosenVariant: 'kcs08-grant-local-exception',
    chosenVariantLabel: 'Udělit lokální výjimku',
    decidedBy: 'Anna Králová (Regional Director)',
    justification: 'AT požadavky legitimní (GDPR specifika), neovlivňují globální smlouvu. Výjimka s časovým omezením 12 měsíců.',
    timestamp: '2026-01-25T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-004',
    conflictId: 'CNF-008',
    conflictType: 'verbal_vs_written',
    kcsId: 'KCS-04',
    escalationLevel: 'L2 — Account Manager',
    situation: 'Zákazník Krakow Steel tvrdí, že Sales slíbil 2 bezplatné servisní návštěvy ročně — ve smlouvě není.',
    chosenVariant: 'kcs04-accept-change',
    chosenVariantLabel: 'Přijmout změnu',
    decidedBy: 'Martin Veselý (Legal/Compliance)',
    justification: 'Ústní dohoda neprůkazná, ale kompromis chrání vztah. Řešení: 1x zdarma + 1x sleva 50%.',
    timestamp: '2026-02-05T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-005',
    conflictId: 'CNF-010',
    conflictType: 'sla_exception',
    kcsId: 'KCS-05',
    escalationLevel: 'L2 — Support Manager',
    situation: 'Gdansk Shipping požaduje SLA výjimku pro infrastrukturní incidenty — standardní SLA 4h je nedostatečné pro HW problémy.',
    chosenVariant: 'kcs05-grant-exception',
    chosenVariantLabel: 'Udělit výjimku',
    decidedBy: 'Karel Dvořák (Finance Controller)',
    justification: 'Opodstatněná výjimka pro kategorii infrastrukturních incidentů. SLA prodlouženo na 8h pro HW.',
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
    situation: 'Opportunity pro Dresden Elektronik (750k EUR) — pohledávka 22k EUR.',
    chosenVariant: 'kcs02-conditional',
    chosenVariantLabel: 'Podmíněně schválit',
    decidedBy: 'Karel Dvořák (Finance Controller)',
    justification: 'Pohledávka malá vzhledem k hodnotě dealu. Podmíněno uhrazením do 14 dnů.',
    timestamp: '2026-01-20T10:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-007',
    conflictId: 'CNF-HIST-002',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L2 — Finance Controller',
    situation: 'Opportunity pro Berlin Automotive (2.1M EUR) — pohledávka 85k EUR po splatnosti.',
    chosenVariant: 'kcs02-conditional',
    chosenVariantLabel: 'Podmíněně schválit',
    decidedBy: 'Karel Dvořák (Finance Controller)',
    justification: 'Automotive segment strategický — podmíněno splátkový kalendářem.',
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
    situation: 'Škoda Machinery požaduje SLA výjimku pro plánované odstávky.',
    chosenVariant: 'kcs05-grant-exception',
    chosenVariantLabel: 'Udělit výjimku',
    decidedBy: 'Eva Procházková (Support Agent)',
    justification: 'Plánované odstávky jsou legitimní důvod pro časovou výjimku.',
    timestamp: '2026-01-10T14:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-009',
    conflictId: 'CNF-HIST-004',
    conflictType: 'sla_exception',
    kcsId: 'KCS-05',
    escalationLevel: 'L2 — Support Manager',
    situation: 'Wiener Logistik — SLA výjimka pro migraci na nový systém.',
    chosenVariant: 'kcs05-grant-exception',
    chosenVariantLabel: 'Udělit výjimku',
    decidedBy: 'Eva Procházková (Support Agent)',
    justification: 'Migrace potrvá 2 týdny, dočasné prodloužení SLA opodstatněné.',
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
    situation: 'Opportunity pro Moravská Strojírna (320k EUR) — žádné pohledávky.',
    chosenVariant: 'kcs02-approve',
    chosenVariantLabel: 'Schválit obchod',
    decidedBy: 'Karel Dvořák (Finance Controller)',
    justification: 'Zákazník bez pohledávek, standardní schválení.',
    timestamp: '2026-03-01T09:00:00Z',
    guardrailCheck: 'passed',
  },
  {
    id: 'DR-011',
    conflictId: 'CNF-HIST-006',
    conflictType: 'deal_vs_finance',
    kcsId: 'KCS-02',
    escalationLevel: 'L1 — Finance Controller',
    situation: 'Opportunity pro Salzburg Pharma (480k EUR) — pohledávka uhrazena před schválením.',
    chosenVariant: 'kcs02-approve',
    chosenVariantLabel: 'Schválit obchod',
    decidedBy: 'Karel Dvořák (Finance Controller)',
    justification: 'Pohledávka uhrazena včera, schválení bez podmínek.',
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
    situation: 'Warsaw Digital tvrdí, že Sales slíbil rozšířený support — není ve smlouvě.',
    chosenVariant: 'kcs04-reject-change',
    chosenVariantLabel: 'Odmítnout změnu',
    decidedBy: 'Jan Novák (Account Manager)',
    justification: 'Žádný důkaz o ústním příslibu. Platí podmínky dle smlouvy CTR-013.',
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
    situation: 'Pokus o opětovné rozhodnutí CNF-002 (již vyřešeno).',
    chosenVariant: 'kcs01-keep-separate',
    chosenVariantLabel: 'Ponechat oddělené',
    decidedBy: 'Hans Mueller (Sales)',
    justification: 'DE tým nesouhlasí s předchozím rozhodnutím.',
    timestamp: '2026-02-16T09:00:00Z',
    guardrailCheck: 'blocked',
  },
];

// ---------------------------------------------------------------------------
// Suggested change messages for pattern detection
// ---------------------------------------------------------------------------

const SUGGESTED_CHANGES: Record<string, string> = {
  'kcs02-approve': 'Automatizovat schválení — přesunout z L2 na L1 pro standardní obchody',
  'kcs02-reject': 'Zavést preventivní guard — blokovat nekvalifikované obchody před finance gate',
  'kcs02-conditional': 'Standardizovat podmínky — vytvořit šablonu podmíněných schválení',
  'kcs03-approve': 'Automatizovat právní schválení pro standardní smlouvy',
  'kcs03-reject': 'Zavést předchozí právní review — snížit počet zamítnutí',
  'kcs03-amend': 'Standardizovat smluvní šablony — snížit počet úprav',
  'kcs04-accept-change': 'Automatizovat přijímání změn pod určitou hodnotou',
  'kcs04-reject-change': 'Zavést jasnější pravidla pro akceptovatelné změny',
  'kcs05-grant-exception': 'Revidovat SLA parametry — příliš mnoho výjimek',
  'kcs05-deny-exception': 'SLA standardy jsou adekvátní — žádná změna',
  'kcs05-partial-extension': 'Formalizovat částečné prodloužení jako standardní postup',
  'kcs01-merge': 'Automatizovat slučování — přesunout z L2 na L1',
  'kcs01-keep-separate': 'Revidovat pravidla duplicity — příliš mnoho případů',
  'kcs01-archive-older': 'Zavést automatickou archivaci zastaralých záznamů',
  'kcs06-apply-correction': 'Automatizovat korekce — přesunout z L2 na L1',
  'kcs06-reject-correction': 'Zpřísnit validaci dat při vstupu',
  'kcs07-retry': 'Automatický retry funguje — zachovat',
  'kcs07-manual-override': 'Zlepšit automatický retry mechanismus',
  'kcs08-follow-global': 'Globální politika funguje — žádná změna',
  'kcs08-grant-local-exception': 'Formalizovat regionální výjimky do politiky',
  'kcs08-escalate-board': 'Delegovat více pravomocí na regional directors',
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
          `Analyzovat opakující se rozhodnutí typu ${conflictType}`,
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
          problem: `Opakující se rozhodnutí typu "${conflictType}" s variantou "${variant}" (${count}x)`,
          frequency: count,
          trigger: strategy?.guardingInvariant ?? 'Neznamy trigger',
          actors,
        },
        proposal: {
          variants: allVariants,
          recommendation:
            SUGGESTED_CHANGES[variant] ??
            `Analyzovat a automatizovat rozhodnutí typu ${conflictType}`,
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
