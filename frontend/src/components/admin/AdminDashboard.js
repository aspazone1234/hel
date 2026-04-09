import { useState, useEffect, useCallback } from "react";
import { Users, Hotel, UserCheck, Plane, AlertTriangle, Clock, ChevronDown, ChevronUp, X, Bell } from "lucide-react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drillModal, setDrillModal] = useState(null);
  const [drillData, setDrillData] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(true);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: d } = await axios.get(`${API}/api/admin/dashboard`, { headers: authHeaders() });
        setData(d);
      } catch {}
      setLoading(false);
    };
    fetchDashboard();
  }, [authHeaders]);

  const openDrillDown = async (field, value, title) => {
    setDrillModal(title);
    setDrillLoading(true);
    try {
      const { data: d } = await axios.get(`${API}/api/admin/dashboard/drill-down`, {
        headers: authHeaders(), params: { field, value },
      });
      setDrillData(d);
    } catch { setDrillData([]); }
    setDrillLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-gray-500" data-testid="dashboard-loading">Loading Command Centre...</div>;
  if (!data) return <div className="p-6 text-center text-red-500">Failed to load</div>;

  const { arrival_summary: arr, daily_schedule: ds } = data;

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="command-centre">
      <h1 className="text-xl md:text-2xl font-bold text-[#0B1C3D]" data-testid="command-centre-title">Command Centre</h1>

      {/* Pending Approval Alert */}
      {data.pending_count > 0 && user?.role === "superadmin" && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4" data-testid="pending-alert">
          <Bell className="text-amber-600 shrink-0" size={20} />
          <span className="text-amber-800 font-medium text-sm">
            {data.pending_count} pending form approval{data.pending_count > 1 ? "s" : ""} awaiting your review
          </span>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected Guests - own block */}
        <StatCard
          icon={Clock} label="Expected Guests" color="bg-blue-50" textColor="text-blue-700" iconColor="text-blue-500"
          families={arr.expected.families} people={arr.expected.people}
          onClick={() => openDrillDown("arrival_status", "not_arrived", "Expected Guests")}
          testId="stat-expected"
        />

        {/* Combined: Arrived + Not Coming + Not Arrived */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100 cursor-pointer hover:shadow-md transition-shadow" data-testid="stat-arrival-status">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck size={18} className="text-emerald-600" />
            <span className="font-semibold text-emerald-800 text-sm">Arrival Status</span>
          </div>
          <div className="space-y-2">
            <button onClick={() => openDrillDown("arrival_status", "arrived", "Arrived Guests")} className="flex justify-between items-center w-full text-left hover:bg-emerald-100/50 rounded px-2 py-1 transition" data-testid="stat-arrived">
              <span className="text-sm text-emerald-700">Arrived</span>
              <span className="font-bold text-emerald-900 text-sm">{arr.arrived.families} fam / {arr.arrived.people} ppl</span>
            </button>
            <button onClick={() => openDrillDown("arrival_status", "not_coming", "Not Coming")} className="flex justify-between items-center w-full text-left hover:bg-red-100/50 rounded px-2 py-1 transition" data-testid="stat-not-coming">
              <span className="text-sm text-red-600">Not Coming</span>
              <span className="font-bold text-red-700 text-sm">{arr.not_coming.families} fam / {arr.not_coming.people} ppl</span>
            </button>
            <button onClick={() => openDrillDown("arrival_status", "not_arrived", "Not Yet Arrived")} className="flex justify-between items-center w-full text-left hover:bg-amber-100/50 rounded px-2 py-1 transition" data-testid="stat-not-arrived">
              <span className="text-sm text-amber-600">Not Arrived</span>
              <span className="font-bold text-amber-700 text-sm">{arr.not_arrived?.families || arr.expected.families} fam</span>
            </button>
          </div>
        </div>

        {/* Departed - own block */}
        <StatCard
          icon={Plane} label="Departed" color="bg-gray-50" textColor="text-gray-600" iconColor="text-gray-400"
          families={arr.departed.families} people={arr.departed.people}
          onClick={() => openDrillDown("arrival_status", "departed", "Departed Guests")}
          testId="stat-departed"
        />

        {/* Room Stats - merged into one card */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100" data-testid="stat-rooms">
          <div className="flex items-center gap-2 mb-3">
            <Hotel size={18} className="text-purple-600" />
            <span className="font-semibold text-purple-800 text-sm">Rooms</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-purple-600">Total</span><span className="font-bold text-purple-900 text-sm">{data.total_rooms}</span></div>
            <div className="flex justify-between"><span className="text-sm text-purple-600">Occupied</span><span className="font-bold text-purple-900 text-sm">{data.occupied_rooms}</span></div>
            <div className="flex justify-between"><span className="text-sm text-green-600">Available</span><span className="font-bold text-green-700 text-sm">{data.available_rooms}</span></div>
          </div>
        </div>
      </div>

      {/* Active Tickets Alert */}
      {data.active_tickets > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3" data-testid="ticket-alert">
          <AlertTriangle className="text-red-500 shrink-0" size={18} />
          <span className="text-red-700 font-medium text-sm">{data.active_tickets} active help ticket{data.active_tickets > 1 ? "s" : ""} need attention</span>
        </div>
      )}

      {/* Daily Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="daily-schedule">
        <button onClick={() => setScheduleExpanded(!scheduleExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
          <h2 className="font-semibold text-[#0B1C3D] text-base">Daily Schedule (27 May - 4 June)</h2>
          {scheduleExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {scheduleExpanded && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 pb-2 border-b mb-2">
              <span>Date</span>
              <span className="text-center">Arrivals</span>
              <span className="text-center">Departures</span>
            </div>
            {ds.map((d) => (
              <div key={d.date} className="grid grid-cols-3 gap-2 py-2 border-b border-gray-50 last:border-0 items-center">
                <span className="text-sm font-medium text-gray-700">
                  {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <button
                  onClick={() => openDrillDown("arrival_date", d.date, `Arrivals on ${d.date}`)}
                  className="mx-auto bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-full w-10 h-10 flex items-center justify-center text-sm transition"
                  data-testid={`arrival-chip-${d.date}`}
                >
                  {d.arrivals_families}
                </button>
                <button
                  onClick={() => openDrillDown("departure_date", d.date, `Departures on ${d.date}`)}
                  className="mx-auto bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-full w-10 h-10 flex items-center justify-center text-sm transition"
                  data-testid={`departure-chip-${d.date}`}
                >
                  {d.departures_families}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drill-down Modal */}
      <Dialog open={!!drillModal} onOpenChange={() => setDrillModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0B1C3D]">{drillModal}</DialogTitle>
          </DialogHeader>
          {drillLoading ? (
            <p className="text-center text-gray-500 py-4">Loading...</p>
          ) : drillData.length === 0 ? (
            <p className="text-center text-gray-400 py-4">No records found</p>
          ) : (
            <div className="space-y-2" data-testid="drill-down-list">
              {drillData.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-[#0B1C3D] text-sm">{r.head_name}</p>
                    <p className="text-xs text-gray-500">{r.num_people} people {r.rooms?.length > 0 && `• Room: ${r.rooms.join(", ")}`}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.arrival_status === "arrived" ? "bg-green-100 text-green-700" :
                    r.arrival_status === "departed" ? "bg-gray-100 text-gray-600" :
                    r.arrival_status === "not_coming" ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>{r.arrival_status}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, color, textColor, iconColor, families, people, onClick, testId }) {
  return (
    <button onClick={onClick} className={`${color} rounded-xl p-4 text-left hover:shadow-md transition-shadow border border-gray-100 w-full`} data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className={iconColor} />
        <span className={`font-semibold ${textColor} text-sm`}>{label}</span>
      </div>
      <p className={`font-bold text-lg ${textColor}`}>{families} <span className="text-xs font-normal">families</span></p>
      <p className={`text-sm ${textColor} opacity-70`}>{people} people</p>
    </button>
  );
}
