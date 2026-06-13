"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { courseGroupStats, formatGrade, formatScore, gradeScore } from "@/lib/calculations";
import type { GradeRecord, GradeScale } from "@/types/grade";

export default function GroupAnalysis({ records, gradeScale }: { records: GradeRecord[]; gradeScale: GradeScale }) {
  const groups = courseGroupStats(records, gradeScale);
  const chartData = groups.map((group) => ({
    ...group,
    score: gradeScore(group.average, gradeScale)
  }));

  return (
    <section className="report-card p-5">
      <div className="mb-5">
        <p className="eyebrow">Group Analysis</p>
        <h2 className="section-title">3. 교과군별 분석</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="overflow-auto rounded-lg border border-line">
          <table className="min-w-[760px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
              <tr>
                <th className="px-3 py-3">교과군</th>
                <th className="px-3 py-3">포함 교과</th>
                <th className="px-3 py-3">평균등급</th>
                <th className="px-3 py-3">총 이수단위</th>
                <th className="px-3 py-3">전교과 대비 유불리</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr className="border-t border-line" key={group.key}>
                  <td className="px-3 py-3 font-extrabold">{group.key}</td>
                  <td className="px-3 py-3">{group.courses.join(", ")}</td>
                  <td className="px-3 py-3">{formatGrade(group.average)}</td>
                  <td className="px-3 py-3">{group.credits}단위</td>
                  <td className="px-3 py-3">
                    {group.advantage === null ? "-" : `${group.advantage > 0 ? "불리" : "유리"} ${Math.abs(group.advantage).toFixed(2)}등급`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-line p-4">
          <h3 className="mb-3 font-extrabold">교과군별 평균등급 비교 그래프</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="key" />
              <YAxis domain={[1, gradeScale]} allowDecimals={false} tickFormatter={(value) => `${gradeScale + 1 - Number(value)}등급`} />
              <Tooltip formatter={(_, __, item) => formatGrade(item.payload.average)} />
              <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="average" position="top" formatter={(value: number) => formatScore(value)} className="fill-slate-700 text-xs font-bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
