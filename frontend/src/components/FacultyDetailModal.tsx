"use client";

import { X, UserCheck, BookOpen, Layers, Clock, AlertTriangle, ShieldAlert, Pencil, Trash2 } from 'lucide-react';

interface FacultyDetailModalProps {
  isOpen: boolean;
  faculty: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEditAllocation?: (alloc: any) => void;
  onDeleteAllocation?: (allocId: string, courseName: string) => void;
}

export function FacultyDetailModal({
  isOpen,
  faculty,
  onClose,
  onRefresh,
  onEditAllocation,
  onDeleteAllocation
}: FacultyDetailModalProps) {
  if (!isOpen || !faculty) return null;

  const allocations = faculty.allocations || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Normal':
        return <span className="mmit-badge-emerald font-bold">Normal Load (≤18 hrs/wk)</span>;
      case 'High':
        return <span className="mmit-badge-amber font-bold">High Load (19-22 hrs/wk)</span>;
      case 'Overloaded':
        return <span className="mmit-badge-red font-bold animate-pulse">Overloaded (&gt;22 hrs/wk)</span>;
      default:
        return <span className="mmit-badge-gray">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#C8102E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg text-white font-mono font-bold text-lg border border-white/20">
              {faculty.facultyCode}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{faculty.facultyName}</h2>
              <div className="flex items-center gap-2 text-xs text-red-100 font-medium mt-0.5">
                <span>{faculty.designation}</span>
                <span>•</span>
                <span>{faculty.departmentName}</span>
                <span>•</span>
                <span>Academic Year 2026-27</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Code Flag Warning Alert */}
          {faculty.isCodeFlagged && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Faculty Code Review Required</p>
                <p className="text-amber-800 mt-0.5">{faculty.codeFlagReason || 'Short code was generated with fallback logic.'}</p>
              </div>
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Faculty Code</p>
              <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{faculty.facultyCode}</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Designation</p>
              <p className="text-sm font-extrabold text-slate-800 mt-1 truncate">{faculty.designation}</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</p>
              <p className="text-xs font-bold text-slate-800 mt-1 truncate">{faculty.departmentName}</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workload Status</p>
              <div className="mt-1">{getStatusBadge(faculty.status)}</div>
            </div>
          </div>

          {/* Teaching Allocations Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#C8102E]" /> Teaching Allocations
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {allocations.length} Active Assignment{allocations.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mmit-table-container overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#C8102E] text-white">
                    <th className="px-2.5 py-2 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">Class</th>
                    <th className="px-2.5 py-2 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">Div</th>
                    <th className="px-2.5 py-2 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">Batch</th>
                    <th className="px-2.5 py-2 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">Course Code</th>
                    <th className="px-2.5 py-2 font-bold uppercase text-[10px] tracking-wider min-w-[140px]">Course Subject</th>
                    <th className="px-2 py-2 font-bold uppercase text-[10px] tracking-wider text-center">Th</th>
                    <th className="px-2 py-2 font-bold uppercase text-[10px] tracking-wider text-center">Pr</th>
                    <th className="px-2 py-2 font-bold uppercase text-[10px] tracking-wider text-center">Tu</th>
                    <th className="px-2 py-2 font-bold uppercase text-[10px] tracking-wider text-center">Proj</th>
                    <th className="px-2.5 py-2 font-bold uppercase text-[10px] tracking-wider text-center whitespace-nowrap">Total</th>
                    <th className="px-3 py-2 font-bold uppercase text-[10px] tracking-wider text-right min-w-[70px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-500 text-xs">
                        No teaching allocations recorded for this faculty member.
                      </td>
                    </tr>
                  ) : (
                    allocations.map((a: any, idx: number) => {
                      const th = a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
                      const pr = a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
                      const tu = a.tutorialHours || (a.type === 'TUTORIAL' ? a.weeklyHours : 0);
                      const proj = a.projectHours || (a.type === 'PROJECT' || a.type === 'SEMINAR' ? a.weeklyHours : 0);
                      const tot = a.totalHours || (th + pr + tu + proj);

                      // Accurately determine Class Name (SE, TE, BE)
                      let displayClass = a.className;
                      const yr = a.division?.year?.year;
                      if (yr === 2) displayClass = 'SE';
                      else if (yr === 3) displayClass = 'TE';
                      else if (yr === 4) displayClass = 'BE';
                      else {
                        const code = a.courseCode || a.subject?.code || '';
                        if (code.startsWith('PCC-20') || code.startsWith('HSMC-20') || code.startsWith('EEM-24') || code.startsWith('CEF-26')) displayClass = 'SE';
                        else if (code.startsWith('PCC30') || code.startsWith('PEC32') || code.startsWith('MDM33') || code.startsWith('OLE34') || code.startsWith('ELC34')) displayClass = 'TE';
                        else if (code.startsWith('4102')) displayClass = 'BE';
                      }

                      const displayBatch = a.batchName || a.batch?.name || (a.batchId ? (a.batch?.name || 'A1') : 'All');
                      const displayCourseCode = a.courseCode || a.subject?.code || '';
                      const displayCourseName = a.courseName || a.subject?.name || '';
                      const displayDivision = a.divisionName || a.division?.name || 'A';

                      return (
                        <tr key={a.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2.5 py-2 font-bold text-slate-900 whitespace-nowrap">{displayClass || 'SE'}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap"><span className="mmit-badge-blue text-[10px] px-2 py-0.2">{displayDivision}</span></td>
                          <td className="px-2.5 py-2 whitespace-nowrap"><span className="mmit-badge-gray text-[10px] px-1.5 py-0.2 font-bold">{displayBatch}</span></td>
                          <td className="px-2.5 py-2 whitespace-nowrap"><span className="mmit-badge-red font-mono text-[10px] px-1.5 py-0.2">{displayCourseCode}</span></td>
                          <td className="px-2.5 py-2 font-semibold text-slate-800 text-xs">{displayCourseName}</td>
                          <td className="px-2 py-2 text-center font-semibold text-slate-700">{th}</td>
                          <td className="px-2 py-2 text-center font-semibold text-slate-700">{pr}</td>
                          <td className="px-2 py-2 text-center font-semibold text-slate-700">{tu}</td>
                          <td className="px-2 py-2 text-center font-semibold text-slate-700">{proj}</td>
                          <td className="px-2.5 py-2 text-center font-black text-[#C8102E] whitespace-nowrap">{tot} hrs</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                            {onEditAllocation && (
                              <button
                                onClick={() => onEditAllocation(a)}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Edit Assignment"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteAllocation && (
                              <button
                                onClick={() => onDeleteAllocation(a.id, displayCourseName || displayCourseCode || 'Assignment')}
                                className="p-1 rounded hover:bg-red-100 text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete Assignment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Workload Summary Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#C8102E] text-white rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">Weekly Workload Summary</h4>
                  <p className="text-xs text-slate-400">Mandatory timetable workload + flexible project supervision</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-center sm:text-right">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Theory</p>
                  <p className="text-base font-bold text-white">{faculty.totalTheory} hrs</p>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Practical</p>
                  <p className="text-base font-bold text-white">{faculty.totalPractical} hrs</p>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Tutorial</p>
                  <p className="text-base font-bold text-white">{faculty.totalTutorial} hrs</p>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 rounded-lg">
                  <p className="text-[10px] text-emerald-300 font-extrabold uppercase">MANDATORY LOAD</p>
                  <p className="text-lg font-black text-emerald-400">{(faculty.totalTheory || 0) + (faculty.totalPractical || 0) + (faculty.totalTutorial || 0)} hrs/wk</p>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div className="px-3 py-1 bg-red-950/80 border border-red-800/80 rounded-lg">
                  <p className="text-[10px] text-red-300 font-extrabold uppercase">TOTAL LOAD</p>
                  <p className="text-lg font-black text-red-400">{faculty.totalWorkload} hrs/wk</p>
                </div>
              </div>
            </div>

            {/* Separate Flexible Project Supervision Row */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Project / Supervision:</span>
              <span className="font-bold text-blue-400 bg-blue-950/70 border border-blue-800/80 px-2.5 py-0.5 rounded-md">
                Project / Supervision: {faculty.totalProject || 0} hrs/week <span className="text-[10px] text-blue-300 font-normal">(Flexible Workload • 0 Timetable Slots)</span>
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="mmit-btn-secondary cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
}
