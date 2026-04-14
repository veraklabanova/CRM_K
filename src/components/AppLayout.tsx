// ============================================================
// EnterpriseCRM — AppLayout
// Main application layout: header + sidebar + content area
// Uses RoleContext for navigation filtering and DecisionContext
// for decision log badge count.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useRole, ALL_ROLES } from '../context/RoleContext';
import { useDecision } from '../context/DecisionContext';
import { useDemoTour } from '../tour/DemoWalkthrough';
import type { Role } from '../data/types';

// ---------------------------------------------------------------------------
// Navigation item definitions — map screen IDs to paths and labels
// ---------------------------------------------------------------------------

interface NavItem {
  screenId: string;
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { screenId: 'SCR-01', path: '/', label: 'Dashboard', icon: '\u{1F4CA}' },
  { screenId: 'SCR-02', path: '/customers/CUS-001', label: 'Zákazníci', icon: '\u{1F465}' },
  { screenId: 'SCR-04', path: '/pipeline', label: 'Pipeline', icon: '\u{1F4C8}' },
  { screenId: 'SCR-06', path: '/finance-reviews', label: 'Finance Review', icon: '\u{1F4B0}' },
  { screenId: 'SCR-08', path: '/contracts', label: 'Smlouvy', icon: '\u{1F4DD}' },
  { screenId: 'SCR-10', path: '/support-cases', label: 'Podpora', icon: '\u{1F6E0}' },
  { screenId: 'SCR-12', path: '/conflicts', label: 'Konflikty', icon: '\u{26A0}' },
  { screenId: 'SCR-13', path: '/audit-log', label: 'Audit Log', icon: '\u{1F4CB}' },
];

// ---------------------------------------------------------------------------
// Pulsating dot styles (CSS-in-JS keyframes injected once)
// ---------------------------------------------------------------------------

const PULSE_KEYFRAMES = `
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.5; }
}
`;

const ROLE_SWITCHER_SEEN_KEY = 'role_switcher_seen';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AppLayout: React.FC = () => {
  const { currentRole, setCurrentRole, hasAccess } = useRole();
  const { decisions } = useDecision();
  const { startTour } = useDemoTour();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleSwitcherSeen, setRoleSwitcherSeen] = useState(() => {
    return localStorage.getItem(ROLE_SWITCHER_SEEN_KEY) === 'true';
  });

  // Inject pulse keyframes once
  useEffect(() => {
    const styleId = 'pulse-dot-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = PULSE_KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const role = e.target.value as Role;
      setCurrentRole(role);
      if (!roleSwitcherSeen) {
        localStorage.setItem(ROLE_SWITCHER_SEEN_KEY, 'true');
        setRoleSwitcherSeen(true);
      }
    },
    [setCurrentRole, roleSwitcherSeen],
  );

  const handleRoleSwitcherInteraction = useCallback(() => {
    if (!roleSwitcherSeen) {
      localStorage.setItem(ROLE_SWITCHER_SEEN_KEY, 'true');
      setRoleSwitcherSeen(true);
    }
  }, [roleSwitcherSeen]);

  // Filter nav items by role access
  const visibleNavItems = NAV_ITEMS.filter((item) => hasAccess(item.screenId));

  const decisionCount = decisions.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ================================================================= */}
      {/* Header                                                            */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: app name (no logo!) + mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-lg font-bold text-gray-900 select-none">
              EnterpriseCRM
            </span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-3">
            {/* Decision Log button with badge */}
            <button
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Decision Log"
            >
              Decision Log
              {decisionCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {decisionCount}
                </span>
              )}
            </button>

            {/* Demo walkthrough button */}
            <button
              onClick={startTour}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Demo průchod
            </button>

            {/* Role switcher with pulsating dot */}
            <div
              className="relative flex items-center gap-2"
              onClick={handleRoleSwitcherInteraction}
            >
              {!roleSwitcherSeen && (
                <div className="relative group">
                  <span
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full"
                    style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
                  />
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 translate-x-4 hidden group-hover:block whitespace-nowrap bg-gray-800 text-white text-xs rounded px-2 py-1 z-50">
                    Přepněte roli
                  </span>
                </div>
              )}
              <select
                value={currentRole}
                onChange={handleRoleChange}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ================================================================= */}
        {/* Sidebar overlay (mobile)                                          */}
        {/* ================================================================= */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ================================================================= */}
        {/* Sidebar                                                           */}
        {/* ================================================================= */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:flex lg:flex-col
            pt-14 lg:pt-0
          `}
        >
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.screenId}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Current role indicator at bottom of sidebar */}
          <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
            Role: <span className="font-semibold text-gray-700">{currentRole}</span>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* Main content area                                                 */}
        {/* ================================================================= */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
