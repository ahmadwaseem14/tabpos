/**
 * Formats a number as a currency string in Pakistani Rupees (PKR)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Rs. 0';
  return `Rs. ${value.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a Date object or ISO date string into a readable format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a Date object or ISO date string into a precise datetime string
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Exports data to a CSV file and triggers a browser download
 */
export function exportToCSV(filename: string, headers: string[], rows: any[][]) {
  const content = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        if (val === null || val === undefined) return '""';
        const strVal = String(val).replace(/"/g, '""');
        return strVal.includes(',') || strVal.includes('\n') || strVal.includes('"') 
          ? `"${strVal}"` 
          : strVal;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
