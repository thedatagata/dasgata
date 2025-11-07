import { useState, useMemo } from "preact/hooks";

interface SimplePivotProps {
  data: any[];
  title: string;
}

export default function SimplePivot({ data, title }: SimplePivotProps) {
  const [groupBy, setGroupBy] = useState<string>("");
  const [aggregateCol, setAggregateCol] = useState<string>("");
  const [aggregateFunc, setAggregateFunc] = useState<"sum" | "avg" | "count">("count");

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  const numericColumns = useMemo(() => {
    if (data.length === 0) return [];
    const firstRow = data[0];
    return columns.filter(col => typeof firstRow[col] === 'number');
  }, [data, columns]);

  const pivotData = useMemo(() => {
    if (!groupBy || data.length === 0) return [];

    const grouped = new Map<string, any[]>();
    
    data.forEach(row => {
      const key = String(row[groupBy] || 'null');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    });

    const result = Array.from(grouped.entries()).map(([key, rows]) => {
      let value: number;

      if (aggregateFunc === "count") {
        value = rows.length;
      } else if (aggregateCol && numericColumns.includes(aggregateCol)) {
        const values = rows
          .map(r => r[aggregateCol])
          .filter(v => typeof v === 'number');
        
        if (aggregateFunc === "sum") {
          value = values.reduce((sum, v) => sum + v, 0);
        } else {
          value = values.length > 0 
            ? values.reduce((sum, v) => sum + v, 0) / values.length 
            : 0;
        }
      } else {
        value = rows.length;
      }

      return {
        [groupBy]: key,
        value: value,
        count: rows.length
      };
    });

    return result.sort((a, b) => b.value - a.value);
  }, [data, groupBy, aggregateCol, aggregateFunc, numericColumns]);

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-xl font-bold mb-4">{title}</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Group By
          </label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy((e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select column...</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Aggregate Function
          </label>
          <select
            value={aggregateFunc}
            onChange={(e) => setAggregateFunc((e.target as HTMLSelectElement).value as any)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="count">Count</option>
            <option value="sum">Sum</option>
            <option value="avg">Average</option>
          </select>
        </div>

        {aggregateFunc !== "count" && (
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Aggregate Column
            </label>
            <select
              value={aggregateCol}
              onChange={(e) => setAggregateCol((e.target as HTMLSelectElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select column...</option>
              {numericColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {groupBy && pivotData.length > 0 ? (
        <div class="overflow-x-auto">
          <table class="min-w-full border border-gray-300">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2 border text-left font-semibold">
                  {groupBy}
                </th>
                <th class="px-4 py-2 border text-right font-semibold">
                  {aggregateFunc === "count" 
                    ? "Count" 
                    : `${aggregateFunc}(${aggregateCol})`}
                </th>
                <th class="px-4 py-2 border text-right font-semibold text-gray-600">
                  # Rows
                </th>
              </tr>
            </thead>
            <tbody>
              {pivotData.map((row, idx) => (
                <tr key={idx} class="hover:bg-gray-50">
                  <td class="px-4 py-2 border">
                    {row[groupBy]}
                  </td>
                  <td class="px-4 py-2 border text-right font-medium">
                    {row.value.toFixed(2)}
                  </td>
                  <td class="px-4 py-2 border text-right text-gray-600 text-sm">
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="text-sm text-gray-500 mt-2">
            {pivotData.length} unique groups
          </p>
        </div>
      ) : (
        <div class="text-center py-8 text-gray-500">
          {groupBy ? "No data to display" : "Select a column to group by"}
        </div>
      )}
    </div>
  );
}