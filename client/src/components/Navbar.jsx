import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from './SidebarContext';

export const Navbar = () => {
  const navigate = useNavigate();
  const { setIsOpen } = useSidebar();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 lg:left-64 h-16 z-20 flex items-center justify-between px-4 sm:px-6">
      {/* Hamburger (mobile/tablet only) */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden text-gray-600 hover:text-gray-900 mr-3 p-1 rounded transition"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Spacer so logout sits on the right */}
      <div className="flex-1" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
      >
        <LogOut size={17} />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </nav>
  );
};

export default Navbar;
