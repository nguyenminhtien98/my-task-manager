"use client";

import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  FieldNamesMarkedBoolean,
  SubmitHandler,
  UseFormHandleSubmit,
  UseFormRegister,
} from "react-hook-form";
import {
  CreateTaskFormValues,
  TaskDetailFormValues,
  Task,
  Project,
  IssueType,
  Priority,
} from "../types/Types";
import IssueTypeDropdown from "./CutomDropdown/IssueTypeDropdown";
import PriorityDropdown from "./CutomDropdown/PriorityDropdown";
import AssigneeDropdown from "./CutomDropdown/AssigneeDropdown";
import LeaderAssigneeOptions from "./LeaderAssigneeOptions";

interface TaskModalLeftPanelProps {
  mode: "create" | "detail";
  handleSubmit: UseFormHandleSubmit<CreateTaskFormValues & Partial<TaskDetailFormValues>>;
  onSubmitCreate: SubmitHandler<CreateTaskFormValues>;
  onSubmitDetail: SubmitHandler<TaskDetailFormValues>;
  register: UseFormRegister<CreateTaskFormValues & Partial<TaskDetailFormValues>>;
  errors: FieldErrors<CreateTaskFormValues & Partial<TaskDetailFormValues>>;
  control: Control<CreateTaskFormValues & Partial<TaskDetailFormValues>>;
  isLeader: boolean;
  currentProject: Project | null;
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
  dirtyFields: FieldNamesMarkedBoolean<CreateTaskFormValues & Partial<TaskDetailFormValues>>;
  isTaken: boolean;
  task: Task | null;
}

const TaskModalLeftPanel: React.FC<TaskModalLeftPanelProps> = ({
  mode,
  handleSubmit,
  onSubmitCreate,
  onSubmitDetail,
  register,
  errors,
  control,
  isLeader,
  currentProject,
  existingUsers,
  userName,
  handleAddMember,
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
}) => {
  return (
    <form
      onSubmit={handleSubmit(mode === "create" ? onSubmitCreate : onSubmitDetail)}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-semibold text-sub">Tiêu đề</label>
        <input
          placeholder="Nhập tiêu đề"
          {...register("title", { required: "Tiêu đề không được để trống" })}
          disabled={mode === "detail"}
          className="mt-1 w-full rounded border border-gray-600 bg-white p-2 text-black"
        />
        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-sub">Nội dung chi tiết</label>
        <textarea
          placeholder="Mô tả chi tiết"
          {...register("description", { required: "Nội dung không được để trống" })}
          disabled={mode === "detail"}
          className="mt-1 w-full rounded border border-gray-600 bg-white p-2 text-black"
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
      </div>

      {showAttachmentSection && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => document.getElementById("task-media-input")?.click()}
            className="text-sm font-semibold text-black underline hover:cursor-pointer"
          >
            Đính kèm hình ảnh{selectedFiles.length > 0 ? ":" : ""}
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
                    title="Xóa ảnh"
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
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold text-sub">Issue Type</label>
          <Controller
            control={control}
            name="issueType"
            render={({ field }) => (
              <IssueTypeDropdown
                value={field.value!}
                onChange={(v) => field.onChange(v as IssueType)}
                disabled={mode === "detail"}
              />
            )}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold text-sub">Priority</label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <PriorityDropdown
                value={field.value!}
                onChange={(v) => field.onChange(v as Priority)}
                disabled={mode === "detail"}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-sub">Người thực hiện</label>
          {mode === "create" ? (
            isLeader ? (
              currentProject && (
                !currentProject.members || currentProject.members.length === 0 ? (
                  <LeaderAssigneeOptions
                    leaderName={userName}
                    onMemberAdded={handleAddMember}
                    existingUsers={existingUsers}
                  />
                ) : (
                  <Controller
                    control={control}
                    name="assignee"
                    render={({ field }) => (
                      <AssigneeDropdown
                        value={field.value!}
                        options={[userName, ...currentProject.members!]}
                        onChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                )
              )
            ) : (
              <input
                value={userName}
                disabled
                className="w-full rounded border border-gray-600 bg-gray-100 p-2 text-black"
              />
            )
          ) : (
            <input
              {...register("assignee")}
              disabled
              placeholder="Chưa set"
              className="w-full rounded border border-gray-600 bg-gray-100 p-2 text-black"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-sub">Giờ dự kiến (h)</label>
          <input
            type="number"
            placeholder="Số giờ"
            {...register("predictedHours", {
              required:
                (mode === "create" && !isLeader) ||
                  (mode === "detail" && isTaken)
                  ? "Phải nhập giờ dự kiến"
                  : false,
              valueAsNumber: true,
            })}
            disabled={
              mode === "detail"
                ? (!isTaken || task?.status === "completed")
                : false
            }
            className="mt-1 w-full rounded border border-gray-600 bg-white p-2 text-black"
          />
          {errors.predictedHours && (
            <p className="text-red-500 text-sm">{errors.predictedHours.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-sub">Ngày bắt đầu</label>
          <input
            type="date"
            {...register("startDate", {
              required:
                (mode === "create" && !isLeader) ||
                  (mode === "detail" && isTaken)
                  ? "Phải chọn ngày bắt đầu"
                  : false,
            })}
            disabled={
              mode === "detail"
                ? (!isTaken || task?.status === "completed")
                : false
            }
            className="mt-1 w-full rounded border border-gray-600 bg-white p-2 text-black"
          />
          {errors.startDate && (
            <p className="text-red-500 text-sm">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-sub">Ngày kết thúc</label>
          <input
            type="date"
            {...register("endDate", {
              required:
                (mode === "create" && !isLeader) ||
                  (mode === "detail" && isTaken)
                  ? "Phải chọn ngày kết thúc"
                  : false,
            })}
            disabled={
              mode === "detail"
                ? (!isTaken || task?.status === "completed")
                : false
            }
            className="mt-1 w-full rounded border border-gray-600 bg-white p-2 text-black"
          />
          {errors.endDate && (
            <p className="text-red-500 text-sm">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        {showReceiveButton ? (
          <button
            type="button"
            onClick={handleReceive}
            className="cursor-pointer rounded bg-green-500 px-4 py-2 text-white"
          >
            Nhận Task
          </button>
        ) : (
          ((mode === "create") || (mode === "detail" && Object.keys(dirtyFields).length > 0)) && (
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={`rounded px-4 py-2 text-white ${isSubmitting || !isValid
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                }`}
            >
              {isSubmitting
                ? mode === "create"
                  ? "Đang tạo..."
                  : "Đang lưu..."
                : mode === "create"
                  ? "Tạo"
                  : "Lưu"}
            </button>
          )
        )}
      </div>
    </form>
  );
};

export default TaskModalLeftPanel;
