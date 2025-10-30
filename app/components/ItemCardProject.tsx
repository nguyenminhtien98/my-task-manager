"use client";

import React from "react";
import { Project } from "../types/Types";

interface ItemCardProjectProps {
  data: Project;
  onClick?: (project: Project) => void;
}

const ItemCardProject: React.FC<ItemCardProjectProps> = ({ data, onClick }) => {
  const gradient =
    data.themeColor ??
    "linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #a1c4fd 100%)";
  return (
    <button
      type="button"
      onClick={() => onClick?.(data)}
      className="group block w-[130px] transform rounded-lg border border-black/10 bg-transparent text-left transition-all hover:-translate-y-[2px] hover:shadow-md focus:outline-none"
      style={{ cursor: "pointer" }}
    >
      <div className="relative h-16 w-full overflow-hidden rounded-t-lg">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: gradient,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="rounded-b-lg bg-black/60 p-2">
        <div className="truncate text-xs font-medium text-white">
          {data.name}
        </div>
      </div>
    </button>
  );
};

export default ItemCardProject;
