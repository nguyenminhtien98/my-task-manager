import React, { useEffect, useRef, useState } from 'react';
import { IoBugOutline } from 'react-icons/io5';
import { FaLightbulb, FaStar } from 'react-icons/fa6';

export interface IssueTypeDropdownProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    className?: string;
}

const issueTypes = [
    { label: 'Bug', icon: <IoBugOutline className="text-red-500" /> },
    { label: 'Improvement', icon: <FaLightbulb className="text-green-500" /> },
    { label: 'Feature', icon: <FaStar className="text-blue-500" /> },
];

export default function IssueTypeDropdown({
    value,
    onChange,
    disabled = false,
    className = "",
}: IssueTypeDropdownProps) {
    const selected = issueTypes.find((p) => p.label === value) || issueTypes[1];

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
                    {issueTypes.map((p) => (
                        <li
                            key={p.label}
                            onClick={() => handleSelect(p.label)}
                            className="cursor-pointer p-2 flex items-center gap-2 text-black hover:bg-blue-100"
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
