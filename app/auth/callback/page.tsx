"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account, database } from "../../../lib/appwrite";
import { useAuth } from "../../context/AuthContext";
import { Query, AppwriteException } from "appwrite";
import toast from "react-hot-toast";

const CallbackContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const completeOAuth = async () => {
      try {
        const accountInfo = await account.get();
        if (cancelled) return;

        let displayName = accountInfo.name?.trim();
        if (!displayName || displayName.length === 0) {
          displayName = accountInfo.email ?? accountInfo.$id;
        }

        try {
          await database.getDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
            accountInfo.$id
          );
        } catch (error) {
          const err = error as AppwriteException;
          if (err.code === 404) {
            let finalName = displayName;
            try {
              const nameCheck = await database.listDocuments(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
                [Query.equal("name", finalName)]
              );
              if (nameCheck.documents.length > 0 && accountInfo.email) {
                finalName = accountInfo.email;
              }
            } catch {
              finalName = displayName;
            }

            await database.createDocument(
              String(process.env.NEXT_PUBLIC_DATABASE_ID),
              String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
              accountInfo.$id,
              {
                user_id: accountInfo.$id,
                name: finalName,
                email: accountInfo.email,
                role: "user",
              }
            );
            displayName = finalName;
          } else {
            throw error;
          }
        }

        await login(accountInfo.$id, displayName);
        toast.success("Đăng nhập Google thành công");
        router.replace("/");
      } catch (error) {
        const message =
          error instanceof AppwriteException
            ? error.message
            : "Đăng nhập Google thất bại";
        toast.error(message);
        const redirectTo = searchParams.get("redirect") ?? "/";
        router.replace(`/auth/failed?message=${encodeURIComponent(message)}&redirect=${encodeURIComponent(redirectTo)}`);
      }
    };

    completeOAuth();

    return () => {
      cancelled = true;
    };
  }, [login, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="text-sub">Đang xử lý đăng nhập Google...</p>
      </div>
    </div>
  );
};

const CallbackPage = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white">Đang xử lý đăng nhập...</div>}>
    <CallbackContent />
  </Suspense>
);

export default CallbackPage;
