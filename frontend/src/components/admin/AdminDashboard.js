import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, DoorOpen, Clock, FileText, ArrowRight, TrendingUp, Plane } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StatCard({ icon: Icon, label, value, sub, color = "bg-[#D4AF37]/10", textColor = "text-[#D4AF37]", onClick }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={`${color} rounded-xl p-4 sm:p-5 text-left w-full border border-[#D4AF37]/10 hover:shadow-md transition-all`} data-testid={`stat-${label.replace(/\s/g, "-").toLowerCase()}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#0B1C3D]/50 text-xs font-medium mb-1">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${textColor}`}>{value}</p>
          {sub && <p className="text-[#0B1C3D]/40 text-xs mt-1">{sub}</p>}
        </div>
        <Icon size={20} className={textColor + " opacity-60"} />
      </div>
    </button>
  );
}

export default function AdminDashboardView({ user, authHeaders, onNavigate }) {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/admin/dashboard`, { headers: authHeaders() });
        setDash(data);
      } catch (err) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-[#0B1C3D]/40">Loading dashboard...</div>;
  if (!dash) return <div className="text-center py-20 text-red-500">Dashboard unavailable</div>;

  const { arrival_summary: arr } = dash;

  return (
    <div data-testid="dashboard-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Command Centre</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">Katha 2026 Operations Dashboard</p>
        </div>
        {user.role === "superadmin" && <span className="text-[9px] bg-[#D4AF37] text-[#0B1C3D] px-2 py-0.5 rounded-full font-bold">SUPER ADMIN</span>}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={FileText} label="Pending Approval" value={dash.pending_count}
          color="bg-amber-50" textColor="text-amber-600" onClick={() => onNavigate("pending")} />
        <StatCard icon={Users} label="Expected Guests" value={arr.expected.families}
          sub={`${arr.expected.people} people`} color="bg-blue-50" textColor="text-blue-600" onClick={() => onNavigate("expected")} />
        <StatCard icon={UserCheck} label="Arrived" value={arr.arrived.families}
          sub={`${arr.arrived.people} people`} color="bg-green-50" textColor="text-green-600" onClick={() => onNavigate("arrived")} />
        <StatCard icon={UserX} label="Not Coming" value={arr.not_coming.families}
          sub={`${arr.not_coming.people} people`} color="bg-red-50" textColor="text-red-500" />
        <StatCard icon={Plane} label="Departed" value={arr.departed.families}
          sub={`${arr.departed.people} people`} color="bg-gray-50" textColor="text-gray-500" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={TrendingUp} label="Total Approved" value={dash.approved_count}
          sub={`${dash.total_people} people total`} />
        <StatCard icon={DoorOpen} label="Total Rooms" value={dash.total_rooms}
          color="bg-purple-50" textColor="text-purple-600" onClick={() => onNavigate("roommanagement")} />
        <StatCard icon={DoorOpen} label="Rooms Occupied" value={dash.occupied_rooms}
          color="bg-orange-50" textColor="text-orange-600" />
        <StatCard icon={DoorOpen} label="Rooms Available" value={dash.available_rooms}
          color="bg-emerald-50" textColor="text-emerald-600" />
      </div>

      {/* Daily Schedule */}
      {dash.daily_schedule && dash.daily_schedule.length > 0 && (
        <div className="bg-white rounded-xl border border-[#D4AF37]/10 p-5" data-testid="daily-schedule">
          <h3 className="text-base font-bold text-[#0B1C3D] mb-4">Daily Schedule (27 May - 4 Jun)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#0B1C3D]/50 border-b border-[#D4AF37]/10">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-center py-2 px-2">Arrivals (Groups)</th>
                  <th className="text-center py-2 px-2">Arrivals (People)</th>
                  <th className="text-center py-2 px-2">Departures (Groups)</th>
                  <th className="text-center py-2 px-2">Departures (People)</th>
                </tr>
              </thead>
              <tbody>
                {dash.daily_schedule.map(d => (
                  <tr key={d.date} className="border-b border-[#D4AF37]/5 hover:bg-[#F8F1E5]/50">
                    <td className="py-2 px-2 font-medium text-[#0B1C3D]">{d.date}</td>
                    <td className="py-2 px-2 text-center text-green-600 font-medium">{d.arrivals_families}</td>
                    <td className="py-2 px-2 text-center text-green-600">{d.arrivals_people}</td>
                    <td className="py-2 px-2 text-center text-orange-600 font-medium">{d.departures_families}</td>
                    <td className="py-2 px-2 text-center text-orange-600">{d.departures_people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
