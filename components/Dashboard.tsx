"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  bestByAverage,
  courseGroupStats,
  courseStats,
  formatScore,
  formatGrade,
  gradeScore,
  semesterStats,
  subjectBuckets,
  totalCredits,
  weightedAverage,
  worstByAverage
} from "@/lib/calculations";
import type { GradeRecord, GradeScale } from "@/types/grade";

export default function Dashboard({ records, gradeScale }: { records: GradeRecord[]; gradeScale: GradeScale }) {
  const courses = courseStats(records, gradeScale);
  const groups = courseGroupStats(records, gradeScale);
  const courseChartData = courses.map((course) => ({
    ...course,
    score: gradeScore(course.average, gradeScale)
  }));
  const groupChartData = groups.map((group) => ({
    ...group,
    score: gradeScore(group.average, gradeScale)
  }));
  const semesters = semesterStats(records, gradeScale);
  const buckets = subjectBuckets(records, gradeScale);
  const recentSemester = [...semesters].reverse().find((semester) => semester.average !== null);
  const bestCourse = bestByAverage(courses);
  const weakCourse = worstByAverage(courses);
  const bestGroup = bestByAverage(groups);

  const kpis = [
    { label: "전체 평균등급", value: formatGrade(weightedAverage(records, gradeScale)) },
    { label: "최근 학기 평균등급", value: formatGrade(recentSemester?.average) },
    { label: "총 이수단위", value: `${totalCredits(records, gradeScale)}단위` },
    { label: "최고 교과", value: bestCourse?.key ?? "-" },
    { label: "보완 필요 교과", value: weakCourse?.key ?? "-" },
    { label: "가장 유리한 교과군", value: bestGroup?.key ?? "-" }
  ];

  const distribution = [
    { label: "1등급", count: buckets.first },
    { label: "2등급", count: buckets.second },
    { label: "3등급", count: buckets.third },
    { label: "4등급 이하", count: buckets.fourthOrLower }
  ];

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <article className="report-card min-h-[112px] p-4" key={kpi.label}>
            <p className="text-xs font-bold text-muted">{kpi.label}</p>
            <strong className="mt-4 block text-2xl font-extrabold text-ink">{kpi.value}</strong>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="학기별 평균등급 추이" note="낮을수록 우수">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={semesters}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="key" />
              <YAxis domain={[1, gradeScale]} reversed tickCount={gradeScale} />
              <Tooltip formatter={(value) => formatGrade(Number(value))} />
              <Line type="monotone" dataKey="average" stroke="#0f766e" strokeWidth={3} connectNulls dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="교과별 평균등급" note="단위수 가중평균">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={courseChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="key" />
              <YAxis domain={[1, gradeScale]} allowDecimals={false} tickFormatter={(value) => `${gradeScale + 1 - Number(value)}등급`} />
              <Tooltip formatter={(_, __, item) => formatGrade(item.payload.average)} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="average" position="top" formatter={(value: number) => formatScore(value)} className="fill-slate-700 text-xs font-bold" />
                {courseChartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.average !== null && entry.average <= 2.2 ? "#0f766e" : "#2563eb"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="교과군별 평균등급" note="전교과 대비 유불리 확인">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={groupChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="key" />
              <YAxis domain={[1, gradeScale]} allowDecimals={false} tickFormatter={(value) => `${gradeScale + 1 - Number(value)}등급`} />
              <Tooltip formatter={(_, __, item) => formatGrade(item.payload.average)} />
              <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="average" position="top" formatter={(value: number) => formatScore(value)} className="fill-slate-700 text-xs font-bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="과목 등급 분포" note="과목 수 기준">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <article className="report-card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="section-title">{title}</h3>
        <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-muted">{note}</span>
      </div>
      {children}
    </article>
  );
}
