export type CoreCourse = "국어" | "수학" | "영어" | "사회" | "과학" | "기타";
export type GradeScale = 5 | 9;

export type StudentInfo = {
  name: string;
  gender: string;
  region: string;
  school: string;
  grade: string;
  track: string;
  targetMajor: string;
  analysisDate: string;
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

export type StudentProfile = {
  id: string;
  student: StudentInfo;
  records: GradeRecord[];
  gradeScale: GradeScale;
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
