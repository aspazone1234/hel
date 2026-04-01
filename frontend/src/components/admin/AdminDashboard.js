import { useState, useEffect } from "react";
import { Users, CalendarDays, ArrowDown, ArrowUp, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard({ user, authHeaders, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/admin/dashboard`, { headers: authHeaders() })
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authHeaders]);

  if (loading) return <div className="flex justify-center py-20"><div className="text-[#D4AF37]">Loading...</div></div>;
  if (!stats) return <div className="text-center py-20 text-red-500">Failed to load dashboard</div>;

  const { arrival_summary: as_ } = stats;

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      {/* Notification Alert */}
      {stats.pending_count > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between" data-testid="pending-notification">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Bell size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Pending Form Approvals</p>
              <p className="text-amber-600 text-xs">{stats.pending_count} website forms waiting for your approval</p>
            </div>
          </div>
          <Button size="sm" onClick={() => onNavigate("formapproval")} className="bg-amber-500 text-white hover:bg-amber-600 h-8 text-xs" data-testid="go-to-approvals">
            <FileText size={14} className="mr-1" /> Review Now
          </Button>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Final Guest List (Families)" value={stats.total_approved} onClick={() => onNavigate("guestlist")} color="gold" testId="stat-families" />
        <StatCard label="Final Guest List (People)" value={stats.total_people} color="blue" testId="stat-people" />
        <StatCard label="Pending Form Approvals" value={stats.pending_count} onClick={() => onNavigate("formapproval")} color="orange" testId="stat-pending" />
      </div>

      {/* Arrival Summary + Room Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#D4AF37]/20 p-6" data-testid="arrival-summary">
          <h3 className="text-lg font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Arrival Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <ArrivalBlock label="Arrived" families={as_.arrived.families} people={as_.arrived.people} color="green" />
            <ArrivalBlock label="Not Arrived" families={as_.not_arrived.families} people={as_.not_arrived.people} color="amber" />
            <ArrivalBlock label="Not Coming" families={as_.not_coming.families} people={as_.not_coming.people} color="red" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-6 flex flex-col items-center justify-center" data-testid="rooms-detail-block">
          <p className="text-[#0B1C3D]/50 text-sm mb-1">Rooms</p>
          <p className="text-4xl font-bold text-[#0B1C3D]">{stats.available_rooms}</p>
          <p className="text-[#0B1C3D]/40 text-xs">available</p>
          <div className="mt-3 w-full space-y-1">
            <div className="flex justify-between text-xs"><span className="text-[#0B1C3D]/50">Occupied</span><span className="font-semibold text-[#0B1C3D]">{stats.occupied_rooms}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#0B1C3D]/50">Total</span><span className="font-semibold text-[#0B1C3D]">{stats.total_rooms}</span></div>
          </div>
        </div>
      </div>

      {/* Daily Arrivals & Departures (Vertical layout) */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-6" data-testid="daily-schedule">
        <h3 className="text-lg font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Daily Arrivals & Departures (28 May - 3 June)</h3>
        <div className="space-y-2">
          {(stats.daily_schedule || []).map((d, i) => {
            const dateObj = new Date(d.date + "T00:00:00");
            const dayName = dateObj.toLocaleDateString("en", { weekday: "long" });
            const dayNum = dateObj.getDate();
            const month = dateObj.toLocaleDateString("en", { month: "short" });
            return (
              <div key={i} className="flex items-center gap-4 bg-[#F8F1E5]/50 rounded-xl px-4 py-3 border border-[#D4AF37]/5" data-testid={`daily-${d.date}`}>
                <div className="w-20 shrink-0">
                  <p className="text-xs text-[#0B1C3D]/40">{dayName}</p>
                  <p className="text-lg font-bold text-[#0B1C3D]">{dayNum} {month}</p>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <ArrowDown size={16} className="text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs text-[#0B1C3D]/50">Arrivals</p>
                      <p className="text-sm font-semibold text-[#0B1C3D]">{d.arrivals_families} {d.arrivals_families === 1 ? "family" : "families"}, {d.arrivals_people} {d.arrivals_people === 1 ? "person" : "people"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUp size={16} className="text-red-500 shrink-0" />
                    <div>
                      <p className="text-xs text-[#0B1C3D]/50">Departures</p>
                      <p className="text-sm font-semibold text-[#0B1C3D]">{d.departures_families} {d.departures_families === 1 ? "family" : "families"}, {d.departures_people} {d.departures_people === 1 ? "person" : "people"}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, onClick, color, testId }) {
  const colors = {
    gold: "border-[#D4AF37]/30 bg-[#D4AF37]/5",
    blue: "border-blue-200 bg-blue-50",
    orange: "border-orange-200 bg-orange-50",
  };
  return (
    <div onClick={onClick} className={`rounded-2xl border p-5 ${colors[color]} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`} data-testid={testId}>
      <p className="text-[#0B1C3D]/50 text-xs mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#0B1C3D]">{value}</p>
    </div>
  );
}

function ArrivalBlock({ label, families, people, color }) {
  const bg = { green: "bg-green-50 border-green-200", amber: "bg-amber-50 border-amber-200", red: "bg-red-50 border-red-200" };
  const text = { green: "text-green-700", amber: "text-amber-700", red: "text-red-700" };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <p className={`text-sm font-semibold mb-2 ${text[color]}`}>{label}</p>
      <div className="flex items-center gap-1 mb-1">
        <Users size={14} className={text[color]} />
        <span className="text-lg font-bold text-[#0B1C3D]">{families}</span>
        <span className="text-[#0B1C3D]/40 text-xs">{families === 1 ? "family" : "families"}</span>
      </div>
      <div className="flex items-center gap-1">
        <CalendarDays size={14} className={text[color]} />
        <span className="text-lg font-bold text-[#0B1C3D]">{people}</span>
        <span className="text-[#0B1C3D]/40 text-xs">{people === 1 ? "person" : "people"}</span>
      </div>
    </div>
  );
}
