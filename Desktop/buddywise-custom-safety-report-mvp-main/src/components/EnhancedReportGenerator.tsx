import { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Edit3,
  FileText,
  Download,
  BarChart3,
  Lightbulb,
  UserPlus,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Incident } from "@/types/incident";
import { useProcessedIncidents } from "@/hooks/useProcessedIncidents";
import { Upload, X } from "lucide-react";
import { compareWeekOverWeek } from "@/utils/weekComparison";

interface SectionImages {
  section1: { url: string; caption: string }[];
  section2: { url: string; caption: string }[];
  section3: { url: string; caption: string }[];
  overall: { url: string; caption: string }[];
}

/* ----------------------- CSV Header—Robust Helpers ----------------------- */

const str = (v: any): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const getFromKeys = (row: Record<string, any>, keys: string[]): string | null => {
  for (const k of keys) {
    if (k in row) {
      const v = str((row as any)[k]);
      if (v) return v;
    }
    const target = k.toLowerCase().replace(/\s+/g, "");
    for (const rk of Object.keys(row)) {
      const norm = rk.toLowerCase().replace(/\s+/g, "");
      if (norm === target) {
        const v = str((row as any)[rk]);
        if (v) return v;
      }
    }
  }
  return null;
};

const getArea = (i: Record<string, any>) =>
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

const getCamera = (i: Record<string, any>) => {
  const result = getFromKeys(i, [
    "Camera Name",
    "Camera Name ",
    "Camera",
    "cameraName",
    "camera",
    "Cam",
    "cam",
    "Device",
    "Device Name",
  ]);
  return result || null; // Return null instead of "Unknown" to detect missing data
};

const getScenario = (i: Record<string, any>) =>
  getFromKeys(i, ["Scenario", "Type", "Category", "Incident Type", "Event Type"]) || "Unknown";
// Treat more wording variants as "obstruction" so the section isn't empty
const isObstructionScenario = (s: string | null): boolean => {
  if (!s) return false;
  const t = s.toLowerCase();
  return (
    t.includes("obstruction") ||
    t.includes("obstructed") ||
    t.includes("blocked") ||
    t.includes("blockage") ||
    t.includes("pathway") ||
    t.includes("walkway") ||
    t.includes("aisle")
  );
};

const getFirstDetection = (i: Record<string, any>): Date | null => {
  const raw = getFromKeys(i, ["First Detection", "Created At", "Timestamp", "Time", "Detected At"]);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};
// --- 🔧 New helpers to fix missing charts and timestamps ---

const parseTimestamp = (raw: string | null): Date | null => {
  if (!raw) return null;

  // Try ISO or standard date formats
  const d1 = new Date(raw);
  if (!isNaN(d1.getTime())) return d1;

  // Try "DD/MM/YYYY" or "DD-MM-YYYY" (with or without time)
  const dm = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dm) {
    const dd = Number(dm[1]);
    const mm = Number(dm[2]) - 1;
    const yyyy = Number(dm[3].length === 2 ? "20" + dm[3] : dm[3]);
    const hh = Number(dm[4] ?? 0);
    const mi = Number(dm[5] ?? 0);
    const ss = Number(dm[6] ?? 0);
    const d = new Date(yyyy, mm, dd, hh, mi, ss);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

const getFirstDetectionSafe = (row: Record<string, any>): Date | null => {
  const raw = getFromKeys(row, ["First Detection", "Created At", "Timestamp", "Detected At", "Time"]);
  return parseTimestamp(raw);
};

const buildDailySeries = (rows: Record<string, any>[]) => {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = getFirstDetectionSafe(r);
    if (!d) continue;
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
};

// Normalize camera name for grouping (lowercase + trim)
const normalizeCameraName = (name: string): string => {
  return name.trim().toLowerCase();
};

const buildCameraBars = (rows: Record<string, any>[]) => {
  const counts = new Map<string, number>();
  const displayNames = new Map<string, string>(); // Keep original display name
  
  for (const r of rows) {
    const cam = getCamera(r);
    if (!cam || cam.toLowerCase() === "unknown") continue;
    
    const normalized = normalizeCameraName(cam);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    
    // Store the first occurrence's display name
    if (!displayNames.has(normalized)) {
      displayNames.set(normalized, cam);
    }
  }
  
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([normalized, observations]) => {
      const displayName = displayNames.get(normalized) || normalized;
      return {
        camera: displayName.length > 12 ? displayName.slice(0, 12) + "…" : displayName,
        observations,
      };
    });
};

/* ----------------------- Stats Builders ----------------------- */

type AreaStats = { list: string[]; top?: [string, number]; getCount: (n: string) => number };

const makeAreaStats = (rows: Record<string, any>[]): AreaStats => {
  const names = rows.map(getArea).filter(Boolean) as string[];
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) || 0) + 1);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const list = Array.from(new Set(names));
  return { list, top: sorted[0], getCount: (n) => counts.get(n) || 0 };
};

/* ----------------------- Colors for camera bars ----------------------- */
const BAR_COLORS = [
  "#4F46E5",
  "#22C55E",
  "#EAB308",
  "#EF4444",
  "#06B6D4",
  "#A855F7",
  "#F97316",
  "#84CC16",
  "#10B981",
  "#3B82F6",
];

/* ----------------------- Component ----------------------- */

interface EnhancedReportGeneratorProps {
  incidents: Incident[];
}

export const EnhancedReportGenerator = ({ incidents }: EnhancedReportGeneratorProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [sectionImages, setSectionImages] = useState<SectionImages>({
    section1: [],
    section2: [],
    section3: [],
    overall: [],
  });
  const [section1Comments, setSection1Comments] = useState("");
  const [section2Comments, setSection2Comments] = useState("");
  const [section3Comments, setSection3Comments] = useState("");
  const [entryComments, setEntryComments] = useState("");

  const reportRef = useRef<HTMLDivElement | null>(null);

  // Preload all images when modal opens
  useEffect(() => {
    if (isPreviewOpen && reportRef.current) {
      const images = reportRef.current.querySelectorAll("img");
      images.forEach((img) => {
        if (!img.complete) {
          const tempImg = new Image();
          tempImg.src = img.src;
        }
      });
    }
  }, [isPreviewOpen]);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Buddywise-Weekly-Report-${new Date().toISOString().slice(0, 10)}`,
    onBeforePrint: async () => {
      setIsPrinting(true);
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
  });

  const processedData = useProcessedIncidents(incidents);

  /* ---------- Data slices ---------- */
  const allIncidents = incidents ?? [];

  /* ---------- Global insights ---------- */
  const areaAll = useMemo(() => makeAreaStats(allIncidents), [allIncidents]);

  const cameraGlobalSorted = useMemo(() => {
    const fromProcessed = Object.entries(processedData.perCamera) as [string, number][];
    const realCams = fromProcessed.filter(([k]) => k && k !== "Unknown");
    if (realCams.length) return realCams.sort((a, b) => b[1] - a[1]);

    const counts = new Map<string, number>();
    const displayNames = new Map<string, string>();
    
    for (const row of allIncidents) {
      const cam = getCamera(row);
      if (cam) {
        const normalized = normalizeCameraName(cam);
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
        
        if (!displayNames.has(normalized)) {
          displayNames.set(normalized, cam);
        }
      }
    }
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([normalized, count]) => [displayNames.get(normalized) || normalized, count] as [string, number]);
  }, [processedData, allIncidents]);

  // Compute top scenarios directly from allIncidents
  const scenarioGlobalSorted = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allIncidents) {
      const scenario = getScenario(row);
      if (scenario && scenario !== "Unknown") {
        counts.set(scenario, (counts.get(scenario) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allIncidents]);

  // Get top 3 scenarios for sections 1-3
  const topScenarios = useMemo(() => scenarioGlobalSorted.slice(0, 3), [scenarioGlobalSorted]);

  // Compute data for each top scenario
  const scenarioSections = useMemo(() => {
    return topScenarios.map(([scenarioName]) => {
      const scenarioIncidents = allIncidents.filter((row) => getScenario(row) === scenarioName);
      // Compute daily counts from timestamps (safe parsing + stable sort)
      const countsByKey = new Map<string, number>(); // key = YYYY-MM-DD
      const labelByKey = new Map<string, string>(); // display label "Oct 3"

      for (const row of scenarioIncidents) {
        const d = getFirstDetectionSafe(row); // <- use the safe parser
        if (!d) continue;

        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);
        if (!labelByKey.has(key)) labelByKey.set(key, label);
      }

      const lineData = Array.from(countsByKey.entries())
        .sort(([a], [b]) => a.localeCompare(b)) // stable lexicographic sort by YYYY-MM-DD
        .map(([key, count]) => ({
          date: labelByKey.get(key) || key,
          observations: count,
        }));

      // Area stats
      const areaStats = makeAreaStats(scenarioIncidents);

      // Camera stats with normalization
      const cameraMap = new Map<string, number>();
      const displayNames = new Map<string, string>();
      
      for (const row of scenarioIncidents) {
        const cam = getCamera(row);
        if (cam) {
          const normalized = normalizeCameraName(cam);
          cameraMap.set(normalized, (cameraMap.get(normalized) || 0) + 1);
          
          if (!displayNames.has(normalized)) {
            displayNames.set(normalized, cam);
          }
        }
      }
      
      const cameraSorted = Array.from(cameraMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([normalized, count]) => [displayNames.get(normalized) || normalized, count] as [string, number]);
      
      const cameraData = cameraSorted.slice(0, 12).map(([camera, count]) => ({
        camera: camera.length > 12 ? camera.slice(0, 12) + "…" : camera,
        observations: count,
      }));

      // Week-over-Week
      const comparison = compareWeekOverWeek(allIncidents, scenarioName);
      const wow = comparison.shouldShow ? comparison : null;

      return {
        scenarioName,
        incidents: scenarioIncidents,
        lineData,
        areaStats,
        cameraData,
        topCamera: cameraSorted[0],
        wow,
        avgPerDay: scenarioIncidents.length / Math.max(countsByKey.size || processedData.totals.totalDays, 1),
      };
    });
  }, [topScenarios, allIncidents, processedData.totals.totalDays]);

  /* ---------- Overall Entry Data ---------- */
  const entryData = useMemo(() => {
    const countsByKey = new Map<string, number>(); // key = YYYY-MM-DD
    const labelByKey = new Map<string, string>(); // display label "Oct 26"

    for (const row of allIncidents) {
      const d = getFirstDetectionSafe(row);
      if (!d) continue;

      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);
      if (!labelByKey.has(key)) labelByKey.set(key, label);
    }

    return Array.from(countsByKey.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        date: labelByKey.get(key) || key,
        entries: count,
      }));
  }, [allIncidents]);

  const generateReport = () => {
    if (!processedData?.totals?.allObservations) {
      toast({
        title: "No incidents selected",
        description: "Please select at least one incident to generate a report.",
        variant: "destructive",
      });
      return;
    }
    setIsPreviewOpen(true);
  };

  const handleImageUpload = (section: keyof SectionImages, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSectionImages((prev) => ({
          ...prev,
          [section]: [...prev[section], { url: event.target?.result as string, caption: "" }],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (section: keyof SectionImages, index: number) => {
    setSectionImages((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  const updateCaption = (section: keyof SectionImages, index: number, caption: string) => {
    setSectionImages((prev) => ({
      ...prev,
      [section]: prev[section].map((img, i) => (i === index ? { ...img, caption } : img)),
    }));
  };

  const handleAssignAction = (section: string) => {
    toast({
      title: "Action Assignment",
      description: `Opening assignment modal for ${section}. Task will be saved to action tracking system.`,
    });
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-buddywise-green" />
            Generate Safety Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Generate comprehensive weekly safety report with AI-powered insights</p>
            </div>

            <Button onClick={generateReport} className="w-full bg-buddywise-green hover:bg-buddywise-dark-green">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-buddywise-green" />
              Buddywise — Weekly Safety Report
            </DialogTitle>
          </DialogHeader>
          {/* EVERYTHING you want to print lives in here */}
          <div id="report-content" ref={reportRef} className="space-y-6">
            {/* Header — GLOBAL (all data) */}
            <div className="bg-buddywise-light-green p-6 rounded-lg border border-buddywise-green/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-bold text-buddywise-dark-green break-words">
                    Buddywise Safety Report
                  </h2>
                  <p className="text-buddywise-dark-green/80 mt-1 text-sm md:text-base">
                    Generated:{" "}
                    {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-foreground mt-3 text-sm break-words">
                    <strong>{processedData.totals.allObservations} total observations</strong> across{" "}
                    {processedData.totals.totalDays} days.
                    {cameraGlobalSorted.length > 0 && (
                      <>
                        {" "}
                        Top camera:{" "}
                        <strong>
                          {cameraGlobalSorted[0][0]} ({cameraGlobalSorted[0][1]})
                        </strong>
                        .
                      </>
                    )}
                    {scenarioGlobalSorted.length > 0 && (
                      <>
                        {" "}
                        Most common:{" "}
                        <strong>
                          {scenarioGlobalSorted[0][0]} ({scenarioGlobalSorted[0][1]})
                        </strong>
                        .
                      </>
                    )}
                    {areaAll.top && (
                      <>
                        {" "}
                        Top area:{" "}
                        <strong>
                          {areaAll.top[0]} ({areaAll.top[1]})
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl md:text-4xl font-bold text-buddywise-green">
                    {processedData.totals.allObservations}
                  </div>
                  <div className="text-xs md:text-sm text-buddywise-dark-green whitespace-nowrap">
                    Total Observations
                  </div>
                </div>
              </div>
            </div>

            {/* Insights Panel — GLOBAL (top 5 lists) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl text-buddywise-dark-green break-words">
                  Insights — Top Drivers (All Observations)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Top 5 Areas</h4>
                  <ul className="space-y-1">
                    {areaAll.top ? (
                      areaAll.list
                        .sort((a, b) => areaAll.getCount(b) - areaAll.getCount(a))
                        .slice(0, 5)
                        .map((name) => (
                          <li key={name} className="flex justify-between text-sm border rounded p-2">
                            <span className="truncate">{name}</span>
                            <span className="text-muted-foreground">{areaAll.getCount(name)}</span>
                          </li>
                        ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No area data</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Top 5 Cameras</h4>
                  <ul className="space-y-1">
                    {cameraGlobalSorted.length ? (
                      cameraGlobalSorted.slice(0, 5).map(([cam, n]) => (
                        <li key={cam} className="flex justify-between text-sm border rounded p-2">
                          <span className="truncate">{cam}</span>
                          <span className="text-muted-foreground">{n}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No camera data</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Top 5 Scenarios</h4>
                  <ul className="space-y-1">
                    {scenarioGlobalSorted.length ? (
                      scenarioGlobalSorted.slice(0, 5).map(([label, n]) => (
                        <li key={label} className="flex justify-between text-sm border rounded p-2">
                          <span className="truncate">{label}</span>
                          <span className="text-muted-foreground">{n}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No scenario data</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Sections 1-3 based on top 3 scenarios */}
            {scenarioSections.map((section, idx) => {
              const sectionKey = `section${idx + 1}` as keyof SectionImages;
              const comments = idx === 0 ? section1Comments : idx === 1 ? section2Comments : section3Comments;
              const setComments =
                idx === 0 ? setSection1Comments : idx === 1 ? setSection2Comments : setSection3Comments;

              return (
                <Card key={idx} id={`sec${idx + 1}`} style={{ breakInside: "avoid", pageBreakInside: "avoid", pageBreakAfter: "auto" }}>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl text-buddywise-dark-green break-words flex items-center gap-2 flex-wrap">
                      <span>
                        Section {idx + 1} — {section.scenarioName}
                      </span>
                      {section.wow && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                className={`${
                                  section.wow.percentChange < 0
                                    ? "bg-safety-green text-white"
                                    : "bg-safety-red text-white"
                                } flex items-center gap-1`}
                              >
                                {section.wow.percentChange < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                <span>{Math.abs(Math.round(section.wow.percentChange))}% vs last week</span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This week: {section.wow.currentCount}</p>
                              <p>Last week: {section.wow.previousCount}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Area Coverage */}
                    <div>
                      <h4 className="text-xs md:text-sm font-semibold mb-2 break-words">
                        Areas Covered ({section.scenarioName})
                      </h4>
                      {section.areaStats.list.length > 0 ? (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {section.areaStats.list
                            .sort((a, b) => section.areaStats.getCount(b) - section.areaStats.getCount(a))
                            .map((name) => (
                              <li
                                key={name}
                                className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800 flex items-center justify-between"
                              >
                                <span className="truncate">{name}</span>
                                <span className="text-gray-500">{section.areaStats.getCount(name)}</span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">No area data</div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 text-sm">
                      <p>
                        • Total events: <strong>{section.incidents.length}</strong>
                      </p>
                      <p>
                        • Average per day: <strong>{section.avgPerDay.toFixed(1)}</strong>
                      </p>
                      <p>
                        • Top area:{" "}
                        <strong>
                          {section.areaStats.top
                            ? `${section.areaStats.top[0]} (${section.areaStats.top[1]})`
                            : "No data"}
                        </strong>
                      </p>
                      <p>
                        • Top camera:{" "}
                        <strong>
                          {section.topCamera ? `${section.topCamera[0]} (${section.topCamera[1]})` : "No data"}
                        </strong>
                      </p>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs md:text-sm font-semibold mb-2">Events per Day</h4>
                        <div className="h-32">
                          {section.lineData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={section.lineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" fontSize={9} stroke="hsl(var(--muted-foreground))" />
                                <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" />
                                {!isPrinting && (
                                  <RechartsTooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--background))",
                                      border: "1px solid hsl(var(--border))",
                                    }}
                                  />
                                )}
                                <Line
                                  type="monotone"
                                  dataKey="observations"
                                  stroke="hsl(var(--buddywise-green))"
                                  strokeWidth={2}
                                  isAnimationActive={!isPrinting}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full min-h-[8rem] border border-dashed rounded-md flex items-center justify-center text-xs text-muted-foreground">
                              <Info className="h-4 w-4 mr-2" /> No daily breakdown available (missing timestamps)
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs md:text-sm font-semibold mb-2">Events per Camera</h4>
                        <div className="h-32">
                          {section.cameraData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={section.cameraData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="camera" fontSize={9} stroke="hsl(var(--muted-foreground))" />
                                <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" />
                                {!isPrinting && (
                                  <RechartsTooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--background))",
                                      border: "1px solid hsl(var(--border))",
                                    }}
                                  />
                                )}
                                <Bar dataKey="observations" isAnimationActive={!isPrinting}>
                                  {section.cameraData.map((_, i) => (
                                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full min-h-[8rem] border border-dashed rounded-md flex items-center justify-center text-xs text-muted-foreground">
                              <Info className="h-4 w-4 mr-2" /> No camera data available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Comments & Image Upload */}
                    <div className="space-y-2" data-no-print>
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                        <label className="text-sm font-medium">Comments:</label>
                      </div>
                      <Textarea
                        placeholder={`Add observations and recommendations for ${section.scenarioName}...`}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="min-h-16"
                      />

                      <div className="space-y-2 pt-2" data-no-print>
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Upload Images
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(sectionKey, e)}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-buddywise-light-green file:text-buddywise-dark-green hover:file:bg-buddywise-green/20"
                        />
                        {sectionImages[sectionKey].length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3" data-no-print>
                            {sectionImages[sectionKey].map((img, imgIdx) => (
                              <div key={imgIdx} className="relative border rounded-lg overflow-hidden">
                                <img src={img.url} alt="" className="w-full h-24 object-cover" />
                                <button
                                  onClick={() => removeImage(sectionKey, imgIdx)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <input
                                  type="text"
                                  placeholder="Caption..."
                                  value={img.caption}
                                  onChange={(e) => updateCaption(sectionKey, imgIdx, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border-t"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Print: Section Images */}
                    {sectionImages[sectionKey].length > 0 && (
                      <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-semibold">Photos & Notes:</h4>
                        <div className="flex flex-col items-center gap-4">
                          {sectionImages[sectionKey].map((img, imgIdx) => (
                            <div
                              key={imgIdx}
                              className="border rounded-lg overflow-hidden"
                              style={{ 
                                breakInside: "avoid", 
                                pageBreakInside: "avoid",
                                maxWidth: "65%",
                                width: "100%"
                              }}
                            >
                              <img
                                src={img.url}
                                alt={img.caption || `${section.scenarioName} photo`}
                                className="w-full h-auto"
                                style={{ maxWidth: "100%", height: "auto" }}
                              />
                              {img.caption && (
                                <div className="p-2 bg-muted text-sm line-clamp-2">
                                  {img.caption}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Section 4 — Overall Summary */}
            <Card id="sec4" style={{ breakInside: "avoid", pageBreakInside: "avoid", pageBreakAfter: "auto" }}>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl text-buddywise-dark-green break-words">
                  Section 4 — Overall Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {entryData.length > 0 ? (
                  <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-buddywise-green">
                          {processedData.totals.allObservations}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground mt-1">Total Observations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-buddywise-green">
                          {entryData.length}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground mt-1">Days Covered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-buddywise-green">
                          {(processedData.totals.allObservations / entryData.length).toFixed(1)}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground mt-1">Average per Day</div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-foreground">All Observations per Day</h4>
                      <div className="h-64 bg-background rounded-lg border p-4">
                        {entryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={entryData}
                              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="date" 
                                fontSize={10} 
                                stroke="hsl(var(--muted-foreground))"
                                angle={entryData.length > 7 ? -45 : 0}
                                textAnchor={entryData.length > 7 ? "end" : "middle"}
                                height={entryData.length > 7 ? 60 : 30}
                              />
                              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                              {!isPrinting && (
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                  }}
                                />
                              )}
                              <Bar 
                                dataKey="entries" 
                                fill="hsl(var(--buddywise-green))" 
                                isAnimationActive={!isPrinting}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                            <Info className="h-4 w-4 mr-2" /> No data available
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No observations logged for this period.</p>
                )}

                <div className="space-y-2" data-no-print>
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                    <label className="text-xs md:text-sm font-medium">Comments:</label>
                  </div>
                  <Textarea
                    placeholder="Add observations and recommendations..."
                    value={entryComments}
                    onChange={(e) => setEntryComments(e.target.value)}
                    className="min-h-16 text-sm"
                  />

                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Images
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload("overall", e)}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-buddywise-light-green file:text-buddywise-dark-green hover:file:bg-buddywise-green/20"
                    />
                     {sectionImages.overall.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3" data-no-print>
                        {sectionImages.overall.map((img, idx) => (
                          <div key={idx} className="relative border rounded-lg overflow-hidden">
                            <img src={img.url} alt="" className="w-full h-24 object-cover" />
                            <button
                              onClick={() => removeImage("overall", idx)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <input
                              type="text"
                              placeholder="Caption..."
                              value={img.caption}
                              onChange={(e) => updateCaption("overall", idx, e.target.value)}
                              className="w-full px-2 py-1 text-xs border-t"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Print: Overall Summary Images */}
                {sectionImages.overall.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-semibold">Photos & Notes:</h4>
                    <div className="flex flex-col items-center gap-4">
                      {sectionImages.overall.map((img, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg overflow-hidden"
                          style={{ 
                            breakInside: "avoid", 
                            pageBreakInside: "avoid",
                            maxWidth: "65%",
                            width: "100%"
                          }}
                        >
                          <img 
                            src={img.url} 
                            alt={img.caption || "Overall summary photo"} 
                            className="w-full h-auto"
                            style={{ maxWidth: "100%", height: "auto" }}
                          />
                          {img.caption && (
                            <div className="p-2 bg-muted text-sm line-clamp-2">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Card className="mt-2 border-l-4 border-l-buddywise-green bg-buddywise-light-green/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-5 text-buddywise-green" />
                      <span>Recommendations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                      <Lightbulb className="h-4 w-4 text-buddywise-green mt-0.5" />
                      <div className="flex-1">
                        <Badge variant="secondary" className="text-xs mb-1">
                          Improvement
                        </Badge>
                        <p className="text-xs md:text-sm">
                          Prioritize improvement in <strong>{areaAll.top ? areaAll.top[0] : "top area"}</strong> and
                          around <strong>{cameraGlobalSorted[0]?.[0] ?? "top camera"}</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                      <AlertTriangle className="h-4 w-4 text-safety-red mt-0.5" />
                      <div className="flex-1">
                        <Badge variant="destructive" className="text-xs mb-1">
                          Action Required
                        </Badge>
                        <p className="text-xs md:text-sm">
                          Review procedures in top 3 areas and re-tune detections if false positives suspected.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignAction("Overall Summary")}
                        className="w-full text-xs md:text-sm"
                        data-no-print
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign Action
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>{" "}
          {/* closes #report-content */}
          
          {/* Print-only Footer */}
          <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
            © Buddywise AB — Confidential. Internal Use Only. Generated on: {new Date().toLocaleString('sv-SE', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }).replace(',', '')}
          </div>

          {/* Actions (not printed) */}
          <div
            data-no-print
            className="no-print flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t"
          >
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="w-full sm:w-auto">
              Back to Dashboard
            </Button>

            <Button onClick={handlePrint} className="w-full sm:w-auto bg-buddywise-green hover:bg-buddywise-dark-green">
              <Download className="h-4 w-4 mr-2" />
              Download as PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
