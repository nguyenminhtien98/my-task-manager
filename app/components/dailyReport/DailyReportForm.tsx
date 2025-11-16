"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdStrikethroughS,
} from "react-icons/md";
import { LuList, LuListOrdered, LuAtSign } from "react-icons/lu";
import { FiSend } from "react-icons/fi";
import AvatarUser from "../common/AvatarUser";
import type {
  DailyReportToolbarState,
  MentionOption,
} from "../../hooks/useDailyReportRoom";
import { cn } from "../../utils/cn";
import FloatingDropdown from "../common/FloatingDropdown";
import LoadingSpinner from "../loading/LoadingSpinner";

interface DailyReportFormProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isDisabled: boolean;
  canSubmit: boolean;
  toolbarState: DailyReportToolbarState;
  onToggleFormat: (
    key: keyof DailyReportToolbarState,
    value?: boolean
  ) => void;
  onMentionTrigger: () => void;
  onMentionSelect: (id: string) => void;
  onMentionClose: () => void;
  isMentioning: boolean;
  mentionOptions: MentionOption[];
  isEditing: boolean;
  editingEntryName?: string;
  onCancelEdit: () => void;
  className?: string;
}

const DailyReportForm: React.FC<DailyReportFormProps> = ({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  isDisabled,
  canSubmit,
  toolbarState,
  onToggleFormat,
  onMentionTrigger,
  onMentionSelect,
  onMentionClose,
  isMentioning,
  mentionOptions,
  isEditing,
  editingEntryName,
  onCancelEdit,
  className,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const mentionButtonRef = useRef<HTMLButtonElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const mentionPlaceholderRef = useRef<string | null>(null);

  const updateToolbarFromDocument = useCallback(() => {
    const selection = window.getSelection();
    if (
      !selection ||
      !editorRef.current ||
      !editorRef.current.contains(selection.anchorNode)
    ) {
      return;
    }
    const commandPairs: Array<{
      key: keyof DailyReportToolbarState;
      command: string;
    }> = [
        { key: "bold", command: "bold" },
        { key: "italic", command: "italic" },
        { key: "underline", command: "underline" },
        { key: "strike", command: "strikeThrough" },
        { key: "ordered", command: "insertOrderedList" },
        { key: "bullet", command: "insertUnorderedList" },
      ];
    commandPairs.forEach(({ key, command }) => {
      let nextState = false;
      try {
        nextState = Boolean(document.queryCommandState(command));
      } catch {
        nextState = false;
      }
      onToggleFormat(key, nextState);
    });
  }, [onToggleFormat]);

  const syncContent = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;
    if ((editorRef.current.innerHTML || "") !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
    updateToolbarFromDocument();
  }, [updateToolbarFromDocument, value]);

  const clearMentionPlaceholder = useCallback(() => {
    const placeholderId = mentionPlaceholderRef.current;
    if (!placeholderId || !editorRef.current) {
      onMentionClose();
      return;
    }
    const placeholder = editorRef.current.querySelector(
      `span[data-mention-placeholder="${placeholderId}"]`
    );
    if (placeholder) {
      placeholder.replaceWith("");
      syncContent();
    }
    mentionPlaceholderRef.current = null;
    onMentionClose();
  }, [onMentionClose, syncContent]);

  useEffect(() => {
    if (isEditing) {
      editorRef.current?.focus();
    }
  }, [isEditing]);

  const placeholderText = "Nhập báo cáo...";

  const isEditorEmpty = useMemo(() => {
    if (!value) return true;
    const plain = value
      .replace(/<br\s*\/?>/gi, "")
      .replace(/&nbsp;/g, " ")
      .replace(/<div><\/div>/gi, "")
      .replace(/<div><br><\/div>/gi, "")
      .trim();
    return plain.length === 0;
  }, [value]);

  const toolbarConfigs = useMemo(
    () => [
      { key: "bold" as const, icon: <MdFormatBold />, label: "Đậm", command: "bold" },
      { key: "italic" as const, icon: <MdFormatItalic />, label: "Nghiêng", command: "italic" },
      {
        key: "underline" as const,
        icon: <MdFormatUnderlined />,
        label: "Gạch chân",
        command: "underline",
      },
      {
        key: "strike" as const,
        icon: <MdStrikethroughS />,
        label: "Gạch ngang",
        command: "strikeThrough",
      },
    ],
    []
  );

  const listConfigs = useMemo(
    () => [
      {
        key: "ordered" as const,
        icon: <LuListOrdered />,
        command: "insertOrderedList",
      },
    ],
    []
  );

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      !editorRef.current?.contains(selection.anchorNode)
    ) {
      return;
    }
    savedSelectionRef.current = selection.getRangeAt(0);
    updateToolbarFromDocument();
  }, [updateToolbarFromDocument]);

  useEffect(() => {
    document.addEventListener("selectionchange", saveSelection);
    return () => document.removeEventListener("selectionchange", saveSelection);
  }, [saveSelection]);

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    if (
      selection &&
      savedSelectionRef.current &&
      editorRef.current?.contains(savedSelectionRef.current.startContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
  }, []);

  const applyCommand = useCallback(
    (command: string) => {
      if (!editorRef.current || isDisabled) return;
      editorRef.current.focus();
      document.execCommand(command, false);
      syncContent();
      updateToolbarFromDocument();
    },
    [isDisabled, syncContent, updateToolbarFromDocument]
  );

  const applyDefaultBullet = useCallback(() => {
    if (!editorRef.current || isDisabled) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand("insertUnorderedList");
    syncContent();
    updateToolbarFromDocument();
  }, [isDisabled, restoreSelection, syncContent, updateToolbarFromDocument]);

  const handleMentionTriggerInternal = useCallback(() => {
    if (!editorRef.current || isDisabled) return;
    if (mentionPlaceholderRef.current) {
      clearMentionPlaceholder();
      return;
    }
    editorRef.current.focus();
    restoreSelection();
    const placeholderId = `mention-${Date.now()}`;
    document.execCommand(
      "insertHTML",
      false,
      `<span data-mention-placeholder="${placeholderId}" class="text-white">@</span>`
    );
    mentionPlaceholderRef.current = placeholderId;
    syncContent();
    onMentionTrigger();
  }, [clearMentionPlaceholder, isDisabled, onMentionTrigger, restoreSelection, syncContent]);

  const handleMentionSelectInternal = useCallback(
    (memberId: string) => {
      const member =
        mentionOptions.find((option) => option.id === memberId) ?? null;
      if (!member) {
        clearMentionPlaceholder();
        return;
      }
      if (editorRef.current) {
        const placeholderId = mentionPlaceholderRef.current;
        if (placeholderId) {
          const placeholder = editorRef.current.querySelector(
            `span[data-mention-placeholder="${placeholderId}"]`
          );
          if (placeholder) {
            const span = document.createElement("span");
            span.textContent = `@${member.name} `;
            span.setAttribute("data-mention", "true");
            placeholder.replaceWith(span);
            mentionPlaceholderRef.current = null;
            syncContent();
            onMentionSelect(member.id);
            onMentionClose();
            return;
          }
        }
      }
      restoreSelection();
      document.execCommand(
        "insertHTML",
        false,
        `<span data-mention="true">@${member.name}&nbsp;</span>`
      );
      syncContent();
      onMentionSelect(member.id);
      onMentionClose();
    },
    [
      clearMentionPlaceholder,
      mentionOptions,
      onMentionSelect,
      onMentionClose,
      restoreSelection,
      syncContent,
    ]
  );

  const handleSubmitForm = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting || isDisabled) return;
    onSubmit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!canSubmit || isSubmitting || isDisabled) return;
      onSubmit();
      return;
    }

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault();
      if (!canSubmit || isSubmitting || isDisabled) return;
      onSubmit();
    }
  };

  const showMentionList = isMentioning && mentionOptions.length > 0;

  return (
    <form
      onSubmit={handleSubmitForm}
      className={cn("relative flex flex-col gap-2", className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {toolbarConfigs.map((item) => {
            const active = toolbarState[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                disabled={isDisabled}
                onClick={() => {
                  applyCommand(item.command);
                }}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-white transition ${active
                  ? "border-white bg-white/10"
                  : "border-white/20 hover:border-white/40 hover:text-white"
                  } ${isDisabled ? "opacity-60" : ""}`}
                title={item.label}
              >
                {item.icon}
              </button>
            );
          })}
          {listConfigs.map((item) => {
            const active = toolbarState[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                disabled={isDisabled}
                onClick={() => {
                  applyCommand(item.command);
                }}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-white transition ${active
                  ? "border-white bg-white/10"
                  : "border-white/20 hover:border-white/40 hover:text-white"
                  } ${isDisabled ? "opacity-60" : ""}`}
                title="Danh sách số"
              >
                {item.icon}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={toolbarState.bullet}
            disabled={isDisabled}
            onClick={() => applyDefaultBullet()}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-white transition ${toolbarState.bullet
              ? "border-white bg-white/10"
              : "border-white/20 hover:border-white/40 hover:text-white"
              } ${isDisabled ? "opacity-60" : ""}`}
            title="Gạch đầu dòng (•)"
          >
            <LuList />
          </button>
          <div className="relative flex items-center">
            <button
              ref={mentionButtonRef}
              type="button"
              onClick={handleMentionTriggerInternal}
              disabled={isDisabled}
              className="cursor-pointer rounded-full border border-white/20 px-3 py-1.5 text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-60"
              title="Nhắc tới thành viên"
            >
              <LuAtSign />
            </button>
            <FloatingDropdown
              anchorRef={mentionButtonRef}
              isOpen={showMentionList}
              onClose={clearMentionPlaceholder}
              placement="top-right"
              offset={{ y: 4 }}
              zIndex={2600}
              contentClassName="w-56 p-0"
            >
              <div className="w-full">
                <p className="px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Gợi ý thành viên
                </p>
                <div className="max-h-52 overflow-y-auto">
                  {mentionOptions.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleMentionSelectInternal(member.id)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10"
                    >
                      <AvatarUser
                        name={member.name}
                        avatarUrl={member.avatarUrl ?? undefined}
                        size={28}
                        showTooltip={false}
                      />
                      <span>{member.name}</span>
                    </button>
                  ))}
                  {!mentionOptions.length && (
                    <p className="px-3 py-2 text-xs text-white/50">
                      Không có thành viên nào.
                    </p>
                  )}
                </div>
              </div>
            </FloatingDropdown>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isEditing && (
            <div className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-200">
              Đang chỉnh sửa {editingEntryName ? `(${editingEntryName})` : ""}
              <button
                type="button"
                className="ml-2 text-[11px] uppercase tracking-widest text-yellow-300/80 hover:text-yellow-100"
                onClick={onCancelEdit}
              >
                Hủy
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting || isDisabled}
            className={`cursor-pointer flex items-center justify-center rounded-full p-2 text-white transition ${canSubmit && !isDisabled
              ? "bg-emerald-500 hover:bg-emerald-400"
              : "bg-white/10"
              }`}
            aria-label="Gửi báo cáo"
          >
            {isSubmitting ? (
              <LoadingSpinner size={16} thickness={2} label="Đang gửi" />
            ) : (
              <FiSend className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="relative">
        {isEditorEmpty && (
          <p className="pointer-events-none absolute left-4 top-3 text-sm text-white/40">
            {placeholderText}
          </p>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable={!isDisabled}
          suppressContentEditableWarning
          onInput={syncContent}
          onKeyDown={handleKeyDown}
          onBlur={saveSelection}
          className={cn(
            "rich-text-editor no-scrollbar h-20 w-full overflow-y-auto rounded-2xl border border-white/15 bg-black/70 p-4 text-sm text-white outline-none focus:border-white/15",
            isDisabled ? "opacity-60" : ""
          )}
        />
      </div>
    </form>
  );
};

export default DailyReportForm;
