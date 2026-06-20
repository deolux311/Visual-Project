"use client";

import { useEffect, useMemo, useState } from "react";
import AverageReportSections from "@/components/AverageReportSections";
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
  const [gradePage, setGradePage] = useState<"report" | "input">("report");
  const [workspacePage, setWorkspacePage] = useState<"report" | "students">("report");

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
    if (workspacePage === "students") return "학생 목록";
    if (reportMode === "mock") return `${name} 모의고사/수능 성적 분석 리포트`;
    if (gradePage === "input") return `${name} 내신 성적 데이터 입력`;
    return `${name} 내신 성적 분석 리포트`;
  }, [student.name, reportMode, gradePage, workspacePage]);

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
    setGradePage("report");
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
    setGradePage("input");
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
    setGradePage("report");
  }

  function selectReportMode(nextMode: ReportMode) {
    setWorkspacePage("report");
    setReportMode(nextMode);
    if (nextMode === "grades") setGradePage("report");
  }

  function openStudentReport(id = activeProfile.id) {
    setActiveId(id);
    setWorkspacePage("report");
    setReportMode("grades");
    setGradePage("report");
  }

  const isGradeInputPage = reportMode === "grades" && gradePage === "input";
  const isStudentListPage = workspacePage === "students";

  return (
    <main className="report-root mx-auto max-w-[1500px] px-5 py-6">
      <section className="mb-5 report-card p-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Selected Student</p>
            <h2 className="mt-1 text-2xl font-black text-ink">{student.name || "학생"} 리포트 작업 중</h2>
            <p className="mt-2 text-sm font-medium text-muted">
              학생 목록을 별도 페이지에서 관리하고, 선택된 학생의 내신과 모의고사/수능 리포트를 입력·분석합니다.
            </p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-right text-xs font-extrabold text-muted">
            전체 {profiles.length}명 · 현재 {student.school || "학교 미입력"}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap rounded-lg border border-line bg-slate-50 p-1">
            <button className={`rounded-md px-4 py-2 text-sm font-extrabold ${!isStudentListPage && reportMode === "grades" ? "bg-white text-teal-750 shadow-sm" : "text-muted"}`} type="button" onClick={() => selectReportMode("grades")}>내신 리포트</button>
            <button className={`rounded-md px-4 py-2 text-sm font-extrabold ${!isStudentListPage && reportMode === "mock" ? "bg-white text-teal-750 shadow-sm" : "text-muted"}`} type="button" onClick={() => selectReportMode("mock")}>모의고사/수능 리포트</button>
          </div>
          {reportMode === "grades" && !isStudentListPage ? (
            <div className="inline-flex flex-wrap rounded-lg border border-line bg-slate-50 p-1">
              <button className={`rounded-md px-4 py-2 text-sm font-extrabold ${gradePage === "report" ? "bg-white text-teal-750 shadow-sm" : "text-muted"}`} type="button" onClick={() => setGradePage("report")}>분석 리포트</button>
              <button className={`rounded-md px-4 py-2 text-sm font-extrabold ${gradePage === "input" ? "bg-white text-teal-750 shadow-sm" : "text-muted"}`} type="button" onClick={() => setGradePage("input")}>내신 성적 입력</button>
            </div>
          ) : null}
          <button
            className={`ml-auto rounded-md px-4 py-2 text-sm font-extrabold ${isStudentListPage ? "bg-teal-650 text-white shadow-sm" : "border border-line bg-white text-teal-750"}`}
            type="button"
            onClick={() => setWorkspacePage("students")}
          >
            학생 목록
          </button>
        </div>
      </section>

      <header className="report-header mb-5 rounded-lg border border-line bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-5">
            <img className="h-14 w-auto object-contain print:h-12" src={`${BASE_PATH}/deolux-logo.png`} alt="DEOLUX 데오럭스 교육그룹" />
            <div className="min-w-0">
              <p className="eyebrow">{isStudentListPage ? "Students" : reportMode === "mock" ? "Mock Exam Score Lab" : isGradeInputPage ? "Grade Input Lab" : "School Record Grade Lab"}</p>
              <h1 className="mt-1 text-3xl font-black tracking-normal text-ink">{reportTitle}</h1>
              <p className="mt-2 text-sm font-medium text-muted">
                {isStudentListPage
                  ? "여러 학생을 한 곳에서 추가·선택·복사·삭제하고, 선택한 학생의 리포트 페이지로 이동합니다."
                  : reportMode === "mock"
                  ? "모의고사/수능 성적을 입력하면 영역별 → 시험별 추이 → 백분위/등급 → 종합진단 순서로 자동 분석합니다."
                  : isGradeInputPage
                    ? "내신 성적 데이터를 표 형태로 입력하고 저장합니다. 입력 후 분석 리포트 화면에서 자동 계산 결과를 확인할 수 있습니다."
                    : "교과 성적을 입력하면 과목별 → 교과별 → 교과군별 → 성장추이 → 종합진단 순서로 자동 분석합니다."}
              </p>
            </div>
          </div>
          {!isStudentListPage ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              {isGradeInputPage ? (
                <button className="btn-primary" type="button" onClick={() => document.getElementById("grade-image-pdf-upload")?.click()}>
                  이미지/PDF 업로드
                </button>
              ) : null}
              <button className="btn-secondary" type="button" onClick={() => window.print()}>PDF 다운로드</button>
              <button className="btn-secondary" type="button" onClick={resetActiveToSample}>샘플로 초기화</button>
            </div>
          ) : null}
        </div>

        {!isStudentListPage ? (
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
        ) : null}
      </header>

      {isStudentListPage ? (
        <StudentListPage
          profiles={profiles}
          activeId={activeProfile.id}
          onAdd={addStudent}
          onSelect={setActiveId}
          onOpenReport={openStudentReport}
          onDuplicate={duplicateStudent}
          onDelete={deleteActiveStudent}
        />
      ) : isGradeInputPage ? (
        <div className="space-y-5">
          <section className="report-card p-5 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Grade Input</p>
                <h2 className="section-title">내신 성적 데이터 입력</h2>
                <p className="mt-2 text-sm font-bold text-muted">입력한 성적은 현재 선택된 학생에게 자동 저장됩니다.</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => setGradePage("report")}>분석 리포트 보기</button>
            </div>
          </section>
          <GradeInputTable records={records} gradeScale={gradeScale} onChange={updateRecords} />
        </div>
      ) : reportMode === "grades" ? (
        <div className="space-y-5">
          <Dashboard records={records} gradeScale={gradeScale} />
          <section className="report-card p-5 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Grade Records</p>
                <h2 className="section-title">내신 성적 입력은 별도 페이지에서 관리합니다</h2>
                <p className="mt-2 text-sm font-bold text-muted">성적을 수정하거나 추가하려면 입력 페이지로 이동하세요.</p>
              </div>
              <button className="btn-primary" type="button" onClick={() => setGradePage("input")}>내신 성적 입력 페이지 열기</button>
            </div>
          </section>
          <AverageReportSections records={records} gradeScale={gradeScale} />
          <Diagnosis records={records} student={student} gradeScale={gradeScale} />
        </div>
      ) : (
        <MockExamReport records={mockRecords} student={student} onChange={updateMockRecords} />
      )}
    </main>
  );
}

function StudentListPage({
  profiles,
  activeId,
  onAdd,
  onSelect,
  onOpenReport,
  onDuplicate,
  onDelete
}: {
  profiles: StudentProfile[];
  activeId: string;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onOpenReport: (id: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const activeProfile = profiles.find((profile) => profile.id === activeId) ?? profiles[0];

  return (
    <section className="report-card p-5 print:hidden">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Student Directory</p>
          <h2 className="section-title">학생 목록</h2>
          <p className="mt-2 text-sm font-bold text-muted">
            학생을 선택한 뒤 리포트를 열면 해당 학생의 내신·모의고사 데이터가 따로 저장됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="button" onClick={onAdd}>학생 추가</button>
          <button className="btn-secondary" type="button" onClick={onDuplicate}>선택 학생 복사</button>
          <button className="btn-secondary" type="button" onClick={onDelete} disabled={profiles.length <= 1}>선택 학생 삭제</button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-teal-650 bg-teal-650/10 p-4">
        <p className="text-xs font-extrabold uppercase text-teal-750">현재 선택 학생</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-ink">{activeProfile.student.name || "이름 없음"}</h3>
            <p className="mt-1 text-sm font-bold text-muted">
              {activeProfile.student.region || "지역 미입력"} · {activeProfile.student.schoolType || "학교 종류 미입력"} · {activeProfile.student.school || "학교 미입력"}
            </p>
          </div>
          <button className="btn-primary" type="button" onClick={() => onOpenReport(activeProfile.id)}>선택 학생 리포트 열기</button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-line">
        <table className="min-w-[980px] w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-extrabold text-muted">
            <tr>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3">이름</th>
              <th className="px-3 py-3">성별</th>
              <th className="px-3 py-3">지역</th>
              <th className="px-3 py-3">학교</th>
              <th className="px-3 py-3">학년</th>
              <th className="px-3 py-3">계열</th>
              <th className="px-3 py-3 text-center">전체 평균</th>
              <th className="px-3 py-3 text-center">총 이수단위</th>
              <th className="px-3 py-3 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const selected = profile.id === activeId;
              return (
                <tr className={`border-t border-line ${selected ? "bg-teal-650/10" : "bg-white"}`} key={profile.id}>
                  <td className="px-3 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-extrabold ${selected ? "bg-teal-650 text-white" : "bg-slate-100 text-muted"}`}>
                      {selected ? "선택됨" : "대기"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-extrabold text-ink">{profile.student.name || "이름 없음"}</td>
                  <td className="px-3 py-3">{profile.student.gender || "-"}</td>
                  <td className="px-3 py-3">{profile.student.region || "-"}</td>
                  <td className="px-3 py-3">{profile.student.school || "-"}</td>
                  <td className="px-3 py-3">{profile.student.grade || "-"}</td>
                  <td className="px-3 py-3">{profile.student.track || "-"}</td>
                  <td className="px-3 py-3 text-center font-extrabold">{formatGrade(weightedAverage(profile.records, profile.gradeScale))}</td>
                  <td className="px-3 py-3 text-center font-extrabold">{totalCredits(profile.records, profile.gradeScale)}단위</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary" type="button" onClick={() => onSelect(profile.id)}>선택</button>
                      <button className="btn-primary" type="button" onClick={() => onOpenReport(profile.id)}>리포트</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
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
