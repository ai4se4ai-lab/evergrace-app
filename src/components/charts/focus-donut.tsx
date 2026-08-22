"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

/** Practice-by-focus donut (spec §6.4). The legend carries the labels, so the
 *  chart never relies on colour alone. */
export function FocusDonut({
  data,
}: {
  data: { label: string; minutes: number; percent: number }[];
}) {
  const total = data.reduce((sum, slice) => sum + slice.minutes, 0);

  if (total === 0) {
    return (
      <p className="m-0 py-8 text-center text-muted">
        Once you’ve practised a session or two, your focus areas appear here.
      </p>
    );
  }

  return (
    <div>
      <div className="relative mx-auto h-[190px] w-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="label"
              innerRadius={56}
              outerRadius={84}
              startAngle={90}
              endAngle={-270}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((slice, index) => (
                <Cell key={slice.label} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.9em] font-bold leading-none">{total}</span>
          <span className="text-[0.95em] text-muted">minutes</span>
        </div>
      </div>

      <ul role="list" className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
        {data.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-3.5 w-3.5 flex-shrink-0 rounded"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="flex-1 text-[1.05em]">{slice.label}</span>
            <span className="font-bold text-muted">{slice.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
