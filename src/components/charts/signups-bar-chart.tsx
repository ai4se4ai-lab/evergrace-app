"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** New members per month, last 8 months (spec §6.9). */
export function SignupsBarChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="month"
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
            formatter={(value: number) => [`${value}`, "New members"]}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={48}>
            <LabelList
              dataKey="count"
              position="top"
              fill="var(--fg)"
              fontSize={13}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
