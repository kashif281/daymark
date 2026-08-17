"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  Inbox,
  LayoutGrid,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EodModal } from "@/components/eod-modal";
import { PwaInstallHeaderButton } from "@/components/pwa-install-prompt";
import { NotificationBell } from "@/components/notification-bell";
import { PwaControls } from "@/components/pwa-controls";
import { ClientMessageCard } from "@/components/client-message-card";
import { TaskActions } from "@/components/task-actions";
import { TrendChart } from "@/components/trend-chart";

type Status = "todo" | "progress" | "done";
type View = "today" | "timeline" | "queue" | "messages" | "eod" | "progress" | "archive" | "settings";
type ArchivedProject = {
  id: string;
  name: string;
  client: string;
  color: string;
};
type EodItem = {
  id: string;
  date: string;
  summary: string;
  blockers: string | null;
  tomorrow: string | null;
  hoursWorked?: number;
};
type ProgressDay = {
  date: string;
  hours: number;
  summary: string | null;
  blockers: string | null;
  tasksDone: number;
  tasksTotal: number;
  tasks: {
    id: string;
    title: string;
    status: Status;
    projectName: string;
    projectColor: string;
  }[];
};
type Task = {
  id: string;
  title: string;
  description?: string | null;
  screenshotUrl?: string | null;
  status: Status;
};
type ClientMessage = {
  id: string;
  sender: string;
  content: string;
  receivedAt: string;
  resolved?: boolean;
};
type QueuedMessage = {
  id: string;
  content: string;
  status: string;
  projectId?: string | null;
  projectName?: string | null;
  color?: string;
};
type Todo = {
  id: string;
  title: string;
  completed: boolean;
  reminderAt: string | null;
  reminderSentAt: string | null;
};
type Project = {
  id: string;
  name: string;
  client: string;
  color: string;
  tasks: Task[];
  clientMessages?: ClientMessage[];
  queuedMessages?: QueuedMessage[];
};

const statusStyle: Record<Status, { label: string; className: string; cardName: string }> = {
  todo: {
    label: "Not started",
    className: "bg-[#f0f0ed] text-[#696965]",
    cardName: "border-[#e3e2dd] bg-[#fafaf8]",
  },
  progress: {
    label: "In progress",
    className: "bg-[#fff2d8] text-[#936521]",
    cardName: "border-[#f0d49f] bg-[#fffaf0]",
  },
  done: {
    label: "Done",
    className: "bg-[#e5f5eb] text-[#367653]",
    cardName: "border-[#bddfca] bg-[#f2faf5]",
  },
};

const PROJECT_COLORS = [
  "#7161d6",
  "#e09548",
  "#4f9c7a",
  "#d46a6a",
  "#4f8ec9",
  "#c27a4f",
];

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProject[]>(
    [],
  );
  const [view, setView] = useState<View>("today");
  const [eodEntries, setEodEntries] = useState<EodItem[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [projectComposerOpen, setProjectComposerOpen] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskScreenshotUrl, setNewTaskScreenshotUrl] = useState("");
  const [eodOpen, setEodOpen] = useState(false);
  const [messageComposer, setMessageComposer] = useState<
    "client" | "queued" | null
  >(null);
  const [messageProjectId, setMessageProjectId] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messageSender, setMessageSender] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [renameProjectId, setRenameProjectId] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectClient, setEditProjectClient] = useState("");
  const [taskProjectId, setTaskProjectId] = useState<string>("");
  const [todoComposerOpen, setTodoComposerOpen] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [newTodoReminder, setNewTodoReminder] = useState("");
  const [progressDays, setProgressDays] = useState<ProgressDay[]>([]);
  const [progressComparison, setProgressComparison] = useState({
    hoursRecent: 0,
    hoursPrevious: 0,
    tasksRecent: 0,
    tasksPrevious: 0,
    hoursDelta: 0,
    tasksDelta: 0,
  });
  const [user, setUser] = useState({ name: "", email: "" });

  useEffect(() => {
    fetch("/api/dashboard")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load dashboard");
        return response.json() as Promise<{
          user: { name: string | null; email: string };
          projects: Project[];
          archivedProjects?: ArchivedProject[];
          todos: Todo[];
          queuedMessages?: QueuedMessage[];
        }>;
      })
      .then((data) => {
        setProjects(data.projects);
        setArchivedProjects(data.archivedProjects ?? []);
        setTodos(data.todos);
        setQueuedMessages(data.queuedMessages ?? []);
        setUser({
          name: data.user.name ?? data.user.email.split("@")[0],
          email: data.user.email,
        });
        if (data.projects[0]) setTaskProjectId(data.projects[0].id);
      })
      .catch((error) => {
        console.error(error);
        setLoadError("Could not load your dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const tasks = projects.flatMap((project) => project.tasks);
    return {
      total: tasks.length,
      done: tasks.filter((task) => task.status === "done").length,
      progress: tasks.filter((task) => task.status === "progress").length,
    };
  }, [projects]);
  const latestMessage = useMemo(() => {
    const entries = projects.flatMap((project) =>
      (project.clientMessages ?? [])
        .filter((message) => !message.resolved)
        .map((message) => ({
        message,
        projectId: project.id,
        projectName: project.name,
      })),
    );
    return entries[0] ?? null;
  }, [projects]);

  const allClientMessages = useMemo(
    () =>
      projects.flatMap((project) =>
        (project.clientMessages ?? []).map((message) => ({
          message,
          projectId: project.id,
          projectName: project.name,
        })),
      ),
    [projects],
  );

  const queuedItems = useMemo(
    () => queuedMessages.filter((message) => message.status !== "sent"),
    [queuedMessages],
  );

  const viewLabel: Record<View, string> = {
    today: "Today",
    timeline: "Timeline",
    queue: "Message queue",
    messages: "Client messages",
    eod: "EOD entries",
    progress: "Progress",
    archive: "Archive",
    settings: "Settings",
  };
  const firstName = user.name.split(" ")[0] || "there";
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  function setTaskStatus(projectId: string, taskId: string, status: Status) {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, status }
                  : task,
              ),
            }
          : project,
      ),
    );

    if (!taskId.startsWith("demo-")) {
      void fetch("/api/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status }),
      });
    }
  }

  function updateTask(
    projectId: string,
    taskId: string,
    updates: { description: string | null; screenshotUrl: string | null },
  ) {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, ...updates } : task,
              ),
            }
          : project,
      ),
    );
  }

  function removeTask(projectId: string, taskId: string) {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.filter((task) => task.id !== taskId),
            }
          : project,
      ),
    );
  }

  async function addTask() {
    const title = newTask.trim();
    if (!title) return;

    const description = newTaskDescription.trim() || null;
    const screenshotUrl = newTaskScreenshotUrl.trim() || null;
    const targetProjectId = taskProjectId || projects[0]?.id;
    if (!targetProjectId) return;

    const temporaryId = `demo-${Date.now()}`;
    setProjects((current) =>
      current.map((project) =>
        project.id === targetProjectId
          ? {
              ...project,
              tasks: [
                ...project.tasks,
                { id: temporaryId, title, description, screenshotUrl, status: "todo" },
              ],
            }
          : project,
      ),
    );
    setNewTask("");
    setNewTaskDescription("");
    setNewTaskScreenshotUrl("");
    setComposerOpen(false);

    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        screenshotUrl,
        projectId: targetProjectId,
      }),
    });
    if (response.ok) {
      const data = (await response.json()) as { projectId: string; task: Task };
      setProjects((current) =>
        current.map((project) =>
          project.id === data.projectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === temporaryId ? data.task : task,
                ),
              }
            : project,
        ),
      );
    } else {
      setProjects((current) =>
        current.map((project) =>
          project.id === targetProjectId
            ? {
                ...project,
                tasks: project.tasks.filter((task) => task.id !== temporaryId),
              }
            : project,
        ),
      );
    }
  }

  async function addProject() {
    const name = newProjectName.trim();
    if (!name) return;

    const client = newProjectClient.trim() || "No client";
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    const temporaryId = `demo-project-${Date.now()}`;
    const optimisticProject: Project = {
      id: temporaryId,
      name,
      client,
      color,
      tasks: [],
    };

    setProjects((current) => [...current, optimisticProject]);
    setTaskProjectId(temporaryId);
    setNewProjectName("");
    setNewProjectClient("");
    setProjectComposerOpen(false);
    setSidebarOpen(false);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientName: client, color }),
    });

    if (response.ok) {
      const data = (await response.json()) as { project: Project };
      setProjects((current) =>
        current.map((project) =>
          project.id === temporaryId ? data.project : project,
        ),
      );
      setTaskProjectId(data.project.id);
    } else {
      setProjects((current) =>
        current.filter((project) => project.id !== temporaryId),
      );
    }
  }

  function openRenameProject(project: Project) {
    setRenameProjectId(project.id);
    setEditProjectName(project.name);
    setEditProjectClient(project.client === "No client" ? "" : project.client);
  }

  async function saveRenameProject() {
    const name = editProjectName.trim();
    if (!name || !renameProjectId) return;

    const clientName = editProjectClient.trim() || null;
    const projectId = renameProjectId;
    const previous = projects;
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? { ...project, name, client: clientName ?? "No client" }
          : project,
      ),
    );
    setRenameProjectId("");

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientName }),
    });

    if (!response.ok) {
      setProjects(previous);
      return;
    }

    const data = (await response.json()) as {
      project: { id: string; name: string; client: string; color: string };
    };
    setProjects((current) =>
      current.map((project) =>
        project.id === data.project.id
          ? {
              ...project,
              name: data.project.name,
              client: data.project.client,
              color: data.project.color,
            }
          : project,
      ),
    );
  }

  function openView(next: View) {
    setView(next);
    setSidebarOpen(false);
    if (next === "eod") void loadEodEntries();
    if (next === "progress" || next === "timeline") void loadProgress();
  }

  async function loadEodEntries() {
    const response = await fetch("/api/eod");
    if (!response.ok) return;
    const data = (await response.json()) as { entries: EodItem[] };
    setEodEntries(data.entries);
  }

  async function loadProgress() {
    const response = await fetch("/api/progress");
    if (!response.ok) return;
    const data = (await response.json()) as {
      days: ProgressDay[];
      comparison: typeof progressComparison;
    };
    setProgressDays(data.days);
    setProgressComparison(data.comparison);
  }

  async function archiveProject(project: Project) {
    const previousProjects = projects;
    const previousArchived = archivedProjects;
    setProjects((current) => current.filter((item) => item.id !== project.id));
    setArchivedProjects((current) => [
      {
        id: project.id,
        name: project.name,
        client: project.client,
        color: project.color,
      },
      ...current,
    ]);
    setRenameProjectId("");

    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });

    if (!response.ok) {
      setProjects(previousProjects);
      setArchivedProjects(previousArchived);
    }
  }

  async function restoreProject(project: ArchivedProject) {
    const previousProjects = projects;
    const previousArchived = archivedProjects;
    setArchivedProjects((current) =>
      current.filter((item) => item.id !== project.id),
    );
    setProjects((current) => [
      ...current,
      {
        id: project.id,
        name: project.name,
        client: project.client,
        color: project.color,
        tasks: [],
      },
    ]);

    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    if (!response.ok) {
      setProjects(previousProjects);
      setArchivedProjects(previousArchived);
      return;
    }

    const dashboard = await fetch("/api/dashboard");
    if (!dashboard.ok) return;
    const data = (await dashboard.json()) as {
      projects: Project[];
      archivedProjects?: ArchivedProject[];
    };
    setProjects(data.projects);
    setArchivedProjects(data.archivedProjects ?? []);
  }

  async function deleteProject(projectId: string) {
    const previous = archivedProjects;
    setArchivedProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    if (!response.ok) setArchivedProjects(previous);
  }

  async function addTodo() {
    const title = newTodo.trim();
    if (!title) return;

    const reminderAt = newTodoReminder
      ? new Date(newTodoReminder).toISOString()
      : null;
    const temporaryId = `temporary-todo-${Date.now()}`;
    const optimistic: Todo = {
      id: temporaryId,
      title,
      completed: false,
      reminderAt,
      reminderSentAt: null,
    };
    setTodos((current) => [optimistic, ...current]);
    setNewTodo("");
    setNewTodoReminder("");
    setTodoComposerOpen(false);

    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, reminderAt }),
    });

    if (!response.ok) {
      setTodos((current) => current.filter((todo) => todo.id !== temporaryId));
      return;
    }

    const data = (await response.json()) as { todo: Todo };
    setTodos((current) =>
      current.map((todo) => (todo.id === temporaryId ? data.todo : todo)),
    );
  }

  async function toggleTodo(todo: Todo) {
    const completed = !todo.completed;
    setTodos((current) =>
      current.map((item) =>
        item.id === todo.id ? { ...item, completed } : item,
      ),
    );

    const response = await fetch("/api/todos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: todo.id, completed }),
    });
    if (!response.ok) {
      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? todo : item)),
      );
    }
  }

  async function deleteTodo(id: string) {
    const previous = todos;
    setTodos((current) => current.filter((todo) => todo.id !== id));
    const response = await fetch(`/api/todos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) setTodos(previous);
  }

  async function clearCompletedTodos() {
    const previous = todos;
    setTodos((current) => current.filter((todo) => !todo.completed));
    const response = await fetch("/api/todos?completed=true", {
      method: "DELETE",
    });
    if (!response.ok) setTodos(previous);
  }

  function openMessageComposer(type: "client" | "queued") {
    setMessageProjectId(type === "queued" ? "" : (projects[0]?.id ?? ""));
    setMessageContent("");
    setMessageSender("");
    setMessageComposer(type);
  }

  async function saveMessage() {
    const content = messageContent.trim();
    const type = messageComposer;
    if (!content || !type) return;

    if (type === "client") {
      const targetProjectId = messageProjectId || projects[0]?.id;
      const targetProject = projects.find(
        (project) => project.id === targetProjectId,
      );
      if (!targetProjectId || !targetProject) return;

      const temporaryId = `demo-message-${Date.now()}`;
      setProjects((current) =>
        current.map((project) =>
          project.id === targetProjectId
            ? {
                ...project,
                clientMessages: [
                  {
                    id: temporaryId,
                    sender: messageSender.trim() || project.client,
                    content,
                    receivedAt: new Date().toISOString(),
                    resolved: false,
                  },
                  ...(project.clientMessages ?? []),
                ],
              }
            : project,
        ),
      );
      setMessageComposer(null);
      setMessageContent("");
      setMessageSender("");

      const response = await fetch(`/api/projects/${targetProjectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, senderName: messageSender }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { message: ClientMessage };
      setProjects((current) =>
        current.map((project) =>
          project.id === targetProjectId
            ? {
                ...project,
                clientMessages: (project.clientMessages ?? []).map((message) =>
                  message.id === temporaryId ? data.message : message,
                ),
              }
            : project,
        ),
      );
      return;
    }

    const targetProject = projects.find(
      (project) => project.id === messageProjectId,
    );
    const temporaryId = `demo-queue-${Date.now()}`;
    const optimistic: QueuedMessage = {
      id: temporaryId,
      content,
      status: "draft",
      projectId: targetProject?.id ?? null,
      projectName: targetProject?.name ?? null,
      color: targetProject?.color ?? "#9a9994",
    };
    setQueuedMessages((current) => [optimistic, ...current]);
    setMessageComposer(null);
    setMessageContent("");

    const response = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        projectId: targetProject?.id ?? null,
      }),
    });
    if (!response.ok) {
      setQueuedMessages((current) =>
        current.filter((message) => message.id !== temporaryId),
      );
      return;
    }
    const data = (await response.json()) as { message: QueuedMessage };
    setQueuedMessages((current) =>
      current.map((message) =>
        message.id === temporaryId ? data.message : message,
      ),
    );
  }

  async function setClientMessageResolved(
    projectId: string,
    messageId: string,
    resolved: boolean,
  ) {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              clientMessages: (project.clientMessages ?? []).map((message) =>
                message.id === messageId ? { ...message, resolved } : message,
              ),
            }
          : project,
      ),
    );

    const response = await fetch(`/api/projects/${projectId}/messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "client", messageId, resolved }),
    });
    if (!response.ok) {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                clientMessages: (project.clientMessages ?? []).map((message) =>
                  message.id === messageId
                    ? { ...message, resolved: !resolved }
                    : message,
                ),
              }
            : project,
        ),
      );
    }
  }

  async function deleteClientMessage(projectId: string, messageId: string) {
    const previous = projects;
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              clientMessages: (project.clientMessages ?? []).filter(
                (message) => message.id !== messageId,
              ),
            }
          : project,
      ),
    );

    const response = await fetch(`/api/projects/${projectId}/messages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "client", messageId }),
    });
    if (!response.ok) setProjects(previous);
  }

  function openTaskComposer(projectId?: string) {
    setTaskProjectId(projectId || projects[0]?.id || "");
    setNewTask("");
    setNewTaskDescription("");
    setNewTaskScreenshotUrl("");
    setComposerOpen(true);
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] text-sm text-[#777671]">
        Loading your dashboard…
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-[#777671]">{loadError}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#252522]">
      {sidebarOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col overflow-hidden border-r border-[#e6e5e0] bg-[#fbfbfa] px-3 py-4 transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-xl bg-[#6d5bd0] text-white shadow-sm shadow-purple-200">
              <Sparkles size={16} strokeWidth={2.4} />
            </div>
            <span className="text-[17px] font-bold tracking-[-0.02em]">
              daymark
            </span>
          </div>
          <button
            aria-label="Close menu"
            className="rounded-md p-1.5 text-[#777771] hover:bg-[#efefec] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
          <nav className="mt-8 space-y-1 text-[14px]">
            <SidebarItem
              icon={<LayoutGrid size={17} />}
              label="Today"
              active={view === "today"}
              onClick={() => openView("today")}
            />
            <SidebarItem
              icon={<CalendarDays size={17} />}
              label="Timeline"
              active={view === "timeline"}
              onClick={() => openView("timeline")}
            />
            <SidebarItem
              icon={<TrendingUp size={17} />}
              label="Progress"
              active={view === "progress"}
              onClick={() => openView("progress")}
            />
            <SidebarItem
              icon={<Inbox size={17} />}
              label="Message queue"
              badge={queuedItems.length ? String(queuedItems.length) : undefined}
              active={view === "queue"}
              onClick={() => openView("queue")}
            />
            <SidebarItem
              icon={<MessageSquareText size={17} />}
              label="Client messages"
              badge={
                allClientMessages.filter((item) => !item.message.resolved).length
                  ? String(
                      allClientMessages.filter((item) => !item.message.resolved)
                        .length,
                    )
                  : undefined
              }
              active={view === "messages"}
              onClick={() => openView("messages")}
            />
            <SidebarItem
              icon={<FileText size={17} />}
              label="EOD entries"
              active={view === "eod"}
              onClick={() => openView("eod")}
            />
          </nav>

          <div className="mt-8 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a9994]">
              Projects
            </span>
            <button
              aria-label="Add project"
              className="text-[#8d8c87] hover:text-[#444440]"
              onClick={() => setProjectComposerOpen(true)}
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="mt-2 space-y-0.5 pb-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] text-[#5f5e5a] hover:bg-[#f0f0ed]"
                onClick={() => setSidebarOpen(false)}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="shrink-0 space-y-1 border-t border-[#e8e7e3] pt-3 text-[13px]">
          <SidebarItem
            icon={<Archive size={16} />}
            label="Archive"
            badge={archivedProjects.length ? String(archivedProjects.length) : undefined}
            active={view === "archive"}
            onClick={() => openView("archive")}
          />
          <SidebarItem
            icon={<Settings size={16} />}
            label="Settings"
            active={view === "settings"}
            onClick={() => openView("settings")}
          />
          <div className="mt-3 flex items-center gap-2.5 rounded-xl px-2 py-2">
            {hasClerk ? (
              <UserButton />
            ) : (
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ddd5ff] text-xs font-bold text-[#5f4db9]">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-[#979690]">
                {user.email}
              </p>
            </div>
            <ChevronDown size={14} className="text-[#999892]" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#e7e6e1] bg-[#f7f7f5]/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open menu"
              className="rounded-lg p-2 hover:bg-white lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={19} />
            </button>
            <span className="truncate text-sm font-semibold">{viewLabel[view]}</span>
            <span className="hidden text-sm text-[#a3a29d] sm:inline">
              / {todayLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <PwaInstallHeaderButton />
            <button
              aria-label="Search"
              className="hidden rounded-lg p-2 text-[#777771] hover:bg-white sm:inline-flex"
            >
              <Search size={18} />
            </button>
            <NotificationBell
              todos={todos}
              onResolve={(todo) => void toggleTodo(todo)}
            />
            <button
              className="ml-1 flex items-center gap-2 rounded-lg bg-[#292927] px-3 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-black"
              onClick={() => openTaskComposer()}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add task</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 lg:py-10">
          {view === "today" && (
          <>
          <section>
            <p className="text-sm font-medium text-[#85847f]">
              {greeting}, {firstName}
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[32px] font-bold tracking-[-0.045em] sm:text-[38px]">
                  Let&apos;s make today count.
                </h1>
                <p className="mt-2 text-[14px] text-[#777671]">
                  {counts.total} tasks across {projects.length} projects
                </p>
              </div>
              <div className="flex gap-6 rounded-xl border border-[#e5e4df] bg-white px-5 py-3 shadow-[0_1px_2px_rgba(0,0,0,.02)]">
                <Stat value={counts.done} label="Done" color="#4c9a70" />
                <Stat value={counts.progress} label="In progress" color="#db9b45" />
                <Stat
                  value={counts.total - counts.done - counts.progress}
                  label="To do"
                  color="#979691"
                />
              </div>
            </div>
          </section>

          <div className="mt-9 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="space-y-5">
              {projects.map((project) => (
                <section
                  key={project.id}
                  className="overflow-hidden rounded-2xl border border-[#e6e5e0] bg-white shadow-[0_1px_3px_rgba(25,25,20,.025)]"
                >
                  <div className="flex items-center justify-between border-b border-[#ecebe7] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: project.color }}
                      />
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-[14px] font-bold hover:text-[#6553c6]"
                        >
                          {project.name}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-[#9a9994]">
                          {project.client}
                        </p>
                      </div>
                    </div>
                    <button
                      aria-label={`Rename ${project.name}`}
                      className="rounded-lg p-1.5 text-[#8b8a85] hover:bg-[#f5f5f2]"
                      onClick={() => openRenameProject(project)}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                  <div className="space-y-2 p-3">
                    {project.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${statusStyle[task.status].cardName}`}
                      >
                        <span
                          className={`mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full border transition ${
                            task.status === "done"
                              ? "border-[#55a276] bg-[#55a276] text-white"
                              : task.status === "progress"
                                ? "border-[#dda04f] bg-[#fff7e7]"
                                : "border-[#cac9c4] bg-white"
                          }`}
                        >
                          {task.status === "done" ? (
                            <Check size={12} strokeWidth={3} />
                          ) : task.status === "progress" ? (
                            <Clock3 size={11} className="text-[#c48431]" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[13px] ${
                              task.status === "done"
                                ? "text-[#999893] line-through"
                                : "text-[#484844]"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.description ? (
                            <span className="mt-1 block text-[11px] leading-4 text-[#8f8e89]">
                              {task.description}
                            </span>
                          ) : null}
                          {task.screenshotUrl ? (
                            <a
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#6553c6] hover:underline"
                              href={task.screenshotUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink size={11} /> Open screenshots
                            </a>
                          ) : null}
                        </span>
                        <select
                          aria-label={`Change status for ${task.title}`}
                          className={`rounded-lg border-0 px-2.5 py-1.5 text-[10px] font-semibold outline-none ${statusStyle[task.status].className}`}
                          value={task.status}
                          onChange={(event) =>
                            setTaskStatus(
                              project.id,
                              task.id,
                              event.target.value as Status,
                            )
                          }
                        >
                          <option value="todo">Not started</option>
                          <option value="progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                        <TaskActions
                          task={task}
                          onUpdate={(updates) =>
                            updateTask(project.id, task.id, updates)
                          }
                          onDelete={() => removeTask(project.id, task.id)}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    className="flex w-full items-center gap-2 border-t border-[#eeede9] px-5 py-3 text-[12px] font-semibold text-[#8a8984] hover:bg-[#fafaf8] hover:text-[#5f4db9]"
                    onClick={() => openTaskComposer(project.id)}
                  >
                    <Plus size={14} /> Add a task
                  </button>
                </section>
              ))}
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold">
                    <Check size={15} className="text-[#4c9a70]" />
                    Personal todos
                  </h2>
                  <div className="flex items-center gap-1">
                    {todos.some((todo) => todo.completed) ? (
                      <button
                        className="rounded-lg px-2 py-1 text-[10px] font-semibold text-[#8a8984] hover:bg-[#f3f3f0] hover:text-[#c45d5d]"
                        onClick={() => void clearCompletedTodos()}
                      >
                        Clear done
                      </button>
                    ) : null}
                    <button
                      aria-label="Add todo"
                      className="rounded-lg p-1.5 text-[#777771] hover:bg-[#f3f3f0]"
                      onClick={() => setTodoComposerOpen(true)}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {todos.length ? (
                    todos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-start gap-2 rounded-xl border border-[#ecebe7] p-3"
                      >
                        <button
                          aria-label={
                            todo.completed ? "Mark todo pending" : "Complete todo"
                          }
                          className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
                            todo.completed
                              ? "border-[#55a276] bg-[#55a276] text-white"
                              : "border-[#c8c7c2]"
                          }`}
                          onClick={() => void toggleTodo(todo)}
                        >
                          {todo.completed ? <Check size={10} strokeWidth={3} /> : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[11px] leading-4 ${
                              todo.completed
                                ? "text-[#999893] line-through"
                                : "text-[#565550]"
                            }`}
                          >
                            {todo.title}
                          </p>
                          {todo.reminderAt ? (
                            <p className="mt-1 flex items-center gap-1 text-[9px] text-[#9a9994]">
                              <Bell size={9} />
                              {todo.reminderSentAt
                                ? "Reminder sent"
                                : new Intl.DateTimeFormat(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  }).format(new Date(todo.reminderAt))}
                            </p>
                          ) : null}
                        </div>
                        <button
                          aria-label="Delete todo"
                          className="shrink-0 rounded-lg p-2 text-[#aaa9a4] hover:bg-[#fff0ee] hover:text-[#c45d5d]"
                          onClick={() => void deleteTodo(todo.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] leading-4 text-[#8f8e89]">
                      No personal todos. Add one with an optional reminder.
                    </p>
                  )}
                </div>
                <button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e2e1dc] py-2.5 text-[11px] font-semibold hover:bg-[#f8f8f6]"
                  onClick={() => setTodoComposerOpen(true)}
                >
                  <Plus size={13} /> Add todo
                </button>
              </section>

              <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-bold">
                    <MessageSquareText size={15} className="shrink-0 text-[#7664d7]" />
                    <span className="truncate">Latest client message</span>
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      className="text-[11px] font-semibold text-[#7967d2]"
                      onClick={() => openView("messages")}
                    >
                      View all
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e2e1dc] px-2 py-1 text-[11px] font-semibold text-[#666560] hover:bg-[#f8f8f6]"
                      onClick={() => openMessageComposer("client")}
                    >
                      <Plus size={12} />
                      Save
                    </button>
                  </div>
                </div>
                {latestMessage ? (
                  <div className="mt-4">
                    <ClientMessageCard
                      message={latestMessage.message}
                      projectName={latestMessage.projectName}
                      onResolve={(resolved) =>
                        void setClientMessageResolved(
                          latestMessage.projectId,
                          latestMessage.message.id,
                          resolved,
                        )
                      }
                      onDelete={() =>
                        void deleteClientMessage(
                          latestMessage.projectId,
                          latestMessage.message.id,
                        )
                      }
                    />
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#f7f6fb] p-4 text-[12px] leading-5 text-[#8f8e89]">
                    Paste a client request so you never lose track of what was
                    asked.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-bold">
                    <Send size={14} className="shrink-0 text-[#df9145]" />
                    Message queue
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-[#fff0de] px-2 py-0.5 text-[9px] font-bold text-[#a5672c]">
                      {queuedItems.length}
                    </span>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg bg-[#2f2e2c] px-2 py-1 text-[11px] font-semibold text-white hover:bg-black"
                      onClick={() => openMessageComposer("queued")}
                    >
                      <Plus size={12} /> Queue
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {queuedItems.length ? (
                    queuedItems.map((item) => (
                      <QueueItem
                        key={item.id}
                        project={item.projectName ?? "General"}
                        text={item.content}
                        status={item.status}
                        color={item.color ?? "#9a9994"}
                      />
                    ))
                  ) : (
                    <p className="text-[11px] leading-4 text-[#8f8e89]">
                      Nothing queued yet.
                    </p>
                  )}
                </div>
              </section>

              <PwaControls />

              <section className="rounded-2xl bg-[#2f2e2c] p-5 text-white">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold">
                    <FileText size={14} className="text-[#c5b9ff]" />
                    End of day
                  </h2>
                  <button
                    className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#343331] hover:bg-[#f3f1ff]"
                    onClick={() => setEodOpen(true)}
                  >
                    Write
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-white/60">
                  Capture what you completed, hours worked, and what comes next.
                </p>
              </section>
            </aside>
          </div>
          </>
          )}

          {view === "timeline" && (
            <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
              <h1 className="text-2xl font-bold tracking-[-0.04em]">Timeline</h1>
              <p className="mt-1 text-sm text-[#777671]">
                The last 30 days of project work
              </p>
              <div className="mt-5 space-y-5">
                {progressDays.filter((day) => day.tasksTotal).length ? (
                  [...progressDays].reverse().map((day) =>
                    day.tasksTotal ? (
                      <div key={day.date}>
                        <p className="text-[11px] font-bold text-[#9a9994]">
                          {new Intl.DateTimeFormat(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }).format(new Date(day.date))}
                          <span className="ml-2 font-medium">
                            {day.tasksDone}/{day.tasksTotal} done
                            {day.hours ? ` · ${day.hours}h` : ""}
                          </span>
                        </p>
                        <div className="mt-2 space-y-2">
                          {day.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-start gap-3 rounded-xl border border-[#ecebe7] px-4 py-3"
                            >
                              <span
                                className="mt-1.5 size-2 shrink-0 rounded-full"
                                style={{ background: task.projectColor }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-[#9a9994]">
                                  {task.projectName}
                                </p>
                                <p className="mt-0.5 text-sm">{task.title}</p>
                              </div>
                              <span
                                className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${statusStyle[task.status].className}`}
                              >
                                {statusStyle[task.status].label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )
                ) : (
                  <p className="text-sm text-[#8f8e89]">No tasks in the last 30 days.</p>
                )}
              </div>
            </section>
          )}

          {view === "queue" && (
            <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-[-0.04em]">
                    Message queue
                  </h1>
                  <p className="mt-1 text-sm text-[#777671]">
                    Drafts for any purpose. A project is optional.
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#292927] px-2.5 py-1.5 text-[11px] font-semibold text-white sm:px-3 sm:py-2 sm:text-xs"
                  onClick={() => openMessageComposer("queued")}
                >
                  <Plus size={12} />
                  Queue
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {queuedItems.length ? (
                  queuedItems.map((item) => (
                    <QueueItem
                      key={item.id}
                      project={item.projectName ?? "General"}
                      text={item.content}
                      status={item.status}
                      color={item.color ?? "#9a9994"}
                    />
                  ))
                ) : (
                  <p className="text-sm text-[#8f8e89]">Nothing queued yet.</p>
                )}
              </div>
            </section>
          )}

          {view === "messages" && (
            <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-[-0.04em]">
                    Client messages
                  </h1>
                  <p className="mt-1 text-sm text-[#777671]">
                    Resolve or delete requests as you handle them
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#292927] px-2.5 py-1.5 text-[11px] font-semibold text-white sm:px-3 sm:py-2 sm:text-xs"
                  onClick={() => openMessageComposer("client")}
                >
                  <Plus size={12} className="sm:hidden" />
                  <span className="sm:hidden">Save</span>
                  <span className="hidden sm:inline">Save client message</span>
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {allClientMessages.length ? (
                  allClientMessages.map((item) => (
                    <ClientMessageCard
                      key={item.message.id}
                      message={item.message}
                      projectName={item.projectName}
                      onResolve={(resolved) =>
                        void setClientMessageResolved(
                          item.projectId,
                          item.message.id,
                          resolved,
                        )
                      }
                      onDelete={() =>
                        void deleteClientMessage(
                          item.projectId,
                          item.message.id,
                        )
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-[#8f8e89]">
                    No client messages yet.
                  </p>
                )}
              </div>
            </section>
          )}

          {view === "eod" && (
            <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-[-0.04em]">
                    EOD entries
                  </h1>
                  <p className="mt-1 text-sm text-[#777671]">
                    Daily wrap-ups from the last 30 days
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#292927] px-2.5 py-1.5 text-[11px] font-semibold text-white sm:px-3 sm:py-2 sm:text-xs"
                  onClick={() => setEodOpen(true)}
                >
                  Write
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {eodEntries.length ? (
                  eodEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-[#ecebe7] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-[#9a9994]">
                          {new Intl.DateTimeFormat(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          }).format(new Date(entry.date))}
                        </p>
                        {entry.hoursWorked ? (
                          <p className="text-[11px] font-semibold text-[#5f4db9]">
                            {entry.hoursWorked}h
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                        {entry.summary}
                      </p>
                      {entry.blockers ? (
                        <p className="mt-2 text-xs text-[#8f8e89]">
                          Blockers: {entry.blockers}
                        </p>
                      ) : null}
                      {entry.tomorrow ? (
                        <p className="mt-1 text-xs text-[#8f8e89]">
                          Tomorrow: {entry.tomorrow}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8f8e89]">
                    No EOD entries yet. Write today&apos;s wrap-up to start the log.
                  </p>
                )}
              </div>
            </section>
          )}

          {view === "progress" && (
            <section className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-[-0.04em]">
                    Progress
                  </h1>
                  <p className="mt-1 text-sm text-[#777671]">
                    30-day hours, completed work, and week-over-week change
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#292927] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                  onClick={() => setEodOpen(true)}
                >
                  Log hours
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e6e5e0] bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
                    Hours this week
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {progressComparison.hoursRecent}
                    <span className="ml-1 text-sm font-semibold text-[#8f8e89]">h</span>
                  </p>
                  <p
                    className={`mt-1 text-[12px] font-semibold ${
                      progressComparison.hoursDelta > 0
                        ? "text-[#367653]"
                        : progressComparison.hoursDelta < 0
                          ? "text-[#a7463d]"
                          : "text-[#8f8e89]"
                    }`}
                  >
                    {progressComparison.hoursDelta > 0
                      ? `Up ${progressComparison.hoursDelta}h vs last week`
                      : progressComparison.hoursDelta < 0
                        ? `Down ${Math.abs(progressComparison.hoursDelta)}h vs last week`
                        : "Same hours as last week"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e6e5e0] bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
                    Tasks done this week
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {progressComparison.tasksRecent}
                  </p>
                  <p
                    className={`mt-1 text-[12px] font-semibold ${
                      progressComparison.tasksDelta > 0
                        ? "text-[#367653]"
                        : progressComparison.tasksDelta < 0
                          ? "text-[#a7463d]"
                          : "text-[#8f8e89]"
                    }`}
                  >
                    {progressComparison.tasksDelta > 0
                      ? `Up ${progressComparison.tasksDelta} vs last week`
                      : progressComparison.tasksDelta < 0
                        ? `Down ${Math.abs(progressComparison.tasksDelta)} vs last week`
                        : "Same completed tasks as last week"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 rounded-2xl border border-[#e6e5e0] bg-white p-5 lg:grid-cols-2">
                <TrendChart
                  label="Hours worked"
                  color="#6d5bd0"
                  values={progressDays.map((day) => day.hours)}
                />
                <TrendChart
                  label="Tasks completed"
                  color="#4c9a70"
                  values={progressDays.map((day) => day.tasksDone)}
                />
              </div>
              <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
                <h2 className="text-[13px] font-bold">Daily log</h2>
                <div className="mt-4 space-y-3">
                  {[...progressDays].reverse().map((day) => (
                    <div
                      key={day.date}
                      className="rounded-xl border border-[#ecebe7] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold">
                          {new Intl.DateTimeFormat(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }).format(new Date(day.date))}
                        </p>
                        <p className="text-[11px] text-[#8f8e89]">
                          {day.hours}h · {day.tasksDone}/{day.tasksTotal} tasks
                        </p>
                      </div>
                      {day.summary ? (
                        <p className="mt-2 text-[12px] leading-5 text-[#565550]">
                          {day.summary}
                        </p>
                      ) : (
                        <p className="mt-2 text-[12px] text-[#9a9994]">
                          No EOD logged
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {view === "archive" && (
            <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
              <h1 className="text-2xl font-bold tracking-[-0.04em]">Archive</h1>
              <p className="mt-1 text-sm text-[#777671]">
                Archived projects stay here until you restore or permanently
                delete them
              </p>
              <div className="mt-5 space-y-2">
                {archivedProjects.length ? (
                  archivedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-3 rounded-xl border border-[#ecebe7] px-4 py-3"
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: project.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {project.name}
                        </p>
                        <p className="truncate text-[11px] text-[#9a9994]">
                          {project.client}
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#5f4db9] hover:bg-[#eeecfa]"
                        onClick={() => void restoreProject(project)}
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#a7463d] hover:bg-[#fff0ee]"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Permanently delete ${project.name}? This cannot be undone.`,
                            )
                          ) {
                            void deleteProject(project.id);
                          }
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8f8e89]">
                    No archived projects. Use a project&apos;s menu to archive it.
                  </p>
                )}
              </div>
            </section>
          )}

          {view === "settings" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-[-0.04em]">Settings</h1>
                <p className="mt-1 text-sm text-[#777671]">
                  Notifications, install, and account
                </p>
              </div>
              <PwaControls />
              <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
                <p className="text-sm font-bold">Account</p>
                <p className="mt-2 text-sm">{user.name}</p>
                <p className="text-xs text-[#8f8e89]">{user.email}</p>
              </div>
            </section>
          )}
        </main>
      </div>

      {todoComposerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold">Add a personal todo</h2>
                <p className="mt-1 text-xs text-[#8c8b86]">
                  Set a time to get a push notification if it is still pending.
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-lg p-2 text-[#888782] hover:bg-[#f3f3f0]"
                onClick={() => setTodoComposerOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <input
              autoFocus
              className="mt-5 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              placeholder="What do you need to remember?"
              value={newTodo}
              onChange={(event) => setNewTodo(event.target.value)}
            />
            <label className="mt-4 block text-xs font-bold text-[#62615d]">
              Reminder (optional)
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              type="datetime-local"
              value={newTodoReminder}
              onChange={(event) => setNewTodoReminder(event.target.value)}
            />
            <p className="mt-2 text-[10px] leading-4 text-[#999893]">
              You&apos;ll get a push notification if the todo is still pending.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
                onClick={() => setTodoComposerOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={!newTodo.trim()}
                onClick={() => void addTodo()}
              >
                Add todo
              </button>
            </div>
          </div>
        </div>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Add a task</h2>
                <p className="mt-1 text-xs text-[#8c8b86]">
                  {projects.find((project) => project.id === taskProjectId)?.name ??
                    "Select a project"}{" "}
                  · Today
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-lg p-2 text-[#888782] hover:bg-[#f3f3f0]"
                onClick={() => setComposerOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            {projects.length > 1 && (
              <select
                className="mt-4 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none"
                value={taskProjectId}
                onChange={(event) => setTaskProjectId(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
            <input
              autoFocus
              className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
              placeholder="What needs to be done?"
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
            />
            <textarea
              className="mt-3 min-h-[90px] w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
              placeholder="Add a description (optional)"
              value={newTaskDescription}
              onChange={(event) => setNewTaskDescription(event.target.value)}
            ></textarea>
            <input
              className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none transition focus:border-[#8a79dc]"
              placeholder="Google Drive screenshots link (optional)"
              type="url"
              value={newTaskScreenshotUrl}
              onChange={(event) => setNewTaskScreenshotUrl(event.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
                onClick={() => setComposerOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5d4dbb]"
                onClick={() => void addTask()}
              >
                Add task
              </button>
            </div>
          </div>
        </div>
      )}

      {projectComposerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Add a project</h2>
                <p className="mt-1 text-xs text-[#8c8b86]">
                  Track daily work for a client or product
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-lg p-2 text-[#888782] hover:bg-[#f3f3f0]"
                onClick={() => setProjectComposerOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <input
              autoFocus
              className="mt-5 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
              placeholder="Project name"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void addProject()}
            />
            <input
              className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
              placeholder="Client name (optional)"
              value={newProjectClient}
              onChange={(event) => setNewProjectClient(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void addProject()}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
                onClick={() => setProjectComposerOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5d4dbb]"
                onClick={() => void addProject()}
              >
                Add project
              </button>
            </div>
          </div>
        </div>
      )}
      {renameProjectId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold">Rename project</h2>
                <p className="mt-1 text-xs text-[#8c8b86]">
                  Update the project or client name
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-lg p-2 text-[#888782] hover:bg-[#f3f3f0]"
                onClick={() => setRenameProjectId("")}
              >
                <X size={17} />
              </button>
            </div>
            <input
              autoFocus
              className="mt-5 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              placeholder="Project name"
              value={editProjectName}
              onChange={(event) => setEditProjectName(event.target.value)}
            />
            <input
              className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              placeholder="Client name (optional)"
              value={editProjectClient}
              onChange={(event) => setEditProjectClient(event.target.value)}
            />
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#a7463d] hover:bg-[#fff0ee]"
                onClick={() => {
                  const project = projects.find(
                    (item) => item.id === renameProjectId,
                  );
                  if (project) void archiveProject(project);
                }}
              >
                <Archive size={14} /> Archive
              </button>
              <div className="flex gap-2">
              <button
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
                onClick={() => setRenameProjectId("")}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={!editProjectName.trim()}
                onClick={() => void saveRenameProject()}
              >
                Save
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {messageComposer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold">
                  {messageComposer === "client"
                    ? "Save client message"
                    : "Queue a message"}
                </h2>
                <p className="mt-1 text-xs text-[#8c8b86]">
                  {messageComposer === "client"
                    ? "Paste what the client asked for."
                    : "Draft anything to send or reuse later. Project is optional."}
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-lg p-2 text-[#888782] hover:bg-[#f3f3f0]"
                onClick={() => setMessageComposer(null)}
              >
                <X size={17} />
              </button>
            </div>
            <select
              aria-label="Project"
              className="mt-5 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none"
              value={messageProjectId}
              onChange={(event) => setMessageProjectId(event.target.value)}
            >
              {messageComposer === "queued" ? (
                <option value="">No project</option>
              ) : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {messageComposer === "client" && (
              <input
                className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
                placeholder="Who sent it? (optional)"
                value={messageSender}
                onChange={(event) => setMessageSender(event.target.value)}
              />
            )}
            <textarea
              autoFocus
              className="mt-3 min-h-32 w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              placeholder={
                messageComposer === "client"
                  ? "Paste the client message…"
                  : "Write a note or message to send later…"
              }
              value={messageContent}
              onChange={(event) => setMessageContent(event.target.value)}
            ></textarea>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
                onClick={() => setMessageComposer(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5d4dbb] disabled:opacity-50"
                disabled={!messageContent.trim()}
                onClick={() => void saveMessage()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {eodOpen ? (
        <EodModal
          onClose={() => {
            setEodOpen(false);
            if (view === "eod") void loadEodEntries();
            if (view === "progress" || view === "timeline") void loadProgress();
          }}
        />
      ) : null}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
        active
          ? "bg-[#eeecfa] font-semibold text-[#5e4db7]"
          : "text-[#666560] hover:bg-[#f0f0ed]"
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="grid size-5 place-items-center rounded-full bg-[#e4dffc] text-[9px] font-bold text-[#5f4db9]">
          {badge}
        </span>
      )}
    </button>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Circle size={7} fill={color} strokeWidth={0} />
        <span className="text-lg font-bold tracking-[-0.03em]">{value}</span>
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#9b9a95]">
        {label}
      </p>
    </div>
  );
}

function QueueItem({
  project,
  text,
  status,
  color,
}: {
  project: string;
  text: string;
  status: string;
  color: string;
}) {
  return (
    <div className="border-b border-[#efeee9] pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full" style={{ background: color }} />
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9994]">
          {project}
        </p>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[11px] font-medium leading-4 text-[#565550]">
        {text}
      </p>
      <p className="mt-1.5 flex items-center gap-1 text-[9px] uppercase text-[#aaa9a4]">
        <Clock3 size={9} /> {status}
      </p>
    </div>
  );
}
