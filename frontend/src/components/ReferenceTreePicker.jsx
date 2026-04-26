import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import Fuse from "fuse.js";
import { Tree } from "react-d3-tree";
import { Search, Check, X, MousePointerClick, RefreshCw, ArrowDown } from "lucide-react";
import { Input } from "./ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * ReferenceTreePicker — Search-first selector + animated mind-map family tree.
 *
 * UX flow:
 *   1. Mount: ONLY the search box is shown with an animated "↓ Tap a name below to select" hint.
 *   2. As the user types, fuzzy results appear as tappable cards (Fuse.js).
 *   3. On selection: green confirmation card slides in AND an animated SVG family-tree
 *      mind-map renders below — selected node + its lineage edges pulse in saffron/green.
 *   4. Tapping the prominent "Change selection" button clears the selection — both the
 *      green card and the family tree disappear together; the hint reappears.
 *
 * No "I don't know / Not sure" fallback — selection is required.
 */
export default function ReferenceTreePicker({ value, onChange, lang = "hi" }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [translate, setTranslate] = useState({ x: 200, y: 60 });
  const treeContainerRef = useRef(null);
  const treeApiRef = useRef(null);

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

  // ── Helpers ──
  const lineageOf = useCallback((id) => {
    const out = [];
    let cur = byId[id];
    while (cur) { out.unshift(cur); cur = cur.parent_id ? byId[cur.parent_id] : null; }
    return out;
  }, [byId]);
  const parentOf = useCallback((id) => {
    const n = byId[id];
    return n?.parent_id ? byId[n.parent_id] : null;
  }, [byId]);

  const selectedNode = value && byId[value] ? byId[value] : null;
  const selectedLineage = selectedNode ? lineageOf(selectedNode.id) : [];
  const lineageIds = useMemo(() => new Set(selectedLineage.map(n => n.id)), [selectedLineage]);
  const selectedParent = selectedNode ? parentOf(selectedNode.id) : null;

  // Center the d3 tree initially relative to the container size
  useEffect(() => {
    if (!treeContainerRef.current) return;
    const { clientWidth } = treeContainerRef.current;
    setTranslate({ x: clientWidth / 2, y: 56 });
  }, [tree]);

  // After the tree renders, recenter on the selected node so users always see it.
  useEffect(() => {
    if (!value || !treeContainerRef.current) return;
    const t = setTimeout(() => {
      const container = treeContainerRef.current;
      if (!container) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      const sel = svg.querySelector(".rd3-node.is-selected");
      if (!sel) return;
      const cBox = container.getBoundingClientRect();
      const sBox = sel.getBoundingClientRect();
      const dx = cBox.left + cBox.width / 2 - (sBox.left + sBox.width / 2);
      const dy = cBox.top + cBox.height / 2 - (sBox.top + sBox.height / 2);
      setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }, 400);
    return () => clearTimeout(t);
  }, [value, tree]);

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
    setShowResults(false);
  };
  const clearSelection = () => {
    onChange?.("", { name: "", path: [] });
    setQuery("");
    setShowResults(false);
  };

  // ── Copy ──
  const copy = lang === "hi" ? {
    title: "आपका संदर्भ कौन है?",
    sub: "जिस परिवार के सदस्य के माध्यम से आप जुड़े हैं उनका नाम लिखें। सही व्यक्ति ढूँढने में हम आपकी सहायता करेंगे।",
    placeholder: "संदर्भ नाम खोजें",
    helper: "आप अधूरा नाम लिख सकते हैं, हम मेल खाते सुझाव दिखाएँगे।",
    typeHint: "ऊपर खोज बॉक्स में नाम लिखें",
    tapHint: "नीचे दिए गए नाम पर टैप करें",
    closest: "मेल खाते सुझाव",
    noResults: "यह नाम नहीं मिला।",
    noResultsHelp: "कृपया वर्तनी जाँचें या किसी स्वयंसेवक से सहायता लें।",
    selected: "चयनित संदर्भ",
    change: "चयन बदलें",
    sonOf: "के यहाँ से",
    treeTitle: "परिवार वृक्ष",
    treeSub: "आपका चयनित संदर्भ और उसकी पीढ़ी सुनहरी रेखा से दर्शाई गई है।",
    centerBtn: "केंद्र में लाएँ",
  } : {
    title: "Who is your reference?",
    sub: "Type the name of the family member you are connected through. We'll help find the closest match.",
    placeholder: "Search reference name",
    helper: "You can type a partial name; spelling may be approximate.",
    typeHint: "Type a name in the search above",
    tapHint: "Tap a name below to select",
    closest: "Showing closest matches",
    noResults: "We couldn't find this name.",
    noResultsHelp: "Please check the spelling or ask a volunteer for help.",
    selected: "Selected reference",
    change: "Change selection",
    sonOf: "From",
    treeTitle: "Family tree",
    treeSub: "Your selected reference and its lineage are highlighted with the golden line.",
    centerBtn: "Center selected",
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

    // Card sized for readable text. Wider on lineage/selected so longer names fit.
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
    <div className="space-y-5" data-testid="reference-tree-picker">
      <ScopedTreeStyles />

      {/* Title + subtitle */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[#0B1C3D]" data-testid="ref-title">{copy.title}</h3>
        <p className="text-xs sm:text-sm text-[#0B1C3D]/60 mt-1.5 leading-relaxed">{copy.sub}</p>
      </div>

      {/* Search input */}
      <div>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
          <Input
            data-testid="ref-search"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder={copy.placeholder}
            className="pl-11 pr-10 h-12 text-base bg-white border-[#D4AF37]/30 focus-visible:ring-[#D4AF37]/40 focus-visible:border-[#D4AF37]"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/40 hover:text-[#0B1C3D]"
              aria-label="clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-[#0B1C3D]/50 mt-1.5 leading-snug">{copy.helper}</p>
      </div>

      {/* Search results */}
      {showResults && query.trim() && (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm overflow-hidden">
          {results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-medium text-[#0B1C3D]/70">{copy.noResults}</p>
              <p className="text-xs text-[#0B1C3D]/45 mt-1">{copy.noResultsHelp}</p>
            </div>
          ) : (
            <div>
              {/* Animated tap-hint banner */}
              <div className="flex items-center justify-center gap-2 px-4 pt-3 pb-1 ref-tap-hint">
                <ArrowDown size={14} className="text-[#D4AF37] animate-bounce" />
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#D4AF37]">{copy.tapHint}</p>
                <MousePointerClick size={14} className="text-[#D4AF37] animate-pulse" />
              </div>
              <p className="text-[10px] text-center text-[#0B1C3D]/45 px-4 pb-2">{copy.closest}</p>
              <ul className="divide-y divide-[#D4AF37]/10">
                {results.map(({ item }, idx) => {
                  const parent = parentOf(item.id);
                  const path = lineageOf(item.id).map(n => nameOf(n));
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id, nameOf(item))}
                        data-testid={`ref-result-${item.id}`}
                        className={`w-full text-left px-4 py-3 hover:bg-[#F8F1E5]/60 active:bg-[#F8F1E5] transition-colors ${idx === 0 ? "ref-result-first" : ""}`}
                      >
                        <p className="text-sm sm:text-base font-semibold text-[#0B1C3D] leading-tight">{nameOf(item)}</p>
                        {parent && parent.id !== tree.root_id && (
                          <p className="text-xs text-[#0B1C3D]/60 mt-0.5">{copy.sonOf} {nameOf(parent)}</p>
                        )}
                        {path.length > 1 && (
                          <p className="text-[11px] text-[#0B1C3D]/40 mt-1 truncate">{path.slice(0, -1).join(" → ")}</p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Idle hint when nothing typed and nothing selected */}
      {!query.trim() && !selectedNode && (
        <div className="flex items-center justify-center gap-2 py-3 text-[#0B1C3D]/45 italic ref-idle-hint">
          <Search size={14} className="animate-pulse" />
          <span className="text-xs">{copy.typeHint}</span>
        </div>
      )}

      {/* Selected confirmation + tree (appear together) */}
      {selectedNode && !query.trim() && (
        <>
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
                  {nameOf(selectedNode)}
                </p>
                {selectedParent && selectedParent.id !== tree.root_id && (
                  <p className="text-xs sm:text-sm text-emerald-800/80 mt-1">{copy.sonOf} {nameOf(selectedParent)}</p>
                )}
                {selectedLineage.length > 1 && (
                  <p className="text-[11px] sm:text-xs text-emerald-700/65 mt-1.5 leading-relaxed break-words">
                    {selectedLineage.slice(0, -1).map(n => nameOf(n)).join(" → ")}
                  </p>
                )}
              </div>
            </div>
            {/* Prominent Change selection button */}
            <button
              type="button"
              onClick={clearSelection}
              data-testid="ref-change"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-emerald-500 text-emerald-700 font-bold text-sm hover:bg-emerald-500 hover:text-white active:scale-[0.98] transition-all shadow-sm"
            >
              <RefreshCw size={15} /> {copy.change}
            </button>
          </div>

          {/* Family tree mind-map */}
          <div className="ref-card-enter">
            <div className="mb-2">
              <h4 className="text-sm font-bold text-[#0B1C3D]">{copy.treeTitle}</h4>
              <p className="text-[11px] text-[#0B1C3D]/55 leading-snug">{copy.treeSub}</p>
            </div>
            <div
              ref={treeContainerRef}
              className="rd3-tree-wrap rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#F8F1E5]/40 to-white"
            >
              {hierarchy && (
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
                  scaleExtent={{ min: 0.4, max: 1.8 }}
                  zoom={0.8}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────── Scoped CSS for the tree ───────────── */
function ScopedTreeStyles() {
  return (
    <style>{`
      .ref-card-enter { animation: refSlideIn .35s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes refSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .ref-result-first { box-shadow: inset 3px 0 0 #D4AF37; }
      .ref-idle-hint { letter-spacing: .03em; }

      .rd3-tree-wrap { overflow: hidden; touch-action: none; height: 280px; }
      @media (min-width: 640px) { .rd3-tree-wrap { height: 360px; } }
      .rd3-tree-wrap svg { background: transparent; }

      /* Default link */
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

      /* Node card */
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
        font-size: 13px; font-weight: 800;
        fill: #ffffff;
        pointer-events: none;
        dominant-baseline: middle;
      }
      .rd3-node-name {
        font-family: system-ui, "Noto Sans Devanagari", sans-serif;
        font-size: 15px; font-weight: 600;
        fill: rgba(11,28,61,0.9);
        dominant-baseline: middle;
        pointer-events: none;
        letter-spacing: 0.1px;
      }

      /* Root (decorative, non-interactive feel) */
      .rd3-node.is-root .rd3-node-card { fill: #0B1C3D; stroke: #D4AF37; stroke-width: 1.5; }
      .rd3-node.is-root .rd3-node-avatar { fill: #D4AF37; }
      .rd3-node.is-root .rd3-node-initials { fill: #0B1C3D; }
      .rd3-node.is-root .rd3-node-name { fill: #F8F1E5; font-weight: 700; }

      /* Lineage (gold) */
      .rd3-node.is-lineage .rd3-node-card {
        fill: #FFF8E6;
        stroke: #D4AF37;
        stroke-width: 1.5;
        filter: drop-shadow(0 1px 3px rgba(212,175,55,0.3));
      }
      .rd3-node.is-lineage .rd3-node-avatar { fill: #D4AF37; }
      .rd3-node.is-lineage .rd3-node-initials { fill: #0B1C3D; }
      .rd3-node.is-lineage .rd3-node-name { fill: #0B1C3D; font-weight: 800; }

      /* Muted */
      .rd3-node.is-muted .rd3-node-card { fill: #ffffff; stroke: rgba(11,28,61,0.18); }
      .rd3-node.is-muted .rd3-node-avatar { fill: rgba(11,28,61,0.7); }
      .rd3-node.is-muted .rd3-node-initials { fill: #ffffff; }
      .rd3-node.is-muted .rd3-node-name { fill: rgba(11,28,61,0.85); }

      /* Selected (green + animated pulse) */
      .rd3-node.is-selected .rd3-node-card {
        fill: #ECFDF5;
        stroke: #10B981;
        stroke-width: 2.5;
        filter: drop-shadow(0 0 6px rgba(16,185,129,0.55));
        animation: selectedBreathe 1.6s ease-in-out infinite;
      }
      .rd3-node.is-selected .rd3-node-avatar { fill: #10B981; }
      .rd3-node.is-selected .rd3-node-initials { fill: #ffffff; }
      .rd3-node.is-selected .rd3-node-name { fill: #064E3B; font-weight: 800; }
      @keyframes selectedBreathe {
        0%, 100% { filter: drop-shadow(0 0 4px rgba(16,185,129,0.45)); }
        50%      { filter: drop-shadow(0 0 12px rgba(16,185,129,0.85)); }
      }

      /* Pulse rings around selected node */
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
