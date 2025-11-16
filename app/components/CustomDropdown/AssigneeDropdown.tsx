import React, { useEffect, useRef, useState } from "react";
import { AssigneeDropdownProps } from "@/app/types/Types";

export default function AssigneeDropdown({
  value,
  options,
  onChange,
}: AssigneeDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("mousedown", handleClick);
      return () => window.removeEventListener("mousedown", handleClick);
    }
    return undefined;
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-sm cursor-pointer w-full border border-black text-black rounded h-10 px-3 flex justify-between items-center"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">
          {value || "- Chọn hoặc bỏ trống -"}
        </span>
        <span className="ml-2 text-xs text-black/60">▾</span>
      </button>
      {open && (
        <ul
          className="absolute mt-1 bg-white border border-black rounded shadow w-full z-10 max-h-60 overflow-auto"
          role="listbox"
        >
          <li
            className="list-none m-0 p-2 text-black cursor-pointer hover:bg-blue-100"
            onClick={() => handleSelect("")}
            role="option"
            aria-selected={!value}
          >
            -- Bỏ chọn --
          </li>
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li
                key={opt}
                className="list-none m-0 cursor-pointer p-2 flex justify-between gap-2 text-black hover:bg-blue-100"
                onClick={() => handleSelect(opt)}
                role="option"
                aria-selected={selected}
              >
                <span>{opt}</span>
                {selected && <span>✓</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
