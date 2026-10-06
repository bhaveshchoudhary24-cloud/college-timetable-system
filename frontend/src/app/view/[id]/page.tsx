"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { Clock, BookOpen, FlaskConical, Layers, MapPin, Users } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const TIME_SLOTS = [
  { idx: 1, start: "08:30", end: "09:30", isBreak: false },
  { idx: 2, start: "09:30", end: "10:30", isBreak: false },
  { idx: 3, start: "10:30", end: "10:45", isBreak: true,  label: "Short Recess" },
  { idx: 4, start: "10:45", end: "11:45", isBreak: false },
  { idx: 5, start: "11:45", end: "12:45", isBreak: false },
  { idx: 6, start: "12:45", end: "13:30", isBreak: true,  label: "Lunch Break" },
  { idx: 7, start: "13:30", end: "14:30", isBreak: false },
  { idx: 8, start: "14:30", end: "15:30", isBreak: false },
];

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  LECTURE:   { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200",   label: "Lecture"    },
  PRACTICAL: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", label: "Practical"  },
  TUTORIAL:  { bg: "bg-amber-50",  text: "text-amber-800",  border: "border-amber-200",  label: "Tutorial"   },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayDayIndex(): number {
  const d = new Date().getDay(); // 0=Sun
  if (d === 0 || d === 6) return 1; // weekend → show Monday
  return d; // 1–5
}

function currentSlotIndex(): number | null {
  const now = new Date();
  const hm = now.getHours() * 60 + now.getMinutes();
  for (const s of TIME_SLOTS) {
    if (s.isBreak) continue;
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    if (hm >= sh * 60 + sm && hm < eh * 60 + em) return s.idx;
  }
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Division { id: string; name: string; displayName: string; classLabel: string; }
interface Entry {
  day: number; slot: number; startTime: string; endTime: string; type: string;
  subjectCode: string; subjectName: string; teacherName: string;
  roomNumber: string; isLab: boolean; batchName: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MobileTimetableViewer() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [timetableName, setTimetableName] = useState("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivId, setSelectedDivId] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("All");
  const [activeDay, setActiveDay] = useState<number>(todayDayIndex());
  const [loading, setLoading] = useState(true);
  const [divLoading, setDivLoading] = useState(false);

  // Initial load — fetch timetable meta + divisions
  useEffect(() => {
    fetch(apiUrl(`/api/public/timetables/${id}`))
      .then((r) => r.json())
      .then(({ timetable, divisions: divs }) => {
        setTimetableName(timetable?.name ?? "MMIT Timetable");
        setDivisions(divs ?? []);

        // If QR code included ?division= param, pre-select it
        const qrDiv = searchParams.get("division");
        if (qrDiv && divs.some((d: Division) => d.id === qrDiv)) {
          setSelectedDivId(qrDiv);
        } else if (divs.length > 0) {
          setSelectedDivId(divs[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, searchParams]);

  // Load entries whenever selected division changes
  useEffect(() => {
    if (!selectedDivId) return;
    setDivLoading(true);
    fetch(apiUrl(`/api/public/timetables/${id}/division/${selectedDivId}`))
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
        setSelectedBatch("All");
        setDivLoading(false);
      })
      .catch(() => setDivLoading(false));
  }, [id, selectedDivId]);

  // Derived data
  const batches = ["All", ...Array.from(new Set(
    entries.filter((e) => e.batchName).map((e) => e.batchName!)
  )).sort()];

  const filteredEntries = entries.filter((e) => {
    if (selectedBatch === "All") return true;
    return !e.batchName || e.batchName === selectedBatch;
  });

  const dayEntries = filteredEntries.filter((e) => e.day === activeDay);
  const currentSlot = currentSlotIndex();
  const selectedDiv = divisions.find((d) => d.id === selectedDivId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 text-sm">Loading timetable…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Header ── */}
      <header className="bg-blue-700 px-4 pb-3 pt-4 text-white shadow-md">
        <p className="text-xs font-medium tracking-widest uppercase opacity-80">MMIT • Computer Engineering</p>
        <h1 className="mt-0.5 text-lg font-bold leading-tight">Class Timetable</h1>
        <p className="mt-0.5 text-xs opacity-70 truncate">{timetableName}</p>
      </header>

      {/* ── Division Chips ── */}
      <div className="overflow-x-auto bg-white px-4 py-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Select Class</p>
        <div className="flex gap-2 pb-1">
          {divisions.map((div) => (
            <button
              key={div.id}
              onClick={() => setSelectedDivId(div.id)}
              className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                selectedDivId === div.id
                  ? "border-blue-600 bg-blue-600 text-white shadow"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300"
              }`}
            >
              {div.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* ── Batch Filter (only if practicals exist) ── */}
      {batches.length > 1 && (
        <div className="overflow-x-auto bg-white px-4 pb-3 border-b border-gray-100">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Batch</p>
          <div className="flex gap-2">
            {batches.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBatch(b)}
                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  selectedBatch === b
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-purple-300"
                }`}
              >
                {b === "All" ? "All Batches" : `Batch ${b}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Day Tabs ── */}
      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white shadow-sm">
        {DAY_NAMES.map((day, i) => {
          const dayNum = i + 1;
          const isToday = dayNum === todayDayIndex();
          const isActive = dayNum === activeDay;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(dayNum)}
              className={`flex-1 py-3 text-xs font-semibold transition-all ${
                isActive
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {DAY_SHORT[i]}
              {isToday && (
                <span className={`ml-0.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${isActive ? "bg-blue-600" : "bg-green-500"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Schedule Cards ── */}
      <main className="px-4 py-4 space-y-2 pb-8">
        {divLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          TIME_SLOTS.map((slot) => {
            if (slot.isBreak) {
              return (
                <div key={slot.idx} className="flex items-center gap-3 py-1">
                  <div className="flex-1 border-t border-dashed border-gray-300" />
                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                    {slot.label} · {slot.start}–{slot.end}
                  </span>
                  <div className="flex-1 border-t border-dashed border-gray-300" />
                </div>
              );
            }

            const entry = dayEntries.find((e) => e.slot === slot.idx);
            const isNow = slot.idx === currentSlot && activeDay === todayDayIndex();
            const style = entry ? (TYPE_STYLES[entry.type] ?? TYPE_STYLES.LECTURE) : null;

            return (
              <div
                key={slot.idx}
                className={`relative rounded-xl border transition-shadow ${
                  isNow ? "ring-2 ring-blue-500 shadow-md" : "shadow-sm"
                } ${
                  entry ? `${style!.bg} ${style!.border}` : "border-gray-100 bg-white"
                }`}
              >
                {/* NOW badge */}
                {isNow && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide shadow">
                    NOW
                  </span>
                )}

                <div className="flex items-start gap-3 px-4 py-3">
                  {/* Time column */}
                  <div className="flex-shrink-0 text-center w-14">
                    <span className="block text-[11px] font-bold text-gray-600">{slot.start}</span>
                    <span className="block text-[9px] text-gray-400">–{slot.end}</span>
                  </div>

                  {/* Divider */}
                  <div className={`mt-1 w-px self-stretch ${entry ? `bg-current opacity-20` : "bg-gray-200"}`} />

                  {/* Content */}
                  {entry ? (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-bold text-sm leading-tight ${style!.text} truncate`}>
                          {entry.subjectName}
                        </p>
                        <span className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${style!.bg} ${style!.text} border ${style!.border}`}>
                          {entry.type === "PRACTICAL" ? "Lab" : entry.type === "TUTORIAL" ? "Tut" : "Lec"}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-[11px] opacity-70 ${style!.text}`}>{entry.subjectCode}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {entry.teacherName && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-600">
                            <Users className="h-3 w-3" />
                            {entry.teacherName}
                          </span>
                        )}
                        {entry.roomNumber && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {entry.roomNumber}
                          </span>
                        )}
                        {entry.batchName && (
                          <span className="flex items-center gap-1 text-[11px] text-purple-700 font-medium">
                            <Layers className="h-3 w-3" />
                            Batch {entry.batchName}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="flex-1 self-center text-sm text-gray-400">Free Period</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="pb-safe border-t border-gray-100 bg-white px-4 py-3 text-center">
        <p className="text-[10px] text-gray-400">
          MMIT • Mahatma Gandhi Institute of Technology • Computer Engineering
        </p>
        {selectedDiv && (
          <p className="text-[10px] text-gray-400">{selectedDiv.displayName}</p>
        )}
      </footer>
    </div>
  );
}
