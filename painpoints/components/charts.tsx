"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "#121d1b",
  border: "1px solid #29413b",
  borderRadius: 10,
  color: "#effaf5",
  fontSize: 12,
};

export function CategoryChart({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 6, left: -22, bottom: 20 }}>
        <CartesianGrid stroke="#1d2c29" vertical={false} />
        <XAxis dataKey="name" stroke="#70857f" fontSize={11} tickLine={false} axisLine={false} angle={-18} textAnchor="end" />
        <YAxis stroke="#70857f" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(100, 255, 183, .05)" }} />
        <Bar dataKey="count" fill="#54e6a0" radius={[5, 5, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const hasData = data.some((item) => item.count > 0);
  if (!hasData) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="#1d2c29" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} stroke="#70857f" fontSize={11} tickLine={false} axisLine={false} interval={5} />
        <YAxis stroke="#70857f" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString()} />
        <Line type="monotone" dataKey="count" stroke="#54e6a0" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#b6ffd9" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="empty-chart">
      <span className="signal-bars"><i /><i /><i /><i /></span>
      Data will appear after your first pipeline run
    </div>
  );
}
