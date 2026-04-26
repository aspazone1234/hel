import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, Check, ChevronRight, HelpCircle, Users } from "lucide-react";
import { Input } from "./ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * ReferenceTreePicker
 * Hierarchical, tap-to-select picker matching the form's existing visual style
 * (cream surface, gold accents, deep navy text). Every selected node is valid;
 * going deeper is optional. A built-in "I don't know / Not sure" fallback is
 * always available.
 *
 * Props:
 *   value:       selected node id (string)
 *   onChange:    (nodeId, { name, path }) => void
 *   lang:        "hi" | "en"
 *   error:       boolean — show red border on the empty state card
 */
export default function ReferenceTreePicker({ value, onChange, lang = "hi", error = false }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancel = false;
    axios.get(`${API}/reference-tree/public`).then(r => { if (!cancel) { setTree(r.data); setLoading(false); } })
      .catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  // Build helpers from the flat node list
  const { byId, childrenOf, rootChildren, fallback } = useMemo(() => {
    if (!tree) return { byId: {}, childrenOf: {}, rootChildren: [], fallback: null };
    const byId = {};
    const childrenOf = {};
    for (const n of tree.nodes || []) {
      byId[n.id] = n;
      const p = n.parent_id || "__root__";
      (childrenOf[p] = childrenOf[p] || []).push(n);
    }
    // The "first level" the user picks from is the children of the named root,
    // not the root family head itself (that name is contextual, not selectable).
    const rootChildren = childrenOf[tree.root_id] || [];
    return { byId, childrenOf, rootChildren, fallback: tree.fallback };
  }, [tree]);

  const pathFor = (id) => {
    const out = [];
    let cur = byId[id];
    while (cur) {
      out.unshift(cur.name);
      cur = cur.parent_id ? byId[cur.parent_id] : null;
    }
    return out;
  };

  const isFallback = value === fallback?.id;
  const selectedNode = !isFallback && value ? byId[value] : null;
  const selectedChildren = selectedNode ? (childrenOf[selectedNode.id] || []) : [];
  const selectedPath = selectedNode ? pathFor(selectedNode.id) : [];
  const hasChildren = (id) => (childrenOf[id] || []).length > 0;

  // Determine which list to show: when a node is selected, show its siblings
  // (same parent) so the user can switch laterally; if nothing selected, show
  // first level. Children of the selection appear in a separate "more specific"
  // section below, per spec.
  const browseLevel = useMemo(() => {
    if (!selectedNode) return rootChildren;
    const parentKey = selectedNode.parent_id || "__root__";
    return childrenOf[parentKey] || rootChildren;
  }, [selectedNode, rootChildren, childrenOf]);

  // Search across all nodes (case-insensitive substring on name).
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !tree) return null;
    return (tree.nodes || []).filter(n => n.name.toLowerCase().includes(q)).slice(0, 30);
  }, [search, tree]);

  const select = (node) => {
    onChange(node.id, { name: node.name, path: pathFor(node.id) });
    setSearch("");
  };
  const selectFallback = () => {
    onChange(fallback.id, { name: fallback[lang === "hi" ? "name_hi" : "name_en"], path: [] });
    setSearch("");
  };

  // ── Copy ──
  const copy = lang === "hi" ? {
    title: "आपका संदर्भ कौन है?",
    sub: "जिस परिवार या व्यक्ति के माध्यम से आप जुड़े हैं उन्हें चुनें। जो नाम आप पहचानते हैं, वही चुनें।",
    placeholder: "नाम खोजें",
    helper: "आप खोज सकते हैं या नीचे दी गई परिवार सूची में से चुन सकते हैं।",
    none: "अभी कोई संदर्भ नहीं चुना गया",
    selected: "चुना गया संदर्भ",
    moreSpecific: "अगर आप जानते हैं तो अधिक विशिष्ट नाम",
    notSure: fallback ? fallback.name_hi : "मुझे पता नहीं / निश्चित नहीं",
    notSureSub: "यदि आप कोई नाम नहीं पहचान पा रहे हैं तो यह विकल्प चुनें।",
    searchResults: "खोज परिणाम",
    noResults: "कोई परिणाम नहीं मिला",
    family: "परिवार",
    continueWith: "जारी रखें: ",
  } : {
    title: "Who is your reference?",
    sub: "Select the family or person you are connected through. Choose the closest name you recognize.",
    placeholder: "Search name",
    helper: "You can search or choose from the family list below.",
    none: "No reference selected yet",
    selected: "Selected reference",
    moreSpecific: "More specific names, if you know",
    notSure: fallback ? fallback.name_en : "I don't know / Not sure",
    notSureSub: "Choose this if you cannot recognize any of the family names.",
    searchResults: "Search results",
    noResults: "No matching names",
    family: "family",
    continueWith: "Continue with: ",
  };

  if (loading) {
    return <div className="text-sm text-[#0B1C3D]/50 py-6 text-center">Loading reference list…</div>;
  }
  if (!tree) {
    return <div className="text-sm text-red-500 py-6 text-center">Could not load reference list.</div>;
  }

  return (
    <div className="space-y-5" data-testid="reference-tree-picker">
      {/* Title + subtitle */}
      <div>
        <h3 className="text-base font-bold text-[#0B1C3D]" data-testid="ref-title">{copy.title}</h3>
        <p className="text-xs text-[#0B1C3D]/60 mt-1 leading-relaxed">{copy.sub}</p>
      </div>

      {/* Search */}
      <div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
          <Input
            data-testid="ref-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={copy.placeholder}
            className="pl-10 bg-white border-[#D4AF37]/20 text-base h-12"
          />
        </div>
        <p className="text-[11px] text-[#0B1C3D]/45 mt-1.5 leading-snug">{copy.helper}</p>
      </div>

      {/* Selected card */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${
          isFallback || selectedNode
            ? "bg-[#D4AF37]/10 border-[#D4AF37]/50"
            : error
              ? "bg-red-50/40 border-red-300"
              : "bg-[#F8F1E5]/60 border-dashed border-[#D4AF37]/30"
        }`}
        data-testid="ref-selected-card"
      >
        {!isFallback && !selectedNode && (
          <div className="flex items-center gap-2 text-[#0B1C3D]/55 text-sm">
            <Users size={16} className="text-[#D4AF37]/70" />
            <span>{copy.none}</span>
          </div>
        )}
        {(isFallback || selectedNode) && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#0B1C3D]/50 mb-1">{copy.selected}</p>
            <div className="flex items-start gap-2">
              <Check size={18} className="text-green-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#0B1C3D]" data-testid="ref-selected-name">
                  {isFallback ? copy.notSure : selectedNode.name}
                </p>
                {!isFallback && selectedPath.length > 1 && (
                  <p className="text-xs text-[#0B1C3D]/55 mt-0.5 leading-relaxed break-words">
                    {selectedPath.slice(0, -1).join(" → ")}
                  </p>
                )}
                <p className="text-xs text-[#D4AF37] font-medium mt-2">
                  {copy.continueWith}<span className="text-[#0B1C3D]">{isFallback ? copy.notSure : selectedNode.name}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search results OR browse list */}
      {searchResults ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[#0B1C3D]/50 px-1">{copy.searchResults}</p>
          {searchResults.length === 0 ? (
            <div className="text-sm text-[#0B1C3D]/50 py-6 text-center">{copy.noResults}</div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {searchResults.map(n => (
                <NodeRow
                  key={n.id}
                  node={n}
                  selected={n.id === value}
                  hasChildren={hasChildren(n.id)}
                  onClick={() => select(n)}
                  pathHint={pathFor(n.id).slice(0, -1).join(" → ")}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {browseLevel.map(n => (
            <NodeRow
              key={n.id}
              node={n}
              selected={n.id === value}
              hasChildren={hasChildren(n.id)}
              onClick={() => select(n)}
            />
          ))}
        </div>
      )}

      {/* Children of selection — optional refinement */}
      {!searchResults && selectedChildren.length > 0 && (
        <div className="pt-2 space-y-2 border-t border-[#D4AF37]/15">
          <p className="text-[11px] uppercase tracking-wide text-[#0B1C3D]/50 px-1 pt-3">{copy.moreSpecific}</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {selectedChildren.map(n => (
              <NodeRow
                key={n.id}
                node={n}
                selected={n.id === value}
                hasChildren={hasChildren(n.id)}
                onClick={() => select(n)}
                refined
              />
            ))}
          </div>
        </div>
      )}

      {/* Fallback */}
      <button
        type="button"
        onClick={selectFallback}
        data-testid="ref-not-sure"
        className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition-all ${
          isFallback
            ? "bg-[#0B1C3D]/5 border-[#0B1C3D]/40"
            : "bg-white border-[#0B1C3D]/15 hover:border-[#0B1C3D]/35"
        }`}
      >
        <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isFallback ? "bg-[#0B1C3D] text-[#D4AF37]" : "bg-[#0B1C3D]/5 text-[#0B1C3D]/60"
        }`}>
          {isFallback ? <Check size={16} /> : <HelpCircle size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0B1C3D]">{copy.notSure}</p>
          <p className="text-xs text-[#0B1C3D]/55 mt-0.5 leading-snug">{copy.notSureSub}</p>
        </div>
      </button>
    </div>
  );
}

function NodeRow({ node, selected, hasChildren, onClick, pathHint, refined = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`ref-node-${node.id}`}
      className={`w-full text-left rounded-2xl border p-4 min-h-[56px] flex items-center gap-3 transition-all ${
        selected
          ? "bg-[#D4AF37]/15 border-[#D4AF37] shadow-sm"
          : refined
            ? "bg-white border-[#D4AF37]/15 hover:border-[#D4AF37]/45"
            : "bg-white border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#F8F1E5]/50"
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
        selected ? "bg-[#D4AF37] text-[#0B1C3D]" : "bg-[#0B1C3D]/5 text-[#D4AF37]"
      }`}>
        {selected ? <Check size={16} /> : <Users size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm sm:text-base font-semibold leading-snug ${selected ? "text-[#0B1C3D]" : "text-[#0B1C3D]"}`}>
          {node.name}
        </p>
        {pathHint && (
          <p className="text-[11px] text-[#0B1C3D]/45 mt-0.5 truncate">{pathHint}</p>
        )}
      </div>
      {hasChildren && (
        <ChevronRight size={18} className={`shrink-0 ${selected ? "text-[#D4AF37]" : "text-[#0B1C3D]/30"}`} />
      )}
    </button>
  );
}
