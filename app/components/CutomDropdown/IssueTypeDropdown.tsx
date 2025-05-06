import { Listbox } from '@headlessui/react';
import { Fragment } from 'react';
import { IoBugOutline } from 'react-icons/io5';
import { FaLightbulb, FaStar } from 'react-icons/fa6';

const priorities = [
  { label: 'Bug', icon: <IoBugOutline className="text-red-500" /> },
  { label: 'Improvement', icon: <FaLightbulb className = "text-green-500" /> },
  { label: 'Feature', icon: <FaStar className="text-blue-500" /> },
];

export default function IssueTypeDropdown({ value, onChange }: {
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
