"use client";

import React from "react";
import Skeleton from "../common/Skeleton";

const ConversationSkeleton: React.FC = () => {
    return (
        <div className="flex cursor-pointer items-center gap-3 rounded-lg p-2">
            <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2 w-2 rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default ConversationSkeleton;
