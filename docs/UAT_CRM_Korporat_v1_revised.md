# ACCEPTANCE CRITERIA & BUSINESS SCENARIOS
## CRM pro korporát v1

---

## 1. Globální Akceptační Kritéria (Business & System Level)

| ID | Kritérium | Měřitelná metrika | Zdroj |
|----|-----------|-------------------|-------|
| GAC-01 | Systém musí být dostupný 99.5 % pracovní doby. | Uptime ≥ 99.5 % (měřeno měsíčně) | PAB NFR |
| GAC-02 | Doba načtení stránky nesmí překročit 2 sekundy. | Page load ≤ 2s (P95) | PAB NFR |
| GAC-03 | Vyhledávání zákazníka musí vrátit výsledky do 1 sekundy. | Search latency ≤ 1s (P95) | PAB NFR |
| GAC-04 | Každá změna dat musí mít audit trail. | 100 % mutací má AuditRecord | PAB INV-01 |
| GAC-05 | Systém musí podporovat 2000+ současně přihlášených uživatelů. | Concurrent users ≥ 2000 bez degradace | PAB NFR |
| GAC-06 | Přístup k datům musí respektovat RBAC matici (role × region). | 0 neoprávněných přístupů v penetration testu | PAB SR-03 |
| GAC-07 | Autentizace výhradně přes SSO — žádné lokální účty. | 0 lokálních účtů v systému | PAB SR-01 |
| GAC-08 | PII data (kontakty) musí být označena a chráněna dle GDPR. | Všechna PII pole mají is_pii=true flag | PAB NFR |

---

## 2. Byznysové Scénáře (BDD)

### Modul: Customer 360 (UC-01)

**AC-01** — Customer 360 zobrazení
**Zdroj:** UC-01 / SCR-02
**Priorita:** High | **Typ:** Happy Path

- **GIVEN** zákazník "TechPro AG" existuje v systému s 2 aktivními smlouvami, 3 příležitostmi a 1 otevřeným support case
- **WHEN** Account Manager otevře profil zákazníka "TechPro AG"
- **THEN** systém zobrazí kompletní Customer 360 — kontakty, smlouvy, příležitosti, support cases, pohledávky z ERP a posledních 20 auditních záznamů
- **AND** všechny sekce zobrazují aktuální data (ne starší než poslední synchronizace)

---

**AC-02** — Optimistic lock při souběžné editaci (KCS-01)
**Zdroj:** UC-01 / SCR-03
**Priorita:** High | **Typ:** Edge Case

- **GIVEN** Account Manager A otevřel editaci zákazníka "TechPro AG" a Account Manager B otevřel editaci stejného zákazníka
- **WHEN** Account Manager A uloží změnu legal_name a Account Manager B poté uloží změnu primary_region
- **THEN** systém detekuje optimistic lock konflikt u Account Managera B a zobrazí diff s volbami: přijmout mé změny / přijmout cizí / sloučit ručně
- **AND** AuditRecord zaznamená výsledek merge včetně obou verzí dat

---

**AC-03** — Editace Customer — neplatný VAT ID
**Zdroj:** UC-01 / SCR-03
**Priorita:** Medium | **Typ:** Negative

- **GIVEN** Account Manager edituje zákazníka v regionu DE
- **WHEN** zadá VAT ID "12345" (neplatný formát pro DE — chybí prefix "DE" a má méně než 9 číslic)
- **THEN** systém zobrazí inline chybu "Neplatný formát IČO pro region DE" a neumožní uložení
- **AND** žádná změna se nepromítne do databáze

---

### Modul: Pipeline (UC-02) — Skin in the Game

**AC-04** — Úspěšné uzavření obchodu (Happy Path)
**Zdroj:** UC-02 / SCR-05
**Priorita:** High | **Typ:** Happy Path

- **GIVEN** Opportunity "Nordhausen GmbH" je ve stavu "negotiation" s hodnotou 180K EUR a zákazník nemá otevřené pohledávky v ERP
- **WHEN** Sales klikne "Uzavřít obchod"
- **THEN** systém provede Finance Gate check, ERP vrátí 0 EUR pohledávek, Opportunity přejde do "closed_won"
- **AND** Account Manager obdrží notifikaci o uzavření dealu
- **AND** AuditRecord zaznamená přechod z "negotiation" na "closed_won" s timestampem a aktérem

---

**AC-05** — Finance blokace — zákazník má pohledávky
**Zdroj:** UC-02 + UC-03 / SCR-05, SCR-07
**Priorita:** High | **Typ:** Negative

- **GIVEN** Opportunity "Nordhausen GmbH" je ve stavu "negotiation" a zákazník má otevřenou pohledávku 12K EUR v ERP
- **WHEN** Sales klikne "Uzavřít obchod"
- **THEN** systém provede Finance Gate check, detekuje pohledávku, Opportunity přejde do "finance_review"
- **AND** Finance Controller obdrží notifikaci s detailem pohledávky
- **AND** Sales obdrží informaci o blokaci s odůvodněním

---

**AC-06** — Pipeline — nerealistická hodnota Opportunity
**Zdroj:** UC-02 / SCR-05
**Priorita:** Low | **Typ:** Edge Case

- **GIVEN** Sales vytváří novou Opportunity
- **WHEN** zadá hodnotu 999 000 000 EUR (výrazně nad historickým průměrem)
- **THEN** systém zobrazí varování "Hodnota přesahuje 2× nejvyšší existující deal" ale UMOŽNÍ uložení
- **AND** AuditRecord zaznamená vytvoření s varováním

---

### Modul: Finance Gate (UC-03)

**AC-07** — Finance Controller uvolní blokaci
**Zdroj:** UC-03 / SCR-07
**Priorita:** High | **Typ:** Happy Path

- **GIVEN** Opportunity "Nordhausen GmbH" je ve stavu "finance_review" a Finance Controller vidí detail pohledávky
- **WHEN** Finance Controller zvolí "Uvolnit" a zadá odůvodnění "Pohledávka uhrazena dnes ráno, ERP ještě nesynchronizoval"
- **THEN** Opportunity přejde do "closed_won", Sales a AM obdrží notifikaci
- **AND** AuditRecord zaznamená rozhodnutí Finance Controllera s odůvodněním

---

**AC-08** — Finance Gate — odůvodnění příliš krátké
**Zdroj:** UC-03 / SCR-07
**Priorita:** Medium | **Typ:** Negative

- **GIVEN** Finance Controller rozhoduje o dealu ve "finance_review"
- **WHEN** zvolí "Uvolnit" ale zadá odůvodnění "ok" (méně než 10 znaků)
- **THEN** systém zobrazí chybu "Odůvodnění je povinné a musí obsahovat alespoň 10 znaků" a neumožní uložení

---

### Modul: Smlouvy (UC-04)

**AC-09** — Vytvoření a schválení smlouvy
**Zdroj:** UC-04 / SCR-09
**Priorita:** High | **Typ:** Happy Path

- **GIVEN** zákazník má uzavřený deal (closed_won) a Account Manager vytvoří novou smlouvu typu "master" s SLA 4h response
- **WHEN** Account Manager odešle smlouvu ke schválení Legal
- **THEN** smlouva přejde do stavu "pending_legal" a Legal obdrží notifikaci
- **AND** po schválení Legal přejde smlouva do "active" a její SLA podmínky se stanou závazné pro Support

---

**AC-10** — Legal zamítne smlouvu
**Zdroj:** UC-04 / SCR-09
**Priorita:** Medium | **Typ:** Negative

- **GIVEN** smlouva je ve stavu "pending_legal"
- **WHEN** Legal zamítne smlouvu s komentářem "Chybí ustanovení o GDPR"
- **THEN** smlouva se vrátí do "draft" s komentářem od Legal, Account Manager obdrží notifikaci
- **AND** AuditRecord zaznamená zamítnutí s komentářem

---

### Modul: Support (UC-05)

**AC-11** — Vytvoření a vyřešení support case
**Zdroj:** UC-05 / SCR-11
**Priorita:** High | **Typ:** Happy Path

- **GIVEN** zákazník "TechPro AG" má aktivní smlouvu s SLA response time 4h
- **WHEN** Support Agent vytvoří case s prioritou "high" a popisem problému
- **THEN** systém automaticky vypočte SLA deadline (created_at + 4h business hours) a přidělí case agentovi
- **AND** po vyřešení a potvrzení zákazníkem (nebo timeout 72h) case přejde do "closed"

---

**AC-12** — SLA deadline překročen — automatická eskalace
**Zdroj:** UC-05 / SCR-11
**Priorita:** High | **Typ:** Edge Case

- **GIVEN** support case je ve stavu "in_progress" a SLA deadline je za 30 minut (80 % času uplynulo)
- **WHEN** systém detekuje blížící se SLA deadline
- **THEN** systém zobrazí WarningBanner "SLA deadline se blíží" a notifikuje Support Lead
- **AND** po překročení deadline case automaticky přejde do "escalated" a Management obdrží notifikaci

---

**AC-13** — Support case — zákazník bez aktivní smlouvy
**Zdroj:** UC-05 / SCR-11
**Priorita:** Medium | **Typ:** Edge Case

- **GIVEN** zákazník nemá žádnou aktivní smlouvu v systému
- **WHEN** Support Agent vytvoří case pro tohoto zákazníka
- **THEN** systém zobrazí upozornění "Zákazník nemá aktivní smlouvu. SLA bude aplikováno dle default podmínek."
- **AND** case je vytvořen s default SLA (ne dle smlouvy)

---

### Modul: Konflikty (UC-06)

**AC-14** — Vyřešení mezioddělového konfliktu
**Zdroj:** UC-06 / SCR-12a
**Priorita:** High | **Typ:** Happy Path

- **GIVEN** systém detekoval konflikt typu "deal_vs_finance" mezi Sales a Finance pro zákazníka "TechPro AG"
- **WHEN** Account Manager prostuduje kontext, zvolí variantu "Uvolnit deal s podmínkou úhrady do 14 dnů" a zadá odůvodnění (min 20 znaků)
- **THEN** konflikt přejde do stavu "resolved", dotčená Opportunity je aktualizována, všechny strany obdrží notifikaci
- **AND** AuditRecord zaznamená kompletní historii konfliktu: detekce → review → rozhodnutí

---

**AC-15** — Konflikt — odůvodnění prázdné
**Zdroj:** UC-06 / SCR-12a
**Priorita:** Medium | **Typ:** Negative

- **GIVEN** konflikt je ve stavu "awaiting_decision"
- **WHEN** oprávněná role zvolí variantu ale nezadá odůvodnění
- **THEN** systém zobrazí chybu "Odůvodnění je povinné (min 20 znaků)" a neumožní rozhodnutí

---

### Modul: Audit (UC-07)

**AC-16** — Export auditního logu
**Zdroj:** UC-07 / SCR-13
**Priorita:** High | **Typ:** Happy Path

- **GIVEN** Management chce export auditních záznamů za poslední měsíc pro zákazníka "TechPro AG"
- **WHEN** nastaví filtr (entity_type: "customer", entity_id: "TechPro AG", date_from: 2026-03-01, date_to: 2026-03-31) a klikne "Export CSV"
- **THEN** systém vygeneruje CSV soubor se všemi auditními záznamy odpovídajícími filtru
- **AND** AuditRecord zaznamená export (kdo, kdy, jaký rozsah)

---

**AC-17** — Audit — příliš široký filtr
**Zdroj:** UC-07 / SCR-13
**Priorita:** Low | **Typ:** Negative

- **GIVEN** uživatel otevře Audit Log bez nastavení jakéhokoliv filtru
- **WHEN** klikne "Filtrovat"
- **THEN** systém zobrazí chybu "Nastavte alespoň jeden filtr"
- **AND** žádná data se nenačtou

---

### Decision Scénáře

**AC-D01** — Decision: Finance blokace nesynchronizované pohledávky (KCS-02)
**Zdroj:** KCS-02 / SCR-07
**Priorita:** High | **Typ:** Decision

- **GIVEN** Opportunity je ve stavu "finance_review" a Finance Controller vidí pohledávku 12K EUR (poslední sync: před 2h)
- **WHEN** Finance Controller zvolí "Uvolnit" s odůvodněním "Pohledávka uhrazena, čeká na sync"
- **THEN** Opportunity přejde do "closed_won", stav konfliktu přejde z transient do resolved
- **AND** AuditRecord zaznamená: kdo (Finance Controller), kdy, jaká varianta (uvolnění), zdůvodnění

---

**AC-D02** — Decision timeout: Finance Gate 72h (KCS-02)
**Zdroj:** KCS-02 / SCR-06
**Priorita:** High | **Typ:** Decision

- **GIVEN** Opportunity je ve stavu "finance_review" déle než 72h bez rozhodnutí
- **WHEN** systém detekuje SLA timeout
- **THEN** systém automaticky eskaluje na Finance Manager, po dalších 24h na VP Operations
- **AND** AuditRecord obsahuje "timeout_fallback" a eskalační řetězec

---

**AC-D03** — Decision: Lokální výjimka z globálních pravidel (KCS-03)
**Zdroj:** KCS-03 / SCR-12a
**Priorita:** High | **Typ:** Decision

- **GIVEN** Regional Director požádal o výjimku z globálních pravidel pro zákazníka v DE
- **WHEN** VP Operations schválí výjimku s odůvodněním a časovým omezením (30 dní)
- **THEN** výjimka je zaznamenána s platností do definovaného data, Opportunity/Contract je aktualizován
- **AND** AuditRecord zaznamená schválení včetně časového omezení

---

**AC-D04** — Decision timeout: Lokální výjimka 7 dní (KCS-03)
**Zdroj:** KCS-03 / SCR-12a
**Priorita:** High | **Typ:** Decision

- **GIVEN** žádost o regionální výjimku čeká na VP Operations déle než 7 dní
- **WHEN** systém detekuje SLA timeout
- **THEN** žádost je automaticky zamítnuta s odůvodněním "timeout"
- **AND** Regional Director obdrží notifikaci a AuditRecord obsahuje "timeout_fallback"

---

**AC-D05** — Decision: Ústní příslib vs. smlouva (KCS-04)
**Zdroj:** KCS-04 / SCR-11
**Priorita:** High | **Typ:** Decision

- **GIVEN** Support nahlásil dispute — zákazník tvrdí, že Sales slíbil weekend support, smlouva to neobsahuje
- **WHEN** Account Manager rozhodne: "Příslib nepotvrzen, platí smlouva" s odůvodněním
- **THEN** dispute je vyřešen, Support pokračuje dle podmínek smlouvy, zákazník je informován
- **AND** AuditRecord zaznamená rozhodnutí

---

**AC-D06** — Decision: SLA výjimka (KCS-05)
**Zdroj:** KCS-05 / SCR-11
**Priorita:** High | **Typ:** Decision

- **GIVEN** Support požádal o SLA výjimku pro strategického zákazníka
- **WHEN** Legal/Compliance schválí výjimku s časovým omezením (60 dní) a odůvodněním
- **THEN** SLA výjimka je zaznamenána, Support může pokračovat s rozšířeným SLA
- **AND** AuditRecord zaznamená schválení včetně podmínek a časového omezení

---

**AC-D07** — Decision timeout: SLA výjimka 48h (KCS-05)
**Zdroj:** KCS-05 / SCR-11
**Priorita:** High | **Typ:** Decision

- **GIVEN** žádost o SLA výjimku čeká na Legal déle než 48h
- **WHEN** systém detekuje SLA timeout
- **THEN** výjimka je automaticky zamítnuta, Support pokračuje dle standardního SLA
- **AND** AuditRecord obsahuje "timeout_fallback"

---

**AC-D08** — Decision: ERP nedostupnost (KCS-08)
**Zdroj:** KCS-08 / SCR-05, SCR-07
**Priorita:** High | **Typ:** Decision

- **GIVEN** Sales klikne "Uzavřít obchod" ale ERP je nedostupný (poslední sync před 6h)
- **WHEN** systém detekuje nedostupnost ERP
- **THEN** systém zobrazí varování "Data pohledávek nemusí být aktuální — poslední synchronizace: [6h ago]" a notifikuje Finance Controller
- **AND** Finance Controller může ručně rozhodnout na základě posledních známých dat

---

### Modul: RBAC & Security

**AC-18** — Sales nemůže přistoupit k datům jiného regionu
**Zdroj:** UC-02 / SCR-04
**Priorita:** High | **Typ:** Abuse

- **GIVEN** Sales je přiřazen k regionu CZ
- **WHEN** se pokusí zobrazit pipeline regionu DE
- **THEN** systém vrátí prázdný výsledek (nebo chybu "Nemáte oprávnění pro tento region")
- **AND** pokus je zaznamenán v AuditRecord

---

**AC-19** — Finance Controller nemůže uvolnit vlastní deal (four-eyes)
**Zdroj:** UC-03 / SCR-07
**Priorita:** High | **Typ:** Abuse

- **GIVEN** Finance Controller je zároveň Sales Manager v malém regionu a vytvořil Opportunity
- **WHEN** se pokusí uvolnit Finance blokaci na vlastní deal
- **THEN** systém odmítne akci "Nelze rozhodnout o vlastním dealu — vyžadován jiný Finance Controller"
- **AND** AuditRecord zaznamená pokus o porušení four-eyes principle

---

## 3. Out of Scope & Identifikované GAPs

### 3.1 Delegováno na Technické QA

| Funkcionalita | Důvod | Doporučený test |
|---------------|-------|-----------------|
| ERP synchronizace (cron/webhook) | Backend bez UI | Integration Test |
| AuditRecord konzistence (SR-10: synchronní zápis) | Backend transakční logika | Unit Test + DB Test |
| Session timeout (30 min) | Server-side | Automated Functional Test |
| SLA countdown cron job | Backend scheduler | Integration Test |
| Contract expiry batch (denní) | Backend scheduler | Integration Test |
| Database failover | Infrastruktura | Disaster Recovery Test |
| SSO integrace | Externí systém | Integration Test |

### 3.2 Identifikované GAPs

| GAP | PAB Reference | Závažnost |
|-----|---------------|-----------|
| PAB nedefinuje, co se stane s Opportunity, pokud zákazník (Customer entity) je deaktivován během otevřeného dealu | UC-02, Customer entity | Střední |
| PAB nedefinuje maximální počet kontaktů per Customer (limit nebo neomezeno?) | UC-01, SCR-03 | Nízká |
| PAB nedefinuje chování, pokud Legal neschválí smlouvu do 120h (zmíněno v eskalačním modelu, ale chybí explicitní flow v UC-04) | UC-04, KCS odpovídající | Střední |

---

## MACHINE_DATA
```json
{
  "_meta": {
    "project_id": "CRM_Korporat",
    "agent": "uat_bdd_generator",
    "version": "v1",
    "iteration": 1
  },
  "global_acceptance_criteria": [
    {"id": "GAC-01", "criterion": "Systém musí být dostupný 99.5 % pracovní doby.", "measurable_metric": "Uptime >= 99.5 % měsíčně", "source": "PAB NFR"},
    {"id": "GAC-02", "criterion": "Doba načtení stránky nesmí překročit 2 sekundy.", "measurable_metric": "Page load <= 2s (P95)", "source": "PAB NFR"},
    {"id": "GAC-03", "criterion": "Vyhledávání zákazníka musí vrátit výsledky do 1 sekundy.", "measurable_metric": "Search latency <= 1s (P95)", "source": "PAB NFR"},
    {"id": "GAC-04", "criterion": "Každá změna dat musí mít audit trail.", "measurable_metric": "100 % mutací má AuditRecord", "source": "PAB INV-01"},
    {"id": "GAC-05", "criterion": "Systém musí podporovat 2000+ současně přihlášených uživatelů.", "measurable_metric": "Concurrent users >= 2000", "source": "PAB NFR"},
    {"id": "GAC-06", "criterion": "RBAC matice (role × region) musí být vynucena.", "measurable_metric": "0 neoprávněných přístupů", "source": "PAB SR-03"},
    {"id": "GAC-07", "criterion": "Autentizace výhradně přes SSO.", "measurable_metric": "0 lokálních účtů", "source": "PAB SR-01"},
    {"id": "GAC-08", "criterion": "PII data musí být označena a chráněna dle GDPR.", "measurable_metric": "Všechna PII pole mají is_pii flag", "source": "PAB NFR"}
  ],
  "business_scenarios": [
    {"scenario_id": "AC-01", "module": "Customer 360", "priority": "High", "source_use_case_id": "UC-01", "source_ui_screen_id": "SCR-02", "type": "Happy Path", "bdd_steps": {"given": "Zákazník existuje v systému s aktivními smlouvami, příležitostmi a support cases.", "when": "Account Manager otevře profil zákazníka.", "then": "Systém zobrazí kompletní Customer 360 se všemi sekcemi.", "and": ["Všechny sekce zobrazují aktuální data."]}},
    {"scenario_id": "AC-02", "module": "Customer 360", "priority": "High", "source_use_case_id": "UC-01", "source_ui_screen_id": "SCR-03", "type": "Edge Case", "bdd_steps": {"given": "Dva Account Manageři otevřeli editaci stejného zákazníka.", "when": "Oba uloží změny s konfliktem.", "then": "Systém detekuje optimistic lock konflikt a zobrazí merge dialog.", "and": ["AuditRecord zaznamená výsledek merge."]}},
    {"scenario_id": "AC-03", "module": "Customer 360", "priority": "Medium", "source_use_case_id": "UC-01", "source_ui_screen_id": "SCR-03", "type": "Negative", "bdd_steps": {"given": "Account Manager edituje zákazníka v regionu DE.", "when": "Zadá neplatný VAT ID.", "then": "Systém zobrazí inline chybu a neumožní uložení.", "and": ["Žádná změna se nepromítne do databáze."]}},
    {"scenario_id": "AC-04", "module": "Pipeline", "priority": "High", "source_use_case_id": "UC-02", "source_ui_screen_id": "SCR-05", "type": "Happy Path", "bdd_steps": {"given": "Opportunity je ve stavu negotiation a zákazník nemá pohledávky.", "when": "Sales klikne Uzavřít obchod.", "then": "Finance Gate projde, Opportunity přejde do closed_won.", "and": ["AM obdrží notifikaci.", "AuditRecord zaznamená přechod."]}},
    {"scenario_id": "AC-05", "module": "Pipeline", "priority": "High", "source_use_case_id": "UC-02", "source_ui_screen_id": "SCR-05", "type": "Negative", "bdd_steps": {"given": "Opportunity je ve stavu negotiation a zákazník má pohledávku.", "when": "Sales klikne Uzavřít obchod.", "then": "Opportunity přejde do finance_review, Finance Controller notifikován.", "and": ["Sales obdrží informaci o blokaci."]}},
    {"scenario_id": "AC-06", "module": "Pipeline", "priority": "Low", "source_use_case_id": "UC-02", "source_ui_screen_id": "SCR-05", "type": "Edge Case", "bdd_steps": {"given": "Sales vytváří novou Opportunity.", "when": "Zadá hodnotu 999M EUR.", "then": "Systém zobrazí varování ale umožní uložení.", "and": ["AuditRecord zaznamená varování."]}},
    {"scenario_id": "AC-07", "module": "Finance Gate", "priority": "High", "source_use_case_id": "UC-03", "source_ui_screen_id": "SCR-07", "type": "Happy Path", "bdd_steps": {"given": "Opportunity je ve finance_review.", "when": "Finance Controller zvolí Uvolnit s odůvodněním.", "then": "Opportunity přejde do closed_won, notifikace odeslány.", "and": ["AuditRecord zaznamená rozhodnutí."]}},
    {"scenario_id": "AC-08", "module": "Finance Gate", "priority": "Medium", "source_use_case_id": "UC-03", "source_ui_screen_id": "SCR-07", "type": "Negative", "bdd_steps": {"given": "Finance Controller rozhoduje o dealu.", "when": "Zadá odůvodnění kratší než 10 znaků.", "then": "Systém zobrazí chybu a neumožní uložení.", "and": []}},
    {"scenario_id": "AC-09", "module": "Smlouvy", "priority": "High", "source_use_case_id": "UC-04", "source_ui_screen_id": "SCR-09", "type": "Happy Path", "bdd_steps": {"given": "Zákazník má uzavřený deal.", "when": "AM vytvoří smlouvu a odešle ke schválení Legal.", "then": "Smlouva přejde do pending_legal, Legal notifikován.", "and": ["Po schválení přejde do active."]}},
    {"scenario_id": "AC-10", "module": "Smlouvy", "priority": "Medium", "source_use_case_id": "UC-04", "source_ui_screen_id": "SCR-09", "type": "Negative", "bdd_steps": {"given": "Smlouva je ve stavu pending_legal.", "when": "Legal zamítne s komentářem.", "then": "Smlouva se vrátí do draft, AM notifikován.", "and": ["AuditRecord zaznamená zamítnutí s komentářem."]}},
    {"scenario_id": "AC-11", "module": "Support", "priority": "High", "source_use_case_id": "UC-05", "source_ui_screen_id": "SCR-11", "type": "Happy Path", "bdd_steps": {"given": "Zákazník má aktivní smlouvu s SLA 4h.", "when": "Support Agent vytvoří case.", "then": "Systém vypočte SLA deadline a přidělí agentovi.", "and": ["Po vyřešení a potvrzení case přejde do closed."]}},
    {"scenario_id": "AC-12", "module": "Support", "priority": "High", "source_use_case_id": "UC-05", "source_ui_screen_id": "SCR-11", "type": "Edge Case", "bdd_steps": {"given": "Support case je ve stavu in_progress, SLA zbývá 30 min.", "when": "Systém detekuje blížící se deadline.", "then": "Systém zobrazí WarningBanner a notifikuje Support Lead.", "and": ["Po překročení case přejde do escalated."]}},
    {"scenario_id": "AC-13", "module": "Support", "priority": "Medium", "source_use_case_id": "UC-05", "source_ui_screen_id": "SCR-11", "type": "Edge Case", "bdd_steps": {"given": "Zákazník nemá aktivní smlouvu.", "when": "Support Agent vytvoří case.", "then": "Systém zobrazí upozornění a aplikuje default SLA.", "and": []}},
    {"scenario_id": "AC-14", "module": "Konflikty", "priority": "High", "source_use_case_id": "UC-06", "source_ui_screen_id": "SCR-12a", "type": "Happy Path", "bdd_steps": {"given": "Systém detekoval konflikt deal_vs_finance.", "when": "AM zvolí variantu a zadá odůvodnění (min 20 znaků).", "then": "Konflikt přejde do resolved, entity aktualizovány.", "and": ["Všechny strany notifikovány.", "AuditRecord kompletní."]}},
    {"scenario_id": "AC-15", "module": "Konflikty", "priority": "Medium", "source_use_case_id": "UC-06", "source_ui_screen_id": "SCR-12a", "type": "Negative", "bdd_steps": {"given": "Konflikt je ve stavu awaiting_decision.", "when": "Role nezadá odůvodnění.", "then": "Systém zobrazí chybu a neumožní rozhodnutí.", "and": []}},
    {"scenario_id": "AC-16", "module": "Audit", "priority": "High", "source_use_case_id": "UC-07", "source_ui_screen_id": "SCR-13", "type": "Happy Path", "bdd_steps": {"given": "Management chce export auditních záznamů.", "when": "Nastaví filtry a klikne Export CSV.", "then": "Systém vygeneruje CSV se záznamy.", "and": ["Export je zaznamenán v AuditRecord."]}},
    {"scenario_id": "AC-17", "module": "Audit", "priority": "Low", "source_use_case_id": "UC-07", "source_ui_screen_id": "SCR-13", "type": "Negative", "bdd_steps": {"given": "Uživatel otevře Audit Log.", "when": "Klikne Filtrovat bez nastavení filtru.", "then": "Systém zobrazí chybu.", "and": []}},
    {"scenario_id": "AC-D01", "module": "Decision", "priority": "High", "source_use_case_id": "UC-03", "source_ui_screen_id": "SCR-07", "type": "Decision", "bdd_steps": {"given": "Opportunity ve finance_review, Finance Controller vidí pohledávku.", "when": "Finance Controller zvolí Uvolnit s odůvodněním.", "then": "Opportunity do closed_won, stav z transient do resolved.", "and": ["AuditRecord: kdo, kdy, varianta, zdůvodnění."]}},
    {"scenario_id": "AC-D02", "module": "Decision", "priority": "High", "source_use_case_id": "UC-03", "source_ui_screen_id": "SCR-06", "type": "Decision", "bdd_steps": {"given": "Opportunity ve finance_review déle než 72h.", "when": "Systém detekuje SLA timeout.", "then": "Automatická eskalace na Finance Manager, po 24h na VP.", "and": ["AuditRecord obsahuje timeout_fallback."]}},
    {"scenario_id": "AC-D03", "module": "Decision", "priority": "High", "source_use_case_id": "UC-06", "source_ui_screen_id": "SCR-12a", "type": "Decision", "bdd_steps": {"given": "Regional Director požádal o výjimku z globálních pravidel.", "when": "VP Operations schválí s časovým omezením.", "then": "Výjimka zaznamenána s platností, entity aktualizovány.", "and": ["AuditRecord: schválení + časové omezení."]}},
    {"scenario_id": "AC-D04", "module": "Decision", "priority": "High", "source_use_case_id": "UC-06", "source_ui_screen_id": "SCR-12a", "type": "Decision", "bdd_steps": {"given": "Žádost o regionální výjimku čeká na VP déle než 7 dní.", "when": "Systém detekuje timeout.", "then": "Žádost automaticky zamítnuta.", "and": ["AuditRecord obsahuje timeout_fallback."]}},
    {"scenario_id": "AC-D05", "module": "Decision", "priority": "High", "source_use_case_id": "UC-05", "source_ui_screen_id": "SCR-11", "type": "Decision", "bdd_steps": {"given": "Support nahlásil dispute — zákazník vs. smlouva.", "when": "AM rozhodne: platí smlouva.", "then": "Dispute vyřešen, Support pokračuje dle smlouvy.", "and": ["AuditRecord zaznamená rozhodnutí."]}},
    {"scenario_id": "AC-D06", "module": "Decision", "priority": "High", "source_use_case_id": "UC-05", "source_ui_screen_id": "SCR-11", "type": "Decision", "bdd_steps": {"given": "Support požádal o SLA výjimku.", "when": "Legal schválí s časovým omezením.", "then": "SLA výjimka zaznamenána, Support pokračuje s rozšířeným SLA.", "and": ["AuditRecord: schválení + podmínky."]}},
    {"scenario_id": "AC-D07", "module": "Decision", "priority": "High", "source_use_case_id": "UC-05", "source_ui_screen_id": "SCR-11", "type": "Decision", "bdd_steps": {"given": "Žádost o SLA výjimku čeká na Legal déle než 48h.", "when": "Systém detekuje timeout.", "then": "Výjimka automaticky zamítnuta, Support pokračuje dle standardního SLA.", "and": ["AuditRecord obsahuje timeout_fallback."]}},
    {"scenario_id": "AC-D08", "module": "Decision", "priority": "High", "source_use_case_id": "UC-02", "source_ui_screen_id": "SCR-05", "type": "Decision", "bdd_steps": {"given": "Sales chce uzavřít obchod, ERP je nedostupný.", "when": "Systém detekuje nedostupnost ERP.", "then": "Systém zobrazí varování o stáří dat, notifikuje Finance Controller.", "and": ["Finance Controller může ručně rozhodnout."]}},
    {"scenario_id": "AC-18", "module": "RBAC", "priority": "High", "source_use_case_id": "UC-02", "source_ui_screen_id": "SCR-04", "type": "Abuse", "bdd_steps": {"given": "Sales je přiřazen k regionu CZ.", "when": "Pokusí se zobrazit pipeline regionu DE.", "then": "Systém vrátí prázdný výsledek nebo chybu.", "and": ["Pokus zaznamenán v AuditRecord."]}},
    {"scenario_id": "AC-19", "module": "RBAC", "priority": "High", "source_use_case_id": "UC-03", "source_ui_screen_id": "SCR-07", "type": "Abuse", "bdd_steps": {"given": "Finance Controller vytvořil Opportunity (zároveň Sales Manager).", "when": "Pokusí se uvolnit blokaci na vlastní deal.", "then": "Systém odmítne akci (four-eyes principle).", "and": ["AuditRecord zaznamená pokus o porušení."]}},
    {"scenario_id": "AC-20", "module": "Audit", "priority": "High", "source_use_case_id": "UC-07", "source_ui_screen_id": "SCR-13", "type": "Abuse", "bdd_steps": {"given": "Uživatel s rolí Sales.", "when": "Pokusí se smazat nebo editovat AuditRecord.", "then": "Systém odmítne operaci (append-only invariant INV-01).", "and": ["Pokus zaznamenán v AuditRecord."]}}
  ],
  "out_of_scope_for_uat": [
    {"functionality": "ERP synchronizace (cron/webhook)", "reason": "Backend bez UI", "recommended_tech_qa": "Integration Test"},
    {"functionality": "AuditRecord synchronní zápis (SR-10)", "reason": "Transakční logika", "recommended_tech_qa": "Unit Test + DB Test"},
    {"functionality": "Session timeout 30 min", "reason": "Server-side", "recommended_tech_qa": "Automated Functional Test"},
    {"functionality": "SLA countdown cron job", "reason": "Backend scheduler", "recommended_tech_qa": "Integration Test"},
    {"functionality": "Contract expiry batch", "reason": "Backend scheduler", "recommended_tech_qa": "Integration Test"},
    {"functionality": "Database failover", "reason": "Infrastruktura", "recommended_tech_qa": "DR Test"},
    {"functionality": "SSO integrace", "reason": "Externí systém", "recommended_tech_qa": "Integration Test"}
  ],
  "identified_gaps": [
    {"gap": "Co se stane s Opportunity, pokud Customer entity je deaktivována během otevřeného dealu?", "pab_ref": "UC-02, Customer entity", "severity": "Medium"},
    {"gap": "Maximální počet kontaktů per Customer — limit nebo neomezeno?", "pab_ref": "UC-01, SCR-03", "severity": "Low"},
    {"gap": "Explicitní flow pro Legal timeout 120h v UC-04 chybí (zmíněno v eskalačním modelu)", "pab_ref": "UC-04, Contract lifecycle", "severity": "Medium"}
  ],
  "coverage_check": {
    "use_cases_covered": ["UC-01", "UC-02", "UC-03", "UC-04", "UC-05", "UC-06", "UC-07"],
    "use_cases_missing": [],
    "screens_covered": ["SCR-02", "SCR-03", "SCR-04", "SCR-05", "SCR-06", "SCR-07", "SCR-09", "SCR-11", "SCR-12a", "SCR-13"],
    "screens_missing": ["SCR-01", "SCR-08", "SCR-10", "SCR-12"],
    "decision_strategies_covered": ["KCS-02", "KCS-03", "KCS-04", "KCS-05", "KCS-08"],
    "decision_strategies_missing": []
  }
}
```
