"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export const ServerErrorHandler = () => {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleServerError = (event: Event) => {
            const customEvent = event as CustomEvent<{ returnPath: string }>;
            const returnPath = customEvent.detail?.returnPath || pathname;

            router.replace(`/server-error?return=${encodeURIComponent(returnPath)}`);
        };

        window.addEventListener("server-error", handleServerError);

        return () => {
            window.removeEventListener("server-error", handleServerError);
        };
    }, [router, pathname]);

    return null;
};
