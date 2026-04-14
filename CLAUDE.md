# EnterpriseCRM — Interaktivní prototyp

Centrální CRM systém pro nadnárodní B2B společnost (2000+ zaměstnanců, multi-region EU). Sjednocuje práci se zákazníkem napříč 6 odděleními, formalizuje mezioddělové konflikty a zajišťuje 100% auditovatelnost rozhodnutí.

## Builder Rules (živý zdroj)

Exekuční pravidla buildu (favicon, onboarding, NDA, scaffold postup) se řídí souborem:
→ `D:\___DEV\BUILDER_assistent.md`
Při každém buildu i rebuildu VŽDY přečti tento soubor pro aktuální pravidla.
Projektová rozhodnutí (tech stack, obrazovky, role, seed data) zůstávají v tomto CLAUDE.md.

## Tech Stack

- **Framework:** React 18+ s TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State:** React Context (RoleContext, DecisionContext)
- **Mock API:** In-memory handlers s 300ms simulovanou latencí

## Obrazovky (14)

| Screen ID | Účel | Zdroj UC |
|-----------|------|----------|
| SCR-01 | Dashboard (role-specific landing) | UC-01 |
| SCR-02 | Customer 360 (kompletní pohled) | UC-01 |
| SCR-03 | Customer Edit (optimistic lock) | UC-01 |
| SCR-04 | Pipeline Overview | UC-02 |
| SCR-05 | Opportunity Detail + Finance Gate | UC-02 |
| SCR-06 | Finance Review Queue | UC-03 |
| SCR-07 | Finance Gate Decision | UC-03 |
| SCR-08 | Contracts List | UC-04 |
| SCR-09 | Contract Detail / Create / Approve | UC-04 |
| SCR-10 | Support Cases List | UC-05 |
| SCR-11 | Support Case Detail + SLA | UC-05 |
| SCR-12 | Conflict Panel (seznam) | UC-06 |
| SCR-12a | Conflict Resolution Detail | UC-06 |
| SCR-13 | Audit Log + Export | UC-07 |

## Role (7)

| Role | Typ | Přístupné obrazovky |
|------|-----|---------------------|
| Account Manager | end_user | SCR-01–03, 04–05, 08–09, 10–11, 12–12a |
| Sales | end_user | SCR-01, 02 (readonly), 04–05, 10 (readonly) |
| Finance Controller | end_user | SCR-01, 02 (readonly), 06–07, 13 |
| Support Agent | end_user | SCR-01, 02 (readonly), 10–11, 12 |
| Legal/Compliance | end_user | SCR-01, 02 (readonly), 08–09, 13 |
| Management | economic_buyer | SCR-01, 02, 04 (ro), 06 (ro), 12–12a, 13 |
| Regional Director | end_user | SCR-01, 02, 04–05, 12–12a |

## Decision Layer: Level 2 (Runtime + Strategic)

8 decision strategies z PA MACHINE_DATA (5× manual_escalation):

| KCS | Typ | SLA | Fallback |
|-----|-----|-----|----------|
| KCS-01 | preventive_guard | — | Draft + Conflict |
| KCS-02 | manual_escalation | 240 min | Eskalace FM → VP, po 72h notifikace |
| KCS-03 | manual_escalation | 2880 min | Po 7d automatické zamítnutí |
| KCS-04 | manual_escalation | 480 min | Po 48h platí smlouva |
| KCS-05 | manual_escalation | 2880 min | Po 48h výjimka zamítnuta |
| KCS-06 | correction_record | — | Korekcní záznam (append-only) |
| KCS-07 | automatic | — | Retry 3× → Conflict system_failure |
| KCS-08 | manual_escalation | 0 | WarningBanner + manuální rozhodnutí |

**Level 2 zahrnuje:** DecisionContext, DecisionPanel, DecisionLogDrawer, SLA fallback (15s check), pattern detection (práh 3), StrategicInsights panel, Change Protocol export (JSON).

## Seed Data

| Entita | Počet | Poznámka |
|--------|-------|----------|
| customers | 15 | CZ, DE, AT, PL regiony |
| contacts | 40 | 2-4 per customer, české fiktivní PII |
| opportunities | 30 | Mix stavů, 3 ve finance_review |
| contracts | 20 | Mix draft/active/expired, verzované |
| support_cases | 25 | Některé blízko SLA, 2 eskalované |
| conflicts | 10 | 5 typů, 3 awaiting_decision |
| audit_records | 100+ | Auto-generované |
| users | 8 | 1 per role + 2 extra Sales |

**Časové rozmezí:** Leden–březen 2026

## Implementační plán (schválený)

### Fáze A — Scaffold projektu
Vite + React + TS + Tailwind, adresářová struktura, config, závislosti.

### Fáze B — Design system base
12 global komponent z PAB: PrimaryButton, SecondaryButton, TextInput, SelectInput, DataTable, StatusBadge, ConfirmationModal, ErrorToast, SuccessToast, MergeDiffPanel, LoadingSpinner, WarningBanner.

### Fáze C — Screen scaffolding
14 screen komponent. Každá má:
- State machine skeleton (default/transient/error/success/empty)
- Formulářová pole z data_bindings[] (mapované na komponenty z Fáze B)
- Akce z actions[] napojené na mock API
- Microcopy jako konstanty
- Telemetry event placeholdery (console.log)

### Fáze D — Role switcher
RoleContext (React Context) s přepínačem v headeru. Filtrování navigace podle role. Pulzující tečka onboarding (zmizí po první interakci, localStorage `role_switcher_seen`).

### Fáze D2 — Decision Layer Level 2
**Level 1 (Runtime):**
- DecisionContext — in-memory decision log, varianty/SLA/eskalace per conflict type, guardrail check
- DecisionPanel — modal: eskalační úroveň, SLA countdown, kontext, varianty, povinné zdůvodnění
- DecisionLogDrawer — drawer v headeru (admin role): DR-XXX záznamy
- Transient state `čeká_na_řešení` v Conflict typech
- SLA fallback — 15s check, auto-resolve po timeout
- Guardrails — blokace re-resolution

**Level 2 (rozšíření):**
- Pattern detection — počítání per typ+varianta, práh 3
- StrategicInsights panel — tabulka patternů v Decision Log draweru
- Change candidate indikace — vizuální zvýraznění 3+
- Change Protocol export — JSON do schránky/download

### Fáze E — Mock API vrstva
16 endpointů z PRD. RBAC enforcement (403). 300ms latence.

### Fáze F — Seed data
TS interfaces + JSON data. FK integrity, enumy, invarianty.

### Fáze G — Demo walkthrough
Guided tour z 7 Happy Path scénářů. Tlačítko "Demo průchod" v headeru.

### Fáze H — NDA modal + anonymizace
- Logo: `public/logo.svg` (POUZE v NDA modalu, NIKDY na obrazovkách)
- Favicon: `public/favicon.png`
- NDA text: "Vítejte v interaktivním prototypu projektu EnterpriseCRM..."
- Anonymizovaný název: **EnterpriseCRM**
- V levém horním rohu obrazovky: pouze "EnterpriseCRM" (žádné logo)

## Adresářová struktura

```
D:\___DEV\CRM_Korporat\
├── docs/                    # MACHINE_DATA dokumenty (read-only)
│   ├── PAB_CRM_Korporat_v1_revised.md
│   ├── PRD_CRM_Korporat_v1_revised.md
│   ├── UAT_CRM_Korporat_v1_revised.md
│   ├── HCV_CRM_Korporat_v1.md
│   └── TRACEABILITY_CRM_Korporat.md
├── public/
│   ├── logo.svg             # Logo pro NDA modal
│   ├── favicon.png          # Favicon 32px
│   └── index.html
├── src/
│   ├── components/          # Fáze B — global components
│   ├── screens/             # Fáze C — SCR-01 až SCR-13
│   ├── api/                 # Fáze E — mock handlers
│   ├── data/                # Fáze F — types + seed data
│   ├── context/             # Fáze D — RoleContext + DecisionContext
│   ├── decision/            # Fáze D2 — DecisionPanel, LogDrawer, Insights
│   ├── tour/                # Fáze G — DemoWalkthrough
│   └── App.tsx
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Build / Run příkazy

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Produkční build
npm run preview    # Preview produkčního buildu
```

## Out of Scope

- Reálný backend / databáze
- Autentizace (SSO) — v prototypu role switcher
- ERP integrace — v prototypu mock data
- Mobilní plný UX — pouze responsive readonly
- Pokročilý BI/reporting
- E-mail integrace
- Workflow automation
- Deploy (git init, GitHub, Vercel = úkol uživatele)

## MACHINE_DATA cesty

Všechna MACHINE_DATA jsou v `docs/`:
- **PAB:** `docs/PAB_CRM_Korporat_v1_revised.md` — 2 JSON bloky (PA Detail + UX State Engineer)
- **PRD:** `docs/PRD_CRM_Korporat_v1_revised.md` — FR, DB model, API spec
- **UAT:** `docs/UAT_CRM_Korporat_v1_revised.md` — BDD scénáře, Happy Path pro tour
