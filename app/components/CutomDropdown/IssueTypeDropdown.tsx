import { Listbox } from '@headlessui/react';
import { Fragment } from 'react';
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

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <Listbox.Button
                    disabled={disabled}
                    className={`w-full border border-gray-300 rounded p-2 flex items-center gap-2 ${className} ${disabled ? 'cursor-not-allowed' : ''
                        }`}
                >
                    {selected.icon} {selected.label}
                </Listbox.Button>
                {!disabled && (
                    <Listbox.Options className="absolute mt-1 bg-white border border-gray-300 rounded shadow w-full z-10">
                        {issueTypes.map((p) => (
                            <Listbox.Option key={p.label} value={p.label} as={Fragment}>
                                {({ active }) => (
                                    <li
                                        className={`cursor-pointer p-2 flex items-center gap-2 ${active ? 'bg-blue-100' : ''
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
