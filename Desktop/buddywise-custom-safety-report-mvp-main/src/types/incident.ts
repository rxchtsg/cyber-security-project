export interface Incident {
  id: string;
  date: string;
  type: string;
  location: string;
  description: string;
  status?: 'Open' | 'Closed' | 'Pending';
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  reportedBy?: string;
  assignedTo?: string;
  correctiveAction?: string;
}

export interface IncidentFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  site?: string;
  incidentType?: string;
  status?: string;
}

export interface ReportData {
  incidents: Incident[];
  summary: {
    totalIncidents: number;
    openIncidents: number;
    closedIncidents: number;
    sitesAffected: number;
    mostCommonType: string;
    dateRange: string;
  };
}