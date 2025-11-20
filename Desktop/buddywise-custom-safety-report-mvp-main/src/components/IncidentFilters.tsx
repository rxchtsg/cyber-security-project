import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, Filter, RotateCcw } from "lucide-react";

interface IncidentFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const IncidentFilters = ({ filters, onFiltersChange, onClearFilters }: IncidentFiltersProps) => {
  const incidentTypes = [
    "Person Near Hit",
    "Vehicle Near Hit", 
    "Lack of High-Visibility Wear",
    "Slip and Fall",
    "Equipment Malfunction",
    "Chemical Spill"
  ];

  const sites = [
    "Site A",
    "Site B", 
    "Site C",
    "Warehouse B",
    "Office Building D",
    "Manufacturing Plant E",
    "Laboratory F"
  ];

  

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="site-filter">Site/Location</Label>
            <Select 
              value={filters.site || "all-sites"} 
              onValueChange={(value) => 
                onFiltersChange({ ...filters, site: value === "all-sites" ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-sites">All sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site} value={site}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-filter">Incident Type</Label>
            <Select 
              value={filters.type || "all-types"} 
              onValueChange={(value) => 
                onFiltersChange({ ...filters, type: value === "all-types" ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All types</SelectItem>
                {incidentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-1">
              <Input
                type="date"
                placeholder="Start date"
                value={filters.dateRange?.start || ""}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value }
                })}
                className="text-sm"
              />
              <Input
                type="date" 
                placeholder="End date"
                value={filters.dateRange?.end || ""}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value }
                })}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter Incidents</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearFilters}
            className="flex items-center gap-2 hover:bg-buddywise-light-green hover:border-buddywise-green"
          >
            <RotateCcw className="h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};