import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import {
  X, Loader2, CheckCircle2, AlertTriangle, XCircle,
  BarChart2, Cpu, ChevronRight, Info, BookOpen, Users,
  DoorOpen, CalendarDays, Layers, Clock
} from "lucide-react";

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated?: (timetable: any) => void;
}

type Step = "preview" | "generating" | "result";

interface Preview {
  classWorkload: { total: number; theory: number; practical: number; tutorial: number };
  facultyWorkload: { total: number; academic: number; project: number };
  resources: {
    assignments: number; faculty: number; divisions: number; batches: number;
    rooms: number; labs: number; classrooms: number;
    teachingSlotsPerDay: number; teachingSlotsPerWeek: number;
    practicalBlocksPerDay: number;
  };
  feasibility: { practicalFeasible: boolean; theoryFeasible: boolean };
}

interface GenerationResult {
  timetable: { id: string; name: string; isValid: boolean };
  status: "COMPLETE" | "PARTIAL";
  stats: {
    totalSessions: number; scheduledSessions: number;
    mandatoryHours: number; scheduledHours: number;
    coveragePercent: number; solveTimeMs: number;
  };
  projectWorkload: Array<{ teacherName: string; projectHours: number; note: string }>;
  diagnostics: Array<{ teacherName: string; subjectName: string; subjectCode: string; divisionName: string; reason: string; details: string }>;
  unscheduled: Array<{ teacher: string; subject: string; division: string; type: string }>;
  message: string;
}

const GEN_STEPS = [
  "Loading assignments...",
  "Building constraint model...",
  "Solving timetable (CSP)...",
  "Validating constraints...",
  "Saving timetable...",
  "Done!",
];

export function GenerateModal({ isOpen, onClose, onGenerated }: GenerateModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("preview");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [genStepIdx, setGenStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"COMPLETE" | "BEST_EFFORT">("BEST_EFFORT");
  const [departmentId, setDepartmentId] = useState("ALL");

  useEffect(() => {
    if (isOpen && step === "preview") {
      fetchPreview();
    }
  }, [isOpen]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch(apiUrl(`/api/timetables/preview?departmentId=${departmentId}`));
      if (res.ok) setPreview(await res.json());
    } catch { }
    setLoadingPreview(false);
  };

  const generate = async () => {
    setStep("generating");
    setGenStepIdx(0);
    setError(null);

    // Animate progress steps
    const interval = setInterval(() => {
      setGenStepIdx(prev => prev < GEN_STEPS.length - 2 ? prev + 1 : prev);
    }, 1200);

    try {
      const res = await fetch(apiUrl("/api/timetables/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, departmentId: departmentId === "ALL" ? undefined : departmentId }),
      });

      clearInterval(interval);
      setGenStepIdx(GEN_STEPS.length - 1);

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setStep("result");
        if (onGenerated && data.timetable) {
          onGenerated(data.timetable);
        }
      } else {
        const err = await res.json();
        setError(err.message || "Generation failed");
        setStep("result");
      }
    } catch (e: any) {
      clearInterval(interval);
      setError(e.message || "Network error — is the backend running?");
      setStep("result");
    }
  };

  const handleClose = () => {
    setStep("preview");
    setResult(null);
    setError(null);
    setGenStepIdx(0);
    onClose();
  };

  const handleViewTimetable = () => {
    const timetableId = result?.timetable?.id;
    handleClose();
    if (timetableId) {
      router.push(`/timetables/${timetableId}`);
    } else {
      router.push('/timetables');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FEF2F2] rounded-lg">
              <Cpu className="w-5 h-5 text-[#C8102E]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Auto-Generate Timetable</h2>
              <p className="text-[11px] text-slate-500">Constraint-based CSP solver · 0 conflicts guaranteed</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Step: Preview ── */}
          {step === "preview" && (
            <>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C8102E]" />
                  <span className="ml-2 text-sm text-slate-500">Loading generation preview...</span>
                </div>
              ) : preview ? (
                <>
                  {/* Options */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Generation Mode</label>
                      <div className="flex gap-2">
                        {(["BEST_EFFORT", "COMPLETE"] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                              mode === m
                                ? "bg-[#C8102E] text-white border-[#C8102E]"
                                : "bg-white text-slate-600 border-slate-200 hover:border-[#C8102E]"
                            }`}
                          >
                            {m === "BEST_EFFORT" ? "Best Effort" : "Complete Only"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Department</label>
                      <select
                        className="mmit-input"
                        value={departmentId}
                        onChange={e => setDepartmentId(e.target.value)}
                      >
                        <option value="ALL">All Departments</option>
                      </select>
                    </div>
                  </div>

                  {/* Workload Summary */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200">
                      <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Timetable Generation Preview</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xl font-black text-[#C8102E]">{preview.classWorkload.total} hrs</p>
                        <p className="text-[11px] font-bold text-slate-600">Mandatory Class Hours</p>
                        <p className="text-[10px] text-slate-400">
                          Theory: {preview.classWorkload.theory} · Practical: {preview.classWorkload.practical} · Tutorial: {preview.classWorkload.tutorial}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xl font-black text-blue-700">{preview.facultyWorkload.total} hrs</p>
                        <p className="text-[11px] font-bold text-slate-600">Total Faculty Workload</p>
                        <p className="text-[10px] text-slate-400">
                          Academic: {preview.facultyWorkload.academic} · Project: {preview.facultyWorkload.project} hrs (flexible)
                        </p>
                      </div>
                    </div>
                    <div className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
                      <MiniStat label="Assignments" value={preview.resources.assignments} icon={Layers} />
                      <MiniStat label="Faculty" value={preview.resources.faculty} icon={Users} />
                      <MiniStat label="Divisions" value={preview.resources.divisions} icon={BookOpen} />
                      <MiniStat label="Rooms" value={preview.resources.rooms} icon={DoorOpen} />
                      <MiniStat label="Slots/Day" value={preview.resources.teachingSlotsPerDay} icon={Clock} />
                      <MiniStat label="Slots/Week" value={preview.resources.teachingSlotsPerWeek} icon={CalendarDays} />
                    </div>
                    <div className="px-4 pb-4 flex gap-2">
                      <FeasibilityBadge label="Practical scheduling" feasible={preview.feasibility.practicalFeasible} />
                      <FeasibilityBadge label="Theory scheduling" feasible={preview.feasibility.theoryFeasible} />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Project hours excluded from class timetable
                    </p>
                    <p className="text-[11px] text-amber-600 mt-1">
                      {preview.facultyWorkload.project} project hours/week are faculty-only workload and won't consume classroom or lab slots.
                    </p>
                  </div>

                  <button
                    onClick={generate}
                    className="w-full mmit-btn-primary justify-center py-3 text-sm cursor-pointer"
                  >
                    <Cpu className="w-4 h-4" />
                    Generate Timetable
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Failed to load preview — check backend connection
                </div>
              )}
            </>
          )}

          {/* ── Step: Generating ── */}
          {step === "generating" && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <Loader2 className="w-16 h-16 text-[#C8102E] animate-spin" />
                  <Cpu className="w-6 h-6 text-[#C8102E] absolute inset-0 m-auto" />
                </div>
                <h3 className="text-base font-black text-slate-900">Solving Timetable</h3>
                <p className="text-xs text-slate-500 mt-1">Constraint-based CSP — processing all hard constraints</p>
              </div>
              <div className="space-y-2">
                {GEN_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    i < genStepIdx ? "bg-green-50" : i === genStepIdx ? "bg-[#FEF2F2] border border-red-100" : "bg-slate-50 opacity-40"
                  }`}>
                    {i < genStepIdx ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : i === genStepIdx ? (
                      <Loader2 className="w-4 h-4 text-[#C8102E] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                    )}
                    <span className={`text-xs font-semibold ${
                      i < genStepIdx ? "text-green-600" : i === genStepIdx ? "text-[#C8102E]" : "text-slate-400"
                    }`}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Result ── */}
          {step === "result" && (
            <>
              {error ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                    <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700">Generation Failed</p>
                      <p className="text-xs text-red-600 mt-1">{error}</p>
                    </div>
                  </div>
                  <button onClick={() => setStep("preview")} className="w-full mmit-btn-primary justify-center cursor-pointer">
                    Try Again
                  </button>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                    result.status === "COMPLETE"
                      ? "bg-green-50 border-green-200"
                      : "bg-amber-50 border-amber-200"
                  }`}>
                    {result.status === "COMPLETE"
                      ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                      : <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-black ${result.status === "COMPLETE" ? "text-green-700" : "text-amber-700"}`}>
                        {result.status === "COMPLETE" ? "Generation Complete!" : "Partial Timetable Generated"}
                      </p>
                      <p className="text-xs mt-0.5 text-slate-600">{result.message}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <ResultStat
                      label="Class Hours"
                      value={`${result.stats.scheduledHours}/${result.stats.mandatoryHours}`}
                      ok={result.stats.coveragePercent === 100}
                    />
                    <ResultStat
                      label="Coverage"
                      value={`${result.stats.coveragePercent}%`}
                      ok={result.stats.coveragePercent === 100}
                    />
                    <ResultStat
                      label="Sessions Placed"
                      value={`${result.stats.scheduledSessions}/${result.stats.totalSessions}`}
                      ok={result.stats.scheduledSessions === result.stats.totalSessions}
                    />
                    <ResultStat
                      label="Solve Time"
                      value={`${(result.stats.solveTimeMs / 1000).toFixed(1)}s`}
                      ok={true}
                    />
                  </div>

                  {/* Project Workload Note */}
                  {result.projectWorkload?.length > 0 && (
                    <div className="bg-blue-50 rounded-lg border border-blue-100 p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1.5">📋 Faculty Project Workload (not in class timetable)</p>
                      {result.projectWorkload.slice(0, 3).map((pw, i) => (
                        <p key={i} className="text-[11px] text-blue-600">
                          {pw.teacherName}: {pw.projectHours} hrs/week — {pw.note}
                        </p>
                      ))}
                      {result.projectWorkload.length > 3 && (
                        <p className="text-[11px] text-blue-400 mt-1">
                          +{result.projectWorkload.length - 3} more faculty with project workload
                        </p>
                      )}
                    </div>
                  )}

                  {/* Unscheduled */}
                  {result.unscheduled?.length > 0 && (
                    <div className="bg-red-50 rounded-lg border border-red-100 p-3">
                      <p className="text-xs font-bold text-red-700 mb-2">
                        ⚠️ {result.unscheduled.length} sessions could not be scheduled
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {result.unscheduled.slice(0, 8).map((u, i) => (
                          <div key={i} className="text-[10px] text-red-600 flex items-start gap-1">
                            <span className="font-bold shrink-0">{u.type}:</span>
                            <span>{u.subject} — {u.teacher} ({u.division})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={handleViewTimetable} className="flex-1 mmit-btn-primary justify-center cursor-pointer">
                      View Timetable
                    </button>
                    <button
                      onClick={() => { setStep("preview"); setResult(null); }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    >
                      Generate Again
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-200">
      <Icon className="w-3.5 h-3.5 text-slate-400 mx-auto mb-0.5" />
      <p className="text-sm font-black text-slate-800">{value}</p>
      <p className="text-[9px] text-slate-400 font-medium">{label}</p>
    </div>
  );
}

function FeasibilityBadge({ label, feasible }: { label: string; feasible: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
      feasible
        ? "bg-green-50 text-green-600 border-green-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}>
      {feasible ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label} — {feasible ? "Feasible" : "May overflow"}
    </span>
  );
}

function ResultStat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`p-3 rounded-lg border text-center ${ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
      <p className={`text-lg font-black ${ok ? "text-green-700" : "text-amber-700"}`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
