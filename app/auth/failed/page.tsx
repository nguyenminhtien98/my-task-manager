"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const FailedContent = () => {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "Đăng nhập Google thất bại.";
  const redirect = searchParams.get("redirect") ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="max-w-sm rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700 shadow">
        <h1 className="mb-3 text-lg font-semibold">Có lỗi xảy ra</h1>
        <p className="mb-6 text-sm leading-relaxed">{message}</p>
        <Link
          href={redirect}
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Quay lại trang chính
        </Link>
      </div>
    </div>
  );
};

const FailedPage = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white">Đang tải...</div>}>
    <FailedContent />
  </Suspense>
);

export default FailedPage;
