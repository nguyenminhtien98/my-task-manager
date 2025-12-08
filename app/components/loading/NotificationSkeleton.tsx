"use client";

import React from "react";
import Skeleton from "../common/Skeleton";

const NotificationSkeleton: React.FC = () => {
  return (
    <div className="flex w-full items-start gap-3 rounded-lg px-3 py-2">
      <div className="flex-shrink-0">
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="flex h-full w-3 items-center justify-center">
        <Skeleton className="h-2.5 w-2.5 rounded-full" />
      </div>
    </div>
  );
};

export default NotificationSkeleton;
