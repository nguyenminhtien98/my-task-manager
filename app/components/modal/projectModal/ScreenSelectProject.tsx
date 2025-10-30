"use client";

import React, { useMemo, useState } from "react";
import { useProject } from "@/app/context/ProjectContext";
import { useAuth } from "@/app/context/AuthContext";
import { Project } from "@/app/types/Types";
import Button from "@/app/components/common/Button";
import FreeScrollSlider from "@/app/components/common/FreeScrollSlider";
import ItemCardProject from "@/app/components/ItemCardProject";

interface ScreenSelectProjectProps {
  onSelect: (p: Project) => void;
}

const ScreenSelectProject: React.FC<ScreenSelectProjectProps> = ({
  onSelect,
}) => {
  const { projects } = useProject();
  const { user } = useAuth();
  const [leaderFilter, setLeaderFilter] = useState<string>("__all");

  const otherLeaders = useMemo(() => {
    if (!user) return [] as { id: string; name: string }[];
    const setMap = new Map<string, string>();
    projects.forEach((p) => {
      if (p.leader?.$id && p.leader.$id !== user.id) {
        setMap.set(p.leader.$id, p.leader.name);
      }
    });
    return Array.from(setMap.entries()).map(([id, name]) => ({ id, name }));
  }, [projects, user]);

  const filteredProjects = useMemo(() => {
    if (leaderFilter === "__all") return projects;
    return projects.filter((p) => p.leader?.$id === leaderFilter);
  }, [projects, leaderFilter]);

  return (
    <div className="space-y-4">
      <div>
        <FreeScrollSlider gap={4}>
          <Button
            onClick={() => setLeaderFilter("__all")}
            className={`px-1 py-1 whitespace-nowrap ${
              leaderFilter === "__all"
                ? "bg-black text-white"
                : "bg-black/10 text-black"
            }`}
          >
            Tất cả
          </Button>
          {otherLeaders.map((ldr) => (
            <Button
              key={ldr.id}
              onClick={() => setLeaderFilter(ldr.id)}
              className={`px-1 py-1 whitespace-nowrap ${
                leaderFilter === ldr.id
                  ? "bg-black text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              {ldr.name}
            </Button>
          ))}
        </FreeScrollSlider>
      </div>

      <div>
        <FreeScrollSlider gap={4}>
          {filteredProjects.map((p) => (
            <ItemCardProject key={p.$id} data={p} onClick={onSelect} />
          ))}
        </FreeScrollSlider>
      </div>
    </div>
  );
};

export default ScreenSelectProject;
