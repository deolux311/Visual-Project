import { NextResponse } from "next/server";
import type { GradeRecord, GradeScale } from "@/types/grade";

type ExtractRequest = {
  image: string;
  mimeType: string;
  gradeScale?: GradeScale;
};

type ExtractedRow = Partial<Omit<GradeRecord, "id">> & {
  confidence?: "high" | "medium" | "low";
  warning?: string;
};

type NormalizedExtractedRow = GradeRecord & {
  confidence: string;
  warning: string;
};

const COURSE_ORDER = ["국어", "수학", "영어", "사회", "과학", "기타"];

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다. .env.local에 GEMINI_API_KEY를 추가해 주세요." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as ExtractRequest;
  const base64 = body.image?.includes(",") ? body.image.split(",").pop() : body.image;
  const mimeType = body.mimeType || "image/png";
  const gradeScale = body.gradeScale === 5 ? 5 : 9;

  if (!base64) {
    return NextResponse.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const thinkingBudget = Number(process.env.GEMINI_THINKING_BUDGET ?? 0);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = [
    "이 이미지는 한국 고등학교 학교생활기록부 또는 교과 성적표입니다.",
    "표 안의 교과 성적 데이터를 읽어서 JSON으로만 반환하세요.",
    "반환 형식은 { \"records\": [], \"warnings\": [] } 입니다.",
    "records의 각 행은 course, subject, year, semester, credits, rawScore, subjectAverage, standardDeviation, rankGrade, achievement, students 필드를 가집니다.",
    "이미지 상단에 [1학년], [2학년], [3학년] 같은 제목이 있으면 그 아래 표의 모든 행에 해당 year를 적용하세요.",
    "학기 열의 숫자가 여러 행을 세로로 병합해서 표시된 경우, 다음 학기 숫자가 나오기 전까지 그 값을 모든 행에 반복 적용하세요. 예: 왼쪽에 1이 세로 병합되어 있으면 그 구간의 모든 과목 semester는 \"1\"입니다.",
    "학점수 열은 credits입니다. 표에 '학점수'로 표시되어 있어도 기존 성적 데이터의 단위수와 동일하게 credits에 넣으세요.",
    "원점수/과목평균(표준편차) 값은 반드시 분리하세요. 예: 86/75.9(14.3)은 rawScore=86, subjectAverage=75.9, standardDeviation=14.3입니다.",
    "성취도(수강자수) 값은 반드시 분리하세요. 예: B(367)은 achievement=\"B\", students=367입니다.",
    "석차등급 열의 숫자는 rankGrade입니다. 예: 석차등급 4는 rankGrade=4입니다.",
    "석차등급이 P이거나 비어 있는 과목은 rankGrade를 빈 문자열로 두고, achievement에는 P 또는 보이는 성취도를 넣으세요.",
    "course는 반드시 국어, 수학, 영어, 사회, 과학, 기타 중 하나로 정규화하세요. 그 외 교과는 기타입니다.",
    "한국사는 교과가 한국사로 보이더라도 course는 사회로 정규화하세요.",
    "사회(역사/도덕 포함)는 course를 사회로 정규화하세요.",
    "기술·가정/제2외국어/한문/교양, 체육, 예술은 course를 기타로 정규화하세요.",
    "year는 1, 2, 3 중 하나의 문자열, semester는 1 또는 2 중 하나의 문자열로 반환하세요.",
    "credits, rawScore, subjectAverage, standardDeviation, rankGrade, students는 숫자로 읽히면 숫자 문자열로 반환하고, 없거나 불명확하면 빈 문자열로 반환하세요.",
    `rankGrade는 현재 ${gradeScale}등급 체제 기준입니다. 범위를 벗어나거나 불명확하면 빈 문자열로 반환하세요.`,
    "achievement는 A, B, C, D, E, P 등 이미지에 보이는 값을 문자열로 반환하세요.",
    "표의 한 행에는 반드시 course와 subject를 같이 넣으세요. 과목명이 교과명과 같아도 subject에 같은 값을 넣으세요.",
    "비고 칸, 이수학점 합계 행, QR/증명 문구, 주소/학적사항은 records에 넣지 마세요.",
    "확신이 낮은 행에는 confidence를 low로 표시하고 warning에 이유를 짧게 적어주세요.",
    "표가 여러 개이면 모두 합쳐서 records에 넣으세요. 설명 문장이나 마크다운은 절대 포함하지 마세요."
  ].join("\n");

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
          thinkingConfig: {
            thinkingBudget: Number.isFinite(thinkingBudget) ? thinkingBudget : 0
          },
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            properties: {
              records: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    course: { type: "STRING" },
                    subject: { type: "STRING" },
                    year: { type: "STRING" },
                    semester: { type: "STRING" },
                    credits: { type: "STRING" },
                    rawScore: { type: "STRING" },
                    subjectAverage: { type: "STRING" },
                    standardDeviation: { type: "STRING" },
                    rankGrade: { type: "STRING" },
                    achievement: { type: "STRING" },
                    students: { type: "STRING" },
                    confidence: { type: "STRING" },
                    warning: { type: "STRING" }
                  },
                  required: ["course", "subject", "year", "semester", "credits", "rawScore", "subjectAverage", "standardDeviation", "rankGrade", "achievement", "students"]
                }
              },
              warnings: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            }
          }
        }
      })
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gemini 서버에 연결하지 못했습니다. 인터넷 연결 또는 실행 환경의 네트워크 권한을 확인해 주세요.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }

  if (!geminiResponse.ok) {
    const text = await geminiResponse.text();
    if (geminiResponse.status === 429) {
      const prepaidDepleted = text.includes("prepayment credits are depleted");
      return NextResponse.json(
        {
          error: prepaidDepleted
            ? "Gemini 선불 크레딧이 소진되었습니다. Google AI Studio 프로젝트의 Billing에서 선불 크레딧을 충전한 뒤 다시 시도해 주세요."
            : "Gemini 요청 한도에 도달했습니다. 잠시 후 다시 시도하거나 Google AI Studio에서 Gemini API 할당량/결제 설정을 확인해 주세요.",
          detail: text
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Gemini 이미지 추출 요청에 실패했습니다.", detail: text }, { status: geminiResponse.status });
  }

  const result = await geminiResponse.json();
  const text = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
  const parsed = parseGeminiJson(text);
  const rows: ExtractedRow[] = Array.isArray(parsed.records) ? parsed.records : [];
  const records: NormalizedExtractedRow[] = rows.map((row, index) => normalizeExtractedRow(row, index, gradeScale));
  const warnings = [
    ...(Array.isArray(parsed.warnings) ? parsed.warnings.filter((warning: unknown) => typeof warning === "string") : []),
    ...records.flatMap((record) => record.warning ? [`${record.subject || "과목명 없음"}: ${record.warning}`] : [])
  ];

  return NextResponse.json({ records, warnings });
}

function parseGeminiJson(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    return { records: [], warnings: ["Gemini 응답을 JSON으로 해석하지 못했습니다."] };
  }
}

function normalizeExtractedRow(row: ExtractedRow, index: number, gradeScale: GradeScale): NormalizedExtractedRow {
  const rankGrade = toNumber(row.rankGrade);
  const normalized: GradeRecord & { confidence: string; warning: string } = {
    id: `gemini-${Date.now()}-${index}`,
    course: COURSE_ORDER.includes(String(row.course)) ? String(row.course) : "기타",
    subject: String(row.subject ?? "").trim(),
    year: ["1", "2", "3"].includes(String(row.year)) ? String(row.year) : "",
    semester: ["1", "2"].includes(String(row.semester)) ? String(row.semester) : "",
    credits: toNumber(row.credits),
    rawScore: toNumber(row.rawScore),
    subjectAverage: toNumber(row.subjectAverage),
    standardDeviation: toNumber(row.standardDeviation),
    rankGrade: rankGrade !== "" && rankGrade >= 1 && rankGrade <= gradeScale ? rankGrade : "",
    achievement: String(row.achievement ?? "").trim(),
    students: toNumber(row.students),
    confidence: row.confidence || "medium",
    warning: row.warning || ""
  };

  const warnings = [];
  if (!normalized.subject) warnings.push("과목명이 비어 있습니다.");
  if (!normalized.year || !normalized.semester) warnings.push("학년/학기 확인이 필요합니다.");
  if (normalized.credits === "" || Number(normalized.credits) <= 0) warnings.push("단위수 확인이 필요합니다.");
  if (normalized.rankGrade === "") warnings.push("석차등급 확인이 필요합니다.");
  normalized.warning = [normalized.warning, ...warnings].filter(Boolean).join(" ");
  return normalized;
}

function toNumber(value: unknown): number | "" {
  if (value === "" || value === null || value === undefined) return "";
  const normalized = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(normalized) ? normalized : "";
}
