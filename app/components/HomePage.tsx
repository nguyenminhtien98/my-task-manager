"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "./Header";
import LoginRegisterModal from "./LoginRegisterModal";
import TaskModal from "./TaskModal";
import { Task, TaskStatus } from "../types/Types";
import { useAuth } from "../context/AuthContext";
import { DragEndEvent } from "@dnd-kit/core";
import { database, subscribeToRealtime } from "../appwrite";
import toast from "react-hot-toast";
import { useProject } from "../context/ProjectContext";
import ProjectModal from "./ProjectModal";

const Board = dynamic(() => import("./Board"), { ssr: false });

type ColumnsType = Record<TaskStatus, Task[]>;

const currentDate = new Date().toISOString().split("T")[0];

const defaultGuideTask: Task = {
    id: "guideTask",
    seq: 0,
    title: "Hướng dẫn sử dụng...",
    description:
        '- Trước tiên bạn hãy đăng ký tài khoản sau đó đăng nhập để sử dụng ứng dụng này nha.\n- Sau khi đăng nhập bạn có thể tạo dự án và tạo task cho dự án đó.\n- Logic kéo thả task giữ các cột của ứng dụng là: Thành viên của dự án có quyền kéo Task từ cột "LIST" sang cột "DOING" và từ cột "DOING" sang cột "DONE" và kéo từ cột "BUG" về các cột mà thành viên được quyền kéo đến. Khi Task đã rời cột "LIST" thì không thể kéo lại cột "LIST" nữa. Chỉ có Leader của dự án mới có quyền kéo Task từ cột "DONE" sang cột "COMPLETED" hoặc từ cột "DONE" sang cột "BUG". Thành viên của dự án chỉ có quyền kéo Task của chính mình, Leader có quyền kéo Task của tất cả các thành viên trong dự án. Thành viên có thể tự tạo Task hoặc có thể nhận Task từ Leader (những Task mà Leader tạo nhưng chưa chọn thành viên thực hiện Task). Thành viên chỉ có quyền chỉnh sửa các trường "Thời gian hoàn thành", "Ngày bắt đầu và ngày kết thúc của Task".\n- Leader là : là người tạo dự án.\n- Thành viên là : là người được Leader mời vào dự án\n- Logic tạo Task là: Leader có quyền để trống trường "Người thực hiện" và "Ngày bắt đầu và ngày kết thúc". Thành viền phải điền đầy đủ các trường.',
    assignee: "Admin",
    status: "completed",
    order: 0,
    startDate: currentDate,
    endDate: currentDate,
    predictedHours: 1,
    completedBy: "Admin",
    issueType: "Feature",
    priority: "High",
};

const HomePage: React.FC = () => {
    const { user } = useAuth();
    const { currentProject, currentProjectRole } = useProject();
    const currentUserName = user?.name || "";
    const isLeader = currentProjectRole === "leader";

    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [taskDetailOpen, setTaskDetailOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [openCreateAfterLogin, setOpenCreateAfterLogin] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [shouldOpenTaskAfterProjectCreation, setShouldOpenTaskAfterProjectCreation] = useState(false);
    // - isInitialLoading: dùng cho lần đầu load (show full-screen loading)
    // - isContentLoading: dùng cho các thay đổi dữ liệu sau khi load xong (hiển thị overlay lên Board)
    // - hasLoaded: flag để đánh dấu rằng đã có lần load đầu tiên thành công
    const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
    const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
    const [hasLoaded, setHasLoaded] = useState<boolean>(false);

    // Fetch tasks chỉ khi user và currentProject tồn tại
    useEffect(() => {
        if (!user) {
            setIsContentLoading(true);
            // Sau 300ms, cập nhật state cho giao diện không đăng nhập
            setTimeout(() => {
                setAllTasks([defaultGuideTask]);
                setIsContentLoading(false);
                setIsInitialLoading(false);    // Bỏ full‑screen loading
                setHasLoaded(true);
            }, 300);
            return;
        }

        if (!currentProject) {
            setAllTasks([defaultGuideTask]);
            setIsContentLoading(false);
            if (!hasLoaded) {
                setIsInitialLoading(false);
                setHasLoaded(true);
            }
            return;
        }
        if (!hasLoaded) {
            setIsInitialLoading(true);
        } else {
            setIsContentLoading(true);
        }
        database
            .listDocuments(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS)
            )
            .then((res) => {
                // Lọc task theo projectId của dự án hiện tại
                const tasks = (res.documents as unknown as Task[]).filter(
                    (t) => t.projectId === currentProject.id
                );
                setAllTasks(tasks);
            })
            .catch((err) => {
                console.error("Lấy tasks thất bại:", err);
            })
            .finally(() => {
                if (!hasLoaded) {
                    setIsInitialLoading(false);
                    setHasLoaded(true);
                } else {
                    setIsContentLoading(false);
                }
            });
    }, [user, currentProject]);

    // Lắng nghe realtime cho các thay đổi trên task
    useEffect(() => {
        if (!user || !currentProject) return;
        const channel = `databases.${process.env.NEXT_PUBLIC_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS}.documents`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsubscribe = subscribeToRealtime([channel], (res: any) => {
            const doc = (res.payload.data as Task) || (res.payload as Task);

            if (doc.projectId !== currentProject.id) return;

            if (res.events.some((e: string) => e.endsWith(".create"))) {
                setAllTasks(prev => [...prev, doc]);
            }
            else if (res.events.some((e: string) => e.endsWith(".update"))) {
                setAllTasks(prev => prev.map(t => t.id === doc.id ? doc : t));
            }
            else if (res.events.some((e: string) => e.endsWith(".delete"))) {
                setAllTasks(prev => prev.filter(t => t.id !== doc.id));
            }
        });

        return () => unsubscribe();
    }, [user, currentProject?.id]);

    const handleCreateClick = () => {
        if (user) {
            if (!currentProject) {
                setProjectModalOpen(true);
                setShouldOpenTaskAfterProjectCreation(true);
            } else {
                setTaskModalOpen(true);
            }
        } else {
            setOpenCreateAfterLogin(true);
            setLoginModalOpen(true);
        }
    };

    const handleCreateProject = () => {
        setProjectModalOpen(true);
        setShouldOpenTaskAfterProjectCreation(false);
    };

    // Khi click Login trên header
    const handleLoginClick = () => {
        setOpenCreateAfterLogin(false);
        setLoginModalOpen(true);
    };

    // Callback khi login thành công
    const onLoginSuccess = () => {
        setLoginModalOpen(false);
        if (openCreateAfterLogin) {
            if (!currentProject) {
                setProjectModalOpen(true);
                setShouldOpenTaskAfterProjectCreation(true);
            } else {
                setTaskModalOpen(true);
            }
            setOpenCreateAfterLogin(false);
        }
    };

    // Sau khi tạo task mới, thêm field dự án vào task
    const handleCreateTask = (task: Task) => {
        if (currentProject) {
            const newTask = {
                ...task,
                projectId: currentProject.id,
                projectName: currentProject.name,
            };
            setAllTasks((prev) => [...prev, newTask]);
        }
    };

    // Sau khi cập nhật qua Detail modal
    const handleUpdateTask = (updated: Task) => {
        setAllTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
        );
    };

    // Gom cột - tính dựa trên allTasks hiện tại
    const columns: ColumnsType = { list: [], doing: [], done: [], completed: [], bug: [] };
    allTasks.forEach((t) => {
        columns[t.status].push(t);
    });
    (Object.keys(columns) as TaskStatus[]).forEach((st) =>
        columns[st].sort((a, b) => a.order - b.order)
    );

    // Xử lý Drag & Drop
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        // Lấy status gốc từ dữ liệu của task đang kéo
        const sourceStatus = active.data.current?.status as TaskStatus;
        if (!sourceStatus || sourceStatus === "completed") return;

        // Lấy targetStatus từ dữ liệu của over hoặc over.id
        let targetStatus: TaskStatus;
        if (over.data.current && over.data.current.status) {
            targetStatus = over.data.current.status as TaskStatus;
        } else {
            const raw = over.id as string;
            targetStatus = raw as TaskStatus;
        }

        // Kiểm tra quyền: sử dụng currentProjectRole
        if (!isLeader) {
            const allowed: TaskStatus[] = ["doing", "done"];
            const moving = allTasks.find((t) => t.id === active.id);
            if (!moving || moving.assignee !== currentUserName) return;
            if (
                !allowed.includes(targetStatus) &&
                !(sourceStatus === "bug" && allowed.includes(targetStatus))
            )
                return;
        }

        // Tính thứ tự mới cho task ở cột target
        const tasksInTarget = allTasks.filter(
            (t) => t.status === targetStatus && t.id !== active.id
        );
        const targetOrder = tasksInTarget.length;

        // Cập nhật task
        const updatedTask = allTasks.find((t) => t.id === active.id);
        if (!updatedTask) return;
        const newTask = {
            ...updatedTask,
            status: targetStatus,
            order: targetOrder,
            ...(isLeader && targetStatus === "completed"
                ? { completedBy: currentUserName }
                : {}),
        };

        setAllTasks((prev) =>
            prev.map((t) => (t.id === newTask.id ? newTask : t))
        );

        try {
            await database.updateDocument(
                String(process.env.NEXT_PUBLIC_DATABASE_ID),
                String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
                newTask.id,
                {
                    status: newTask.status,
                    order: newTask.order,
                    ...(newTask.completedBy ? { completedBy: newTask.completedBy } : {}),
                }
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Lỗi cập nhật status task:", error);
            toast.error(error.message || "Cập nhật trạng thái thất bại");
        }
    };

    if (isInitialLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <Header onCreateTask={handleCreateClick} onLoginClick={handleLoginClick} onCreateProject={handleCreateProject} />

            <div className="p-4 p-4 relative">
                <Board
                    tasks={allTasks}
                    currentUser={currentUserName}
                    isLeader={isLeader}
                    onMove={handleDragEnd}
                    onTaskClick={(t) => {
                        setSelectedTask(t);
                        setTaskDetailOpen(true);
                    }}
                />
                {isContentLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            <ProjectModal isOpen={projectModalOpen} setIsOpen={setProjectModalOpen} onProjectCreate={() => {
                if (shouldOpenTaskAfterProjectCreation) {
                    setTaskModalOpen(true);
                    setShouldOpenTaskAfterProjectCreation(false);
                }
            }} />

            <LoginRegisterModal
                isOpen={loginModalOpen}
                setIsOpen={setLoginModalOpen}
                onLoginSuccess={onLoginSuccess}
            />

            <TaskModal
                mode="create"
                isOpen={taskModalOpen}
                setIsOpen={setTaskModalOpen}
                onCreate={handleCreateTask}
                nextSeq={allTasks.length + 1}
            />

            <TaskModal
                mode="detail"
                isOpen={taskDetailOpen}
                setIsOpen={setTaskDetailOpen}
                task={selectedTask}
                onUpdate={handleUpdateTask}
            />
        </>
    );
};

export default HomePage;
