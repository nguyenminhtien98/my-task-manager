"use client";

import React from "react";
import Skeleton from "@/app/components/common/Skeleton";

const ProjectCardSkeleton: React.FC = () => {
    return (
        <div className="block w-[130px] flex-shrink-0 rounded-lg border border-black/10 bg-transparent">
            <Skeleton className="h-16 w-full rounded-t-lg rounded-b-none" />
            <div className="rounded-b-lg bg-black/60 p-2">
                <Skeleton className="h-4 w-3/4 bg-gray-400" />
            </div>
        </div>
    );
};

export default ProjectCardSkeleton;
