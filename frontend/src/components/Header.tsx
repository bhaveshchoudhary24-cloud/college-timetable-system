"use client";

import { useState, useRef, useEffect } from 'react';
import { Bell, ShieldCheck, Calendar, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Header() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Workload Engine Validated', message: '100% Workload coverage (359/359 class hrs + 8 project hrs, 0 conflicts).', time: '10m ago', read: false, type: 'success' },
    { id: '2', title: 'System Configuration', message: 'Working days set to Mon–Sat (6 slots/day).', time: '1h ago', read: false, type: 'info' },
    { id: '3', title: 'Subject Audit Complete', message: '41 Canonical subjects linked to 78 assignments.', time: '2h ago', read: true, type: 'success' },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    logout();
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="bg-white dark:bg-[#131b2e] border-b border-[#E5E7EB] dark:border-[#1e293b] shadow-xs sticky top-0 z-40 print:hidden transition-colors duration-200">
      {/* Top MMIT Red Accent Bar */}
      <div className="h-1.5 bg-[#C8102E] w-full" />

      {/* Main College Branding Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Official College Logo + Title */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Logo container using user PNG asset directly */}
          <div className="shrink-0 bg-white p-1 rounded-md flex items-center justify-center shadow-xs">
            <img
              src="/logo.png"
              alt="MMIT College Logo Emblem"
              className="h-16 w-auto sm:h-20 object-contain block"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/mmit-logo.png';
              }}
            />
          </div>

          {/* College Name & Tagline Hierarchy */}
          <div className="flex flex-col justify-center">
            <div className="text-xs sm:text-sm font-bold text-[#222222] dark:text-slate-100 tracking-wider uppercase leading-snug">
              MARATHWADA MITRAMANDAL'S
            </div>
            <div className="text-base sm:text-xl font-extrabold text-[#C8102E] tracking-tight uppercase leading-tight mt-0.5">
              INSTITUTE OF TECHNOLOGY (MMIT)
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#666666] dark:text-slate-400">
              <span className="italic font-medium">“Techno-social Excellence”</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Est. 1967</span>
              <span className="hidden lg:inline-block text-slate-300 dark:text-slate-600">•</span>
              <span className="hidden lg:inline-block text-slate-500 dark:text-slate-400 font-medium">Lohgaon, Pune – 411047</span>
            </div>
          </div>
        </div>

        {/* Vertical Divider for desktop */}
        <div className="hidden md:block h-12 w-px bg-[#E5E7EB] dark:bg-[#1e293b]" />

        {/* Right: Application Controls */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          {/* Academic Year Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F9FA] dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-[#334155] rounded-md text-xs font-semibold text-[#222222] dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-[#C8102E]" />
            <span>AY 2026–27</span>
          </div>

          {/* Dark / Light Theme Toggle */}
          <ThemeToggle />

          {/* Notifications Dropdown Container */}
          <div className="relative" ref={notifRef}>
            <button 
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-md hover:bg-[#F8F9FA] dark:hover:bg-slate-800 text-[#666666] dark:text-slate-300 hover:text-[#C8102E] dark:hover:text-red-400 transition-colors relative border border-transparent hover:border-[#E5E7EB] dark:hover:border-slate-700 cursor-pointer"
              title="System Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#C8102E] text-white text-[9px] font-black rounded-full shadow-2xs min-w-[16px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Window */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#131b2e] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fadeIn">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#C8102E]" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">System Notifications</h4>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-[#C8102E] dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No new notifications.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />}
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                  <span className="text-[10px] text-slate-500 font-semibold">MMIT Realtime Synchronization Engine Active</span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Logout Action */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer group"
              aria-expanded={dropdownOpen}
              aria-label="Admin user menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#C8102E] text-white flex items-center justify-center text-xs font-bold shadow-2xs group-hover:bg-[#A00C24] transition-colors">
                AD
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-[#222222] dark:text-slate-100 leading-tight">
                  {user?.name || 'Administrator'}
                </span>
                <span className="text-[10px] font-medium text-[#666666] dark:text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> System Admin
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-[#C8102E]' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#131b2e] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-fadeIn">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Administrator'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">{user?.email || 'admin@mmit.edu.in'}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="mmit-badge-red text-[10px]">Super Admin</span>
                    <span className="mmit-badge-emerald text-[10px]">Active Session</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#C8102E] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-[#C8102E] dark:text-red-400" />
                    <span>Logout Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visually Separate Application Title Bar */}
      <div className="bg-[#F8F9FA] dark:bg-[#0e1626] border-t border-b border-[#E5E7EB] dark:border-[#1e293b] py-2 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs sm:text-sm font-extrabold text-[#C8102E] tracking-wider uppercase">
              TIMETABLE MANAGEMENT SYSTEM
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#666666] dark:text-slate-400 hidden sm:inline-block">
            Internal Administrative Portal • Department of Computer Engineering
          </span>
        </div>
      </div>
    </header>
  );
}
