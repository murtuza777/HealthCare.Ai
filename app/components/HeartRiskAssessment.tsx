'use client';

import { Card, Title, DonutChart, Legend } from "@tremor/react";
import { motion } from "framer-motion";

interface RiskFactor {
  name: string;
  value: number;
  color: string;
}

interface HeartRiskAssessmentProps {
  riskFactors: RiskFactor[];
}

export default function HeartRiskAssessment({ riskFactors }: HeartRiskAssessmentProps) {
  // Calculate overall risk as average of all risk factors
  const overallRisk = Math.round(
    riskFactors.reduce((acc, factor) => acc + factor.value, 0) / riskFactors.length
  );

  const getRiskLevel = (risk: number) => {
    if (risk <= 30) return 'Low Risk';
    if (risk <= 60) return 'Moderate Risk';
    return 'High Risk';
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 30) return 'text-green-500';
    if (risk <= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <Title>Heart Risk Assessment</Title>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-gray-600">Overall Risk Level</p>
              <p className={`text-2xl font-bold ${getRiskColor(overallRisk)}`}>
                {getRiskLevel(overallRisk)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Risk Score</p>
              <p className={`text-2xl font-bold ${getRiskColor(overallRisk)}`}>
                {overallRisk}%
              </p>
            </div>
          </div>

          <div className="mt-8">
            <DonutChart
              data={riskFactors}
              category="value"
              index="name"
              colors={riskFactors.map(rf => rf.color)}
              showAnimation={true}
              valueFormatter={(value) => `${value}%`}
            />
          </div>

          <div className="mt-8">
            <Legend
              categories={riskFactors.map(rf => rf.name)}
              colors={riskFactors.map(rf => rf.color)}
            />
          </div>

          <div className="mt-6 space-y-4">
            {riskFactors.map((factor) => (
              <div key={factor.name} className="flex justify-between items-center">
                <span className="text-gray-600">{factor.name}</span>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-24 bg-gray-200 rounded-full overflow-hidden`}>
                    <div
                      className={`h-full rounded-full`}
                      style={{
                        width: `${factor.value}%`,
                        backgroundColor: factor.color,
                      }}
                    />
                  </div>
                  <span className={`text-sm font-medium`} style={{ color: factor.color }}>
                    {factor.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
