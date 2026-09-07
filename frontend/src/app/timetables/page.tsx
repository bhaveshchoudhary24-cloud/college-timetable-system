"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, ExternalLink, Trash2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { GenerateModal } from '@/components/GenerateModal';
import { apiUrl } from '@/lib/api';

export default function TimetablesPage() {
  const [timetables, setTimetables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to permanently delete this generated timetable?")) return;
    try {
      const res = await fetch(apiUrl(`/api/timetables/${id}`), { method: 'DELETE' });
      if (res.ok) {
        setTimetables(prev => prev.filter(t => t.id !== id));
      } else {
        alert("Failed to delete timetable");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting timetable");
    }
  };

  const fetchTimetables = () => {
    setLoading(true);
    fetch(apiUrl('/api/timetables'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTimetables(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTimetables();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Schedules</span>
            <span className="text-xs font-semibold text-slate-500">Timetable Directory</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Academic Timetables Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review, compare variants, export PDFs, and publish class schedules.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="mmit-btn-primary self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Auto-Generate Timetable
        </button>
      </div>

      {/* Grid of Generated Timetables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-500 mmit-card">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#990000]" />
            Loading academic timetables...
          </div>
        ) : timetables.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-500 mmit-card p-8 space-y-3">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Timetables Generated Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Configure master data (faculty, subjects, rooms) and generate your first MMIT timetable.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mmit-btn-primary inline-flex mt-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Generate Timetable Now
            </button>
          </div>
        ) : (
          timetables.map((t) => (
            <Link key={t.id} href={`/timetables/${t.id}`} className="block">
              <div className="mmit-card p-5 group cursor-pointer hover:border-[#990000]/50 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 bg-red-50 text-[#990000] border border-red-200/60 rounded-md">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {t.isValid ? (
                      <span className="mmit-badge-emerald flex items-center gap-1 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> COMPLETE (100%)
                      </span>
                    ) : (
                      <span className="mmit-badge-amber flex items-center gap-1 text-[11px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> INCOMPLETE WORKLOAD
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, t.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Timetable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900 mb-1 group-hover:text-[#990000] transition-colors truncate">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  AY {t.academicYear || '2026–27'} • Created {new Date(t.createdAt).toLocaleDateString()}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#990000]">
                  <span>Open Interactive Matrix</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <GenerateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchTimetables();
        }}
        onGenerated={() => {
          fetchTimetables();
        }}
      />
    </div>
  );
}
