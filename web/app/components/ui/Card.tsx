import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Card = ({ 
  title, 
  value, 
  icon: Icon, 
  iconWrapperClass = "bg-indigo-50 text-indigo-600",
  trend, 
  trendDirection = "up", 
  trendColorClass = "text-emerald-600",
  description
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-slate-500">
          {title}
        </h3>
        <div className={`rounded-lg p-2 ${iconWrapperClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
          {trend && (
            <span className={`${trendColorClass} flex items-center font-medium`}>
              {trendDirection === 'down' ? (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              )}
              {trend}
            </span>
          )}
          {description}
        </p>
      </div>
    </div>
  );
};

export default Card;