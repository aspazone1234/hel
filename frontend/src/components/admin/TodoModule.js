import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Circle, Plus, Trash2, Calendar, AlertTriangle, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PRIORITY_COLORS = { high: "border-l-red-500", medium: "border-l-amber-500", low: "border-l-green-500" };

export default function TodoModule({ user, authHeaders }) {
  const [todos, setTodos] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("false"); // completed filter
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (filter !== "all") params.completed = filter;
      const { data } = await axios.get(`${API}/admin/todos`, { headers: authHeaders(), params });
      setTodos(data.data);
      setTotal(data.total);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, [authHeaders, filter]);

  const loadAdmins = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch {}
  }, [authHeaders]);

  useEffect(() => { fetchTodos(); loadAdmins(); }, [fetchTodos, loadAdmins]);

  const toggleComplete = async (todo) => {
    try {
      await axios.put(`${API}/admin/todos/${todo.id}`, { completed: !todo.completed }, { headers: authHeaders() });
      fetchTodos();
    } catch { toast.error("Failed"); }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${API}/admin/todos/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchTodos();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div data-testid="todo-module-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>To-Do List</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">{total} task(s)</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={v => { setFilter(v); setTimeout(fetchTodos, 100); }}>
            <SelectTrigger className="w-36 bg-white border-[#D4AF37]/20 h-8 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Pending</SelectItem>
              <SelectItem value="true">Completed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreate(true)} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="create-todo-btn">
            <Plus size={14} className="mr-1" /> New Task
          </Button>
        </div>
      </div>

      {loading ? <div className="text-center py-20 text-[#0B1C3D]/40">Loading...</div> :
        todos.length === 0 ? <div className="text-center py-20 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10">No tasks found</div> :
        <div className="space-y-2">
          {todos.map(t => (
            <div key={t.id} className={`bg-white rounded-xl border border-[#D4AF37]/10 border-l-4 ${PRIORITY_COLORS[t.priority]} p-4 flex items-start gap-3 ${t.completed ? "opacity-60" : ""}`} data-testid={`todo-${t.id}`}>
              <button onClick={() => toggleComplete(t)} className="mt-0.5 shrink-0" data-testid={`toggle-todo-${t.id}`}>
                {t.completed ? <CheckCircle size={20} className="text-green-500" /> : <Circle size={20} className="text-[#0B1C3D]/20 hover:text-[#D4AF37]" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-[#0B1C3D] ${t.completed ? "line-through" : ""}`}>{t.title}</p>
                {t.description && <p className="text-xs text-[#0B1C3D]/50 mt-0.5">{t.description}</p>}
                <div className="flex items-center gap-3 text-[10px] text-[#0B1C3D]/40 mt-1">
                  {t.due_date && <span className="flex items-center gap-0.5"><Calendar size={10} /> {t.due_date}</span>}
                  <span className="flex items-center gap-0.5">Assigned: {t.assigned_to}</span>
                  {t.todo_type !== "manual" && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{t.todo_type}</span>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteTodo(t.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600 shrink-0">
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      }

      <CreateTodoDialog open={showCreate} onClose={() => setShowCreate(false)} admins={admins} authHeaders={authHeaders} user={user} onCreated={() => { setShowCreate(false); fetchTodos(); }} />
    </div>
  );
}

function CreateTodoDialog({ open, onClose, admins, authHeaders, user, onCreated }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/todos`, {
        title, description: desc, assigned_to: assignedTo || user.username,
        due_date: dueDate, priority, todo_type: "manual",
      }, { headers: authHeaders() });
      toast.success("Task created");
      setTitle(""); setDesc(""); setAssignedTo(""); setDueDate(""); setPriority("medium");
      onCreated();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="create-todo-dialog">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" data-testid="todo-title" /></div>
          <div><Label className="text-xs">Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} className="mt-1" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Self" /></SelectTrigger>
                <SelectContent>{admins.map(a => <SelectItem key={a.username} value={a.username}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" /></div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-todo-btn">{saving ? "Creating..." : "Create Task"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
