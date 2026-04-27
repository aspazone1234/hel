import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import Fuse from "fuse.js";
import { Tree } from "react-d3-tree";
import { Search, Check, X, RefreshCw, Hand, Move, ZoomIn, Sparkles } from "lucide-react";
import { Input } from "./ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Sentinel id used when the user selects the secondary "Others" option and
 * types a free-form category (e.g. "समाज / community").
 */
export const OTHER_RELATION_ID = "__other__";

/**
 * ReferenceTreePicker — Search-first relation selector with an embedded
 * family-tree playground.
 *
 * STATE A (no selection / searching):
 *   - Primary block: subtitle + attached search + results
 *   - Secondary small block: "Others" option → free-text input (default "समाज")
 * STATE B (a tree node selected):
 *   - Green confirmation block
 *   - Embedded family-tree playground (auto-centred) + 3s overlay on load
 *   - "Change selection" button (red border / red text)
 * STATE C (the "Others" free-form text confirmed):
 *   - Green confirmation block showing the custom label — NO tree playground
 *   - "Change selection" button (red border / red text)
 *
 * Props:
 *   value, onChange(id, meta)
 *     - id = a tree node id, or OTHER_RELATION_ID, or ""
 *     - meta.name carries the display label; for OTHER, it's the user's text
 *   lang        — "hi" | "en"
 *   hideTree    — when true, suppresses the playground even after selection
 *                 (used by the post-submission Edit modal)
 *   otherLabel  — when value === OTHER_RELATION_ID, the display text to show
 *                 in the green block (useful when the parent persists it).
 *                 If omitted, the picker falls back to its last local label.
 */
export default function ReferenceTreePicker({ value, onChange, lang = "hi", hideTree = false, otherLabel = "" }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [translate, setTranslate] = useState({ x: 200, y: 80 });
  const treeContainerRef = useRef(null);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  // "Others" mode
  const [otherMode, setOtherMode] = useState(false);
  const [otherInput, setOtherInput] = useState("");
  const [localOtherLabel, setLocalOtherLabel] = useState("");

  // 3s overlay on tree load
  const [showTreeHint, setShowTreeHint] = useState(false);

  // ── Fetch ──
  useEffect(() => {
    let cancel = false;
    axios.get(`${API}/reference-tree/public`)
      .then(r => { if (!cancel) { setTree(r.data); setLoading(false); } })
      .catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  // ── Indexes ──
  const { byId, childrenOf, rootNode, fuse, hierarchy } = useMemo(() => {
    if (!tree) return { byId: {}, childrenOf: {}, rootNode: null, fuse: null, hierarchy: null };
    const byId = {};
    const childrenOf = {};
    for (const n of tree.nodes || []) {
      byId[n.id] = n;
      const p = n.parent_id || "__root__";
      (childrenOf[p] = childrenOf[p] || []).push(n);
    }
    const rootNode = byId[tree.root_id] || null;
    const selectable = (tree.nodes || []).filter(n => n.id !== tree.root_id);
    const fuse = new Fuse(selectable, {
      keys: ["name", "name_hi"],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true,
    });
    const displayName = (n) => (lang === "hi" && n.name_hi) ? n.name_hi : n.name;
    const buildHierarchy = (nodeId) => {
      const node = byId[nodeId];
      if (!node) return null;
      const children = (childrenOf[nodeId] || []).map(c => buildHierarchy(c.id)).filter(Boolean);
      return {
        name: displayName(node),
        attributes: { id: node.id },
        children: children.length ? children : undefined,
      };
    };
    const hierarchy = rootNode ? buildHierarchy(rootNode.id) : null;
    return { byId, childrenOf, rootNode, fuse, hierarchy };
  }, [tree, lang]);

  const nameOf = useCallback((node) => {
    if (!node) return "";
    return (lang === "hi" && node.name_hi) ? node.name_hi : node.name;
  }, [lang]);

  const lineageOf = useCallback((id) => {
    const out = [];
    let cur = byId[id];
    while (cur) { out.unshift(cur); cur = cur.parent_id ? byId[cur.parent_id] : null; }
    return out;
  }, [byId]);

  const isOtherSelected = value === OTHER_RELATION_ID;
  const selectedNode = value && !isOtherSelected && byId[value] ? byId[value] : null;
  const displayOtherLabel = otherLabel || localOtherLabel;
  const hasSelection = !!selectedNode || (isOtherSelected && !!displayOtherLabel);

  const selectedLineage = useMemo(
    () => (selectedNode ? lineageOf(selectedNode.id) : []),
    [selectedNode, lineageOf]
  );
  const lineageIds = useMemo(() => new Set(selectedLineage.map(n => n.id)), [selectedLineage]);

  // ── Auto-zoom ──
  const autoZoom = useMemo(() => {
    const depth = Math.max(2, selectedLineage.length);
    const vCells = depth + 2;
    const z = (0.85 * 380) / (vCells * 100);
    return Math.max(0.42, Math.min(0.85, +z.toFixed(3)));
  }, [selectedLineage.length]);

  // Initial centring
  useEffect(() => {
    if (!treeContainerRef.current) return;
    const { clientWidth } = treeContainerRef.current;
    setTranslate({ x: clientWidth / 2, y: 60 });
  }, [tree, selectedNode]);

  // Re-centre on selection
  useEffect(() => {
    if (!selectedNode || !treeContainerRef.current || hideTree) return;
    const recentre = () => {
      const container = treeContainerRef.current;
      if (!container) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      const sel = svg.querySelector(".rd3-node.is-selected");
      if (!sel) return;
      const cBox = container.getBoundingClientRect();
      const sBox = sel.getBoundingClientRect();
      const targetCx = cBox.left + cBox.width / 2;
      const targetCy = cBox.top + cBox.height * 0.62;
      const dx = targetCx - (sBox.left + sBox.width / 2);
      const dy = targetCy - (sBox.top + sBox.height / 2);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };
    const t1 = setTimeout(recentre, 250);
    const t2 = setTimeout(recentre, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [selectedNode, tree, autoZoom, hideTree]);

  // 3-second auto-disappearing tree overlay — fires each time the tree
  // becomes visible for the current selection.
  useEffect(() => {
    if (hideTree) return;
    if (!selectedNode) return;
    setShowTreeHint(true);
    const t = setTimeout(() => setShowTreeHint(false), 3000);
    return () => clearTimeout(t);
  }, [selectedNode, hideTree]);

  // ── Search ──
  const results = useMemo(() => {
    const q = query.trim();
    if (!q || !fuse) return [];
    return fuse.search(q, { limit: 8 });
  }, [query, fuse]);

  const select = (nodeId, name) => {
    const node = byId[nodeId];
    const finalName = node ? nameOf(node) : name;
    onChange?.(nodeId, { name: finalName, path: lineageOf(nodeId).map(n => nameOf(n)) });
    setQuery("");
    setOtherMode(false);
    setOtherInput("");
    try { searchInputRef.current?.blur(); } catch (_) { /* noop */ }
  };

  const confirmOther = () => {
    const label = (otherInput || "").trim();
    if (!label) return;
    setLocalOtherLabel(label);
    onChange?.(OTHER_RELATION_ID, { name: label, path: [] });
    setQuery("");
    setOtherMode(false);
  };

  const clearSelection = () => {
    onChange?.("", { name: "", path: [] });
    setQuery("");
    setOtherMode(false);
    setOtherInput("");
    setLocalOtherLabel("");
  };

  // ── Mobile focus → scroll search to top ──
  const handleSearchFocus = () => {
    const isMobile = typeof window !== "undefined"
      && window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;
    setTimeout(() => {
      try {
        searchWrapRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      } catch (_) { /* noop */ }
    }, 280);
  };

  // ── Copy ──
  const copy = lang === "hi" ? {
    title: "\u0938\u0902\u092C\u0902\u0927 \u0935\u093F\u0935\u0930\u0923",  // संबंध विवरण
    sub: "\u091C\u093F\u0938 \u092A\u0930\u093F\u0935\u093E\u0930 \u0915\u0947 \u0938\u0926\u0938\u094D\u092F \u0915\u0947 \u092E\u093E\u0927\u094D\u092F\u092E \u0938\u0947 \u0906\u092A \u091C\u0941\u095C\u0947 \u0939\u0948\u0902 \u0909\u0928\u0915\u093E \u0928\u093E\u092E \u0932\u093F\u0916\u0947\u0902\u0964",
    placeholder: "\u0938\u0902\u092C\u0902\u0927 \u0915\u0947 \u0932\u093F\u090F \u0928\u093E\u092E \u0916\u094B\u091C\u0947\u0902",  // संबंध के लिए नाम खोजें
    noResults: "\u092F\u0939 \u0928\u093E\u092E \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E\u0964",
    noResultsHelp: "\u0915\u0943\u092A\u092F\u093E \u0935\u0930\u094D\u0924\u0928\u0940 \u091C\u093E\u0901\u091A\u0947\u0902 \u092F\u093E \u0915\u093F\u0938\u0940 \u0938\u094D\u0935\u092F\u0902\u0938\u0947\u0935\u0915 \u0938\u0947 \u0938\u0939\u093E\u092F\u0924\u093E \u0932\u0947\u0902\u0964",
    selected: "\u091A\u092F\u0928\u093F\u0924 \u0938\u0902\u092C\u0902\u0927",
    change: "\u091A\u092F\u0928 \u092C\u0926\u0932\u0947\u0902",
    othersTitle: "\u0915\u094D\u092F\u093E \u0906\u092A\u0915\u093E \u0938\u0902\u092C\u0902\u0927 \u0915\u093F\u0938\u0940 \u0905\u0928\u094D\u092F \u0936\u094D\u0930\u0947\u0923\u0940 \u092E\u0947\u0902 \u0939\u0948?",  // क्या आपका संबंध किसी अन्य श्रेणी में है?
    othersBtn: "\u0905\u0928\u094D\u092F",  // अन्य
    othersPlaceholder: "\u0938\u092E\u093E\u091C",  // समाज
    othersConfirm: "\u091C\u094B\u095C\u0947\u0902",  // जोड़ें
    othersCancel: "\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902",
    gestureHint: "move / zoom",
  } : {
    title: "Relation Details",
    sub: "Type the name of the family member you are connected through.",
    placeholder: "Search a name",
    noResults: "We couldn't find this name.",
    noResultsHelp: "Please check the spelling or ask a volunteer for help.",
    selected: "Selected relation",
    change: "Change selection",
    othersTitle: "Is your relation in some other category?",
    othersBtn: "Others",
    othersPlaceholder: "samaaj",
    othersConfirm: "Add",
    othersCancel: "Cancel",
    gestureHint: "move / zoom",
  };

  if (loading) return <div className="text-sm text-[#0B1C3D]/50 py-8 text-center">Loading…</div>;
  if (!tree) return <div className="text-sm text-red-500 py-8 text-center">Could not load reference list.</div>;

  // ── Tree rendering helpers ──
  const renderNode = ({ nodeDatum }) => {
    const id = nodeDatum.attributes?.id;
    const isRoot = id === tree.root_id;
    const isSelected = id === value;
    const onLineage = lineageIds.has(id);
    const node = byId[id];
    const display = node ? nameOf(node) : nodeDatum.name;
    const initials = computeInitials(display);

    let cls = "rd3-node";
    if (isRoot) cls += " is-root";
    if (isSelected) cls += " is-selected";
    else if (onLineage) cls += " is-lineage";
    else cls += " is-muted";

    const w = 200;
    const h = 60;
    return (
      <g className={cls}>
        <rect className="rd3-node-card" x={-w/2} y={-h/2} width={w} height={h} rx={h/2} ry={h/2} />
        <circle className="rd3-node-avatar" cx={-w/2 + 22} cy={0} r={17} />
        <text className="rd3-node-initials" x={-w/2 + 22} y={1} textAnchor="middle">{initials}</text>
        <text className="rd3-node-name" x={-w/2 + 46} y={1}>{truncate(display, 18)}</text>
        {isSelected && (
          <g className="rd3-node-glow">
            <circle cx={0} cy={0} r={50} className="rd3-pulse-1" />
            <circle cx={0} cy={0} r={50} className="rd3-pulse-2" />
          </g>
        )}
      </g>
    );
  };

  const pathClassFunc = (linkDatum) => {
    const targetId = linkDatum.target.data?.attributes?.id;
    if (lineageIds.has(targetId)) return "rd3-link rd3-link-lineage";
    return "rd3-link rd3-link-muted";
  };

  // ── Render ──
  return (
    <div className="space-y-4" data-testid="relation-details-picker">
      <ScopedTreeStyles />

      {/* Title */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[#0B1C3D]" data-testid="ref-title">{copy.title}</h3>
        {!hasSelection && !otherMode && (
          <p className="text-xs sm:text-sm text-[#0B1C3D]/60 mt-1.5 leading-relaxed" data-testid="ref-subtext">
            {copy.sub}
          </p>
        )}
      </div>

      {/* STATE A: primary search block + secondary Others node */}
      {!hasSelection && (
        <>
          {!otherMode && (
            <div
              ref={searchWrapRef}
              className="rounded-2xl border border-[#D4AF37]/30 bg-white shadow-sm overflow-hidden"
              data-testid="ref-search-block"
            >
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  data-testid="ref-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  placeholder={copy.placeholder}
                  className="pl-11 pr-10 h-12 text-base bg-white border-0 rounded-none focus-visible:ring-0 focus-visible:border-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/40 hover:text-[#0B1C3D]"
                    aria-label="clear"
                    data-testid="ref-search-clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {query.trim() && (
                <div className="border-t border-[#D4AF37]/15" data-testid="ref-results">
                  {results.length === 0 ? (
                    <div className="p-5 text-center">
                      <p className="text-sm font-medium text-[#0B1C3D]/70">{copy.noResults}</p>
                      <p className="text-xs text-[#0B1C3D]/45 mt-1">{copy.noResultsHelp}</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#D4AF37]/10 max-h-[50vh] overflow-auto">
                      {results.map(({ item }, idx) => {
                        const path = lineageOf(item.id).map(n => nameOf(n));
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => select(item.id, nameOf(item))}
                              data-testid={`ref-result-${item.id}`}
                              className={`w-full text-left px-4 py-2.5 hover:bg-[#F8F1E5]/60 active:bg-[#F8F1E5] transition-colors ${idx === 0 ? "ref-result-first" : ""}`}
                            >
                              <p className="text-sm sm:text-base font-semibold text-[#0B1C3D] leading-tight">{nameOf(item)}</p>
                              {path.length > 1 && (
                                <p className="text-[11px] text-[#0B1C3D]/40 mt-0.5 truncate">{path.slice(0, -1).join(" → ")}</p>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Secondary small node: Others */}
          {!otherMode && (
            <div
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-dashed border-[#0B1C3D]/15 bg-[#F8F1E5]/30 text-[11px] sm:text-xs text-[#0B1C3D]/70"
              data-testid="ref-others-cta"
            >
              <span className="leading-snug">{copy.othersTitle}</span>
              <button
                type="button"
                onClick={() => { setOtherMode(true); setOtherInput(""); }}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#0B1C3D]/15 text-[11px] font-semibold text-[#0B1C3D] hover:bg-[#0B1C3D] hover:text-[#F8F1E5] transition-colors"
                data-testid="ref-others-open"
              >
                <Sparkles size={11} /> {copy.othersBtn}
              </button>
            </div>
          )}

          {/* Others input mode */}
          {otherMode && (
            <div
              className="rounded-2xl border-2 border-[#0B1C3D]/20 bg-white p-3 sm:p-4 shadow-sm"
              data-testid="ref-others-input-block"
            >
              <p className="text-[11px] uppercase tracking-wide text-[#0B1C3D]/60 font-semibold mb-2">
                {copy.othersBtn}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={otherInput}
                  onChange={(e) => setOtherInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmOther(); } }}
                  placeholder={copy.othersPlaceholder}
                  className="flex-1 h-11 text-base bg-white border-[#0B1C3D]/20"
                  data-testid="ref-others-input"
                />
                <button
                  type="button"
                  onClick={confirmOther}
                  disabled={!otherInput.trim()}
                  className="shrink-0 px-3 h-11 rounded-md bg-[#0B1C3D] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#163161] transition-colors"
                  data-testid="ref-others-confirm"
                >
                  {copy.othersConfirm}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtherMode(false); setOtherInput(""); }}
                  className="shrink-0 px-2 h-11 rounded-md border border-[#0B1C3D]/15 text-[#0B1C3D]/60 text-sm hover:bg-[#F8F1E5]/60"
                  data-testid="ref-others-cancel"
                  aria-label={copy.othersCancel}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* STATE B / C: green confirmation block */}
      {hasSelection && (
        <div
          data-testid="ref-confirmation"
          className="rounded-2xl border-2 border-emerald-500/70 bg-emerald-50 p-4 sm:p-5 relative overflow-hidden ref-card-enter"
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />

          <p className="text-[11px] uppercase tracking-wide text-emerald-700/80 font-semibold mb-2">{copy.selected}</p>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-sm">
              <Check size={20} strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-bold text-emerald-900 leading-tight" data-testid="ref-selected-name">
                {selectedNode ? nameOf(selectedNode) : displayOtherLabel}
              </p>
              {selectedNode && selectedLineage.length > 1 && (
                <p className="text-[11px] sm:text-xs text-emerald-700/65 mt-1.5 leading-relaxed break-words">
                  {selectedLineage.slice(0, -1).map(n => nameOf(n)).join(" → ")}
                </p>
              )}
              {isOtherSelected && (
                <p className="text-[11px] sm:text-xs text-emerald-700/65 mt-1.5 leading-relaxed">
                  {copy.othersBtn}
                </p>
              )}
            </div>
          </div>

          {/* Embedded family-tree playground — hidden for Others / hideTree */}
          {!hideTree && selectedNode && hierarchy && (
            <div
              ref={treeContainerRef}
              className="rd3-tree-wrap mt-4 rounded-xl border border-emerald-500/25 bg-gradient-to-b from-white to-[#F8F1E5]/40 relative"
              data-testid="ref-tree-playground"
            >
              <Tree
                data={hierarchy}
                orientation="vertical"
                translate={translate}
                pathFunc="step"
                pathClassFunc={pathClassFunc}
                renderCustomNodeElement={renderNode}
                zoomable
                collapsible={false}
                separation={{ siblings: 1.35, nonSiblings: 1.7 }}
                nodeSize={{ x: 220, y: 100 }}
                scaleExtent={{ min: 0.25, max: 1.8 }}
                zoom={autoZoom}
              />

              {/* Bottom-right persistent gesture indicator */}
              <div
                className="absolute bottom-2 right-2 pointer-events-none flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-white/85 border border-emerald-500/20 shadow-sm"
                data-testid="ref-tree-gesture-hint"
                aria-label={copy.gestureHint}
              >
                <Hand size={12} className="text-emerald-700/80" />
                <span className="text-[9px] font-semibold text-emerald-800/75 tracking-wide leading-none">
                  {copy.gestureHint}
                </span>
              </div>

              {/* 3-second auto-disappearing overlay */}
              {showTreeHint && (
                <div
                  className="absolute inset-0 pointer-events-none flex items-center justify-center bg-white/60 backdrop-blur-[2px] ref-tree-hint-overlay"
                  data-testid="ref-tree-hint-overlay"
                >
                  <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl bg-white/90 border border-emerald-500/30 shadow-md">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <ZoomIn size={22} />
                      <Move size={20} />
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-emerald-800">
                      {copy.gestureHint}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Change selection — RED border / RED text */}
          <button
            type="button"
            onClick={clearSelection}
            data-testid="ref-change"
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-red-500 text-red-600 font-bold text-sm hover:bg-red-50 active:scale-[0.98] transition-all shadow-sm"
          >
            <RefreshCw size={15} /> {copy.change}
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────── Scoped CSS ───────────── */
function ScopedTreeStyles() {
  return (
    <style>{`
      .ref-card-enter { animation: refSlideIn .35s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes refSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .ref-result-first { box-shadow: inset 3px 0 0 #D4AF37; }

      .ref-tree-hint-overlay {
        animation: refHintFade 3s ease-out both;
      }
      @keyframes refHintFade {
        0%   { opacity: 0; }
        10%  { opacity: 1; }
        80%  { opacity: 1; }
        100% { opacity: 0; }
      }

      .rd3-tree-wrap {
        overflow: hidden;
        touch-action: none;
        height: 320px;
        position: relative;
      }
      @media (min-width: 640px) { .rd3-tree-wrap { height: 420px; } }
      .rd3-tree-wrap svg { background: transparent; }

      .rd3-link { fill: none; stroke-width: 1.5; }
      .rd3-link-muted { stroke: rgba(11,28,61,0.18); }
      .rd3-link-lineage {
        stroke: #D4AF37; stroke-width: 2.5;
        stroke-dasharray: 6 8;
        animation: dashFlow 1.2s linear infinite;
        filter: drop-shadow(0 0 4px rgba(212,175,55,0.45));
      }
      @keyframes dashFlow {
        from { stroke-dashoffset: 28; }
        to   { stroke-dashoffset: 0; }
      }

      .rd3-node-card {
        fill: #ffffff;
        stroke: rgba(11,28,61,0.15);
        stroke-width: 1;
        transition: all .25s ease;
      }
      .rd3-node-avatar {
        fill: rgba(11,28,61,0.06);
        transition: fill .25s ease;
      }
      .rd3-node-initials {
        font-family: system-ui, sans-serif;
        font-size: 13px; font-weight: 700;
        fill: #ffffff;
        pointer-events: none;
        dominant-baseline: middle;
        paint-order: fill;
        stroke: none;
      }
      .rd3-node-name {
        font-family: system-ui, "Noto Sans Devanagari", sans-serif;
        font-size: 15px;
        font-weight: 500;
        fill: rgba(11,28,61,0.92);
        dominant-baseline: middle;
        pointer-events: none;
        letter-spacing: 0.1px;
        paint-order: fill;
        stroke: none;
      }

      .rd3-node.is-root .rd3-node-card { fill: #0B1C3D; stroke: #D4AF37; stroke-width: 1.5; }
      .rd3-node.is-root .rd3-node-avatar { fill: #D4AF37; }
      .rd3-node.is-root .rd3-node-initials { fill: #0B1C3D; }
      .rd3-node.is-root .rd3-node-name { fill: #F8F1E5; }

      .rd3-node.is-lineage .rd3-node-card {
        fill: #FFF8E6;
        stroke: #D4AF37;
        stroke-width: 1.5;
        filter: drop-shadow(0 1px 3px rgba(212,175,55,0.3));
      }
      .rd3-node.is-lineage .rd3-node-avatar { fill: #D4AF37; }
      .rd3-node.is-lineage .rd3-node-initials { fill: #0B1C3D; }
      .rd3-node.is-lineage .rd3-node-name { fill: rgba(11,28,61,0.92); }

      .rd3-node.is-muted .rd3-node-card { fill: #ffffff; stroke: rgba(11,28,61,0.18); }
      .rd3-node.is-muted .rd3-node-avatar { fill: rgba(11,28,61,0.7); }
      .rd3-node.is-muted .rd3-node-initials { fill: #ffffff; }
      .rd3-node.is-muted .rd3-node-name { fill: rgba(11,28,61,0.92); }

      .rd3-node.is-selected .rd3-node-card {
        fill: #ECFDF5;
        stroke: #10B981;
        stroke-width: 2.5;
        filter: drop-shadow(0 0 6px rgba(16,185,129,0.55));
        animation: selectedBreathe 1.6s ease-in-out infinite;
      }
      .rd3-node.is-selected .rd3-node-avatar { fill: #10B981; }
      .rd3-node.is-selected .rd3-node-initials { fill: #ffffff; }
      .rd3-node.is-selected .rd3-node-name { fill: #064E3B; }
      @keyframes selectedBreathe {
        0%, 100% { filter: drop-shadow(0 0 4px rgba(16,185,129,0.45)); }
        50%      { filter: drop-shadow(0 0 12px rgba(16,185,129,0.85)); }
      }

      .rd3-pulse-1, .rd3-pulse-2 {
        fill: none; stroke: #10B981; stroke-width: 1.5;
        transform-origin: 0px 0px;
        opacity: 0;
      }
      .rd3-pulse-1 { animation: pulseRing 2s ease-out infinite; }
      .rd3-pulse-2 { animation: pulseRing 2s ease-out infinite .9s; }
      @keyframes pulseRing {
        0%   { transform: scale(0.55); opacity: 0.65; }
        70%  { opacity: 0; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    `}</style>
  );
}

/* ───────────── Utilities ───────────── */
const STOP_WORDS = new Set(["ji", "family", "bai", "devi", "panchariya", "and", "&", "the"]);
function computeInitials(name = "") {
  const cleaned = name.replace(/\([^)]*\)/g, "").trim();
  const words = cleaned.split(/[\s+/]+/).map(w => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(w => w && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return (name.trim()[0] || "?").toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
function truncate(s = "", n = 14) {
  const noParens = s.replace(/\([^)]*\)/g, "").trim();
  return noParens.length > n ? noParens.slice(0, n - 1) + "…" : noParens;
}
