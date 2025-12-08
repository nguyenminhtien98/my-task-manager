"use client";

import React from "react";
import Skeleton from "../common/Skeleton";

const TaskCardSkeleton: React.FC = () => {
    return (
        <div className="mb-[10px] rounded bg-white p-2 shadow">
            <div className="mb-1 flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <div className="flex gap-[5px]">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                </div>
            </div>

            <Skeleton className="mb-1 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-2/3" />

            <div className="mb-1 flex items-center gap-[5px]">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-10" />
            </div>

            <div className="flex items-center gap-[5px]">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
    );
};

export default TaskCardSkeleton;
