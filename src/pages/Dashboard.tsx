import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../util/firebase";

interface Task {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    notes?: string;
    createdAt: number;
}

interface TaskList {
    id: string;
    name: string;
    tasks: Task[];
}

export default function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const [uuid, setUuid] = useState<string | null>(null);
    const [sessionValid, setSessionValid] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [selectedList, setSelectedList] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newListName, setNewListName] = useState("");
    const [showNewListForm, setShowNewListForm] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    useEffect(() => {
        const stateUuid = location.state?.uuid;
        const sessionData = localStorage.getItem("authSession");
        
        if (stateUuid) {
            setUuid(stateUuid);
        } else if (sessionData) {
            try {
                const parsed = JSON.parse(sessionData);
                setUuid(parsed.uuid);
            } catch {
                navigate("/");
            }
        } else {
            navigate("/");
        }

        // Load task lists from localStorage
        const savedLists = localStorage.getItem("taskLists");
        if (savedLists) {
            try {
                const lists = JSON.parse(savedLists);
                setTaskLists(lists);
                if (lists.length > 0) {
                    setSelectedList(lists[0].id);
                }
            } catch {
                initializeDefaultLists();
            }
        } else {
            initializeDefaultLists();
        }

        // Check session validity
        const sessionCheckInterval = setInterval(() => {
            const session = localStorage.getItem("authSession");
            if (!session) {
                setSessionValid(false);
                navigate("/");
                return;
            }

            try {
                const parsed = JSON.parse(session);
                const remaining = parsed.expiresAt - Date.now();

                if (remaining <= 0) {
                    localStorage.removeItem("authSession");
                    setSessionValid(false);
                    navigate("/");
                } else {
                    setTimeRemaining(Math.ceil(remaining / 1000));
                }
            } catch {
                navigate("/");
            }
        }, 1000);

        return () => clearInterval(sessionCheckInterval);
    }, [location, navigate]);

    function initializeDefaultLists() {
        const defaultLists: TaskList[] = [
            {
                id: "default-1",
                name: "My Tasks",
                tasks: [],
            },
        ];
        setTaskLists(defaultLists);
        setSelectedList("default-1");
        localStorage.setItem("taskLists", JSON.stringify(defaultLists));
    }

    function saveTaskLists(lists: TaskList[]) {
        setTaskLists(lists);
        localStorage.setItem("taskLists", JSON.stringify(lists));
    }

    function addTask() {
        if (!newTaskTitle.trim() || !selectedList) return;

        const updatedLists = taskLists.map((list) => {
            if (list.id === selectedList) {
                return {
                    ...list,
                    tasks: [
                        ...list.tasks,
                        {
                            id: `task-${Date.now()}`,
                            title: newTaskTitle,
                            completed: false,
                            createdAt: Date.now(),
                        },
                    ],
                };
            }
            return list;
        });

        saveTaskLists(updatedLists);
        setNewTaskTitle("");
    }

    function toggleTask(taskId: string) {
        const updatedLists = taskLists.map((list) => {
            if (list.id === selectedList) {
                return {
                    ...list,
                    tasks: list.tasks.map((task) =>
                        task.id === taskId ? { ...task, completed: !task.completed } : task
                    ),
                };
            }
            return list;
        });
        saveTaskLists(updatedLists);
    }

    function deleteTask(taskId: string) {
        const updatedLists = taskLists.map((list) => {
            if (list.id === selectedList) {
                return {
                    ...list,
                    tasks: list.tasks.filter((task) => task.id !== taskId),
                };
            }
            return list;
        });
        saveTaskLists(updatedLists);
    }

    function addTaskList() {
        if (!newListName.trim()) return;

        const newList: TaskList = {
            id: `list-${Date.now()}`,
            name: newListName,
            tasks: [],
        };

        const updatedLists = [...taskLists, newList];
        saveTaskLists(updatedLists);
        setSelectedList(newList.id);
        setNewListName("");
        setShowNewListForm(false);
    }

    function deleteTaskList(listId: string) {
        if (taskLists.length === 1) return;
        const updatedLists = taskLists.filter((list) => list.id !== listId);
        saveTaskLists(updatedLists);
        if (selectedList === listId) {
            setSelectedList(updatedLists[0].id);
        }
    }

    async function handleLogout() {
        try {
            localStorage.removeItem("authSession");
            await signOut(auth);
            navigate("/");
        } catch (err) {
            console.error("Error logging out:", err);
        }
    }

    function formatTime(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    if (!sessionValid) {
        return <div style={{ textAlign: "center", marginTop: "6rem" }}>Session expired. Redirecting...</div>;
    }

    const currentList = taskLists.find((list) => list.id === selectedList);
    const completedCount = currentList?.tasks.filter((t) => t.completed).length || 0;
    const totalCount = currentList?.tasks.length || 0;

    return (
        <div style={{ display: "flex", height: "100vh", backgroundColor: "#fafbfc" }}>
            {/* Sidebar */}
            <div style={{ width: 280, backgroundColor: "white", borderRight: "1px solid #e8eaed", display: "flex", flexDirection: "column", padding: "16px 0" }}>
                <div style={{ padding: "0 16px", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#4285f4", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
                            {uuid?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: "500" }}>User</p>
                            <p style={{ margin: 0, fontSize: 12, color: "#5f6368" }}>UUID: {uuid?.substring(0, 8)}...</p>
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: "auto" }}>
                    {taskLists.map((list) => (
                        <button
                            key={list.id}
                            onClick={() => setSelectedList(list.id)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                if (taskLists.length > 1) deleteTaskList(list.id);
                            }}
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                backgroundColor: selectedList === list.id ? "#f0f7ff" : "transparent",
                                borderLeft: selectedList === list.id ? "4px solid #4285f4" : "4px solid transparent",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: 14,
                                color: selectedList === list.id ? "#4285f4" : "#3c4043",
                                transition: "all 0.2s",
                            }}
                        >
                            {list.name}
                        </button>
                    ))}
                </div>

                <div style={{ borderTop: "1px solid #e8eaed", padding: 16 }}>
                    {!showNewListForm ? (
                        <button
                            onClick={() => setShowNewListForm(true)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                backgroundColor: "transparent",
                                border: "1px solid #dadce0",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontSize: 13,
                                color: "#3c4043",
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                            + New list
                        </button>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input
                                type="text"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="List name"
                                style={{
                                    padding: "8px",
                                    border: "1px solid #dadce0",
                                    borderRadius: 4,
                                    fontSize: 13,
                                }}
                                onKeyPress={(e) => e.key === "Enter" && addTaskList()}
                                autoFocus
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={addTaskList}
                                    style={{
                                        flex: 1,
                                        padding: "8px",
                                        backgroundColor: "#4285f4",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontSize: 12,
                                    }}
                                >
                                    Create
                                </button>
                                <button
                                    onClick={() => setShowNewListForm(false)}
                                    style={{
                                        flex: 1,
                                        padding: "8px",
                                        backgroundColor: "#f8f9fa",
                                        border: "1px solid #dadce0",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontSize: 12,
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ borderTop: "1px solid #e8eaed", padding: 16 }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 13,
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{ padding: "24px 32px", borderBottom: "1px solid #e8eaed", backgroundColor: "white" }}>
                    <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 500 }}>{currentList?.name}</h1>
                    <p style={{ margin: 0, fontSize: 13, color: "#5f6368" }}>
                        {completedCount} of {totalCount} completed
                    </p>
                    {timeRemaining !== null && (
                        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: timeRemaining < 300 ? "#d33027" : "#34a853" }}>
                            Session expires in: {formatTime(timeRemaining)}
                        </p>
                    )}
                </div>

                {/* Tasks */}
                <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
                    {/* Add Task Input */}
                    <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                        <input
                            type="checkbox"
                            disabled
                            style={{ width: 24, height: 24, cursor: "default" }}
                        />
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addTask()}
                            placeholder="Add a task"
                            style={{
                                flex: 1,
                                border: "none",
                                borderBottom: "1px solid #dadce0",
                                padding: "8px 0",
                                fontSize: 16,
                                outline: "none",
                            }}
                        />
                    </div>

                    {/* Task List */}
                    {currentList?.tasks.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#5f6368", padding: "40px 0" }}>
                            <p style={{ fontSize: 16, marginBottom: 8 }}>No tasks yet</p>
                            <p style={{ fontSize: 13 }}>Add one above to get started</p>
                        </div>
                    ) : (
                        <div>
                            {currentList?.tasks
                                .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
                                .map((task) => (
                                    <div
                                        key={task.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "12px 0",
                                            borderBottom: "1px solid #f1f3f4",
                                            opacity: task.completed ? 0.6 : 1,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => toggleTask(task.id)}
                                            style={{ width: 24, height: 24, cursor: "pointer" }}
                                        />
                                        <span
                                            style={{
                                                flex: 1,
                                                textDecoration: task.completed ? "line-through" : "none",
                                                color: task.completed ? "#9aa0a6" : "#202124",
                                                fontSize: 15,
                                            }}
                                        >
                                            {task.title}
                                        </span>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            style={{
                                                padding: "4px 8px",
                                                backgroundColor: "transparent",
                                                border: "none",
                                                color: "#9aa0a6",
                                                cursor: "pointer",
                                                fontSize: 16,
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}