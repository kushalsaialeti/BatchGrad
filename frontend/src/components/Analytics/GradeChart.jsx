import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';
import { Download } from 'lucide-react';
import { CHART_COLORS, GRADE_ORDER } from '../../constants';

const GradeChart = ({ analytics, onDownload }) => {
  const [selectedCourse, setSelectedCourse] = useState("ALL");

  if (!analytics) return null;

  const formatChartData = () => {
    const sourceData = selectedCourse === "ALL"
      ? analytics.gradeDistribution
      : analytics.courseGradeDistributions[selectedCourse] || {};

    return Object.entries(sourceData)
      .map(([grade, count]) => ({ grade, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
  };

  const chartData = formatChartData();

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-200">Volume Matrix</h3>
          <div className="flex items-center gap-2 mt-1">
            <select
              className="bg-black/50 border border-white/10 text-xs text-gray-300 rounded px-2 py-1 outline-none"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="ALL">All Subjects Combined</option>
              {Object.keys(analytics.courseGradeDistributions).map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg ext-indigo-300">
            <span className="text-sm font-medium text-indigo-400">Total Entries: </span>
            <span className="font-mono font-bold text-white text-lg ml-1">
              {chartData.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>

          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export Matrix (XLSX)
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="grade"
              stroke="#ffffff40"
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="#ffffff40"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#ffffff05' }}
              contentStyle={{
                backgroundColor: '#171717',
                border: '1px solid #333',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GradeChart;
