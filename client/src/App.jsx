import { useState } from "react";
import { COMMON_PORTS } from "./constants/ports";

const API_BASE = "http://localhost:3001";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = "v3"; // Bump to invalidate old cached payloads

function getCacheKey(from, to) {
  return `searates_${CACHE_VERSION}_${from}_${to}`;
}

function getCachedRates(from, to) {
  const key = getCacheKey(from, to);
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

function setCachedRates(from, to, data) {
  const key = getCacheKey(from, to);
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

function RateCard({ rate }) {
  console.log("Raw Rate Data:", rate);

  const provider =
    rate?.points?.find((p) => p?.provider)?.provider || "STANDARD CARRIER";
  const origin = rate?.points?.[0]?.location?.name ?? "Unknown";
  const destination =
    rate?.points?.[rate?.points?.length - 1]?.location?.name ?? "Unknown";
  const transitTime =
    rate?.general?.totalTransitTime ??
    rate?.points?.find((p) => p?.transitTime)?.transitTime?.route ??
    "N/A";
  const validityFrom = rate?.general?.validityFrom;
  const validityTo = rate?.general?.validityTo;
  const price = rate?.general?.totalPrice;
  const currency = rate?.general?.totalCurrency ?? "USD";

  const allRouteTariffs =
    rate?.points?.flatMap((p) => p?.routeTariff || []) || [];
  const allPointTariffs =
    rate?.points?.flatMap((p) => p?.pointTariff || []) || [];

  const distance =
    rate?.points?.find((p) => p?.distance != null)?.distance ?? "N/A";
  const co2Amount =
    rate?.points?.find((p) => p?.co2?.amount != null)?.co2?.amount ?? "N/A";

  const validityFromStr = formatDate(validityFrom) || "N/A";
  const validityToStr = formatDate(validityTo) || "N/A";

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <span className="rounded px-2 py-1 text-xs font-bold uppercase bg-indigo-50 text-indigo-700">
          {provider}
        </span>
        <span className="text-xs text-gray-400">
          Valid: {validityFromStr} to {validityToStr}
        </span>
      </div>

      {/* Main Row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <span>{origin}</span>
            <svg
              className="h-5 w-5 shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
            <span>{destination}</span>
          </div>
          {transitTime != null && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <span>⏱</span> Estimated Transit: {transitTime} days
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-600">
            {price != null ? `${price.toLocaleString()} ${currency}` : "—"}
          </div>
        </div>
      </div>

      {/* Footer Row */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <span className="text-sm font-medium text-gray-500">
          Service: FCL - 20&apos; Standard Container
        </span>
      </div>

      {/* Price Breakdown */}
      <div className="mt-4 border-t border-slate-100 bg-slate-50 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span>📏</span> Distance: {distance}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span>🌱</span> CO2 Emission: {co2Amount}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 font-medium text-slate-700">Ocean Freight</div>
            {Array.isArray(allRouteTariffs) && allRouteTariffs.length > 0 ? (
              <div className="flex flex-col gap-1">
                {allRouteTariffs.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-slate-600"
                  >
                    <span>{item?.name ?? item?.abbr ?? "—"}</span>
                    <span>
                      {item?.price != null
                        ? `${Number(item.price).toLocaleString()} ${item?.currency ?? currency}`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          <div>
            <div className="mb-2 font-medium text-slate-700">Port Charges</div>
            {Array.isArray(allPointTariffs) && allPointTariffs.length > 0 ? (
              <div className="flex flex-col gap-1">
                {allPointTariffs.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-slate-600"
                  >
                    <span>{item?.name ?? item?.abbr ?? "—"}</span>
                    <span>
                      {item?.price != null
                        ? `${Number(item.price).toLocaleString()} ${item?.currency ?? currency}`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [from, setFrom] = useState(COMMON_PORTS[0].id);
  const [to, setTo] = useState(COMMON_PORTS[1].id);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGetRates = async (skipCache = false) => {
    setError(null);

    if (!skipCache) {
      const cached = getCachedRates(from, to);
      if (cached) {
        setRates(cached);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/rates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to fetch rates");
      }

      setCachedRates(from, to, data);
      setRates(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setRates(null);
    } finally {
      setLoading(false);
    }
  };

  const rawRates = rates?.data?.rates;
  const ratesList = Array.isArray(rawRates)
    ? rawRates
    : rawRates
      ? [rawRates]
      : [];
  const hasRates = ratesList.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-slate-800">
          SeaRates Logistics Explorer
        </h1>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-500">
              From Port
            </label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-slate-800 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {COMMON_PORTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-500">
              To Port
            </label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-slate-800 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {COMMON_PORTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGetRates()}
              disabled={loading || from === to}
              className="flex-1 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Fetching Rates..." : "Get Rates"}
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                handleGetRates(true);
              }}
              disabled={loading || from === to}
              className="text-sm text-slate-500 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear Cache &amp; Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {rates && !error && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Shipping Rates
            </h2>
            {hasRates ? (
              <div className="space-y-4">
                {ratesList.map((rate, idx) => (
                  <RateCard key={idx} rate={rate} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-100 bg-white px-6 py-8 text-center text-slate-500 shadow-sm">
                No rates found for this route.
              </div>
            )}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-slate-500">
          Data provided by SeaRates API. Trial limited to 50 requests.
        </p>
      </div>
    </div>
  );
}

export default App;
