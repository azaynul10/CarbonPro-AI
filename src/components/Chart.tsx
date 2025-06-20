import React from 'react';

const Chart: React.FC = () => {
  const data = [
    { month: 'Jan', value: 2.8 },
    { month: 'Feb', value: 2.6 },
    { month: 'Mar', value: 2.4 },
    { month: 'Apr', value: 2.3 },
    { month: 'May', value: 2.1 },
    { month: 'Jun', value: 2.0 }
  ];

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-full space-x-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div 
              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all duration-300 hover:from-green-600 hover:to-green-500"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            ></div>
            <div className="mt-2 text-xs text-gray-600 font-medium">
              {item.month}
            </div>
            <div className="text-xs text-gray-500">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Chart;