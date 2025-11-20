import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Incident } from "@/types/incident";
import { useProcessedIncidents } from "@/hooks/useProcessedIncidents";
import { getHazardColor } from "@/utils/hazardColors";
import { useMemo } from "react";

interface InsightsDashboardProps {
  incidents: Incident[];
}

const FALLBACK_COLORS = [
  "#34D399", // green-400
  "#10B981", // green-500
  "#3B82F6", // blue-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#06B6D4", // cyan-500
  "#84CC16", // lime-500
  "#F97316", // orange-500
  "#A78BFA", // violet-400
];

export const InsightsDashboard = ({ incidents }: InsightsDashboardProps) => {
  const processed = useProcessedIncidents(incidents);

  /* ---------------------- Derived data ---------------------- */
  const lineData = useMemo(
    () =>
      Object.entries(processed.perDay).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        observations: count,
      })),
    [processed.perDay],
  );

  const barData = useMemo(
    () =>
      Object.entries(processed.perCamera).map(([camera, count]) => ({
        camera: camera.length > 10 ? camera.slice(0, 10) + "…" : camera,
        observations: count,
      })),
    [processed.perCamera],
  );

  const pieData = useMemo(() => {
    const rows = Object.entries(processed.perType)
      .map(([type, count]) => ({
        name: type,
        value: count,
        color: getHazardColor(type) ?? null,
      }))
      .sort((a, b) => b.value - a.value);

    // Fill in missing colors from fallback palette (stable order)
    return rows.map((r, i) => ({
      ...r,
      color: r.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));
  }, [processed.perType]);

  const legendFormatter = (value: string) => value;

  /* --------------------------- UI --------------------------- */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Line Chart — Observations per Day */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-buddywise-green" />
            Observations per Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="observations"
                  stroke="hsl(var(--buddywise-green))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--buddywise-green))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart — Observations per Camera */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-buddywise-green" />
            Observations per Camera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="camera" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="observations" fill="hsl(var(--buddywise-green))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Donut Chart — Observations by Type */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-4 w-4 text-buddywise-green" />
            Observations by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="40%"
                  cy="50%"
                  outerRadius="70%"
                  innerRadius="45%"
                  labelLine={false}
                  label={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(v: number, n: string) => [v, n]}
                  wrapperStyle={{ zIndex: 10000 }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />

                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  wrapperStyle={{ 
                    paddingLeft: 12, 
                    maxWidth: 280,
                    whiteSpace: "normal",
                    wordWrap: "break-word",
                    lineHeight: "1.4"
                  }}
                  formatter={legendFormatter}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
