"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Weekly practice minutes over the last 8 ISO weeks (spec §6.4). */
export function PracticeMinutesChart({
  data,
}: {
  data: { week: string; minutes: number }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="week"
            stroke="var(--line)"
            tick={{ fill: "var(--muted)", fontSize: 14 }}
            tickLine={false}
          />
          <YAxis
            stroke="var(--line)"
            tick={{ fill: "var(--muted)", fontSize: 14 }}
            tickLine={false}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "2px solid var(--line)",
              borderRadius: 12,
              color: "var(--fg)",
            }}
            formatter={(value: number) => [`${value} min`, "Practice"]}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="var(--accent)"
            strokeWidth={4}
            fill="var(--accent)"
            fillOpacity={0.14}
            dot={{ r: 6, fill: "var(--surface)", stroke: "var(--accent)", strokeWidth: 3 }}
            activeDot={{ r: 8 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
