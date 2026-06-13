"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatGrade, formatScore, gradeScore, groupWeighted, subjectBuckets, subjectStats } from "@/lib/calculations";
import type { GradeRecord, GradeScale } from "@/types/grade";

export default function SubjectAnalysis({ records, gradeScale }: { records: GradeRecord[]; gradeScale: GradeScale }) {
  const subjects = subjectStats(records, gradeScale);
  const subjectChartData = subjects.map((subject) => ({
    ...subject,
    score: gradeScore(subject.average, gradeScale)
  }));
  const buckets = subjectBuckets(records, gradeScale);
  const best = [...subjects].filter((item) => item.average !== null).sort((a, b) => Number(a.average) - Number(b.average)).slice(0, 10);
  const weak = [...subjects].filter((item) => item.average !== null).sort((a, b) => Number(b.average) - Number(a.average)).slice(0, 10);
  const byCourse = groupWeighted(records, (record) => record.course, gradeScale);

  return (
    <section className="report-card p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Subject Analysis</p>
          <h2 className="section-title">1. 과목별 분석</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-muted">
          <Badge label="1등급" value={buckets.first} />
          <Badge label="2등급" value={buckets.second} />
          <Badge label="3등급" value={buckets.third} />
          <Badge label="4등급 이하" value={buckets.fourthOrLower} />
        </div>
      </div>

      {subjects.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="overflow-auto rounded-lg border border-line">
              <table className="min-w-[760px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
                  <tr>
                    <th className="px-3 py-3">교과</th>
                    <th className="px-3 py-3">과목</th>
                    <th className="px-3 py-3">학년</th>
                    <th className="px-3 py-3">학기</th>
                    <th className="px-3 py-3">단위수</th>
                    <th className="px-3 py-3">등급</th>
                    <th className="px-3 py-3">과목 평균등급</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.flatMap((subject) =>
                    subject.records.map((record) => (
                      <tr className="border-t border-line" key={record.id}>
                        <td className="px-3 py-3">{record.course}</td>
                        <td className="px-3 py-3 font-bold">{record.subject}</td>
                        <td className="px-3 py-3">{record.year}</td>
                        <td className="px-3 py-3">{record.semester}</td>
                        <td className="px-3 py-3">{record.credits}</td>
                        <td className="px-3 py-3">{record.rankGrade}</td>
                        <td className="px-3 py-3 font-extrabold text-teal-750">{formatGrade(subject.average)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RankList title="우수 과목 TOP 10" items={best} />
              <RankList title="보완 필요 과목 TOP 10" items={weak} />
            </div>
          </div>

          <div className="space-y-4">
            <article className="rounded-lg border border-line p-4">
              <h3 className="mb-3 font-extrabold">과목별 평균등급 세로 막대그래프</h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={subjectChartData} margin={{ top: 24, right: 18, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="key" interval={0} angle={-18} textAnchor="end" height={62} />
                  <YAxis domain={[1, gradeScale]} allowDecimals={false} tickFormatter={(value) => `${gradeScale + 1 - Number(value)}등급`} />
                  <Tooltip formatter={(_, __, item) => formatGrade(item.payload.average)} />
                  <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="score" position="top" formatter={(value: number) => formatScore(value)} className="fill-slate-700 text-xs font-bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="rounded-lg border border-line p-4">
              <h3 className="mb-3 font-extrabold">교과별 과목 목록</h3>
              <div className="grid gap-2">
                {byCourse.map((course) => (
                  <div className="rounded-md bg-slate-50 p-3" key={course.key}>
                    <strong>{course.key}</strong>
                    <p className="mt-1 text-sm text-muted">{course.records.map((record) => record.subject).join(", ")}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

function Badge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
      <span className="block">{label}</span>
      <strong className="text-lg text-ink">{value}</strong>
    </div>
  );
}

function RankList({ title, items }: { title: string; items: { key: string; average: number | null; credits: number }[] }) {
  return (
    <article className="rounded-lg border border-line p-4">
      <h3 className="mb-3 font-extrabold">{title}</h3>
      <ol className="space-y-2 text-sm">
        {items.map((item, index) => (
          <li className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2" key={item.key}>
            <span><b>{index + 1}. {item.key}</b> · {item.credits}단위</span>
            <strong>{formatGrade(item.average)}</strong>
          </li>
        ))}
      </ol>
    </article>
  );
}

function Empty() {
  return <div className="rounded-lg border border-dashed border-line p-10 text-center text-muted">표에 성적을 입력하면 과목별 분석이 표시됩니다.</div>;
}
