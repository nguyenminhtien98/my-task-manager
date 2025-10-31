"use client";

import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  FieldNamesMarkedBoolean,
  UseFormRegister,
} from "react-hook-form";
import type { BaseSyntheticEvent } from "react";
import {
  CreateTaskFormValues,
  TaskDetailFormValues,
  IssueType,
  Priority,
  Task,
} from "../../../types/Types";
import IssueTypeDropdown from "../../CustomDropdown/IssueTypeDropdown";
import PriorityDropdown from "../../CustomDropdown/PriorityDropdown";
import { useProjectOperations } from "@/app/hooks/useProjectOperations";
import { database } from "@/app/appwrite";
import toast from "react-hot-toast";
import Button from "../../common/Button";

interface TaskModalLeftPanelProps {
  mode: "create" | "detail";
  onSubmit: (event?: BaseSyntheticEvent) => void | Promise<void>;
  register: UseFormRegister<
    CreateTaskFormValues & Partial<TaskDetailFormValues>
  >;
  errors: FieldErrors<CreateTaskFormValues & Partial<TaskDetailFormValues>>;
  control: Control<CreateTaskFormValues & Partial<TaskDetailFormValues>>;
  isLeader: boolean;
  currentProject: unknown;
  existingUsers: string[];
  userName: string;
  handleAddMember: (memberName: string) => Promise<void>;
  selectedFiles: File[];
  selectedFileNames: string[];
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (name: string) => void;
  showAttachmentSection: boolean;
  showReceiveButton: boolean;
  handleReceive: (event: React.MouseEvent) => void;
  isSubmitting: boolean;
  isValid: boolean;
  dirtyFields: FieldNamesMarkedBoolean<
    CreateTaskFormValues & Partial<TaskDetailFormValues>
  >;
  isTaken: boolean;
  task: Task | null;
  onUpdate?: (task: Task) => void;
  reset?: (
    values?: Partial<CreateTaskFormValues & Partial<TaskDetailFormValues>>
  ) => void;
}

const TaskModalLeftPanel: React.FC<TaskModalLeftPanelProps> = ({
  mode,
  onSubmit,
  register,
  errors,
  control,
  isLeader,
  userName,
  selectedFiles,
  selectedFileNames,
  handleFileChange,
  handleRemoveFile,
  showAttachmentSection,
  showReceiveButton,
  handleReceive,
  isSubmitting,
  isValid,
  dirtyFields,
  isTaken,
  task,
  onUpdate,
  reset,
}) => {
  const { members, isLoading: isMembersLoading } = useProjectOperations();
  const memberNames = React.useMemo(
    () => members.map((m) => m.name),
    [members]
  );
  const assigneeOptions = React.useMemo(() => memberNames, [memberNames]);

  const hasAssignee = React.useMemo(() => {
    const a = task?.assignee as unknown;
    if (!a) return false;
    if (typeof a === "string")
      return a.trim() !== "" && a.trim().toLowerCase() !== "null";
    if (typeof a === "object") {
      const obj = a as { $id?: string; name?: string };
      return Boolean(
        (obj.$id && obj.$id.trim() !== "") ||
          (obj.name && obj.name.trim() !== "")
      );
    }
    return false;
  }, [task?.assignee]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-sub">Tiêu đề</label>
        <input
          placeholder="Nhập tiêu đề"
          {...register("title", { required: "Tiêu đề không được để trống" })}
          disabled={mode === "detail"}
          className="mt-1 w-full rounded border border-black bg-white p-2 text-black"
        />
        {errors.title && (
          <p className="text-red-500 text-sm">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-sub">
          Nội dung chi tiết
        </label>
        <textarea
          placeholder="Mô tả chi tiết"
          {...register("description", {
            required: "Nội dung không được để trống",
          })}
          disabled={mode === "detail"}
          className="mt-1 w-full rounded border border-black bg-white p-2 text-black"
        />
        {errors.description && (
          <p className="text-red-500 text-sm">{errors.description.message}</p>
        )}
      </div>

      {showAttachmentSection && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => document.getElementById("task-media-input")?.click()}
            className="text-sm font-semibold text-sub underline hover:cursor-pointer"
          >
            Đính kèm tệp tin{selectedFiles.length > 0 ? ":" : ""}
          </button>
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedFileNames.map((name) => (
                <span
                  key={name}
                  className="group relative inline-flex items-center rounded bg-gray-200 px-2 py-1 text-sm text-gray-700"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(name)}
                    className="ml-2 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex hover:bg-black"
                    title="Xóa tệp"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id="task-media-input"
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold text-sub">
            Issue Type
          </label>
          <Controller
            control={control}
            name="issueType"
            render={({ field }) => (
              <IssueTypeDropdown
                value={(field.value as IssueType) ?? "Feature"}
                onChange={(v: string) => field.onChange(v as IssueType)}
                disabled={mode === "detail"}
              />
            )}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold text-sub">
            Priority
          </label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <PriorityDropdown
                value={(field.value as Priority) ?? "Medium"}
                onChange={(v: string) => field.onChange(v as Priority)}
                disabled={mode === "detail"}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-sub">
            Người thực hiện
          </label>
          {mode === "create" ? (
            isLeader ? (
              <Controller
                control={control}
                name="assignee"
                render={({ field }) =>
                  isMembersLoading ? (
                    <div className="text-sm text-gray-600">
                      Đang tải thành viên...
                    </div>
                  ) : assigneeOptions.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Chưa có thành viên nào.
                    </div>
                  ) : (
                    <select
                      value={typeof field.value === "string" ? field.value : ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full h-10 rounded border border-black bg-white px-3 text-black"
                    >
                      <option value="">-- Bỏ chọn --</option>
                      {assigneeOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  )
                }
              />
            ) : (
              <input
                {...register("assignee")}
                value={userName}
                disabled
                className="w-full h-10 rounded border border-black bg-gray-100 px-3 text-black"
              />
            )
          ) : isLeader && !hasAssignee ? (
            <Controller
              control={control}
              name="assignee"
              render={({ field }) =>
                isMembersLoading ? (
                  <div className="text-sm text-gray-600">
                    Đang tải thành viên...
                  </div>
                ) : assigneeOptions.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    Chưa có thành viên nào.
                  </div>
                ) : (
                  <select
                    value={typeof field.value === "string" ? field.value : ""}
                    onChange={async (e) => {
                      const name = e.target.value;
                      const member = members.find((m) => m.name === name);
                      if (!member || !task) return;
                      try {
                        await database.updateDocument(
                          String(process.env.NEXT_PUBLIC_DATABASE_ID),
                          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
                          task.id,
                          { assignee: member.$id }
                        );

                        const enrichedTask: Task = {
                          ...task,
                          assignee: {
                            $id: member.$id,
                            name: member.name,
                            email: member.email,
                            avatarUrl: member.avatarUrl,
                          },
                        };

                        field.onChange(name);

                        if (typeof reset === "function") {
                          reset({
                            ...enrichedTask,
                            startDate: enrichedTask?.startDate ?? "",
                            endDate: enrichedTask?.endDate ?? "",
                          });
                        }

                        if (typeof onUpdate === "function") {
                          onUpdate(enrichedTask);
                        } else {
                          console.warn("");
                        }

                        toast.success("Đã gán thành viên cho task");
                      } catch (err) {
                        console.error(err);
                        toast.error("Gán thành viên thất bại");
                      }
                    }}
                    className="w-full h-10 rounded border border-black bg-white px-3 text-black"
                  >
                    <option value="">-- Bỏ chọn --</option>
                    {assigneeOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                )
              }
            />
          ) : (
            <input
              {...register("assignee.name")}
              disabled
              placeholder="Chưa set"
              className="w-full rounded border border-black bg-gray-100 p-2 text-black"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-sub">
            Giờ dự kiến (h)
          </label>
          <input
            type="number"
            placeholder="Số giờ"
            {...register("predictedHours", {
              valueAsNumber: true,
            })}
            disabled={
              mode === "detail"
                ? !isTaken || task?.status === "completed"
                : false
            }
            className="mt-1 w-full rounded border border-black bg-white p-2 text-black"
          />
          {errors.predictedHours && (
            <p className="text-red-500 text-sm">
              {errors.predictedHours.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-sub">
            Ngày bắt đầu
          </label>
          <input
            type="date"
            {...register("startDate", {})}
            disabled={
              mode === "detail"
                ? !isTaken || task?.status === "completed"
                : false
            }
            className="mt-1 w-full rounded border border-black bg-white p-2 text-black"
          />
          {errors.startDate && (
            <p className="text-red-500 text-sm">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-sub">
            Ngày kết thúc
          </label>
          <input
            type="date"
            {...register("endDate", {})}
            disabled={
              mode === "detail"
                ? !isTaken || task?.status === "completed"
                : false
            }
            className="mt-1 w-full rounded border border-black bg-white p-2 text-black"
          />
          {errors.endDate && (
            <p className="text-red-500 text-sm">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        {showReceiveButton ? (
          <Button
            onClick={handleReceive}
            className="rounded bg-green-500 px-4 py-2 text-white"
          >
            Nhận Task
          </Button>
        ) : (
          (mode === "create" ||
            (mode === "detail" &&
              Object.keys(dirtyFields).filter((k) => k !== "assignee").length >
                0)) && (
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={`rounded px-4 py-2 text-white ${
                isSubmitting || !isValid
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-black"
              }`}
            >
              {isSubmitting
                ? mode === "create"
                  ? "Đang tạo..."
                  : "Đang lưu..."
                : mode === "create"
                ? "Tạo"
                : "Lưu"}
            </Button>
          )
        )}
      </div>
    </form>
  );
};

export default TaskModalLeftPanel;
