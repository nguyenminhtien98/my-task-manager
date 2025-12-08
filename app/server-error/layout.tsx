import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "Server Error - My Task Manager",
    description: "Server is currently unavailable",
};

export default function ServerErrorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
