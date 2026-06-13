"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatGrade, semesterStats, trendSummary } from "@/lib/calculations";
import type { GradeRecord, GradeScale } from "@/types/grade";

export default function TrendAnalysis({ records, gradeScale }: { records: GradeRecord[]; gradeScale: GradeScale }) {
  const semesters = semesterStats(records, gradeScale);
  const trend = trendSummary(records, gradeScale);

  return (
    <section className="report-card p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Growth Trend</p>
          <h2 className="section-title">4. 학기별 성장추이</h2>
        </div>
        <div className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-ink">
          {trend.status} {trend.diff !== null ? `· ${trend.diff > 0 ? "+" : ""}${trend.diff.toFixed(2)}등급` : ""}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
              <tr><th className="px-3 py-3">학기</th><th className="px-3 py-3">평균등급</th><th className="px-3 py-3">이수단위</th></tr>
            </thead>
            <tbody>
              {semesters.map((semester) => (
                <tr className="border-t border-line" key={semester.key}>
                  <td className="px-3 py-3 font-bold">{semester.key}</td>
                  <td className="px-3 py-3">{formatGrade(semester.average)}</td>
                  <td className="px-3 py-3">{semester.credits || "-"}단위</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-line p-4">
          <h3 className="mb-3 font-extrabold">1-1부터 3-2까지 평균등급 선그래프</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={semesters}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="key" />
              <YAxis domain={[1, gradeScale]} reversed tickCount={gradeScale} />
              <Tooltip formatter={(value) => formatGrade(Number(value))} />
              <Line type="monotone" dataKey="average" stroke="#0f766e" strokeWidth={3} connectNulls dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
