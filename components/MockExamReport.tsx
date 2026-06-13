"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  averageGrade,
  bestSubject,
  examKey,
  examSessions,
  examTrend,
  formatMockGrade,
  formatNullable,
  generateMockDiagnosis,
  mockTrendStatus,
  MOCK_SUBJECT_ORDER,
  subjectStats,
  weakSubject
} from "@/lib/mockCalculations";
import { sampleMockExams } from "@/lib/sampleData";
import type { MockExamRecord, StudentInfo } from "@/types/grade";

type Props = {
  records: MockExamRecord[];
  student: StudentInfo;
  onChange: (records: MockExamRecord[]) => void;
};

const MAX_EXAM_SESSIONS = 3;

export default function MockExamReport({ records, student, onChange }: Props) {
  const stats = subjectStats(records);
  const trend = examTrend(records);
  const sessions = examSessions(records);
  const best = bestSubject(records);
  const weak = weakSubject(records);
  const trendStatus = mockTrendStatus(records);
  const latest = trend.at(-1);
  const sessionLimitReached = sessions.length >= MAX_EXAM_SESSIONS;

  function addRow() {
    const baseSession = sessions.at(-1);
    const base = baseSession?.rows[0];
    onChange([
      ...records,
      {
        id: crypto.randomUUID(),
        examName: base?.examName ?? "",
        examType: base?.examType ?? "모의고사",
        year: base?.year ?? new Date().getFullYear().toString(),
        month: base?.month ?? "6",
        subject: "국어",
        selectedCourse: "",
        rawScore: "",
        standardScore: "",
        percentile: "",
        grade: ""
      }
    ]);
  }

  function update(id: string, field: keyof MockExamRecord, value: string) {
    const numeric: (keyof MockExamRecord)[] = ["rawScore", "standardScore", "percentile", "grade"];
    const next = records.map((record) => (record.id === id ? { ...record, [field]: numeric.includes(field) ? toNumber(value) : value } : record));
    const current = records.find((record) => record.id === id);
    const changed = next.find((record) => record.id === id);
    const sessionChanged = current && changed && examKey(current) !== examKey(changed);

    if (sessionChanged && examSessions(next).length > MAX_EXAM_SESSIONS) {
      alert("모의고사/수능 시험 회차는 최대 3회까지만 입력할 수 있습니다.");
      return;
    }

    onChange(next);
  }

  function deleteRow(id: string) {
    onChange(records.filter((record) => record.id !== id));
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi label="전체 평균등급" value={formatMockGrade(averageGrade(records))} />
        <Kpi label="최근 시험 평균" value={formatMockGrade(latest?.average)} />
        <Kpi label="강점 영역" value={best?.subject ?? "-"} />
        <Kpi label="보완 영역" value={weak?.subject ?? "-"} />
        <Kpi label="성적 흐름" value={trendStatus.status} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="시험별 평균등급 추이" note="낮을수록 우수">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="key" />
              <YAxis domain={[1, 9]} reversed tickCount={9} />
              <Tooltip formatter={(value) => formatMockGrade(Number(value))} />
              <Line type="monotone" dataKey="average" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="영역별 평균등급" note="한국사는 강점 산정 제외">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.map((stat) => ({ ...stat, score: stat.average ? 10 - stat.average : null }))} margin={{ top: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="subject" />
              <YAxis domain={[1, 9]} tickFormatter={(value) => `${10 - Number(value)}등급`} />
              <Tooltip formatter={(_, __, item) => formatMockGrade(item.payload.average)} />
              <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="score" position="top" formatter={(value: number) => Number(value).toFixed(1)} className="fill-slate-700 text-xs font-bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="report-card overflow-hidden print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <p className="eyebrow">Mock Exam Records</p>
            <h2 className="section-title">모의고사/수능 성적 입력</h2>
            <p className="mt-1 text-sm font-bold text-muted">시험 회차는 최대 3회까지 입력 가능합니다. 각 회차 안에서 등급과 백분위를 모두 입력해 주세요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="button" onClick={addRow}>영역 행 추가</button>
            <button className="btn-secondary" type="button" onClick={() => onChange(sampleMockExams)}>예시 데이터</button>
          </div>
        </div>
        <div className="border-b border-line bg-slate-50 px-5 py-3 text-sm font-bold text-muted">
          현재 입력된 시험 회차: {sessions.length}/{MAX_EXAM_SESSIONS}
          {sessionLimitReached ? " · 새 회차 추가는 제한되며, 기존 회차의 영역 행은 추가할 수 있습니다." : ""}
        </div>
        <div className="overflow-auto">
          <table className="min-w-[1180px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
              <tr>
                {["시험명", "구분", "연도", "월", "영역", "선택과목", "원점수", "표준점수", "백분위", "등급", ""].map((header) => (
                  <th className={`border-b border-line px-3 py-3 ${header === "백분위" || header === "등급" ? "bg-teal-650/10 text-teal-750" : ""}`} key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td className="px-3 py-10 text-center text-muted" colSpan={11}>모의고사/수능 성적을 입력하면 분석 결과가 표시됩니다.</td></tr>
              ) : (
                records.map((record) => (
                  <tr className="border-b border-line" key={record.id}>
                    <td className="px-2 py-2"><input className="field" value={record.examName} onChange={(event) => update(record.id, "examName", event.target.value)} /></td>
                    <td className="px-2 py-2">
                      <select className="field" value={record.examType} onChange={(event) => update(record.id, "examType", event.target.value)}>
                        <option>모의고사</option>
                        <option>수능</option>
                      </select>
                    </td>
                    <td className="px-2 py-2"><input className="field" value={record.year} onChange={(event) => update(record.id, "year", event.target.value)} /></td>
                    <td className="px-2 py-2"><input className="field" value={record.month} onChange={(event) => update(record.id, "month", event.target.value)} /></td>
                    <td className="px-2 py-2">
                      <select className="field" value={record.subject} onChange={(event) => update(record.id, "subject", event.target.value)}>
                        {MOCK_SUBJECT_ORDER.map((subject) => <option key={subject}>{subject}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2"><input className="field" value={record.selectedCourse} onChange={(event) => update(record.id, "selectedCourse", event.target.value)} /></td>
                    {(["rawScore", "standardScore", "percentile", "grade"] as (keyof MockExamRecord)[]).map((field) => (
                      <td className="px-2 py-2" key={field}>
                        <input className="field" min={field === "grade" ? 1 : 0} max={field === "grade" ? 9 : field === "percentile" ? 100 : undefined} type="number" value={record[field]} onChange={(event) => update(record.id, field, event.target.value)} />
                      </td>
                    ))}
                    <td className="px-2 py-2"><button className="btn-danger" type="button" onClick={() => deleteRow(record.id)}>×</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-card p-5">
        <div className="mb-5">
          <p className="eyebrow">Subject Detail</p>
          <h2 className="section-title">영역별 상세 분석</h2>
        </div>
        <div className="overflow-auto rounded-lg border border-line">
          <table className="min-w-[820px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
              <tr><th className="px-3 py-3">영역</th><th className="px-3 py-3">평균등급</th><th className="px-3 py-3">최고등급</th><th className="px-3 py-3">최근 선택과목</th><th className="px-3 py-3">최근 표준점수</th><th className="px-3 py-3">최근 백분위</th></tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr className="border-t border-line" key={stat.subject}>
                  <td className="px-3 py-3 font-extrabold">{stat.subject}</td>
                  <td className="px-3 py-3">{formatMockGrade(stat.average)}</td>
                  <td className="px-3 py-3">{stat.best ? `${stat.best}등급` : "-"}</td>
                  <td className="px-3 py-3">{stat.latest?.selectedCourse || "-"}</td>
                  <td className="px-3 py-3">{formatNullable(stat.latest?.standardScore)}</td>
                  <td className="px-3 py-3">{formatNullable(stat.latest?.percentile, "%")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-card p-5">
        <p className="eyebrow">Diagnosis</p>
        <h2 className="section-title">모의고사/수능 종합진단</h2>
        <p className="mt-4 rounded-lg border border-line bg-slate-50 p-5 text-lg font-bold leading-8 text-ink">
          {generateMockDiagnosis(records, student.targetUniversity, student.targetMajor)}
        </p>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="report-card min-h-[112px] p-4">
      <p className="text-xs font-bold text-muted">{label}</p>
      <strong className="mt-4 block text-2xl font-extrabold text-ink">{value}</strong>
    </article>
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

function toNumber(value: string): number | "" {
  return value === "" || Number.isNaN(Number(value)) ? "" : Number(value);
}
