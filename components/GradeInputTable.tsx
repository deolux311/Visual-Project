"use client";

import type { ChangeEvent } from "react";
import ImageGradeExtractor from "@/components/ImageGradeExtractor";
import { COURSE_ORDER } from "@/lib/calculations";
import { sampleGrades } from "@/lib/sampleData";
import type { GradeRecord, GradeScale, StudentInfo, StudentRecordReport } from "@/types/grade";

type Props = {
  records: GradeRecord[];
  gradeScale: GradeScale;
  onChange: (records: GradeRecord[]) => void;
  onStudentRecordReport?: (report: Partial<StudentRecordReport>) => void;
  onStudentInfo?: (studentInfo: Partial<StudentInfo>) => void;
};

const columns = ["학년", "학기", "교과", "과목", "학점수", "원점수", "과목평균", "표준편차", "성취도", "수강자수", "석차등급", "순서", ""];

export default function GradeInputTable({ records, gradeScale, onChange, onStudentRecordReport, onStudentInfo }: Props) {
  function update(id: string, field: keyof GradeRecord, value: string) {
    onChange(
      records.map((record) => {
        if (record.id !== id) return record;
        const numericFields: (keyof GradeRecord)[] = ["credits", "rawScore", "subjectAverage", "standardDeviation", "rankGrade", "students"];
        return {
          ...record,
          [field]: numericFields.includes(field) ? (value === "" ? "" : Number(value)) : value
        };
      })
    );
  }

  function addRow() {
    onChange([
      ...records,
      {
        id: crypto.randomUUID(),
        course: "국어",
        subject: "",
        year: "1",
        semester: "1",
        credits: "",
        rawScore: "",
        subjectAverage: "",
        standardDeviation: "",
        rankGrade: "",
        achievement: "",
        students: ""
      }
    ]);
  }

  function deleteRow(id: string) {
    onChange(records.filter((record) => record.id !== id));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= records.length) return;
    const nextRecords = [...records];
    [nextRecords[index], nextRecords[nextIndex]] = [nextRecords[nextIndex], nextRecords[index]];
    onChange(nextRecords);
  }

  function appendExtractedRows(nextRecords: GradeRecord[]) {
    onChange([...records, ...nextRecords]);
  }

  function uploadCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const rows = text
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(",").map((cell) => cell.trim()));
      const header = rows[0] ?? [];
      const hasHeader = header.includes("교과") || header.includes("학년");
      const isLegacyOrder = header[0] === "교과";
      const body = hasHeader ? rows.slice(1) : rows;
      onChange(
        body
          .filter((row) => row.length >= 11)
          .map((row, index) => {
            const ordered = isLegacyOrder
              ? [row[2], row[3], row[0], row[1], ...row.slice(4)]
              : row;
            return {
              id: `csv-${Date.now()}-${index}`,
              year: ordered[0],
              semester: ordered[1],
              course: ordered[2],
              subject: ordered[3],
              credits: toNumber(ordered[4]),
              rawScore: toNumber(ordered[5]),
              subjectAverage: toNumber(ordered[6]),
              standardDeviation: toNumber(ordered[7]),
              achievement: ordered[8],
              students: toNumber(ordered[9]),
              rankGrade: toNumber(ordered[10])
            };
          })
      );
    });
    event.target.value = "";
  }

  function downloadCsv() {
    const header = columns.slice(0, -1).join(",");
    const lines = records.map((record) =>
      [
        record.year,
        record.semester,
        record.course,
        record.subject,
        record.credits,
        record.rawScore,
        record.subjectAverage,
        record.standardDeviation,
        record.achievement,
        record.students,
        record.rankGrade
      ].join(",")
    );
    downloadBlob([header, ...lines].join("\n"), "student-grades.csv", "text/csv;charset=utf-8");
  }

  return (
    <section className="report-card overflow-hidden">
      <div className="border-b border-line p-5">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-line bg-slate-50 p-4">
            <p className="eyebrow">Grade Records</p>
            <h2 className="section-title">내신 성적 데이터 입력</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="btn-primary cursor-pointer" htmlFor="grade-image-pdf-upload">이미지/PDF</label>
              <label className="btn-secondary cursor-pointer">
                CSV
                <input accept=".csv,text/csv" className="hidden" onChange={uploadCsv} type="file" />
              </label>
              <button className="btn-secondary" onClick={() => onChange(sampleGrades)} type="button">샘플로 초기화</button>
              <button className="btn-primary" onClick={addRow} type="button">행 추가</button>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <p className="eyebrow">Export</p>
            <h2 className="section-title">내신 성적 데이터 다운로드</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => window.print()} type="button">PDF</button>
              <button className="btn-secondary" onClick={downloadCsv} type="button">CSV</button>
            </div>
          </div>
        </div>
      </div>

      <ImageGradeExtractor compactControls gradeScale={gradeScale} onApply={appendExtractedRows} onReportApply={onStudentRecordReport} onStudentInfoApply={onStudentInfo} />

      <div className="overflow-auto">
        <table className="min-w-[1320px] border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
            <tr>{columns.map((column) => <th className="border-b border-line px-3 py-3" key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-muted" colSpan={columns.length}>성적 데이터를 입력하면 분석 결과가 자동으로 표시됩니다.</td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr className="border-b border-line" key={record.id}>
                  <td className="px-2 py-2"><select className="field" value={record.year} onChange={(event) => update(record.id, "year", event.target.value)}><option>1</option><option>2</option><option>3</option></select></td>
                  <td className="px-2 py-2"><select className="field" value={record.semester} onChange={(event) => update(record.id, "semester", event.target.value)}><option>1</option><option>2</option></select></td>
                  <td className="px-2 py-2">
                    <select className="field" value={record.course} onChange={(event) => update(record.id, "course", event.target.value)}>
                      {COURSE_ORDER.map((course) => <option key={course}>{course}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2"><input className="field" value={record.subject} onChange={(event) => update(record.id, "subject", event.target.value)} /></td>
                  {(["credits", "rawScore", "subjectAverage", "standardDeviation"] as (keyof GradeRecord)[]).map((field) => (
                    <td className="px-2 py-2" key={field}>
                      <input className="field" min={field === "rankGrade" ? 1 : 0} max={field === "rankGrade" ? gradeScale : 100} step="0.1" type="number" value={record[field]} onChange={(event) => update(record.id, field, event.target.value)} />
                    </td>
                  ))}
                  <td className="px-2 py-2"><input className="field" value={record.achievement} onChange={(event) => update(record.id, "achievement", event.target.value)} /></td>
                  <td className="px-2 py-2"><input className="field" min={0} type="number" value={record.students} onChange={(event) => update(record.id, "students", event.target.value)} /></td>
                  <td className="px-2 py-2"><input className="field" min={1} max={gradeScale} step="0.1" type="number" value={record.rankGrade} onChange={(event) => update(record.id, "rankGrade", event.target.value)} /></td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        aria-label="행 위로 이동"
                        className="btn-secondary h-9 w-9 px-0"
                        disabled={index === 0}
                        onClick={() => moveRow(index, -1)}
                        title="위로 이동"
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label="행 아래로 이동"
                        className="btn-secondary h-9 w-9 px-0"
                        disabled={index === records.length - 1}
                        onClick={() => moveRow(index, 1)}
                        title="아래로 이동"
                        type="button"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2"><button className="btn-danger" onClick={() => deleteRow(record.id)} type="button">×</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function toNumber(value: string): number | "" {
  return value === "" || Number.isNaN(Number(value)) ? "" : Number(value);
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob(["\ufeff", content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
