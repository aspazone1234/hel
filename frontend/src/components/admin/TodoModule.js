import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Circle, Plus, Trash2, Calendar, Filter, Users } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL;

export default function TodoModule({ user }) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", assigned_to: "" });
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { per_page: 200 };
      if (filter !== "all") params.completed = filter;
      // Super admin viewing a specific admin's todos
      if (isSuper && selectedAdmin) params.assigned_to = selectedAdmin;
      const { data } = await axios.get(`${API}/api/admin/todos`, { headers: authHeaders(), params });
      let items = data.data || [];
      // Regular admins see only their own
      if (!isSuper) {
        items = items.filter(t => t.assigned_to === user?.name || t.created_by === user?.name);
      }
      setTodos(items);
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, [authHeaders, filter, isSuper, selectedAdmin, user?.name]);

  const loadAdmins = useCallback(async () => {
    if (!isSuper) return;
    try {
      const { data } = await axios.get(`${API}/api/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch {}
  }, [authHeaders, isSuper]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);
  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const createTodo = async () => {
    const newTodo = {
      ...form,
      // Admins can only create self-tasks; Super admin can assign to specific admin
      assigned_to: isSuper ? (form.assigned_to || user?.name) : user?.name,
    };
    try {
      await axios.post(`${API}/api/admin/todos`, newTodo, { headers: authHeaders() });
      toast.success("Task created");
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "medium", due_date: "", assigned_to: "" });
      fetchTodos();
    } catch { toast.error("Failed"); }
  };

  const toggleTodo = async (id, currentStatus) => {
    try {
      await axios.put(`${API}/api/admin/todos/${id}`, { completed: !currentStatus }, { headers: authHeaders() });
      fetchTodos();
    } catch { toast.error("Failed"); }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${API}/api/admin/todos/${id}`, { headers: authHeaders() });
      fetchTodos();
    } catch { toast.error("Failed"); }
  };

  const priorityColors = { high: "text-red-600 bg-red-50", medium: "text-amber-600 bg-amber-50", low: "text-green-600 bg-green-50" };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="todo-module">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl font-bold text-[#0B1C3D]">To-Do List</h1>
        <button onClick={() => setShowCreate(true)} data-testid="create-todo-btn"
          className="bg-[#0B1C3D] text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* Super Admin: Admin Selector */}
      {isSuper && (
        <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-3" data-testid="admin-selector">
          <Users size={16} className="text-purple-600 shrink-0" />
          <select className="border rounded px-3 py-1.5 text-sm flex-1" value={selectedAdmin}
            onChange={(e) => setSelectedAdmin(e.target.value)} data-testid="select-admin-todos">
            <option value="">All Swamsevaks</option>
            {admins.map(a => (
              <option key={a.username} value={a.display_name || a.username}>
                {a.display_name || a.username}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2" data-testid="todo-filters">
        {["all", "false", "true"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === f ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {f === "all" ? "All" : f === "false" ? "Pending" : "Completed"}
          </button>
        ))}
      </div>

      {/* Todo List */}
      <div className="space-y-2" data-testid="todo-list">
        {loading ? <p className="text-center text-gray-500 py-4">Loading...</p> :
          todos.length === 0 ? <p className="text-center text-gray-400 py-8">No tasks</p> :
          todos.map((t) => (
            <div key={t.id} className={`bg-white rounded-xl p-4 border flex items-start gap-3 ${t.completed ? "opacity-60" : ""}`} data-testid={`todo-${t.id}`}>
              <button onClick={() => toggleTodo(t.id, t.completed)} className="mt-0.5 shrink-0" data-testid={`toggle-${t.id}`}>
                {t.completed ? <CheckCircle size={20} className="text-green-500" /> : <Circle size={20} className="text-gray-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${t.completed ? "line-through text-gray-400" : "text-[#0B1C3D]"}`}>{t.title}</p>
                {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[t.priority] || ""}`}>{t.priority}</span>
                  {t.due_date && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Calendar size={10} /> {t.due_date}</span>}
                  {t.assigned_to && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.assigned_to}</span>}
                  {t.created_by && t.created_by !== t.assigned_to && (
                    <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">by {t.created_by}</span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteTodo(t.id)} className="text-red-400 hover:text-red-600 shrink-0" data-testid={`delete-todo-${t.id}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        }
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={() => setShowCreate(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Task title*" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="todo-title-input" />
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="w-full border rounded px-3 py-2 text-sm" value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            {isSuper && (
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} data-testid="todo-assign-select">
                <option value="">Assign to myself</option>
                {admins.map(a => (
                  <option key={a.username} value={a.display_name || a.username}>{a.display_name || a.username}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={createTodo} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm" data-testid="save-todo-btn">Create</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
