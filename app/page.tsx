"use client";

import { useEffect, useMemo, useState } from "react";
import CourseAnalysis from "@/components/CourseAnalysis";
import Dashboard from "@/components/Dashboard";
import Diagnosis from "@/components/Diagnosis";
import GradeInputTable from "@/components/GradeInputTable";
import GroupAnalysis from "@/components/GroupAnalysis";
import MockExamReport from "@/components/MockExamReport";
import SubjectAnalysis from "@/components/SubjectAnalysis";
import TrendAnalysis from "@/components/TrendAnalysis";
import { formatGrade, totalCredits, weightedAverage } from "@/lib/calculations";
import { sampleGrades, sampleMockExams, sampleStudent } from "@/lib/sampleData";
import type { GradeRecord, GradeScale, MockExamRecord, ReportMode, StudentInfo, StudentProfile } from "@/types/grade";

const STORAGE_KEY = "school-grade-analysis-v3";
const LEGACY_KEYS = ["school-grade-analysis-v2", "school-grade-analysis-v1"];
const GENDER_OPTIONS = ["여성", "남성", "기타", "응답 안 함"];
const SCHOOL_TYPE_OPTIONS = ["일반고", "자사고", "특목고", "특성화고", "기타"];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Page() {
  const [profiles, setProfiles] = useState<StudentProfile[]>(() => [createProfile(sampleStudent, sampleGrades, sampleMockExams, 9)]);
  const [activeId, setActiveId] = useState<string>("");
  const [reportMode, setReportMode] = useState<ReportMode>("grades");

  useEffect(() => {
    const saved = [STORAGE_KEY, ...LEGACY_KEYS].map((key) => localStorage.getItem(key)).find(Boolean);
    if (!saved) {
      setActiveId((current) => current || profiles[0].id);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        profiles?: StudentProfile[];
        activeId?: string;
        student?: StudentInfo;
        records?: GradeRecord[];
        mockRecords?: MockExamRecord[];
        gradeScale?: GradeScale;
        reportMode?: ReportMode;
      };
      const nextProfiles =
        parsed.profiles?.length
          ? parsed.profiles.map(normalizeProfile)
          : [createProfile(normalizeStudent(parsed.student ?? sampleStudent), parsed.records ?? sampleGrades, parsed.mockRecords ?? sampleMockExams, parsed.gradeScale ?? 9)];
      setProfiles(nextProfiles);
      setActiveId(parsed.activeId && nextProfiles.some((profile) => profile.id === parsed.activeId) ? parsed.activeId : nextProfiles[0].id);
      if (parsed.reportMode === "mock" || parsed.reportMode === "grades") setReportMode(parsed.reportMode);
    } catch {
      [STORAGE_KEY, ...LEGACY_KEYS].forEach((key) => localStorage.removeItem(key));
      setActiveId(profiles[0].id);
    }
  }, []);

  const activeProfile = useMemo(() => profiles.find((profile) => profile.id === activeId) ?? profiles[0], [profiles, activeId]);
  const student = activeProfile.student;
  const records = activeProfile.records;
  const mockRecords = activeProfile.mockRecords;
  const gradeScale = activeProfile.gradeScale;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeId: activeProfile.id, reportMode }));
  }, [profiles, activeProfile.id, reportMode]);

  const reportTitle = useMemo(() => {
    const name = student.name || "학생";
    return reportMode === "grades" ? `${name} 내신 성적 분석 리포트` : `${name} 모의고사/수능 성적 분석 리포트`;
  }, [student.name, reportMode]);

  function updateActiveProfile(updater: (profile: StudentProfile) => StudentProfile) {
    setProfiles((current) => current.map((profile) => (profile.id === activeProfile.id ? updater(profile) : profile)));
  }

  function updateStudent(field: keyof StudentInfo, value: string) {
    updateActiveProfile((profile) => ({ ...profile, student: { ...profile.student, [field]: value } }));
  }

  function updateRecords(nextRecords: GradeRecord[]) {
    updateActiveProfile((profile) => ({ ...profile, records: nextRecords }));
  }

  function updateMockRecords(nextRecords: MockExamRecord[]) {
    updateActiveProfile((profile) => ({ ...profile, mockRecords: nextRecords }));
  }

  function updateGradeScale(nextScale: GradeScale) {
    updateActiveProfile((profile) => ({ ...profile, gradeScale: nextScale }));
  }

  function resetActiveToSample() {
    updateActiveProfile((profile) => ({
      ...profile,
      student: { ...sampleStudent },
      records: sampleGrades.map((record) => ({ ...record })),
      mockRecords: sampleMockExams.map((record) => ({ ...record })),
      gradeScale: 9
    }));
  }

  function addStudent() {
    const newProfile = createProfile(
      {
        ...sampleStudent,
        name: `새 학생 ${profiles.length + 1}`,
        analysisDate: new Date().toISOString().slice(0, 10)
      },
      [],
      [],
      gradeScale
    );
    setProfiles((current) => [...current, newProfile]);
    setActiveId(newProfile.id);
  }

  function duplicateStudent() {
    const newProfile = createProfile(
      { ...student, name: `${student.name || "학생"} 복사본` },
      records.map((record) => ({ ...record, id: createId("record") })),
      mockRecords.map((record) => ({ ...record, id: createId("mock") })),
      gradeScale
    );
    setProfiles((current) => [...current, newProfile]);
    setActiveId(newProfile.id);
  }

  function deleteActiveStudent() {
    if (profiles.length <= 1) return;
    const nextProfiles = profiles.filter((profile) => profile.id !== activeProfile.id);
    setProfiles(nextProfiles);
    setActiveId(nextProfiles[0].id);
  }

  return (
    <main className="report-root mx-auto max-w-[1500px] px-5 py-6">
      <section className="mb-5 grid grid-cols-1 gap-4 print:hidden xl:grid-cols-[320px_1fr]">
        <aside className="report-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Students</p>
              <h2 className="section-title">학생 목록</h2>
            </div>
            <button className="btn-primary" type="button" onClick={addStudent}>학생 추가</button>
          </div>
          <div className="grid max-h-[420px] gap-2 overflow-auto pr-1">
            {profiles.map((profile) => (
              <button
                className={`rounded-md border px-3 py-3 text-left transition ${profile.id === activeProfile.id ? "border-teal-650 bg-teal-650/10" : "border-line bg-white hover:bg-slate-50"}`}
                key={profile.id}
                type="button"
                onClick={() => setActiveId(profile.id)}
              >
                <strong className="block text-sm text-ink">{profile.student.name || "이름 없음"}</strong>
                <span className="mt-1 block text-xs font-bold text-muted">
                  {profile.student.school || "학교 미입력"} · {formatGrade(weightedAverage(profile.records, profile.gradeScale))} · {totalCredits(profile.records, profile.gradeScale)}단위
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn-secondary" type="button" onClick={duplicateStudent}>복사</button>
            <button className="btn-secondary" type="button" onClick={deleteActiveStudent} disabled={profiles.length <= 1}>삭제</button>
          </div>
        </aside>

        <div className="report-card p-5">
          <p className="eyebrow">Selected Student</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{student.name || "학생"} 리포트 작업 중</h2>
          <p className="mt-2 text-sm font-medium text-muted">학생 목록에서 대상을 선택한 뒤 내신과 모의고사/수능 리포트를 각각 입력하고 분석할 수 있습니다.</p>
          <div className="mt-5 inline-flex rounded-lg border border-line bg-slate-50 p-1">
            <button className={`rounded-md px-4 py-2 text-sm font-extrabold ${reportMode === "grades" ? "bg-white text-teal-750 shadow-sm" : "text-muted"}`} type="button" onClick={() => setReportMode("grades")}>내신 리포트</button>
            <button className={`rounded-md px-4 py-2 text-sm font-extrabold ${reportMode === "mock" ? "bg-white text-teal-750 shadow-sm" : "text-muted"}`} type="button" onClick={() => setReportMode("mock")}>모의고사/수능 리포트</button>
          </div>
        </div>
      </section>

      <header className="report-header mb-5 rounded-lg border border-line bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-5">
            <img className="h-14 w-auto object-contain print:h-12" src={`${BASE_PATH}/deolux-logo.png`} alt="DEOLUX 데오럭스 교육그룹" />
            <div className="min-w-0">
              <p className="eyebrow">{reportMode === "grades" ? "School Record Grade Lab" : "Mock Exam Score Lab"}</p>
              <h1 className="mt-1 text-3xl font-black tracking-normal text-ink">{reportTitle}</h1>
              <p className="mt-2 text-sm font-medium text-muted">
                {reportMode === "grades"
                  ? "교과 성적을 입력하면 과목별 → 교과별 → 교과군별 → 성장추이 → 종합진단 순서로 자동 분석합니다."
                  : "모의고사/수능 성적을 입력하면 영역별 → 시험별 추이 → 백분위/등급 → 종합진단 순서로 자동 분석합니다."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button className="btn-secondary" type="button" onClick={() => window.print()}>PDF 다운로드</button>
            <button className="btn-secondary" type="button" onClick={resetActiveToSample}>샘플로 초기화</button>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-11">
          <Field label="이름" value={student.name} onChange={(value) => updateStudent("name", value)} />
          <Field label="성별" value={student.gender} options={GENDER_OPTIONS} onChange={(value) => updateStudent("gender", value)} />
          <Field label="지역" value={student.region} onChange={(value) => updateStudent("region", value)} />
          <Field label="학교 종류" value={student.schoolType} options={SCHOOL_TYPE_OPTIONS} onChange={(value) => updateStudent("schoolType", value)} />
          <Field label="학교" value={student.school} onChange={(value) => updateStudent("school", value)} />
          <Field label="학년" value={student.grade} onChange={(value) => updateStudent("grade", value)} />
          <Field label="계열" value={student.track} onChange={(value) => updateStudent("track", value)} />
          <Field label="희망대학" value={student.targetUniversity} onChange={(value) => updateStudent("targetUniversity", value)} />
          <Field label="희망학과" value={student.targetMajor} onChange={(value) => updateStudent("targetMajor", value)} />
          <Field label="분석일" type="date" value={student.analysisDate} onChange={(value) => updateStudent("analysisDate", value)} />
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-muted">등급체계</span>
            <select className="field" value={gradeScale} onChange={(event) => updateGradeScale(Number(event.target.value) as GradeScale)}>
              <option value={9}>9등급</option>
              <option value={5}>5등급</option>
            </select>
          </label>
        </section>
      </header>

      {reportMode === "grades" ? (
        <div className="space-y-5">
          <Dashboard records={records} gradeScale={gradeScale} />
          <div className="print:hidden">
            <GradeInputTable records={records} gradeScale={gradeScale} onChange={updateRecords} />
          </div>
          <SubjectAnalysis records={records} gradeScale={gradeScale} />
          <CourseAnalysis records={records} gradeScale={gradeScale} />
          <GroupAnalysis records={records} gradeScale={gradeScale} />
          <TrendAnalysis records={records} gradeScale={gradeScale} />
          <Diagnosis records={records} student={student} gradeScale={gradeScale} />
        </div>
      ) : (
        <MockExamReport records={mockRecords} student={student} onChange={updateMockRecords} />
      )}
    </main>
  );
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createProfile(student: StudentInfo, records: GradeRecord[], mockRecords: MockExamRecord[], gradeScale: GradeScale): StudentProfile {
  return {
    id: createId("student"),
    student: normalizeStudent(student),
    records: records.map((record) => ({ ...record })),
    mockRecords: mockRecords.map((record) => ({ ...record })),
    gradeScale: gradeScale === 5 ? 5 : 9
  };
}

function normalizeProfile(profile: StudentProfile): StudentProfile {
  return {
    id: profile.id || createId("student"),
    student: normalizeStudent(profile.student),
    records: Array.isArray(profile.records) ? profile.records : [],
    mockRecords: Array.isArray(profile.mockRecords) ? profile.mockRecords : [],
    gradeScale: profile.gradeScale === 5 ? 5 : 9
  };
}

function normalizeStudent(saved: Partial<StudentInfo>): StudentInfo {
  const merged = { ...sampleStudent, ...saved };
  const invalidGender = !GENDER_OPTIONS.includes(merged.gender);
  const schoolType = merged.schoolType === "자율고" ? "자사고" : merged.schoolType;
  const invalidSchoolType = !SCHOOL_TYPE_OPTIONS.includes(schoolType);
  const invalidRegion = /학교|학년/.test(merged.region);

  return {
    ...merged,
    gender: invalidGender ? sampleStudent.gender : merged.gender,
    schoolType: invalidSchoolType ? sampleStudent.schoolType : schoolType,
    region: invalidRegion ? sampleStudent.region : merged.region
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  options?: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-extrabold text-muted">{label}</span>
      {options ? (
        <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
