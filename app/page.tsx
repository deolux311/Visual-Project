"use client";

import { useEffect, useMemo, useState } from "react";
import CourseAnalysis from "@/components/CourseAnalysis";
import Dashboard from "@/components/Dashboard";
import Diagnosis from "@/components/Diagnosis";
import GradeInputTable from "@/components/GradeInputTable";
import GroupAnalysis from "@/components/GroupAnalysis";
import SubjectAnalysis from "@/components/SubjectAnalysis";
import TrendAnalysis from "@/components/TrendAnalysis";
import { formatGrade, totalCredits, weightedAverage } from "@/lib/calculations";
import { sampleGrades, sampleStudent } from "@/lib/sampleData";
import type { GradeRecord, GradeScale, StudentInfo, StudentProfile } from "@/types/grade";

const STORAGE_KEY = "school-grade-analysis-v2";
const LEGACY_STORAGE_KEY = "school-grade-analysis-v1";
const GENDER_OPTIONS = ["여성", "남성", "기타", "응답 안 함"];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Page() {
  const [profiles, setProfiles] = useState<StudentProfile[]>(() => [createProfile(sampleStudent, sampleGrades, 9)]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
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
        gradeScale?: GradeScale;
      };
      const nextProfiles =
        parsed.profiles?.length
          ? parsed.profiles.map(normalizeProfile)
          : [createProfile(normalizeStudent(parsed.student ?? sampleStudent), parsed.records ?? sampleGrades, parsed.gradeScale ?? 9)];
      setProfiles(nextProfiles);
      setActiveId(parsed.activeId && nextProfiles.some((profile) => profile.id === parsed.activeId) ? parsed.activeId : nextProfiles[0].id);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setActiveId(profiles[0].id);
    }
  }, []);

  const activeProfile = useMemo(() => profiles.find((profile) => profile.id === activeId) ?? profiles[0], [profiles, activeId]);
  const student = activeProfile.student;
  const records = activeProfile.records;
  const gradeScale = activeProfile.gradeScale;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeId: activeProfile.id }));
  }, [profiles, activeProfile.id]);

  const reportTitle = useMemo(() => {
    const name = student.name || "학생";
    return `${name} 내신 성적 분석 리포트`;
  }, [student.name]);

  function updateActiveProfile(updater: (profile: StudentProfile) => StudentProfile) {
    setProfiles((current) => current.map((profile) => (profile.id === activeProfile.id ? updater(profile) : profile)));
  }

  function updateStudent(field: keyof StudentInfo, value: string) {
    updateActiveProfile((profile) => ({ ...profile, student: { ...profile.student, [field]: value } }));
  }

  function updateRecords(nextRecords: GradeRecord[]) {
    updateActiveProfile((profile) => ({ ...profile, records: nextRecords }));
  }

  function updateGradeScale(nextScale: GradeScale) {
    updateActiveProfile((profile) => ({ ...profile, gradeScale: nextScale }));
  }

  function resetActiveToSample() {
    updateActiveProfile((profile) => ({
      ...profile,
      student: { ...sampleStudent },
      records: sampleGrades.map((record) => ({ ...record })),
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
      gradeScale
    );
    setProfiles((current) => [...current, newProfile]);
    setActiveId(newProfile.id);
  }

  function duplicateStudent() {
    const newProfile = createProfile(
      { ...student, name: `${student.name || "학생"} 복사본` },
      records.map((record) => ({ ...record, id: createId("record") })),
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
          <p className="mt-2 text-sm font-medium text-muted">학생 목록에서 대상을 선택한 뒤 성적을 입력하면 각 학생별로 리포트가 따로 저장됩니다.</p>
        </div>
      </section>

      <header className="report-header mb-5 rounded-lg border border-line bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-5">
            <img className="h-14 w-auto object-contain print:h-12" src={`${BASE_PATH}/deolux-logo.png`} alt="DEOLUX 데오럭스 교육그룹" />
            <div className="min-w-0">
              <p className="eyebrow">School Record Grade Lab</p>
              <h1 className="mt-1 text-3xl font-black tracking-normal text-ink">{reportTitle}</h1>
              <p className="mt-2 text-sm font-medium text-muted">교과 성적을 입력하면 과목별 → 교과별 → 교과군별 → 성장추이 → 종합진단 순서로 자동 분석합니다.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button className="btn-secondary" type="button" onClick={() => window.print()}>PDF 다운로드</button>
            <button className="btn-secondary" type="button" onClick={resetActiveToSample}>샘플로 초기화</button>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-9">
          <Field label="이름" value={student.name} onChange={(value) => updateStudent("name", value)} />
          <Field label="성별" value={student.gender} options={GENDER_OPTIONS} onChange={(value) => updateStudent("gender", value)} />
          <Field label="지역" value={student.region} onChange={(value) => updateStudent("region", value)} />
          <Field label="학교" value={student.school} onChange={(value) => updateStudent("school", value)} />
          <Field label="학년" value={student.grade} onChange={(value) => updateStudent("grade", value)} />
          <Field label="계열" value={student.track} onChange={(value) => updateStudent("track", value)} />
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
    </main>
  );
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createProfile(student: StudentInfo, records: GradeRecord[], gradeScale: GradeScale): StudentProfile {
  return {
    id: createId("student"),
    student: normalizeStudent(student),
    records: records.map((record) => ({ ...record })),
    gradeScale: gradeScale === 5 ? 5 : 9
  };
}

function normalizeProfile(profile: StudentProfile): StudentProfile {
  return {
    id: profile.id || createId("student"),
    student: normalizeStudent(profile.student),
    records: Array.isArray(profile.records) ? profile.records : [],
    gradeScale: profile.gradeScale === 5 ? 5 : 9
  };
}

function normalizeStudent(saved: Partial<StudentInfo>): StudentInfo {
  const merged = { ...sampleStudent, ...saved };
  const invalidGender = !GENDER_OPTIONS.includes(merged.gender);
  const invalidRegion = /학교|학년/.test(merged.region);

  return {
    ...merged,
    gender: invalidGender ? sampleStudent.gender : merged.gender,
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
