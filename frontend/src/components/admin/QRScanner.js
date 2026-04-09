import { useState, useEffect, useRef } from "react";
import { QrCode, ScanLine, Camera, Check, Users, MapPin, Phone, AlertTriangle, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QRScanner({ user, authHeaders }) {
  const [mode, setMode] = useState("scan"); // scan | generate
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [checkinDialog, setCheckinDialog] = useState(null);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [generating, setGenerating] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      toast.info("Camera active. Point at QR code.");
      scanFromCamera();
    } catch {
      toast.error("Camera access denied");
    }
  };

  const scanFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const interval = setInterval(async () => {
      if (!streamRef.current) { clearInterval(interval); return; }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      // Use manual input for now - browser QR scanning via camera requires additional setup
    }, 500);
  };

  const handleManualScan = async () => {
    if (!manualCode.trim()) return;
    setScanning(true);
    try {
      const { data } = await axios.post(`${API}/admin/qr/scan`, { qr_data: manualCode.trim() }, { headers: authHeaders() });
      setScanResult(data.registration);
      setManualCode("");
      toast.success("QR verified successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid or expired QR code");
      setScanResult(null);
    } finally {
      setScanning(false);
    }
  };

  const openCheckin = (reg) => {
    setCheckinDialog(reg);
    setSelectedAttendees((reg.attendees || []).map(a => a.id));
  };

  const handleCheckin = async () => {
    if (!checkinDialog) return;
    const arrivalStatus = selectedAttendees.length === checkinDialog.attendees.length ? "arrived" : "partially_arrived";
    try {
      await axios.post(`${API}/admin/registrations/${checkinDialog.id}/mark-arrival`, {
        arrival_status: arrivalStatus,
        arrived_attendee_ids: selectedAttendees,
      }, { headers: authHeaders() });
      toast.success(`Check-in successful! ${selectedAttendees.length}/${checkinDialog.attendees.length} arrived.`);
      setCheckinDialog(null);
      setScanResult(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Check-in failed");
    }
  };

  const handleBulkGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await axios.post(`${API}/admin/qr/generate-bulk`, {}, { headers: authHeaders() });
      toast.success(`Generated ${data.generated} QR codes (${data.skipped} already had QR)`);
    } catch (err) {
      toast.error("Bulk generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSingleGenerate = async (regId) => {
    try {
      const { data } = await axios.post(`${API}/admin/qr/generate/${regId}`, {}, { headers: authHeaders() });
      toast.success(`QR v${data.qr_version} generated`);
    } catch (err) {
      toast.error("QR generation failed");
    }
  };

  const getHead = (reg) => {
    const h = (reg.attendees || []).find(a => a.id === reg.group_head_id);
    return h?.name || reg.attendees?.[0]?.name || reg.primary_mobile || "Unknown";
  };

  return (
    <div data-testid="qr-scanner-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>QR Code System</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">Scan for check-in or generate QR codes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setMode("scan")} size="sm" className={mode === "scan" ? "bg-[#D4AF37] text-[#0B1C3D]" : "bg-white text-[#0B1C3D]/60 border border-[#D4AF37]/20"} data-testid="qr-mode-scan">
            <ScanLine size={14} className="mr-1" /> Scan
          </Button>
          <Button onClick={() => setMode("generate")} size="sm" className={mode === "generate" ? "bg-[#D4AF37] text-[#0B1C3D]" : "bg-white text-[#0B1C3D]/60 border border-[#D4AF37]/20"} data-testid="qr-mode-generate">
            <QrCode size={14} className="mr-1" /> Generate
          </Button>
        </div>
      </div>

      {mode === "scan" && (
        <div className="space-y-4">
          {/* Camera Scanner */}
          <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-5">
            <h3 className="text-base font-semibold text-[#0B1C3D] mb-3 flex items-center gap-2">
              <Camera size={16} className="text-[#D4AF37]" /> Camera Scanner
            </h3>
            <div className="relative bg-black rounded-lg overflow-hidden mb-3" style={{ height: cameraActive ? 280 : 100 }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button onClick={startCamera} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="start-camera-btn">
                    <Camera size={16} className="mr-2" /> Start Camera
                  </Button>
                </div>
              )}
            </div>
            {cameraActive && <Button onClick={stopCamera} size="sm" variant="outline" className="text-red-500 border-red-300">Stop Camera</Button>}
          </div>

          {/* Manual Input */}
          <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-5">
            <h3 className="text-base font-semibold text-[#0B1C3D] mb-3">Manual QR Entry</h3>
            <div className="flex gap-2">
              <Input value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="Enter QR code (e.g. KATHA2026:...)" className="bg-white border-[#D4AF37]/20" data-testid="qr-manual-input"
                onKeyDown={e => e.key === "Enter" && handleManualScan()} />
              <Button onClick={handleManualScan} disabled={scanning} className="bg-[#D4AF37] text-[#0B1C3D] shrink-0" data-testid="qr-scan-btn">
                {scanning ? "Scanning..." : "Verify"}
              </Button>
            </div>
          </div>

          {/* Scan Result */}
          {scanResult && (
            <div className="bg-white rounded-xl border-2 border-green-300 p-5" data-testid="qr-scan-result">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-green-700 flex items-center gap-2"><Check size={20} /> QR Verified</h3>
                  <p className="text-[#0B1C3D]/50 text-xs mt-1">QR v{scanResult.qr_version}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${scanResult.arrival_status === "arrived" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  {scanResult.arrival_status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-[#0B1C3D]/50 text-xs">Group Head</span><p className="font-semibold">{getHead(scanResult)}</p></div>
                <div><span className="text-[#0B1C3D]/50 text-xs">People</span><p className="font-semibold">{scanResult.num_people}</p></div>
                <div><span className="text-[#0B1C3D]/50 text-xs flex items-center gap-1"><Phone size={10} /> WhatsApp</span><p className="font-medium">{scanResult.primary_mobile}</p></div>
                <div><span className="text-[#0B1C3D]/50 text-xs">Room(s)</span><p className="font-medium">{scanResult.room_assignments?.join(", ") || "Not assigned"}</p></div>
              </div>
              <div className="mb-3">
                <span className="text-[#0B1C3D]/50 text-xs block mb-1">Attendees:</span>
                {(scanResult.attendees || []).map((a, i) => (
                  <div key={i} className={`py-1.5 px-3 rounded-lg mb-1 text-sm ${a.id === scanResult.group_head_id ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" : "bg-[#F8F1E5]"}`}>
                    <span className="font-medium">{a.name}</span>
                    {a.age && <span className="text-[#0B1C3D]/50 ml-2">Age: {a.age}</span>}
                    {a.special_needs && <span className="text-orange-600 ml-2 font-medium">| {a.special_needs}</span>}
                    {a.id === scanResult.group_head_id && <span className="text-[#D4AF37] text-[10px] ml-2 font-bold">[HEAD]</span>}
                  </div>
                ))}
              </div>
              {scanResult.family_special_request && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-amber-700 text-sm flex items-center gap-1"><AlertTriangle size={14} /> {scanResult.family_special_request}</p>
                </div>
              )}
              {scanResult.arrival_status !== "arrived" && (
                <Button onClick={() => openCheckin(scanResult)} className="w-full bg-green-600 text-white hover:bg-green-700" data-testid="checkin-btn">
                  <Check size={16} className="mr-2" /> Check In Guest(s)
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "generate" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#0B1C3D]">Bulk QR Generation</h3>
              <Button onClick={handleBulkGenerate} disabled={generating} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="bulk-generate-btn">
                <RefreshCw size={14} className={`mr-2 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Generating..." : "Generate All Missing QRs"}
              </Button>
            </div>
            <p className="text-[#0B1C3D]/50 text-sm">This will generate QR codes for all approved registrations that don't have one yet.</p>
          </div>
        </div>
      )}

      {/* Check-in Dialog */}
      {checkinDialog && (
        <Dialog open onOpenChange={() => setCheckinDialog(null)}>
          <DialogContent className="max-w-md" data-testid="checkin-dialog">
            <DialogHeader><DialogTitle>Check In: {getHead(checkinDialog)}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-[#0B1C3D]/60">Select attendees who have arrived:</p>
              {(checkinDialog.attendees || []).map((a, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#D4AF37]/15 cursor-pointer hover:bg-[#F8F1E5]">
                  <Checkbox checked={selectedAttendees.includes(a.id)} onCheckedChange={(checked) => {
                    setSelectedAttendees(prev => checked ? [...prev, a.id] : prev.filter(x => x !== a.id));
                  }} />
                  <div>
                    <span className="text-sm font-medium">{a.name}</span>
                    {a.age && <span className="text-[#0B1C3D]/50 text-xs ml-2">Age: {a.age}</span>}
                    {a.id === checkinDialog.group_head_id && <span className="text-[#D4AF37] text-[10px] ml-2 font-bold">[HEAD]</span>}
                  </div>
                </label>
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setSelectedAttendees((checkinDialog.attendees || []).map(a => a.id))} size="sm" variant="outline" className="text-xs">Select All</Button>
                <Button onClick={() => setSelectedAttendees([])} size="sm" variant="outline" className="text-xs">Clear</Button>
              </div>
              <Button onClick={handleCheckin} disabled={selectedAttendees.length === 0} className="w-full bg-green-600 text-white" data-testid="confirm-checkin-btn">
                Check In {selectedAttendees.length}/{(checkinDialog.attendees || []).length} Attendees
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
