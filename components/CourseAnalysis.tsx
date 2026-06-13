"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { classifyCourse, courseStats, formatGrade, formatScore, gradeScore, totalCredits } from "@/lib/calculations";
import type { GradeRecord, GradeScale } from "@/types/grade";

export default function CourseAnalysis({ records, gradeScale }: { records: GradeRecord[]; gradeScale: GradeScale }) {
  const stats = courseStats(records, gradeScale);
  const chartData = stats.map((stat) => ({
    ...stat,
    score: gradeScore(stat.average, gradeScale)
  }));
  const credits = totalCredits(records, gradeScale);

  return (
    <section className="report-card p-5">
      <div className="mb-5">
        <p className="eyebrow">Course Analysis</p>
        <h2 className="section-title">2. 교과별 분석</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="overflow-auto rounded-lg border border-line">
          <table className="min-w-[680px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
              <tr>
                <th className="px-3 py-3">교과</th>
                <th className="px-3 py-3">평균등급</th>
                <th className="px-3 py-3">총 이수단위</th>
                <th className="px-3 py-3">비중</th>
                <th className="px-3 py-3">자동 분류</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr className="border-t border-line" key={stat.key}>
                  <td className="px-3 py-3 font-extrabold">{stat.key}</td>
                  <td className="px-3 py-3">{formatGrade(stat.average)}</td>
                  <td className="px-3 py-3">{stat.credits}단위</td>
                  <td className="px-3 py-3">{credits ? `${((stat.credits / credits) * 100).toFixed(1)}%` : "-"}</td>
                  <td className="px-3 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold">{classifyCourse(stat.average)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-line p-4">
          <h3 className="mb-3 font-extrabold">교과별 평균등급 막대그래프</h3>
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
