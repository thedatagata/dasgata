// components/charts/RechartsWrapper.tsx
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatValue } from "../../utils/semantic/recharts-generator.ts";
import type { RechartsConfig } from "../../utils/semantic/recharts-generator.ts";

interface RechartsWrapperProps {
  config: RechartsConfig;
  loading?: boolean;
  height?: number;
}

const COLOR_PALETTE = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
  "#ffa07a",
];

function formatLabel(text: string): string {
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Ltv/g, "LTV")
    .replace(/30d/g, "(30d)");
}

export default function RechartsWrapper(
  { config, loading = false, height = 400 }: RechartsWrapperProps,
) {
  if (loading) {
    return (
      <div
        class="bg-white rounded-lg shadow p-6 flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4">
          </div>
          <p class="text-gray-600">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (!config.data || config.data.length === 0) {
    return (
      <div
        class="bg-white rounded-lg shadow p-6 flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <p class="text-gray-500">No data available</p>
      </div>
    );
  }

  // Convert BigInt to Number in data
  const sanitizedData = config.data.map((row) => {
    const newRow: any = {};
    for (const key in row) {
      const value = row[key];
      newRow[key] = typeof value === "bigint" ? Number(value) : value;
    }
    return newRow;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div class="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
        <p class="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} class="flex items-center justify-between space-x-4 text-sm">
            <span class="flex items-center">
              <span
                class="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color }}
              >
              </span>
              {entry.name}:
            </span>
            <span class="font-medium">
              {formatValue(entry.value, config.config.format?.[entry.dataKey])}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Calculate gradient offset for area fill by value
  const calculateGradientOffset = () => {
    if (config.type !== "area-fill-by-value") return 0.5;

    const dataKey = config.yKeys[0];
    const values = sanitizedData.map((d) => d[dataKey]).filter((v) => typeof v === "number");
    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  };

  const gradientOffset = calculateGradientOffset();

  // Handle heatmap by converting to grouped bar
  const effectiveType = config.type === "heatmap" ? "bar" : config.type;

  if (config.type === "heatmap") {
    console.warn("Recharts does not support native heatmaps. Rendering as grouped bar chart.");
  }

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">{config.title}</h3>

      <ResponsiveContainer width="100%" height={height}>
        {effectiveType === "bar" || effectiveType === "stacked-bar"
          ? (
            <BarChart data={sanitizedData}>
              {config.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey={config.xKey}
                angle={config.config.isTimeSeries ? -45 : 0}
                textAnchor={config.config.isTimeSeries ? "end" : "middle"}
                height={config.config.isTimeSeries ? 80 : 30}
              />
              <YAxis width={80} />
              {config.config.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.config.showLegend && <Legend />}
              {config.yKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={config.config.colors?.[idx] || COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                  stackId={effectiveType === "stacked-bar" || config.config.stacked
                    ? "stack"
                    : undefined}
                  name={formatLabel(key)}
                />
              ))}
            </BarChart>
          )
          : effectiveType === "biaxial-bar"
          ? (
            <BarChart data={sanitizedData}>
              {config.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={config.xKey} />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke={config.config.colors?.[0] || COLOR_PALETTE[0]}
                width={80}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={config.config.colors?.[1] || COLOR_PALETTE[1]}
                width={80}
              />
              {config.config.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.config.showLegend && <Legend />}
              <Bar
                yAxisId="left"
                dataKey={config.yKeys[0]}
                fill={config.config.colors?.[0] || COLOR_PALETTE[0]}
                name={formatLabel(config.yKeys[0])}
              />
              {config.yKeys[1] && (
                <Bar
                  yAxisId="right"
                  dataKey={config.yKeys[1]}
                  fill={config.config.colors?.[1] || COLOR_PALETTE[1]}
                  name={formatLabel(config.yKeys[1])}
                />
              )}
            </BarChart>
          )
          : effectiveType === "line"
          ? (
            <LineChart data={sanitizedData}>
              {config.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey={config.xKey}
                angle={config.config.isTimeSeries ? -45 : 0}
                textAnchor={config.config.isTimeSeries ? "end" : "middle"}
                height={config.config.isTimeSeries ? 80 : 30}
              />
              <YAxis width={80} />
              {config.config.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.config.showLegend && <Legend />}
              {config.yKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={config.config.colors?.[idx] || COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={formatLabel(key)}
                />
              ))}
            </LineChart>
          )
          : effectiveType === "area"
          ? (
            <AreaChart data={sanitizedData}>
              {config.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey={config.xKey}
                angle={config.config.isTimeSeries ? -45 : 0}
                textAnchor={config.config.isTimeSeries ? "end" : "middle"}
                height={config.config.isTimeSeries ? 80 : 30}
              />
              <YAxis width={80} />
              {config.config.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.config.showLegend && <Legend />}
              {config.yKeys.map((key, idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  fill={config.config.colors?.[idx] || COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                  stroke={config.config.colors?.[idx] || COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                  fillOpacity={0.6}
                  stackId={config.config.stacked ? "stack" : undefined}
                  name={formatLabel(key)}
                />
              ))}
            </AreaChart>
          )
          : effectiveType === "area-fill-by-value"
          ? (
            <AreaChart data={sanitizedData}>
              {config.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey={config.xKey}
                angle={config.config.isTimeSeries ? -45 : 0}
                textAnchor={config.config.isTimeSeries ? "end" : "middle"}
                height={config.config.isTimeSeries ? 80 : 30}
              />
              <YAxis width={80} />
              {config.config.showTooltip && <Tooltip content={<CustomTooltip />} />}
              <defs>
                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="green" stopOpacity={1} />
                  <stop offset={gradientOffset} stopColor="green" stopOpacity={0.1} />
                  <stop offset={gradientOffset} stopColor="red" stopOpacity={0.1} />
                  <stop offset="1" stopColor="red" stopOpacity={1} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={config.yKeys[0]}
                stroke="#000"
                fill="url(#splitColor)"
                name={formatLabel(config.yKeys[0])}
              />
            </AreaChart>
          )
          : effectiveType === "funnel"
          ? (
            <FunnelChart>
              {config.config.showTooltip && <Tooltip content={<CustomTooltip />} />}
              <Funnel
                dataKey={config.yKeys[0]}
                data={sanitizedData.map((item, idx) => ({
                  ...item,
                  name: item[config.xKey],
                  value: item[config.yKeys[0]],
                  fill: config.config.colors?.[idx] || COLOR_PALETTE[idx % COLOR_PALETTE.length],
                }))}
              >
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          )
          : null}
      </ResponsiveContainer>
    </div>
  );
}
