import React, { useState } from "react";
import { Headphones, GitBranch, LayoutGrid } from "lucide-react";
import HelpCategoryManager from "./HelpCategoryManager";
import WAFlowSettings from "./WAFlowSettings";
import ViewOnly from "./ViewOnly";

/**
 * HelpCentreSettings (non-super only)
 * Bifurcated view-only tab that shows:
 *  - Services / SLA (HelpCategoryManager)
 *  - WA Flow Settings (WAFlowSettings)
 * Both rendered strictly in view-only mode — editing is disabled via the
 * <ViewOnly> wrapper + each child's `isSuper={false}` prop.
 */
export default function HelpCentreSettings() {
  const [tab, setTab] = useState("categories");

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="help-centre-settings">
      <div className="flex items-center gap-2">
        <Headphones className="text-[#B8860B]" size={24} />
        <h1 className="text-xl font-bold text-[#0B1C3D]">Help Centre Settings</h1>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit" data-testid="hcs-subtabs">
        <button
          onClick={() => setTab("categories")}
          data-testid="hcs-tab-categories"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
            tab === "categories" ? "bg-white shadow text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <LayoutGrid size={14} /> Services / SLA
        </button>
        <button
          onClick={() => setTab("flow")}
          data-testid="hcs-tab-flow"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
            tab === "flow" ? "bg-white shadow text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <GitBranch size={14} /> WA Flow Settings
        </button>
      </div>

      <ViewOnly active={true}>
        {tab === "categories" ? (
          <HelpCategoryManager isSuper={false} />
        ) : (
          <WAFlowSettings isSuper={false} />
        )}
      </ViewOnly>
    </div>
  );
}
