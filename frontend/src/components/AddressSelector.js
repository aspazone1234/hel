/**
 * AddressSelector — standardized Country → State → City autocomplete.
 * - Country and State must be selected from the valid list (no custom entry)
 * - City allows custom input if not found in list
 * - Pin Code assistive lookup: fills State/City when possible
 * - Uses dependency order: Country → State → City
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Country, State, City } from "country-state-city";
import { ChevronDown, Search, X } from "lucide-react";

function Combobox({ id, label, value, onChange, options, placeholder, disabled, error, allowCustom = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 20);

  const select = (val) => {
    onChange(val);
    setQuery("");
    setOpen(false);
  };

  const clear = () => { onChange(""); setQuery(""); };

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <div
        onClick={() => { if (!disabled) { setOpen(true); setQuery(value || ""); } }}
        className={`flex items-center border rounded-lg px-3 py-2 cursor-text bg-white ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-amber-400"} ${error ? "border-red-400" : "border-gray-300"} ${open ? "border-amber-500 ring-1 ring-amber-300" : ""}`}
        data-testid={`addr-${id}`}
      >
        {open ? (
          <input
            autoFocus
            className="flex-1 outline-none text-sm bg-transparent"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) { select(filtered[0]); }
              else if (e.key === "Enter" && allowCustom && query.trim()) { select(query.trim()); }
              else if (e.key === "Escape") { setOpen(false); setQuery(""); }
            }}
          />
        ) : (
          <span className={`flex-1 text-sm ${value ? "text-gray-900" : "text-gray-400"}`}>
            {value || placeholder}
          </span>
        )}
        {value && !open && (
          <button type="button" onClick={(e) => { e.stopPropagation(); clear(); }} className="text-gray-400 hover:text-gray-600 ml-1">
            <X size={12} />
          </button>
        )}
        {!value && <ChevronDown size={14} className="text-gray-400 ml-1 shrink-0" />}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            allowCustom && query.trim() ? (
              <button type="button" onClick={() => select(query.trim())}
                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-gray-700">
                Use "{query.trim()}"
              </button>
            ) : (
              <p className="px-3 py-2 text-sm text-gray-400">No results</p>
            )
          ) : (
            filtered.map(o => (
              <button type="button" key={o} onClick={() => select(o)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 ${value === o ? "bg-amber-50 font-medium text-amber-700" : "text-gray-700"}`}>
                {o}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

export default function AddressSelector({ value = {}, onChange, errors = {} }) {
  // value: { country, state, city, pin_code, full_address }
  const [countryList] = useState(() => Country.getAllCountries().map(c => c.name));
  const [stateList, setStateList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [pinLoading, setPinLoading] = useState(false);

  // Recompute state list when country changes
  useEffect(() => {
    if (!value.country) { setStateList([]); return; }
    const c = Country.getAllCountries().find(c => c.name === value.country);
    if (c) setStateList(State.getStatesOfCountry(c.isoCode).map(s => s.name));
    else setStateList([]);
  }, [value.country]);

  // Recompute city list when state changes
  useEffect(() => {
    if (!value.country || !value.state) { setCityList([]); return; }
    const c = Country.getAllCountries().find(c => c.name === value.country);
    const s = c ? State.getStatesOfCountry(c.isoCode).find(s => s.name === value.state) : null;
    if (c && s) setCityList(City.getCitiesOfState(c.isoCode, s.isoCode).map(ci => ci.name));
    else setCityList([]);
  }, [value.country, value.state]);

  const set = useCallback((field, val) => {
    if (field === "country") {
      onChange({ ...value, country: val, state: "", city: "" });
    } else if (field === "state") {
      if (!value.country) { alert("Please select the country first"); return; }
      onChange({ ...value, state: val, city: "" });
    } else if (field === "city") {
      if (!value.country) { alert("Please select the country first"); return; }
      if (!value.state) { alert("Please select the state first"); return; }
      onChange({ ...value, city: val });
    } else {
      onChange({ ...value, [field]: val });
    }
  }, [value, onChange]);

  // Pin code lookup for India
  const lookupPin = useCallback(async (pin) => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) return;
    setPinLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const postOffice = data[0].PostOffice?.[0];
        if (postOffice) {
          const state = postOffice.State;
          const city = postOffice.District;
          onChange({ ...value, pin_code: pin, state: state || value.state, city: city || value.city, country: value.country || "India" });
        }
      }
    } catch {}
    setPinLoading(false);
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      <Combobox id="country" label="Country" value={value.country || ""} onChange={v => set("country", v)}
        options={countryList} placeholder="Select country" error={errors.country} />
      <Combobox id="state" label="State / Province" value={value.state || ""} onChange={v => set("state", v)}
        options={stateList} placeholder={value.country ? "Select state" : "Select country first"}
        disabled={!value.country} error={errors.state} />
      <Combobox id="city" label="City" value={value.city || ""} onChange={v => set("city", v)}
        options={cityList} placeholder={value.state ? "Select or type city" : "Select state first"}
        disabled={!value.state} allowCustom={true} error={errors.city} />
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Pin Code {pinLoading && <span className="text-xs text-amber-600 ml-1">Looking up...</span>}</label>
        <input
          className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.pin_code ? "border-red-400" : "border-gray-300 hover:border-amber-400"}`}
          placeholder="6-digit pin / zip code"
          value={value.pin_code || ""}
          onChange={(e) => { set("pin_code", e.target.value); if (value.country === "India" || !value.country) lookupPin(e.target.value); }}
          data-testid="addr-pin_code"
        />
        {errors.pin_code && <p className="text-xs text-red-500 mt-0.5">{errors.pin_code}</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Full Address (Street, Locality)</label>
        <textarea
          className={`w-full border rounded-lg px-3 py-2 text-sm resize-none ${errors.full_address ? "border-red-400" : "border-gray-300 hover:border-amber-400"}`}
          placeholder="House no, street, locality..."
          rows={2}
          value={value.full_address || ""}
          onChange={(e) => set("full_address", e.target.value)}
          data-testid="addr-full_address"
        />
        {errors.full_address && <p className="text-xs text-red-500 mt-0.5">{errors.full_address}</p>}
      </div>
    </div>
  );
}
