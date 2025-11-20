import React, { useMemo, useRef, useState } from "react";

type Incident = Record<string, any>;

type ReportGeneratorProps = {
  selectedIncidents: Incident[];
  className?: string;
};

// --- Utility helpers ---
const str = (v: any): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const getFromKeys = (row: Incident, keys: string[]): string | null => {
  for (const k of keys) {
    if (k in row) {
      const val = str(row[k]);
      if (val) return val;
    }
    const target = k.toLowerCase().replace(/\s+/g, "");
    for (const rk of Object.keys(row)) {
      const norm = rk.toLowerCase().replace(/\s+/g, "");
      if (norm === target) {
        const val = str(row[rk]);
        if (val) return val;
      }
    }
  }
  return null;
};

const getAreaFromIncident = (i: Incident): string | null =>
  getFromKeys(i, [
    "Area",
    "Area Name",
    "Area ",
    "AreaName",
    "Site/Location",
    "Location",
    "Site",
    "Zone",
    "Subarea",
    "Section",
  ]);

const getSiteFromIncident = (i: Incident): string | null =>
  getFromKeys(i, ["Site", "Project", "Project Name", "Site Name", "Location"]) || getAreaFromIncident(i);

const getCameraFromIncident = (i: Incident): string =>
  getFromKeys(i, ["Camera", "Camera Name", "camera", "cameraName", "Cam"]) || "Unknown";

const getTypeFromIncident = (i: Incident): string =>
  getFromKeys(i, ["Type", "Scenario", "Category", "Incident Type"]) || "Unknown";

const getDateFromIncident = (i: Incident): string | null =>
  getFromKeys(i, ["Date", "date", "Timestamp", "Time", "Created At"]);

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  for (const k of items) {
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
};

const sortEntriesDesc = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
    {children}
  </span>
);

// --- MAIN COMPONENT ---
export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ selectedIncidents, className }) => {
  const [open, setOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const {
    total,
    areasList,
    areasCountSorted,
    topArea,
    camerasCountSorted,
    topCamera,
    typesCountSorted,
    topType,
    sitesCount,
    byDayCountSorted,
  } = useMemo(() => {
    const total = selectedIncidents?.length || 0;

    const areas = selectedIncidents.map(getAreaFromIncident).filter(Boolean) as string[];
    const areasList = unique(areas);
    const areasCount = countBy(areas);
    const areasCountSorted = sortEntriesDesc(areasCount);
    const topArea = areasCountSorted[0];

    const cameras = selectedIncidents.map(getCameraFromIncident);
    const camerasCount = countBy(cameras);
    const camerasCountSorted = sortEntriesDesc(camerasCount);
    const topCamera = camerasCountSorted[0];

    const types = selectedIncidents.map(getTypeFromIncident);
    const typesCount = countBy(types);
    const typesCountSorted = sortEntriesDesc(typesCount);
    const topType = typesCountSorted[0];

    const sites = selectedIncidents.map(getSiteFromIncident).filter(Boolean) as string[];
    const sitesCount = unique(sites).length;

    const byDay = selectedIncidents
      .map(getDateFromIncident)
      .filter(Boolean)
      .map((d) => {
        const dt = new Date(d as string);
        if (isNaN(dt.getTime())) return d as string;
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }) as string[];

    const byDayCount = countBy(byDay);
    const byDayCountSorted = sortEntriesDesc(byDayCount);

    return {
      total,
      areasList,
      areasCountSorted,
      topArea,
      camerasCountSorted,
      topCamera,
      typesCountSorted,
      topType,
      sitesCount,
      byDayCountSorted,
    };
  }, [selectedIncidents]);

  const generatedOn = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  return (
    <div className={className}>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold hover:bg-emerald-700 transition"
      >
        Generate Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-6">
          <div ref={reportRef} className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="p-6 border-b border-gray-100 bg-emerald-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-emerald-900">Buddywise — Weekly Safety Report</h1>
                  <p className="text-sm text-emerald-800 mt-1">Generated: {generatedOn}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-emerald-600 leading-none">{total}</div>
                  <div className="text-sm text-emerald-800">Total Observations</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>Areas Covered: {areasList.length ? ` ${areasList.length}` : " N/A"}</Pill>
                <Pill>Sites Affected: {sitesCount}</Pill>
                <Pill>Top Area: {topArea ? ` ${topArea[0]} (${topArea[1]})` : " N/A"}</Pill>
                <Pill>Top Camera: {topCamera ? ` ${topCamera[0]} (${topCamera[1]})` : " N/A"}</Pill>
                <Pill>Top Incident Type: {topType ? ` ${topType[0]} (${topType[1]})` : " N/A"}</Pill>
              </div>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-10">
              <section>
                <h2 className="text-xl font-semibold text-gray-900">Section 1 — PPE &amp; Safety Gear</h2>
                <p className="text-sm text-gray-600 mt-1">Summary of observations by area, camera, and type.</p>

                {/* AREAS */}
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-800">Areas Covered</h3>
                  {areasList.length ? (
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {areasList.map((a) => {
                        const count = areasCountSorted.find((x) => x[0] === a)?.[1] || 0;
                        return (
                          <li
                            key={a}
                            className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800 flex items-center justify-between"
                          >
                            <span>{a}</span>
                            <span className="text-gray-500">{count}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">N/A</div>
                  )}
                </div>

                {/* CAMERAS */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800">Observations per Camera</h3>
                  {camerasCountSorted.length ? (
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {camerasCountSorted.map(([name, count]) => (
                        <li
                          key={name}
                          className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800 flex items-center justify-between"
                        >
                          <span>{name}</span>
                          <span className="text-gray-500">{count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">N/A</div>
                  )}
                </div>

                {/* TYPES */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800">Observations by Type</h3>
                  {typesCountSorted.length ? (
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {typesCountSorted.map(([name, count]) => (
                        <li
                          key={name}
                          className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800 flex items-center justify-between"
                        >
                          <span>{name}</span>
                          <span className="text-gray-500">{count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">N/A</div>
                  )}
                </div>

                {/* DAYS */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800">Observations per Day</h3>
                  {byDayCountSorted.length ? (
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {byDayCountSorted.map(([day, count]) => (
                        <li
                          key={day}
                          className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800 flex items-center justify-between"
                        >
                          <span>{day}</span>
                          <span className="text-gray-500">{count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">N/A</div>
                  )}
                </div>
              </section>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between rounded-b-2xl">
              <div className="text-xs text-gray-500">Buddywise Safety Report • {generatedOn}</div>
              <button
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
