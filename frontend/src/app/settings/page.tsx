"use client";

import { useEffect, useState, useCallback } from "react";
import { apiUrl } from "@/lib/api";
import {
  Settings, Save, RotateCcw, ChevronRight,
  Clock, Building2, Calendar, Cpu, CheckCircle2,
  AlertTriangle, Info, Loader2, BarChart2, Users,
  BookOpen, DoorOpen, CalendarDays, Layers, Lock,
  KeyRound, ShieldCheck, Eye, EyeOff, AlertCircle,
  Sun, Moon, Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTheme } from "@/context/ThemeContext";

interface TimeSlotConfig {
  index: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  label?: string;
  breakName?: string;
}

interface GenerationPrefs {
  allowParallelBatches: boolean;
  balanceFacultyWorkload: boolean;
  minimizeStudentGaps: boolean;
  minimizeFacultyGaps: boolean;
  preferFixedRooms: boolean;
  preferConsecutivePracticals: boolean;
  maxFacultyHoursPerDay: number;
  maxTheoryPeriodsPerDay: number;
  maxPracticalBlocksPerDay: number;
  solverTimeoutSeconds: number;
}

interface Settings {
  collegeName: string;
  collegeShortName: string;
  academicYear: string;
  currentSemester: number;
  workingDays: number[];
  allowSaturday: boolean;
  timeSlots: TimeSlotConfig[];
  generation: GenerationPrefs;
}

interface SystemStats {
  subjects: { total: number; canonical: number; legacy: number };
  assignments: number;
  teachers: number;
  rooms: { total: number; labs: number; classrooms: number };
  divisions: number;
  batches: number;
  timeSlots: { total: number; teaching: number; breaks: number };
  timetables: number;
  workload: {
    theory: number;
    practical: number;
    tutorial: number;
    project: number;
    mandatory: number;
    facultyTotal: number;
  };
}

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SECTIONS = [
  { id: "general", label: "General", icon: Building2 },
  { id: "security", label: "Admin Security & Password", icon: ShieldCheck },
  { id: "timetable", label: "Timetable Schedule", icon: Clock },
  { id: "generation", label: "Generation Preferences", icon: Cpu },
  { id: "stats", label: "System Overview", icon: BarChart2 },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  const [error, setError] = useState<string | null>(null);

  // Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, statsRes] = await Promise.all([
        fetch(apiUrl('/api/settings')),
        fetch(apiUrl('/api/settings/stats')),
      ]);
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
      }
      if (statsRes.ok) {
        const st = await statsRes.json();
        setStats(st);
      }
      setError(null);
    } catch (e) {
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl('/api/settings'), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all settings to factory defaults? This cannot be undone.")) return;
    try {
      await fetch(apiUrl('/api/settings/reset'), { method: "POST" });
      await fetchData();
    } catch {
      setError("Failed to reset settings.");
    }
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const updateGenPref = (key: keyof GenerationPrefs, value: any) => {
    setSettings(prev => prev ? {
      ...prev,
      generation: { ...prev.generation, [key]: value }
    } : prev);
  };

  const toggleDay = (day: number) => {
    if (!settings) return;
    const days = settings.workingDays.includes(day)
      ? settings.workingDays.filter(d => d !== day)
      : [...settings.workingDays, day].sort();
    updateSetting("workingDays", days);
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPwError(null);
    setPwSuccess(null);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword) {
      setPwError("Please enter your current administrator password.");
      return;
    }

    if (!newPassword) {
      setPwError("Please enter your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPwError("New password cannot be the same as your current password.");
      return;
    }

    setPwLoading(true);

    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('mmit_auth_token') : null;
      const res = await fetch(apiUrl('/api/auth/change-password'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPwSuccess("Password updated successfully! Please use your new password next time you log in.");
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          resetPasswordForm();
        }, 1800);
      } else {
        setPwError(data.message || "Failed to update password. Please verify your current password.");
      }
    } catch (err) {
      setPwError("Network error. Unable to reach server to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#C8102E]" />
        <span className="ml-3 text-slate-500 font-medium">Loading system settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <p className="text-slate-700 font-semibold text-lg">{error}</p>
        <Button onClick={fetchData} className="mmit-btn-primary">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">System</span>
            <span className="text-xs font-semibold text-slate-500">Configuration & Security</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure college parameters, administrator credentials, schedule timing, and scheduling preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Settings saved
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mmit-btn-primary cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <nav className="space-y-1 bg-white rounded-xl border border-slate-200 p-2 shadow-2xs">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === id
                    ? "bg-[#FEF2F2] text-[#C8102E] border-l-4 border-[#C8102E] pl-2.5"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {activeSection === id && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {/* ── General ── */}
          {activeSection === "general" && settings && (
            <>
              <SectionCard title="College Information" icon={Building2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="College Name">
                    <input
                      className="mmit-input"
                      value={settings.collegeName}
                      onChange={e => updateSetting("collegeName", e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup label="Short Name">
                    <input
                      className="mmit-input"
                      value={settings.collegeShortName}
                      onChange={e => updateSetting("collegeShortName", e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup label="Academic Year">
                    <input
                      className="mmit-input"
                      value={settings.academicYear}
                      onChange={e => updateSetting("academicYear", e.target.value)}
                      placeholder="2026-27"
                    />
                  </FieldGroup>
                  <FieldGroup label="Current Semester">
                    <select
                      className="mmit-input"
                      value={settings.currentSemester}
                      onChange={e => updateSetting("currentSemester", Number(e.target.value))}
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>
              </SectionCard>

              {/* Theme & Appearance Configuration */}
              <SectionCard title="Appearance & Display Theme" icon={Palette}>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Select your preferred interface color theme. Preferences are saved automatically and synchronized across sessions.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                      theme === 'light'
                        ? 'border-[#C8102E] bg-red-50/40 dark:bg-red-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#131b2e]'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${theme === 'light' ? 'bg-[#C8102E] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Light Academic Theme</span>
                        {theme === 'light' && <span className="mmit-badge-red text-[10px] px-1.5 py-0.2">Active</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Classic high-contrast institutional theme with official MMIT red palette.</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                      theme === 'dark'
                        ? 'border-[#C8102E] bg-red-50/40 dark:bg-red-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#131b2e]'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-[#C8102E] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Dark Slate Theme</span>
                        {theme === 'dark' && <span className="mmit-badge-red text-[10px] px-1.5 py-0.2">Active</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Modern low-glare dark theme optimized for timetable planning in low light.</p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Quick Admin Security Banner inside General */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-lg text-[#C8102E] bg-white">
                    <KeyRound className="w-5 h-5 text-[#C8102E]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Administrator Credentials</h3>
                    <p className="text-xs text-slate-300">
                      Manage administrator login password and credential security.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { resetPasswordForm(); setIsPasswordModalOpen(true); }}
                  className="px-4 py-2 bg-[#C8102E] hover:bg-[#990000] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Change Password
                </button>
              </div>

              <SectionCard title="Working Days" icon={Calendar}>
                <p className="text-xs text-slate-500 mb-3">Select the days classes are held.</p>
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4,5,6].map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        settings.workingDays.includes(d)
                          ? "bg-[#C8102E] text-white border-[#C8102E]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-[#C8102E] hover:text-[#C8102E]"
                      }`}
                    >
                      {DAY_NAMES[d]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {settings.workingDays.length} working days selected
                </p>
              </SectionCard>
            </>
          )}

          {/* ── Security & Authentication Section ── */}
          {activeSection === "security" && (
            <>
              <SectionCard title="Administrator Security & Password Management" icon={ShieldCheck}>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="mmit-badge-red font-mono text-xs">SUPER_ADMIN</span>
                        <span className="text-xs font-bold text-slate-800">Primary Administrator Account</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Login Identifier: <span className="font-bold text-slate-900 font-mono">admin</span> or <span className="font-bold text-slate-900 font-mono">admin@mmit.edu.in</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Controls system-wide timetable generation, department teaching loads, rooms, and faculty allocations.
                      </p>
                    </div>

                    <button
                      onClick={() => { resetPasswordForm(); setIsPasswordModalOpen(true); }}
                      className="mmit-btn-primary flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <KeyRound className="w-4 h-4" />
                      Change Password
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                        <Lock className="w-4 h-4 text-[#C8102E]" />
                        Bcrypt Encryption
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Salted one-way hash with 10 rounds of computational complexity.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        JWT Session Tokens
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Cryptographically signed access tokens protecting all backend endpoints.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        Rate-Limit Guard
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Automatic cooldown lockdown after 5 consecutive failed attempts.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── Timetable Schedule ── */}
          {activeSection === "timetable" && settings && (
            <SectionCard title="Daily Timetable Structure" icon={Clock}>
              <p className="text-xs text-slate-500 mb-4">
                Defined time periods and breaks. Edit start/end times as needed.
              </p>
              <div className="space-y-2">
                {(settings.timeSlots || []).map((slot, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${
                      slot.isBreak
                        ? "bg-amber-50 border-amber-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      slot.isBreak ? "bg-amber-200 text-amber-700" : "bg-[#FEF2F2] text-[#C8102E]"
                    }`}>
                      {slot.index}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        className="mmit-input w-24 text-center"
                        value={slot.startTime}
                        onChange={e => {
                          const updated = [...settings.timeSlots];
                          updated[i] = { ...updated[i], startTime: e.target.value };
                          updateSetting("timeSlots", updated);
                        }}
                      />
                      <span className="text-slate-400 font-medium text-xs">→</span>
                      <input
                        className="mmit-input w-24 text-center"
                        value={slot.endTime}
                        onChange={e => {
                          const updated = [...settings.timeSlots];
                          updated[i] = { ...updated[i], endTime: e.target.value };
                          updateSetting("timeSlots", updated);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      {slot.isBreak ? (
                        <span className="text-xs font-semibold text-amber-600">
                          🔔 {slot.breakName || "Break"}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600">
                          {slot.label || `Period ${slot.index}`}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      slot.isBreak
                        ? "bg-amber-100 text-amber-600"
                        : "bg-green-50 text-green-600"
                    }`}>
                      {slot.isBreak ? "BREAK" : "TEACHING"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Practical 2-hour blocks
                </p>
                <p className="text-[11px] text-blue-600 mt-1">
                  Blocks: 08:30–10:30 (slots 1–2) · 10:45–12:45 (slots 4–5) · 13:30–15:30 (slots 7–8). 
                  Practicals cannot span breaks.
                </p>
              </div>
            </SectionCard>
          )}

          {/* ── Generation Preferences ── */}
          {activeSection === "generation" && settings?.generation && (
            <>
              <SectionCard title="Scheduling Options" icon={Cpu}>
                <div className="space-y-3">
                  <ToggleRow
                    label="Allow Parallel Practical Batches"
                    description="Schedule A1, A2, A3, A4 simultaneously in different labs — recommended"
                    checked={settings.generation.allowParallelBatches}
                    onChange={v => updateGenPref("allowParallelBatches", v)}
                  />
                  <ToggleRow
                    label="Balance Faculty Workload"
                    description="Distribute sessions evenly across working days"
                    checked={settings.generation.balanceFacultyWorkload}
                    onChange={v => updateGenPref("balanceFacultyWorkload", v)}
                  />
                  <ToggleRow
                    label="Minimize Student Gaps"
                    description="Avoid free periods in student timetables"
                    checked={settings.generation.minimizeStudentGaps}
                    onChange={v => updateGenPref("minimizeStudentGaps", v)}
                  />
                  <ToggleRow
                    label="Minimize Faculty Gaps"
                    description="Avoid free periods in faculty timetables"
                    checked={settings.generation.minimizeFacultyGaps}
                    onChange={v => updateGenPref("minimizeFacultyGaps", v)}
                  />
                  <ToggleRow
                    label="Prefer Fixed Rooms"
                    description="Use preferred rooms from Faculty Workload allocations"
                    checked={settings.generation.preferFixedRooms}
                    onChange={v => updateGenPref("preferFixedRooms", v)}
                  />
                  <ToggleRow
                    label="Prefer Consecutive Practical Sessions"
                    description="Schedule batches in the same block when possible"
                    checked={settings.generation.preferConsecutivePracticals}
                    onChange={v => updateGenPref("preferConsecutivePracticals", v)}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Hard Constraint Limits" icon={Settings}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="Max Faculty Hours / Day">
                    <input
                      type="number" min={1} max={10}
                      className="mmit-input"
                      value={settings.generation.maxFacultyHoursPerDay}
                      onChange={e => updateGenPref("maxFacultyHoursPerDay", Number(e.target.value))}
                    />
                  </FieldGroup>
                  <FieldGroup label="Max Theory Periods / Day">
                    <input
                      type="number" min={1} max={8}
                      className="mmit-input"
                      value={settings.generation.maxTheoryPeriodsPerDay}
                      onChange={e => updateGenPref("maxTheoryPeriodsPerDay", Number(e.target.value))}
                    />
                  </FieldGroup>
                  <FieldGroup label="Max Practical Blocks / Day">
                    <input
                      type="number" min={1} max={3}
                      className="mmit-input"
                      value={settings.generation.maxPracticalBlocksPerDay}
                      onChange={e => updateGenPref("maxPracticalBlocksPerDay", Number(e.target.value))}
                    />
                  </FieldGroup>
                  <FieldGroup label="Solver Timeout (seconds)">
                    <input
                      type="number" min={30} max={600}
                      className="mmit-input"
                      value={settings.generation.solverTimeoutSeconds}
                      onChange={e => updateGenPref("solverTimeoutSeconds", Number(e.target.value))}
                    />
                  </FieldGroup>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── System Overview ── */}
          {activeSection === "stats" && stats && (
            <>
              <SectionCard title="Database Overview" icon={BarChart2}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard label="Subjects" value={stats.subjects.total} sub={`${stats.subjects.canonical} canonical · ${stats.subjects.legacy} legacy`} icon={BookOpen} color="blue" />
                  <StatCard label="Assignments" value={stats.assignments} sub="Faculty workload rows" icon={Layers} color="purple" />
                  <StatCard label="Faculty" value={stats.teachers} sub="Active teachers" icon={Users} color="green" />
                  <StatCard label="Rooms" value={stats.rooms.total} sub={`${stats.rooms.labs} labs · ${stats.rooms.classrooms} classrooms`} icon={DoorOpen} color="amber" />
                  <StatCard label="Divisions" value={stats.divisions} sub={`${stats.batches} batches`} icon={Building2} color="red" />
                  <StatCard label="Timetables" value={stats.timetables} sub="Generated schedules" icon={CalendarDays} color="slate" />
                </div>
              </SectionCard>

              <SectionCard title="Workload Summary" icon={BarChart2}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <WorkloadStat label="Theory Hours" value={stats.workload.theory} color="blue" />
                  <WorkloadStat label="Practical Hours" value={stats.workload.practical} color="purple" />
                  <WorkloadStat label="Tutorial Hours" value={stats.workload.tutorial} color="green" />
                  <WorkloadStat label="Project Hours" value={stats.workload.project} color="amber" note="Faculty-only, not in class timetable" />
                  <WorkloadStat label="Mandatory Class Hours" value={stats.workload.mandatory} color="red" note="Target for timetable coverage" />
                  <WorkloadStat label="Total Faculty Workload" value={stats.workload.facultyTotal} color="slate" note="Including project hours" />
                </div>
                <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs font-bold text-green-700">
                    ✅ Class timetable target: {stats.workload.mandatory} hrs/week
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Faculty total workload: {stats.workload.facultyTotal} hrs/week ({stats.workload.project} project hrs excluded from scheduling)
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Time Slot Configuration" icon={Clock}>
                <div className="flex gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[120px] p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <p className="text-2xl font-black text-[#C8102E]">{stats.timeSlots.teaching}</p>
                    <p className="text-xs font-semibold text-slate-500">Teaching Slots / Day</p>
                  </div>
                  <div className="flex-1 min-w-[120px] p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <p className="text-2xl font-black text-amber-500">{stats.timeSlots.breaks}</p>
                    <p className="text-xs font-semibold text-slate-500">Break Slots / Day</p>
                  </div>
                  <div className="flex-1 min-w-[120px] p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <p className="text-2xl font-black text-slate-700">{stats.timeSlots.teaching * 5}</p>
                    <p className="text-xs font-semibold text-slate-500">Teaching Slots / Week</p>
                  </div>
                  <div className="flex-1 min-w-[120px] p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <p className="text-2xl font-black text-blue-600">3</p>
                    <p className="text-xs font-semibold text-slate-500">Practical Blocks / Day</p>
                  </div>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>

      {/* ── Change Password Modal Dialog ── */}
      <Dialog 
        open={isPasswordModalOpen} 
        onOpenChange={(open) => {
          setIsPasswordModalOpen(open);
          if (!open) resetPasswordForm();
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-[#990000] text-white p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-300" />
                Change Administrator Password
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-red-100 mt-1">
              Update password for the primary administrator account (admin).
            </p>
          </div>

          <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
            {/* Status Alert Banners */}
            {pwError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{pwError}</span>
              </div>
            )}

            {pwSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{pwSuccess}</span>
              </div>
            )}

            {/* Current Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Current Password</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">(required to verify identity)</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  placeholder="Enter current password..."
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPwError(null); }}
                  className="w-full px-3 py-2 pr-10 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#990000] text-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  placeholder="Enter new password (min. 6 characters)..."
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPwError(null); }}
                  className="w-full px-3 py-2 pr-10 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#990000] text-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Confirm New Password</span>
                {newPassword && confirmPassword && (
                  <span className={`text-[10px] font-bold ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Do not match'}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Re-enter new password..."
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPwError(null); }}
                  className="w-full px-3 py-2 pr-10 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#990000] text-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Hints */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1 text-slate-500">
              <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                <span>{newPassword.length >= 6 ? '✓' : '•'}</span>
                <span>Minimum 6 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                <span>{newPassword && newPassword === confirmPassword ? '✓' : '•'}</span>
                <span>New passwords must match</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setIsPasswordModalOpen(false); resetPasswordForm(); }}
                disabled={pwLoading}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={pwLoading}
                className="mmit-btn-primary flex items-center gap-2 cursor-pointer"
              >
                {pwLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying & Updating...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-[#F8F9FA]">
        <Icon className="w-4 h-4 text-[#C8102E]" />
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-xs font-bold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-10 h-5 rounded-full transition-all duration-200 cursor-pointer relative ${
          checked ? "bg-[#C8102E]" : "bg-slate-200"
        }`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
          checked ? "left-5" : "left-0.5"
        }`} />
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number; sub: string; icon: any; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600", amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-[#C8102E]", slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-black text-slate-900">{value}</p>
        <p className="text-[11px] font-bold text-slate-600">{label}</p>
        <p className="text-[10px] text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function WorkloadStat({ label, value, color, note }: {
  label: string; value: number; color: string; note?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-l-blue-400 bg-blue-50", purple: "border-l-purple-400 bg-purple-50",
    green: "border-l-green-400 bg-green-50", amber: "border-l-amber-400 bg-amber-50",
    red: "border-l-[#C8102E] bg-red-50", slate: "border-l-slate-400 bg-slate-50",
  };
  return (
    <div className={`p-3 rounded-lg border-l-4 ${colorMap[color]}`}>
      <p className="text-xl font-black text-slate-900">{value} <span className="text-xs font-normal text-slate-500">hrs/week</span></p>
      <p className="text-[11px] font-bold text-slate-700">{label}</p>
      {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
    </div>
  );
}
