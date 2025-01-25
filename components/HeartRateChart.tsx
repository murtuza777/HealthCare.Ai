'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function HeartRateChart() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        // Destroy existing chart
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        // Sample data
        const data = {
          labels: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
          datasets: [
            {
              label: 'Heart Rate (BPM)',
              data: [72, 75, 78, 74, 72, 76],
              borderColor: 'rgb(239, 68, 68)',
              tension: 0.4,
              fill: false,
            },
          ],
        };

        // Create new chart
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: data,
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Heart Rate Trend',
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                min: 50,
                max: 100,
              },
            },
          },
        });
      }
    }

    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="w-full h-64">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
