import React, { useState, useEffect, useRef } from "react";
import {
  Truck,
  MapPin,
  Search,
  CalendarDays,
  Zap,
  Clock,
  Droplets,
  ChevronDown,
} from "lucide-react";
import { COMMON_PORTS } from "./constants/ports";

// === CONFIGURATION ===
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3001"
    : "https://searate-explorer-production.up.railway.app");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = "v4";

// Parse COMMON_PORTS to { id, name, country }
const portsOptions = COMMON_PORTS.map((p) => {
  const [name, country] = p.label.split(", ");
  return { id: p.id, name: name || p.label, country: country || "" };
});

const containerTypes = [
  { id: "ST20", name: "20' Standard Container" },
  { id: "ST40", name: "40' Standard Container" },
  { id: "HC40", name: "40' High Cube Container" },
];

function getCacheKey(from, to, container) {
  return `searates_${CACHE_VERSION}_${from}_${to}_${container}`;
}

function getCachedRates(from, to, container) {
  const key = getCacheKey(from, to, container);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < CACHE_TTL_MS) return data;
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function setCachedRates(from, to, container, data) {
  const key = getCacheKey(from, to, container);
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(dateStr);
  }
}

// Custom Dropdown Component
function CustomDropdown({
  options,
  value,
  onChange,
  getOptionLabel,
  label,
  disabled,
  placeholder = "Select...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.id === value);
  const displayValue = selectedOption
    ? getOptionLabel(selectedOption)
    : placeholder;

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-2xl px-4 py-3.5 bg-white text-left text-lg font-semibold text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span>{displayValue}</span>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-base font-medium transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-700 hover:bg-orange-50 hover:text-orange-500"
                }`}
              >
                {getOptionLabel(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function App() {
  const [fromPort, setFromPort] = useState(portsOptions[0].id); // Haiphong
  const [toPort, setToPort] = useState("P_15786"); // Los Angeles, US
  const [containerType, setContainerType] = useState("ST20");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGetRates = async (skipCache = false) => {
    setLoading(true);
    setError(null);
    setData(null);

    if (!skipCache) {
      const cached = getCachedRates(fromPort, toPort, containerType);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/rates?from=${encodeURIComponent(fromPort)}&to=${encodeURIComponent(toPort)}`
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || "Server error");

      setCachedRates(fromPort, toPort, containerType, result);
      setData(result);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    localStorage.clear();
    handleGetRates(true);
  };

  const rawRates = data?.data?.rates;
  const ratesList = Array.isArray(rawRates) ? rawRates : rawRates ? [rawRates] : [];

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans antialiased">
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-8 w-8 text-orange-500" />
            <h1 className="text-3xl font-extrabold tracking-tighter text-orange-600">
              Logistics Explorer
            </h1>
          </div>
        </nav>
      </header>

      {/* --- MAIN SECTION --- */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 w-full">
        {/* --- SEARCH BAR (Booking Style) --- */}
        <section className="bg-white border border-slate-100 shadow-xl rounded-3xl p-6 md:p-8 mt-6">
          {/* Top row: From and To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
              <CustomDropdown
                options={portsOptions}
                value={fromPort}
                onChange={setFromPort}
                getOptionLabel={(o) => `${o.name}, ${o.country}`}
                label="From"
                disabled={loading}
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
              <CustomDropdown
                options={portsOptions}
                value={toPort}
                onChange={setToPort}
                getOptionLabel={(o) => `${o.name}, ${o.country}`}
                label="To"
                disabled={loading}
              />
            </div>
          </div>

          {/* Bottom row: Equipment and Search Button */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-end">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-slate-400 shrink-0" />
              <CustomDropdown
                options={containerTypes}
                value={containerType}
                onChange={setContainerType}
                getOptionLabel={(o) => o.name}
                label="Equipment"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => handleGetRates()}
              disabled={loading || fromPort === toPort}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl px-6 py-4 flex items-center justify-center gap-2.5 text-xl shadow-lg transition-all min-h-[56px]"
            >
              {loading ? (
                <Zap className="h-6 w-6 animate-spin" />
              ) : (
                <Search className="h-6 w-6" />
              )}
              {loading ? "Searching..." : "Search Rates"}
            </button>
          </div>

          <div className="text-center mt-5">
            <span
              onClick={clearCache}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition"
            >
              Clear Cache &amp; Refresh
            </span>
          </div>
        </section>

        {/* --- RESULTS AREA --- */}
        <section className="mt-12 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
              <p className="font-semibold text-lg">Error!</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {data &&
            ratesList.map((rate, index) => (
              <RateCard key={index} rate={rate} containerType={containerType} />
            ))}

          {data && ratesList.length === 0 && (
            <div className="bg-slate-100 border border-slate-200 text-slate-600 p-10 rounded-2xl text-center">
              <p className="font-semibold text-xl">No Rates Found</p>
              <p className="text-sm">Try changing your origin or destination ports.</p>
            </div>
          )}
        </section>

        <p className="mt-12 text-center text-xs text-slate-500">
          Data provided by SeaRates API. Trial limited to 50 requests.
        </p>
      </main>
    </div>
  );
}

function RateCard({ rate, containerType }) {
  const [showDetails, setShowDetails] = useState(false);

  const allRouteTariffs = rate?.points?.flatMap((p) => p?.routeTariff || []) || [];
  const allPointTariffs = rate?.points?.flatMap((p) => p?.pointTariff || []) || [];
  const carrier =
    rate?.points?.find((p) => p?.provider)?.provider || "STANDARD OCEAN FREIGHT";
  const transitTime =
    rate?.general?.totalTransitTime ??
    rate?.points?.find((p) => p?.transitTime)?.transitTime?.route ??
    "N/A";
  const origin = rate?.points?.[0]?.location?.name ?? "Origin";
  const destination =
    rate?.points?.[rate?.points?.length - 1]?.location?.name ?? "Destination";
  const currency = rate?.general?.totalCurrency ?? "USD";
  const totalPrice = rate?.general?.totalPrice;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Main Card Header */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Left Side: Carrier & Route */}
        <div className="flex-1 space-y-3">
          <span className="inline-block bg-orange-50 text-orange-600 text-xs font-bold uppercase px-3 py-1 rounded-full tracking-wider">
            {carrier}
          </span>
          <div className="text-3xl font-bold text-slate-900 flex items-center gap-3 flex-wrap">
            {origin}
            <span className="text-slate-300">➔</span>
            {destination}
          </div>
          <div className="flex items-center gap-6 text-slate-500 text-sm flex-wrap">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Transit:{" "}
              <strong>{transitTime} days</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Valid to:{" "}
              {formatDate(rate?.general?.validityTo)}
            </span>
          </div>
        </div>

        {/* Right Side: Price & Toggle */}
        <div className="flex flex-col items-end gap-3 md:text-right">
          <div className="text-slate-500 text-sm">
            Total Price ({containerType || "ST20"})
          </div>
          <div className="text-5xl font-black text-emerald-600 tracking-tighter">
            {totalPrice != null
              ? `${currency} ${totalPrice.toLocaleString()}`
              : "N/A"}
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition"
          >
            {showDetails ? "Hide Details" : "View Breakdown ▼"}
          </button>
        </div>
      </div>

      {/* Details Breakdown Section (Conditional Render) */}
      {showDetails && (
        <div className="border-t border-slate-100 bg-slate-50 p-6 md:p-8 space-y-6 text-sm">
          <div className="flex items-center gap-6 text-slate-600 flex-wrap">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />{" "}
              <strong>Distance:</strong> {rate?.points?.[0]?.distance ?? "—"} KM
            </span>
            <span className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4" />{" "}
              <strong>CO2 Emission:</strong>{" "}
              {rate?.points?.[0]?.co2?.amount ?? "—"} kg
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                Ocean Freight / Route Charges
              </h4>
              {allRouteTariffs.length > 0 ? (
                allRouteTariffs.map((t, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-slate-900"
                  >
                    <span className="text-slate-600">
                      {t?.name || t?.abbr || "Ocean Freight"}
                    </span>
                    <span className="font-semibold">
                      {t?.currency ?? currency}{" "}
                      {t?.price != null ? t.price.toLocaleString() : "—"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400">Not provided.</div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                Port &amp; Local Charges
              </h4>
              {allPointTariffs.length > 0 ? (
                allPointTariffs.map((t, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-slate-900"
                  >
                    <span className="text-slate-600">
                      {t?.name || t?.abbr || "Local Charge"}
                    </span>
                    <span className="font-semibold">
                      {t?.currency ?? currency}{" "}
                      {t?.price != null ? t.price.toLocaleString() : "—"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400">Not provided.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
