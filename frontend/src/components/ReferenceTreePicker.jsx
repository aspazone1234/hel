import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import Fuse from "fuse.js";
import { Search, Check, HelpCircle, X, Crosshair, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * ReferenceTreePicker — Search-first reference selector.
 *
 * UX:
 *   • Primary input is a single fuzzy search box (Fuse.js).
 *   • Suggestions render as large tappable cards with name + relation + path.
 *   • Selecting a result fills a calm green confirmation card (with "Change selection").
 *   • Below the card, a read-only family tree visualises the lineage:
 *       – Path from root to the selected node is highlighted in saffron/gold.
 *       – Selected node gets a green raised card.
 *       – Other branches stay muted and collapsed (expandable for context).
 *   • A muted "I don't know / Not sure" fallback is always available.
 */
export default function ReferenceTreePicker({ value, onChange, lang = "hi" }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set()); // node ids the user has manually expanded
  const treeRootRef = useRef(null);
  const selectedRef = useRef(null);

  // ── Fetch tree once ──
  useEffect(() => {
    let cancel = false;
    axios.get(`${API}/reference-tree/public`)
      .then(r => { if (!cancel) { setTree(r.data); setLoading(false); } })
      .catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  // ── Index ──
  const { byId, childrenOf, rootNode, fallback, allNodes, fuse } = useMemo(() => {
    if (!tree) return { byId: {}, childrenOf: {}, rootNode: null, fallback: null, allNodes: [], fuse: null };
    const byId = {};
    const childrenOf = {};
    for (const n of tree.nodes || []) {
      byId[n.id] = n;
      const p = n.parent_id || "__root__";
      (childrenOf[p] = childrenOf[p] || []).push(n);
    }
    const rootNode = byId[tree.root_id] || null;
    // selectable list excludes root (it's a contextual label, not a person to choose)
    const selectable = (tree.nodes || []).filter(n => n.id !== tree.root_id);
    const fuse = new Fuse(selectable, {
      keys: ["name"],
      threshold: 0.4,           // forgiving but not chaotic
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true,
    });
    return { byId, childrenOf, rootNode, fallback: tree.fallback, allNodes: selectable, fuse };
  }, [tree]);

  // ── Helpers ──
  const lineageOf = useCallback((id) => {
    const out = [];
    let cur = byId[id];
    while (cur) {
      out.unshift(cur);
      cur = cur.parent_id ? byId[cur.parent_id] : null;
    }
    return out;
  }, [byId]);

  const parentOf = useCallback((id) => {
    const n = byId[id];
    return n?.parent_id ? byId[n.parent_id] : null;
  }, [byId]);

  // Auto-expand the selected lineage so the tree always reveals it
  useEffect(() => {
    if (!value || !byId[value]) return;
    const lineage = lineageOf(value);
    setExpanded(prev => {
      const next = new Set(prev);
      lineage.forEach(n => next.add(n.id));
      return next;
    });
  }, [value, byId, lineageOf]);

  // Auto-scroll selected leaf into view
  useEffect(() => {
    if (!value || !selectedRef.current) return;
    const t = setTimeout(() => {
      try { selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
    }, 120);
    return () => clearTimeout(t);
  }, [value]);

  const isFallback = value === fallback?.id;
  const selectedNode = !isFallback && value ? byId[value] : null;
  const selectedLineage = selectedNode ? lineageOf(selectedNode.id) : [];
  const highlightedSet = useMemo(() => new Set(selectedLineage.map(n => n.id)), [selectedLineage]);
  const selectedParent = selectedNode ? parentOf(selectedNode.id) : null;

  // ── Search ──
  const results = useMemo(() => {
    const q = query.trim();
    if (!q || !fuse) return [];
    return fuse.search(q, { limit: 8 });
  }, [query, fuse]);
  const hasFuzzyMatches = results.length > 0 && results.some(r => (r.score ?? 1) > 0.05);

  const select = (nodeId, name) => {
    onChange?.(nodeId, { name, path: lineageOf(nodeId).map(n => n.name) });
    setQuery("");
    setShowResults(false);
  };
  const selectFallback = () => {
    if (!fallback) return;
    const fname = fallback[lang === "hi" ? "name_hi" : "name_en"];
    onChange?.(fallback.id, { name: fname, path: [] });
    setQuery("");
    setShowResults(false);
  };
  const clearSelection = () => {
    onChange?.("", { name: "", path: [] });
  };

  // ── Tree visualisation helpers ──
  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const expandAll = () => {
    if (!tree) return;
    setExpanded(new Set((tree.nodes || []).map(n => n.id)));
  };
  const collapseAll = () => {
    // keep selected lineage expanded
    setExpanded(new Set(selectedLineage.map(n => n.id)));
  };
  const centerSelected = () => {
    if (!selectedRef.current) return;
    selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Build a flat list of visible tree rows (iterative DFS, respects expanded state)
  const flatTree = useMemo(() => {
    if (!tree) return [];
    const out = [];
    const walk = (parentId, depth) => {
      const kids = childrenOf[parentId] || [];
      for (const node of kids) {
        const hasKids = (childrenOf[node.id] || []).length > 0;
        const isOpen = expanded.has(node.id);
        out.push({ node, depth, hasKids, isOpen });
        if (hasKids && isOpen) walk(node.id, depth + 1);
      }
    };
    walk(tree.root_id, 0);
    return out;
  }, [tree, childrenOf, expanded]);

  // ── Copy ──
  const copy = lang === "hi" ? {
    title: "आपका संदर्भ कौन है?",
    sub: "जिस परिवार के सदस्य के माध्यम से आप जुड़े हैं उनका नाम लिखें। सही व्यक्ति ढूँढने में हम आपकी सहायता करेंगे।",
    placeholder: "संदर्भ नाम खोजें",
    helper: "आप अधूरा नाम लिख सकते हैं, हम मेल खाते सुझाव दिखाएँगे।",
    closest: "मेल खाते सुझाव",
    noResults: "यह नाम नहीं मिला।",
    noResultsHelp: "कृपया वर्तनी जाँचें या किसी स्वयंसेवक से सहायता लें।",
    selected: "चयनित संदर्भ",
    change: "बदलें",
    notSure: fallback?.name_hi || "मुझे पता नहीं / निश्चित नहीं",
    notSureHelp: "हमारी टीम बाद में पुष्टि करने में मदद कर सकती है।",
    sonOf: "के यहाँ से",
    treeTitle: "परिवार वृक्ष",
    treeSub: "आपकी चयनित शाखा सुनहरी रेखा से दर्शाई गई है।",
    centerBtn: "चयनित दिखाएँ",
    expandAll: "सभी खोलें",
    collapseAll: "सभी बंद करें",
    rootLabel: "मूल परिवार",
  } : {
    title: "Who is your reference?",
    sub: "Type the name of the family member you are connected through. We'll help find the closest match.",
    placeholder: "Search reference name",
    helper: "You can type a partial name; spelling may be approximate.",
    closest: "Showing closest matches",
    noResults: "We couldn't find this name.",
    noResultsHelp: "Please check the spelling or ask a volunteer for help.",
    selected: "Selected reference",
    change: "Change selection",
    notSure: fallback?.name_en || "I don't know / Not sure",
    notSureHelp: "Our team can help confirm this later if needed.",
    sonOf: "From",
    treeTitle: "Family tree",
    treeSub: "Your selected branch is shown with a golden line.",
    centerBtn: "Center selected",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    rootLabel: "Root family",
  };

  if (loading) {
    return <div className="text-sm text-[#0B1C3D]/50 py-8 text-center">Loading…</div>;
  }
  if (!tree) {
    return <div className="text-sm text-red-500 py-8 text-center">Could not load reference list.</div>;
  }

  // ── Render ──
  return (
    <div className="space-y-5" data-testid="reference-tree-picker">
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

      {/* Search results panel */}
      {showResults && query.trim() && (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm overflow-hidden">
          {results.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-sm font-medium text-[#0B1C3D]/70">{copy.noResults}</p>
              <p className="text-xs text-[#0B1C3D]/45 mt-1">{copy.noResultsHelp}</p>
              <button
                type="button"
                onClick={selectFallback}
                data-testid="ref-not-sure-fallback"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0B1C3D]/5 hover:bg-[#0B1C3D]/10 text-sm font-medium text-[#0B1C3D]"
              >
                <HelpCircle size={14} /> {copy.notSure}
              </button>
            </div>
          ) : (
            <div>
              {hasFuzzyMatches && results.some(r => (r.score ?? 0) > 0.2) && (
                <p className="text-[11px] uppercase tracking-wide text-[#0B1C3D]/50 px-4 pt-3">{copy.closest}</p>
              )}
              <ul className="divide-y divide-[#D4AF37]/10">
                {results.map(({ item, score }) => {
                  const parent = parentOf(item.id);
                  const path = lineageOf(item.id).map(n => n.name);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id, item.name)}
                        data-testid={`ref-result-${item.id}`}
                        className="w-full text-left px-4 py-3 hover:bg-[#F8F1E5]/60 active:bg-[#F8F1E5] transition-colors"
                      >
                        <p className="text-sm sm:text-base font-semibold text-[#0B1C3D] leading-tight">{item.name}</p>
                        {parent && parent.id !== tree.root_id && (
                          <p className="text-xs text-[#0B1C3D]/60 mt-0.5">{copy.sonOf} {parent.name}</p>
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

      {/* Selected confirmation card */}
      {(selectedNode || isFallback) && !query.trim() && (
        <div
          data-testid="ref-confirmation"
          className="rounded-2xl border border-emerald-500/60 bg-emerald-50 p-4 sm:p-5 relative overflow-hidden"
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />
          <p className="text-[11px] uppercase tracking-wide text-emerald-700/80 font-semibold mb-2">{copy.selected}</p>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-sm">
              <Check size={18} strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-bold text-emerald-900 leading-tight" data-testid="ref-selected-name">
                {isFallback ? copy.notSure : selectedNode.name}
              </p>
              {!isFallback && selectedParent && selectedParent.id !== tree.root_id && (
                <p className="text-xs sm:text-sm text-emerald-800/80 mt-1">{copy.sonOf} {selectedParent.name}</p>
              )}
              {!isFallback && selectedLineage.length > 1 && (
                <p className="text-[11px] sm:text-xs text-emerald-700/65 mt-1.5 leading-relaxed break-words">
                  {selectedLineage.slice(0, -1).map(n => n.name).join(" → ")}
                </p>
              )}
              {isFallback && (
                <p className="text-xs sm:text-sm text-emerald-800/75 mt-1">{copy.notSureHelp}</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearSelection}
              data-testid="ref-change"
              className="text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline-offset-4 hover:underline"
            >
              {copy.change}
            </button>
          </div>
        </div>
      )}

      {/* Read-only family tree */}
      <div className="pt-2">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#0B1C3D]">{copy.treeTitle}</h4>
            <p className="text-[11px] text-[#0B1C3D]/55 leading-snug">{copy.treeSub}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedNode && (
              <button type="button" onClick={centerSelected} data-testid="ref-center"
                className="text-[11px] sm:text-xs font-medium text-[#0B1C3D]/70 hover:text-[#0B1C3D] inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#0B1C3D]/5">
                <Crosshair size={12} /> {copy.centerBtn}
              </button>
            )}
            <button type="button" onClick={expandAll} className="text-[11px] sm:text-xs text-[#0B1C3D]/55 hover:text-[#0B1C3D] px-2 py-1 rounded-md hover:bg-[#0B1C3D]/5">
              {copy.expandAll}
            </button>
            <button type="button" onClick={collapseAll} className="text-[11px] sm:text-xs text-[#0B1C3D]/55 hover:text-[#0B1C3D] px-2 py-1 rounded-md hover:bg-[#0B1C3D]/5">
              {copy.collapseAll}
            </button>
          </div>
        </div>

        <div
          ref={treeRootRef}
          className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#F8F1E5]/40 to-white p-3 sm:p-4 max-h-[420px] overflow-y-auto"
        >
          {/* Root label (non-selectable, contextual) */}
          {rootNode && (
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#D4AF37]/15">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#0B1C3D]/70">*</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[#0B1C3D]/50 leading-none">{copy.rootLabel}</p>
                <p className="text-xs sm:text-sm font-semibold text-[#0B1C3D] truncate">{rootNode.name}</p>
              </div>
            </div>
          )}

          <ul className="space-y-1">
            {flatTree.map(item => (
              <TreeRow
                key={item.node.id}
                node={item.node}
                depth={item.depth}
                hasKids={item.hasKids}
                isOpen={item.isOpen}
                isSelected={item.node.id === (isFallback ? null : value)}
                isAncestor={highlightedSet.has(item.node.id) && item.node.id !== value}
                onPath={highlightedSet.has(item.node.id)}
                onToggle={() => toggleExpand(item.node.id)}
                refSetter={item.node.id === value ? selectedRef : null}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* I don't know fallback */}
      {!isFallback && !selectedNode && (
        <button
          type="button"
          onClick={selectFallback}
          data-testid="ref-not-sure"
          className="w-full text-left rounded-2xl border border-dashed border-[#0B1C3D]/20 hover:border-[#0B1C3D]/40 p-4 flex items-start gap-3 bg-white hover:bg-[#F8F1E5]/60 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[#0B1C3D]/5 text-[#0B1C3D]/60 flex items-center justify-center shrink-0">
            <HelpCircle size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0B1C3D]">{copy.notSure}</p>
            <p className="text-xs text-[#0B1C3D]/55 mt-0.5">{copy.notSureHelp}</p>
          </div>
        </button>
      )}
    </div>
  );
}

/* ───────────── Tree row (flat, iterative) ───────────── */
function TreeRow({ node, depth, hasKids, isOpen, isSelected, isAncestor, onPath, onToggle, refSetter }) {
  let containerCls = "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors relative ";
  if (isSelected) containerCls += "bg-emerald-50 border border-emerald-500";
  else if (isAncestor) containerCls += "bg-[#D4AF37]/10 border border-[#D4AF37]/40";
  else containerCls += "hover:bg-white";

  let nameCls = "min-w-0 flex-1 truncate text-xs sm:text-sm leading-snug ";
  if (isSelected) nameCls += "font-bold text-emerald-900";
  else if (isAncestor) nameCls += "font-semibold text-[#0B1C3D]";
  else nameCls += "text-[#0B1C3D]/55";

  let dotCls = "shrink-0 w-2 h-2 rounded-full ";
  if (isSelected) dotCls += "bg-emerald-600";
  else if (isAncestor) dotCls += "bg-[#D4AF37]";
  else dotCls += "bg-[#0B1C3D]/15";

  return (
    <li>
      <div ref={refSetter} className={containerCls} style={{ marginLeft: depth * 14 }}>
        {depth > 0 && (
          <span aria-hidden className={`absolute left-[-8px] top-0 bottom-0 w-px ${onPath ? "bg-[#D4AF37]" : "bg-[#0B1C3D]/10"}`} />
        )}
        {hasKids ? (
          <button
            type="button"
            onClick={onToggle}
            data-testid={`ref-toggle-${node.id}`}
            className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[#0B1C3D]/50 hover:text-[#0B1C3D]"
            aria-label={isOpen ? "collapse" : "expand"}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="shrink-0 w-5" />
        )}
        <span className={dotCls} />
        <p className={nameCls}>{node.name}</p>
        {isSelected && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            <Check size={11} strokeWidth={3} /> Selected
          </span>
        )}
      </div>
    </li>
  );
}
