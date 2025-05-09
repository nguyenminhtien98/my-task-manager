"use client";

import React, { useState } from "react";
import { LeaderAssigneeOptionsProps } from "../types/taskTypes";

const LeaderAssigneeOptions: React.FC<LeaderAssigneeOptionsProps> = ({ leaderName, onMemberAdded, existingUsers }) => {
    const [choice, setChoice] = useState<"add" | "noadd" | undefined>(undefined);
    const [newMember, setNewMember] = useState("");
    const [error, setError] = useState("");

    const handleAddClick = () => {
        setError("");
        if (newMember.trim() === "") return;
        if (!existingUsers.includes(newMember.trim())) {
            setError("Tên người dùng không tồn tại");
            return;
        }
        onMemberAdded(newMember.trim());
        setNewMember("");
    };

    return (
        <div>
            {choice !== "add" && choice !== "noadd" && (
                <div>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="leaderChoice"
                            value="add"
                            checked={choice === "add"}
                            onChange={() => {
                                setChoice("add");
                                setError("");
                            }}
                        />
                        <span className="ml-1">Thêm thành viên</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="leaderChoice"
                            value="noadd"
                            checked={choice === "noadd"}
                            onChange={() => setChoice("noadd")}
                        />
                        <span className="ml-1">Không thêm</span>
                    </label>
                </div>
            )}

            {choice === "add" && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Nhập tên thành viên"
                            value={newMember}
                            onChange={(e) => setNewMember(e.target.value)}
                            className="w-[75%] p-2 border border-gray-300 rounded"
                        />
                        <button
                            type="button"
                            disabled={newMember.trim() === ""}
                            onClick={handleAddClick}
                            className="px-2 cursor-pointer py-2 bg-blue-600 text-white rounded"
                        >
                            Thêm
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
            )}
            {choice === "noadd" && (
                <div>
                    <input
                        type="text"
                        value={leaderName}
                        disabled
                        className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                    />
                </div>
            )}
        </div>
    );
};

export default LeaderAssigneeOptions;
