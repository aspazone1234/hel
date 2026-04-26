import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Edit2, Trash2, Save, X, Users, GripVertical, ChevronRight, ChevronDown,
  RotateCcw, AlertTriangle, Search, Hash,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * ReferencePersonManager (redesigned)
 *
 * Super-admin editor for the customer-facing Reference Tree.
 *
 *   • Section 1 — FAMILY TREE EDITOR
 *       Indented hierarchical view. Drag & drop to re-parent, inline rename
 *       (English + Hindi), add child, delete subtree. Single batch save.
 *
 *   • Section 2 — DETAIL PANEL (per node)
 *       Click any node → edit its display rank (lower = appears higher in the
 *       registration form's reference search ordering).
 */
export default function ReferencePersonManager({ user }) {
  const isSuper = user?.role === "superadmin";
  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }),
    []
  );

  // ── Tree state ──
  const [serverTree, setServerTree] = useState(null); // last-saved snapshot
  const [tree, setTree] = useState(null); // working copy
  const [loadingTree, setLoadingTree] = useState(true);
  const [savingTree, setSavingTree] = useState(false);
  const [collapsed, setCollapsed] = useState({}); // { id: true/false }

  // ── Per-node settings (rank only) ──
  const [persons, setPersons] = useState([]); // from /admin/reference-persons
  const [selectedId, setSelectedId] = useState(null);
  const [savingPerson, setSavingPerson] = useState(false);

  // ── Search / filter ──
  const [filter, setFilter] = useState("");

  // ── Drag state ──
  const dragIdRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  // ── Fetch ──
  const fetchTree = useCallback(async () => {
    setLoadingTree(true);
    try {
      const { data } = await axios.get(`${API}/admin/reference-tree`, { headers: authHeaders() });
      setServerTree(data);
      setTree(data);
    } catch {
      toast.error("Failed to load family tree");
    } finally {
      setLoadingTree(false);
    }
  }, [authHeaders]);

  const fetchPersons = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/reference-persons`, { headers: authHeaders() });
      setPersons(data || []);
    } catch {
      // silent — tree still works
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchTree();
    fetchPersons();
  }, [fetchTree, fetchPersons]);

  // ── Indexes derived from working tree ──
  const { byId, childrenOf, descendantSets } = useMemo(() => {
    if (!tree) return { byId: {}, childrenOf: {}, descendantSets: {} };
    const byId = {};
    const childrenOf = {};
    for (const n of tree.nodes || []) {
      byId[n.id] = n;
      const p = n.parent_id || "__root__";
      (childrenOf[p] = childrenOf[p] || []).push(n);
    }
    // Descendant set per node (used to forbid dropping a node onto its own descendants)
    const descendantSets = {};
    const collect = (id) => {
      if (descendantSets[id]) return descendantSets[id];
      const set = new Set();
      for (const c of childrenOf[id] || []) {
        set.add(c.id);
        for (const d of collect(c.id)) set.add(d);
      }
      descendantSets[id] = set;
      return set;
    };
    for (const n of tree.nodes || []) collect(n.id);
    return { byId, childrenOf, descendantSets };
  }, [tree]);

  const personById = useMemo(() => {
    const m = {};
    for (const p of persons) m[p.id] = p;
    return m;
  }, [persons]);

  const isDirty = useMemo(() => {
    if (!serverTree || !tree) return false;
    return JSON.stringify(serverTree) !== JSON.stringify(tree);
  }, [serverTree, tree]);

  // ── Tree mutators (local-only until Save) ──
  const updateNodes = (mutator) => {
    setTree((prev) => {
      if (!prev) return prev;
      const nodes = prev.nodes.map((n) => ({ ...n }));
      const next = mutator(nodes);
      return { ...prev, nodes: next };
    });
  };

  const addChild = (parentId) => {
    const newId = `ft-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    updateNodes((nodes) => {
      nodes.push({
        id: newId,
        name: "New Member",
        name_hi: "",
        parent_id: parentId,
      });
      return nodes;
    });
    setCollapsed((c) => ({ ...c, [parentId]: false }));
    setSelectedId(newId);
  };

  const renameNode = (id, field, value) => {
    updateNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, [field]: value } : n))
    );
  };

  const deleteSubtree = (id) => {
    if (id === tree?.root_id) {
      toast.error("Cannot delete the root node");
      return;
    }
    const subtreeIds = new Set([id, ...Array.from(descendantSets[id] || [])]);
    const node = byId[id];
    const childCount = subtreeIds.size - 1;
    const msg =
      childCount > 0
        ? `Delete "${node?.name}" and all ${childCount} descendant${childCount === 1 ? "" : "s"}?`
        : `Delete "${node?.name}"?`;
    if (!window.confirm(msg)) return;
    updateNodes((nodes) => nodes.filter((n) => !subtreeIds.has(n.id)));
    if (selectedId && subtreeIds.has(selectedId)) setSelectedId(null);
  };

  const reparent = (dragId, newParentId) => {
    if (!dragId || !newParentId || dragId === newParentId) return;
    if (dragId === tree?.root_id) {
      toast.error("Cannot move the root node");
      return;
    }
    // Forbid making a descendant the new parent (would create a cycle)
    if (descendantSets[dragId]?.has(newParentId)) {
      toast.error("Cannot drop a node into its own descendant");
      return;
    }
    if (byId[dragId]?.parent_id === newParentId) return; // no-op
    updateNodes((nodes) =>
      nodes.map((n) => (n.id === dragId ? { ...n, parent_id: newParentId } : n))
    );
    setCollapsed((c) => ({ ...c, [newParentId]: false }));
    toast.success(`Moved "${byId[dragId]?.name}" under "${byId[newParentId]?.name}"`);
  };

  // ── Save / discard structure ──
  const saveTree = async () => {
    if (!tree) return;
    setSavingTree(true);
    try {
      await axios.put(
        `${API}/admin/reference-tree`,
        {
          version: tree.version || 2,
          root_id: tree.root_id,
          nodes: tree.nodes.map((n) => ({
            id: n.id,
            name: n.name,
            name_hi: n.name_hi || "",
            parent_id: n.parent_id || null,
          })),
        },
        { headers: authHeaders() }
      );
      toast.success("Family tree saved");
      await fetchTree();
      await fetchPersons();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save tree");
    } finally {
      setSavingTree(false);
    }
  };

  const discardChanges = () => {
    if (!isDirty) return;
    if (!window.confirm("Discard all unsaved changes to the family tree?")) return;
    setTree(serverTree);
    toast.success("Changes discarded");
  };

  // ── Per-node (rank) ──
  const selectedPerson = selectedId ? personById[selectedId] : null;
  const selectedNode = selectedId ? byId[selectedId] : null;
  const isSelectedNew = selectedId ? !personById[selectedId] : false;

  const updatePerson = async (id, patch) => {
    setSavingPerson(true);
    try {
      await axios.put(
        `${API}/admin/reference-persons/${id}`,
        patch,
        { headers: authHeaders() }
      );
      await fetchPersons();
    } catch (e) {
      if (e.response?.status !== 403) {
        toast.error(e.response?.data?.detail || "Failed to update");
      }
    } finally {
      setSavingPerson(false);
    }
  };

  const onChangeRank = async (val) => {
    if (!selectedPerson) return;
    const rank = parseInt(val, 10);
    if (Number.isNaN(rank)) {
      toast.error("Rank must be a number");
      return;
    }
    if (rank === (selectedPerson.rank ?? 100)) return;
    await updatePerson(selectedPerson.id, { rank });
  };

  // ── Filter logic ──
  const filterMatches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q || !tree) return null;
    const ids = new Set();
    for (const n of tree.nodes) {
      if (
        (n.name || "").toLowerCase().includes(q) ||
        (n.name_hi || "").toLowerCase().includes(q)
      ) {
        // Add the node and all its ancestors (so the path stays visible)
        ids.add(n.id);
        let cur = n;
        while (cur && cur.parent_id) {
          ids.add(cur.parent_id);
          cur = byId[cur.parent_id];
        }
      }
    }
    return ids;
  }, [filter, tree, byId]);

  // ── Render helpers ──
  const renderRow = (node, depth) => {
    const children = childrenOf[node.id] || [];
    const isOpen = collapsed[node.id] !== true;
    const isRoot = node.id === tree.root_id;
    const isSelected = selectedId === node.id;
    const isDragOver = dragOverId === node.id;
    const isHidden = filterMatches && !filterMatches.has(node.id);
    if (isHidden) return null;

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center gap-1.5 py-1.5 pr-2 rounded-lg border transition-all ${
            isSelected
              ? "border-[#D4AF37] bg-[#FFF8E6]"
              : isDragOver
              ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300/40"
              : "border-transparent hover:bg-[#F8F1E5]/60"
          }`}
          style={{ paddingLeft: 8 + depth * 18 }}
          draggable={isSuper && !isRoot}
          onDragStart={(e) => {
            if (!isSuper || isRoot) return;
            dragIdRef.current = node.id;
            e.dataTransfer.effectAllowed = "move";
            try { e.dataTransfer.setData("text/plain", node.id); } catch (_) { /* noop */ }
          }}
          onDragOver={(e) => {
            if (!isSuper) return;
            const dragId = dragIdRef.current;
            if (!dragId || dragId === node.id) return;
            if (descendantSets[dragId]?.has(node.id)) return; // not droppable
            if (byId[dragId]?.parent_id === node.id) return; // already child
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverId !== node.id) setDragOverId(node.id);
          }}
          onDragLeave={() => {
            if (dragOverId === node.id) setDragOverId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dragId = dragIdRef.current;
            setDragOverId(null);
            dragIdRef.current = null;
            reparent(dragId, node.id);
          }}
          onClick={() => setSelectedId(node.id)}
          data-testid={`tree-row-${node.id}`}
        >
          {/* Drag handle */}
          {isSuper && !isRoot ? (
            <span
              className="cursor-grab active:cursor-grabbing text-[#0B1C3D]/30 hover:text-[#0B1C3D]/70 shrink-0"
              title="Drag to re-parent"
            >
              <GripVertical size={14} />
            </span>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}

          {/* Expand toggle */}
          {children.length > 0 ? (
            <button
              type="button"
              className="text-[#0B1C3D]/50 hover:text-[#0B1C3D] shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((c) => ({ ...c, [node.id]: !isOpen ? false : true }));
              }}
              data-testid={`tree-toggle-${node.id}`}
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}

          {/* Name (inline editable) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {isRoot && (
                <span className="text-[9px] uppercase tracking-wider font-bold text-[#D4AF37] bg-[#0B1C3D] px-1.5 py-0.5 rounded">
                  Root
                </span>
              )}
              <input
                value={node.name}
                onChange={(e) => renameNode(node.id, "name", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => setSelectedId(node.id)}
                disabled={!isSuper}
                placeholder="Name (English)"
                className="flex-1 min-w-0 bg-transparent border-0 border-b border-transparent focus:border-[#D4AF37] focus:outline-none text-sm font-semibold text-[#0B1C3D] py-0.5"
                data-testid={`tree-name-${node.id}`}
              />
              <input
                value={node.name_hi || ""}
                onChange={(e) => renameNode(node.id, "name_hi", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => setSelectedId(node.id)}
                disabled={!isSuper}
                placeholder="नाम (हिंदी)"
                className="w-32 sm:w-40 bg-transparent border-0 border-b border-transparent focus:border-[#D4AF37] focus:outline-none text-xs text-[#0B1C3D]/70 py-0.5"
                data-testid={`tree-name-hi-${node.id}`}
              />
              <span className="text-[10px] text-[#0B1C3D]/40 shrink-0 hidden sm:inline">
                {children.length > 0 ? `${children.length} child${children.length === 1 ? "" : "ren"}` : "leaf"}
              </span>
            </div>
          </div>

          {/* Actions */}
          {isSuper && (
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  addChild(node.id);
                }}
                title="Add child"
                data-testid={`tree-add-${node.id}`}
              >
                <Plus size={12} />
              </Button>
              {!isRoot && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSubtree(node.id);
                  }}
                  title="Delete (subtree)"
                  data-testid={`tree-delete-${node.id}`}
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Children */}
        {isOpen && children.length > 0 && (
          <div>
            {children.map((c) => renderRow(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6" data-testid="reference-person-manager">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Users className="text-[#B8860B]" size={22} />
        <h2
          className="text-2xl font-bold text-[#0B1C3D]"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Reference Management
        </h2>
      </div>
      <p className="text-xs text-[#0B1C3D]/55 mb-4 max-w-3xl">
        Single source-of-truth editor for the family reference tree shown to registrants.
        Drag any node onto another to re-parent it. Click a node to edit its display rank.
      </p>

      {!isSuper && (
        <p
          className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          data-testid="ref-watcher-banner"
        >
          View-only — only super admin can edit the family tree.
        </p>
      )}

      {/* Layout: tree on left, detail panel on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Family Tree editor ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#D4AF37]/20 shadow-sm">
          {/* Tree toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[#D4AF37]/15">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0B1C3D]/40" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search node by name…"
                className="pl-8 h-9 text-sm bg-white border-[#D4AF37]/20"
                data-testid="tree-filter-input"
              />
            </div>
            {isSuper && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={discardChanges}
                  disabled={!isDirty || savingTree}
                  className="h-9 border-[#D4AF37]/30"
                  data-testid="tree-discard-btn"
                >
                  <RotateCcw size={13} className="mr-1" /> Discard
                </Button>
                <Button
                  size="sm"
                  onClick={saveTree}
                  disabled={!isDirty || savingTree}
                  className="h-9 bg-[#0B1C3D] text-white hover:bg-[#163161] disabled:opacity-50"
                  data-testid="tree-save-btn"
                >
                  <Save size={13} className="mr-1" />
                  {savingTree ? "Saving…" : isDirty ? "Save Tree" : "All Saved"}
                </Button>
              </>
            )}
          </div>

          {isDirty && (
            <div className="px-3 py-2 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-200 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Unsaved structural changes — click <b>Save Tree</b> to publish them to the registration form.
            </div>
          )}

          {/* Tree body */}
          <div className="p-2 max-h-[640px] overflow-auto" data-testid="tree-body">
            {loadingTree ? (
              <p className="text-[#0B1C3D]/40 text-sm py-10 text-center">Loading family tree…</p>
            ) : !tree ? (
              <p className="text-red-500 text-sm py-10 text-center">Could not load tree</p>
            ) : (
              <div className="space-y-0.5">{renderRow(byId[tree.root_id], 0)}</div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-[#D4AF37]/15 text-[11px] text-[#0B1C3D]/50 leading-snug">
            <span className="inline-flex items-center gap-1">
              <GripVertical size={11} className="text-[#0B1C3D]/40" /> Drag a row onto another to re-parent.
            </span>
            <span className="mx-2">•</span>
            Click <Plus size={11} className="inline -mt-0.5" /> to add a child.
            <span className="mx-2">•</span>
            Click <Trash2 size={11} className="inline -mt-0.5" /> to remove a subtree.
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 shadow-sm p-4 lg:sticky lg:top-4 lg:self-start max-h-[calc(100vh-2rem)] overflow-auto">
          <h3 className="text-sm font-bold text-[#0B1C3D] mb-3 flex items-center gap-1.5">
            <Edit2 size={14} className="text-[#B8860B]" /> Selected node
          </h3>

          {!selectedNode ? (
            <p className="text-xs text-[#0B1C3D]/45 italic py-6 text-center">
              Click any node on the left to edit its rank and relation categories.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#D4AF37]/20 bg-[#F8F1E5]/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#0B1C3D]/50 mb-1">Name</p>
                <p className="text-base font-bold text-[#0B1C3D]" data-testid="detail-name">
                  {selectedNode.name}
                </p>
                {selectedNode.name_hi && (
                  <p className="text-sm text-[#0B1C3D]/65 mt-0.5">{selectedNode.name_hi}</p>
                )}
                <p className="text-[10px] text-[#0B1C3D]/40 mt-2 break-all">id: {selectedNode.id}</p>
              </div>

              {isSelectedNew && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 flex gap-1.5">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  <span>
                    This node is new and not saved yet. Click <b>Save Tree</b> first to enable
                    rank editing.
                  </span>
                </div>
              )}

              {/* Rank */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-xs flex items-center gap-1">
                  <Hash size={11} /> Rank{" "}
                  <span className="text-[#0B1C3D]/40 font-normal">(lower = appears higher)</span>
                </Label>
                <Input
                  key={`rank-${selectedNode.id}-${selectedPerson?.rank ?? ""}`}
                  type="number"
                  defaultValue={selectedPerson?.rank ?? 100}
                  onBlur={(e) => onChangeRank(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.target.blur();
                    }
                  }}
                  disabled={!isSuper || isSelectedNew || savingPerson}
                  className="mt-1 h-8 text-sm bg-white border-[#D4AF37]/30"
                  data-testid="detail-rank-input"
                />
              </div>

              {/* Quick actions */}
              {isSuper && selectedNode.id !== tree?.root_id && (
                <div className="border-t border-[#D4AF37]/15 pt-3 flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#D4AF37]/30 justify-start"
                    onClick={() => addChild(selectedNode.id)}
                    data-testid="detail-add-child-btn"
                  >
                    <Plus size={13} className="mr-1.5" /> Add child under this node
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 justify-start"
                    onClick={() => deleteSubtree(selectedNode.id)}
                    data-testid="detail-delete-btn"
                  >
                    <Trash2 size={13} className="mr-1.5" /> Delete this subtree
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
