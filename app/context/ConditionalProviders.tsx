"use client";

import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "./AuthContext";
import { SocketProvider } from "./SocketContext";
import { ProjectProvider } from "./ProjectContext";
import { ThemeProvider } from "./ThemeContext";
import { FeedbackChatProvider } from "./FeedbackChatContext";
import { TaskFilterProvider } from "./TaskFilterContext";

interface ConditionalProvidersProps {
    children: ReactNode;
}

export const ConditionalProviders: React.FC<ConditionalProvidersProps> = ({
    children,
}) => {
    const pathname = usePathname();
    const isServerErrorPage = pathname?.startsWith("/server-error");

    if (isServerErrorPage) {
        return <>{children}</>;
    }

    return (
        <AuthProvider>
            <SocketProvider>
                <ProjectProvider>
                    <ThemeProvider>
                        <FeedbackChatProvider>
                            <TaskFilterProvider>
                                {children}
                            </TaskFilterProvider>
                        </FeedbackChatProvider>
                    </ThemeProvider>
                </ProjectProvider>
            </SocketProvider>
        </AuthProvider>
    );
};
