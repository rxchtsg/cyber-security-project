import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IncidentCard } from "@/components/IncidentCard";
import { IncidentFilters } from "@/components/IncidentFilters";
import { SummaryStats } from "@/components/SummaryStats";
import { EnhancedReportGenerator } from "@/components/EnhancedReportGenerator";
import { KPITiles } from "@/components/KPITiles";
import { InsightsDashboard } from "@/components/InsightsDashboard";
import { CSVUploader } from "@/components/CSVUploader";
import { Incident } from "@/types/incident";
import { Shield, AlertTriangle, Upload } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const Dashboard = () => {
  // State for CSV data
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[]>([]);
  const [selectedRawRows, setSelectedRawRows] = useState<any[]>([]); // Track raw rows for report
  const [filters, setFilters] = useState<any>({});

  // Parse timestamp from various formats
  const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    // Handle already parsed Date objects
    if (timestamp instanceof Date) return timestamp;
    
    const str = String(timestamp).trim();
    
    // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    let date = new Date(str);
    if (!isNaN(date.getTime())) return date;
    
    // Try YYYY-MM-DD HH:mm:ss format
    const match = str.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      return new Date(match[0]);
    }
    
    // Try DD.MM.YYYY format
    const ddmmyyyy = str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (ddmmyyyy) {
      return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
    }
    
    // Try MM/DD/YYYY format
    const mmddyyyy = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (mmddyyyy) {
      return new Date(`${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`);
    }
    
    return null;
  };


  // Normalize CSV headers: trim, lowercase, replace spaces/dashes with underscores
  const normalizeHeader = (header: string): string => {
    return header.trim().toLowerCase().replace(/[\s-]+/g, '_');
  };

  // Normalize CSV data to Incident format
  const normalizedIncidents: Incident[] = useMemo(() => {
    if (rawRows.length === 0) return [];
    
    // Normalize all row keys first
    const normalizedRows = rawRows.map(row => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        normalizedRow[normalizeHeader(key)] = row[key];
      });
      return normalizedRow;
    });

    return normalizedRows
      .map((row, index) => {
        const keys = Object.keys(row);
        
        // Map common aliases to standard fields
        const findKey = (aliases: string[]) => {
          return keys.find(k => aliases.some(alias => k === alias || k.includes(alias)));
        };
        
        // Timestamp mapping: timestamp, time, datetime, first_detection, date
        const timestampKey = findKey(['timestamp', 'time', 'datetime', 'first_detection', 'date']);
        
        // Area mapping: area, zone, location
        const areaKey = findKey(['area', 'zone', 'location']);
        
        // Camera mapping: camera, camera_name, device
        const cameraKey = findKey(['camera', 'camera_name', 'device']);
        
        // Category/Type mapping: category, event, violation_type, scenario, hazard, type
        const categoryKey = findKey(['category', 'event', 'violation_type', 'scenario', 'hazard', 'type']);
        
        // Severity mapping: severity, level
        const severityKey = findKey(['severity', 'level']);
        
        // Parse timestamp
        const timestamp = timestampKey ? parseTimestamp(row[timestampKey]) : null;
        
        // Skip rows with invalid/missing timestamps for time-based charts
        if (!timestamp) {
          return null;
        }
        
        const date = timestamp.toISOString().split('T')[0];
        const hazard = (categoryKey ? row[categoryKey] : null) || 'Unknown';
        const area = (areaKey ? row[areaKey] : null) || 'Unknown';
        const camera = (cameraKey ? row[cameraKey] : null) || 'Unknown';
        const severity = severityKey ? row[severityKey] : undefined;
        
        const newIncident: Incident = {
          id: row.id || `incident-${index}`,
          date,
          type: hazard,
          location: area,
          description: `${hazard} detected at ${area}${camera ? ` (Camera: ${camera})` : ''}`,
          reportedBy: camera || undefined,
          severity: severity as any,
          assignedTo: undefined,
          correctiveAction: undefined
        };
        
        return newIncident;
      })
      .filter((incident): incident is Incident => incident !== null); // Remove nulls
  }, [rawRows]);

  // Apply filters to normalized incidents
  const filteredIncidents = useMemo(() => {
    return normalizedIncidents.filter(incident => {
      if (filters.site && !incident.location.toLowerCase().includes(filters.site.toLowerCase())) {
        return false;
      }
      if (filters.type && incident.type !== filters.type) {
        return false;
      }
      if (filters.dateRange) {
        const incidentDate = new Date(incident.date);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (incidentDate < startDate || incidentDate > endDate) {
          return false;
        }
      }
      return true;
    });
  }, [normalizedIncidents, filters]);

  // Handle CSV upload
  const handleDataLoaded = (rows: any[]) => {
    // Reset all state when new CSV is loaded
    setRawRows([]);
    setSelectedIncidents([]);
    setSelectedRawRows([]);
    setFilters({});
    
    // Set new data after reset
    setTimeout(() => {
      setRawRows(rows);
      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${rows.length} incidents from CSV`
      });
    }, 0);
  };

  const handleIncidentSelect = (incident: Incident) => {
    setSelectedIncidents(prev => {
      const isSelected = prev.some(i => i.id === incident.id);
      if (isSelected) {
        // Remove from both selected incidents and raw rows
        const filtered = prev.filter(i => i.id !== incident.id);
        setSelectedRawRows(rawRows.filter(row => {
          const incidentId = row.id || row.ID || row.Id;
          return filtered.some(i => i.id === incidentId || i.id === `incident-${rawRows.indexOf(row)}`);
        }));
        return filtered;
      } else {
        // Add to both selected incidents and raw rows
        const added = [...prev, incident];
        setSelectedRawRows(rawRows.filter(row => {
          const incidentId = row.id || row.ID || row.Id || `incident-${rawRows.indexOf(row)}`;
          return added.some(i => i.id === incidentId);
        }));
        return added;
      }
    });
  };

  const selectAllVisible = () => {
    setSelectedIncidents(filteredIncidents);
    // Also select corresponding raw rows
    const selectedIds = new Set(filteredIncidents.map(i => i.id));
    setSelectedRawRows(rawRows.filter((row, idx) => {
      const rowId = row.id || row.ID || row.Id || `incident-${idx}`;
      return selectedIds.has(rowId);
    }));
    toast({
      title: "Incidents Selected",
      description: `Selected all ${filteredIncidents.length} visible incidents`
    });
  };

  const clearSelection = () => {
    setSelectedIncidents([]);
    setSelectedRawRows([]);
    toast({
      title: "Selection Cleared",
      description: "All incidents have been deselected"
    });
  };

  const clearFilters = () => {
    setFilters({});
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-buddywise-green rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Buddywise Safety Management</h1>
                <p className="text-muted-foreground">Enterprise Incident Reporting & Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm border-buddywise-green text-buddywise-dark-green">
                {normalizedIncidents.length} Total Incidents
              </Badge>
              <Badge variant="default" className="text-sm bg-buddywise-green">
                {selectedIncidents.length} Selected
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Filters Row */}
          <IncidentFilters 
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
          />
          
          {/* Show upload message if no data */}
          {rawRows.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-12 text-center">
                <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Data Loaded</h3>
                <p className="text-muted-foreground mb-6">
                  Please upload a CSV file to view incidents and analytics.
                </p>
                <p className="text-sm text-muted-foreground">
                  Use the CSV uploader in the sidebar to get started →
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Centered Summary Stats */}
              <div className="flex justify-center">
                <div className="w-full max-w-4xl">
                  <SummaryStats 
                    incidents={normalizedIncidents}
                    selectedIncidents={selectedIncidents}
                    filteredIncidents={filteredIncidents}
                  />
                </div>
              </div>

              {/* KPI Tiles */}
              <KPITiles incidents={filteredIncidents} />

              {/* Insights Dashboard */}
              <InsightsDashboard incidents={filteredIncidents} />
            </>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {rawRows.length > 0 && (
                <div className="space-y-6">
                  {/* Dashboard Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Incident Dashboard
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={selectAllVisible}
                            disabled={filteredIncidents.length === 0}
                          >
                            Select All Visible
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={clearSelection}
                            disabled={selectedIncidents.length === 0}
                          >
                            Clear Selection
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        Showing {filteredIncidents.length} of {normalizedIncidents.length} incidents
                        {selectedIncidents.length > 0 && (
                          <span className="ml-2 font-medium">• {selectedIncidents.length} selected for reporting</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Incidents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIncidents.length > 0 ? (
                      filteredIncidents.map(incident => (
                        <IncidentCard
                          key={incident.id}
                          incident={incident}
                          onSelect={handleIncidentSelect}
                          isSelected={selectedIncidents.some(i => i.id === incident.id)}
                          allIncidents={normalizedIncidents}
                        />
                      ))
                    ) : (
                      <div className="col-span-full">
                        <Card>
                          <CardContent className="py-12">
                            <div className="text-center text-muted-foreground">
                              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg font-medium">No incidents found</p>
                              <p>Try adjusting your filters or check back later</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - CSV Uploader & Report Generator */}
            <div className="lg:col-span-1 space-y-4">
              <CSVUploader onDataLoaded={handleDataLoaded} />
              {rawRows.length > 0 && (
                <EnhancedReportGenerator 
                  incidents={selectedRawRows.length > 0 ? selectedRawRows : rawRows} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
