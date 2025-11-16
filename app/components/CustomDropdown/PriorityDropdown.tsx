import React, { useEffect, useRef, useState } from 'react';
import { FcHighPriority, FcMediumPriority, FcLowPriority } from 'react-icons/fc';

export interface PriorityDropdownProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    className?: string;
}

const priorities = [
    { label: 'High', icon: <FcHighPriority /> },
    { label: 'Medium', icon: <FcMediumPriority /> },
    { label: 'Low', icon: <FcLowPriority /> },
];

export default function PriorityDropdown({
    value,
    onChange,
    disabled = false,
    className = "",
}: PriorityDropdownProps) {
    const selected = priorities.find((p) => p.label === value) || priorities[1];

    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return undefined;
        const handleClick = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };
        window.addEventListener("mousedown", handleClick);
        return () => window.removeEventListener("mousedown", handleClick);
    }, [open]);

    const handleSelect = (next: string) => {
        onChange(next);
        setOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((prev) => !prev)}
                className={`w-full border border-black text-black rounded p-2 flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {selected.icon} {selected.label}
                <span className="ml-auto text-xs text-black/60">▾</span>
            </button>
            {!disabled && open && (
                <ul
                    className="absolute mt-1 bg-white border border-black rounded shadow w-full z-10"
                    role="listbox"
                >
                    {priorities.map((p) => (
                        <li
                            key={p.label}
                            onClick={() => handleSelect(p.label)}
                            className="cursor-pointer text-black p-2 flex items-center gap-2 hover:bg-blue-100"
                            role="option"
                            aria-selected={p.label === value}
                        >
                            {p.icon} {p.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
