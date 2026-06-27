import { NextResponse } from "next/server";
import type { GradeRecord, GradeScale, StudentInfo, StudentRecordReport } from "@/types/grade";

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

type ExtractedStudentRecordReport = Partial<Pick<StudentRecordReport, "careerCompetency" | "academicCompetency" | "communityCompetency" | "keyActivities" | "summaryOpinion">>;
type ExtractedStudentInfo = Partial<Pick<StudentInfo, "name" | "gender" | "region" | "schoolOwnership" | "schoolType" | "schoolGender" | "school" | "grade" | "track" | "schoolWebsite" | "targetUniversity" | "targetMajor" | "analysisDate" | "consultant">>;

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
    "학교생활기록부의 '교과학습발달상황' 또는 '진로 선택 과목' 성적표 안에 있는 교과 성적 데이터만 읽어서 JSON으로만 반환하세요.",
    "반환 형식은 { \"studentInfo\": {}, \"records\": [], \"studentRecordReport\": {}, \"warnings\": [] } 입니다.",
    "records 배열의 순서는 반드시 학교생활기록부 표에 보이는 순서와 동일해야 합니다.",
    "PDF 또는 이미지가 여러 장이면 파일/페이지 순서대로, 각 페이지 안에서는 위에서 아래로, 같은 줄에서는 왼쪽에서 오른쪽으로 읽은 순서를 유지하세요.",
    "학년, 학기, 교과, 과목 기준으로 다시 정렬하거나 묶지 마세요. 원본 표의 표시 순서를 절대 바꾸지 마세요.",
    "성적표가 아닌 창의적 체험활동상황, 자율활동, 동아리활동, 진로활동, 봉사활동, 출결상황, 수상경력, 행동특성 및 종합의견, 세부능력 및 특기사항 서술 문단은 records에 절대 넣지 마세요.",
    "성적표 행으로 인정하려면 같은 행 또는 병합 셀 주변에 학기, 교과, 과목, 학점수, 원점수/과목평균, 성취도(수강자수), 석차등급 중 여러 열이 표 형태로 보여야 합니다.",
    "페이지에 성적표가 없고 비교과/서술 내용만 있으면 records는 빈 배열로 반환하고 studentRecordReport만 요약하세요.",
    "이미지에서 학생 기본정보가 보이면 studentInfo에 추출하세요.",
    "studentInfo는 name, gender, region, schoolOwnership, schoolType, schoolGender, school, grade, track, schoolWebsite, targetUniversity, targetMajor, analysisDate, consultant 필드를 가집니다.",
    "보이지 않거나 판단하기 어려운 studentInfo 항목은 빈 문자열이 아니라 \"기타\"로 반환하세요. 단, analysisDate는 날짜가 없으면 빈 문자열로 두세요.",
    "gender는 남성, 여성, 기타 중 하나로 정규화하세요.",
    "schoolOwnership은 사립, 공립, 국립, 기타 중 하나로 정규화하세요.",
    "schoolType은 일반고, 자사고, 특목고, 특성화고, 기타 중 하나로 정규화하세요.",
    "schoolGender는 남녀공학, 남고, 여고, 기타 중 하나로 정규화하세요.",
    "records의 각 행은 course, subject, year, semester, credits, rawScore, subjectAverage, standardDeviation, rankGrade, achievement, students 필드를 가집니다.",
    "이미지 상단에 [1학년], [2학년], [3학년] 같은 제목이 있으면 그 아래 표의 모든 행에 해당 year를 적용하세요.",
    "학기 열의 숫자가 여러 행을 세로로 병합해서 표시된 경우, 다음 학기 숫자가 나오기 전까지 그 값을 모든 행에 반복 적용하세요. 예: 왼쪽에 1이 세로 병합되어 있으면 그 구간의 모든 과목 semester는 \"1\"입니다.",
    "학점수 열은 credits입니다. 표에 '학점수'로 표시되어 있어도 기존 성적 데이터의 단위수와 동일하게 credits에 넣으세요.",
    "원점수/과목평균(표준편차) 값은 반드시 분리하세요. 예: 86/75.9(14.3)은 rawScore=86, subjectAverage=75.9, standardDeviation=14.3입니다.",
    "성취도(수강자수) 값은 반드시 분리하세요. 예: B(367)은 achievement=\"B\", students=367입니다.",
    "석차등급 열의 숫자는 rankGrade입니다. 예: 석차등급 4는 rankGrade=4입니다.",
    "석차등급이 P이거나 비어 있는 과목은 rankGrade를 빈 문자열로 두고, achievement에는 P 또는 보이는 성취도를 넣으세요.",
    "석차등급이 없거나 P인 과목은 평균등급 계산 대상이 아니므로 rankGrade를 반드시 빈 문자열로 유지하세요.",
    "course는 반드시 국어, 수학, 영어, 사회, 과학, 기타 중 하나로 정규화하세요. 그 외 교과는 기타입니다.",
    "한국사는 교과가 한국사로 보이더라도 course는 사회로 정규화하세요.",
    "사회(역사/도덕 포함)는 course를 사회로 정규화하세요.",
    "기술·가정/제2외국어/한문/교양, 체육, 예술은 course를 기타로 정규화하세요.",
    "year는 1, 2, 3 중 하나의 문자열, semester는 1 또는 2 중 하나의 문자열로 반환하세요.",
    "credits, rawScore, subjectAverage, standardDeviation, rankGrade, students는 숫자로 읽히면 숫자 문자열로 반환하고, 없거나 불명확하면 빈 문자열로 반환하세요.",
    `rankGrade는 현재 ${gradeScale}등급 체제 기준입니다. 범위를 벗어나거나 불명확하면 빈 문자열로 반환하세요.`,
    "achievement는 A, B, C, D, E, P 등 이미지에 보이는 값을 문자열로 반환하세요.",
    "표의 한 행에는 반드시 course와 subject를 같이 넣으세요. 과목명이 교과명과 같아도 subject에 같은 값을 넣으세요.",
    "비고 칸, 이수학점 합계 행, QR/증명 문구, 주소/학적사항, 창의적 체험활동의 시간 수는 records에 넣지 마세요.",
    "이미지에 교과 성적 외 학교생활기록부의 세부능력 및 특기사항, 자율활동, 진로활동, 동아리활동, 봉사활동, 행동특성 및 종합의견 등 비교과/학생부 서술 내용이 있으면 studentRecordReport에 요약하세요.",
    "studentRecordReport는 careerCompetency, academicCompetency, communityCompetency, keyActivities, summaryOpinion 필드를 가집니다.",
    "careerCompetency에는 희망전공, 진로활동, 전공 관련 탐구, 독서, 선택과목 연계성을 요약하세요.",
    "academicCompetency에는 교과 세특, 탐구 과정, 보고서/발표, 학업 태도, 성취와 성장 흐름을 요약하세요.",
    "communityCompetency에는 협업, 배려, 리더십, 책임감, 봉사, 학급/동아리 역할을 요약하세요.",
    "keyActivities에는 입시에 의미 있는 주요 활동과 특기사항 근거를 간결하게 정리하세요.",
    "summaryOpinion에는 진로역량, 학업역량, 공동체역량을 종합한 상담용 의견을 4~6문장으로 작성하세요.",
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
              },
              studentInfo: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  gender: { type: "STRING" },
                  region: { type: "STRING" },
                  schoolOwnership: { type: "STRING" },
                  schoolType: { type: "STRING" },
                  schoolGender: { type: "STRING" },
                  school: { type: "STRING" },
                  grade: { type: "STRING" },
                  track: { type: "STRING" },
                  schoolWebsite: { type: "STRING" },
                  targetUniversity: { type: "STRING" },
                  targetMajor: { type: "STRING" },
                  analysisDate: { type: "STRING" },
                  consultant: { type: "STRING" }
                }
              },
              studentRecordReport: {
                type: "OBJECT",
                properties: {
                  careerCompetency: { type: "STRING" },
                  academicCompetency: { type: "STRING" },
                  communityCompetency: { type: "STRING" },
                  keyActivities: { type: "STRING" },
                  summaryOpinion: { type: "STRING" }
                }
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
  const records: NormalizedExtractedRow[] = rows
    .map((row, index) => normalizeExtractedRow(row, index, gradeScale))
    .filter(isLikelyGradeRecord);
  const studentInfo = normalizeStudentInfo(parsed.studentInfo);
  const studentRecordReport = normalizeStudentRecordReport(parsed.studentRecordReport);
  const warnings = [
    ...(Array.isArray(parsed.warnings) ? parsed.warnings.filter((warning: unknown) => typeof warning === "string") : []),
    ...records.flatMap((record) => record.warning ? [`${record.subject || "과목명 없음"}: ${record.warning}`] : [])
  ];

  return NextResponse.json({ studentInfo, records, studentRecordReport, warnings });
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
  const splitScore = splitMergedScore(row.rawScore, row.subjectAverage);
  const splitAchievement = splitAchievementStudents(row.achievement, row.students);
  const normalized: GradeRecord & { confidence: string; warning: string } = {
    id: `gemini-${Date.now()}-${index}`,
    course: COURSE_ORDER.includes(String(row.course)) ? String(row.course) : "기타",
    subject: String(row.subject ?? "").trim(),
    year: ["1", "2", "3"].includes(String(row.year)) ? String(row.year) : "",
    semester: ["1", "2"].includes(String(row.semester)) ? String(row.semester) : "",
    credits: toNumber(row.credits),
    rawScore: splitScore.rawScore,
    subjectAverage: splitScore.subjectAverage,
    standardDeviation: normalizeOptionalScore(row.standardDeviation),
    rankGrade: rankGrade !== "" && rankGrade >= 1 && rankGrade <= gradeScale ? rankGrade : "",
    achievement: splitAchievement.achievement,
    students: splitAchievement.students,
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

function isLikelyGradeRecord(record: NormalizedExtractedRow) {
  const subject = record.subject.replace(/\s+/g, "");
  const blockedSubjects = [
    "자율활동",
    "동아리활동",
    "진로활동",
    "봉사활동",
    "창의적체험활동",
    "출결상황",
    "수상경력",
    "행동특성및종합의견",
    "세부능력및특기사항"
  ];
  if (!subject || blockedSubjects.some((blocked) => subject.includes(blocked))) return false;
  if (!record.year || !record.semester) return false;

  const hasCredits = Number(record.credits) > 0;
  const hasScore = Number(record.rawScore) > 0 || Number(record.subjectAverage) > 0 || Number(record.rankGrade) > 0;
  const hasAchievement = Boolean(record.achievement && /^[A-E]$|^P$/i.test(record.achievement));
  return hasCredits && (hasScore || hasAchievement);
}

function normalizeStudentRecordReport(report: unknown): ExtractedStudentRecordReport {
  if (!report || typeof report !== "object") return {};
  const source = report as Record<string, unknown>;
  return {
    careerCompetency: cleanText(source.careerCompetency),
    academicCompetency: cleanText(source.academicCompetency),
    communityCompetency: cleanText(source.communityCompetency),
    keyActivities: cleanText(source.keyActivities),
    summaryOpinion: cleanText(source.summaryOpinion)
  };
}

function normalizeStudentInfo(info: unknown): ExtractedStudentInfo {
  if (!info || typeof info !== "object") return {};
  const source = info as Record<string, unknown>;
  return {
    name: cleanInfoText(source.name),
    gender: optionOrOther(source.gender, ["남성", "여성", "기타"]),
    region: cleanInfoText(source.region) || "기타",
    schoolOwnership: optionOrOther(source.schoolOwnership, ["사립", "공립", "국립", "기타"]),
    schoolType: optionOrOther(source.schoolType, ["일반고", "자사고", "특목고", "특성화고", "기타"]),
    schoolGender: optionOrOther(source.schoolGender, ["남녀공학", "남고", "여고", "기타"]),
    school: cleanInfoText(source.school) || "기타",
    grade: cleanInfoText(source.grade) || "기타",
    track: cleanInfoText(source.track) || "기타",
    schoolWebsite: cleanInfoText(source.schoolWebsite) || "기타",
    targetUniversity: cleanInfoText(source.targetUniversity) || "기타",
    targetMajor: cleanInfoText(source.targetMajor) || "기타",
    analysisDate: cleanInfoText(source.analysisDate),
    consultant: cleanInfoText(source.consultant) || "기타"
  };
}

function cleanInfoText(value: unknown) {
  const text = cleanText(value);
  return text && text !== "-" ? text : "";
}

function optionOrOther(value: unknown, options: string[]) {
  const text = cleanInfoText(value);
  return options.includes(text) ? text : "기타";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitMergedScore(rawValue: unknown, averageValue: unknown) {
  const rawText = String(rawValue ?? "").trim();
  const averageText = String(averageValue ?? "").trim();
  const slashMatch = rawText.match(/(\d{1,3}(?:\.\d+)?)\s*\/\s*(\d{1,3}(?:\.\d+)?)/);
  if (slashMatch) {
    return {
      rawScore: toNumber(slashMatch[1]),
      subjectAverage: toNumber(slashMatch[2])
    };
  }

  const rawNumber = toNumber(rawValue);
  const averageNumber = toNumber(averageValue);
  if (typeof rawNumber === "number" && rawNumber > 100 && (averageNumber === "" || averageNumber === 0)) {
    const inferred = inferMergedScore(rawNumber);
    if (inferred) return inferred;
  }

  return {
    rawScore: rawNumber,
    subjectAverage: averageNumber
  };
}

function inferMergedScore(value: number): { rawScore: number | ""; subjectAverage: number | "" } | null {
  const text = String(value);
  const candidates = text.startsWith("100")
    ? [{ raw: "100", average: text.slice(3) }]
    : [
        { raw: text.slice(0, 2), average: text.slice(2) },
        { raw: text.slice(0, 3), average: text.slice(3) }
      ];

  for (const candidate of candidates) {
    const rawScore = Number(candidate.raw);
    const subjectAverage = Number(candidate.average);
    if (rawScore >= 0 && rawScore <= 100 && subjectAverage >= 0 && subjectAverage <= 100) {
      return { rawScore, subjectAverage };
    }
  }
  return null;
}

function splitAchievementStudents(achievementValue: unknown, studentsValue: unknown) {
  const achievementText = String(achievementValue ?? "").trim();
  const match = achievementText.match(/^([A-E]|P)\s*\((\d+)\)$/i);
  if (match) {
    return {
      achievement: match[1].toUpperCase(),
      students: toNumber(match[2])
    };
  }

  return {
    achievement: achievementText,
    students: toNumber(studentsValue)
  };
}

function normalizeOptionalScore(value: unknown) {
  const number = toNumber(value);
  return number === 0 && String(value ?? "").trim() === "" ? "" : number;
}

function toNumber(value: unknown): number | "" {
  if (value === "" || value === null || value === undefined) return "";
  const normalized = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(normalized) ? normalized : "";
}
