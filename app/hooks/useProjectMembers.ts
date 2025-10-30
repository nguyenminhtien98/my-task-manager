"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { database } from "../appwrite";
import { useProject } from "../context/ProjectContext";
import { BasicProfile } from "../types/Types";
import { emitMembersChanged, onMembersChanged } from "../../lib/membersBus";

export interface EnrichedProjectMember extends BasicProfile {
  isLeader: boolean;
  membershipId?: string;
}

export interface ProjectMemberProfile extends EnrichedProjectMember {
  joinedAt?: string;
}

export const useProjectMembers = () => {
  const { currentProject } = useProject();
  const [members, setMembers] = useState<ProjectMemberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const refetch = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!currentProject) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );

        const response = await database.listDocuments(
          databaseId,
          membershipsCollectionId,
          [Query.equal("project", currentProject.$id), Query.limit(100)]
        );

        const nonLeaderMembers: ProjectMemberProfile[] = response.documents
          .map((membershipDoc) => {
            const userProfile = membershipDoc.user as BasicProfile;
            const profile: ProjectMemberProfile = {
              ...(userProfile as BasicProfile),
              isLeader: false,
              membershipId: membershipDoc.$id,
              joinedAt: membershipDoc.joinedAt as string | undefined,
            };
            return profile;
          })
          .filter((m) => m.$id !== currentProject.leader.$id);

        const leaderMatch = response.documents.find(
          (d) => (d.user as BasicProfile)?.$id === currentProject.leader.$id
        );
        const leaderProfile: ProjectMemberProfile = {
          ...currentProject.leader,
          isLeader: true,
          membershipId: leaderMatch?.$id,
          joinedAt: (leaderMatch?.joinedAt as string | undefined) ?? undefined,
        };

        const allMembers: ProjectMemberProfile[] = [
          leaderProfile,
          ...nonLeaderMembers,
        ];
        setMembers(allMembers);
      } catch (error) {
        console.error("Failed to fetch project members:", error);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [currentProject, version]);

  useEffect(() => {
    if (!currentProject) return;
    const unsubscribe = onMembersChanged((projectId) => {
      if (currentProject && projectId === currentProject.$id) {
        refetch();
      }
    });
    return unsubscribe;
  }, [currentProject]);

  const addMember = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }

      try {
        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );
        const profileCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE
        );

        const profileRes = await database.listDocuments(
          databaseId,
          profileCollectionId,
          [Query.equal("email", email), Query.limit(1)]
        );
        const profileDocs = profileRes.documents as unknown as BasicProfile[];
        const profile = profileDocs[0];
        if (!profile) {
          return {
            success: false,
            message: "Email không tồn tại trong hệ thống",
          };
        }

        const membershipCheck = await database.listDocuments(
          databaseId,
          membershipsCollectionId,
          [
            Query.equal("project", currentProject.$id),
            Query.equal("user", profile.$id),
            Query.limit(1),
          ]
        );
        if (membershipCheck.total > 0) {
          return { success: false, message: "User đã là thành viên của dự án" };
        }

        await database.createDocument(
          databaseId,
          membershipsCollectionId,
          "unique()",
          {
            project: currentProject.$id,
            user: profile.$id,
            joinedAt: new Date().toISOString(),
          }
        );

        emitMembersChanged(currentProject.$id);
        refetch();
        return { success: true, message: "Đã thêm thành viên thành công" };
      } catch (error) {
        console.error("Failed to add member:", error);
        return { success: false, message: "Thêm thành viên thất bại" };
      }
    },
    [currentProject]
  );

  const removeMember = useCallback(
    async (
      membershipId: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }

      try {
        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );

        await database.deleteDocument(
          databaseId,
          membershipsCollectionId,
          membershipId
        );

        emitMembersChanged(currentProject.$id);
        refetch();
        return { success: true, message: "Đã xóa thành viên" };
      } catch (error) {
        console.error("Failed to remove member:", error);
        return { success: false, message: "Xóa thành viên thất bại" };
      }
    },
    [currentProject]
  );

  const leader = useMemo(
    () => members.find((member) => member.isLeader) ?? null,
    [members]
  );

  return {
    members,
    isLoading,
    leader,
    addMember,
    removeMember,
  };
};

export type UseProjectMembersResult = ReturnType<typeof useProjectMembers>;
