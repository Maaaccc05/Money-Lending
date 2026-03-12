import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Landmark,
  Plus,
  TrendingUp,
  DollarSign,
  BarChart3,
  X,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

export const Sidebar = () => {
  const location = useLocation();
  const { isOpen, setIsOpen } = useSidebar();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/borrowers', label: 'Borrowers', icon: Users },
    { path: '/lenders', label: 'Lenders', icon: Landmark },
    { path: '/create-loan', label: 'Create Loan', icon: Plus },
    { path: '/current-loans', label: 'Current Loans', icon: TrendingUp },
    { path: '/interest-records', label: 'Interest Records', icon: DollarSign },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const close = () => setIsOpen(false);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 shrink-0">
          <div>
            <h1 className="text-2xl font-bold leading-none">MoneyLend</h1>
            <p className="text-slate-400 text-sm mt-0.5">Loan Management</p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={close}
            className="lg:hidden text-slate-400 hover:text-white transition p-1 rounded"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={close}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
