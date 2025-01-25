'use client';

import { Card, Text, Metric, Color } from "@tremor/react";
import { IconType } from "react-icons";
import { motion } from "framer-motion";

interface HealthMetricsCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  color: Color;
  trend?: number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
}

export default function HealthMetricsCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  unit,
  status = 'normal'
}: HealthMetricsCardProps) {
  const statusColors = {
    normal: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        decoration="top"
        decorationColor={color}
        className="hover:shadow-lg transition-shadow duration-200"
      >
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-full bg-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-500`} />
          </div>
          <div className="flex-grow">
            <Text>{title}</Text>
            <div className="flex items-baseline space-x-2">
              <Metric>{value}</Metric>
              {unit && <Text className="text-gray-500">{unit}</Text>}
            </div>
            {trend !== undefined && (
              <div className={`text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last reading
              </div>
            )}
            {status && (
              <Text className={statusColors[status]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
