import type { GradeRecord, MockExamRecord, StudentInfo } from "@/types/grade";

export const sampleStudent: StudentInfo = {
  name: "김하늘",
  gender: "여성",
  region: "서울",
  schoolOwnership: "사립",
  schoolType: "일반고",
  schoolGender: "남녀공학",
  school: "한빛고등학교",
  grade: "2학년",
  track: "인문",
  schoolWebsite: "https://www.school.go.kr",
  targetUniversity: "서울 주요 대학",
  targetMajor: "사회학과",
  analysisDate: new Date().toISOString().slice(0, 10),
  consultant: ""
};

export const sampleGrades: GradeRecord[] = [
  { id: "s1", course: "국어", subject: "국어", year: "1", semester: "1", credits: 4, rawScore: 91, subjectAverage: 74.2, standardDeviation: 14.1, rankGrade: 2, achievement: "A", students: 228 },
  { id: "s2", course: "수학", subject: "수학", year: "1", semester: "1", credits: 4, rawScore: 84, subjectAverage: 68.9, standardDeviation: 17.8, rankGrade: 3, achievement: "B", students: 228 },
  { id: "s3", course: "영어", subject: "영어", year: "1", semester: "1", credits: 4, rawScore: 89, subjectAverage: 72.8, standardDeviation: 15.2, rankGrade: 2, achievement: "A", students: 228 },
  { id: "s4", course: "사회", subject: "통합사회", year: "1", semester: "1", credits: 3, rawScore: 95, subjectAverage: 76.1, standardDeviation: 13.5, rankGrade: 1, achievement: "A", students: 228 },
  { id: "s5", course: "과학", subject: "통합과학", year: "1", semester: "1", credits: 3, rawScore: 82, subjectAverage: 70.3, standardDeviation: 16.4, rankGrade: 3, achievement: "B", students: 228 },
  { id: "s6", course: "국어", subject: "국어", year: "1", semester: "2", credits: 4, rawScore: 93, subjectAverage: 75.4, standardDeviation: 13.9, rankGrade: 2, achievement: "A", students: 225 },
  { id: "s7", course: "수학", subject: "수학", year: "1", semester: "2", credits: 4, rawScore: 87, subjectAverage: 69.7, standardDeviation: 17.1, rankGrade: 2, achievement: "A", students: 225 },
  { id: "s8", course: "영어", subject: "영어", year: "1", semester: "2", credits: 4, rawScore: 92, subjectAverage: 73.6, standardDeviation: 14.8, rankGrade: 2, achievement: "A", students: 225 },
  { id: "s9", course: "사회", subject: "한국사", year: "1", semester: "2", credits: 3, rawScore: 96, subjectAverage: 77.0, standardDeviation: 12.9, rankGrade: 1, achievement: "A", students: 225 },
  { id: "s10", course: "과학", subject: "통합과학", year: "1", semester: "2", credits: 3, rawScore: 86, subjectAverage: 71.0, standardDeviation: 15.9, rankGrade: 2, achievement: "A", students: 225 },
  { id: "s11", course: "국어", subject: "문학", year: "2", semester: "1", credits: 4, rawScore: 92, subjectAverage: 73.8, standardDeviation: 14.4, rankGrade: 2, achievement: "A", students: 211 },
  { id: "s12", course: "수학", subject: "수학 I", year: "2", semester: "1", credits: 4, rawScore: 83, subjectAverage: 67.5, standardDeviation: 18.3, rankGrade: 3, achievement: "B", students: 211 },
  { id: "s13", course: "영어", subject: "영어 I", year: "2", semester: "1", credits: 4, rawScore: 94, subjectAverage: 74.2, standardDeviation: 14.2, rankGrade: 1, achievement: "A", students: 211 },
  { id: "s14", course: "사회", subject: "사회문화", year: "2", semester: "1", credits: 3, rawScore: 97, subjectAverage: 75.8, standardDeviation: 13.1, rankGrade: 1, achievement: "A", students: 160 },
  { id: "s15", course: "기타", subject: "한문 I", year: "2", semester: "1", credits: 2, rawScore: 90, subjectAverage: 78.4, standardDeviation: 12.0, rankGrade: 2, achievement: "A", students: 188 },
  { id: "s16", course: "국어", subject: "독서", year: "2", semester: "2", credits: 4, rawScore: 95, subjectAverage: 74.6, standardDeviation: 13.7, rankGrade: 1, achievement: "A", students: 209 },
  { id: "s17", course: "수학", subject: "수학 II", year: "2", semester: "2", credits: 4, rawScore: 86, subjectAverage: 68.1, standardDeviation: 18.0, rankGrade: 2, achievement: "A", students: 209 },
  { id: "s18", course: "영어", subject: "영어 II", year: "2", semester: "2", credits: 4, rawScore: 95, subjectAverage: 75.0, standardDeviation: 14.0, rankGrade: 1, achievement: "A", students: 209 },
  { id: "s19", course: "사회", subject: "생활과 윤리", year: "2", semester: "2", credits: 3, rawScore: 98, subjectAverage: 76.4, standardDeviation: 12.8, rankGrade: 1, achievement: "A", students: 155 },
  { id: "s20", course: "과학", subject: "생명과학 I", year: "2", semester: "2", credits: 3, rawScore: 84, subjectAverage: 70.6, standardDeviation: 16.8, rankGrade: 3, achievement: "B", students: 144 }
];

export const sampleMockExams: MockExamRecord[] = [
  { id: "m1", examName: "2025년 3월 전국연합", examType: "모의고사", year: "2025", month: "3", subject: "국어", selectedCourse: "언어와 매체", rawScore: 86, standardScore: 128, percentile: 92, grade: 2 },
  { id: "m2", examName: "2025년 3월 전국연합", examType: "모의고사", year: "2025", month: "3", subject: "수학", selectedCourse: "확률과 통계", rawScore: 78, standardScore: 121, percentile: 84, grade: 3 },
  { id: "m3", examName: "2025년 3월 전국연합", examType: "모의고사", year: "2025", month: "3", subject: "영어", selectedCourse: "영어", rawScore: 91, standardScore: "", percentile: "", grade: 2 },
  { id: "m4", examName: "2025년 3월 전국연합", examType: "모의고사", year: "2025", month: "3", subject: "한국사", selectedCourse: "한국사", rawScore: 44, standardScore: "", percentile: "", grade: 1 },
  { id: "m5", examName: "2025년 3월 전국연합", examType: "모의고사", year: "2025", month: "3", subject: "탐구1", selectedCourse: "사회문화", rawScore: 42, standardScore: 66, percentile: 94, grade: 2 },
  { id: "m6", examName: "2025년 3월 전국연합", examType: "모의고사", year: "2025", month: "3", subject: "탐구2", selectedCourse: "생활과 윤리", rawScore: 45, standardScore: 68, percentile: 96, grade: 1 },
  { id: "m7", examName: "2025년 6월 모의평가", examType: "모의고사", year: "2025", month: "6", subject: "국어", selectedCourse: "언어와 매체", rawScore: 90, standardScore: 132, percentile: 95, grade: 2 },
  { id: "m8", examName: "2025년 6월 모의평가", examType: "모의고사", year: "2025", month: "6", subject: "수학", selectedCourse: "확률과 통계", rawScore: 82, standardScore: 126, percentile: 89, grade: 2 },
  { id: "m9", examName: "2025년 6월 모의평가", examType: "모의고사", year: "2025", month: "6", subject: "영어", selectedCourse: "영어", rawScore: 94, standardScore: "", percentile: "", grade: 1 },
  { id: "m10", examName: "2025년 6월 모의평가", examType: "모의고사", year: "2025", month: "6", subject: "탐구1", selectedCourse: "사회문화", rawScore: 44, standardScore: 67, percentile: 95, grade: 2 },
  { id: "m11", examName: "2025년 6월 모의평가", examType: "모의고사", year: "2025", month: "6", subject: "탐구2", selectedCourse: "생활과 윤리", rawScore: 47, standardScore: 70, percentile: 98, grade: 1 }
];
