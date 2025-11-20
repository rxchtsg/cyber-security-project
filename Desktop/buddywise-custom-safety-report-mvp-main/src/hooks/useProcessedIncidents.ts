import { useMemo } from "react";
import { Incident } from "@/types/incident";

export interface ProcessedData {
  // Per day aggregations
  perDay: Record<string, number>;
  
  // Per camera aggregations
  perCamera: Record<string, number>;
  
  // Per type aggregations
  perType: Record<string, number>;
  
  // Scenario breakdowns
  scenarios: {
    ppeOverall: { byDay: Record<string, number>; total: number };
    personNearHit: { byDay: Record<string, number>; total: number };
  };
  
  // Totals
  totals: {
    allObservations: number;
    totalDays: number;
    topCamera: string;
    topType: string;
  };
}

/**
 * Processes incident data from CSV/Supabase into aggregated format for charts
 * This replaces all mock data with live CSV data
 */
export const useProcessedIncidents = (incidents: Incident[]): ProcessedData => {
  return useMemo(() => {
    if (!incidents || incidents.length === 0) {
      return {
        perDay: {},
        perCamera: {},
        perType: {},
        scenarios: {
          ppeOverall: { byDay: {}, perCamera: {}, total: 0 },
          personNearHit: { byDay: {}, perCamera: {}, total: 0 },
        },
        totals: {
          allObservations: 0,
          totalDays: 0,
          topCamera: "N/A",
          topType: "N/A",
        },
      };
    }

    // Aggregate by day
    const perDay: Record<string, number> = {};
    incidents.forEach(incident => {
      const date = incident.date;
      perDay[date] = (perDay[date] || 0) + 1;
    });

    // Aggregate by camera (reportedBy field contains camera name)
    const perCamera: Record<string, number> = {};
    incidents.forEach(incident => {
      const camera = incident.reportedBy || "Unknown";
      perCamera[camera] = (perCamera[camera] || 0) + 1;
    });

    // Aggregate by type/scenario
    const perType: Record<string, number> = {};
    incidents.forEach(incident => {
      const type = incident.type || "Unknown";
      perType[type] = (perType[type] || 0) + 1;
    });

    // Scenario-specific breakdowns
    const ppeByDay: Record<string, number> = {};
    const personNearHitByDay: Record<string, number> = {};
    
    incidents.forEach(incident => {
      const date = incident.date;
      const scenario = incident.type?.toLowerCase() || "";
      
      if (scenario.includes("ppe") || scenario.includes("overall")) {
        ppeByDay[date] = (ppeByDay[date] || 0) + 1;
      }
      
      if (scenario.includes("person") && scenario.includes("near")) {
        personNearHitByDay[date] = (personNearHitByDay[date] || 0) + 1;
      }
    });

    const ppePerCamera: Record<string, number> = {};
    incidents.forEach(incident => {
      const camera = incident.reportedBy || "Unknown";
      ppePerCamera[camera] = (ppePerCamera[camera] || 0) + 1;
    });

    const personNearHitPerCamera: Record<string, number> = {};
    incidents.forEach(incident => {
      const camera = incident.reportedBy || "Unknown";
      personNearHitPerCamera[camera] = (personNearHitPerCamera[camera] || 0) + 1;
    });

    // Calculate totals
    const totalDays = Object.keys(perDay).length;
    const topCamera = Object.entries(perCamera).sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";
    const topType = Object.entries(perType).sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";

    return {
      perDay,
      perCamera,
      perType,
      scenarios: {
        ppeOverall: {
          byDay: ppeByDay,
          perCamera: ppePerCamera,
          total: Object.values(ppeByDay).reduce((sum, count) => sum + count, 0),
        },
        personNearHit: {
          byDay: personNearHitByDay,
          perCamera: personNearHitPerCamera,
          total: Object.values(personNearHitByDay).reduce((sum, count) => sum + count, 0),
        },
      },
      totals: {
        allObservations: incidents.length,
        totalDays,
        topCamera,
        topType,
      },
    };
  }, [incidents]);
};
