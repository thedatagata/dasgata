// islands/smarter_dashboard/PivotBuilder.tsx
import { useEffect, useState } from "preact/hooks";

interface PivotBuilderProps {
  data: any[];
  availableColumns: string[];
}

export function PivotBuilder({ data, availableColumns }: PivotBuilderProps) {
  const [rowDimensions, setRowDimensions] = useState<string[]>([]);
  const [columnDimensions, setColumnDimensions] = useState<string[]>([]);
  const [measures, setMeasures] = useState<string[]>([]);
  const [pivotedData, setPivotedData] = useState<any[]>([]);

  // Auto-detect numeric columns as measures
  useEffect(() => {
    if (data.length > 0 && measures.length === 0) {
      const numericCols = availableColumns.filter((col) => typeof data[0][col] === "number");
      if (numericCols.length > 0) {
        setMeasures([numericCols[0]]);
      }
    }
  }, [data, availableColumns]);

  // Auto-detect first non-numeric as row dimension
  useEffect(() => {
    if (data.length > 0 && rowDimensions.length === 0) {
      const firstNonNumeric = availableColumns.find((col) => typeof data[0][col] !== "number");
      if (firstNonNumeric) {
        setRowDimensions([firstNonNumeric]);
      }
    }
  }, [data, availableColumns]);

  // Perform pivot transformation
  useEffect(() => {
    if (data.length === 0 || measures.length === 0) {
      setPivotedData(data);
      return;
    }

    // If no dimensions selected, just show raw data with selected measures
    if (rowDimensions.length === 0 && columnDimensions.length === 0) {
      setPivotedData(data.map((row) => {
        const filtered: any = {};
        measures.forEach((m) => filtered[m] = row[m]);
        return filtered;
      }));
      return;
    }

    // Simple grouping if only row dimensions (no pivoting)
    if (columnDimensions.length === 0) {
      const grouped = new Map();

      data.forEach((row) => {
        const key = rowDimensions.map((d) => row[d]).join("|");
        if (!grouped.has(key)) {
          const newRow: any = {};
          rowDimensions.forEach((d) => newRow[d] = row[d]);
          measures.forEach((m) => newRow[m] = 0);
          grouped.set(key, { row: newRow, count: 0 });
        }

        const entry = grouped.get(key);
        measures.forEach((m) => {
          entry.row[m] += row[m] || 0;
        });
        entry.count++;
      });

      setPivotedData(Array.from(grouped.values()).map((v) => v.row));
      return;
    }

    // Full pivot with column dimensions
    const pivotMap = new Map();
    const columnValues = new Set<string>();

    data.forEach((row) => {
      const rowKey = rowDimensions.map((d) => row[d]).join("|");
      const colKey = columnDimensions.map((d) => row[d]).join("|");

      columnValues.add(colKey);

      if (!pivotMap.has(rowKey)) {
        const newRow: any = {};
        rowDimensions.forEach((d) => newRow[d] = row[d]);
        pivotMap.set(rowKey, newRow);
      }

      const pivotRow = pivotMap.get(rowKey);
      measures.forEach((m) => {
        const pivotKey = `${colKey}_${m}`;
        pivotRow[pivotKey] = (pivotRow[pivotKey] || 0) + (row[m] || 0);
      });
    });

    setPivotedData(Array.from(pivotMap.values()));
  }, [data, rowDimensions, columnDimensions, measures]);

  const toggleDimension = (col: string, type: "row" | "column") => {
    if (type === "row") {
      setRowDimensions((prev) =>
        prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
      );
    } else {
      setColumnDimensions((prev) =>
        prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
      );
    }
  };

  const toggleMeasure = (col: string) => {
    setMeasures((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]);
  };

  const exportCSV = () => {
    if (pivotedData.length === 0) return;

    const headers = Object.keys(pivotedData[0]);
    const csvContent = [
      headers.join(","),
      ...pivotedData.map((row) => headers.map((h) => row[h]).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pivot_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div class="space-y-4">
      {/* Configuration Panel */}
      <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Pivot Configuration</h3>

        <div class="grid grid-cols-3 gap-4">
          {/* Row Dimensions */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Row Groupings
            </label>
            <div class="flex flex-wrap gap-1">
              {availableColumns.map((col) => (
                <button
                  key={col}
                  onClick={() => toggleDimension(col, "row")}
                  class={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    rowDimensions.includes(col)
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          {/* Column Dimensions */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Column Pivot
            </label>
            <div class="flex flex-wrap gap-1">
              {availableColumns.map((col) => (
                <button
                  key={col}
                  onClick={() => toggleDimension(col, "column")}
                  class={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    columnDimensions.includes(col)
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          {/* Measures */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Values
            </label>
            <div class="flex flex-wrap gap-1">
              {availableColumns.map((col) => (
                <button
                  key={col}
                  onClick={() => toggleMeasure(col)}
                  class={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    measures.includes(col)
                      ? "bg-green-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-gray-900">
            Pivot Table ({pivotedData.length} rows)
          </h4>
          <button
            onClick={exportCSV}
            class="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-medium transition-colors"
          >
            Export CSV
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-xs border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                {pivotedData.length > 0 && Object.keys(pivotedData[0]).map((key) => (
                  <th
                    key={key}
                    class="px-3 py-2 text-left font-medium text-gray-700 uppercase tracking-wide"
                  >
                    {key.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pivotedData.map((row, idx) => (
                <tr key={idx} class={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {Object.values(row).map((val, i) => (
                    <td key={i} class="px-3 py-2 text-gray-900 border-b border-gray-100">
                      {typeof val === "number" ? val.toLocaleString() : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
