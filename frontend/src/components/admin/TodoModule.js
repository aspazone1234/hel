import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Check, RefreshCw, Users, ChevronDown, ChevronUp, Clock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function TodoModule({ user }) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssignView, setShowAssignView] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const fetchTodos = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/todos`, { headers: authHeaders() });
      setTodos(data.data || data || []);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const today = new Date().toISOString().slice(0, 10);

  // A recurring task is pending today if it hasn't been completed today
  const isRecurringPendingToday = (t) => {
    if (!t.is_recurring) return false;
    return t.last_completed_date !== today;
  };

  const isPending = (t) => {
    if (t.is_recurring) return isRecurringPendingToday(t);
    return !t.completed;
  };

  const completeTodo = async (t) => {
    try {
      await axios.put(`${API}/api/admin/todos/${t.id}`, { completed: true }, { headers: authHeaders() });
      t.is_recurring ? toast.success("Marked complete for today!") : toast.success("Task completed!");
      fetchTodos();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteTodo = async (t) => {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    try {
      await axios.delete(`${API}/api/admin/todos/${t.id}`, { headers: authHeaders() });
      toast.success("Task deleted");
      fetchTodos();
    } catch (e) { toast.error(e.response?.data?.detail || "Cannot delete this task"); }
  };

  const pending = todos.filter(t => isPending(t));
  const recurring = todos.filter(t => t.is_recurring);
  const completed = todos.filter(t => !t.is_recurring && t.completed);

  const canDelete = (t) => {
    if (isSuper) return true;
    if (t.is_recurring) return false;
    if (t.created_by_role === "superadmin") return false;
    return t.created_by === user?.username;
  };

  return (
    <div className="p-4 md:p-6 space-y-5" data-testid="todo-module">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[#0B1C3D]">My Duties</h1>
          <p className="text-xs text-gray-500">{pending.length} pending · {completed.length} completed today</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-[#0B1C3D] text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 hover:bg-[#1a3a6b] transition" data-testid="add-todo-btn">
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* === GUEST ASSIGNMENT SECTION === */}
      <GuestAssignmentSection user={user} authHeaders={authHeaders} showAssignView={showAssignView} setShowAssignView={setShowAssignView} />

      {/* Recurring Tasks — only shown separately for non-superadmin */}
      {!isSuper && recurring.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden" data-testid="recurring-tasks">
          <div className="p-3 border-b border-purple-200 flex items-center gap-2">
            <RefreshCw size={14} className="text-purple-600" />
            <span className="font-semibold text-purple-800 text-sm">Repeating Tasks</span>
            <span className="text-xs text-purple-500 ml-1">({recurring.length})</span>
          </div>
          <div className="divide-y divide-purple-100">
            {recurring.map(t => {
              const pendingToday = isRecurringPendingToday(t);
              const history = t.completion_history || [];
              return (
                <div key={t.id} className="p-3" data-testid={`recurring-task-${t.id}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => pendingToday && completeTodo(t)}
                      disabled={!pendingToday}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${pendingToday ? "border-purple-400 hover:bg-purple-100 cursor-pointer" : "border-green-400 bg-green-50 cursor-default"}`}
                      data-testid={`complete-recurring-${t.id}`}
                    >
                      {!pendingToday && <Check size={10} className="text-green-600" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-[#0B1C3D]">{t.title}</p>
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <RefreshCw size={8} /> Daily
                        </span>
                        {t.recurring_time && <span className="text-[10px] text-purple-600 flex items-center gap-0.5"><Clock size={8} /> {t.recurring_time}</span>}
                        {!pendingToday && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Done today</span>}
                      </div>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">For: {t.assigned_to} · By: {t.created_by_name}</p>
                      {/* Completion history */}
                      {history.length > 0 && (
                        <details className="mt-1.5">
                          <summary className="text-xs text-purple-600 cursor-pointer hover:text-purple-800">
                            Completion history ({history.length})
                          </summary>
                          <div className="pl-2 mt-1 space-y-0.5 border-l-2 border-purple-100">
                            {history.slice(-5).reverse().map((h, i) => (
                              <p key={i} className="text-xs text-gray-500">{h.date} — {h.completed_by}</p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                    {canDelete(t) && (
                      <button onClick={() => deleteTodo(t)} className="text-red-300 hover:text-red-500 shrink-0" data-testid={`delete-todo-${t.id}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Tasks — for Super Admin includes both recurring + non-recurring in filtered view */}
      <div className="space-y-2" data-testid="todo-pending">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Tasks</p>
          {isSuper && (
            <div className="flex gap-1 flex-wrap">
              <select onChange={e => setFilterAssignee(e.target.value)} value={filterAssignee || ""}
                className="text-xs border rounded px-2 py-1 bg-gray-50">
                <option value="">All assignees</option>
                {[...new Set([...pending, ...recurring].map(t => t.assigned_to).filter(Boolean))].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select onChange={e => setFilterPriority(e.target.value)} value={filterPriority || ""}
                className="text-xs border rounded px-2 py-1 bg-gray-50">
                <option value="">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}
        </div>
        {loading ? <p className="text-gray-400 text-sm">Loading...</p> : (() => {
          // For Super Admin: merge recurring + non-recurring, apply same filters
          // For others: only non-recurring (recurring shown separately above)
          let allTasks = isSuper
            ? [...recurring, ...pending.filter(t => !t.is_recurring)]
            : pending.filter(t => !t.is_recurring);
          if (filterAssignee) allTasks = allTasks.filter(t => t.assigned_to === filterAssignee);
          if (filterPriority) allTasks = allTasks.filter(t => t.priority === filterPriority);
          return allTasks.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Check size={20} className="text-green-400 mx-auto mb-1" />
              <p className="text-sm text-gray-400">All caught up!</p>
            </div>
          ) : (
            allTasks.map(t => t.is_recurring ? (
              <div key={t.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-3" data-testid={`recurring-task-${t.id}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => isRecurringPendingToday(t) && completeTodo(t)}
                    disabled={!isRecurringPendingToday(t)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${isRecurringPendingToday(t) ? "border-purple-400 hover:bg-purple-100 cursor-pointer" : "border-green-400 bg-green-50 cursor-default"}`}
                  >
                    {!isRecurringPendingToday(t) && <Check size={10} className="text-green-600" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-[#0B1C3D]">{t.title}</p>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <RefreshCw size={8} /> Daily
                      </span>
                      {t.recurring_time && <span className="text-[10px] text-purple-600 flex items-center gap-0.5"><Clock size={8} /> {t.recurring_time}</span>}
                      {!isRecurringPendingToday(t) && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Done today</span>}
                    </div>
                    {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">For: {t.assigned_to} · By: {t.created_by_name}</p>
                  </div>
                  {canDelete(t) && (
                    <button onClick={() => deleteTodo(t)} className="text-red-300 hover:text-red-500 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <TaskCard key={t.id} task={t} onComplete={completeTodo} onDelete={canDelete(t) ? deleteTodo : null} isSuper={isSuper} />
            ))
          );
        })()}
      </div>

      {/* Completed Tasks */}
      {completed.length > 0 && (
        <div className="space-y-2" data-testid="todo-completed">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed ({completed.length})</p>
          {completed.map(t => (
            <div key={t.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 opacity-60" data-testid={`completed-task-${t.id}`}>
              <div className="w-5 h-5 rounded border-2 border-green-400 bg-green-50 flex items-center justify-center shrink-0">
                <Check size={10} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 line-through truncate">{t.title}</p>
                <p className="text-xs text-gray-400">{t.assigned_to}</p>
              </div>
              {canDelete(t) && (
                <button onClick={() => deleteTodo(t)} className="text-red-300 hover:text-red-500 shrink-0" data-testid={`delete-todo-${t.id}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateTodoDialog open={showCreate} onClose={() => setShowCreate(false)} user={user} authHeaders={authHeaders} onCreated={() => { setShowCreate(false); fetchTodos(); }} />
    </div>
  );
}

function TaskCard({ task: t, onComplete, onDelete, isSuper }) {
  return (
    <div className={`bg-white rounded-xl p-3 border flex items-start gap-3 ${t.priority === "high" ? "border-red-200" : "border-gray-200"}`} data-testid={`pending-task-${t.id}`}>
      <button onClick={() => onComplete(t)}
        className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 flex items-center justify-center shrink-0 transition"
        data-testid={`complete-task-${t.id}`}>
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[#0B1C3D]">{t.title}</p>
        {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{t.priority}</span>
          {t.due_date && <span className="text-xs text-gray-400">{t.due_date}</span>}
          {t.assigned_to && <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">For: {t.assigned_to}</span>}
          {isSuper && t.created_by_name && <span className="text-xs text-gray-400">By: {t.created_by_name}</span>}
        </div>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(t)} className="text-red-300 hover:text-red-500 shrink-0" data-testid={`delete-task-${t.id}`}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function GuestAssignmentSection({ user, authHeaders, showAssignView, setShowAssignView }) {
  const [admins, setAdmins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [assignedGuests, setAssignedGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [allGuests, setAllGuests] = useState([]);
  const [guestsLoaded, setGuestsLoaded] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/admin/admins`, { headers: authHeaders() })
      .then(r => setAdmins(r.data || []))
      .catch(() => {});
  }, [authHeaders]);

  // Pre-fetch all guests for count display
  useEffect(() => {
    if (!showAssignView || guestsLoaded) return;
    const fetchAll = async () => {
      try {
        const [exp, arr] = await Promise.all([
          axios.get(`${API}/api/admin/guests/expected`, { headers: authHeaders(), params: { per_page: 500 } }),
          axios.get(`${API}/api/admin/guests/arrived`, { headers: authHeaders(), params: { per_page: 500 } }),
        ]);
        setAllGuests([...(exp.data.data || []), ...(arr.data.data || [])]);
        setGuestsLoaded(true);
      } catch {}
    };
    fetchAll();
  }, [authHeaders, showAssignView, guestsLoaded]);

  const getAssignCount = (admin) => {
    const name = admin.name || admin.username;
    return allGuests.filter(g => g.assigned_swamsevak === name || g.assigned_swamsevak === admin.username).length;
  };

  const viewAssignments = async (admin) => {
    setSelected(admin);
    setLoadingGuests(true);
    const name = admin.name || admin.username;
    const filtered = allGuests.filter(g =>
      g.assigned_swamsevak === name || g.assigned_swamsevak === admin.username
    );
    setAssignedGuests(filtered);
    setLoadingGuests(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="guest-assignment-section">
      <button
        onClick={() => setShowAssignView(!showAssignView)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        data-testid="toggle-assign-view"
      >
        <div className="flex items-center gap-2">
          <Users size={16} className="text-indigo-600" />
          <span className="font-semibold text-[#0B1C3D] text-sm">Guest Assignments</span>
          <span className="text-xs text-gray-400">— click a Swayamsevak to see their guests</span>
        </div>
        {showAssignView ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showAssignView && (
        <div className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {admins.filter(a => a.role === "swamsevak" || a.role === "admin").map(a => {
              const count = getAssignCount(a);
              return (
                <button key={a.username}
                  onClick={() => viewAssignments(a)}
                  className={`text-left rounded-lg p-2.5 border text-sm transition ${selected?.username === a.username ? "bg-indigo-50 border-indigo-300" : "bg-gray-50 border-gray-200 hover:border-indigo-200"}`}
                  data-testid={`view-assign-${a.username}`}>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${count > 0 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {count}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-[#0B1C3D] truncate">{a.name || a.username}</p>
                      <p className="text-xs text-gray-400 capitalize">{a.role}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {admins.filter(a => a.role === "swamsevak" || a.role === "admin").length === 0 && (
              <p className="text-xs text-gray-400 col-span-3">No Swayamsevaks in system.</p>
            )}
          </div>

          {selected && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3" data-testid="assign-guest-list">
              <p className="text-xs font-semibold text-indigo-700 mb-2">
                {selected.name}'s Assigned Guests {!loadingGuests && `(${assignedGuests.length})`}
              </p>
              {loadingGuests ? (
                <p className="text-xs text-gray-400">Loading...</p>
              ) : assignedGuests.length === 0 ? (
                <p className="text-xs text-gray-400">No guests assigned to {selected.name}</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {assignedGuests.map(g => {
                    const head = (g.attendees || []).find(a => a.id === g.group_head_id);
                    return (
                      <div key={g.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs border border-indigo-100">
                        <div>
                          <p className="font-medium text-[#0B1C3D]">{head?.name || g.primary_mobile} <span className="font-normal text-gray-400">· {g.primary_mobile}</span></p>
                          <p className="text-gray-400">{g.num_people} people · Room: {(g.room_assignments || []).join(", ") || "—"}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${g.arrival_status === "arrived" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {g.arrival_status === "arrived" ? "Arrived" : "Expected"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateTodoDialog({ open, onClose, user, authHeaders, onCreated }) {
  const isSuper = user?.role === "superadmin";
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState(user?.username || "");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringTime, setRecurringTime] = useState("08:00");
  const [admins, setAdmins] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isSuper) {
      axios.get(`${API}/api/admin/admins`, { headers: authHeaders() })
        .then(r => setAdmins(r.data || []))
        .catch(() => {});
    }
    setAssignedTo(user?.username || "");
    setIsRecurring(false);
  }, [open, isSuper, authHeaders, user?.username]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Task title required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/todos`, {
        title: title.trim(),
        description: desc,
        priority,
        due_date: dueDate,
        assigned_to: isSuper ? assignedTo : user?.username,
        is_recurring: isSuper ? isRecurring : false,
        recurring_time: isSuper && isRecurring ? recurringTime : "",
      }, { headers: authHeaders() });
      toast.success(isRecurring ? "Recurring task created!" : "Task created!");
      setTitle(""); setDesc(""); setPriority("medium"); setDueDate(""); setAssignedTo(user?.username || ""); setIsRecurring(false); setRecurringTime("08:00");
      onCreated();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="create-todo-dialog">
        <DialogHeader><DialogTitle>{isRecurring ? "New Repeating Task" : "New Task"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Task Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" data-testid="todo-title-input" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optional details..." className="mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none" data-testid="todo-desc-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" data-testid="todo-priority-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" data-testid="todo-due-input" />
            </div>
          </div>
          {isSuper && (
            <div>
              <label className="text-xs font-medium text-gray-700">Assign To</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" data-testid="todo-assign-select">
                <option value={user?.username}>Myself ({user?.name})</option>
                {admins.filter(a => a.username !== user?.username).map(a => (
                  <option key={a.username} value={a.username}>{a.name || a.username} ({a.role})</option>
                ))}
              </select>
            </div>
          )}
          {/* Recurring Task Option — Super Admin only */}
          {isSuper && (
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded" data-testid="recurring-toggle" />
                <span className="text-sm font-medium text-purple-800 flex items-center gap-1.5"><RefreshCw size={13} /> Make this a repeating task</span>
              </label>
              {isRecurring && (
                <div className="mt-2">
                  <label className="text-xs text-purple-700">Reset time each day (task becomes pending again at this time)</label>
                  <input type="time" value={recurringTime} onChange={e => setRecurringTime(e.target.value)} className="mt-1 w-full border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white" data-testid="recurring-time-input" />
                  <p className="text-xs text-purple-500 mt-1">When completed, it marks "done for today" and resets tomorrow. History is preserved.</p>
                </div>
              )}
            </div>
          )}
          {!isSuper && (
            <div className="bg-amber-50 rounded-lg p-2 flex items-center gap-2">
              <AlertCircle size={12} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">You can create tasks for yourself only. Recurring tasks can only be created by Super Admin.</p>
            </div>
          )}
          <button onClick={handleSave} disabled={saving} className="w-full bg-[#0B1C3D] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#1a3a6b] transition" data-testid="save-todo-btn">
            {saving ? "Creating..." : isRecurring ? "Create Repeating Task" : "Create Task"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
