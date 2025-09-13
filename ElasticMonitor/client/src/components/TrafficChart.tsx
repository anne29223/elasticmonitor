import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';

interface TrafficChartProps {
  data: Array<{ timestamp: string; inbound: number; outbound: number }>;
}

export default function TrafficChart({ data }: TrafficChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: 'Inbound',
            data: data.map(d => d.inbound),
            borderColor: 'hsl(217, 91%, 60%)',
            backgroundColor: 'hsla(217, 91%, 60%, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Outbound',
            data: data.map(d => d.outbound),
            borderColor: 'hsl(142, 76%, 36%)',
            backgroundColor: 'hsla(142, 76%, 36%, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: {
              color: 'hsl(220, 10%, 18%)',
            },
            ticks: {
              color: 'hsl(220, 5%, 65%)',
            },
          },
          y: {
            grid: {
              color: 'hsl(220, 10%, 18%)',
            },
            ticks: {
              color: 'hsl(220, 5%, 65%)',
            },
          },
        },
        elements: {
          point: {
            radius: 0,
            hoverRadius: 4,
          },
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div className="chart-container rounded-lg p-6" data-testid="traffic-chart">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Traffic Over Time</h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>Inbound</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Outbound</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        <canvas ref={chartRef} data-testid="traffic-chart-canvas"></canvas>
      </div>
    </div>
  );
}
