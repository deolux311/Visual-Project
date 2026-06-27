"use client";

import {
  bestByAverage,
  courseGroupStats,
  courseStats,
  formatGrade,
  totalCredits,
  trendSummary,
  weightedAverage,
  worstByAverage
} from "@/lib/calculations";
import {
  averageGrade as mockAverageGrade,
  bestSubject,
  examTrend,
  formatMockGrade,
  mockTrendStatus,
  weakSubject
} from "@/lib/mockCalculations";
import type { AdmissionPredictionRow, GradeRecord, GradeScale, MockExamRecord, StudentInfo, StudentRecordReport } from "@/types/grade";

type Props = {
  student: StudentInfo;
  records: GradeRecord[];
  mockRecords: MockExamRecord[];
  recordReport: StudentRecordReport;
  gradeScale: GradeScale;
  onRecordReportChange?: (report: StudentRecordReport) => void;
};

const CHANCE_LABELS = ["높음(최초합)", "보통(추합)", "낮음(불합)"];
const ADMISSION_STANDARDS = ["일반고 기준", "특목자사고 기준"];
const RECOMMENDED_TYPES = ["", "교과", "종합", "논술", "실기", "수능", "기타"];

export default function ComprehensiveReport({ student, records, mockRecords, recordReport, gradeScale, onRecordReportChange }: Props) {
  const gradeAverage = weightedAverage(records, gradeScale);
  const gradeCredits = totalCredits(records, gradeScale);
  const bestCourse = bestByAverage(courseStats(records, gradeScale));
  const weakCourse = worstByAverage(courseStats(records, gradeScale));
  const bestGroup = bestByAverage(courseGroupStats(records, gradeScale));
  const gradeTrend = trendSummary(records, gradeScale);

  const mockAverage = mockAverageGrade(mockRecords);
  const mockBest = bestSubject(mockRecords);
  const mockWeak = weakSubject(mockRecords);
  const mockTrend = mockTrendStatus(mockRecords);
  const latestMock = examTrend(mockRecords).at(-1);
  const recentMockPercentile = averageRecentCorePercentile(mockRecords);

  const scores = recordReport.scores ?? {};
  const schoolScore = toScore(scores.school);
  const personalScore =
    toScore(scores.attendance) +
    toScore(scores.career) +
    toScore(scores.academic) +
    toScore(scores.community) +
    toScore(scores.comprehensive);
  const recordTotal = schoolScore + personalScore;
  const predictionRows = getPredictionRows(recordReport.admissionPredictions);
  const admissionStandard = recordReport.admissionPredictionStandard || ADMISSION_STANDARDS[0];

  function updatePrediction(id: string, field: keyof AdmissionPredictionRow, value: string) {
    onRecordReportChange?.({
      ...recordReport,
      admissionPredictions: predictionRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    });
  }

  function addPredictionRow() {
    onRecordReportChange?.({
      ...recordReport,
      admissionPredictions: [...predictionRows, createPredictionRow()]
    });
  }

  function deletePredictionRow(id: string) {
    onRecordReportChange?.({
      ...recordReport,
      admissionPredictions: predictionRows.filter((row) => row.id !== id)
    });
  }

  function updateAdmissionStandard(value: string) {
    onRecordReportChange?.({
      ...recordReport,
      admissionPredictionStandard: value,
      admissionPredictions: predictionRows
    });
  }

  function updateRecordReportField(field: keyof StudentRecordReport, value: string) {
    onRecordReportChange?.({
      ...recordReport,
      admissionPredictions: predictionRows,
      [field]: value
    });
  }

  const generatedComprehensiveOpinion = `${student.name || "학생"}은 내신 ${formatGrade(gradeAverage)}, 학생부 진단 ${recordTotal}점, 모의고사/수능 ${formatMockGrade(mockAverage)}를 함께 기준으로 판단할 수 있습니다. 내신에서는 ${bestCourse?.key ?? "-"} 교과와 ${bestGroup?.key ?? "-"} 교과군을 강점 축으로 삼고, 학생부에서는 진로역량·학업역량·공동체역량의 근거를 지원 학과와 연결해 정리하는 것이 중요합니다. 모의고사/수능은 ${mockTrend.status} 흐름을 확인하면서 수능 최저 또는 정시 가능성까지 함께 점검하면 지원 전략의 폭을 넓힐 수 있습니다.`;

  return (
    <div className="space-y-5">
      <section className="report-card p-5">
        <p className="eyebrow">Comprehensive Report</p>
        <h2 className="section-title">종합 리포트 핵심 요약</h2>
        <p className="mt-2 text-sm font-bold text-muted">
          내신 리포트, 학생부 리포트, 모의고사/수능 리포트의 주요 판단 포인트를 한 화면에서 비교합니다.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label="내신 평균등급" value={formatGrade(gradeAverage)} note={`${gradeCredits}학점`} />
          <Kpi label="학생부 진단점수" value={`${recordTotal}점`} note="100점 만점" />
          <Kpi label="모의고사 평균등급/국수탐 백분위(최근 3회)" value={`${formatMockGrade(mockAverage)} / ${formatPercentile(recentMockPercentile)}`} note={latestMock?.key ?? "최근 시험 없음"} />
          <RecommendationCard report={recordReport} onChange={updateRecordReportField} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SummaryCard
          eyebrow="Grade Summary"
          title="내신 리포트 요약"
          items={[
            ["전체 평균", formatGrade(gradeAverage)],
            ["총 이수학점", `${gradeCredits}학점`],
            ["강점 교과", `${bestCourse?.key ?? "-"} ${formatGrade(bestCourse?.average)}`],
            ["보완 교과", `${weakCourse?.key ?? "-"} ${formatGrade(weakCourse?.average)}`],
            ["유리한 교과군", `${bestGroup?.key ?? "-"} ${formatGrade(bestGroup?.average)}`],
            ["성장 유형", gradeTrend.status]
          ]}
          opinion={`${bestCourse?.key ?? "-"} 교과 강점과 ${bestGroup?.key ?? "-"} 교과군 유불리를 중심으로 지원 학과와 연결하면 좋습니다. ${weakCourse?.key ?? "-"} 교과는 단위수가 큰 과목부터 보완 우선순위를 잡는 것이 효율적입니다.`}
        />

        <SummaryCard
          eyebrow="Student Record Summary"
          title="학생부 리포트 요약"
          items={[
            ["학교 역량", `${schoolScore}/20점`],
            ["개인 역량", `${personalScore}/80점`],
            ["총 합계", `${recordTotal}/100점`],
            ["진로역량", `${toScore(scores.career)}/20점`],
            ["학업역량", `${toScore(scores.academic)}/20점`],
            ["공동체역량", `${toScore(scores.community)}/20점`]
          ]}
          opinion={recordOpinion(recordReport)}
        />

        <SummaryCard
          eyebrow="Mock Exam Summary"
          title="모의고사/수능 리포트 요약"
          items={[
            ["평균등급/국수탐 백분위(최근 3회)", `${formatMockGrade(mockAverage)} / ${formatPercentile(recentMockPercentile)}`],
            ["최근 시험", latestMock?.key ?? "-"],
            ["강점 영역", `${mockBest?.subject ?? "-"} ${formatMockGrade(mockBest?.average)}`],
            ["보완 영역", `${mockWeak?.subject ?? "-"} ${formatMockGrade(mockWeak?.average)}`],
            ["성적 흐름", mockTrend.status],
            ["최근 평균", formatMockGrade(latestMock?.average)]
          ]}
          opinion={`${mockBest?.subject ?? "-"} 영역의 강점을 유지하면서 ${mockWeak?.subject ?? "-"} 영역을 우선 보완하는 전략이 필요합니다. 내신 강점 교과와 모의고사 강점 영역이 겹치는 지점을 면접과 상담 소재로 연결하면 좋습니다.`}
        />
      </section>

      <section className="report-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <p className="eyebrow">Admission Forecast</p>
            <h2 className="section-title">합격 가능성 예측</h2>
          </div>
          <button className="btn-primary print:hidden" type="button" onClick={addPredictionRow}>행 추가</button>
        </div>
        <div className="p-5">
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full min-w-[1080px] border-collapse text-sm">
              <thead className="bg-slate-50 text-center text-xs font-extrabold text-muted">
                <tr>
                  <th className="border-b border-line px-3 py-3">합격 가능성 예측</th>
                  <th className="border-b border-line px-3 py-3">대학</th>
                  <th className="border-b border-line px-3 py-3">학과</th>
                  <th className="border-b border-line px-3 py-3">전형</th>
                  <th className="border-b border-line px-3 py-3">2026 합격자 점수<br />70% CUT<br />(특목, 자사고 혼합)</th>
                  <th className="border-b border-line px-3 py-3">
                    <span className="block">2027 합격 예측 점수</span>
                    <span className="block">90% CUT</span>
                    <select
                      className="mt-1 rounded-md border border-line bg-white px-2 py-1 text-center text-xs font-extrabold text-ink outline-none"
                      value={admissionStandard}
                      onChange={(event) => updateAdmissionStandard(event.target.value)}
                    >
                      {ADMISSION_STANDARDS.map((standard) => <option key={standard}>{standard}</option>)}
                    </select>
                  </th>
                  <th className="border-b border-line px-3 py-3 print:hidden">관리</th>
                </tr>
              </thead>
              <tbody>
                {predictionRows.map((row) => (
                  <tr className="border-b border-line last:border-b-0" key={row.id}>
                    <td className="bg-slate-50 px-2 py-2">
                      <select
                        className="field h-9 text-center font-extrabold"
                        value={row.chance}
                        onChange={(event) => updatePrediction(row.id, "chance", event.target.value)}
                      >
                        <option value="">-</option>
                        {CHANCE_LABELS.map((label) => <option key={label}>{label}</option>)}
                      </select>
                    </td>
                    <PredictionCell value={row.university} onChange={(value) => updatePrediction(row.id, "university", value)} />
                    <PredictionCell value={row.major} onChange={(value) => updatePrediction(row.id, "major", value)} />
                    <PredictionCell value={row.admissionType} onChange={(value) => updatePrediction(row.id, "admissionType", value)} />
                    <PredictionCell value={row.score2026} onChange={(value) => updatePrediction(row.id, "score2026", value)} />
                    <PredictionCell value={row.score2027} onChange={(value) => updatePrediction(row.id, "score2027", value)} />
                    <td className="px-2 py-2 text-center print:hidden">
                      <button className="btn-danger" type="button" onClick={() => deletePredictionRow(row.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="report-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Integrated Opinion</p>
            <h2 className="section-title">종합 의견</h2>
          </div>
          <button className="btn-secondary print:hidden" type="button" onClick={() => updateRecordReportField("comprehensiveOpinion", "")}>자동문구로 초기화</button>
        </div>
        <textarea
          className="mt-4 min-h-[240px] w-full resize-y rounded-lg border border-line bg-slate-50 p-5 text-lg font-bold leading-8 text-ink outline-none focus:border-teal-650 focus:bg-white"
          value={recordReport.comprehensiveOpinion || generatedComprehensiveOpinion}
          onChange={(event) => updateRecordReportField("comprehensiveOpinion", event.target.value)}
        />
      </section>
    </div>
  );
}

function PredictionCell({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <td className="px-2 py-2">
      <input className="field h-9 text-center font-bold" value={value} onChange={(event) => onChange(event.target.value)} />
    </td>
  );
}

function getPredictionRows(rows: AdmissionPredictionRow[] | undefined): AdmissionPredictionRow[] {
  const existing = rows ?? [];
  const count = Math.max(3, existing.length);
  return Array.from({ length: count }, (_, index) => ({
    id: existing[index]?.id ?? `prediction-${index}`,
    chance: existing[index]?.chance ?? CHANCE_LABELS[index] ?? "",
    university: existing[index]?.university ?? "",
    major: existing[index]?.major ?? "",
    admissionType: existing[index]?.admissionType ?? "",
    score2026: existing[index]?.score2026 ?? "",
    score2027: existing[index]?.score2027 ?? ""
  }));
}

function createPredictionRow(): AdmissionPredictionRow {
  return {
    id: `prediction-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    chance: "",
    university: "",
    major: "",
    admissionType: "",
    score2026: "",
    score2027: ""
  };
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-lg border border-line bg-slate-50 p-4">
      <p className="text-xs font-extrabold text-muted">{label}</p>
      <strong className="mt-3 block text-2xl font-black text-ink">{value}</strong>
      <p className="mt-1 text-xs font-bold text-muted">{note}</p>
    </article>
  );
}

function RecommendationCard({ report, onChange }: { report: StudentRecordReport; onChange: (field: keyof StudentRecordReport, value: string) => void }) {
  return (
    <article className="rounded-lg border border-line bg-slate-50 p-4">
      <p className="text-xs font-extrabold text-muted">추천 전형 및 학과</p>
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-3">
          <h3 className="text-sm font-black text-ink">추천 전형</h3>
          <div className="mt-3 grid gap-2">
            <RecommendationSelect label="1순위" value={report.recommendedType1 ?? ""} onChange={(value) => onChange("recommendedType1", value)} />
            <RecommendationSelect label="2순위" value={report.recommendedType2 ?? ""} onChange={(value) => onChange("recommendedType2", value)} />
            <textarea
              className="field min-h-[70px] resize-y text-sm font-bold"
              value={report.recommendedTypeOpinion ?? ""}
              onChange={(event) => onChange("recommendedTypeOpinion", event.target.value)}
              placeholder="종합 의견"
            />
          </div>
        </div>
        <div className="rounded-md border border-line bg-white p-3">
          <h3 className="text-sm font-black text-ink">추천 학과</h3>
          <div className="mt-3 grid gap-2">
            <RecommendationInput label="1순위" value={report.recommendedMajor1 ?? ""} onChange={(value) => onChange("recommendedMajor1", value)} />
            <RecommendationInput label="2순위" value={report.recommendedMajor2 ?? ""} onChange={(value) => onChange("recommendedMajor2", value)} />
            <textarea
              className="field min-h-[70px] resize-y text-sm font-bold"
              value={report.recommendedMajorOpinion ?? ""}
              onChange={(event) => onChange("recommendedMajorOpinion", event.target.value)}
              placeholder="종합 의견"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function RecommendationSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid grid-cols-[52px_1fr] items-center gap-2">
      <span className="text-xs font-extrabold text-muted">{label}</span>
      <select className="field h-9 text-sm font-extrabold" value={value} onChange={(event) => onChange(event.target.value)}>
        {RECOMMENDED_TYPES.map((type) => <option key={type} value={type}>{type || "선택"}</option>)}
      </select>
    </label>
  );
}

function RecommendationInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid grid-cols-[52px_1fr] items-center gap-2">
      <span className="text-xs font-extrabold text-muted">{label}</span>
      <input className="field h-9 text-sm font-extrabold" value={value} onChange={(event) => onChange(event.target.value)} placeholder="학과 입력" />
    </label>
  );
}

function SummaryCard({ eyebrow, title, items, opinion }: { eyebrow: string; title: string; items: [string, string][]; opinion: string }) {
  return (
    <article className="report-card p-5">
      <p className="eyebrow">{eyebrow}</p>
      <h3 className="section-title">{title}</h3>
      <div className="mt-4 overflow-hidden rounded-lg border border-line">
        {items.map(([label, value]) => (
          <div className="grid grid-cols-[120px_1fr] border-b border-line last:border-b-0" key={label}>
            <span className="bg-slate-50 px-3 py-3 text-xs font-extrabold text-muted">{label}</span>
            <strong className="px-3 py-3 text-sm text-ink">{value}</strong>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-bold leading-7 text-muted">{opinion}</p>
    </article>
  );
}

function recordOpinion(report: StudentRecordReport) {
  const strongest = [
    ["진로역량", toScore(report.scores?.career)],
    ["학업역량", toScore(report.scores?.academic)],
    ["공동체역량", toScore(report.scores?.community)]
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
  const evidence = report.summaryOpinion || report.keyActivities || report.careerCompetency || report.academicCompetency || report.communityCompetency;
  return `${strongest ?? "주요 역량"}을 중심으로 학생부 강점을 정리할 수 있습니다. ${evidence ? evidence.slice(0, 140) : "학생부 주요 내용을 입력하면 핵심 의견이 더 구체화됩니다."}`;
}

function averageRecentCorePercentile(records: MockExamRecord[]) {
  const percentiles = examTrend(records)
    .slice(-3)
    .flatMap((session) => session.records)
    .filter((record) => ["국어", "수학", "탐구1", "탐구2"].includes(record.subject))
    .map((record) => Number(record.percentile))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!percentiles.length) return null;
  return percentiles.reduce((sum, value) => sum + value, 0) / percentiles.length;
}

function formatPercentile(value: number | null | undefined) {
  return Number.isFinite(value) ? `${Number(value).toFixed(1)}%` : "-";
}

function toScore(value: number | "" | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
