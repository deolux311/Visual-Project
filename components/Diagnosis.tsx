"use client";

import { bestByAverage, courseGroupStats, courseStats, formatGrade, generateDiagnosis, trendSummary, worstByAverage } from "@/lib/calculations";
import type { GradeRecord, GradeScale, StudentInfo } from "@/types/grade";

export default function Diagnosis({
  records,
  student,
  gradeScale,
  diagnosisText,
  onDiagnosisChange
}: {
  records: GradeRecord[];
  student: StudentInfo;
  gradeScale: GradeScale;
  diagnosisText: string;
  onDiagnosisChange: (value: string) => void;
}) {
  const bestCourse = bestByAverage(courseStats(records, gradeScale));
  const weakCourse = worstByAverage(courseStats(records, gradeScale));
  const bestGroup = bestByAverage(courseGroupStats(records, gradeScale));
  const trend = trendSummary(records, gradeScale);
  const generatedDiagnosis = generateDiagnosis(records, student.track, gradeScale);

  return (
    <section className="report-card p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Diagnosis</p>
          <h2 className="section-title">6. 종합진단</h2>
        </div>
        <button className="btn-secondary print:hidden" type="button" onClick={() => onDiagnosisChange("")}>자동문구로 초기화</button>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-lg border border-line bg-slate-50 p-5">
          <textarea
            className="min-h-[420px] w-full resize-y rounded-md border border-transparent bg-transparent text-lg font-bold leading-8 text-ink outline-none focus:border-teal-650 focus:bg-white focus:p-3"
            value={diagnosisText || generatedDiagnosis}
            onChange={(event) => onDiagnosisChange(event.target.value)}
          />
        </article>
        <div className="grid gap-3">
          <Mini label="가장 우수한 교과" value={`${bestCourse?.key ?? "-"} ${formatGrade(bestCourse?.average)}`} />
          <Mini label="보완 필요 교과" value={`${weakCourse?.key ?? "-"} ${formatGrade(weakCourse?.average)}`} />
          <Mini label="가장 유리한 교과군" value={`${bestGroup?.key ?? "-"} ${formatGrade(bestGroup?.average)}`} />
          <Mini label="성장 유형" value={trend.status} />
          <Mini label="간단 적합도" value={student.track || "희망 계열 입력 필요"} />
        </div>
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-line p-4">
      <p className="text-xs font-bold text-muted">{label}</p>
      <strong className="mt-2 block text-lg">{value}</strong>
    </article>
  );
}
