import type {
  CoreCourse,
  CourseGroupKey,
  CourseGroupStat,
  GradeRecord,
  SubjectGradeBucket,
  TrendStatus,
  WeightedStat
} from "@/types/grade";

export const COURSE_ORDER: CoreCourse[] = ["국어", "수학", "영어", "사회", "과학", "기타"];
export const SEMESTER_ORDER = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"];

const GROUPS: Record<CourseGroupKey, CoreCourse[]> = {
  국수영: ["국어", "수학", "영어"],
  국수영사: ["국어", "수학", "영어", "사회"],
  국수영과: ["국어", "수학", "영어", "과학"],
  국수영사과: ["국어", "수학", "영어", "사회", "과학"],
  전교과: ["국어", "수학", "영어", "사회", "과학", "기타"]
};

export function normalizeCourse(course: string): CoreCourse {
  return COURSE_ORDER.includes(course as CoreCourse) ? (course as CoreCourse) : "기타";
}

export function validRecords(records: GradeRecord[], maxGrade = 9) {
  return records
    .map((record) => ({ ...record, course: normalizeCourse(record.course) }))
    .filter((record) => Number(record.credits) > 0 && Number(record.rankGrade) >= 1 && Number(record.rankGrade) <= maxGrade);
}

export function weightedAverage(records: GradeRecord[], maxGrade = 9): number | null {
  const filtered = validRecords(records, maxGrade);
  const credits = filtered.reduce((sum, record) => sum + Number(record.credits), 0);
  if (!credits) return null;
  return filtered.reduce((sum, record) => sum + Number(record.rankGrade) * Number(record.credits), 0) / credits;
}

export function totalCredits(records: GradeRecord[], maxGrade = 9) {
  return validRecords(records, maxGrade).reduce((sum, record) => sum + Number(record.credits), 0);
}

export function groupWeighted(records: GradeRecord[], keyFactory: (record: GradeRecord) => string, maxGrade = 9): WeightedStat[] {
  const groups = new Map<string, { credits: number; points: number; records: GradeRecord[] }>();

  validRecords(records, maxGrade).forEach((record) => {
    const key = keyFactory(record);
    const current = groups.get(key) ?? { credits: 0, points: 0, records: [] };
    current.credits += Number(record.credits);
    current.points += Number(record.rankGrade) * Number(record.credits);
    current.records.push(record);
    groups.set(key, current);
  });

  return [...groups.entries()].map(([key, value]) => ({
    key,
    average: value.credits ? value.points / value.credits : null,
    credits: value.credits,
    count: value.records.length,
    records: value.records
  }));
}

export function courseStats(records: GradeRecord[], maxGrade = 9): WeightedStat[] {
  const stats = groupWeighted(records, (record) => normalizeCourse(record.course), maxGrade);
  const map = new Map(stats.map((stat) => [stat.key, stat]));
  return COURSE_ORDER.map((course) => map.get(course) ?? { key: course, average: null, credits: 0, count: 0, records: [] });
}

export function classifyCourse(average: number | null) {
  if (average === null) return "데이터 없음";
  if (average <= 2.2) return "강점";
  if (average <= 3.5) return "보통";
  return "보완 필요";
}

export function subjectStats(records: GradeRecord[], maxGrade = 9): WeightedStat[] {
  return groupWeighted(records, (record) => record.subject || "미입력", maxGrade).sort((a, b) => {
    const courseOrder = COURSE_ORDER.indexOf(normalizeCourse(a.records[0]?.course ?? "")) - COURSE_ORDER.indexOf(normalizeCourse(b.records[0]?.course ?? ""));
    return courseOrder || a.key.localeCompare(b.key, "ko");
  });
}

export function subjectBuckets(records: GradeRecord[], maxGrade = 9): SubjectGradeBucket {
  return validRecords(records, maxGrade).reduce(
    (bucket, record) => {
      const grade = Number(record.rankGrade);
      if (grade === 1) bucket.first += 1;
      else if (grade === 2) bucket.second += 1;
      else if (grade === 3) bucket.third += 1;
      else bucket.fourthOrLower += 1;
      return bucket;
    },
    { first: 0, second: 0, third: 0, fourthOrLower: 0 }
  );
}

export function courseGroupStats(records: GradeRecord[], maxGrade = 9): CourseGroupStat[] {
  const allAverage = weightedAverage(records, maxGrade);

  return (Object.keys(GROUPS) as CourseGroupKey[]).map((key) => {
    const courses = GROUPS[key];
    const included = validRecords(records, maxGrade).filter((record) => courses.includes(normalizeCourse(record.course)));
    const average = weightedAverage(included, maxGrade);
    return {
      key,
      courses,
      average,
      credits: totalCredits(included, maxGrade),
      advantage: average !== null && allAverage !== null ? average - allAverage : null
    };
  });
}

export function semesterStats(records: GradeRecord[], maxGrade = 9): WeightedStat[] {
  const stats = groupWeighted(records, (record) => `${record.year}-${record.semester}`, maxGrade);
  const map = new Map(stats.map((stat) => [stat.key, stat]));
  return SEMESTER_ORDER.map((semester) => map.get(semester) ?? { key: semester, average: null, credits: 0, count: 0, records: [] });
}

export function trendSummary(records: GradeRecord[], maxGrade = 9): { diff: number | null; status: TrendStatus } {
  const values = semesterStats(records, maxGrade).map((stat) => stat.average).filter((value): value is number => Number.isFinite(value));
  if (values.length < 2) return { diff: null, status: "데이터 부족" };
  const diff = values[values.length - 1] - values[0];
  if (diff <= -0.15) return { diff, status: "상승형" };
  if (diff >= 0.15) return { diff, status: "하락형" };
  return { diff, status: "유지형" };
}

export function bestByAverage<T extends { average: number | null }>(items: T[]) {
  return [...items].filter((item) => item.average !== null).sort((a, b) => Number(a.average) - Number(b.average))[0];
}

export function worstByAverage<T extends { average: number | null }>(items: T[]) {
  return [...items].filter((item) => item.average !== null).sort((a, b) => Number(b.average) - Number(a.average))[0];
}

export function formatGrade(value: number | null | undefined) {
  return Number.isFinite(value) ? `${Number(value).toFixed(2)}등급` : "-";
}

export function gradeScore(average: number | null | undefined, maxGrade = 9) {
  return average === null || average === undefined ? null : maxGrade + 1 - average;
}

export function formatScore(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value).toFixed(1) : "";
}

export function generateDiagnosis(records: GradeRecord[], track: string, maxGrade = 9) {
  const valid = validRecords(records, maxGrade);
  if (!valid.length) {
    return "성적 데이터를 입력하면 교과별 강점, 교과군 유불리, 학기별 성장 흐름을 바탕으로 종합진단 문구가 자동 생성됩니다.";
  }

  const courses = courseStats(records, maxGrade);
  const groups = courseGroupStats(records, maxGrade);
  const semesters = semesterStats(records, maxGrade);
  const overall = weightedAverage(records, maxGrade);
  const total = totalCredits(records, maxGrade);
  const bestCourse = bestByAverage(courses);
  const weakCourse = worstByAverage(courses);
  const bestGroup = bestByAverage(groups);
  const allGroup = groups.find((group) => group.key === "전교과");
  const humanities = groups.find((group) => group.key === "국수영사");
  const science = groups.find((group) => group.key === "국수영과");
  const trend = trendSummary(records, maxGrade);
  const recent = [...semesters].reverse().find((semester) => semester.average !== null);
  const first = semesters.find((semester) => semester.average !== null);
  const aptitude =
    humanities?.average !== null && science?.average !== null && humanities && science
      ? humanities.average <= science.average
        ? "인문·사회계열"
        : "자연·공학계열"
      : track || "희망 계열";
  const groupAdvantage =
    bestGroup && allGroup && bestGroup.key !== "전교과" && bestGroup.average !== null && allGroup.average !== null
      ? bestGroup.average - allGroup.average
      : null;
  const weakRecords = weakCourse?.records ?? [];
  const weakSubjects = [...new Set(weakRecords.map((record) => record.subject).filter(Boolean))].slice(0, 3).join(", ");
  const bestSubjects = [...new Set((bestCourse?.records ?? []).map((record) => record.subject).filter(Boolean))].slice(0, 3).join(", ");
  const trendComment =
    trend.status === "상승형"
      ? "최근 학기로 갈수록 평균등급이 개선되고 있어 학습 루틴과 평가 대비 방식이 긍정적으로 작동하고 있습니다."
      : trend.status === "하락형"
        ? "최근 학기로 갈수록 평균등급이 낮아지는 흐름이 보여 시험 범위가 넓어지는 과목의 누적 복습 계획이 필요합니다."
        : trend.status === "유지형"
          ? "학기별 평균등급은 큰 흔들림 없이 유지되고 있어 특정 보완 교과를 집중 관리하면 전체 평균 개선 여지가 있습니다."
          : "학기별 변화 판단을 위해서는 최소 두 학기 이상의 유효 성적 입력이 필요합니다.";

  return [
    `전교과 평균은 ${formatGrade(overall)}이며 총 ${total}단위를 기준으로 분석했습니다. 최근 학기(${recent?.key ?? "-"}) 평균은 ${formatGrade(recent?.average)}이고, 첫 유효 학기(${first?.key ?? "-"}) 대비 변화량은 ${trend.diff === null ? "-" : `${trend.diff > 0 ? "+" : ""}${trend.diff.toFixed(2)}등급`}으로 ${trend.status}입니다.`,
    `${bestCourse?.key ?? "-"} 교과가 가장 우수하며 평균은 ${formatGrade(bestCourse?.average)}입니다. ${bestSubjects ? `${bestSubjects} 과목에서 강점이 확인됩니다.` : "강점 과목 데이터가 더 입력되면 세부 과목까지 진단할 수 있습니다."}`,
    `${weakCourse?.key ?? "-"} 교과는 보완 우선순위가 높고 평균은 ${formatGrade(weakCourse?.average)}입니다. ${weakSubjects ? `${weakSubjects} 과목의 단원별 오답, 수행평가, 서술형 대비를 분리해서 관리하는 것이 좋습니다.` : "보완 과목 데이터가 더 입력되면 세부 관리 포인트가 구체화됩니다."}`,
    `${bestGroup?.key ?? "-"} 교과군이 가장 유리합니다. ${groupAdvantage === null ? "전교과 대비 유불리는 추가 데이터 입력 후 더 명확해집니다." : `전교과 평균 대비 ${Math.abs(groupAdvantage).toFixed(2)}등급 ${groupAdvantage <= 0 ? "유리" : "불리"}합니다.`} 현재 입력 기준으로는 ${aptitude} 지원 적합도가 상대적으로 높게 나타납니다.`,
    `${trendComment} 상담 전략으로는 강점 교과는 지원 학과와 연결되는 세부능력특기사항 소재를 강화하고, 보완 교과는 단위수가 큰 과목부터 등급 하락을 막는 방식이 효율적입니다.`
  ].join(" ");
}
