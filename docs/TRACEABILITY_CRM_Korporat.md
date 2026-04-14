# TRACEABILITY MATRIX — CRM Korporát

Vygenerováno programaticky z MACHINE_DATA IDček.

## Use Case → Screen → FR → AC → API → DB

| UC | SCR | FR | AC (Happy) | AC (Negative/Edge) | AC (Decision) | API | DB Tables |
|----|-----|-----|------------|-------------------|---------------|-----|-----------|
| UC-01 | SCR-02, SCR-03 | FR-01, FR-02 | AC-01 | AC-02, AC-03 | — | GET/PUT /customers/{id} | customers, contacts, audit_records |
| UC-02 | SCR-04, SCR-05 | FR-03 | AC-04 | AC-05, AC-06 | AC-D08 | GET/POST /opportunities, POST /opportunities/{id}/close | opportunities, audit_records |
| UC-03 | SCR-06, SCR-07 | FR-04 | AC-07 | AC-08 | AC-D01, AC-D02 | GET /finance-reviews, POST /finance-reviews/{id}/decide | opportunities, conflicts, audit_records |
| UC-04 | SCR-08, SCR-09 | FR-05 | AC-09 | AC-10 | — | GET/POST /contracts, POST /contracts/{id}/submit-legal, POST /contracts/{id}/approve | contracts, audit_records |
| UC-05 | SCR-10, SCR-11 | FR-06 | AC-11 | AC-12, AC-13 | AC-D05, AC-D06, AC-D07 | GET/POST /support-cases | support_cases, contracts, audit_records |
| UC-06 | SCR-12, SCR-12a | FR-07 | AC-14 | AC-15 | AC-D03, AC-D04 | GET /conflicts, POST /conflicts/{id}/resolve | conflicts, audit_records |
| UC-07 | SCR-13 | FR-08 | AC-16 | AC-17 | — | GET /audit-records, POST /audit-records/export | audit_records |

## KCS → Decision Strategy → FR (DH) → BDD (AC-D)

| KCS | Decision Strategy | FR/DH | BDD Decision Scénář |
|-----|-------------------|-------|---------------------|
| KCS-01 | preventive_guard | DH-01 / FR-02 | AC-02 |
| KCS-02 | manual_escalation | DH-02 / FR-04 | AC-D01, AC-D02 |
| KCS-03 | manual_escalation | DH-03 / FR-07 | AC-D03, AC-D04 |
| KCS-04 | manual_escalation | DH-04 / FR-06 | AC-D05 |
| KCS-05 | manual_escalation | DH-05 / FR-06 | AC-D06, AC-D07 |
| KCS-06 | correction_record | DH-06 / FR-05 | — |
| KCS-07 | automatic | DH-07 / FR-04 | — |
| KCS-08 | manual_escalation | DH-08 / FR-04 | AC-D08 |

## RBAC × Security Scénáře

| Scénář | UC | BDD |
|--------|-----|-----|
| Sales nemůže přistoupit k datům jiného regionu | UC-02 | AC-18 |
| Four-eyes principle na Finance Gate | UC-03 | AC-19 |
| AuditRecord append-only (nelze mazat) | UC-07 | AC-20 |

## GAPs

| GAP | Zdroj | Závažnost |
|-----|-------|-----------|
| Customer deaktivace během otevřeného dealu | UAT GAP | Střední |
| Max počet kontaktů per Customer | UAT GAP | Nízká |
| Legal timeout 120h explicitní flow | UAT GAP | Střední |
| KCS-06 (Data finality) nemá dedikovaný BDD scénář | Traceability | Nízká — pokryto implicitně v UC-04 amendment workflow |
