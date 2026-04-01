import { useState, useEffect } from "react";
import { Users, CalendarDays, ArrowDown, ArrowUp } from "lucide-react";
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
    <div className="space-y-8" data-testid="dashboard-view">
      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Final Guest List (Families)" value={stats.total_approved} onClick={() => onNavigate("guestlist")} color="gold" testId="stat-families" />
        <StatCard label="Final Guest List (People)" value={stats.total_people} color="blue" testId="stat-people" />
        <StatCard label="Pending Forms" value={stats.pending_count} onClick={() => onNavigate("formmanagement")} color="orange" testId="stat-pending" />
        <StatCard label="Rooms Available" value={stats.available_rooms} onClick={() => onNavigate("roommanagement")} color="green" testId="stat-rooms" />
      </div>

      {/* Arrival Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#D4AF37]/20 p-6" data-testid="arrival-summary">
          <h3 className="text-lg font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Arrival Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <ArrivalBlock label="Arrived" families={as_.arrived.families} people={as_.arrived.people} color="green" />
            <ArrivalBlock label="Not Arrived" families={as_.not_arrived.families} people={as_.not_arrived.people} color="amber" />
            <ArrivalBlock label="Not Coming" families={as_.not_coming.families} people={as_.not_coming.people} color="red" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-6 flex flex-col items-center justify-center" data-testid="rooms-available-block">
          <p className="text-[#0B1C3D]/50 text-sm mb-1">Rooms Available</p>
          <p className="text-4xl font-bold text-[#0B1C3D]">{stats.available_rooms}</p>
          <p className="text-[#0B1C3D]/40 text-xs mt-1">{stats.occupied_rooms} occupied / {stats.total_rooms} total</p>
        </div>
      </div>

      {/* Daily Arrivals & Departures */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-6" data-testid="daily-schedule">
        <h3 className="text-lg font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Daily Arrivals & Departures (28 May - 3 June)</h3>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[600px]">
            {(stats.daily_schedule || []).map((d, i) => {
              const dateObj = new Date(d.date + "T00:00:00");
              const dayName = dateObj.toLocaleDateString("en", { weekday: "short" });
              const dayNum = dateObj.getDate();
              const month = dateObj.toLocaleDateString("en", { month: "short" });
              return (
                <div key={i} className="bg-[#F8F1E5] rounded-xl p-3 text-center" data-testid={`daily-${d.date}`}>
                  <p className="text-[#0B1C3D]/50 text-xs">{dayName}</p>
                  <p className="text-lg font-bold text-[#0B1C3D]">{dayNum} {month}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <ArrowDown size={12} />
                      <span className="text-xs font-semibold">{d.arrivals_families}F / {d.arrivals_people}P</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-red-500">
                      <ArrowUp size={12} />
                      <span className="text-xs font-semibold">{d.departures_families}F / {d.departures_people}P</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-[#0B1C3D]/50">
          <span className="flex items-center gap-1"><ArrowDown size={10} className="text-green-600" /> Arrivals (F=Families, P=People)</span>
          <span className="flex items-center gap-1"><ArrowUp size={10} className="text-red-500" /> Departures</span>
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
    green: "border-green-200 bg-green-50",
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
        <span className="text-[#0B1C3D]/40 text-xs">families</span>
      </div>
      <div className="flex items-center gap-1">
        <CalendarDays size={14} className={text[color]} />
        <span className="text-lg font-bold text-[#0B1C3D]">{people}</span>
        <span className="text-[#0B1C3D]/40 text-xs">people</span>
      </div>
    </div>
  );
}
