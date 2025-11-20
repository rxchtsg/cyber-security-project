import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Incident } from "@/types/incident";
import { Calendar, MapPin, AlertCircle, User } from "lucide-react";

interface IncidentCardProps {
  incident: Incident;
  onSelect: (incident: Incident) => void;
  isSelected: boolean;
  allIncidents: Incident[]; // Keep for potential future use
}

export const IncidentCard = ({ incident, onSelect, isSelected }: IncidentCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-status-open text-white';
      case 'Closed':
        return 'bg-status-closed text-white';
      case 'Pending':
        return 'bg-status-pending text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-destructive text-destructive-foreground';
      case 'High':
        return 'bg-safety-red text-white';
      case 'Medium':
        return 'bg-safety-yellow text-white';
      case 'Low':
        return 'bg-safety-green text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      }`}
      onClick={() => onSelect(incident)}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-foreground break-words flex-1">
            {incident.type}
          </CardTitle>
          {incident.severity && (
            <Badge className={getSeverityColor(incident.severity)}>
              {incident.severity}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{new Date(incident.date).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="break-words">{incident.location}</span>
        </div>
        
        {incident.reportedBy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>Camera: {incident.reportedBy}</span>
          </div>
        )}
        
        {incident.description && (
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
            <p className="text-muted-foreground break-words">{incident.description}</p>
          </div>
        )}
        
        {incident.assignedTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <User className="h-4 w-4" />
            <span>Assigned to: {incident.assignedTo}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};