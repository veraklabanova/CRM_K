// ============================================================
// EnterpriseCRM — RoleContext
// Phase D: Role switcher context with navigation access control
// ============================================================

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Role, User, Region } from '../data/types';

// ---------------------------------------------------------------------------
// Default users per role (will be replaced by seed data import in Phase F)
// ---------------------------------------------------------------------------

const DEFAULT_USERS: Record<Role, User> = {
  'Account Manager': {
    id: 'USR-001',
    name: 'Jana Novakova',
    email: 'jana.novakova@enterprise.cz',
    role: 'Account Manager',
    region: 'CZ',
  },
  Sales: {
    id: 'USR-002',
    name: 'Martin Dvorak',
    email: 'martin.dvorak@enterprise.cz',
    role: 'Sales',
    region: 'CZ',
  },
  'Finance Controller': {
    id: 'USR-003',
    name: 'Petra Svobodova',
    email: 'petra.svobodova@enterprise.cz',
    role: 'Finance Controller',
    region: 'CZ',
  },
  'Support Agent': {
    id: 'USR-004',
    name: 'Tomas Kral',
    email: 'tomas.kral@enterprise.cz',
    role: 'Support Agent',
    region: 'CZ',
  },
  'Legal/Compliance': {
    id: 'USR-005',
    name: 'Eva Prochazkova',
    email: 'eva.prochazkova@enterprise.cz',
    role: 'Legal/Compliance',
    region: 'CZ',
  },
  Management: {
    id: 'USR-006',
    name: 'Karel Horak',
    email: 'karel.horak@enterprise.cz',
    role: 'Management',
    region: 'CZ',
  },
  'Regional Director': {
    id: 'USR-007',
    name: 'Lucie Nemcova',
    email: 'lucie.nemcova@enterprise.cz',
    role: 'Regional Director',
    region: 'DE',
  },
};

// ---------------------------------------------------------------------------
// Navigation access mapping — which screens each role can access
// ---------------------------------------------------------------------------

const NAVIGATION_BY_ROLE: Record<Role, string[]> = {
  'Account Manager': [
    'SCR-01', 'SCR-02', 'SCR-03', 'SCR-04', 'SCR-05',
    'SCR-08', 'SCR-09', 'SCR-10', 'SCR-11', 'SCR-12', 'SCR-12a',
  ],
  Sales: ['SCR-01', 'SCR-02', 'SCR-04', 'SCR-05', 'SCR-10'],
  'Finance Controller': ['SCR-01', 'SCR-02', 'SCR-06', 'SCR-07', 'SCR-13'],
  'Support Agent': ['SCR-01', 'SCR-02', 'SCR-10', 'SCR-11', 'SCR-12'],
  'Legal/Compliance': ['SCR-01', 'SCR-02', 'SCR-08', 'SCR-09', 'SCR-13'],
  Management: ['SCR-01', 'SCR-02', 'SCR-04', 'SCR-06', 'SCR-12', 'SCR-12a', 'SCR-13'],
  'Regional Director': ['SCR-01', 'SCR-02', 'SCR-04', 'SCR-05', 'SCR-12', 'SCR-12a'],
};

// ---------------------------------------------------------------------------
// Readonly screen mapping — screens a role can see but not edit
// ---------------------------------------------------------------------------

export const READONLY_SCREENS: Record<Role, string[]> = {
  'Account Manager': [],
  Sales: ['SCR-02', 'SCR-10'],
  'Finance Controller': ['SCR-02'],
  'Support Agent': ['SCR-02'],
  'Legal/Compliance': ['SCR-02'],
  Management: ['SCR-04', 'SCR-06'],
  'Regional Director': [],
};

// ---------------------------------------------------------------------------
// All available roles (for role switcher UI)
// ---------------------------------------------------------------------------

export const ALL_ROLES: Role[] = [
  'Account Manager',
  'Sales',
  'Finance Controller',
  'Support Agent',
  'Legal/Compliance',
  'Management',
  'Regional Director',
];

// ---------------------------------------------------------------------------
// Context type and creation
// ---------------------------------------------------------------------------

interface RoleContextValue {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentUser: User;
  hasAccess: (screenId: string) => boolean;
  isReadonly: (screenId: string) => boolean;
  accessibleScreens: string[];
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface RoleProviderProps {
  children: React.ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<Role>('Account Manager');

  const currentUser = useMemo(() => DEFAULT_USERS[currentRole], [currentRole]);

  const accessibleScreens = useMemo(
    () => NAVIGATION_BY_ROLE[currentRole] ?? [],
    [currentRole],
  );

  const hasAccess = useCallback(
    (screenId: string): boolean => accessibleScreens.includes(screenId),
    [accessibleScreens],
  );

  const isReadonly = useCallback(
    (screenId: string): boolean => {
      const readonlyList = READONLY_SCREENS[currentRole] ?? [];
      return readonlyList.includes(screenId);
    },
    [currentRole],
  );

  const value = useMemo<RoleContextValue>(
    () => ({
      currentRole,
      setCurrentRole,
      currentUser,
      hasAccess,
      isReadonly,
      accessibleScreens,
    }),
    [currentRole, currentUser, hasAccess, isReadonly, accessibleScreens],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

export default RoleContext;
