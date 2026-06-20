"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { courseStats, formatGrade, gradeScore, SEMESTER_ORDER, subjectStats, validRecords, weightedAverage } from "@/lib/calculations";
import type { CoreCourse, GradeRecord, GradeScale } from "@/types/grade";

const COURSE_GROUPS = [
  { key: "국수영", courses: ["국어", "수학", "영어"] },
  { key: "국수영사", courses: ["국어", "수학", "영어", "사회"] },
  { key: "국수영과", courses: ["국어", "수학", "영어", "과학"] },
  { key: "국수영사과", courses: ["국어", "수학", "영어", "사회", "과학"] },
  { key: "전교과", courses: ["국어", "수학", "영어", "사회", "과학", "기타"] }
] satisfies { key: string; courses: CoreCourse[] }[];

export default function AverageReportSections({ records, gradeScale }: { records: GradeRecord[]; gradeScale: GradeScale }) {
  const semesters = semesterAverageRows(records, gradeScale);
  const subjects = subjectStats(records, gradeScale).filter((subject) => subject.average !== null);
  const courseAverageMap = new Map(courseStats(records, gradeScale).map((course) => [course.key, course.average]));
  const courseSimpleAverageMap = courseSimpleAverageRows(records, gradeScale);
  const subjectSemester = subjectSemesterRows(records, gradeScale);
  const courseSemester = courseSemesterRows(records, gradeScale);
  const groups = groupAverageRows(records, gradeScale);
  const groupSemester = groupSemesterRows(records, gradeScale);

  if (!validRecords(records, gradeScale).length) {
    return (
      <section className="report-card p-10 text-center text-muted">
        내신 성적 데이터를 입력하면 학기별, 과목별, 교과군별 평균 분석이 순서대로 표시됩니다.
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="report-card p-5">
        <SectionHead index="1" title="학기별 평균" note="1-1부터 3-2까지 단위수 가중평균" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <AverageTable
            columns={["학기", "평균등급", "이수단위", "과목수"]}
            rows={semesters.map((semester) => [semester.key, formatGrade(semester.average), `${semester.credits || "-"}단위`, `${semester.count || "-"}개`])}
          />
          <ChartBox>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={semesters}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="key" />
                <YAxis domain={[1, gradeScale]} reversed tickCount={gradeScale} />
                <Tooltip formatter={(value) => formatGrade(Number(value))} />
                <Line type="monotone" dataKey="average" stroke="#0f766e" strokeWidth={3} connectNulls dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>
      </section>

      <section className="report-card p-5">
        <SectionHead index="2" title="과목별 평균" note="과목별 단위수 가중평균" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <AverageTable
            columns={["교과", "교과 평균등급(미반영)", "교과 평균등급(반영)", "과목", "평균등급", "이수단위", "건수"]}
            rows={subjects.map((subject) => {
              const course = subject.records[0]?.course || "기타";
              return [
                course,
                formatGrade(courseSimpleAverageMap.get(course)),
                formatGrade(courseAverageMap.get(course)),
                subject.key,
                formatGrade(subject.average),
                `${subject.credits}단위`,
                `${subject.count}건`
              ];
            })}
            mergeColumnCount={3}
          />
          <ChartBox>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={subjects.map((subject) => ({ ...subject, score: gradeScore(subject.average, gradeScale) }))} margin={{ top: 24, right: 16, bottom: 28, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="key" interval={0} angle={-18} textAnchor="end" height={62} />
                <YAxis domain={[1, gradeScale]} tickFormatter={(value) => `${gradeScale + 1 - Number(value)}등급`} />
                <Tooltip formatter={(_, __, item) => formatGrade(item.payload.average)} />
                <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="average" position="top" formatter={(value: number) => Number(value).toFixed(2)} className="fill-slate-700 text-xs font-bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>
      </section>

      <section className="report-card p-5">
        <SectionHead index="3" title="과목별 학기별 평균" note="과목을 행으로, 학기를 열로 배치한 평균등급 매트릭스" />
        <div className="mb-4 rounded-lg border border-line bg-slate-50 p-4">
          <h3 className="text-base font-extrabold text-ink">과목별 학기별 평균 상세표</h3>
          <p className="mt-1 text-sm font-bold text-muted">
            각 과목의 1-1, 1-2, 2-1, 2-2, 3-1, 3-2 학기별 평균등급과 전체 평균을 함께 확인합니다.
          </p>
        </div>
        <MatrixTable
          firstColumn="과목"
          leadingColumns={["교과", "교과 평균등급(미반영)", "교과 평균등급(반영)"]}
          rows={subjectSemester.map((row) => ({
            leadingValues: [row.course, formatGrade(courseSimpleAverageMap.get(row.course)), formatGrade(courseAverageMap.get(row.course))],
            key: row.subject,
            values: SEMESTER_ORDER.map((semester) => formatGrade(row.semesters[semester] ?? null)),
            total: formatGrade(row.average)
          }))}
          mergeLeadingColumnCount={3}
        />
        <div className="mb-4 mt-6 rounded-lg border border-line bg-slate-50 p-4">
          <h3 className="text-base font-extrabold text-ink">교과별 학기별 평균 상세표</h3>
          <p className="mt-1 text-sm font-bold text-muted">
            국어, 수학, 영어, 사회, 과학, 기타 순서로 학기별 단위수 가중평균을 함께 확인합니다.
          </p>
        </div>
        <MatrixTable
          firstColumn="교과"
          rows={courseSemester.map((row) => ({
            key: row.course,
            values: SEMESTER_ORDER.map((semester) => formatGrade(row.semesters[semester] ?? null)),
            total: formatGrade(row.average)
          }))}
        />
      </section>

      <section className="report-card p-5">
        <SectionHead index="4" title="교과군별 평균" note="국수영, 국수영사, 국수영과, 국수영사과, 전교과 기준" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <AverageTable
            columns={["교과군", "포함 교과", "평균등급", "이수단위"]}
            rows={groups.map((group) => [group.key, group.courses.join(", "), formatGrade(group.average), `${group.credits}단위`])}
          />
          <ChartBox>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groups.map((group) => ({ ...group, score: gradeScore(group.average, gradeScale) }))} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="key" />
                <YAxis domain={[1, gradeScale]} tickFormatter={(value) => `${gradeScale + 1 - Number(value)}등급`} />
                <Tooltip formatter={(_, __, item) => formatGrade(item.payload.average)} />
                <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="average" position="top" formatter={(value: number) => Number(value).toFixed(2)} className="fill-slate-700 text-xs font-bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </div>
      </section>

      <section className="report-card p-5">
        <SectionHead index="5" title="교과군별 학기별 평균" note="교과군별로 학기 변화와 전체 평균을 비교" />
        <MatrixTable
          firstColumn="교과군"
          afterFirstColumn="포함 교과"
          rows={groupSemester.map((row) => ({
            key: row.key,
            afterKey: row.courses.join(", "),
            values: SEMESTER_ORDER.map((semester) => formatGrade(row.semesters[semester] ?? null)),
            total: formatGrade(row.average)
          }))}
        />
      </section>
    </div>
  );
}

function semesterAverageRows(records: GradeRecord[], gradeScale: GradeScale) {
  return SEMESTER_ORDER.map((semester) => {
    const rows = validRecords(records, gradeScale).filter((record) => `${record.year}-${record.semester}` === semester);
    return {
      key: semester,
      average: weightedAverage(rows, gradeScale),
      credits: rows.reduce((sum, record) => sum + Number(record.credits), 0),
      count: rows.length
    };
  });
}

function subjectSemesterRows(records: GradeRecord[], gradeScale: GradeScale) {
  return subjectStats(records, gradeScale)
    .filter((subject) => subject.average !== null)
    .map((subject) => ({
      course: subject.records[0]?.course || "기타",
      subject: subject.key,
      average: subject.average,
      semesters: Object.fromEntries(
        SEMESTER_ORDER.map((semester) => [
          semester,
          weightedAverage(subject.records.filter((record) => `${record.year}-${record.semester}` === semester), gradeScale)
        ])
      ) as Record<string, number | null>
    }));
}

function courseSimpleAverageRows(records: GradeRecord[], gradeScale: GradeScale) {
  const map = new Map<string, number | null>();
  courseStats(records, gradeScale).forEach((course) => {
    const grades = course.records.map((record) => Number(record.rankGrade)).filter((grade) => Number.isFinite(grade));
    map.set(course.key, grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null);
  });
  return map;
}

function courseSemesterRows(records: GradeRecord[], gradeScale: GradeScale) {
  const valid = validRecords(records, gradeScale);
  return courseStats(records, gradeScale)
    .filter((course) => course.average !== null)
    .map((course) => ({
      course: course.key,
      average: course.average,
      semesters: Object.fromEntries(
        SEMESTER_ORDER.map((semester) => [
          semester,
          weightedAverage(valid.filter((record) => record.course === course.key && `${record.year}-${record.semester}` === semester), gradeScale)
        ])
      ) as Record<string, number | null>
    }));
}

function groupAverageRows(records: GradeRecord[], gradeScale: GradeScale) {
  const valid = validRecords(records, gradeScale);
  return COURSE_GROUPS.map((group) => {
    const rows = valid.filter((record) => group.courses.includes(record.course as CoreCourse));
    return {
      key: group.key,
      courses: group.courses,
      average: weightedAverage(rows, gradeScale),
      credits: rows.reduce((sum, record) => sum + Number(record.credits), 0)
    };
  });
}

function groupSemesterRows(records: GradeRecord[], gradeScale: GradeScale) {
  const valid = validRecords(records, gradeScale);
  return COURSE_GROUPS.map((group) => {
    const rows = valid.filter((record) => group.courses.includes(record.course as CoreCourse));
    return {
      key: group.key,
      courses: group.courses,
      average: weightedAverage(rows, gradeScale),
      semesters: Object.fromEntries(
        SEMESTER_ORDER.map((semester) => [
          semester,
          weightedAverage(rows.filter((record) => `${record.year}-${record.semester}` === semester), gradeScale)
        ])
      ) as Record<string, number | null>
    };
  });
}

function SectionHead({ index, title, note }: { index: string; title: string; note: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="eyebrow">Average Report {index}</p>
        <h2 className="section-title">{index}. {title}</h2>
      </div>
      <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-muted">{note}</span>
    </div>
  );
}

function ChartBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line p-4">{children}</div>;
}

function AverageTable({ columns, rows, mergeColumnCount = 0 }: { columns: string[]; rows: string[][]; mergeColumnCount?: number }) {
  const spans = mergeColumnCount > 0 ? firstColumnSpans(rows) : new Map<number, number>();
  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="min-w-[620px] w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
          <tr>{columns.map((column) => <th className="px-3 py-3" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="border-t border-line" key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, index) => {
                const shouldMerge = index < mergeColumnCount;
                if (shouldMerge && !spans.has(rowIndex)) return null;
                return (
                  <td
                    className={`px-3 py-3 ${shouldMerge ? "align-middle font-extrabold" : ""}`}
                    key={`${cell}-${index}`}
                    rowSpan={shouldMerge ? spans.get(rowIndex) : undefined}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function firstColumnSpans(rows: string[][]) {
  const spans = new Map<number, number>();
  let index = 0;
  while (index < rows.length) {
    const value = rows[index][0];
    let count = 1;
    while (index + count < rows.length && rows[index + count][0] === value) count += 1;
    spans.set(index, count);
    index += count;
  }
  return spans;
}

function MatrixTable({
  firstColumn,
  rows,
  afterFirstColumn,
  leadingColumns = [],
  mergeLeadingColumnCount = 0
}: {
  firstColumn: string;
  rows: { key: string; values: string[]; total: string; leadingValues?: string[]; afterKey?: string }[];
  afterFirstColumn?: string;
  leadingColumns?: string[];
  mergeLeadingColumnCount?: number;
}) {
  const spans = mergeLeadingColumnCount > 0 ? firstColumnSpans(rows.map((row) => row.leadingValues ?? [])) : new Map<number, number>();
  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="min-w-[860px] w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
          <tr>
            {leadingColumns.map((column) => <th className="px-3 py-3" key={column}>{column}</th>)}
            <th className="px-3 py-3">{firstColumn}</th>
            {afterFirstColumn ? <th className="px-3 py-3">{afterFirstColumn}</th> : null}
            {SEMESTER_ORDER.map((semester) => <th className="px-3 py-3 text-center" key={semester}>{semester}</th>)}
            <th className="px-3 py-3 text-center">전체 평균</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="border-t border-line" key={row.key}>
              {(row.leadingValues ?? []).map((value, index) => {
                const shouldMerge = index < mergeLeadingColumnCount;
                if (shouldMerge && !spans.has(rowIndex)) return null;
                return (
                  <td
                    className="px-3 py-3 align-middle font-extrabold"
                    key={`${row.key}-leading-${index}`}
                    rowSpan={shouldMerge ? spans.get(rowIndex) : undefined}
                  >
                    {value}
                  </td>
                );
              })}
              <td className="px-3 py-3 font-extrabold">{row.key}</td>
              {afterFirstColumn ? <td className="px-3 py-3">{row.afterKey}</td> : null}
              {row.values.map((value, index) => <td className="px-3 py-3 text-center" key={`${row.key}-${index}`}>{value}</td>)}
              <td className="bg-slate-50 px-3 py-3 text-center font-extrabold text-teal-750">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
