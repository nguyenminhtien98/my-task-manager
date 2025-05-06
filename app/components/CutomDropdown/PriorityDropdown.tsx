import { Listbox } from '@headlessui/react';
import { FcHighPriority, FcMediumPriority, FcLowPriority } from 'react-icons/fc';
import { Fragment } from 'react';

const priorities = [
    { label: 'High', icon: <FcHighPriority /> },
    { label: 'Medium', icon: <FcMediumPriority /> },
    { label: 'Low', icon: <FcLowPriority /> },
];

export default function PriorityDropdown({ value, onChange }: {
    value: string,
    onChange: (val: string) => void
}) {
    const selected = priorities.find(p => p.label === value) || priorities[1];

    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <Listbox.Button className="w-full border rounded p-2 flex items-center gap-2">
                    {selected.icon} {selected.label}
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 bg-white border rounded shadow w-full z-10">
                    {priorities.map((p) => (
                        <Listbox.Option key={p.label} value={p.label} as={Fragment}>
                            {({ active }) => (
                                <li
                                    className={`cursor-pointer p-2 flex items-center gap-2 ${active ? 'bg-blue-100' : ''}`}
                                >
                                    {p.icon} {p.label}
                                </li>
                            )}
                        </Listbox.Option>
                    ))}
                </Listbox.Options>
            </div>
        </Listbox>
    );
}
