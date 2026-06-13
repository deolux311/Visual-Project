"use client";

import type { ChangeEvent } from "react";
import { COURSE_ORDER } from "@/lib/calculations";
import { sampleGrades } from "@/lib/sampleData";
import type { GradeRecord, GradeScale } from "@/types/grade";

type Props = {
  records: GradeRecord[];
  gradeScale: GradeScale;
  onChange: (records: GradeRecord[]) => void;
};

const columns = ["교과", "과목", "학년", "학기", "단위수", "원점수", "과목평균", "표준편차", "석차등급", "성취도", "수강자수", ""];

export default function GradeInputTable({ records, gradeScale, onChange }: Props) {
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

  function uploadCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const rows = text
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(",").map((cell) => cell.trim()));
      const body = rows[0]?.includes("교과") ? rows.slice(1) : rows;
      onChange(
        body
          .filter((row) => row.length >= 11)
          .map((row, index) => ({
            id: `csv-${Date.now()}-${index}`,
            course: row[0],
            subject: row[1],
            year: row[2],
            semester: row[3],
            credits: toNumber(row[4]),
            rawScore: toNumber(row[5]),
            subjectAverage: toNumber(row[6]),
            standardDeviation: toNumber(row[7]),
            rankGrade: toNumber(row[8]),
            achievement: row[9],
            students: toNumber(row[10])
          }))
      );
    });
    event.target.value = "";
  }

  function downloadCsv() {
    const header = columns.slice(0, -1).join(",");
    const lines = records.map((record) =>
      [
        record.course,
        record.subject,
        record.year,
        record.semester,
        record.credits,
        record.rawScore,
        record.subjectAverage,
        record.standardDeviation,
        record.rankGrade,
        record.achievement,
        record.students
      ].join(",")
    );
    downloadBlob([header, ...lines].join("\n"), "student-grades.csv", "text/csv;charset=utf-8");
  }

  function downloadExcel() {
    const rows = records
      .map(
        (record) =>
          `<tr><td>${record.course}</td><td>${record.subject}</td><td>${record.year}</td><td>${record.semester}</td><td>${record.credits}</td><td>${record.rawScore}</td><td>${record.subjectAverage}</td><td>${record.standardDeviation}</td><td>${record.rankGrade}</td><td>${record.achievement}</td><td>${record.students}</td></tr>`
      )
      .join("");
    const html = `<table><thead><tr>${columns.slice(0, -1).map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
    downloadBlob(html, "student-grades.xls", "application/vnd.ms-excel;charset=utf-8");
  }

  return (
    <section className="report-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="eyebrow">Grade Records</p>
          <h2 className="section-title">성적 데이터 입력</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={addRow} type="button">행 추가</button>
          <button className="btn-secondary" onClick={() => onChange(sampleGrades)} type="button">예시 데이터</button>
          <label className="btn-secondary cursor-pointer">
            CSV 업로드
            <input accept=".csv,text/csv" className="hidden" onChange={uploadCsv} type="file" />
          </label>
          <button className="btn-secondary" onClick={downloadCsv} type="button">CSV 다운로드</button>
          <button className="btn-secondary" onClick={downloadExcel} type="button">Excel 다운로드</button>
        </div>
      </div>

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
              records.map((record) => (
                <tr className="border-b border-line" key={record.id}>
                  <td className="px-2 py-2">
                    <select className="field" value={record.course} onChange={(event) => update(record.id, "course", event.target.value)}>
                      {COURSE_ORDER.map((course) => <option key={course}>{course}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2"><input className="field" value={record.subject} onChange={(event) => update(record.id, "subject", event.target.value)} /></td>
                  <td className="px-2 py-2"><select className="field" value={record.year} onChange={(event) => update(record.id, "year", event.target.value)}><option>1</option><option>2</option><option>3</option></select></td>
                  <td className="px-2 py-2"><select className="field" value={record.semester} onChange={(event) => update(record.id, "semester", event.target.value)}><option>1</option><option>2</option></select></td>
                  {(["credits", "rawScore", "subjectAverage", "standardDeviation", "rankGrade"] as (keyof GradeRecord)[]).map((field) => (
                    <td className="px-2 py-2" key={field}>
                      <input className="field" min={field === "rankGrade" ? 1 : 0} max={field === "rankGrade" ? gradeScale : 100} step="0.1" type="number" value={record[field]} onChange={(event) => update(record.id, field, event.target.value)} />
                    </td>
                  ))}
                  <td className="px-2 py-2"><input className="field" value={record.achievement} onChange={(event) => update(record.id, "achievement", event.target.value)} /></td>
                  <td className="px-2 py-2"><input className="field" min={0} type="number" value={record.students} onChange={(event) => update(record.id, "students", event.target.value)} /></td>
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
