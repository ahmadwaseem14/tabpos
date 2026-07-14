'use client';

import React, { useEffect, useRef } from 'react';

interface Dataset {
  label: string;
  data: number[];
  color: string;
}

interface ChartProps {
  labels: string[];
  datasets: Dataset[];
  type: 'line' | 'bar';
  height?: number;
}

export default function Chart({ labels, datasets, type, height = 200 }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const allValues = datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allValues, 1);
    const minVal = Math.min(...allValues, 0);
    const range = maxVal - minVal || 1;

    const paddingTop = 20;
    const paddingBottom = 40;
    const paddingLeft = 60;
    const paddingRight = 20;
    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    // Detect dark mode
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

    ctx.clearRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();

      // Y axis labels
      const val = maxVal - (range / gridLines) * i;
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0), paddingLeft - 6, y + 4);
    }

    // X axis labels
    const barTotalWidth = chartW / labels.length;
    labels.forEach((label, i) => {
      const x = paddingLeft + barTotalWidth * i + barTotalWidth / 2;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.font = '10px Inter, system-ui';
      ctx.fillText(label, x, h - 10);
    });

    datasets.forEach((dataset, di) => {
      const points = dataset.data.map((val, i) => ({
        x: paddingLeft + barTotalWidth * i + barTotalWidth / 2,
        y: paddingTop + chartH - ((val - minVal) / range) * chartH
      }));

      if (type === 'line') {
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartH);
        gradient.addColorStop(0, dataset.color + '40');
        gradient.addColorStop(1, dataset.color + '05');

        ctx.beginPath();
        ctx.moveTo(points[0].x, paddingTop + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, paddingTop + chartH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Dots
        points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = dataset.color;
          ctx.fill();
          ctx.strokeStyle = isDark ? '#1a1a2e' : '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      } else {
        // Bar chart
        const barCount = datasets.length;
        const groupWidth = barTotalWidth * 0.8;
        const barW = groupWidth / barCount;
        const offset = di * barW - groupWidth / 2;

        dataset.data.forEach((val, i) => {
          const x = paddingLeft + barTotalWidth * i + barTotalWidth / 2 + offset;
          const barH = ((val - minVal) / range) * chartH;
          const y = paddingTop + chartH - barH;
          const radius = 4;

          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barW - radius, y);
          ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
          ctx.lineTo(x + barW, y + barH);
          ctx.lineTo(x, y + barH);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fillStyle = dataset.color;
          ctx.fill();
        });
      }
    });

    // Legend
    const legendY = h - 8;
    let legendX = paddingLeft;
    datasets.forEach(d => {
      ctx.fillStyle = d.color;
      ctx.fillRect(legendX, legendY - 8, 10, 10);
      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.font = '10px Inter, system-ui';
      ctx.fillText(d.label, legendX + 14, legendY);
      legendX += ctx.measureText(d.label).width + 30;
    });
  }, [labels, datasets, type, height]);

  return (
    <div style={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px`, display: 'block' }} />
    </div>
  );
}
