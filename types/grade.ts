export type CoreCourse = "국어" | "수학" | "영어" | "사회" | "과학" | "기타";
export type GradeScale = 5 | 9;
export type ReportMode = "grades" | "mock" | "record" | "summary";

export type StudentInfo = {
  name: string;
  gender: string;
  region: string;
  schoolOwnership: string;
  schoolType: string;
  schoolGender: string;
  school: string;
  grade: string;
  track: string;
  schoolWebsite: string;
  targetUniversity: string;
  targetMajor: string;
  analysisDate: string;
  consultant: string;
};

export type GradeRecord = {
  id: string;
  course: string;
  subject: string;
  year: string;
  semester: string;
  credits: number | "";
  rawScore: number | "";
  subjectAverage: number | "";
  standardDeviation: number | "";
  rankGrade: number | "";
  achievement: string;
  students: number | "";
};

export type MockExamSubject =
  | "국어"
  | "수학"
  | "영어"
  | "한국사"
  | "탐구1"
  | "탐구2"
  | "제2외국어/한문";

export type MockExamRecord = {
  id: string;
  examName: string;
  examType: "모의고사" | "수능";
  year: string;
  month: string;
  subject: MockExamSubject;
  selectedCourse: string;
  rawScore: number | "";
  standardScore: number | "";
  percentile: number | "";
  grade: number | "";
};

export type StudentProfile = {
  id: string;
  student: StudentInfo;
  records: GradeRecord[];
  mockRecords: MockExamRecord[];
  recordReport: StudentRecordReport;
  gradeScale: GradeScale;
  diagnosisText?: string;
  mockDiagnosisText?: string;
};

export type StudentRecordReport = {
  careerCompetency: string;
  academicCompetency: string;
  communityCompetency: string;
  keyActivities: string;
  summaryOpinion: string;
  scores: StudentRecordScores;
  admissionPredictions?: AdmissionPredictionRow[];
  admissionPredictionStandard?: string;
  recommendation1?: string;
  recommendation2?: string;
  recommendation3?: string;
  recommendedType1?: string;
  recommendedType2?: string;
  recommendedTypeOpinion?: string;
  recommendedMajor1?: string;
  recommendedMajor2?: string;
  recommendedMajorOpinion?: string;
  comprehensiveOpinion?: string;
};

export type StudentRecordScores = {
  school: number | "";
  attendance: number | "";
  career: number | "";
  academic: number | "";
  community: number | "";
  comprehensive: number | "";
};

export type AdmissionPredictionRow = {
  id: string;
  chance: string;
  university: string;
  major: string;
  admissionType: string;
  score2026: string;
  score2027: string;
};

export type WeightedStat = {
  key: string;
  average: number | null;
  credits: number;
  count: number;
  records: GradeRecord[];
};

export type SubjectGradeBucket = {
  first: number;
  second: number;
  third: number;
  fourthOrLower: number;
};

export type CourseGroupKey = "국수영" | "국수영사" | "국수영과" | "국수영사과" | "전교과";

export type CourseGroupStat = {
  key: CourseGroupKey;
  courses: CoreCourse[];
  average: number | null;
  credits: number;
  advantage: number | null;
};

export type TrendStatus = "상승형" | "유지형" | "하락형" | "데이터 부족";
