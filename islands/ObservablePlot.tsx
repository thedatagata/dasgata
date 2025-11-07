import { useEffect, useRef } from "preact/hooks";
import * as Plot from "@observablehq/plot";

interface ObservablePlotProps {
  data: any[];
  spec: any;
  title?: string;
}

export default function ObservablePlot({ data, spec, title }: ObservablePlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Clear previous plot
    containerRef.current.innerHTML = "";

    // Create plot specification with data
    const plotSpec = {
      ...spec,
      marks: spec.marks.map((mark: any) => 
        typeof mark === 'function' ? mark(data) : mark
      )
    };

    // Generate and append the plot
    const plot = Plot.plot(plotSpec);
    containerRef.current.appendChild(plot);

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [data, spec]);

  return (
    <div class="bg-white rounded-lg shadow p-4">
      {title && <h3 class="text-lg font-semibold mb-4">{title}</h3>}
      <div ref={containerRef} class="w-full overflow-x-auto"></div>
    </div>
  );
}
