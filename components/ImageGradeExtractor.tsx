"use client";

import { useState } from "react";
import { COURSE_ORDER } from "@/lib/calculations";
import type { GradeRecord, GradeScale } from "@/types/grade";

type ExtractedGradeRecord = GradeRecord & {
  confidence?: string;
  warning?: string;
};

type Props = {
  gradeScale: GradeScale;
  onApply: (records: GradeRecord[]) => void;
};

type PreparedPage = {
  image: string;
  label: string;
};

const numericFields: (keyof GradeRecord)[] = ["credits", "rawScore", "subjectAverage", "standardDeviation", "rankGrade", "students"];
const UPLOAD_INPUT_ID = "grade-image-pdf-upload";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function ImageGradeExtractor({ gradeScale, onApply }: Props) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ExtractedGradeRecord[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  async function extractFromFiles(files: File[]) {
    if (!files.length) return;
    setError("");
    setWarnings([]);
    setRows([]);
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
        if (Array.isArray(result.warnings)) nextWarnings.push(...result.warnings.map((warning) => `${page.label}: ${warning}`));
      }

      setRows(nextRows);
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

  function applyRows() {
    const cleaned = rows.map(({ confidence: _confidence, warning: _warning, ...record }) => record);
    onApply(cleaned);
    setRows([]);
    setWarnings([]);
    setError("");
  }

  return (
    <div className="border-b border-line bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Gemini OCR</p>
          <h3 className="text-base font-extrabold text-ink">이미지로 성적 자동입력</h3>
          <p className="mt-1 text-sm font-bold text-muted">
            생기부 교과성적 이미지를 업로드하면 Gemini가 표를 읽고 입력 행으로 변환합니다.
          </p>
        </div>
        <label className="btn-primary cursor-pointer">
          이미지/PDF 선택
          <input
            accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
            className="hidden"
            id={UPLOAD_INPUT_ID}
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) void extractFromFiles(files);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>

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
                {warnings.slice(0, 8).map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}
                {warnings.length > 8 ? <p>외 {warnings.length - 8}건의 확인 메시지가 있습니다.</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <div className="mt-4 overflow-auto rounded-lg border border-line bg-white">
          <table className="min-w-[1320px] border-collapse text-sm">
            <thead className="bg-white text-left text-xs font-extrabold text-muted">
              <tr>
                {["교과", "과목", "학년", "학기", "단위수", "원점수", "과목평균", "표준편차", "성취도", "수강자수", "석차등급", "확인", ""].map((column) => (
                  <th className="border-b border-line px-3 py-3" key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className={row.warning ? "border-b border-line bg-amber-50/60" : "border-b border-line"} key={row.id}>
                  <td className="px-2 py-2">
                    <select className="field" value={row.course} onChange={(event) => updateRow(row.id, "course", event.target.value)}>
                      {COURSE_ORDER.map((course) => <option key={course}>{course}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2"><input className="field" value={row.subject} onChange={(event) => updateRow(row.id, "subject", event.target.value)} /></td>
                  <td className="px-2 py-2"><select className="field" value={row.year} onChange={(event) => updateRow(row.id, "year", event.target.value)}><option value="">-</option><option>1</option><option>2</option><option>3</option></select></td>
                  <td className="px-2 py-2"><select className="field" value={row.semester} onChange={(event) => updateRow(row.id, "semester", event.target.value)}><option value="">-</option><option>1</option><option>2</option></select></td>
                  {(["credits", "rawScore", "subjectAverage", "standardDeviation"] as (keyof GradeRecord)[]).map((field) => (
                    <td className="px-2 py-2" key={field}>
                      <input className="field" min={field === "rankGrade" ? 1 : 0} max={field === "rankGrade" ? gradeScale : 100} step="0.1" type="number" value={row[field]} onChange={(event) => updateRow(row.id, field, event.target.value)} />
                    </td>
                  ))}
                  <td className="px-2 py-2"><input className="field" value={row.achievement} onChange={(event) => updateRow(row.id, "achievement", event.target.value)} /></td>
                  <td className="px-2 py-2"><input className="field" min={0} type="number" value={row.students} onChange={(event) => updateRow(row.id, "students", event.target.value)} /></td>
                  <td className="px-2 py-2"><input className="field" min={1} max={gradeScale} step="0.1" type="number" value={row.rankGrade} onChange={(event) => updateRow(row.id, "rankGrade", event.target.value)} /></td>
                  <td className="px-3 py-2 text-xs font-bold text-muted">{row.warning || row.confidence || "확인 완료"}</td>
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

function parseApiResponse(text: string): { error?: string; detail?: string; records?: unknown[]; warnings?: unknown[] } {
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
