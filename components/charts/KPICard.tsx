// components/charts/RechartsWrapper.tsx
// components/charts/KPICard.tsx
interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: "currency" | "percentage" | "number";
  decimals?: number;
  description?: string;
  loading?: boolean;
}

export default function KPICard({
  title,
  value,
  previousValue,
  format = "number",
  decimals = 0,
  description,
  loading = false,
}: KPICardProps) {
  console.log(`KPICard [${title}]:`, {
    value,
    valueType: typeof value,
    previousValue,
    previousValueType: typeof previousValue,
    format,
    decimals,
  });

  const formatValue = (val: number | bigint): string => {
    console.log(`Formatting value for ${title}:`, val, typeof val);
    // Convert BigInt to Number for formatting
    let numVal = typeof val === "bigint" ? Number(val) : val;

    // Abbreviate large numbers
    if (format === "currency" || format === "number") {
      if (Math.abs(numVal) >= 1e12) {
        numVal = numVal / 1e12;
        const suffix = "T";
        return format === "currency"
          ? `$${numVal.toFixed(1)}${suffix}`
          : `${numVal.toFixed(1)}${suffix}`;
      } else if (Math.abs(numVal) >= 1e9) {
        numVal = numVal / 1e9;
        const suffix = "B";
        return format === "currency"
          ? `$${numVal.toFixed(1)}${suffix}`
          : `${numVal.toFixed(1)}${suffix}`;
      } else if (Math.abs(numVal) >= 1e6) {
        numVal = numVal / 1e6;
        const suffix = "M";
        return format === "currency"
          ? `$${numVal.toFixed(1)}${suffix}`
          : `${numVal.toFixed(1)}${suffix}`;
      }
    }

    if (format === "currency") {
      return `$${
        numVal.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      }`;
    } else if (format === "percentage") {
      return `${numVal.toFixed(decimals)}%`;
    } else {
      return val.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
  };

  const calculateChange = (): { percentage: number; isPositive: boolean } | null => {
    if (previousValue === undefined || previousValue === 0) return null;

    // Convert BigInt to Number for math operations
    const currentVal = typeof value === "bigint" ? Number(value) : value;
    const prevVal = typeof previousValue === "bigint" ? Number(previousValue) : previousValue;

    const change = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
    return {
      percentage: Math.abs(change),
      isPositive: change >= 0,
    };
  };

  const change = calculateChange();

  if (loading) {
    return (
      <div class="bg-white rounded-lg shadow p-6 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div class="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div class="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div class="flex flex-col h-full">
        {/* Title */}
        <h3 class="text-sm font-medium text-gray-600 mb-2">{title}</h3>

        {/* Value & Change */}
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-3xl font-bold text-gray-900">
            {formatValue(value)}
          </span>

          {change && (
            <div
              class={`flex items-center gap-1 text-sm font-medium ${
                change.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              <span class="text-lg">
                {change.isPositive ? "↑" : "↓"}
              </span>
              <span>{change.percentage.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Description */}
        {description && <p class="text-xs text-gray-500 mt-auto">{description}</p>}
      </div>
    </div>
  );
}
