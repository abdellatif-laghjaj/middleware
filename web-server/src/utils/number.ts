/**
 * Formats a number with commas as thousands separators
 * @param value The number to format
 * @param options Formatting options
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | undefined, 
  options: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
    compactDisplay?: 'short' | 'long';
  } = {}
): string => {
  if (value === undefined || value === null) return 'N/A';
  
  const { 
    maximumFractionDigits = 0, 
    minimumFractionDigits = 0,
    notation = 'standard',
    compactDisplay = 'short'
  } = options;
  
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits,
    notation,
    compactDisplay
  }).format(value);
}; 