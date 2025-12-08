"use client";

import React from "react";
import Skeleton from "../common/Skeleton";

const ProjectMembersSkeleton: React.FC = () => {
    return (
        <div className="flex items-center">
            {[1, 2, 3].map((_, index) => (
                <div
                    key={index}
                    className={`relative flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-white bg-white ${index > 0 ? "-ml-1" : ""
                        }`}
                    style={{ zIndex: 3 - index }}
                >
                    <Skeleton className="h-full w-full rounded-full" />
                </div>
            ))}
        </div>
    );
};

export default ProjectMembersSkeleton;
