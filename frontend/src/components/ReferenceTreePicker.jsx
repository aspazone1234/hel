import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { Search, ChevronLeft, ChevronRight, Plus, Minus, Check } from "lucide-react";
import { Input } from "./ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * ReferenceTreePicker — Stacked-carousel family selector.
 *
 * UX:
 *   • Each active generation = one horizontal carousel: ‹ ghost-prev | CENTER | ghost-next ›
 *   • The center block is the committed selection at that level (green).
 *   • Generations the user has drilled into stack vertically above the current.
 *   • Every selection is valid — going deeper is optional.
 *   • A "+ more specific" pill expands the next generation; "− less specific" collapses it.
 *   • Search jumps to any matching node and rebuilds the lineage automatically.
 */
export default function ReferenceTreePicker({ value, onChange, lang = "hi" }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // centers[i] = which sibling index is centered at generation i (0-indexed)
  const [centers, setCenters] = useState([0]);
  const lastEmittedRef = useRef(null);
  const initialValueRef = useRef(value); // captured once at mount; ignore later prop changes
  const initialisedRef = useRef(false);

  // ── Fetch ──
  useEffect(() => {
    let cancel = false;
    axios.get(`${API}/reference-tree/public`)
      .then(r => { if (!cancel) { setTree(r.data); setLoading(false); } })
      .catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  // ── Helpers ──
  const { byId, childrenOf, rootNode, rootChildren } = useMemo(() => {
    if (!tree) return { byId: {}, childrenOf: {}, rootNode: null, rootChildren: [] };
    const byId = {};
    const childrenOf = {};
    for (const n of tree.nodes || []) {
      byId[n.id] = n;
      const p = n.parent_id || "__root__";
      (childrenOf[p] = childrenOf[p] || []).push(n);
    }
    return {
      byId,
      childrenOf,
      rootNode: byId[tree.root_id] || null,
      rootChildren: childrenOf[tree.root_id] || [],
    };
  }, [tree]);

  // Compute lineage of a given node id (root excluded — only selectable nodes)
  const lineageOf = (id) => {
    const out = [];
    let cur = byId[id];
    while (cur && cur.id !== tree?.root_id) {
      out.unshift(cur);
      cur = cur.parent_id ? byId[cur.parent_id] : null;
    }
    return out;
  };

  // Sync external `value` → `centers` ONCE on first tree load (edit-mode prefill).
  // After that the picker is uncontrolled internally so we don't loop with the parent.
  useEffect(() => {
    if (!tree || initialisedRef.current) return;
    initialisedRef.current = true;
    const v = initialValueRef.current;
    if (!v || !byId[v]) return;
    const lineage = lineageOf(v);
    if (lineage.length === 0) return;
    const idxs = [];
    let siblings = rootChildren;
    for (const node of lineage) {
      const i = siblings.findIndex(s => s.id === node.id);
      if (i < 0) break;
      idxs.push(i);
      siblings = childrenOf[node.id] || [];
    }
    if (idxs.length > 0) {
      setCenters(idxs);
      lastEmittedRef.current = v; // suppress redundant onChange immediately after init
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  // ── Build active generations from `centers` ──
  const generations = useMemo(() => {
    if (!tree) return [];
    const gens = [];
    let nodes = rootChildren;
    let parentName = rootNode ? rootNode.name : "";
    for (let i = 0; i < centers.length; i++) {
      if (nodes.length === 0) break;
      const idx = Math.min(Math.max(centers[i], 0), nodes.length - 1);
      gens.push({ depth: i, nodes, currentIdx: idx, parentName });
      const centerNode = nodes[idx];
      nodes = childrenOf[centerNode.id] || [];
      parentName = centerNode.name;
    }
    return gens;
  }, [tree, centers, rootChildren, childrenOf, rootNode]);

  const deepestGen = generations[generations.length - 1] || null;
  const selectedNode = deepestGen ? deepestGen.nodes[deepestGen.currentIdx] : null;
  const canGoDeeper = selectedNode && (childrenOf[selectedNode.id] || []).length > 0;

  // Emit selection upward whenever it changes
  useEffect(() => {
    if (!selectedNode) return;
    if (lastEmittedRef.current === selectedNode.id) return;
    lastEmittedRef.current = selectedNode.id;
    onChange?.(selectedNode.id, {
      name: selectedNode.name,
      path: lineageOf(selectedNode.id).map(n => n.name),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  // ── Mutations ──
  const setCenterAt = (depth, newIdx) => {
    setCenters(prev => {
      const next = prev.slice(0, depth + 1);
      next[depth] = newIdx;
      return next;
    });
  };
  const stepCenter = (depth, dir) => {
    const gen = generations[depth];
    if (!gen) return;
    const total = gen.nodes.length;
    if (total <= 1) return;
    const next = (gen.currentIdx + dir + total) % total;
    setCenterAt(depth, next);
  };
  const goDeeper = () => {
    if (!canGoDeeper) return;
    setCenters(c => [...c, 0]);
  };
  const goShallower = () => {
    setCenters(c => (c.length > 1 ? c.slice(0, -1) : c));
  };

  // Search — pick a node directly and rebuild centers from its lineage
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !tree) return null;
    return (tree.nodes || []).filter(n => n.name.toLowerCase().includes(q)).slice(0, 25);
  }, [search, tree]);

  const jumpTo = (id) => {
    const lineage = lineageOf(id);
    if (lineage.length === 0) return;
    const idxs = [];
    let siblings = rootChildren;
    for (const node of lineage) {
      const i = siblings.findIndex(s => s.id === node.id);
      if (i < 0) break;
      idxs.push(i);
      siblings = childrenOf[node.id] || [];
    }
    if (idxs.length > 0) setCenters(idxs);
    setSearch("");
  };

  // ── Copy ──
  const copy = lang === "hi" ? {
    title: "आपका संदर्भ कौन है?",
    sub: "जिस परिवार या व्यक्ति के माध्यम से आप जुड़े हैं उन्हें चुनें। पीढ़ी के तीर ‹ › से दूसरा नाम चुन सकते हैं।",
    placeholder: "नाम खोजें",
    helper: "खोजें या नीचे पीढ़ियों में से चुनें।",
    moreSpecific: "और विशिष्ट",
    less: "वापस",
    relPrefix: "",
    relSuffix: " से",
    searchResults: "खोज परिणाम",
    noResults: "कोई परिणाम नहीं",
    continueWith: "जारी रखें: ",
  } : {
    title: "Who is your reference?",
    sub: "Pick the family or person you are connected through. Use the ‹ › arrows to switch within a generation.",
    placeholder: "Search name",
    helper: "Search or pick from the generations below.",
    moreSpecific: "More specific",
    less: "Step back",
    relPrefix: "From ",
    relSuffix: "",
    searchResults: "Search results",
    noResults: "No matches",
    continueWith: "Continue with: ",
  };

  // ── Render ──
  if (loading) {
    return <div className="text-sm text-[#0B1C3D]/50 py-6 text-center">Loading…</div>;
  }
  if (!tree) {
    return <div className="text-sm text-red-500 py-6 text-center">Could not load reference list.</div>;
  }

  return (
    <div className="space-y-4" data-testid="reference-tree-picker">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#0B1C3D]" data-testid="ref-title">{copy.title}</h3>
        <p className="text-xs text-[#0B1C3D]/60 mt-1 leading-relaxed">{copy.sub}</p>
      </div>

      {/* Search */}
      <div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
          <Input
            data-testid="ref-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={copy.placeholder}
            className="pl-9 bg-white border-[#D4AF37]/20 h-10 text-sm"
          />
        </div>
        <p className="text-[11px] text-[#0B1C3D]/45 mt-1 leading-snug">{copy.helper}</p>
      </div>

      {/* Search results overlay */}
      {searchResults && (
        <div className="space-y-1.5 bg-[#F8F1E5]/60 border border-[#D4AF37]/15 rounded-xl p-2">
          <p className="text-[10px] uppercase tracking-wide text-[#0B1C3D]/50 px-1">
            {copy.searchResults}
          </p>
          {searchResults.length === 0 ? (
            <div className="text-xs text-[#0B1C3D]/50 py-3 text-center">{copy.noResults}</div>
          ) : (
            <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
              {searchResults.map(n => {
                const path = lineageOf(n.id).map(x => x.name);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => jumpTo(n.id)}
                    data-testid={`ref-search-${n.id}`}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-[#D4AF37]/30 transition-all flex items-center gap-2"
                  >
                    <Avatar name={n.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0B1C3D] truncate">{n.name}</p>
                      {path.length > 1 && (
                        <p className="text-[10px] text-[#0B1C3D]/45 truncate">{path.slice(0, -1).join(" → ")}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stacked generation carousels */}
      {!searchResults && (
        <div className="space-y-3">
          {generations.map((gen, i) => {
            const isDeepest = i === generations.length - 1;
            return (
              <GenerationCarousel
                key={`gen-${i}`}
                gen={gen}
                isDeepest={isDeepest}
                lang={lang}
                relPrefix={copy.relPrefix}
                relSuffix={copy.relSuffix}
                onPrev={() => stepCenter(i, -1)}
                onNext={() => stepCenter(i, +1)}
              />
            );
          })}

          {/* Action row — drill or step back */}
          {(canGoDeeper || generations.length > 1) && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {generations.length > 1 && (
                <button
                  type="button"
                  onClick={goShallower}
                  data-testid="ref-go-shallower"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[#0B1C3D]/60 hover:text-[#0B1C3D] bg-[#0B1C3D]/5 hover:bg-[#0B1C3D]/10 transition-colors"
                >
                  <Minus size={12} /> {copy.less}
                </button>
              )}
              {canGoDeeper && (
                <button
                  type="button"
                  onClick={goDeeper}
                  data-testid="ref-go-deeper"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#0B1C3D] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 transition-colors"
                >
                  <Plus size={12} /> {copy.moreSpecific}
                </button>
              )}
            </div>
          )}

          {/* Continue confirmation */}
          {selectedNode && (
            <div className="text-center pt-1">
              <p className="text-xs text-[#0B1C3D]/55">
                {copy.continueWith}
                <span className="text-emerald-700 font-semibold">{selectedNode.name}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Generation carousel  ───────────────────────── */
function GenerationCarousel({ gen, isDeepest, lang, relPrefix, relSuffix, onPrev, onNext }) {
  const { nodes, currentIdx, parentName, depth } = gen;
  const total = nodes.length;
  const center = nodes[currentIdx];
  const prev = total > 1 ? nodes[(currentIdx - 1 + total) % total] : null;
  const next = total > 1 ? nodes[(currentIdx + 1) % total] : null;
  const canPaginate = total > 1;

  const relText = `${relPrefix}${shortName(parentName)}${relSuffix}`;

  return (
    <div data-testid={`ref-gen-${depth}`}>
      {/* Tiny gen counter */}
      <p className="text-[10px] uppercase tracking-wider text-[#0B1C3D]/35 mb-1 px-1">
        {lang === "hi" ? `पीढ़ी ${depth + 1}` : `Generation ${depth + 1}`}
        {canPaginate && (
          <span className="ml-2 text-[#0B1C3D]/40">{currentIdx + 1} / {total}</span>
        )}
      </p>
      <div className="flex items-stretch gap-1.5">
        {/* Prev arrow + ghost label */}
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPaginate}
          data-testid={`ref-prev-${depth}`}
          className={`shrink-0 w-7 self-stretch flex items-center justify-center rounded-lg transition-colors ${
            canPaginate
              ? "text-[#0B1C3D]/50 hover:text-[#0B1C3D] hover:bg-[#0B1C3D]/5"
              : "text-[#0B1C3D]/15 cursor-not-allowed"
          }`}
          aria-label="previous"
        >
          <ChevronLeft size={18} />
        </button>
        <GhostLabel name={prev?.name} side="left" />

        {/* Center block — selected */}
        <CenterBlock node={center} relText={relText} isDeepest={isDeepest} />

        <GhostLabel name={next?.name} side="right" />
        {/* Next arrow */}
        <button
          type="button"
          onClick={onNext}
          disabled={!canPaginate}
          data-testid={`ref-next-${depth}`}
          className={`shrink-0 w-7 self-stretch flex items-center justify-center rounded-lg transition-colors ${
            canPaginate
              ? "text-[#0B1C3D]/50 hover:text-[#0B1C3D] hover:bg-[#0B1C3D]/5"
              : "text-[#0B1C3D]/15 cursor-not-allowed"
          }`}
          aria-label="next"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function CenterBlock({ node, relText, isDeepest }) {
  return (
    <div
      data-testid={`ref-center-${node.id}`}
      className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all ${
        isDeepest
          ? "bg-emerald-50 border-emerald-500 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.35)]"
          : "bg-emerald-50/70 border-emerald-400/70"
      }`}
    >
      <Avatar name={node.name} size={36} selected />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] sm:text-sm font-semibold text-emerald-900 leading-tight truncate">
          {node.name}
        </p>
        <p className="text-[10px] sm:text-[11px] text-emerald-800/70 leading-tight truncate mt-0.5">
          {relText}
        </p>
      </div>
      <Check size={15} className="shrink-0 text-emerald-600" />
    </div>
  );
}

function GhostLabel({ name, side }) {
  if (!name) return <span className="hidden sm:block w-12" />;
  return (
    <span
      className={`hidden sm:flex items-center max-w-[80px] text-[11px] leading-tight text-[#0B1C3D]/35 italic select-none truncate px-1 ${
        side === "left" ? "justify-end text-right" : "justify-start text-left"
      }`}
      style={{ filter: "blur(0.4px)" }}
      title={name}
    >
      {shortName(name, 18)}
    </span>
  );
}

/* ─────────────────────────  Avatar with initials  ───────────────────────── */
function Avatar({ name, size = 36, selected = false }) {
  const init = useMemo(() => initials(name), [name]);
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-bold ${
        selected
          ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-2 ring-emerald-200"
          : "bg-gradient-to-br from-[#D4AF37] to-[#B8860B] text-[#0B1C3D]"
      }`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {init}
    </div>
  );
}

/* ─────────────────────────  Utilities  ───────────────────────── */
const STOP_WORDS = new Set([
  "ji", "family", "bai", "devi", "panchariya", "and", "&", "the",
]);
function initials(name = "") {
  const cleaned = name.replace(/\([^)]*\)/g, "").trim();
  const words = cleaned.split(/[\s+/]+/).map(w => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(w => w && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return (name.trim()[0] || "?").toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
function shortName(name = "", max = 28) {
  const noParens = name.replace(/\([^)]*\)/g, "").trim();
  return noParens.length > max ? noParens.slice(0, max - 1).trimEnd() + "…" : noParens;
}
