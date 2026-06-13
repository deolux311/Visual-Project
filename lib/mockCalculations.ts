import type { MockExamRecord, MockExamSubject } from "@/types/grade";

export const MOCK_SUBJECT_ORDER: MockExamSubject[] = ["국어", "수학", "영어", "한국사", "탐구1", "탐구2", "제2외국어/한문"];
export const STRENGTH_SUBJECTS: MockExamSubject[] = MOCK_SUBJECT_ORDER.filter((subject) => subject !== "한국사");

export function validMockRecords(records: MockExamRecord[]) {
  return records.filter((record) => Number(record.grade) >= 1 && Number(record.grade) <= 9);
}

export function examKey(record: MockExamRecord) {
  return `${record.year}-${String(record.month).padStart(2, "0")} ${record.examType}`;
}

export function examSessions(records: MockExamRecord[]) {
  const sessions = new Map<string, MockExamRecord[]>();
  records.forEach((record) => {
    const key = examKey(record);
    sessions.set(key, [...(sessions.get(key) ?? []), record]);
  });
  return [...sessions.entries()]
    .map(([key, rows]) => ({ key, rows }))
    .sort((a, b) => a.key.localeCompare(b.key, "ko"));
}

export function latestExamRecord(records: MockExamRecord[]) {
  return [...validMockRecords(records)].sort((a, b) => examKey(a).localeCompare(examKey(b), "ko")).at(-1);
}

export function averageGrade(records: MockExamRecord[]) {
  const valid = validMockRecords(records);
  if (!valid.length) return null;
  return valid.reduce((sum, record) => sum + Number(record.grade), 0) / valid.length;
}

export function subjectStats(records: MockExamRecord[]) {
  return MOCK_SUBJECT_ORDER.map((subject) => {
    const rows = validMockRecords(records).filter((record) => record.subject === subject);
    return {
      subject,
      average: averageGrade(rows),
      best: rows.length ? Math.min(...rows.map((record) => Number(record.grade))) : null,
      latest: rows.sort((a, b) => examKey(a).localeCompare(examKey(b), "ko")).at(-1),
      count: rows.length
    };
  });
}

export function examTrend(records: MockExamRecord[]) {
  return examSessions(validMockRecords(records))
    .map((session) => ({
      key: session.key,
      average: averageGrade(session.rows),
      records: session.rows
    }))
    .sort((a, b) => a.key.localeCompare(b.key, "ko"));
}

export function bestSubject(records: MockExamRecord[]) {
  return subjectStats(records)
    .filter((stat) => stat.average !== null && STRENGTH_SUBJECTS.includes(stat.subject))
    .sort((a, b) => Number(a.average) - Number(b.average))[0];
}

export function weakSubject(records: MockExamRecord[]) {
  return subjectStats(records)
    .filter((stat) => stat.average !== null)
    .sort((a, b) => Number(b.average) - Number(a.average))[0];
}

export function mockTrendStatus(records: MockExamRecord[]) {
  const values = examTrend(records).map((item) => item.average).filter((value): value is number => Number.isFinite(value));
  if (values.length < 2) return { diff: null, status: "데이터 부족" };
  const diff = values[values.length - 1] - values[0];
  if (diff <= -0.15) return { diff, status: "상승형" };
  if (diff >= 0.15) return { diff, status: "하락형" };
  return { diff, status: "유지형" };
}

export function formatMockGrade(value: number | null | undefined) {
  return Number.isFinite(value) ? `${Number(value).toFixed(2)}등급` : "-";
}

export function formatNullable(value: number | "" | null | undefined, suffix = "") {
  return Number.isFinite(Number(value)) ? `${Number(value)}${suffix}` : "-";
}

export function generateMockDiagnosis(records: MockExamRecord[], targetUniversity: string, targetMajor: string) {
  const valid = validMockRecords(records);
  if (!valid.length) {
    return "모의고사 또는 수능 성적을 입력하면 영역별 강점, 보완 영역, 백분위 흐름, 지원 전략 코멘트가 자동 생성됩니다.";
  }

  const overall = averageGrade(records);
  const best = bestSubject(records);
  const weak = weakSubject(records);
  const latest = latestExamRecord(records);
  const trend = mockTrendStatus(records);
  const latestRows = valid.filter((record) => latest && examKey(record) === examKey(latest));
  const highPercentile = latestRows
    .filter((record) => record.subject !== "한국사" && Number(record.percentile) >= 90)
    .map((record) => record.subject);
  const lowPercentile = latestRows
    .filter((record) => Number(record.percentile) > 0 && Number(record.percentile) < 80)
    .map((record) => record.subject);
  const target = [targetUniversity, targetMajor].filter(Boolean).join(" ");

  return [
    `모의고사/수능 전체 평균은 ${formatMockGrade(overall)}이며 최근 시험은 ${latest ? `${latest.year}년 ${latest.month}월 ${latest.examType}` : "-"}입니다.`,
    `${best?.subject ?? "-"} 영역이 상대 강점으로 나타나고 평균은 ${formatMockGrade(best?.average)}입니다. 한국사는 강점영역 산정에서 제외했습니다. ${highPercentile.length ? `${highPercentile.join(", ")} 영역은 최근 시험에서 백분위 90 이상으로 경쟁력이 있습니다.` : "최근 시험에서 백분위 90 이상 영역이 입력되면 상위권 강점 판단이 더 선명해집니다."}`,
    `${weak?.subject ?? "-"} 영역은 보완 우선순위가 높고 평균은 ${formatMockGrade(weak?.average)}입니다. ${lowPercentile.length ? `${lowPercentile.join(", ")} 영역은 백분위 80 미만으로, 개념 누수와 시간 배분을 함께 점검해야 합니다.` : "백분위가 낮은 영역이 뚜렷하지 않아 등급 안정성을 중심으로 관리하면 좋습니다."}`,
    `시험 흐름은 ${trend.status}이며 첫 시험 대비 변화량은 ${trend.diff === null ? "-" : `${trend.diff > 0 ? "+" : ""}${trend.diff.toFixed(2)}등급`}입니다. ${trend.status === "상승형" ? "최근 학습 전략이 성과로 연결되고 있으므로 실전 시간 관리와 오답 반복을 유지하는 것이 좋습니다." : trend.status === "하락형" ? "최근 성적 하락 신호가 있어 시험별 오답 원인을 과목별로 분리하고 주간 복습량을 재조정해야 합니다." : "큰 변동 없이 유지되고 있으므로 취약 과목 한두 개를 집중 보완하면 총점 상승 여지가 있습니다."}`,
    `${target || "희망 대학/학과"} 지원 전략에서는 내신 강점 교과와 모의고사 강점 영역을 함께 묶어 전형 선택을 검토하는 것이 좋습니다. 정시 가능성을 보려면 국어·수학 표준점수와 탐구 백분위 조합을 지속적으로 누적해 비교해야 합니다.`
  ].join(" ");
}
