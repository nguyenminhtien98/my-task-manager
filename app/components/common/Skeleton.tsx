"use client";

import React from "react";
import { cn } from "../../utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
    return (
        <div
            className={cn("animate-pulse rounded bg-gray-200", className)}
            {...props}
        />
    );
};

export default Skeleton;
