// components/KPICard.tsx
import { useEffect, useRef } from "preact/hooks";

interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'currency' | 'percentage' | 'number';
  decimals?: number;
  description?: string;
  loading?: boolean;
}

export default function KPICard({
  title,
  value,
  previousValue,
  format = 'number',
  decimals = 0,
  description,
  loading = false
}: KPICardProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || loading || typeof window === 'undefined') return;

    const numberConfig: any = {};
    if (format === 'currency') {
      numberConfig.prefix = '$';
      numberConfig.valueformat = `,.${decimals}f`;
    } else if (format === 'percentage') {
      numberConfig.suffix = '%';
      numberConfig.valueformat = `.${decimals}f`;
    } else {
      numberConfig.valueformat = `,.${decimals}f`;
    }

    const data: any = [{
      type: 'indicator',
      mode: previousValue !== undefined ? 'number+delta' : 'number',
      value: value,
      number: numberConfig,
      delta: previousValue !== undefined ? {
        reference: previousValue,
        relative: true,
        valueformat: '.1%',
        increasing: { color: 'rgb(34, 197, 94)' },
        decreasing: { color: 'rgb(239, 68, 68)' }
      } : undefined,
      domain: { x: [0, 1], y: [0, 1] },
      title: {
        text: `<b>${title}</b>${description ? `<br><span style='font-size:0.8em;color:gray'>${description}</span>` : ''}`,
        font: { size: 14 }
      }
    }];

    const layout = {
      paper_bgcolor: 'white',
      margin: { t: 60, r: 20, l: 20, b: 20 },
      height: 200,
      font: { family: 'Inter, sans-serif' }
    };

    // @ts-ignore
    if (window.Plotly) {
      // @ts-ignore
      window.Plotly.react(chartRef.current, data, layout, { displayModeBar: false });
    }
  }, [value, previousValue, format, decimals, title, description, loading]);

  if (loading) {
    return (
      <div class="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div class="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div ref={chartRef} style={{ height: '200px' }} />
    </div>
  );
}
