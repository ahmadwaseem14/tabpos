'use client';

import React from 'react';

interface BarcodeProps {
  value: string; // The IMEI or serial number
  height?: number;
  width?: number;
  showText?: boolean;
}

// Code 39 binary pattern mapping
// 1 = bar, 0 = space.
const PATTERNS: Record<string, string> = {
  '0': '101001101101',
  '1': '110100101011',
  '2': '101100101011',
  '3': '110110010101',
  '4': '101001100111',
  '5': '1101001100101',
  '6': '1011001100101',
  '7': '101001001111',
  '8': '1101001001101',
  '9': '1011001001101',
  'A': '110101001011',
  'B': '101101001011',
  'C': '110110100101',
  'D': '101011001011',
  'E': '110101100101',
  'F': '101101100101',
  'G': '101010011011',
  'H': '110101001101',
  'I': '101101001101',
  'J': '101011001101',
  'K': '110101010011',
  'L': '101101010011',
  'M': '110110101001',
  'N': '101011010011',
  'O': '110101101001',
  'P': '101101101001',
  'Q': '101010110011',
  'R': '110101011001',
  'S': '101101011001',
  'T': '101011011001',
  'U': '111010101011',
  'V': '101110101011',
  'W': '1110111010101',
  'X': '1011101110101',
  'Y': '1110101110101',
  'Z': '1011101011101',
  '-': '1011101010111',
  '.': '111011101011101',
  ' ': '1011101110111',
  '*': '100101101101', // Start & Stop characters
  '$': '100100100101',
  '/': '100100101001',
  '+': '100101001001',
  '%': '101001001001'
};

export default function Barcode({ value, height = 50, width = 2, showText = true }: BarcodeProps) {
  // Clean string and wrap with start/stop characters
  const cleanVal = value.toUpperCase().trim();
  const barcodeString = `*${cleanVal}*`;

  // Compile characters into single binary string
  let binaryString = '';
  for (let i = 0; i < barcodeString.length; i++) {
    const char = barcodeString[i];
    const pattern = PATTERNS[char];
    if (pattern) {
      binaryString += pattern + '0'; // Inter-character gap space
    }
  }

  if (!binaryString) {
    return <span className="text-muted" style={{ fontSize: '0.8rem' }}>Invalid data</span>;
  }

  // Draw bars
  const bars: React.ReactNode[] = [];
  let currentBarWidth = 0;
  let drawX = 0;
  
  for (let i = 0; i < binaryString.length; i++) {
    const bit = binaryString[i];
    
    if (bit === '1') {
      currentBarWidth += width;
    } else {
      if (currentBarWidth > 0) {
        bars.push(
          <rect
            key={i}
            x={drawX - currentBarWidth}
            y={0}
            width={currentBarWidth}
            height={height}
            fill="currentColor"
          />
        );
        currentBarWidth = 0;
      }
      drawX += width;
    }
    
    if (bit === '1') {
      drawX += width;
    }
  }

  // Draw any remaining hanging bar
  if (currentBarWidth > 0) {
    bars.push(
      <rect
        key="last"
        x={drawX - currentBarWidth}
        y={0}
        width={currentBarWidth}
        height={height}
        fill="currentColor"
      />
    );
  }

  const svgWidth = drawX + width;
  const svgHeight = height + (showText ? 20 : 0);

  return (
    <div className="barcode-box">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="100%"
        style={{ color: 'var(--foreground)' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>{bars}</g>
        {showText && (
          <text
            x={svgWidth / 2}
            y={height + 15}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="currentColor"
            letterSpacing="2"
          >
            {cleanVal}
          </text>
        )}
      </svg>
      <style jsx>{`
        .barcode-box {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
          color: inherit;
        }
      `}</style>
    </div>
  );
}
