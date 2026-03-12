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
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/borrowers', label: 'Borrowers', icon: Users },
    { path: '/lenders', label: 'Lenders', icon: Landmark },
    { path: '/create-loan', label: 'Create Loan', icon: Plus },
    { path: '/current-loans', label: 'Current Loans', icon: TrendingUp },
    { path: '/interest-records', label: 'Interest Records', icon: DollarSign },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold">MoneyLend</h1>
        <p className="text-slate-400 text-sm">Loan Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
