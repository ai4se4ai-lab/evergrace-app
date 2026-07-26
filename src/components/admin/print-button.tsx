"use client";

import { useEffect } from "react";

/**
 * Opens the browser's print dialog, where "Save as PDF" produces the export.
 * Auto-fires once on mount so "Download PDF" behaves like a download.
 */
export function PrintButton() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print min-h-touch rounded-lg bg-[#2c2824] px-[18px] py-2.5 font-bold text-white"
    >
      Print / Save as PDF
    </button>
  );
}
