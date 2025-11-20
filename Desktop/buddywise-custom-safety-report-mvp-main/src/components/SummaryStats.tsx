import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Incident } from "@/types/incident";
import { AlertTriangle, CheckCircle, MapPin, TrendingUp } from "lucide-react";
import { useProcessedIncidents } from "@/hooks/useProcessedIncidents";

interface SummaryStatsProps {
  incidents: Incident[];
  selectedIncidents: Incident[];
  filteredIncidents: Incident[];
}

export const SummaryStats = ({ incidents, selectedIncidents, filteredIncidents }: SummaryStatsProps) => {
  // Use selected incidents for KPI calculations, fallback to filtered if none selected
  const dataForKPIs = selectedIncidents.length > 0 ? selectedIncidents : filteredIncidents;
  
  // Process data using CSV pipeline
  const processedData = useProcessedIncidents(dataForKPIs);
  
  const stats = {
    total: dataForKPIs.length,
    sites: new Set(dataForKPIs.map(i => i.location)).size,
    cameras: new Set(dataForKPIs.map(i => i.reportedBy)).size,
  };

  // Get most common incident type
  const typeCounts = dataForKPIs.reduce((acc, incident) => {
    acc[incident.type] = (acc[incident.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonType = Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a)[0];

  // Generate dynamic summary text based on CSV data
  let summaryText = "";
  const visibleCount = filteredIncidents.length;
  const selectedCount = selectedIncidents.length;
  const siteCount = new Set(filteredIncidents.map(i => i.location)).size;

  if (selectedCount === 0 && visibleCount > 0) {
    summaryText = `${visibleCount} incidents visible across ${siteCount} sites. Use 'Select All Visible' to include them in the report.`;
  } else if (selectedCount > 0) {
    const selectedSiteCount = new Set(selectedIncidents.map(i => i.location)).size;
    const topCamera = processedData.totals.topCamera;
    const topType = processedData.totals.topType;
    summaryText = `${selectedCount} incidents across ${selectedSiteCount} sites. Top camera: ${topCamera}. Top type: ${topType}.`;
  } else {
    summaryText = "No incidents selected.";
  }

  return (
    <div className="space-y-4">
      {/* Auto-Summary Box */}
      <Card className="shadow-card bg-buddywise-light-green/30 border-buddywise-green/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-buddywise-dark-green">
            <TrendingUp className="h-5 w-5" />
            Auto-Generated Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground font-medium">{summaryText}</p>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-buddywise-green" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Observations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-buddywise-green" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.sites}</p>
                <p className="text-sm text-muted-foreground">Areas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-buddywise-green" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.cameras}</p>
                <p className="text-sm text-muted-foreground">Cameras</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Common Types */}
      {Object.keys(typeCounts).length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Incident Types Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCounts)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => (
                  <Badge key={type} variant="secondary" className="text-sm bg-buddywise-light-green text-buddywise-dark-green border-buddywise-green/20">
                    {type}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};