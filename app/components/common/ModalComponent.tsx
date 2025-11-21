"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiArrowLeft } from "react-icons/fi";
import { ModalProps } from "../../types/Types";
import Button from "./Button";

const TRANSITION_DURATION = 220;

const ModalComponent: React.FC<ModalProps> = ({
    isOpen,
    setIsOpen,
    title,
    children,
    panelClassName,
    onClose,
    showBackButton = false,
    onBack,
    backButtonContent,
    hiddenHeader = false,
}) => {
    const shouldShowBack = showBackButton && typeof onBack === "function";
    const [mounted, setMounted] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isVisible, setIsVisible] = useState(false);

    const closeModal = useCallback(() => {
        if (onClose) {
            onClose();
        } else {
            setIsOpen(false);
        }
    }, [onClose, setIsOpen]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeModal();
            }
        };
        window.addEventListener("keydown", handleKey);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", handleKey);
            document.body.style.overflow = "";
        };
    }, [closeModal, isOpen]);

    const panelClasses = useMemo(
        () =>
            `w-full ${panelClassName ?? "sm:max-w-md md:max-w-lg"} transform overflow-y-auto max-h-[95vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] rounded-2xl bg-white p-6 text-left shadow-xl transition-all duration-300`,
        [panelClassName]
    );

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            requestAnimationFrame(() => setIsVisible(true));
            return undefined;
        }
        setIsVisible(false);
        const timeout = window.setTimeout(() => setShouldRender(false), TRANSITION_DURATION);
        return () => window.clearTimeout(timeout);
    }, [isOpen]);

    if (!mounted || !shouldRender) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
                onClick={closeModal}
                aria-hidden="true"
            />
            <div
                className="relative z-[1000] flex min-h-full w-full items-center justify-center overflow-y-auto p-4 text-center"
                onClick={closeModal}
            >
                <div
                    className={`${panelClasses} ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"} transition-all duration-200`}
                    role="dialog"
                    aria-modal="true"
                    onClick={(event) => event.stopPropagation()}
                >
                    {!hiddenHeader && (
                        <div className="mb-4 flex items-center justify-between gap-4">
                            {shouldShowBack ? (
                                <button
                                    type="button"
                                    onClick={() => onBack && onBack()}
                                    className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-lg text-sub hover:bg-black/20"
                                    aria-label="Quay lại"
                                >
                                    {backButtonContent ?? <FiArrowLeft />}
                                </button>
                            ) : (
                                <span className="h-9 w-9" />
                            )}
                            <h2 className="flex-1 text-center text-lg font-semibold text-gray-900">{title}</h2>
                            <Button
                                onClick={closeModal}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-xl text-sub hover:bg-black/20"
                                aria-label="Đóng"
                            >
                                ×
                            </Button>
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ModalComponent;
