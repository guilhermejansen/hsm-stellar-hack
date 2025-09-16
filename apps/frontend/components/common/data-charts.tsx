'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

/**
 * Data Visualization Components
 * 
 * Corporate-styled charts for executive dashboards and analytics
 */

const CORPORATE_COLORS = {
  stellar: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  corporate: '#64748b',
  light: '#f8fafc',
  dark: '#0f172a',
};

// Custom tooltip for dark mode compatibility
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-corporate-800 p-3 rounded-lg shadow-lg border border-corporate-200 dark:border-corporate-600">
      <p className="text-sm font-medium text-corporate-900 dark:text-corporate-100">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm text-corporate-600 dark:text-corporate-300">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          {entry.value}
        </p>
      ))}
    </div>
  );
};

// Wallet Distribution Pie Chart
export function WalletDistributionChart({ data }: { data: any }) {
  const chartData = [
    {
      name: 'Cold Wallet',
      value: parseFloat(data?.cold?.percentage || 95),
      color: CORPORATE_COLORS.stellar,
      balance: data?.cold?.balance || '0',
    },
    {
      name: 'Hot Wallet', 
      value: parseFloat(data?.hot?.percentage || 5),
      color: CORPORATE_COLORS.warning,
      balance: data?.hot?.balance || '0',
    },
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Transaction Volume Chart
export function TransactionVolumeChart({ data }: { data: any[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-corporate-200 dark:stroke-corporate-700" />
          <XAxis 
            dataKey="date" 
            className="text-corporate-600 dark:text-corporate-300"
          />
          <YAxis className="text-corporate-600 dark:text-corporate-300" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="volume"
            stroke={CORPORATE_COLORS.stellar}
            fill={CORPORATE_COLORS.stellar}
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Guardian Activity Chart
export function GuardianActivityChart({ data }: { data: any[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-corporate-200 dark:stroke-corporate-700" />
          <XAxis 
            dataKey="guardian" 
            className="text-corporate-600 dark:text-corporate-300"
          />
          <YAxis className="text-corporate-600 dark:text-corporate-300" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="approvals" fill={CORPORATE_COLORS.success} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// System Performance Chart
export function SystemPerformanceChart({ data }: { data: any[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-corporate-200 dark:stroke-corporate-700" />
          <XAxis 
            dataKey="time" 
            className="text-corporate-600 dark:text-corporate-300"
          />
          <YAxis className="text-corporate-600 dark:text-corporate-300" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="latency"
            stroke={CORPORATE_COLORS.stellar}
            strokeWidth={2}
            dot={{ fill: CORPORATE_COLORS.stellar, strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="successRate"
            stroke={CORPORATE_COLORS.success}
            strokeWidth={2}
            dot={{ fill: CORPORATE_COLORS.success, strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Privacy Score Gauge Chart
export function PrivacyScoreGauge({ score }: { score: number }) {
  const data = [
    { name: 'Score', value: score, color: CORPORATE_COLORS.success },
    { name: 'Remaining', value: 100 - score, color: CORPORATE_COLORS.light },
  ];

  return (
    <div className="h-48 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={90}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-success-700 dark:text-success-400">
            {score}%
          </div>
          <div className="text-sm text-corporate-600 dark:text-corporate-300">
            Privacy Score
          </div>
        </div>
      </div>
    </div>
  );
}