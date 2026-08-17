"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { EodModal } from "@/components/eod-modal";
import { TaskActions } from "@/components/task-actions";

type Status = "todo" | "progress" | "done";
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
};
type QueuedMessage = { id: string; content: string; status: string };
type Project = {
  id: string;
  name: string;
  client: string;
  color: string;
  tasks: Task[];
  clientMessages?: ClientMessage[];
  queuedMessages?: QueuedMessage[];
};

const statusStyle: Record<Status, { label: string; card: string; select: string }> = {
  todo: {
    label: "Not started",
    card: "border-[#e3e2dd] bg-white",
    select: "bg-[#f0f0ed] text-[#696965]",
  },
  progress: {
    label: "In progress",
    card: "border-[#f0d49f] bg-[#fffaf0]",
    select: "bg-[#fff2d8] text-[#936521]",
  },
  done: {
    label: "Done",
    card: "border-[#bddfca] bg-[#f2faf5]",
    select: "bg-[#e5f5eb] text-[#367653]",
  },
};

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [eodOpen, setEodOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskScreenshotUrl, setNewTaskScreenshotUrl] = useState("");
  const [messageComposer, setMessageComposer] = useState<
    "client" | "queued" | null
  >(null);
  const [messageContent, setMessageContent] = useState("");
  const [messageSender, setMessageSender] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error("Project not found");
        return response.json() as Promise<{ project: Project }>;
      })
      .then((data) => setProject(data.project))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  const taskCounts = useMemo(() => {
    const tasks = project?.tasks ?? [];
    return {
      done: tasks.filter((task) => task.status === "done").length,
      total: tasks.length,
    };
  }, [project]);

  function setTaskStatus(taskId: string, status: Status) {
    if (!project) return;

    const updatedProject = {
      ...project,
      tasks: project.tasks.map((item) =>
        item.id === taskId
          ? { ...item, status }
          : item,
      ),
    };
    setProject(updatedProject);
    void fetch("/api/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
  }

  function updateTask(
    taskId: string,
    updates: { description: string | null; screenshotUrl: string | null },
  ) {
    setProject((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task,
            ),
          }
        : current,
    );
  }

  function removeTask(taskId: string) {
    setProject((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.filter((task) => task.id !== taskId),
          }
        : current,
    );
  }

  async function addTask() {
    const title = newTask.trim();
    if (!project || !title) return;

    const description = newTaskDescription.trim() || null;
    const screenshotUrl = newTaskScreenshotUrl.trim() || null;
    const temporaryId = `demo-${Date.now()}`;
    const updatedProject = {
      ...project,
      tasks: [
        ...project.tasks,
        {
          id: temporaryId,
          title,
          description,
          screenshotUrl,
          status: "todo" as const,
        },
      ],
    };
    setProject(updatedProject);
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
        projectId: project.id,
      }),
    });
    if (response.ok) {
      const data = (await response.json()) as { task: Task };
      setProject((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((task) =>
                task.id === temporaryId ? data.task : task,
              ),
            }
          : current,
      );
    }
  }

  function openRename() {
    if (!project) return;
    setEditName(project.name);
    setEditClient(project.client === "No client" ? "" : project.client);
    setRenameOpen(true);
  }

  async function saveRename() {
    const name = editName.trim();
    if (!project || !name) return;

    const clientName = editClient.trim() || null;
    const previous = project;
    setProject({
      ...project,
      name,
      client: clientName ?? "No client",
    });
    setRenameOpen(false);

    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientName }),
    });

    if (!response.ok) {
      setProject(previous);
      return;
    }

    const data = (await response.json()) as {
      project: { id: string; name: string; client: string; color: string };
    };
    setProject((current) =>
      current
        ? {
            ...current,
            name: data.project.name,
            client: data.project.client,
            color: data.project.color,
          }
        : current,
    );
  }

  async function saveMessage() {
    const content = messageContent.trim();
    if (!project || !content || !messageComposer) return;

    const temporaryId = `demo-message-${Date.now()}`;
    const updatedProject: Project =
      messageComposer === "client"
        ? {
            ...project,
            clientMessages: [
              {
                id: temporaryId,
                sender: messageSender.trim() || project.client,
                content,
                receivedAt: new Date().toISOString(),
              },
              ...(project.clientMessages ?? []),
            ],
          }
        : {
            ...project,
            queuedMessages: [
              { id: temporaryId, content, status: "draft" },
              ...(project.queuedMessages ?? []),
            ],
          };

    setProject(updatedProject);
    const type = messageComposer;
    setMessageComposer(null);
    setMessageContent("");
    setMessageSender("");

    const response = await fetch(`/api/projects/${project.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, senderName: messageSender }),
    });

    if (!response.ok) return;

    if (type === "client") {
      const data = (await response.json()) as { message: ClientMessage };
      setProject((current) =>
        current
          ? {
              ...current,
              clientMessages: (current.clientMessages ?? []).map((message) =>
                message.id === temporaryId ? data.message : message,
              ),
            }
          : current,
      );
      return;
    }

    const data = (await response.json()) as { message: QueuedMessage };
    setProject((current) =>
      current
        ? {
            ...current,
            queuedMessages: (current.queuedMessages ?? []).map((message) =>
              message.id === temporaryId ? data.message : message,
            ),
          }
        : current,
    );
  }

  function updateQueuedStatus(messageId: string, status: string) {
    if (!project) return;

    const updatedProject: Project = {
      ...project,
      queuedMessages: (project.queuedMessages ?? []).map((message) =>
        message.id === messageId ? { ...message, status } : message,
      ),
    };
    setProject(updatedProject);

    if (!messageId.startsWith("demo-")) {
      void fetch(`/api/projects/${project.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, status }),
      });
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] text-sm text-[#777671]">
        Loading project…
      </main>
    );
  }

  if (!project) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Project not found</h1>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6553c6]"
          >
            <ArrowLeft size={15} /> Return to Today
          </Link>
        </div>
      </main>
    );
  }

  const messages = project.clientMessages ?? [];
  const queued = project.queuedMessages ?? [];

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#252522]">
      <header className="border-b border-[#e7e6e1] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-[#777671] hover:text-[#252522]"
          >
            <ArrowLeft size={16} /> Today
          </Link>
          <button
            aria-label="Rename project"
            className="rounded-lg p-2 text-[#777671] hover:bg-[#f2f2ef]"
            onClick={openRename}
          >
            <MoreHorizontal size={19} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 py-9 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="size-3 rounded-full"
                style={{ background: project.color }}
              />
              <p className="text-sm font-semibold text-[#898883]">
                {project.client}
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              {project.name}
            </h1>
            <p className="mt-2 text-sm text-[#85847f]">
              {taskCounts.done} of {taskCounts.total} tasks completed today
            </p>
          </div>
          <button
            className="flex items-center gap-2 rounded-xl bg-[#292927] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
            onClick={() => setComposerOpen(true)}
          >
            <Plus size={16} /> Add task
          </button>
        </div>

        <div className="mt-9 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-2xl border border-[#e6e5e0] bg-white">
            <div className="flex items-center justify-between border-b border-[#ecebe7] px-5 py-4">
              <h2 className="text-sm font-bold">Today&apos;s tasks</h2>
              <span className="text-xs text-[#999893]">Use the status menu</span>
            </div>
            {project.tasks.length ? (
              <div className="space-y-3 p-3">
                {project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors ${statusStyle[task.status].card}`}
                  >
                    <span
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                        task.status === "done"
                          ? "border-[#55a276] bg-[#55a276] text-white"
                          : task.status === "progress"
                            ? "border-[#dda04f] bg-[#fff7e7] text-[#c48431]"
                            : "border-[#cac9c4]"
                      }`}
                    >
                      {task.status === "done" ? (
                        <Check size={12} strokeWidth={3} />
                      ) : task.status === "progress" ? (
                        <Clock3 size={11} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm ${
                          task.status === "done"
                            ? "text-[#999893] line-through"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.description ? (
                        <span className="mt-1 block text-xs leading-5 text-[#8f8e89]">
                          {task.description}
                        </span>
                      ) : null}
                      {task.screenshotUrl ? (
                        <a
                          href={task.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#6553c6] hover:underline"
                        >
                          <ExternalLink size={12} /> Open screenshots
                        </a>
                      ) : null}
                    </span>
                    <select
                      aria-label={`Change status for ${task.title}`}
                      className={`rounded-lg border-0 px-2.5 py-1.5 text-[11px] font-semibold outline-none ${statusStyle[task.status].select}`}
                      value={task.status}
                      onChange={(event) =>
                        setTaskStatus(task.id, event.target.value as Status)
                      }
                    >
                      <option value="todo">Not started</option>
                      <option value="progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                    <TaskActions
                      task={task}
                      onUpdate={(updates) => updateTask(task.id, updates)}
                      onDelete={() => removeTask(task.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <FileText className="mx-auto text-[#c4c3be]" size={24} />
                <p className="mt-3 text-sm font-semibold">No tasks yet</p>
                <p className="mt-1 text-xs text-[#999893]">
                  Add the first task for this project.
                </p>
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <MessageSquareText size={16} className="text-[#7161d6]" />
                Client messages
              </h2>
              {messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className="mt-4 rounded-xl bg-[#f7f6fb] p-4">
                    <p className="text-xs font-bold">{message.sender}</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#686762]">
                      {message.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="mt-4 rounded-xl bg-[#f7f6fb] p-4 text-xs leading-5 text-[#8f8e89]">
                  Paste client requests here so the project context is always easy
                  to find.
                </p>
              )}
              <button
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e2e1dc] py-2.5 text-xs font-semibold hover:bg-[#f8f8f6]"
                onClick={() => setMessageComposer("client")}
              >
                <Plus size={13} /> Save client message
              </button>
            </section>

            <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Send size={15} className="text-[#df9145]" />
                Message queue
              </h2>
              {queued.length ? (
                queued.map((message) => (
                  <div
                    key={message.id}
                    className="mt-4 border-l-2 border-[#e09548] pl-3"
                  >
                    <p className="whitespace-pre-wrap text-xs leading-5 text-[#686762]">
                      {message.content}
                    </p>
                    <select
                      aria-label="Queued message status"
                      className="mt-2 rounded-md bg-[#fff0de] px-2 py-1 text-[10px] font-bold uppercase text-[#a5672c] outline-none"
                      value={message.status}
                      onChange={(event) =>
                        updateQueuedStatus(message.id, event.target.value)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="ready">Ready</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>
                ))
              ) : (
                <p className="mt-4 text-xs leading-5 text-[#8f8e89]">
                  Draft your next client update and keep it ready to send.
                </p>
              )}
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f2e2c] py-2.5 text-xs font-semibold text-white hover:bg-black"
                onClick={() => setMessageComposer("queued")}
              >
                <Plus size={13} /> Queue a message
              </button>
            </section>

            <section className="rounded-2xl bg-[#2f2e2c] p-5 text-white">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <FileText size={15} className="text-[#c5b9ff]" />
                Project EOD
              </h2>
              <p className="mt-3 text-xs leading-5 text-white/60">
                Record what moved forward, blockers, and tomorrow&apos;s plan for
                this project.
              </p>
              <button
                className="mt-4 w-full rounded-lg bg-white py-2.5 text-xs font-bold text-[#343331]"
                onClick={() => setEodOpen(true)}
              >
                Write project EOD
              </button>
            </section>
          </div>
        </div>
      </main>

      {renameOpen && (
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
                onClick={() => setRenameOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <input
              autoFocus
              className="mt-5 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              placeholder="Project name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
            <input
              className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              placeholder="Client name (optional)"
              value={editClient}
              onChange={(event) => setEditClient(event.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={!editName.trim()}
                onClick={() => void saveRename()}
              >
                Save
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
                <p className="mt-1 text-xs text-[#8c8b86]">{project.name} · Today</p>
              </div>
              <button
                aria-label="Close"
                className="rounded-lg p-2 text-[#888782] hover:bg-[#f3f3f0]"
                onClick={() => setComposerOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <input
              autoFocus
              className="mt-5 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
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
                    : "Draft a reply to send later."}
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
            {messageComposer === "client" && (
              <input
                className="mt-5 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
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
                  : "Write the message you want to send…"
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
          projectId={project.id}
          projectName={project.name}
          onClose={() => setEodOpen(false)}
        />
      ) : null}
    </div>
  );
}
