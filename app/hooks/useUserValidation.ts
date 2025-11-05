"use client";

import { useCallback } from "react";
import { Query } from "appwrite";
import { database } from "../../lib/appwrite";

export interface ValidationResult {
  exists: boolean;
  message?: string;
  userId?: string;
  userName?: string;
}

export const useUserValidation = () => {
  const checkEmailExists = useCallback(
    async (email: string): Promise<ValidationResult> => {
      if (!email || email.trim() === "") {
        return { exists: false, message: "Email không được để trống" };
      }

      const trimmedEmail = email.trim().toLowerCase();

      try {
        const profileRes = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
          [Query.equal("email", trimmedEmail), Query.limit(1)]
        );

        if (profileRes.documents.length > 0) {
          const profile = profileRes.documents[0] as unknown as {
            $id: string;
            name: string;
            email: string;
          };
          return {
            exists: true,
            userId: profile.$id,
            userName: profile.name,
          };
        }

        return {
          exists: false,
          message: "",
        };
      } catch (error) {
        console.error("Error checking email:", error);
        return {
          exists: false,
          message: "Lỗi hệ thống, vui lòng thử lại",
        };
      }
    },
    []
  );
  const checkNameExists = useCallback(
    async (name: string): Promise<ValidationResult> => {
      if (!name || name.trim() === "") {
        return { exists: false, message: "Tên không được để trống" };
      }

      const trimmedName = name.trim();

      try {
        const profileRes = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
          [Query.equal("name", trimmedName), Query.limit(1)]
        );

        if (profileRes.documents.length > 0) {
          const profile = profileRes.documents[0] as unknown as {
            $id: string;
            name: string;
            email: string;
          };
          return {
            exists: true,
            userId: profile.$id,
            userName: profile.name,
          };
        }

        return { exists: false };
      } catch (error) {
        console.error("Error checking name:", error);
        return {
          exists: false,
          message: "Lỗi hệ thống, vui lòng thử lại",
        };
      }
    },
    []
  );

  return {
    checkEmailExists,
    checkNameExists,
  };
};
