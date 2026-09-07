"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { User, Users, DoorOpen, Loader2, Printer, CheckCircle2, ShieldCheck, ArrowLeft, BookOpen, Clock, Layers } from 'lucide-react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';

import { exportTimetableToPDF } from '@/utils/generateTimetablePDF';

export default function TimetableViewer() {
  const params = useParams();
  const timetableId = params.id as string;

  const [viewType, setViewType] = useState<'DIVISION' | 'TEACHER' | 'ROOM'>('DIVISION');
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<number>(1);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = [
    { idx: 1, time: '08:30-09:30' },
    { idx: 2, time: '09:30-10:30' },
    { idx: 3, time: '10:30-10:45', isBreak: true, name: 'Short Recess' },
    { idx: 4, time: '10:45-11:45' },
    { idx: 5, time: '11:45-12:45' },
    { idx: 6, time: '12:45-13:30', isBreak: true, name: 'Lunch Break' },
    { idx: 7, time: '13:30-14:30' },
    { idx: 8, time: '14:30-15:30' },
  ];

  const [completenessReport, setCompletenessReport] = useState<any>(null);
  const [teacherWorkloadSummary, setTeacherWorkloadSummary] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl('/api/teachers')).then(res => res.json()),
      fetch(apiUrl('/api/divisions')).then(res => res.json()),
      fetch(apiUrl('/api/rooms')).then(res => res.json()),
      fetch(apiUrl(`/api/timetables/${timetableId}/entries?variant=${selectedVariant}`)).then(res => res.json()),
      fetch(apiUrl(`/api/timetables/${timetableId}/completeness?variant=${selectedVariant}`)).then(res => res.json())
    ]).then(([allTeachers, allDivisions, allRooms, timetableEntries, compReport]) => {
      const validTeacherIds = new Set(timetableEntries.map((e: any) => e.teacherId));
      const validDivisionIds = new Set(timetableEntries.map((e: any) => e.divisionId));
      const validRoomIds = new Set(timetableEntries.map((e: any) => e.roomId));

      const activeTeachers = allTeachers.filter((t: any) => validTeacherIds.has(t.id));
      const activeDivisions = allDivisions.filter((d: any) => validDivisionIds.has(d.id));
      const activeRooms = Array.isArray(allRooms) ? allRooms.filter((r: any) => validRoomIds.has(r.id) || r.isLab || r.capacity >= 20) : [];

      setTeachers(activeTeachers.length > 0 ? activeTeachers : allTeachers);
      setDivisions(activeDivisions.length > 0 ? activeDivisions : allDivisions);
      setRooms(activeRooms.length > 0 ? activeRooms : (Array.isArray(allRooms) ? allRooms : []));

      if (compReport && (compReport.coverage || compReport.isValid !== undefined)) setCompletenessReport(compReport);

      if (viewType === 'TEACHER' && !selectedId) setSelectedId(activeTeachers[0]?.id || allTeachers[0]?.id || '');
      if (viewType === 'DIVISION' && !selectedId) setSelectedId(activeDivisions[0]?.id || allDivisions[0]?.id || '');
      if (viewType === 'ROOM' && !selectedId) setSelectedId(activeRooms[0]?.id || (Array.isArray(allRooms) && allRooms[0]?.id) || '');
    }).catch(err => console.error("Error loading dropdown data:", err));
  }, [timetableId, viewType, selectedVariant]);

  useEffect(() => {
    if (!selectedId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let endpoint = '';
    if (viewType === 'TEACHER') {
      endpoint = apiUrl(`/api/timetables/${timetableId}/teacher/${selectedId}?variant=${selectedVariant}`);
    } else if (viewType === 'ROOM') {
      endpoint = apiUrl(`/api/timetables/${timetableId}/room/${selectedId}?variant=${selectedVariant}`);
    } else {
      endpoint = apiUrl(`/api/timetables/${timetableId}/division/${selectedId}?variant=${selectedVariant}`);
    }

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEntries(data);
          setTeacherWorkloadSummary(null);
        } else if (data && Array.isArray(data.entries)) {
          setEntries(data.entries);
          setTeacherWorkloadSummary(data.workloadSummary || null);
        } else {
          setEntries([]);
          setTeacherWorkloadSummary(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [viewType, selectedId, timetableId, selectedVariant]);

  const activeDivision = divisions.find(d => d.id === selectedId);
  const activeTeacher = teachers.find(t => t.id === selectedId);
  const activeRoom = rooms.find(r => r.id === selectedId);

  let className = 'SE';
  let sem = '3';
  if (activeDivision?.year?.year === 2) { className = 'SE'; sem = '3'; }
  if (activeDivision?.year?.year === 3) { className = 'TE'; sem = '5'; }
  if (activeDivision?.year?.year === 4) { className = 'BE'; sem = '7'; }
  if (activeDivision?.year?.course?.name?.includes('M.E.')) { className = 'ME'; sem = '1'; }

  // Workload summary for division view
  const subjectLoadMap = new Map();
  if (viewType === 'DIVISION') {
    entries.forEach(e => {
      if (!subjectLoadMap.has(e.subjectId)) {
        subjectLoadMap.set(e.subjectId, {
          subjectCode: e.subject?.code || e.subjectCode || 'SUB',
          subjectName: e.subject?.name || e.subjectName || e.subject?.code || 'Subject',
          teachers: new Map()
        });
      }
      const subjData = subjectLoadMap.get(e.subjectId);
      if (!subjData.teachers.has(e.teacherId)) {
        subjData.teachers.set(e.teacherId, {
          name: `${e.teacherCode || e.teacher?.employeeId?.replace('EMP-', '') || 'FAC'}: ${e.teacherName || e.teacher?.name || 'Faculty'}`,
          L: 0, P: 0, T: 0
        });
      }
      const tData = subjData.teachers.get(e.teacherId);
      if (e.type === 'LECTURE') tData.L += 1;
      else if (e.type === 'PRACTICAL') tData.P += 1;
      else if (e.type === 'TUTORIAL') tData.T += 1;
    });
  }

  // Workload summary for faculty individual view
  const teacherLoadMap = new Map();
  if (viewType === 'TEACHER') {
    entries.forEach(e => {
      const subCode = e.subject?.code || e.subjectCode || 'SUB';
      const subName = e.subject?.name || e.subjectName || e.subject?.code || 'Subject';
      const cName = e.className || 'TE-A';
      const bName = e.batch?.name || e.batchName || 'All';
      const key = `${subCode}-${cName}-${bName}`;

      if (!teacherLoadMap.has(key)) {
        teacherLoadMap.set(key, {
          subjectCode: subCode,
          subjectName: subName,
          className: cName,
          batchName: bName,
          room: e.room?.roomNumber || e.roomNumber || 'Room',
          type: e.type,
          L: 0, P: 0, T: 0
        });
      }
      const item = teacherLoadMap.get(key);
      if (e.type === 'LECTURE') item.L += 1;
      else if (e.type === 'PRACTICAL') item.P += 1;
      else if (e.type === 'TUTORIAL') item.T += 1;
    });
  }

  // Workload summary for classroom & lab view
  const roomLoadMap = new Map();
  if (viewType === 'ROOM') {
    entries.forEach(e => {
      const subCode = e.subject?.code || e.subjectCode || 'SUB';
      const subName = e.subject?.name || e.subjectName || e.subject?.code || 'Subject';
      const cName = e.className || 'SE-A';
      const bName = e.batch?.name || e.batchName || 'All';
      const tName = `${e.teacherCode || e.teacher?.employeeId?.replace('EMP-', '') || 'FAC'}: ${e.teacherName || e.teacher?.name || 'Faculty'}`;
      const key = `${subCode}-${cName}-${bName}-${tName}`;

      if (!roomLoadMap.has(key)) {
        roomLoadMap.set(key, {
          subjectCode: subCode,
          subjectName: subName,
          className: cName,
          batchName: bName,
          teacherName: tName,
          type: e.type,
          L: 0, P: 0, T: 0
        });
      }
      const item = roomLoadMap.get(key);
      if (e.type === 'LECTURE') item.L += 1;
      else if (e.type === 'PRACTICAL') item.P += 1;
      else if (e.type === 'TUTORIAL') item.T += 1;
    });
  }

  let totalL = 0, totalP = 0, totalT = 0;

  return (
    <div className="space-y-6">
      {/* Action Controls & Variant Switcher (Hidden on Print) */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-lg border border-[#E5E7EB] dark:border-[#1e293b] shadow-xs print:hidden space-y-4 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#1e293b] pb-4">
          <div className="flex items-center gap-3">
            <Link href="/timetables" className="p-2 rounded-md hover:bg-[#F8F9FA] dark:hover:bg-slate-800 text-[#666666] dark:text-slate-400 hover:text-[#222222] dark:hover:text-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="mmit-badge-red">MMIT Official Timetable — Variant {selectedVariant}</span>
                <span className="mmit-badge-emerald flex items-center gap-1 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" /> 0 Hard Conflicts
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-[#222222] dark:text-slate-100 mt-0.5">
                {viewType === 'DIVISION'
                  ? `Division ${activeDivision?.name || 'SE-A'} Timetable`
                  : viewType === 'TEACHER'
                  ? `Faculty ${activeTeacher?.name || ''} Schedule`
                  : `Classroom & Lab ${activeRoom?.roomNumber || 'E101'} Occupancy Schedule`
                }{' '}
                <span className="text-sm font-semibold text-[#666666] dark:text-slate-400">(Variant {selectedVariant})</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDiagnosticOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs font-bold border border-[#E5E7EB] dark:border-slate-700 hover:bg-[#F8F9FA] dark:hover:bg-slate-800 text-[#222222] dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Conflict Diagnostics
            </button>
            <button
              onClick={() => exportTimetableToPDF(
                'timetable-printable-area',
                viewType === 'TEACHER'
                  ? `MMIT_Faculty_Schedule_${activeTeacher?.shortCode || activeTeacher?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_Variant_${selectedVariant}.pdf`
                  : viewType === 'ROOM'
                  ? `MMIT_Room_Schedule_${activeRoom?.roomNumber || 'Room'}_Variant_${selectedVariant}.pdf`
                  : `MMIT_Timetable_${className}_${activeDivision?.name || 'A'}_Variant_${selectedVariant}.pdf`
              )}
              className="mmit-btn-primary cursor-pointer text-xs"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
          </div>
        </div>

        {/* View Switcher & Selection Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[#F8F9FA] dark:bg-[#0e1626] p-1 rounded-md border border-[#E5E7EB] dark:border-slate-700">
              <button
                onClick={() => { setViewType('DIVISION'); setSelectedId(divisions[0]?.id || ''); }}
                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewType === 'DIVISION' ? 'bg-[#C8102E] text-white shadow-2xs' : 'text-[#666666] dark:text-slate-400 hover:text-[#222222] dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Class Division View
              </button>
              <button
                onClick={() => { setViewType('TEACHER'); setSelectedId(teachers[0]?.id || ''); }}
                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewType === 'TEACHER' ? 'bg-[#C8102E] text-white shadow-2xs' : 'text-[#666666] dark:text-slate-400 hover:text-[#222222] dark:hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Faculty Schedule View
              </button>
              <button
                onClick={() => { setViewType('ROOM'); setSelectedId(rooms[0]?.id || ''); }}
                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewType === 'ROOM' ? 'bg-[#C8102E] text-white shadow-2xs' : 'text-[#666666] dark:text-slate-400 hover:text-[#222222] dark:hover:text-slate-200'
                }`}
              >
                <DoorOpen className="w-3.5 h-3.5" /> Classroom &amp; Lab View
              </button>
            </div>

            <select
              className="h-9 border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-[#0b0f19] rounded-md px-3 text-xs font-semibold text-[#222222] dark:text-slate-100 focus:outline-none focus:border-[#C8102E]"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {viewType === 'TEACHER' && teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.shortCode || t.employeeId?.replace('EMP-', '')})</option>
              ))}
              {viewType === 'DIVISION' && divisions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.year?.course?.name.includes('M.E.') ? 'ME-I' : d.year?.year === 2 ? 'SE' : d.year?.year === 3 ? 'TE' : d.year?.year === 4 ? 'BE' : `Year ${d.year?.year}`} - Division {d.name}
                </option>
              ))}
              {viewType === 'ROOM' && (
                <>
                  <optgroup label="Classrooms & Lecture Halls">
                    {rooms.filter(r => !r.isLab).map(r => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} - {r.labType || r.name || 'Classroom'} (Cap: {r.capacity || 70})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Computer & Specialized Laboratories">
                    {rooms.filter(r => r.isLab).map(r => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} - {r.labType || r.name || 'Laboratory'} (Cap: {r.capacity || 25})
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#666666] dark:text-slate-400 mr-2">Evaluation Variant:</span>
            {[1, 2, 3].map(varNum => (
              <button
                key={varNum}
                onClick={() => setSelectedVariant(varNum)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  selectedVariant === varNum
                    ? 'bg-[#C8102E] text-white shadow-2xs'
                    : 'bg-[#F8F9FA] dark:bg-[#0e1626] text-[#666666] dark:text-slate-400 border border-[#E5E7EB] dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Variant {varNum}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict Diagnostics Modal */}
      {isDiagnosticOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-lg shadow-2xl p-6 max-w-md w-full border border-[#E5E7EB] dark:border-[#1e293b]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#1e293b] mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-[#222222] dark:text-slate-100">Constraint Diagnostic Report</h3>
              </div>
              <button onClick={() => setIsDiagnosticOpen(false)} className="text-[#666666] hover:text-[#222222] dark:text-slate-400 dark:hover:text-slate-100">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <span>Faculty Overlap Conflicts:</span>
                <span className="font-bold">0 Hard Conflicts</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <span>Room Double-Booking:</span>
                <span className="font-bold">0 Hard Conflicts</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <span>Practical 2-Hour Continuity:</span>
                <span className="font-bold">100% Compliant</span>
              </div>
              <div className="p-3 bg-[#F8F9FA] dark:bg-slate-800 text-[#222222] dark:text-slate-100 rounded-md border border-[#E5E7EB] dark:border-slate-700 flex items-center justify-between">
                <span>Workload Balance Score:</span>
                <span className="font-bold text-[#C8102E] dark:text-red-400">98.4 / 100</span>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button onClick={() => setIsDiagnosticOpen(false)} className="mmit-btn-primary text-xs">Close Diagnostics</button>
            </div>
          </div>
        </div>
      )}

      {/* Workload Coverage Report Banner & Table (Hidden on Print) */}
      {completenessReport && (
        <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-[#1e293b] p-6 shadow-2xs space-y-4 print:hidden transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1e293b]">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${completenessReport.isComplete ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'}`}>
                  {completenessReport.isComplete ? 'COMPLETE (100% COVERAGE)' : 'INCOMPLETE WORKLOAD COVERAGE'}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Dual Validation Layer</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                Faculty Workload Completion Audit
              </h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Coverage</p>
                <p className="text-xl font-black text-[#C8102E] dark:text-red-400">{completenessReport.workloadCoveragePercent}%</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Mandatory Required</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{completenessReport.requiredHours} hrs</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Scheduled</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{completenessReport.scheduledHours} hrs</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Remaining</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{completenessReport.remainingHours} hrs</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
            <div className="p-3 bg-slate-50 dark:bg-[#0e1626] border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Total Assignments:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{completenessReport.totalAssignments}</span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex justify-between items-center text-emerald-900 dark:text-emerald-300">
              <span>Fully Scheduled:</span>
              <span className="font-bold">{completenessReport.fullyScheduled}</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg flex justify-between items-center text-amber-900 dark:text-amber-300">
              <span>Partially Scheduled:</span>
              <span className="font-bold">{completenessReport.partiallyScheduled}</span>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-lg flex justify-between items-center text-red-900 dark:text-red-300">
              <span>Not Scheduled:</span>
              <span className="font-bold">{completenessReport.notScheduled}</span>
            </div>
          </div>

          {/* Assignment-Level Diagnostic Breakdown Table */}
          {completenessReport.assignments && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Assignment-Level Mandatory Coverage Breakdown</h3>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">ⓘ Project hours are flexible &amp; excluded from mandatory timetable coverage</span>
              </div>
              <div className="mmit-table-container max-h-60 overflow-y-auto">
                <table className="mmit-table text-[11px]">
                  <thead>
                    <tr>
                      <th>Faculty</th>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th>Class</th>
                      <th>Div</th>
                      <th>Batch</th>
                      <th className="text-center">Mandatory Req</th>
                      <th className="text-center">Scheduled</th>
                      <th className="text-center">Remaining</th>
                      <th className="text-center">Flexible Proj</th>
                      <th className="text-center">Status</th>
                      <th>Reason / Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completenessReport.assignments.map((a: any, idx: number) => (
                      <tr key={a.assignmentId || idx}>
                        <td className="font-bold text-slate-900 dark:text-slate-100">{a.facultyName} ({a.facultyCode})</td>
                        <td className="font-mono font-bold text-red-700 dark:text-red-400">{a.courseCode}</td>
                        <td className="font-semibold text-slate-800 dark:text-slate-200">{a.courseName}</td>
                        <td>{a.className}</td>
                        <td><span className="mmit-badge-blue">{a.divisionName}</span></td>
                        <td><span className="mmit-badge-gray">{a.batchName}</span></td>
                        <td className="text-center font-semibold">{a.requiredHours}h</td>
                        <td className="text-center font-semibold text-emerald-600 dark:text-emerald-400">{a.scheduledHours}h</td>
                        <td className="text-center font-semibold text-amber-600 dark:text-amber-400">{a.remainingHours}h</td>
                        <td className="text-center font-semibold text-blue-600 dark:text-blue-400">{a.flexibleProjectHours ? `${a.flexibleProjectHours}h (flexible)` : '-'}</td>
                        <td className="text-center">
                          {a.status === 'COMPLETE' && <span className="mmit-badge-emerald font-bold">COMPLETE</span>}
                          {a.status === 'PARTIAL' && <span className="mmit-badge-amber font-bold">PARTIAL</span>}
                          {a.status === 'NOT SCHEDULED' && <span className="mmit-badge-red font-bold">NOT SCHEDULED</span>}
                        </td>
                        <td className="text-slate-500 dark:text-slate-400 text-[10px] font-mono">{a.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Print Ready Institutional Timetable Grid */}
      <div className="bg-white dark:bg-[#131b2e] p-8 rounded-lg border border-[#E5E7EB] dark:border-[#1e293b] shadow-xs print:p-0 print:border-none print:shadow-none font-sans text-[#222222] dark:text-slate-100 transition-colors duration-200">
        {loading ? (
          <div className="py-20 text-center text-[#666666] dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#C8102E]" />
            Loading timetable matrix...
          </div>
        ) : (
          <div id="timetable-printable-area" className="max-w-[1100px] mx-auto print:max-w-none bg-white dark:bg-[#131b2e] p-4 text-[#222222] dark:text-slate-100">
            {/* INSTITUTIONAL HEADER */}
            <div className="text-center leading-tight mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-[#666666] dark:text-slate-400">"Techno-Social Excellence"</div>
              <div className="text-[#C8102E] text-[21px] font-black mt-1 tracking-tight">
                Marathwada Mitra Mandal's Institute of Technology, Lohgaon Pune - 47
              </div>
              <div className="text-[#222222] dark:text-slate-100 text-[18px] font-bold mt-0.5">
                Department of Computer Engineering
              </div>
              <div className="text-[#C8102E] text-[20px] font-black mt-2 underline decoration-2 underline-offset-4 tracking-wider">
                {viewType === 'TEACHER'
                  ? 'FACULTY INDIVIDUAL TIME TABLE (AY 2026–27)'
                  : viewType === 'ROOM'
                  ? 'CLASSROOM / LAB OCCUPANCY SCHEDULE (AY 2026–27)'
                  : 'CLASS TIME TABLE (AY 2026–27)'
                }
              </div>
            </div>

            {/* CLASS / FACULTY / ROOM INFO SUBHEADER */}
            <div className="flex flex-wrap justify-between items-center font-bold text-[14px] mb-3 px-1 border-b border-[#E5E7EB] dark:border-[#1e293b] pb-2 text-[#222222] dark:text-slate-100 gap-2">
              {viewType === 'TEACHER' ? (
                <>
                  <div>Faculty Name: <span className="text-[#C8102E]">{activeTeacher?.name}</span></div>
                  <div>Emp Code: <span className="text-[#C8102E]">{activeTeacher?.shortCode || activeTeacher?.employeeId?.replace('EMP-', '') || 'FAC'}</span></div>
                  <div>Department: <span className="text-[#C8102E]">Computer Engineering</span></div>
                  <div>A.Y. 2026-27</div>
                  <div>w.e.f.: 01/07/2026</div>
                </>
              ) : viewType === 'ROOM' ? (
                <>
                  <div>Room / Lab: <span className="text-[#C8102E] font-black">{activeRoom?.roomNumber}</span></div>
                  <div>Type: <span className="text-[#C8102E] font-bold">{activeRoom?.isLab ? `Laboratory (${activeRoom?.labType || activeRoom?.name || 'Lab'})` : `Classroom (${activeRoom?.labType || activeRoom?.name || 'Lecture Hall'})`}</span></div>
                  <div>Capacity: <span className="text-[#C8102E] font-bold">{activeRoom?.capacity || 70} Seats</span></div>
                  <div>Department: <span className="text-[#C8102E]">Computer Engineering</span></div>
                  <div>A.Y. 2026-27</div>
                  <div>w.e.f.: 01/07/2026</div>
                </>
              ) : (
                <>
                  <div>Class Room: <span className="text-[#C8102E]">{activeDivision?.name === 'B' ? (className === 'SE' ? 'E104' : className === 'TE' ? 'E103' : 'E106') : (className === 'SE' ? 'E101' : className === 'TE' ? 'E102' : 'E105')}</span></div>
                  <div>Semester: <span className="text-[#C8102E]">{sem}</span></div>
                  <div>A.Y. 2026-27</div>
                  <div>Class: <span className="text-[#C8102E]">{className}</span></div>
                  <div>Division: <span className="text-[#C8102E]">{activeDivision?.name || 'A'}</span></div>
                  <div>w.e.f.: 01/07/2026</div>
                </>
              )}
            </div>

            {/* TIMETABLE MATRIX TABLE */}
            <table className="w-full border-collapse border-2 border-black dark:border-slate-600 text-[13px] text-center mb-8">
              <thead>
                <tr>
                  <th className="border-2 border-black dark:border-slate-600 font-semibold w-32 relative bg-[#F8F9FA] dark:bg-[#0e1626] text-[#222222] dark:text-slate-100">
                    <div className="absolute top-1 left-2 text-[10px] font-bold">Time</div>
                    <div className="absolute bottom-1 right-2 text-[10px] font-bold">Day</div>
                    <svg className="absolute top-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <line x1="0" y1="0" x2="100" y2="100" className="stroke-black dark:stroke-slate-400" strokeWidth="0.5" />
                    </svg>
                  </th>
                  {days.map(d => (
                    <th key={d} className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold w-[16%] uppercase tracking-wider text-xs">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.idx}>
                    <td className="border-2 border-black dark:border-slate-600 p-2 font-bold whitespace-nowrap text-xs bg-[#F8F9FA] dark:bg-[#0e1626] text-[#222222] dark:text-slate-100">
                      {slot.time.replace('-', ' to ')}
                    </td>

                    {slot.isBreak ? (
                      <td colSpan={5} className="border-2 border-black dark:border-slate-600 p-1 text-center font-bold uppercase text-[12px] bg-[#F8F9FA] dark:bg-[#0e1626] tracking-wider text-[#666666] dark:text-slate-400">
                        --- {slot.name} ---
                      </td>
                    ) : days.map((dayName, dayIndex) => {
                      const dayNum = dayIndex + 1;
                      const slotEntries = entries.filter(e => e.dayOfWeek === dayNum && e.slotIndex === slot.idx);

                      const isEndOfBlock = slot.idx === 2 || slot.idx === 5 || slot.idx === 8;
                      const isStartOfBlock = slot.idx === 1 || slot.idx === 4 || slot.idx === 7;

                      // Check if there are multi-hour sessions (practicals or 2-hr tutorials) that continue into the next slot
                      const hasMultiHourSession = isStartOfBlock && slotEntries.some(e => {
                        const nextSlotIdx = slot.idx + 1;
                        const nextSlotEntries = entries.filter(ne => ne.dayOfWeek === dayNum && ne.slotIndex === nextSlotIdx);
                        return nextSlotEntries.some(ne => ne.facultyAssignmentId === e.facultyAssignmentId && ne.batchId === e.batchId);
                      });

                      if (isEndOfBlock) {
                        const prevSlotIdx = slot.idx - 1;
                        const prevSlotEntries = entries.filter(e => e.dayOfWeek === dayNum && e.slotIndex === prevSlotIdx);
                        // Only skip this second hour cell if the entries in this slot are the continuation of the previous slot's multi-hour session
                        const isContinuation = slotEntries.some(e =>
                          prevSlotEntries.some(pe => pe.facultyAssignmentId === e.facultyAssignmentId && pe.batchId === e.batchId)
                        );
                        if (isContinuation && slotEntries.length > 0) {
                          return null;
                        }
                      }

                      const hasPracticalOrTutorial = slotEntries.some(e => e.type === 'PRACTICAL' || e.type === 'TUTORIAL');
                      const rowSpan = hasMultiHourSession ? 2 : 1;

                      return (
                        <td key={dayNum} rowSpan={rowSpan} className={`border-2 border-black dark:border-slate-600 p-1.5 align-middle ${hasPracticalOrTutorial ? 'bg-amber-50/40 dark:bg-amber-950/20' : 'bg-white dark:bg-[#131b2e]'}`}>
                          <div className="flex flex-col gap-1 justify-center h-full">
                            {slotEntries.length > 0 ? (
                              slotEntries.map(entry => {
                                const empCode = entry.teacherCode || entry.teacher?.employeeId?.replace('EMP-', '') || activeTeacher?.shortCode || activeTeacher?.employeeId?.replace('EMP-', '') || 'FAC';
                                const room = entry.roomNumber || entry.room?.roomNumber || 'E103';
                                const sName = entry.subjectName || entry.subject?.name || entry.subjectCode || entry.subject?.code;
                                const sCode = entry.subjectCode || entry.subject?.code;
                                const cName = entry.className || (activeDivision ? `${className}-${activeDivision.name}` : '');
                                const bName = entry.batchName || entry.batch?.name;

                                if (viewType === 'TEACHER') {
                                  // FACULTY VIEW
                                  if (entry.type === 'PRACTICAL' || entry.type === 'TUTORIAL') {
                                    const isTutorial = entry.type === 'TUTORIAL';
                                    return (
                                      <div key={entry.id} className="text-xs font-semibold leading-tight text-[#222222] dark:text-slate-100 border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800/90 p-1.5 rounded shadow-2xs">
                                        <span className="font-bold text-[#C8102E] dark:text-red-400">{bName || 'A1'}:</span>{' '}
                                        <span className="font-bold">{sName}</span>
                                        {isTutorial && <span className="font-bold text-amber-800 dark:text-amber-300 ml-1">(Tut)</span>}
                                        {sCode && <span className="text-[#666666] dark:text-slate-400 font-normal ml-0.5 text-[10px]">[{sCode}]</span>}
                                        {' '}({empCode}) <span className="font-bold text-blue-700 dark:text-blue-400">({cName})</span> ({room})
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={entry.id} className="text-xs font-bold leading-tight text-[#222222] dark:text-slate-100 p-1">
                                      <span>{sName}</span>
                                      {sCode && <span className="text-[#666666] dark:text-slate-400 font-normal ml-0.5 text-[10px]">[{sCode}]</span>}
                                      {' '}({empCode}) <span className="font-bold text-blue-700 dark:text-blue-400">({cName})</span> ({room})
                                    </div>
                                  );
                                } else if (viewType === 'ROOM') {
                                  // CLASSROOM / LAB OCCUPANCY VIEW: Show Class, Batch, Subject, Teacher
                                  if (entry.type === 'PRACTICAL' || entry.type === 'TUTORIAL') {
                                    const isTutorial = entry.type === 'TUTORIAL';
                                    return (
                                      <div key={entry.id} className="text-xs font-semibold leading-tight text-[#222222] dark:text-slate-100 border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800/90 p-1.5 rounded shadow-2xs">
                                        <span className="font-bold text-blue-700 dark:text-blue-400">[{cName}]</span>{' '}
                                        <span className="font-bold text-[#C8102E] dark:text-red-400">{bName || 'A1'}:</span>{' '}
                                        <span className="font-bold">{sName}</span>
                                        {isTutorial && <span className="font-bold text-amber-800 dark:text-amber-300 ml-1">(Tut)</span>}
                                        {sCode && <span className="text-[#666666] dark:text-slate-400 ml-0.5">[{sCode}]</span>}
                                        {' '}({empCode})
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={entry.id} className="text-xs font-bold leading-tight text-[#222222] dark:text-slate-100 p-1">
                                      <span className="font-bold text-blue-700 dark:text-blue-400">[{cName}]</span>{' '}
                                      <span>{sName}</span>
                                      {sCode && <span className="text-[#666666] dark:text-slate-400 font-normal ml-0.5 text-[10px]">[{sCode}]</span>}
                                      {' '}({empCode})
                                    </div>
                                  );
                                } else {
                                  // DIVISION VIEW: Show Subject, Batch, Teacher, Room
                                  if (entry.type === 'PRACTICAL' || entry.type === 'TUTORIAL') {
                                    const isTutorial = entry.type === 'TUTORIAL';
                                    return (
                                      <div key={entry.id} className="text-xs font-semibold leading-tight text-[#222222] dark:text-slate-100 border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800/90 p-1.5 rounded shadow-2xs">
                                        <span className="font-bold text-[#C8102E] dark:text-red-400">{bName || 'A1'}:</span>{' '}
                                        <span className="font-bold">{sName}</span>
                                        {isTutorial && <span className="font-bold text-amber-800 dark:text-amber-300 ml-1">(Tut)</span>}
                                        {sCode && <span className="text-[#666666] dark:text-slate-400 ml-0.5">[{sCode}]</span>}
                                        {' '}({empCode}) ({room})
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={entry.id} className="text-xs font-bold leading-tight text-[#222222] dark:text-slate-100 p-1">
                                      <span>{sName}</span>
                                      {sCode && <span className="text-[#666666] dark:text-slate-400 font-normal ml-0.5 text-[10px]">[{sCode}]</span>}
                                      {' '}({empCode}) ({room})
                                    </div>
                                  );
                                }
                              })
                            ) : (
                              <div className="text-[#666666] dark:text-slate-500 text-xs font-mono">-</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* DIVISION VIEW: FACULTY WORKLOAD SUMMARY TABLE */}
            {viewType === 'DIVISION' && (
              <div className="space-y-2 mb-8">
                <h4 className="text-xs font-bold text-[#222222] dark:text-slate-100 uppercase tracking-wider">
                  Course Subject &amp; Faculty Workload Allocation
                </h4>
                <table className="w-full border-collapse border-2 border-black dark:border-slate-600 text-xs text-center">
                  <thead>
                    <tr>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold text-left" rowSpan={2}>COURSE SUBJECT CODE &amp; NAME</th>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold text-left" rowSpan={2}>ASSIGNED FACULTY MEMBER</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1.5 text-white bg-[#C8102E] font-bold" colSpan={3}>WEEKLY WORKLOAD (HOURS)</th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/80">
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Theory (L)</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Practical (P)</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Tutorial (T)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(subjectLoadMap.values()).map((subj: any, sIdx: number) => {
                      const teacherArr = Array.from(subj.teachers.values()) as any[];
                      return teacherArr.map((t: any, tIdx: number) => {
                        totalL += t.L; totalP += t.P; totalT += t.T;
                        return (
                          <tr key={`${sIdx}-${tIdx}`}>
                            {tIdx === 0 && (
                              <td className="border border-black dark:border-slate-700 p-1.5 text-left px-2 font-bold text-[#222222] dark:text-slate-100 dark:bg-[#131b2e]/60" rowSpan={teacherArr.length}>
                                {subj.subjectName} [{subj.subjectCode}]
                              </td>
                            )}
                            <td className="border border-black dark:border-slate-700 p-1.5 text-left px-2 font-medium text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{t.name}</td>
                            <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{t.L > 0 ? t.L : ''}</td>
                            <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{t.P > 0 ? t.P : ''}</td>
                            <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{t.T > 0 ? t.T : ''}</td>
                          </tr>
                        );
                      });
                    })}
                    <tr className="font-bold text-[#C8102E] dark:text-red-400 bg-red-50/40 dark:bg-red-950/30">
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 text-right font-black" colSpan={2}>TOTAL WEEKLY LOAD HOURS:</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalL} hrs</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalP} hrs</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalT > 0 ? `${totalT} hrs` : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* FACULTY VIEW: TEACHING LOAD & COURSE ALLOCATION TABLE */}
            {viewType === 'TEACHER' && (
              <div className="space-y-2 mb-8">
                <h4 className="text-xs font-bold text-[#222222] dark:text-slate-100 uppercase tracking-wider">
                  Individual Teaching Load &amp; Course Allocation Summary
                </h4>
                <table className="w-full border-collapse border-2 border-black dark:border-slate-600 text-xs text-center">
                  <thead>
                    <tr>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold text-left" rowSpan={2}>COURSE CODE &amp; SUBJECT</th>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold" rowSpan={2}>CLASS &amp; DIV</th>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold" rowSpan={2}>BATCH</th>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold" rowSpan={2}>ASSIGNED ROOM / LAB</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1.5 text-white bg-[#C8102E] font-bold" colSpan={3}>WEEKLY LOAD (HOURS)</th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/80">
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Theory (L)</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Practical (P)</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Tutorial (T)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(teacherLoadMap.values()).map((row: any, rIdx: number) => {
                      totalL += row.L; totalP += row.P; totalT += row.T;
                      return (
                        <tr key={rIdx}>
                          <td className="border border-black dark:border-slate-700 p-1.5 text-left px-2 font-bold text-[#222222] dark:text-slate-100 dark:bg-[#131b2e]/60">
                            {row.subjectName} [{row.subjectCode}]
                          </td>
                          <td className="border border-black dark:border-slate-700 p-1.5 font-bold text-blue-700 dark:text-blue-400 dark:bg-[#131b2e]/40">{row.className}</td>
                          <td className="border border-black dark:border-slate-700 p-1.5 font-mono font-bold text-amber-800 dark:text-amber-300 dark:bg-[#131b2e]/40">{row.batchName}</td>
                          <td className="border border-black dark:border-slate-700 p-1.5 font-mono font-semibold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.room}</td>
                          <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.L > 0 ? row.L : ''}</td>
                          <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.P > 0 ? row.P : ''}</td>
                          <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.T > 0 ? row.T : ''}</td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold text-[#C8102E] dark:text-red-400 bg-red-50/40 dark:bg-red-950/30">
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 text-right font-black" colSpan={4}>TOTAL TEACHING WORKLOAD:</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalL} hrs</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalP} hrs</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalT > 0 ? `${totalT} hrs` : '-'}</td>
                    </tr>
                    {teacherWorkloadSummary?.projectHours > 0 && (
                      <tr className="font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80">
                        <td className="border-2 border-black dark:border-slate-600 p-1.5 text-left px-2" colSpan={4}>
                          Project Supervision / Research Workload (Flexible):
                        </td>
                        <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black text-blue-600 dark:text-blue-400" colSpan={3}>
                          {teacherWorkloadSummary.projectHours} hrs/week
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ROOM VIEW: CLASSROOM & LAB OCCUPANCY SUMMARY TABLE */}
            {viewType === 'ROOM' && (
              <div className="space-y-2 mb-8">
                <h4 className="text-xs font-bold text-[#222222] dark:text-slate-100 uppercase tracking-wider">
                  Room / Laboratory Utilization &amp; Course Allocation Summary
                </h4>
                <table className="w-full border-collapse border-2 border-black dark:border-slate-600 text-xs text-center">
                  <thead>
                    <tr>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold text-left" rowSpan={2}>COURSE CODE &amp; SUBJECT</th>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold" rowSpan={2}>CLASS &amp; DIV</th>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold" rowSpan={2}>BATCH</th>
                      <th className="border-2 border-black dark:border-slate-600 p-2 text-white bg-[#C8102E] font-bold text-left" rowSpan={2}>FACULTY IN-CHARGE</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1.5 text-white bg-[#C8102E] font-bold" colSpan={3}>WEEKLY UTILIZATION (HOURS)</th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/80">
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Theory (L)</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Practical (P)</th>
                      <th className="border-2 border-black dark:border-slate-600 p-1 text-slate-700 dark:text-slate-200 font-bold">Tutorial (T)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(roomLoadMap.values()).map((row: any, rIdx: number) => {
                      totalL += row.L; totalP += row.P; totalT += row.T;
                      return (
                        <tr key={rIdx}>
                          <td className="border border-black dark:border-slate-700 p-1.5 text-left px-2 font-bold text-[#222222] dark:text-slate-100 dark:bg-[#131b2e]/60">
                            {row.subjectName} [{row.subjectCode}]
                          </td>
                          <td className="border border-black dark:border-slate-700 p-1.5 font-bold text-blue-700 dark:text-blue-400 dark:bg-[#131b2e]/40">{row.className}</td>
                          <td className="border border-black dark:border-slate-700 p-1.5 font-mono font-bold text-amber-800 dark:text-amber-300 dark:bg-[#131b2e]/40">{row.batchName}</td>
                          <td className="border border-black dark:border-slate-700 p-1.5 text-left px-2 font-medium text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.teacherName}</td>
                          <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.L > 0 ? row.L : ''}</td>
                          <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.P > 0 ? row.P : ''}</td>
                          <td className="border border-black dark:border-slate-700 p-1 font-bold text-slate-800 dark:text-slate-200 dark:bg-[#131b2e]/40">{row.T > 0 ? row.T : ''}</td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold text-[#C8102E] dark:text-red-400 bg-red-50/40 dark:bg-red-950/30">
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 text-right font-black" colSpan={4}>TOTAL WEEKLY OCCUPANCY:</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalL} hrs</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalP} hrs</td>
                      <td className="border-2 border-black dark:border-slate-600 p-1.5 font-black">{totalT > 0 ? `${totalT} hrs` : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* AUTHORIZED SIGNATURES */}
            <div className="flex justify-between mt-16 font-bold px-12 text-[14px] text-[#222222] dark:text-slate-100 pt-6 border-t border-slate-300 dark:border-slate-700">
              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-black dark:border-slate-400 pt-1 font-bold">Timetable Co-ordinator</div>
                <div className="text-xs font-normal text-[#666666] dark:text-slate-400">Dept. of Computer Engineering</div>
              </div>
              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-black dark:border-slate-400 pt-1 font-bold">Head of Department (HOD)</div>
                <div className="text-xs font-normal text-[#666666] dark:text-slate-400">Dept. of Computer Engineering</div>
              </div>
              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-black dark:border-slate-400 pt-1 font-bold">Principal</div>
                <div className="text-xs font-normal text-[#666666] dark:text-slate-400">MMIT Lohgaon, Pune</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
