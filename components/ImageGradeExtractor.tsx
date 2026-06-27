"use client";

import { useEffect, useState, type DragEvent } from "react";
import { COURSE_ORDER } from "@/lib/calculations";
import type { GradeRecord, GradeScale, StudentInfo, StudentRecordReport } from "@/types/grade";

type ExtractedGradeRecord = GradeRecord & {
  confidence?: string;
  warning?: string;
};

type Props = {
  gradeScale: GradeScale;
  onApply: (records: GradeRecord[]) => void;
  onReportApply?: (report: Partial<StudentRecordReport>) => void;
  onStudentInfoApply?: (studentInfo: Partial<StudentInfo>) => void;
  compactControls?: boolean;
};

type PreparedPage = {
  image: string;
  label: string;
};

const numericFields: (keyof GradeRecord)[] = ["credits", "rawScore", "subjectAverage", "standardDeviation", "rankGrade", "students"];
const UPLOAD_INPUT_ID = "grade-image-pdf-upload";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const EXTRACTED_COLUMNS = [
  { label: "학년", className: "w-[72px]" },
  { label: "학기", className: "w-[72px]" },
  { label: "교과", className: "w-[92px]" },
  { label: "과목", className: "w-[160px]" },
  { label: "학점수", className: "w-[88px]" },
  { label: "원점수", className: "w-[88px]" },
  { label: "과목평균", className: "w-[96px]" },
  { label: "표준편차", className: "w-[96px]" },
  { label: "성취도", className: "w-[104px]" },
  { label: "수강자수", className: "w-[112px]" },
  { label: "석차등급", className: "w-[88px]" },
  { label: "확인", className: "w-[220px]" },
  { label: "순서", className: "w-[92px]" },
  { label: "", className: "w-[52px]" }
];

export default function ImageGradeExtractor({ gradeScale, onApply, onReportApply, onStudentInfoApply, compactControls = false }: Props) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ExtractedGradeRecord[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [studentRecordReport, setStudentRecordReport] = useState<Partial<StudentRecordReport>>({});
  const [studentInfo, setStudentInfo] = useState<Partial<StudentInfo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const files = clipboardImageFiles(event.clipboardData);
      if (!files.length) return;
      event.preventDefault();
      handleFiles(files);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  });

  function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter(isSupportedUpload);
    if (!files.length) {
      setError("이미지 또는 PDF 파일만 업로드할 수 있습니다.");
      return;
    }
    void extractFromFiles(files);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragOver(false);
    handleFiles(event.dataTransfer.files);
  }

  async function extractFromFiles(files: File[]) {
    if (!files.length) return;
    setError("");
    setWarnings([]);
    setRows([]);
    setStudentRecordReport({});
    setStudentInfo({});
    setFileName(files.length === 1 ? files[0].name : `${files.length}개 파일`);
    setPreviewUrl(files[0].type === "application/pdf" ? "" : URL.createObjectURL(files[0]));
    setIsLoading(true);
    setProgress("파일을 이미지로 변환하고 있습니다.");

    try {
      const pages = (await Promise.all(files.map(prepareFile))).flat();
      if (!pages.length) throw new Error("분석할 이미지 또는 PDF 페이지를 찾지 못했습니다.");
      setFileName(`${files.length}개 파일 · ${pages.length}페이지/이미지`);
      setPreviewUrl(pages[0].image);

      const nextRows: ExtractedGradeRecord[] = [];
      const nextWarnings: string[] = [];
      const nextStudentRecordReports: Partial<StudentRecordReport>[] = [];
      const nextStudentInfos: Partial<StudentInfo>[] = [];

      for (const [index, page] of pages.entries()) {
        setProgress(`${index + 1}/${pages.length} 처리 중 · ${page.label}`);
        const response = await fetch("/api/extract-grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: page.image, mimeType: "image/jpeg", gradeScale })
        });
        const text = await response.text();
        const result = parseApiResponse(text);
        if (!response.ok) {
          const detail = typeof result.detail === "string" ? `\n${summarizeDetail(result.detail)}` : "";
          nextWarnings.push(`${page.label}: ${result.error || "이미지 추출에 실패했습니다."}${detail}`);
          continue;
        }
        if (Array.isArray(result.records)) nextRows.push(...(result.records as ExtractedGradeRecord[]));
        if (result.studentRecordReport && typeof result.studentRecordReport === "object") {
          nextStudentRecordReports.push(result.studentRecordReport as Partial<StudentRecordReport>);
        }
        if (result.studentInfo && typeof result.studentInfo === "object") {
          nextStudentInfos.push(result.studentInfo as Partial<StudentInfo>);
        }
        if (Array.isArray(result.warnings)) nextWarnings.push(...result.warnings.map((warning) => `${page.label}: ${warning}`));
      }

      setRows(nextRows);
      setStudentRecordReport(mergeStudentRecordReports(nextStudentRecordReports));
      setStudentInfo(mergeStudentInfos(nextStudentInfos));
      setWarnings(nextWarnings);
      if (!nextRows.length && nextWarnings.length) {
        setError("추출된 성적 행이 없습니다. 성적표가 있는 페이지만 이미지로 잘라서 다시 업로드하면 정확도가 높아집니다.");
      }
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "이미지 추출 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  }

  function updateRow(id: string, field: keyof GradeRecord, value: string) {
    setRows((current) =>
      current.map((row) => (
        row.id === id
          ? { ...row, [field]: numericFields.includes(field) ? toNumber(value) : value }
          : row
      ))
    );
  }

  function deleteRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const nextRows = [...current];
      [nextRows[index], nextRows[nextIndex]] = [nextRows[nextIndex], nextRows[index]];
      return nextRows;
    });
  }

  function applyRows() {
    const cleaned = rows.map(({ confidence: _confidence, warning: _warning, ...record }) => record);
    onApply(cleaned);
    if (hasStudentInfo(studentInfo)) onStudentInfoApply?.(studentInfo);
    if (hasStudentRecordReport(studentRecordReport)) onReportApply?.(studentRecordReport);
    setRows([]);
    setStudentRecordReport({});
    setStudentInfo({});
    setWarnings([]);
    setError("");
  }

  const uploadInput = (
    <input
      accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
      className="hidden"
      id={UPLOAD_INPUT_ID}
      multiple
      onChange={(event) => {
        if (event.target.files?.length) handleFiles(event.target.files);
        event.target.value = "";
      }}
      type="file"
    />
  );
  const hasActivity = Boolean(previewUrl || isLoading || error || rows.length || warnings.length || hasStudentRecordReport(studentRecordReport) || hasStudentInfo(studentInfo));

  if (compactControls && !hasActivity) {
    return (
      <div className="border-b border-line bg-slate-50 px-5 pb-5">
        {uploadInput}
        <DropZone
          compact
          inputId={UPLOAD_INPUT_ID}
          isDragOver={isDragOver}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>
    );
  }

  return (
    <div className={compactControls ? "border-b border-line bg-slate-50 px-5 pb-5" : "border-b border-line bg-slate-50 p-5"}>
      {uploadInput}
      {!compactControls ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Gemini OCR</p>
            <h3 className="text-base font-extrabold text-ink">이미지로 성적 자동입력</h3>
            <p className="mt-1 text-sm font-bold text-muted">
              생기부 교과성적 이미지를 업로드하면 Gemini가 표를 읽고 입력 행으로 변환합니다.
            </p>
          </div>
          <label className="btn-primary cursor-pointer" htmlFor={UPLOAD_INPUT_ID}>
            이미지/PDF 선택
          </label>
        </div>
      ) : null}

      {!compactControls ? (
        <DropZone
          inputId={UPLOAD_INPUT_ID}
          isDragOver={isDragOver}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ) : null}

      {previewUrl || isLoading || error ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
          <div className="rounded-lg border border-line bg-white p-3">
            {previewUrl ? <img alt="업로드한 성적표 이미지" className="max-h-[260px] w-full rounded-md object-contain" src={previewUrl} /> : null}
            <p className="mt-2 truncate text-xs font-bold text-muted">{fileName || "이미지 미선택"}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            {isLoading ? <p className="text-sm font-extrabold text-teal-750">{progress || "Gemini가 성적표 이미지를 분석하고 있습니다..."}</p> : null}
            {error ? <p className="text-sm font-extrabold text-rose-600">{error}</p> : null}
            {!isLoading && !error && rows.length === 0 ? (
              <p className="text-sm font-bold text-muted">추출된 행이 없습니다. 더 선명한 이미지로 다시 시도해 주세요.</p>
            ) : null}
            {warnings.length ? (
              <div className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-800">
                {warnings.slice(0, 8).map((warning, index) => <p className="break-words" key={`${warning}-${index}`}>{warning}</p>)}
                {warnings.length > 8 ? <p>외 {warnings.length - 8}건의 확인 메시지가 있습니다.</p> : null}
              </div>
            ) : null}
            {hasStudentRecordReport(studentRecordReport) ? (
              <div className="mt-3 rounded-md bg-teal-50 p-3 text-xs font-bold leading-6 text-teal-800">
                학생부 리포트 요약도 함께 추출되었습니다. 아래 `성적표에 반영`을 누르면 학생부 리포트에 자동 입력됩니다.
              </div>
            ) : null}
            {hasStudentInfo(studentInfo) ? (
              <div className="mt-3 rounded-md bg-sky-50 p-3 text-xs font-bold leading-6 text-sky-800">
                학생 기본정보도 함께 추출되었습니다. 없는 항목은 기타로 입력됩니다.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <div className="mt-4 max-w-full overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[1240px] table-fixed border-collapse text-sm">
            <thead className="bg-white text-left text-xs font-extrabold text-muted">
              <tr>
                {EXTRACTED_COLUMNS.map((column) => (
                  <th className={`border-b border-line px-3 py-3 ${column.className}`} key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr className={row.warning ? "border-b border-line bg-amber-50/60" : "border-b border-line"} key={row.id}>
                  <td className="px-2 py-2"><select className="field" value={row.year} onChange={(event) => updateRow(row.id, "year", event.target.value)}><option value="">-</option><option>1</option><option>2</option><option>3</option></select></td>
                  <td className="px-2 py-2"><select className="field" value={row.semester} onChange={(event) => updateRow(row.id, "semester", event.target.value)}><option value="">-</option><option>1</option><option>2</option></select></td>
                  <td className="px-2 py-2">
                    <select className="field" value={row.course} onChange={(event) => updateRow(row.id, "course", event.target.value)}>
                      {COURSE_ORDER.map((course) => <option key={course}>{course}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2"><input className="field" value={row.subject} onChange={(event) => updateRow(row.id, "subject", event.target.value)} /></td>
                  {(["credits", "rawScore", "subjectAverage", "standardDeviation"] as (keyof GradeRecord)[]).map((field) => (
                    <td className="px-2 py-2" key={field}>
                      <input className="field" min={field === "rankGrade" ? 1 : 0} max={field === "rankGrade" ? gradeScale : 100} step="0.1" type="number" value={row[field]} onChange={(event) => updateRow(row.id, field, event.target.value)} />
                    </td>
                  ))}
                  <td className="px-2 py-2"><input className="field" value={row.achievement} onChange={(event) => updateRow(row.id, "achievement", event.target.value)} /></td>
                  <td className="px-2 py-2"><input className="field" min={0} type="number" value={row.students} onChange={(event) => updateRow(row.id, "students", event.target.value)} /></td>
                  <td className="px-2 py-2"><input className="field" min={1} max={gradeScale} step="0.1" type="number" value={row.rankGrade} onChange={(event) => updateRow(row.id, "rankGrade", event.target.value)} /></td>
                  <td className="whitespace-normal break-keep px-3 py-2 text-xs font-bold leading-5 text-muted">{row.warning || row.confidence || "확인 완료"}</td>
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
                        disabled={index === rows.length - 1}
                        onClick={() => moveRow(index, 1)}
                        title="아래로 이동"
                        type="button"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2"><button className="btn-danger" onClick={() => deleteRow(row.id)} type="button">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
            <p className="text-sm font-bold text-muted">추출 결과를 확인한 뒤 현재 학생의 성적표에 추가하세요.</p>
            <button className="btn-primary" onClick={applyRows} type="button">성적표에 반영</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function mergeStudentRecordReports(reports: Partial<StudentRecordReport>[]) {
  return reports.reduce<Partial<StudentRecordReport>>((merged, report) => ({
    careerCompetency: mergeText(merged.careerCompetency, report.careerCompetency),
    academicCompetency: mergeText(merged.academicCompetency, report.academicCompetency),
    communityCompetency: mergeText(merged.communityCompetency, report.communityCompetency),
    keyActivities: mergeText(merged.keyActivities, report.keyActivities),
    summaryOpinion: mergeText(merged.summaryOpinion, report.summaryOpinion)
  }), {});
}

function DropZone({
  compact = false,
  inputId,
  isDragOver,
  onDragLeave,
  onDragOver,
  onDrop
}: {
  compact?: boolean;
  inputId: string;
  isDragOver: boolean;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  return (
    <label
      className={[
        "mt-4 block cursor-pointer rounded-lg border-2 border-dashed bg-white text-center transition",
        compact ? "px-4 py-4" : "px-5 py-7",
        isDragOver ? "border-teal-650 bg-teal-50 text-teal-750" : "border-line text-muted hover:border-teal-650 hover:bg-slate-50"
      ].join(" ")}
      htmlFor={inputId}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="block text-sm font-extrabold text-ink">이미지/PDF 파일을 드래그하거나 캡쳐 이미지를 Ctrl+V로 붙여넣기</span>
      <span className="mt-1 block text-xs font-bold">여러 이미지와 PDF를 한꺼번에 넣을 수 있습니다. 캡쳐 직후 붙여넣으면 바로 분석됩니다.</span>
    </label>
  );
}

function mergeText(current?: string, next?: string) {
  const cleaned = typeof next === "string" ? next.trim() : "";
  if (!cleaned) return current ?? "";
  return current ? `${current}\n${cleaned}` : cleaned;
}

function isSupportedUpload(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function clipboardImageFiles(clipboardData: DataTransfer | null) {
  if (!clipboardData?.items?.length) return [];
  return Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      const extension = file.type.split("/")[1] || "png";
      return new File([file], `clipboard-capture-${Date.now()}-${index}.${extension}`, { type: file.type });
    })
    .filter((file): file is File => Boolean(file));
}

function hasStudentRecordReport(report: Partial<StudentRecordReport>) {
  return Boolean(
    report.careerCompetency ||
    report.academicCompetency ||
    report.communityCompetency ||
    report.keyActivities ||
    report.summaryOpinion
  );
}

function mergeStudentInfos(infos: Partial<StudentInfo>[]) {
  return infos.reduce<Partial<StudentInfo>>((merged, info) => {
    const next = { ...merged };
    (Object.keys(info) as (keyof StudentInfo)[]).forEach((key) => {
      const value = info[key];
      if (typeof value === "string" && value.trim()) next[key] = value.trim();
    });
    return next;
  }, {});
}

function hasStudentInfo(info: Partial<StudentInfo>) {
  return Object.values(info).some((value) => typeof value === "string" && value.trim());
}

function parseApiResponse(text: string): { error?: string; detail?: string; records?: unknown[]; warnings?: unknown[]; studentRecordReport?: unknown; studentInfo?: unknown } {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "서버 응답을 해석하지 못했습니다.", detail: text };
  }
}

function summarizeDetail(detail: string) {
  if (detail.includes("prepayment credits are depleted")) {
    return "Google AI Studio의 선불 크레딧 잔액이 부족합니다.";
  }
  if (detail.includes("API key not valid")) {
    return "Gemini API 키가 유효하지 않습니다.";
  }
  if (detail.includes("model") && detail.includes("not found")) {
    return "현재 설정된 Gemini 모델명을 확인해 주세요.";
  }
  if (detail.includes("quota") || detail.includes("Quota")) {
    return "Gemini 프로젝트의 할당량 또는 결제 한도를 확인해 주세요.";
  }
  if (detail.includes("RESOURCE_EXHAUSTED") || detail.includes("Too Many Requests") || detail.includes("429")) {
    return "Gemini 무료 사용량 또는 분당 요청 한도를 초과했을 가능성이 큽니다.";
  }
  return detail.slice(0, 240);
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

async function prepareImage(file: File) {
  const source = await readAsDataUrl(file);
  return resizeImage(source);
}

async function prepareFile(file: File): Promise<PreparedPage[]> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return pdfToImages(file);
  }
  return [{ image: await prepareImage(file), label: file.name }];
}

async function resizeImage(source: string) {
  const image = await loadImage(source);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

async function pdfToImages(file: File): Promise<PreparedPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${BASE_PATH}/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: PreparedPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.65 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    pages.push({
      image: await resizeImage(canvas.toDataURL("image/jpeg", 0.82)),
      label: `${file.name} ${pageNumber}페이지`
    });
  }

  return pages;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 처리하지 못했습니다."));
    image.src = src;
  });
}

function toNumber(value: string): number | "" {
  return value === "" || Number.isNaN(Number(value)) ? "" : Number(value);
}
