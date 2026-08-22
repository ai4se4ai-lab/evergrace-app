import { PrintButton } from "@/components/admin/print-button";
import { site } from "@/content/site";

/**
 * Print / "Save as PDF" sheet (spec §6.9). Rendered on white, outside the
 * themed shell, and always carries the confidentiality footer. The rows are
 * produced from the same filtered query as the on-screen table, so the export
 * always matches what the admin was looking at.
 */
export function PrintSheet({
  title,
  filterNote,
  headers,
  rows,
}: {
  title: string;
  filterNote: string;
  headers: string[];
  rows: string[][];
}) {
  const generated = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="print-sheet min-h-screen bg-white p-12 font-display text-black">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-[1.6em] font-extrabold">
            {site.name} — {title}
          </div>
          <div className="text-[#555]">
            Generated {generated}
            {filterNote}
          </div>
        </div>
        <PrintButton />
      </div>

      <table className="w-full border-collapse text-[13px] text-black">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="border-b-2 border-black px-2.5 py-2 text-left"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-[#ccc] px-2.5 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-[12px] text-[#777]">{site.confidentialityFooter}</p>
    </div>
  );
}
