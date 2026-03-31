import { useState, useEffect } from "react";
import { Users, Clock, MapPin, AlertTriangle, ChevronRight, DoorOpen, UserCheck, Trash2, XCircle, Home as HomeIcon } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard({ user, authHeaders, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/admin/dashboard`, { headers: authHeaders() })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-[#0B1C3D]/50">Loading dashboard...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load dashboard</div>;
  const d = data;

  return (
    <div className="space-y-6" data-testid="admin-dashboard-view">
      {/* Smart Alerts */}
      <div className="space-y-3">
        {d.pending_count > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-all" onClick={() => onNavigate("mastercontrol")} data-testid="alert-pending">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600" />
              <span className="text-amber-800 font-medium">{d.pending_count} forms pending approval</span>
            </div>
            <ChevronRight size={18} className="text-amber-400" />
          </div>
        )}
        {d.missing_management > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3" data-testid="alert-missing-mgmt">
            <AlertTriangle size={20} className="text-orange-600" />
            <span className="text-orange-800 font-medium">{d.missing_management} entries missing management details</span>
          </div>
        )}
        {d.total_rooms > 0 && d.available_rooms <= 3 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3" data-testid="alert-rooms-low">
            <AlertTriangle size={20} className="text-red-600" />
            <span className="text-red-800 font-medium">Rooms nearing full capacity ({d.available_rooms} available)</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
        <Card icon={<Users />} label="Approved Families" value={d.total_approved} color="gold" />
        <Card icon={<Users />} label="Total People" value={d.total_people} color="blue" />
        <Card icon={<MapPin />} label="Arrivals (28 May - 3 Jun)" value={d.arrivals_range} color="green" />
        <Card icon={<DoorOpen />} label="Departures (28 May - 3 Jun)" value={d.departures_range} color="purple" />
      </div>

      {/* Arrival Summary */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-6">
        <h3 className="text-lg font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Arrival Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniCard icon={<UserCheck size={18} />} label="Families Arrived" value={d.arrived_families} color="text-green-600" bg="bg-green-50" />
          <MiniCard icon={<Users size={18} />} label="People Arrived" value={d.arrived_people} color="text-green-600" bg="bg-green-50" />
          <MiniCard icon={<XCircle size={18} />} label="Not Coming" value={d.not_coming} color="text-red-500" bg="bg-red-50" />
          <MiniCard icon={<HomeIcon size={18} />} label="Rooms Available" value={`${d.available_rooms}/${d.total_rooms}`} color="text-blue-600" bg="bg-blue-50" />
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center cursor-pointer hover:bg-amber-100 transition-all" onClick={() => onNavigate("mastercontrol")} data-testid="quick-pending">
          <Clock size={20} className="text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700">{d.pending_count}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center cursor-pointer hover:bg-red-100 transition-all" onClick={() => onNavigate("recyclebin")} data-testid="quick-deleted">
          <Trash2 size={20} className="text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-600">{d.deleted_count}</p>
          <p className="text-xs text-red-500">Recycle Bin</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center cursor-pointer hover:bg-gray-100 transition-all" onClick={() => onNavigate("recyclebin")}>
          <XCircle size={20} className="text-gray-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-600">{d.rejected_count}</p>
          <p className="text-xs text-gray-500">Rejected</p>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, label, value, color }) {
  const colors = { gold: "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20", blue: "bg-blue-50 text-blue-600 border-blue-200", green: "bg-green-50 text-green-600 border-green-200", purple: "bg-purple-50 text-purple-600 border-purple-200" };
  const c = colors[color] || colors.gold;
  return (
    <div className={`rounded-2xl p-6 border ${c.split(" ").slice(0, 1).join(" ")} border-${c.split("border-")[1]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.split(" ").slice(0, 1).join(" ")}`}>{icon}</div>
        <span className="text-[#0B1C3D]/50 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{value}</p>
    </div>
  );
}

function MiniCard({ icon, label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <div className={`${color} mx-auto mb-1 flex justify-center`}>{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[#0B1C3D]/40 text-xs">{label}</p>
    </div>
  );
}
