import { AssigneeDropdownProps } from '@/app/types/Types';
import { Listbox } from '@headlessui/react';
import { Fragment } from 'react';

export default function AssigneeDropdown({ value, options, onChange }: AssigneeDropdownProps) {
    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <Listbox.Button className="cursor-pointer w-full border border-gray-300 rounded p-2 flex justify-between items-center">
                    {value || '- Chọn hoặc bỏ trống -'}
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 bg-white border border-gray-300 rounded shadow w-full z-10">
                    <Listbox.Option key="none" value="" as={Fragment}>
                        {({ active }) => (
                            <li className={`p-2 ${active ? 'bg-blue-100' : ''}`}>-- Bỏ chọn --</li>
                        )}
                    </Listbox.Option>
                    {options.map((opt) => (
                        <Listbox.Option key={opt} value={opt} as={Fragment}>
                            {({ active, selected }) => (
                                <li className={`cursor-pointer p-2 flex justify-between gap-2 ${active ? 'bg-blue-100' : ''}`}>
                                    {opt} {selected && <span>✓</span>}
                                </li>
                            )}
                        </Listbox.Option>
                    ))}
                </Listbox.Options>
            </div>
        </Listbox>
    );
}
