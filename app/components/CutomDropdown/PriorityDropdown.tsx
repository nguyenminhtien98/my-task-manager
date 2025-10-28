import { Listbox } from '@headlessui/react';
import { FcHighPriority, FcMediumPriority, FcLowPriority } from 'react-icons/fc';
import { Fragment } from 'react';

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

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <Listbox.Button
                    disabled={disabled}
                    className={`w-full border border-black text-black rounded p-2 flex items-center gap-2 ${className} ${disabled ? 'cursor-not-allowed' : ''
                        }`}
                >
                    {selected.icon} {selected.label}
                </Listbox.Button>
                {!disabled && (
                    <Listbox.Options className="absolute mt-1 bg-white border border-black rounded shadow w-full z-10">
                        {priorities.map((p) => (
                            <Listbox.Option key={p.label} value={p.label} as={Fragment}>
                                {({ active }) => (
                                    <li
                                        className={`cursor-pointer text-black p-2 flex items-center gap-2 ${active ? 'bg-blue-100' : ''
                                            }`}
                                    >
                                        {p.icon} {p.label}
                                    </li>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                )}
            </div>
        </Listbox>
    );
}
