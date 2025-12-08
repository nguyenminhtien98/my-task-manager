"use client";

import React from "react";
import Skeleton from "../common/Skeleton";

const DailyReportSkeleton: React.FC = () => {
    return (
        <article className="flex w-fit max-w-4xl flex-wrap items-start gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 shadow-lg shadow-black/50">
            <div className="flex-shrink-0">
                <Skeleton className="h-10 w-10 rounded-full bg-white/20" />
            </div>
            <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-3">
                    <Skeleton className="h-4 w-32 bg-white/20" />
                    <Skeleton className="h-3 w-20 bg-white/20" />
                </div>
                <div className="mt-2 space-y-2">
                    <Skeleton className="h-4 w-full bg-white/20" />
                    <Skeleton className="h-4 w-3/4 bg-white/20" />
                </div>
            </div>
        </article>
    );
};

export default DailyReportSkeleton;
