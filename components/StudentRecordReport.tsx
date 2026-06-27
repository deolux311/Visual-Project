"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bestByAverage, courseGroupStats, courseStats, formatGrade, totalCredits, trendSummary, weightedAverage, worstByAverage } from "@/lib/calculations";
import type { GradeRecord, GradeScale, StudentInfo, StudentRecordReport as StudentRecordReportData } from "@/types/grade";

type Props = {
  student: StudentInfo;
  report: StudentRecordReportData;
  records: GradeRecord[];
  gradeScale: GradeScale;
  onChange: (report: StudentRecordReportData) => void;
};

const EMPTY_REPORT: StudentRecordReportData = {
  careerCompetency: "",
  academicCompetency: "",
  communityCompetency: "",
  keyActivities: "",
  summaryOpinion: "",
  scores: {
    school: "",
    attendance: "",
    career: "",
    academic: "",
    community: "",
    comprehensive: ""
  }
};

const SCORE_ITEMS = [
  { key: "school", label: "학교 역량", max: 20, group: "학교 역량" },
  { key: "attendance", label: "출결", max: 10, group: "개인 역량" },
  { key: "career", label: "진로 역량", max: 20, group: "개인 역량" },
  { key: "academic", label: "학업 역량", max: 20, group: "개인 역량" },
  { key: "community", label: "공동체 역량", max: 20, group: "개인 역량" },
  { key: "comprehensive", label: "종합 역량", max: 10, group: "개인 역량" }
] as const;
const PERSONAL_SCORE_ITEMS = SCORE_ITEMS.filter((item) => item.group === "개인 역량");

export default function StudentRecordReport({ student, report, records, gradeScale, onChange }: Props) {
  const gradeReference = createGradeReference(records, gradeScale);
  const generatedOpinion = createOpinion(student, report, gradeReference);
  const scores = { ...EMPTY_REPORT.scores, ...(report.scores ?? {}) };
  const totalScore = SCORE_ITEMS.reduce((sum, item) => sum + toScore(scores[item.key]), 0);
  const schoolScore = toScore(scores.school);
  const personalScore = totalScore - schoolScore;
  const chartData = SCORE_ITEMS.map((item) => ({
    name: item.label,
    score: toScore(scores[item.key]),
    max: item.max,
    percent: item.max ? Math.round((toScore(scores[item.key]) / item.max) * 100) : 0
  }));

  function update(field: keyof StudentRecordReportData, value: string) {
    onChange({ ...report, [field]: value });
  }

  function updateScore(key: keyof typeof scores, value: string, max: number) {
    const numeric = value === "" ? "" : Math.min(max, Math.max(0, Number(value)));
    onChange({ ...report, scores: { ...scores, [key]: Number.isNaN(Number(numeric)) ? "" : numeric } });
  }

  return (
    <div className="space-y-5">
      <section className="report-card p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">School Record Report</p>
            <h2 className="section-title">1. 학생부 주요 내용 요약</h2>
            <p className="mt-2 text-sm font-bold text-muted">학교생활기록부의 핵심 내용을 진로역량, 학업역량, 공동체역량, 기타 종합 역량 중심으로 정리합니다.</p>
          </div>
          <button className="btn-secondary print:hidden" type="button" onClick={() => onChange(EMPTY_REPORT)}>내용 초기화</button>
        </div>

        <div className="mb-5 rounded-lg border border-line bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Grade Reference</p>
              <h3 className="text-base font-extrabold text-ink">내신 리포트 참고 지표</h3>
              <p className="mt-1 text-sm font-bold text-muted">학생부 역량 서술 작성 시 내신 성적의 강점, 보완점, 성장 흐름을 함께 참고합니다.</p>
            </div>
            <span className="rounded-md bg-white px-3 py-2 text-xs font-extrabold text-muted">석차등급 있는 과목 기준</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
            <ReferenceMini label="전체 평균" value={gradeReference.overallText} />
            <ReferenceMini label="총 학점수" value={gradeReference.creditsText} />
            <ReferenceMini label="강점 교과" value={gradeReference.bestCourseText} />
            <ReferenceMini label="보완 교과" value={gradeReference.weakCourseText} />
            <ReferenceMini label="유리 교과군" value={gradeReference.bestGroupText} />
            <ReferenceMini label="성장 흐름" value={gradeReference.trendText} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TextPanel
            label="1) 진로역량"
            value={report.careerCompetency}
            placeholder="예: 희망 전공과 연결되는 탐구 주제, 독서, 동아리, 진로활동, 선택과목의 일관성을 입력하세요."
            onChange={(value) => update("careerCompetency", value)}
          />
          <TextPanel
            label="2) 학업역량"
            value={report.academicCompetency}
            placeholder="예: 세부능력 및 특기사항에서 드러난 개념 이해, 탐구 설계, 발표, 보고서, 성적 향상 흐름을 입력하세요."
            onChange={(value) => update("academicCompetency", value)}
          />
          <TextPanel
            label="3) 공동체역량"
            value={report.communityCompetency}
            placeholder="예: 학급/동아리 역할, 협업, 갈등 조정, 봉사, 배려와 책임감이 보이는 사례를 입력하세요."
            onChange={(value) => update("communityCompetency", value)}
          />
          <TextPanel
            label="4) 기타 종합 역량"
            value={report.keyActivities}
            placeholder="학생부에서 입시에 의미 있는 활동, 세특 문장, 수상/동아리/진로/자율/봉사활동의 핵심 근거를 붙여 넣거나 요약해 주세요."
            onChange={(value) => update("keyActivities", value)}
          />
        </div>
      </section>

      <section className="space-y-5">
        <article className="report-card p-5">
          <p className="eyebrow">Student Record Score</p>
          <h2 className="section-title">3. 학생부 종합 진단 분석 결과</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ScoreKpi label="학교 역량" value={schoolScore} max={20} />
            <ScoreKpi label="개인 역량" value={personalScore} max={80} />
            <ScoreKpi label="총 합계" value={totalScore} max={100} strong />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="overflow-auto rounded-lg border border-line">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
                  <tr>
                    <th className="px-3 py-3">구분</th>
                    <th className="px-3 py-3">평가 항목</th>
                    <th className="px-3 py-3 text-center">점수</th>
                    <th className="px-3 py-3 text-center">만점</th>
                  </tr>
                </thead>
                <tbody>
                  {SCORE_ITEMS.map((item) => (
                    <tr className="border-t border-line" key={item.key}>
                      {item.group === "학교 역량" ? (
                        <td className="px-3 py-3 align-middle font-bold text-muted">학교 역량</td>
                      ) : item.key === PERSONAL_SCORE_ITEMS[0].key ? (
                        <td className="px-3 py-3 align-middle font-bold text-muted" rowSpan={PERSONAL_SCORE_ITEMS.length}>개인 역량</td>
                      ) : null}
                      <td className="px-3 py-3 font-extrabold text-ink">{item.label}</td>
                      <td className="px-3 py-3">
                        <input
                          className="field mx-auto max-w-[120px] text-center font-extrabold"
                          max={item.max}
                          min={0}
                          type="number"
                          value={scores[item.key]}
                          onChange={(event) => updateScore(item.key, event.target.value, item.max)}
                        />
                      </td>
                      <td className="px-3 py-3 text-center font-bold">{item.max}점</td>
                    </tr>
                  ))}
                  <tr className="border-t border-line bg-teal-650/10">
                    <td className="px-3 py-3 font-extrabold text-teal-750" colSpan={2}>총 합계</td>
                    <td className="px-3 py-3 text-center text-lg font-black text-teal-750">{totalScore}점</td>
                    <td className="px-3 py-3 text-center font-extrabold">100점</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-line p-4">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis domain={[0, 20]} tickFormatter={(value) => `${value}점`} />
                  <Tooltip formatter={(value, _name, item) => [`${value} / ${item.payload.max}점`, item.payload.name]} />
                  <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="score" position="top" formatter={(value: number) => `${value}점`} className="fill-slate-700 text-xs font-bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="report-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Summary Opinion</p>
              <h2 className="section-title">4. 종합의견</h2>
            </div>
            <button className="btn-secondary print:hidden" type="button" onClick={() => update("summaryOpinion", "")}>자동 초안으로 초기화</button>
          </div>
          <textarea
            className="min-h-[360px] w-full resize-y rounded-lg border border-line bg-slate-50 p-5 text-lg font-bold leading-8 text-ink outline-none focus:border-teal-650 focus:bg-white"
            value={report.summaryOpinion || generatedOpinion}
            onChange={(event) => update("summaryOpinion", event.target.value)}
          />
        </article>
      </section>
    </div>
  );
}

function ScoreKpi({ label, value, max, strong = false }: { label: string; value: number; max: number; strong?: boolean }) {
  return (
    <article className={`rounded-lg border p-4 ${strong ? "border-teal-650 bg-teal-650/10" : "border-line bg-slate-50"}`}>
      <p className="text-xs font-extrabold text-muted">{label}</p>
      <strong className={`mt-2 block text-3xl font-black ${strong ? "text-teal-750" : "text-ink"}`}>{value}점</strong>
      <p className="mt-1 text-xs font-bold text-muted">{max}점 만점</p>
    </article>
  );
}

function ReferenceMini({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-line bg-white p-3">
      <p className="text-xs font-extrabold text-muted">{label}</p>
      <strong className="mt-1 block text-base font-black text-ink">{value}</strong>
    </article>
  );
}

function TextPanel({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-ink">{label}</span>
      <textarea
        className="min-h-[260px] w-full resize-y rounded-lg border border-line bg-slate-50 p-4 text-sm font-bold leading-7 text-ink outline-none focus:border-teal-650 focus:bg-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

type GradeReference = ReturnType<typeof createGradeReference>;

function createOpinion(student: StudentInfo, report: StudentRecordReportData, gradeReference: GradeReference) {
  const career = summarize(report.careerCompetency, "진로 관련 활동과 전공 적합성 근거를 추가하면 진로역량 판단이 더 구체화됩니다.");
  const academic = summarize(report.academicCompetency, "교과 세특과 탐구 과정의 근거를 추가하면 학업역량 분석이 더 명확해집니다.");
  const community = summarize(report.communityCompetency, "협업과 책임감 사례를 추가하면 공동체역량 판단이 더 풍부해집니다.");
  const activities = summarize(report.keyActivities, "학생부의 주요 활동 근거를 입력하면 종합의견의 설득력이 높아집니다.");
  const target = [student.targetUniversity, student.targetMajor].filter(Boolean).join(" ");
  const gradeComment = gradeReference.hasGrades
    ? `내신 리포트 기준 전교과 평균은 ${gradeReference.overallText}, 강점 교과는 ${gradeReference.bestCourseText}, 보완 교과는 ${gradeReference.weakCourseText}, 가장 유리한 교과군은 ${gradeReference.bestGroupText}입니다. ${gradeReference.trendText} 흐름을 함께 고려하면 학생부의 학업역량 서술은 강점 교과의 탐구 근거와 보완 교과의 개선 계획을 분리해 정리하는 것이 좋습니다.`
    : "내신 성적 데이터가 입력되면 전교과 평균, 강점 교과, 보완 교과, 성장 흐름을 학생부 종합의견에 함께 반영할 수 있습니다.";

  return [
    `${student.name || "학생"}의 학교생활기록부는 ${target || "희망 진로"}와의 연결성을 중심으로 검토할 필요가 있습니다.`,
    gradeComment,
    `진로역량 측면에서는 ${career}`,
    `학업역량 측면에서는 ${academic}`,
    `공동체역량 측면에서는 ${community}`,
    `주요 근거로는 ${activities}`,
    "종합적으로 학생부 서술은 단순 활동 나열보다 전공 관심, 학업적 탐구 과정, 협업 태도가 하나의 성장 흐름으로 연결될 때 강점이 커집니다. 지원 전략에서는 강점 역량을 자기소개형 상담 소재와 면접 예상 질문으로 확장하고, 부족한 근거는 추가 세특 정리와 활동 의미 부여로 보완하는 것이 좋습니다."
  ].join(" ");
}

function createGradeReference(records: GradeRecord[], gradeScale: GradeScale) {
  const overall = weightedAverage(records, gradeScale);
  const credits = totalCredits(records, gradeScale);
  const courses = courseStats(records, gradeScale);
  const groups = courseGroupStats(records, gradeScale);
  const bestCourse = bestByAverage(courses);
  const weakCourse = worstByAverage(courses);
  const bestGroup = bestByAverage(groups);
  const trend = trendSummary(records, gradeScale);
  const hasGrades = overall !== null;

  return {
    hasGrades,
    overallText: formatGrade(overall),
    creditsText: hasGrades ? `${credits}학점` : "-",
    bestCourseText: bestCourse ? `${bestCourse.key} ${formatGrade(bestCourse.average)}` : "-",
    weakCourseText: weakCourse ? `${weakCourse.key} ${formatGrade(weakCourse.average)}` : "-",
    bestGroupText: bestGroup ? `${bestGroup.key} ${formatGrade(bestGroup.average)}` : "-",
    trendText: trend.status
  };
}

function summarize(value: string, fallback: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

function toScore(value: number | "") {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
