import { useEffect, useRef } from "preact/hooks";
import * as Plot from "@observablehq/plot";

interface ObservablePlotProps {
  data: any[];
  chartType: 'line' | 'bar';
  metric: string;
  timeseries?: string;
  timeGranularity?: 'day' | 'week' | 'month';
  dimensions?: string[];
}

export default function ObservablePlot({ 
  data, 
  chartType, 
  metric, 
  timeseries, 
  timeGranularity = 'day',
  dimensions = [] 
}: ObservablePlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0 || !metric) return;

    containerRef.current.innerHTML = "";

    // Process data: convert BigInt and DuckDB dates
    let processedData = data.map(row => {
      const newRow: any = {};
      for (const [key, val] of Object.entries(row)) {
        if (typeof val === 'bigint') {
          newRow[key] = Number(val);
        } else if (val && typeof val === 'object' && 'days' in val) {
          // DuckDB date: days since epoch (1970-01-01)
          newRow[key] = new Date((val as any).days * 24 * 60 * 60 * 1000);
        } else {
          newRow[key] = val;
        }
      }
      return newRow;
    });
    if (timeseries) {
      processedData = processedData.map(row => {
        const date = new Date(row[timeseries]);
        let formattedDate;
        
        switch (timeGranularity) {
          case 'week':
            const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
            formattedDate = new Date(week * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case 'month':
            formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
            break;
          default: // day
            formattedDate = date.toISOString().split('T')[0];
        }
        
        return {
          ...row,
          [timeseries + '_formatted']: formattedDate
        };
      });
    }

    const timeCol = timeseries ? timeseries + '_formatted' : undefined;
    const dim1 = dimensions[0];
    const dim2 = dimensions[1];

    let marks: any[] = [];

    if (chartType === 'line') {
      // Line chart
      if (timeCol) {
        marks.push(
          Plot.lineY(processedData, {
            x: timeCol,
            y: metric,
            stroke: dim1 || undefined,
            tip: true
          })
        );
      } else {
        marks.push(
          Plot.lineY(processedData, {
            x: dim1 || 'index',
            y: metric,
            tip: true
          })
        );
      }
    } else {
      // Bar chart
      if (timeCol && !dim1) {
        // Time-based bar chart
        marks.push(
          Plot.barY(processedData, {
            x: timeCol,
            y: metric,
            fill: "#90C137",
            tip: true
          })
        );
      } else if (dim1 && !dim2) {
        // Single dimension bar chart
        marks.push(
          Plot.barY(processedData, {
            x: dim1,
            y: metric,
            fill: "#90C137",
            tip: true
          })
        );
      } else if (dim1 && dim2) {
        // Stacked or grouped bar chart
        marks.push(
          Plot.barY(processedData, {
            x: dim1,
            y: metric,
            fill: dim2,
            tip: true
          })
        );
      }
    }

    const plot = Plot.plot({
      marks,
      marginBottom: 50,
      x: { label: timeCol || dim1 || 'X', tickRotate: -45 },
      y: { label: metric, grid: true },
      color: dim1 ? { legend: true } : undefined
    });

    containerRef.current.appendChild(plot);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [data, chartType, metric, timeseries, timeGranularity, dimensions]);

  return (
    <div class="bg-white rounded-lg shadow p-4">
      <div ref={containerRef} class="w-full overflow-x-auto"></div>
    </div>
  );
}
