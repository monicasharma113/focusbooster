import { useEffect, useRef } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface ChartProps {
  data: { name: string; value: number }[];
  type: 'pie' | 'bar';
  xKey: string;
  yKey: string;
  title?: string;
}

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

// Format time for tooltip
const formatTime = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

export default function AnalyticsChart({ data, type, xKey, yKey, title }: ChartProps) {
  // No data case
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      
      <ResponsiveContainer width="100%" height="100%">
        {type === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              dataKey={yKey}
              nameKey={xKey}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatTime(value)}
              labelFormatter={(name) => `${name}`}
            />
            <Legend />
          </PieChart>
        ) : (
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xKey} 
              angle={-45} 
              textAnchor="end" 
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => formatTime(value)}
              labelFormatter={(name) => `${name}`}
            />
            <Bar dataKey={yKey}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
