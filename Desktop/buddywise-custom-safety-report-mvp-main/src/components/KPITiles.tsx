import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Camera, TrendingUp } from "lucide-react";
import { Incident } from "@/types/incident";
import { useProcessedIncidents } from "@/hooks/useProcessedIncidents";

interface KPITilesProps {
  incidents: Incident[];
}

export const KPITiles = ({ incidents }: KPITilesProps) => {
  const processedData = useProcessedIncidents(incidents);
  
  const topCameraCount = processedData.perCamera[processedData.totals.topCamera] || 0;
  const topTypeCount = processedData.perType[processedData.totals.topType] || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-buddywise-green/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-buddywise-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{processedData.totals.allObservations}</p>
              <p className="text-sm text-muted-foreground">Total Observations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-buddywise-green/10 rounded-lg">
              <Camera className="h-6 w-6 text-buddywise-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{processedData.totals.topCamera}</p>
              <p className="text-sm text-muted-foreground">Top Camera ({topCameraCount})</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-buddywise-green/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-buddywise-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{processedData.totals.topType}</p>
              <p className="text-sm text-muted-foreground">Top Type ({topTypeCount})</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
