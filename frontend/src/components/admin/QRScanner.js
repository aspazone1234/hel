import { useState, useRef, useCallback, useEffect } from "react";
import { ScanLine, QrCode, Search, Shield, Ban, List, Check } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FullRegistrationView } from "./PendingApproval";
import jsQR from "jsqr";

const API = process.env.REACT_APP_BACKEND_URL;

export default function QRScanner({ user }) {
  const [mode, setMode] = useState("scan");
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedReg, setSelectedReg] = useState(null);
  const [qrList, setQrList] = useState([]);
  const [qrListLoading, setQrListLoading] = useState(false);
  const [alreadyArrivedInfo, setAlreadyArrivedInfo] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  // QR Scan
  const handleScan = async (token) => {
    if (!token?.trim()) return;
    setScanning(true);
    try {
      const { data } = await axios.post(`${API}/api/admin/qr/scan`, { qr_token: token.trim() }, { headers: authHeaders() });
      // Auto-close camera after successful scan
      stopCamera();
      if (data.already_arrived) {
        // Show already-arrived popup with full details
        setAlreadyArrivedInfo(data.registration);
        const head = (data.registration.attendees || []).find(a => a.id === data.registration.group_head_id);
        toast.info(`${head?.name || data.registration.primary_mobile} — Already marked as arrived`);
      } else {
        setScanResult(data.registration);
        toast.success("QR scanned successfully");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid QR");
      setScanResult(null);
    }
    setScanning(false);
  };

  // Manual search for attendance
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/guests/expected`, {
        headers: authHeaders(), params: { search: searchQuery, per_page: 20 }
      });
      setSearchResults(data.data || []);
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  };

  // Mark attendance from search
  const markAttendance = async (reg, attendeeIds) => {
    try {
      const arrStatus = attendeeIds.length === reg.attendees?.length ? "arrived" : "partially_arrived";
      await axios.post(`${API}/api/admin/registrations/${reg.id}/mark-arrival`, {
        arrival_status: arrStatus, arrived_attendee_ids: attendeeIds
      }, { headers: authHeaders() });
      toast.success("Attendance marked");
      setSelectedReg(null);
      setSearchResults([]);
      setSearchQuery("");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to mark attendance"); }
  };

  // Bulk QR generation (super admin only)
  const generateBulkQR = async () => {
    try {
      const { data } = await axios.post(`${API}/api/admin/qr/generate-bulk`, {}, { headers: authHeaders() });
      toast.success(`Generated ${data.generated} QR codes`);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  // QR Management list (super admin)
  const fetchQRList = useCallback(async () => {
    if (!isSuper) return;
    setQrListLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/qr-management`, { headers: authHeaders() });
      setQrList(data);
    } catch {}
    setQrListLoading(false);
  }, [authHeaders, isSuper]);

  // Disable QR
  const disableQR = async (regId) => {
    if (!window.confirm("Disable this QR code?")) return;
    try {
      await axios.put(`${API}/api/admin/registrations/${regId}`, { qr_active: false }, { headers: authHeaders() });
      toast.success("QR disabled");
      fetchQRList();
    } catch { toast.error("Failed"); }
  };

  const scanLoopRef = useRef(null);
  const lastScannedRef = useRef("");

  // Camera scan with jsQR auto-detection
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch { toast.error("Camera access denied"); }
  };

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    lastScannedRef.current = "";
  }, []);

  // Auto-scan loop using requestAnimationFrame + jsQR
  useEffect(() => {
    if (!cameraActive) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");

    const tick = () => {
      if (!video.srcObject || video.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });
      if (code?.data && code.data !== lastScannedRef.current) {
        lastScannedRef.current = code.data;
        handleScan(code.data);
        // Pause scanning for 3s to avoid re-scanning same QR
        setTimeout(() => { lastScannedRef.current = ""; }, 3000);
      }
      scanLoopRef.current = requestAnimationFrame(tick);
    };
    scanLoopRef.current = requestAnimationFrame(tick);
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [cameraActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="attendance-marker">
      <h1 className="text-xl font-bold text-[#0B1C3D]">Attendance Marker</h1>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1" data-testid="marker-mode-toggle">
        <button onClick={() => setMode("scan")} className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${mode === "scan" ? "bg-white shadow font-medium" : "text-gray-600"}`}>
          <ScanLine size={14} /> QR Scan
        </button>
        <button onClick={() => setMode("search")} className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${mode === "search" ? "bg-white shadow font-medium" : "text-gray-600"}`}>
          <Search size={14} /> Manual Search
        </button>
        {isSuper && (
          <>
            <button onClick={() => setMode("generate")} className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${mode === "generate" ? "bg-white shadow font-medium" : "text-gray-600"}`}>
              <QrCode size={14} /> Generate
            </button>
            <button onClick={() => { setMode("manage"); fetchQRList(); }} className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${mode === "manage" ? "bg-white shadow font-medium" : "text-gray-600"}`}>
              <List size={14} /> QR List
            </button>
          </>
        )}
      </div>

      {/* QR Scan Mode */}
      {mode === "scan" && (
        <div className="space-y-4" data-testid="scan-mode">
          {/* Live Camera Preview - PRIMARY */}
          <div className="bg-white rounded-xl p-4 border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#0B1C3D]">Live Camera</p>
              {!cameraActive ? (
                <button onClick={startCamera} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm" data-testid="start-camera-btn">
                  Open Camera
                </button>
              ) : (
                <button onClick={stopCamera} className="bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm" data-testid="stop-camera-btn">
                  Stop Camera
                </button>
              )}
            </div>
            <video ref={videoRef} className={`w-full max-w-md rounded-lg border-2 border-dashed border-gray-200 ${cameraActive ? "" : "hidden"}`} data-testid="camera-preview" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {cameraActive && (
              <p className="text-xs text-green-600 text-center animate-pulse">Scanning for QR code...</p>
            )}
            {!cameraActive && (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                Tap "Open Camera" to start scanning
              </div>
            )}
          </div>

          {/* Manual Token Entry - SECONDARY */}
          <div className="bg-gray-50 rounded-xl p-4 border space-y-2">
            <p className="text-xs text-gray-500 font-medium">Or enter QR token manually:</p>
            <div className="flex gap-2">
              <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Enter QR token..."
                value={scanInput} onChange={(e) => setScanInput(e.target.value)} data-testid="qr-token-input"
                onKeyDown={(e) => e.key === "Enter" && handleScan(scanInput)} />
              <button onClick={() => handleScan(scanInput)} disabled={scanning} data-testid="scan-btn"
                className="bg-[#0B1C3D] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {scanning ? "..." : "Scan"}
              </button>
            </div>
          </div>

          {/* Scan Result - Checkin Flow */}
          {scanResult && <AttendanceCheckin reg={scanResult} authHeaders={authHeaders} onDone={() => { setScanResult(null); setScanInput(""); }} />}

          {/* Already Arrived — Full A-to-Z Profile */}
          {alreadyArrivedInfo && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-4" data-testid="already-arrived-popup">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-2">
                  <Check size={14} /> Attendance Already Marked
                </div>
                <p className="text-sm text-amber-800 font-medium">Full guest profile is shown below.</p>
              </div>

              {/* Full Registration View - A to Z details */}
              <div className="bg-white rounded-xl border border-amber-200 p-4">
                <FullRegistrationView reg={alreadyArrivedInfo} showAttendeeStatus={true} />
                {/* Additional fields not in FullRegistrationView */}
                {alreadyArrivedInfo.qr_token && (
                  <div className="mt-3 pt-3 border-t text-sm flex justify-between">
                    <span className="text-gray-500">QR Token</span>
                    <span className="font-mono text-[#0B1C3D]">{alreadyArrivedInfo.qr_token}</span>
                  </div>
                )}
                {alreadyArrivedInfo.assigned_swamsevak_mobile && (
                  <div className="text-sm flex justify-between mt-1">
                    <span className="text-gray-500">Swayamsevak Mobile</span>
                    <span className="font-medium text-purple-700">{alreadyArrivedInfo.assigned_swamsevak_mobile}</span>
                  </div>
                )}
                {(alreadyArrivedInfo.custom_field_values && Object.keys(alreadyArrivedInfo.custom_field_values).length > 0) && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Custom Fields</p>
                    {Object.entries(alreadyArrivedInfo.custom_field_values).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-xs text-red-700 font-medium">Need to correct attendance?</p>
                <p className="text-xs text-red-600 mt-0.5">Contact <strong>Super Admin</strong> to make corrections.</p>
              </div>

              <button onClick={() => { setAlreadyArrivedInfo(null); setScanInput(""); }} className="w-full bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 transition" data-testid="dismiss-arrived-popup">
                Dismiss — Scan Next Guest
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Search Mode */}
      {mode === "search" && (
        <div className="space-y-4" data-testid="search-mode">
          <div className="flex gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Search by family/person name or mobile..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} data-testid="manual-search-input"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            <button onClick={handleSearch} disabled={searchLoading} className="bg-[#0B1C3D] text-white px-4 py-2 rounded-lg text-sm">
              {searchLoading ? "..." : "Search"}
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map(r => {
              const head = (r.attendees || []).find(a => a.id === r.group_head_id);
              return (
                <button key={r.id} onClick={() => setSelectedReg(r)} data-testid={`search-result-${r.id}`}
                  className="w-full text-left bg-white rounded-xl p-4 border hover:shadow-sm transition">
                  <p className="font-medium text-[#0B1C3D]">{head?.name || r.primary_mobile}</p>
                  <p className="text-xs text-gray-500">{r.num_people} people • {r.primary_mobile} • Status: {r.arrival_status}</p>
                </button>
              );
            })}
            {searchResults.length === 0 && searchQuery && !searchLoading && (
              <p className="text-gray-400 text-center py-4">No expected guests found matching "{searchQuery}"</p>
            )}
          </div>

          {selectedReg && <AttendanceCheckin reg={selectedReg} authHeaders={authHeaders} onDone={() => { setSelectedReg(null); setSearchResults([]); setSearchQuery(""); }} />}
        </div>
      )}

      {/* Generate Mode (Super Admin Only) */}
      {mode === "generate" && isSuper && (
        <div className="space-y-4" data-testid="generate-mode">
          <div className="bg-white rounded-xl p-6 border text-center space-y-4">
            <QrCode size={48} className="mx-auto text-[#B8860B]" />
            <p className="text-sm text-gray-600">Generate QR codes for all expected guests who don't have one yet.</p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">QR codes will NOT be auto-sent to guests. Send them manually via Message Center.</p>
            <button onClick={generateBulkQR} data-testid="bulk-generate-btn"
              className="bg-[#0B1C3D] text-white px-6 py-3 rounded-lg font-medium">
              Generate All Missing QRs
            </button>
            <p className="text-xs text-gray-400">QR data is stored as base64 PNG in the database, attached to each registration record.</p>
          </div>
        </div>
      )}

      {/* QR Management View (Super Admin Only) */}
      {mode === "manage" && isSuper && (
        <div className="space-y-2" data-testid="qr-management">
          {qrListLoading ? <p className="text-center text-gray-500 py-4">Loading...</p> :
            qrList.length === 0 ? <p className="text-center text-gray-400 py-8">No QR codes generated yet</p> :
            qrList.map(qr => (
              <div key={qr.id} className="bg-white rounded-xl p-4 border flex items-center justify-between" data-testid={`qr-item-${qr.id}`}>
                <div>
                  <p className="font-medium text-[#0B1C3D] text-sm">{qr.head_name}</p>
                  <p className="text-xs text-gray-500">v{qr.qr_version} • {qr.qr_active ? "Active" : "Disabled"} • {qr.arrival_status}</p>
                  <p className="text-xs text-gray-400">{qr.qr_generated_at && new Date(qr.qr_generated_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${qr.qr_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {qr.qr_active ? "Active" : "Disabled"}
                  </span>
                  {qr.qr_active && (
                    <button onClick={() => disableQR(qr.id)} data-testid={`disable-qr-${qr.id}`}
                      className="text-red-500 hover:text-red-700">
                      <Ban size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function AttendanceCheckin({ reg, authHeaders, onDone }) {
  const [checkedIds, setCheckedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
  const allIds = (reg.attendees || []).map(a => a.id);

  const toggleAll = () => {
    setCheckedIds(checkedIds.length === allIds.length ? [] : [...allIds]);
  };

  const toggle = (id) => {
    setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submit = async () => {
    if (checkedIds.length === 0) { toast.error("Select at least one person"); return; }
    setSubmitting(true);
    try {
      const arrStatus = checkedIds.length === allIds.length ? "arrived" : "partially_arrived";
      await axios.post(`${API}/api/admin/registrations/${reg.id}/mark-arrival`, {
        arrival_status: arrStatus, arrived_attendee_ids: checkedIds
      }, { headers: authHeaders() });
      toast.success("Attendance marked");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to mark attendance");
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl p-4 border space-y-3" data-testid="attendance-checkin">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold text-[#0B1C3D]">{head?.name || reg.primary_mobile}</p>
          <p className="text-xs text-gray-500">{reg.num_people} people • Room: {(reg.room_assignments || []).join(", ") || "None"}</p>
          {reg.assigned_swamsevak && <p className="text-xs text-purple-600">Contact: {reg.assigned_swamsevak}</p>}
          {reg.family_special_request && <p className="text-xs text-amber-600">Note: {reg.family_special_request}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
          {checkedIds.length === allIds.length ? "Deselect All" : "Select All"}
        </button>
        {(reg.attendees || []).map((a) => (
          <label key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" data-testid={`check-${a.id}`}>
            <input type="checkbox" checked={checkedIds.includes(a.id)} onChange={() => toggle(a.id)}
              className="w-4 h-4 rounded border-gray-300" />
            <div>
              <p className="text-sm font-medium text-[#0B1C3D]">
                {a.name} {a.id === reg.group_head_id && <span className="text-xs text-amber-600">(Head)</span>}
              </p>
              <p className="text-xs text-gray-500">Age: {a.age} {a.special_needs && `• ${a.special_needs}`}</p>
            </div>
          </label>
        ))}
      </div>

      <button onClick={submit} disabled={submitting || checkedIds.length === 0} data-testid="confirm-checkin"
        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-green-700 transition">
        {submitting ? "Marking..." : `Mark ${checkedIds.length} as Arrived`}
      </button>
    </div>
  );
}
