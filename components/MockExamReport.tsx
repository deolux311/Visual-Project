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
import type { MockExamRecord, MockExamSubject, StudentInfo } from "@/types/grade";

type Props = {
  records: MockExamRecord[];
  student: StudentInfo;
  onChange: (records: MockExamRecord[]) => void;
  view?: "report" | "input";
  diagnosisText?: string;
  onDiagnosisChange?: (value: string) => void;
};

const MAX_EXAM_SESSIONS = 3;
const MATRIX_SUBJECTS: MockExamSubject[] = ["한국사", "국어", "수학", "영어", "탐구1", "탐구2", "제2외국어/한문"];
const MATRIX_METRICS: { key: keyof MockExamRecord; label: string }[] = [
  { key: "selectedCourse", label: "선택과목" },
  { key: "rawScore", label: "원점수" },
  { key: "standardScore", label: "표준점수" },
  { key: "percentile", label: "백분위" },
  { key: "grade", label: "등급" }
];

export default function MockExamReport({ records, student, onChange, view = "report", diagnosisText = "", onDiagnosisChange }: Props) {
  const recentRecords = recentSessionRecords(records, 3);
  const stats = subjectStats(recentRecords);
  const trend = examTrend(records);
  const sessions = examSessions(records);
  const best = bestSubject(records);
  const weak = weakSubject(records);
  const trendStatus = mockTrendStatus(records);
  const latest = trend.at(-1);
  const sessionLimitReached = sessions.length >= MAX_EXAM_SESSIONS;
  const generatedDiagnosis = generateMockDiagnosis(records, student.targetUniversity, student.targetMajor);

  function addSession() {
    if (sessionLimitReached) {
      alert("모의고사/수능 시험 회차는 최대 3회까지만 입력할 수 있습니다.");
      return;
    }
    const baseSession = sessions.at(-1);
    const base = baseSession?.rows[0];
    const nextIndex = sessions.length + 1;
    const year = base?.year ?? new Date().getFullYear().toString();
    const month = nextIndex === 1 ? "3" : nextIndex === 2 ? "6" : "9";
    const examType = base?.examType ?? "모의고사";
    const examName = `${year}년 ${month}월 ${examType}`;
    onChange([...records, ...MATRIX_SUBJECTS.map((subject) => createMockRecord({ examName, examType, year, month, subject }))]);
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

  function updateSession(sessionKey: string, field: "examName" | "examType" | "year" | "month", value: string) {
    onChange(records.map((record) => (examKey(record) === sessionKey ? { ...record, [field]: value } : record)));
  }

  function deleteSession(sessionKey: string) {
    onChange(records.filter((record) => examKey(record) !== sessionKey));
  }

  function updateMatrixRecord(session: { key: string; rows: MockExamRecord[] }, subject: MockExamSubject, field: keyof MockExamRecord, value: string) {
    const numeric: (keyof MockExamRecord)[] = ["rawScore", "standardScore", "percentile", "grade"];
    const current = session.rows.find((record) => record.subject === subject);
    const nextValue = numeric.includes(field) ? toNumber(value) : value;
    if (current) {
      onChange(records.map((record) => (record.id === current.id ? { ...record, [field]: nextValue } : record)));
      return;
    }
    const base = session.rows[0];
    onChange([...records, { ...createMockRecord({ ...base, subject }), [field]: nextValue }]);
  }

  return (
    <div className="space-y-5">
      {view === "input" ? null : (
      <>
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
      </>
      )}

      {view === "input" ? (
      <section className="report-card overflow-hidden print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <p className="eyebrow">Mock Exam Records</p>
            <h2 className="section-title">모의고사/수능 성적 입력</h2>
            <p className="mt-1 text-sm font-bold text-muted">시험 회차는 최대 3회까지 입력 가능합니다. 각 회차 안에서 등급과 백분위를 모두 입력해 주세요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="button" onClick={addSession} disabled={sessionLimitReached}>시험 추가</button>
            <button className="btn-secondary" type="button" onClick={() => onChange(sampleMockExams)}>예시 데이터</button>
          </div>
        </div>
        <div className="border-b border-line bg-slate-50 px-5 py-3 text-sm font-bold text-muted">
          현재 입력된 시험 회차: {sessions.length}/{MAX_EXAM_SESSIONS}
          {sessionLimitReached ? " · 새 회차 추가는 제한되며, 기존 회차의 영역 행은 추가할 수 있습니다." : ""}
        </div>
        <div className="overflow-auto">
          <MockExamMatrix sessions={sessions} onUpdateSession={updateSession} onUpdateRecord={updateMatrixRecord} onDeleteSession={deleteSession} />
        </div>
      </section>
      ) : null}

      {view === "report" ? (
      <>
      <section className="report-card overflow-hidden">
        <div className="border-b border-line p-5">
          <p className="eyebrow">Mock Exam Records</p>
          <h2 className="section-title">모의고사/수능 성적 분석</h2>
          <p className="mt-2 text-sm font-bold text-muted">입력 화면에 작성한 회차별 성적을 리포트에서도 함께 확인합니다.</p>
        </div>
        <div className="overflow-auto">
          <MockExamReadOnlySummary sessions={sessions} />
        </div>
      </section>

      <section className="report-card p-5">
        <div className="mb-5">
          <p className="eyebrow">Subject Detail</p>
          <h2 className="section-title">영역별 상세 분석</h2>
          <p className="mt-2 text-sm font-bold text-muted">최근 3회 시험을 기준으로 평균등급, 최고등급, 최근 선택과목과 점수를 분석합니다.</p>
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
      </>
      ) : null}

      {view === "report" ? (
        <section className="report-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Diagnosis</p>
              <h2 className="section-title">모의고사/수능 종합진단</h2>
            </div>
            <button className="btn-secondary print:hidden" type="button" onClick={() => onDiagnosisChange?.("")}>자동문구로 초기화</button>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-slate-50 p-5">
            <textarea
              className="min-h-[260px] w-full resize-y rounded-md border border-transparent bg-transparent text-lg font-bold leading-8 text-ink outline-none focus:border-teal-650 focus:bg-white focus:p-3"
              value={diagnosisText || generatedDiagnosis}
              onChange={(event) => onDiagnosisChange?.(event.target.value)}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MockExamMatrix({
  sessions,
  onUpdateSession,
  onUpdateRecord,
  onDeleteSession,
  readOnly = false
}: {
  sessions: { key: string; rows: MockExamRecord[] }[];
  onUpdateSession?: (sessionKey: string, field: "examName" | "examType" | "year" | "month", value: string) => void;
  onUpdateRecord?: (session: { key: string; rows: MockExamRecord[] }, subject: MockExamSubject, field: keyof MockExamRecord, value: string) => void;
  onDeleteSession?: (sessionKey: string) => void;
  readOnly?: boolean;
}) {
  if (!sessions.length) {
    return <div className="px-3 py-10 text-center text-muted">시험 추가 버튼을 눌러 모의고사/수능 성적을 입력하세요.</div>;
  }

  return (
    <table className="min-w-[1280px] border-collapse text-sm">
      <thead>
        <tr className="bg-slate-100 text-center text-sm font-extrabold text-ink">
          <th className="border border-line px-3 py-3">시험명</th>
          <th className="border border-line px-3 py-3">영역</th>
          <th className="border border-line px-3 py-3">한국사</th>
          <th className="border border-line px-3 py-3">국어</th>
          <th className="border border-line px-3 py-3">수학</th>
          <th className="border border-line px-3 py-3">영어</th>
          <th className="border border-line px-3 py-3" colSpan={2}>탐구</th>
          <th className="border border-line px-3 py-3">제2외국어/한문</th>
          {!readOnly ? <th className="border border-line px-3 py-3 print:hidden">관리</th> : null}
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => {
          const base = session.rows[0];
          return MATRIX_METRICS.map((metric, metricIndex) => (
            <tr className="border-b border-line" key={`${session.key}-${metric.key}`}>
              {metricIndex === 0 ? (
                <td className="w-[160px] border border-line bg-slate-100 px-2 py-2 align-middle" rowSpan={MATRIX_METRICS.length}>
                  {readOnly ? (
                    <div className="text-center">
                      <p className="font-extrabold text-ink">{base?.examName || `${base?.year ?? "-"}년 ${base?.month ?? "-"}월 ${base?.examType ?? ""}`}</p>
                      <p className="mt-2 text-xs font-bold text-muted">{base?.year ?? "-"}년 {base?.month ?? "-"}월 · {base?.examType ?? "-"}</p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <input className="field text-center font-extrabold" value={base?.examName ?? ""} onChange={(event) => onUpdateSession?.(session.key, "examName", event.target.value)} />
                      <div className="grid grid-cols-2 gap-1">
                        <input className="field text-center" value={base?.year ?? ""} onChange={(event) => onUpdateSession?.(session.key, "year", event.target.value)} />
                        <input className="field text-center" value={base?.month ?? ""} onChange={(event) => onUpdateSession?.(session.key, "month", event.target.value)} />
                      </div>
                      <select className="field text-center" value={base?.examType ?? "모의고사"} onChange={(event) => onUpdateSession?.(session.key, "examType", event.target.value)}>
                        <option>모의고사</option>
                        <option>수능</option>
                      </select>
                    </div>
                  )}
                </td>
              ) : null}
              <td className="w-[110px] border border-line bg-slate-100 px-3 py-2 text-center font-bold">{metric.label}</td>
              {MATRIX_SUBJECTS.map((subject) => (
                <MockExamMatrixCell key={`${session.key}-${subject}-${metric.key}`} session={session} subject={subject} metric={metric.key} onUpdateRecord={onUpdateRecord} readOnly={readOnly} />
              ))}
              {!readOnly && metricIndex === 0 ? (
                <td className="border border-line px-2 py-2 text-center print:hidden" rowSpan={MATRIX_METRICS.length}>
                  <button className="btn-danger" type="button" onClick={() => onDeleteSession?.(session.key)}>×</button>
                </td>
              ) : null}
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
}

function MockExamMatrixCell({
  session,
  subject,
  metric,
  onUpdateRecord,
  readOnly = false
}: {
  session: { key: string; rows: MockExamRecord[] };
  subject: MockExamSubject;
  metric: keyof MockExamRecord;
  onUpdateRecord?: (session: { key: string; rows: MockExamRecord[] }, subject: MockExamSubject, field: keyof MockExamRecord, value: string) => void;
  readOnly?: boolean;
}) {
  const record = session.rows.find((row) => row.subject === subject);
  const value = record?.[metric] ?? "";
  const isNumber = metric === "rawScore" || metric === "standardScore" || metric === "percentile" || metric === "grade";
  const emphasis = metric === "percentile" || metric === "grade";

  if (readOnly) {
    return (
      <td className={`min-w-[110px] border border-line px-3 py-2 text-center ${emphasis ? "font-extrabold text-teal-750" : ""}`}>
        {value === "" ? "-" : value}
      </td>
    );
  }

  return (
    <td className="min-w-[110px] border border-line px-1.5 py-1.5">
      <input
        className={`field h-8 text-center ${metric === "percentile" || metric === "grade" ? "font-extrabold text-teal-750" : ""}`}
        max={metric === "grade" ? 9 : metric === "percentile" ? 100 : undefined}
        min={isNumber ? 0 : undefined}
        placeholder={subject === "탐구1" ? "탐구1" : subject === "탐구2" ? "탐구2" : ""}
        type={isNumber ? "number" : "text"}
        value={value}
        onChange={(event) => onUpdateRecord?.(session, subject, metric, event.target.value)}
      />
    </td>
  );
}

function MockExamReadOnlySummary({ sessions }: { sessions: { key: string; rows: MockExamRecord[] }[] }) {
  if (!sessions.length) {
    return <div className="px-3 py-10 text-center text-muted">표시할 모의고사/수능 성적이 없습니다.</div>;
  }

  return (
    <table className="w-full min-w-[1080px] border-collapse text-xs">
      <thead>
        <tr className="bg-slate-100 text-center font-extrabold text-ink">
          <th className="w-[150px] border border-line px-3 py-3">시험명</th>
          {MATRIX_SUBJECTS.map((subject) => (
            <th className="border border-line px-3 py-3" key={subject}>{subject}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => {
          const base = session.rows[0];
          return (
            <tr className="align-top" key={session.key}>
              <td className="border border-line bg-slate-50 px-3 py-3 text-center">
                <p className="font-extrabold text-ink">{base?.examName || `${base?.year ?? "-"}년 ${base?.month ?? "-"}월 ${base?.examType ?? ""}`}</p>
                <p className="mt-1 font-bold text-muted">{base?.year ?? "-"}년 {base?.month ?? "-"}월 · {base?.examType ?? "-"}</p>
              </td>
              {MATRIX_SUBJECTS.map((subject) => {
                const record = session.rows.find((row) => row.subject === subject);
                return (
                  <td className="border border-line px-3 py-3 text-center" key={`${session.key}-${subject}`}>
                    <p className="min-h-4 font-extrabold text-ink">{record?.selectedCourse || "-"}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-muted">
                      <span>원점수</span>
                      <strong className="text-ink">{formatNullable(record?.rawScore)}</strong>
                      <span>표준</span>
                      <strong className="text-ink">{formatNullable(record?.standardScore)}</strong>
                      <span>백분위</span>
                      <strong className="text-teal-750">{formatNullable(record?.percentile, "%")}</strong>
                      <span>등급</span>
                      <strong className="text-teal-750">{formatNullable(record?.grade, "등급")}</strong>
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function createMockRecord({
  examName,
  examType,
  year,
  month,
  subject
}: Pick<MockExamRecord, "examName" | "examType" | "year" | "month" | "subject">): MockExamRecord {
  return {
    id: crypto.randomUUID(),
    examName,
    examType,
    year,
    month,
    subject,
    selectedCourse: "",
    rawScore: "",
    standardScore: "",
    percentile: "",
    grade: ""
  };
}

function recentSessionRecords(records: MockExamRecord[], limit: number) {
  return examSessions(records)
    .slice(-limit)
    .flatMap((session) => session.rows);
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
