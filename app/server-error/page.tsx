/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ServerErrorContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("return") || "/";

    useEffect(() => {
        const checkServer = async () => {
            try {
                const response = await fetch(`/api/auth/refresh`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (response && response.status !== 500 && response.status !== 503) {
                    router.replace(returnUrl);
                }
            } catch (error) {
                console.log('[ServerError] Server still down');
            }
        };

        checkServer();
    }, [router, returnUrl]);

    return (
        <div className="fixed inset-0 bg-white">
            <img
                src="/images/500.webp"
                alt="Server Error"
                className="h-full w-full object-contain"
            />
        </div>
    );
};

const ServerErrorPage = () => {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 bg-white">
                <img
                    src="/images/500.webp"
                    alt="Server Error"
                    className="h-full w-full object-contain"
                />
            </div>
        }>
            <ServerErrorContent />
        </Suspense>
    );
};

export default ServerErrorPage;
