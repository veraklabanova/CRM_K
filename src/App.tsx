import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext'
import { DecisionProvider } from './context/DecisionContext'
import { DemoTourProvider, DemoWalkthrough } from './tour/DemoWalkthrough'
import { ToastProvider } from './components/Toast'
import NdaModal from './components/NdaModal'
import AppLayout from './components/AppLayout'
import { Dashboard } from './screens/SCR01_Dashboard'
import { Customer360 } from './screens/SCR02_Customer360'
import { CustomerEdit } from './screens/SCR03_CustomerEdit'
import { PipelineOverview } from './screens/SCR04_PipelineOverview'
import { OpportunityDetail } from './screens/SCR05_OpportunityDetail'
import { FinanceReviewQueue } from './screens/SCR06_FinanceReviewQueue'
import { FinanceGateDecision } from './screens/SCR07_FinanceGateDecision'
import { ContractsList } from './screens/SCR08_ContractsList'
import { ContractDetail } from './screens/SCR09_ContractDetail'
import { SupportCasesList } from './screens/SCR10_SupportCasesList'
import { SupportCaseDetail } from './screens/SCR11_SupportCaseDetail'
import { ConflictPanel } from './screens/SCR12_ConflictPanel'
import { ConflictResolution } from './screens/SCR12a_ConflictResolution'
import { AuditLog } from './screens/SCR13_AuditLog'

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <DecisionProvider>
          <ToastProvider>
          <DemoTourProvider>
          <NdaModal />
          <DemoWalkthrough />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers/:id" element={<Customer360 />} />
              <Route path="/customers/:id/edit" element={<CustomerEdit />} />
              <Route path="/pipeline" element={<PipelineOverview />} />
              <Route path="/opportunities/:id" element={<OpportunityDetail />} />
              <Route path="/finance-reviews" element={<FinanceReviewQueue />} />
              <Route path="/finance-reviews/:id" element={<FinanceGateDecision />} />
              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/support-cases" element={<SupportCasesList />} />
              <Route path="/support-cases/:id" element={<SupportCaseDetail />} />
              <Route path="/conflicts" element={<ConflictPanel />} />
              <Route path="/conflicts/:id" element={<ConflictResolution />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </DemoTourProvider>
          </ToastProvider>
        </DecisionProvider>
      </RoleProvider>
    </BrowserRouter>
  )
}
