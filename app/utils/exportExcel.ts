import type {
  BasicProfile,
  Project,
  Task,
  TaskStatus,
} from "../types/Types";
import { saveAs } from "file-saver";

const STATUS_ORDER: TaskStatus[] = [
  "list",
  "doing",
  "done",
  "completed",
  "bug",
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  list: "LIST",
  doing: "DOING",
  done: "DONE",
  completed: "COMPLETED",
  bug: "BUG",
};

interface ExportProjectBoardArgs {
  project: Project;
  members: BasicProfile[];
  tasks: Task[];
}

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa set";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  return `${startLabel} - ${endLabel}`;
};

const resolveAssigneeName = (assignee: Task["assignee"]) => {
  if (!assignee) return "Chưa set";
  if (typeof assignee === "string") {
    return assignee.trim() || "Chưa set";
  }
  if (typeof assignee === "object" && "name" in assignee) {
    return assignee.name || "Chưa set";
  }
  return "Chưa set";
};

const extractAttachmentNames = (task: Task) => {
  const files = (task.attachedFile ?? [])
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return item;
      if (typeof item === "object" && "name" in item) {
        return item.name as string;
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
  return files.length ? files.join(", ") : "Không có";
};

const buildTaskCellValue = (task: Task) => {
  const fields = [
    `Tiêu đề: ${task.title}`,
    `Nội dung: ${task.description || "Không có"}`,
    `File đính kèm: ${extractAttachmentNames(task)}`,
    `Phân loại: ${task.issueType}`,
    `Mức độ: ${task.priority}`,
    `Người thực hiện: ${resolveAssigneeName(task.assignee)}`,
    `Giờ dự kiến: ${task.predictedHours ?? 0}h`,
    `Thời gian: ${formatTimeRange(task.startDate, task.endDate)}`,
  ];
  return fields.join("\n");
};

const sanitizeFileName = (name: string) => {
  const normalized = name.trim().toLowerCase();
  const safe = normalized
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "project";
};

const estimateRowHeight = (values: string[]) => {
  const maxLines = values.reduce((max, value) => {
    if (!value) return Math.max(max, 1);
    const lines = value.split("\n").length;
    return Math.max(max, lines);
  }, 1);
  const baseHeight = 16;
  const estimated = maxLines * baseHeight + 4;
  return Math.min(Math.max(estimated, 22), 320);
};

export const exportProjectBoardToExcel = async ({
  project,
  members,
  tasks,
}: ExportProjectBoardArgs) => {
  if (typeof window === "undefined") {
    throw new Error("Excel export chỉ khả dụng trên client.");
  }

  const { Workbook } = await import("exceljs");

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Project Board");
  worksheet.columns = STATUS_ORDER.map(() => ({ width: 35 }));

  const addFullWidthRow = (text: string, isBold = false) => {
    const row = worksheet.addRow([text]);
    worksheet.mergeCells(row.number, 1, row.number, STATUS_ORDER.length);
    const cell = row.getCell(1);
    cell.font = { bold: isBold, size: isBold ? 13 : 11 };
    cell.alignment = { vertical: "middle", wrapText: true };
    return row;
  };

  addFullWidthRow(`Tên dự án: ${project.name}`, true);
  addFullWidthRow(`Leader: ${project.leader?.name ?? "Không xác định"}`);

  const memberNames = members
    .filter((member) => member.$id !== project.leader?.$id)
    .map((member) => member.name)
    .join(", ");
  addFullWidthRow(
    `Thành viên: ${memberNames || "Chưa có thành viên nào"}`,
    false
  );

  addFullWidthRow(`Tổng công việc: ${tasks.length}`, false);
  worksheet.addRow([""]);

  const headerRow = worksheet.addRow(
    STATUS_ORDER.map((status) => STATUS_LABELS[status])
  );
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      left: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
      right: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  });
  headerRow.height = 24;

  const groupedTasks: Record<TaskStatus, Task[]> = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks
        .filter((task) => task.status === status)
        .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  const maxRows = Math.max(
    0,
    ...STATUS_ORDER.map((status) => groupedTasks[status].length)
  );

  for (let i = 0; i < maxRows; i += 1) {
    const rowValues = STATUS_ORDER.map((status) => {
      const task = groupedTasks[status][i];
      return task ? buildTaskCellValue(task) : "";
    });
    const row = worksheet.addRow(rowValues);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
    row.height = estimateRowHeight(rowValues);
  }

  const countRow = worksheet.addRow(
    STATUS_ORDER.map(
      (status) => `${STATUS_LABELS[status]}: ${groupedTasks[status].length} task`
    )
  );
  countRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      left: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
      right: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = sanitizeFileName(project.name || "project");
  const fileName = `${safeName}-board.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );
};
