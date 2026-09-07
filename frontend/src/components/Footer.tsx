"use client";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-[#131b2e] border-t border-[#E5E7EB] dark:border-[#1e293b] py-3.5 px-4 sm:px-6 text-xs text-[#666666] dark:text-slate-400 print:hidden mt-auto select-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left font-sans">
        <div>
          <span className="font-semibold text-[#222222] dark:text-slate-200">
            © 2026 Marathwada Mitramandal's Institute of Technology (MMIT)
          </span>
          <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
          <span className="font-medium text-[#666666] dark:text-slate-400">All Rights Reserved. | ®</span>
        </div>
        <div className="font-medium text-[#666666] dark:text-slate-400">
          Designed &amp; Developed by <span className="font-semibold text-[#222222] dark:text-slate-200">Yashraj Auti &amp; Bhavesh Choudhary</span>
        </div>
      </div>
    </footer>
  );
}
