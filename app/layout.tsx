import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "학생부 내신 성적 분석",
  description: "고등학생 학교생활기록부 교과 성적 분석 대시보드"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
