"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Query, type Models } from "appwrite";
import { database } from "../appwrite";
import { useProject } from "../context/ProjectContext";

export interface ProjectMemberProfile {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  themeColor?: string;
  isLeader?: boolean;
  joinedAt?: string;
}

export interface MemberOperationResult {
  success: boolean;
  message: string;
  canonicalName?: string;
}

const isLikelyId = (value: string) => /^[a-z0-9]{20,}$/i.test(value.trim());

const normalizeMemberList = (members: unknown): string[] => {
  if (Array.isArray(members)) {
    return members
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof members === "string") {
    const trimmed = members.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  return [];
};

const normalizeJoinedMap = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>);
  const map: Record<string, string> = {};
  entries.forEach(([key, val]) => {
    if (typeof val === "string" && val.trim().length > 0) {
      map[key.trim()] = val;
    }
  });
  return map;
};

const mapProfileDocument = (
  doc: Models.Document,
  options: { isLeader?: boolean; joinedAt?: string } = {}
): ProjectMemberProfile => {
  const { isLeader = false, joinedAt } = options;
  const id =
    (typeof doc.$id === "string" && doc.$id) ||
    (typeof doc.user_id === "string" && doc.user_id) ||
    "";

  return {
    id,
    name: typeof doc.name === "string" ? doc.name : "Người dùng",
    role: typeof doc.role === "string" ? doc.role : undefined,
    avatarUrl: typeof doc.avatarUrl === "string" ? doc.avatarUrl : undefined,
    themeColor: typeof doc.themeColor === "string" ? doc.themeColor : undefined,
    isLeader,
    joinedAt,
  };
};

export const useProjectMembers = () => {
  const { currentProject, setCurrentProject, setProjects } = useProject();
  const [members, setMembers] = useState<ProjectMemberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joinedAtState, setJoinedAtState] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentProject) {
      setJoinedAtState({});
      return;
    }
    setJoinedAtState(normalizeJoinedMap(currentProject.membersJoinedAt));
  }, [currentProject]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      if (!currentProject) {
        setMembers([]);
        return;
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const profileCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;

      if (!databaseId || !profileCollectionId) {
        setMembers([]);
        return;
      }

      const localJoinedMap = normalizeJoinedMap(currentProject.membersJoinedAt);

      const getJoinedAt = (value: string) => {
        const lower = value.trim().toLowerCase();
        for (const [key, time] of Object.entries(localJoinedMap)) {
          if (key.trim().toLowerCase() === lower) {
            return time;
          }
        }
        return undefined;
      };

      const candidateEntries: Array<{
        value: string;
        isLeader?: boolean;
        joinedAt?: string;
      }> = [];

      if (
        typeof currentProject.leaderId === "string" &&
        currentProject.leaderId.trim().length > 0
      ) {
        const leaderValue = currentProject.leaderId.trim();
        candidateEntries.push({
          value: leaderValue,
          isLeader: true,
          joinedAt:
            getJoinedAt(leaderValue) ?? currentProject.createdAt ?? undefined,
        });
      }

      normalizeMemberList(currentProject.members).forEach((member) => {
        candidateEntries.push({
          value: member,
          joinedAt: getJoinedAt(member),
        });
      });

      const uniqueEntries = candidateEntries.filter((entry, index, list) => {
        const normalized = entry.value.toLowerCase();
        return (
          list.findIndex(
            (item) => item.value.toLowerCase() === normalized
          ) === index
        );
      });

      const fetchedProfiles: ProjectMemberProfile[] = [];

      for (const entry of uniqueEntries) {
        const { value, isLeader, joinedAt } = entry;

        if (isLikelyId(value)) {
          try {
            const doc = await database.getDocument<Models.Document>(
              String(databaseId),
              String(profileCollectionId),
              value
            );
            fetchedProfiles.push(
              mapProfileDocument(doc, {
                isLeader: Boolean(isLeader),
                joinedAt,
              })
            );
            continue;
          } catch {
            // fall back to name search
          }
        }

        try {
          const res = await database.listDocuments<Models.Document>(
            String(databaseId),
            String(profileCollectionId),
            [Query.equal("name", value)]
          );

          if (res.documents.length > 0) {
            const doc = res.documents[0];
            fetchedProfiles.push(
              mapProfileDocument(doc, {
                isLeader: Boolean(isLeader),
                joinedAt: joinedAt ?? getJoinedAt(doc.name ?? value),
              })
            );
          } else if (isLeader) {
            fetchedProfiles.push({
              id: value,
              name: value,
              isLeader: true,
              joinedAt,
            });
          } else {
            fetchedProfiles.push({
              id: value,
              name: value,
              joinedAt,
            });
          }
        } catch {
          fetchedProfiles.push({
            id: value,
            name: value,
            isLeader: Boolean(isLeader),
            joinedAt,
          });
        }
      }

      if (!cancelled) {
        setMembers(fetchedProfiles);
        setJoinedAtState(localJoinedMap);
      }
    };

    setIsLoading(true);
    loadMembers()
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProject]);

  const updateProjectMembers = useCallback(
    (
      updatedMembers: string[],
      updatedJoinedAt?: Record<string, string>
    ) => {
      if (!currentProject) return;

      const nextJoinedAt =
        updatedJoinedAt ?? normalizeJoinedMap(currentProject.membersJoinedAt);

      setCurrentProject({
        ...currentProject,
        members: updatedMembers,
        membersJoinedAt: nextJoinedAt,
      });

      setProjects((prev) =>
        prev.map((proj) =>
          proj.id === currentProject.id
            ? { ...proj, members: updatedMembers, membersJoinedAt: nextJoinedAt }
            : proj
        )
      );

      setJoinedAtState(nextJoinedAt);
    },
    [currentProject, setCurrentProject, setProjects]
  );

  const addMember = useCallback(
    async (rawName: string): Promise<MemberOperationResult> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }

      const trimmedName = rawName.trim();
      if (!trimmedName) {
        return { success: false, message: "Vui lòng nhập tên thành viên" };
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const profileCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;
      const projectsCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;

      if (!databaseId || !profileCollectionId || !projectsCollectionId) {
        return { success: false, message: "Thiếu cấu hình Appwrite" };
      }

      const memberList = normalizeMemberList(currentProject.members);
      const lowerTrimmed = trimmedName.toLowerCase();
      if (
        memberList.some(
          (member) => member.trim().toLowerCase() === lowerTrimmed
        )
      ) {
        return { success: false, message: "Thành viên đã tồn tại trong dự án" };
      }

      try {
        const res = await database.listDocuments<Models.Document>(
          String(databaseId),
          String(profileCollectionId),
          [Query.equal("name", trimmedName)]
        );

        if (res.documents.length === 0) {
          return {
            success: false,
            message: "Không tìm thấy thành viên trong hệ thống",
          };
        }

        const profileDoc = res.documents[0];
        const canonicalName =
          typeof profileDoc.name === "string" &&
          profileDoc.name.trim().length > 0
            ? profileDoc.name.trim()
            : trimmedName;

        const lowerCanonical = canonicalName.toLowerCase();
        if (
          memberList.some(
            (member) => member.trim().toLowerCase() === lowerCanonical
          )
        ) {
          return {
            success: false,
            message: "Thành viên đã tồn tại trong dự án",
          };
        }

        const updatedMembers = [...memberList, canonicalName];
        const updatedJoinedAt = {
          ...joinedAtState,
          [canonicalName]: new Date().toISOString(),
        };

        await database.updateDocument(
          String(databaseId),
          String(projectsCollectionId),
          currentProject.id,
          {
            members: updatedMembers,
            membersJoinedAt: updatedJoinedAt,
          }
        );

        updateProjectMembers(updatedMembers, updatedJoinedAt);
        setMembers((prev) => {
          const exists = prev.some(
            (member) => member.name.trim().toLowerCase() === lowerCanonical
          );
          if (exists) return prev;
          return [
            ...prev,
            mapProfileDocument(profileDoc, {
              joinedAt: updatedJoinedAt[canonicalName],
            }),
          ];
        });

        return {
          success: true,
          message: "Đã thêm thành viên",
          canonicalName,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Thêm thành viên thất bại";
        return { success: false, message };
      }
    },
    [currentProject, joinedAtState, updateProjectMembers]
  );

  const removeMember = useCallback(
    async (rawName: string): Promise<MemberOperationResult> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }

      const trimmedName = rawName.trim();
      if (!trimmedName) {
        return { success: false, message: "Vui lòng chọn thành viên" };
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const projectsCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;

      if (!databaseId || !projectsCollectionId) {
        return { success: false, message: "Thiếu cấu hình Appwrite" };
      }

      const memberList = normalizeMemberList(currentProject.members);
      const lower = trimmedName.toLowerCase();
      const filteredMembers = memberList.filter(
        (member) => member.trim().toLowerCase() !== lower
      );

      if (filteredMembers.length === memberList.length) {
        return {
          success: false,
          message: "Không tìm thấy thành viên trong dự án",
        };
      }

      const updatedJoinedAt = { ...joinedAtState };
      for (const key of Object.keys(updatedJoinedAt)) {
        if (key.trim().toLowerCase() === lower) {
          delete updatedJoinedAt[key];
          break;
        }
      }

      try {
        await database.updateDocument(
          String(databaseId),
          String(projectsCollectionId),
          currentProject.id,
          {
            members: filteredMembers,
            membersJoinedAt: updatedJoinedAt,
          }
        );

        updateProjectMembers(filteredMembers, updatedJoinedAt);
        setMembers((prev) =>
          prev.filter(
            (member) => member.name.trim().toLowerCase() !== lower
          )
        );

        return { success: true, message: "Đã xóa thành viên" };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Xóa thành viên thất bại";
        return { success: false, message };
      }
    },
    [currentProject, joinedAtState, updateProjectMembers]
  );

  const leader = useMemo(
    () => members.find((member) => member.isLeader) ?? null,
    [members]
  );

  const memberList = useMemo(() => {
    if (!leader) return members;
    return [
      leader,
      ...members.filter((member) => member.id !== leader.id),
    ];
  }, [leader, members]);

  return {
    members: memberList,
    isLoading,
    leader,
    addMember,
    removeMember,
  };
};

export type UseProjectMembersResult = ReturnType<typeof useProjectMembers>;
