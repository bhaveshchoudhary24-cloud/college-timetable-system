"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

export default function ViewRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch(apiUrl("/api/public/timetables"))
      .then((r) => r.json())
      .then((timetables) => {
        if (Array.isArray(timetables) && timetables.length > 0) {
          router.replace(`/view/${timetables[0].id}`);
        }
      })
      .catch(() => {});
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-gray-500 text-sm">Loading timetable…</p>
      </div>
    </div>
  );
}
