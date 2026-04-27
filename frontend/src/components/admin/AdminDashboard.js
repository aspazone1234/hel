import { useState, useEffect, useCallback } from "react";
import { Users, Hotel, UserCheck, Plane, AlertTriangle, Clock, ChevronDown, ChevronUp, X, Bell, Star, ListTodo, Headphones, BookOpen } from "lucide-react";
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
  const [myDay, setMyDay] = useState(null);
  const [myDayPopup, setMyDayPopup] = useState(null); // "guests" | "tasks" | "tickets"

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, myDayRes] = await Promise.all([
          axios.get(`${API}/api/admin/dashboard`, { headers: authHeaders() }),
          axios.get(`${API}/api/admin/swamsevak-dashboard`, { headers: authHeaders() }).catch(() => ({ data: null })),
        ]);
        setData(dashRes.data);
        setMyDay(myDayRes.data);
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

      {/* === ACTIONABLE NOTIFICATIONS — ABSOLUTE TOP === */}
      {data.active_tickets > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border-2 border-red-300 rounded-xl p-3 animate-pulse" data-testid="top-notifications">
          <AlertTriangle className="text-red-500 shrink-0" size={18} />
          <span className="text-red-700 font-semibold text-sm">{data.active_tickets} active help ticket{data.active_tickets > 1 ? "s" : ""} need attention</span>
        </div>
      )}

      {/* Pending Approval Alert */}
      {data.pending_count > 0 && user?.role === "superadmin" && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4" data-testid="pending-alert">
          <Bell className="text-amber-600 shrink-0" size={20} />
          <span className="text-amber-800 font-medium text-sm">
            {data.pending_count} pending form approval{data.pending_count > 1 ? "s" : ""} awaiting your review
          </span>
        </div>
      )}

      {/* My Day - Consolidated Swamsevak View */}
      {myDay && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100" data-testid="my-day-panel">
          <h2 className="font-semibold text-[#0B1C3D] text-sm mb-3 flex items-center gap-2">
            <Star size={16} className="text-[#D4AF37]" /> My Day — {user?.display_name || user?.name}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setMyDayPopup("guests")}
              className="bg-white rounded-lg p-3 text-center hover:shadow-md transition-shadow cursor-pointer" data-testid="my-day-guests">
              <p className="text-lg font-bold text-[#0B1C3D]">{myDay.assigned_guests}</p>
              <p className="text-xs text-gray-500">Assigned Guests</p>
            </button>
            <button onClick={() => setMyDayPopup("tasks")}
              className="bg-white rounded-lg p-3 text-center hover:shadow-md transition-shadow cursor-pointer" data-testid="my-day-tasks">
              <p className="text-lg font-bold text-amber-600">{myDay.pending_todos}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><ListTodo size={10} /> My Tasks</p>
            </button>
            <button onClick={() => setMyDayPopup("tickets")}
              className="bg-white rounded-lg p-3 text-center hover:shadow-md transition-shadow cursor-pointer" data-testid="my-day-tickets">
              <p className="text-lg font-bold text-red-600">{myDay.active_tickets}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Headphones size={10} /> Active Tickets</p>
            </button>
          </div>

          {/* Special Needs */}
          {myDay.special_needs?.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Special Needs of Families Assigned to You:</p>
              {myDay.special_needs.slice(0, 5).map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-2 space-y-1">
                  {(s.needs || []).map((n, j) => (
                    <div key={j} className="text-xs flex items-start gap-1.5">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 ${n.is_family ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                        {n.is_family ? "Family" : "Person"}
                      </span>
                      <div>
                        <span className="font-medium text-[#0B1C3D]">{n.person}</span>
                        {n.family_head && !n.is_family && <span className="text-gray-400 ml-1">(Family: {n.family_head})</span>}
                        {n.room && <span className="text-gray-400 ml-1">· Room {n.room}</span>}
                        <p className="text-gray-600">{n.need}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Day Popup — Assigned Guests */}
      <Dialog open={myDayPopup === "guests"} onOpenChange={() => setMyDayPopup(null)}>
        <DialogContent className="max-w-md max-h-[75vh] overflow-y-auto">
          <DialogHeader><DialogTitle>My Assigned Guests ({myDay?.assigned_guests || 0})</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(myDay?.assigned_guests_list || []).length === 0 ? <p className="text-gray-400 text-center py-4">No guests assigned</p> :
              (myDay?.assigned_guests_list || []).map((g, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-[#0B1C3D]">{g.head_name}</p>
                    <p className="text-xs text-gray-500">{g.num_people} people {g.rooms?.length > 0 && `· Room ${g.rooms.join(", ")}`}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${g.arrival_status === "arrived" ? "bg-green-100 text-green-700" : g.arrival_status === "departed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"}`}>
                    {g.arrival_status}
                  </span>
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* My Day Popup — Tasks */}
      <Dialog open={myDayPopup === "tasks"} onOpenChange={() => setMyDayPopup(null)}>
        <DialogContent className="max-w-md max-h-[75vh] overflow-y-auto">
          <DialogHeader><DialogTitle>My Pending Tasks ({myDay?.pending_todos || 0})</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(myDay?.todos_list || []).length === 0 ? <p className="text-gray-400 text-center py-4">No pending tasks</p> :
              (myDay?.todos_list || []).map((t, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                  <p className="font-medium text-sm text-[#0B1C3D]">{t.title}</p>
                  <div className="flex gap-1 items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{t.priority}</span>
                    {t.due_date && <span className="text-xs text-gray-400">{t.due_date}</span>}
                  </div>
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* My Day Popup — Tickets */}
      <Dialog open={myDayPopup === "tickets"} onOpenChange={() => setMyDayPopup(null)}>
        <DialogContent className="max-w-md max-h-[75vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Active Tickets ({myDay?.active_tickets || 0})</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(myDay?.tickets_list || []).length === 0 ? <p className="text-gray-400 text-center py-4">No active tickets</p> :
              (myDay?.tickets_list || []).map((t, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm text-[#0B1C3D] flex-1">{t.description || t.category}</p>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full shrink-0 ${t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{t.priority}</span>
                  </div>
                  {t.guest && <p className="text-xs text-gray-500 mt-0.5">Guest: {t.guest}</p>}
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>


      {/* Main Stats Grid — 3 blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Block 1: Expected Guests + Not Coming */}
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100" data-testid="stat-expected-block">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-blue-600" />
            <span className="font-semibold text-blue-800 text-sm">Expected Guests</span>
          </div>
          <div className="space-y-2">
            <button onClick={() => openDrillDown("arrival_status", "not_arrived", "Expected Guests")}
              className="flex justify-between items-center w-full text-left hover:bg-blue-100/50 rounded px-2 py-1 transition" data-testid="stat-expected">
              <span className="text-sm text-blue-700">Expected</span>
              <span className="font-bold text-blue-900 text-sm">{arr.expected.families} fam / {arr.expected.people} ppl</span>
            </button>
            <button onClick={() => openDrillDown("arrival_status", "not_coming", "Not Coming")}
              className="flex justify-between items-center w-full text-left hover:bg-red-100/50 rounded px-2 py-1 transition" data-testid="stat-not-coming">
              <span className="text-sm text-red-600">Not Coming</span>
              <span className="font-bold text-red-700 text-sm">{arr.not_coming.families} fam / {arr.not_coming.people} ppl</span>
            </button>
          </div>
        </div>

        {/* Block 2: Arrival Status — Present (attendee-level), Absent, Not Arrived, Departed */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100" data-testid="stat-arrival-status">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck size={18} className="text-emerald-600" />
            <span className="font-semibold text-emerald-800 text-sm">Arrival Status</span>
          </div>
          <div className="space-y-2">
            <button onClick={() => openDrillDown("attendee_arrival_status", "arrived", "Present (People Arrived)")} className="flex justify-between items-center w-full text-left hover:bg-emerald-100/50 rounded px-2 py-1 transition" data-testid="stat-present">
              <span className="text-sm text-emerald-700">Arrived (Present)</span>
              <span className="font-bold text-emerald-900 text-sm">{arr.arrived.people_present ?? arr.arrived.people} ppl</span>
            </button>
            <button onClick={() => openDrillDown("attendee_arrival_status", "not_arrived", "Absent (marked absent during QR scan)")} className="flex justify-between items-center w-full text-left hover:bg-rose-100/50 rounded px-2 py-1 transition" data-testid="stat-absent">
              <span className="text-sm text-rose-600">Absent</span>
              <span className="font-bold text-rose-700 text-sm">{arr.arrived.people_absent ?? 0} ppl</span>
            </button>
            <button onClick={() => openDrillDown("arrival_status", "not_arrived", "Not Yet Arrived")} className="flex justify-between items-center w-full text-left hover:bg-amber-100/50 rounded px-2 py-1 transition" data-testid="stat-not-arrived">
              <span className="text-sm text-amber-600">Not Arrived</span>
              <span className="font-bold text-amber-700 text-sm">{arr.not_arrived?.families || arr.expected.families} fam</span>
            </button>
            <button onClick={() => openDrillDown("arrival_status", "departed", "Departed Guests")} className="flex justify-between items-center w-full text-left hover:bg-gray-100/50 rounded px-2 py-1 transition" data-testid="stat-departed">
              <span className="text-sm text-gray-600">Departed</span>
              <span className="font-bold text-gray-700 text-sm">{arr.departed.families} fam / {arr.departed.people} ppl</span>
            </button>
          </div>
        </div>

        {/* Block 3: Rooms */}
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

      {/* Reference Person Stats (was "By Reference Person") */}
      {data.reference_person_stats?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="reference-person-stats">
          <div className="p-4 border-b flex items-center gap-2">
            <BookOpen size={16} className="text-amber-600" />
            <h2 className="font-semibold text-[#0B1C3D] text-base">By Reference Person</h2>
            <span className="text-xs text-gray-400 ml-1">(click to see guests)</span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {data.reference_person_stats.map((rp) => (
              <button key={rp.name}
                onClick={() => openDrillDown("reference_person", rp.name, `Guests — Ref: ${rp.name}`)}
                className="text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl p-3 transition"
                data-testid={`ref-stat-${rp.name}`}>
                <p className="font-semibold text-[#0B1C3D] text-sm truncate">{rp.name}</p>
                <p className="text-amber-700 font-bold text-lg">{rp.families}</p>
                <p className="text-xs text-amber-600">{rp.families} families · {rp.people} people</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Geographies */}
      {(data.top_countries?.length > 0 || data.top_states?.length > 0 || data.top_cities?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="top-geographies">
          <div className="p-4 border-b flex items-center gap-2">
            <Users size={16} className="text-teal-600" />
            <h2 className="font-semibold text-[#0B1C3D] text-base">Top Geographies</h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Top Countries */}
            {data.top_countries?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Countries</p>
                <div className="space-y-2">
                  {data.top_countries.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-3">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm font-medium text-[#0B1C3D] truncate max-w-[70%]">{s.name}</span>
                          <span className="text-xs text-gray-500">{s.families} fam</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="bg-teal-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (s.families / (data.top_countries[0]?.families || 1)) * 100)}%`}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Top States */}
            {data.top_states?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">States</p>
                <div className="space-y-2">
                  {data.top_states.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-3">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm font-medium text-[#0B1C3D] truncate max-w-[70%]">{s.name}</span>
                          <span className="text-xs text-gray-500">{s.families} fam</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (s.families / (data.top_states[0]?.families || 1)) * 100)}%`}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Top Cities */}
            {data.top_cities?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cities</p>
                <div className="space-y-2">
                  {data.top_cities.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-3">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm font-medium text-[#0B1C3D] truncate max-w-[70%]">{s.name}</span>
                          <span className="text-xs text-gray-500">{s.families} fam</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (s.families / (data.top_cities[0]?.families || 1)) * 100)}%`}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                    <p className="font-medium text-[#0B1C3D] text-sm">{r.head_name} <span className="font-normal text-gray-400 text-xs">· {r.primary_mobile}</span></p>
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

