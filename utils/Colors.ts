export const colors = [
  ['#FF6B6B', '#4ECDC4'], // Red to Teal
  ['#45B7D1', '#96CEB4'], // Blue to Green
  ['#FECA57', '#FF9FF3'], // Yellow to Pink  
  ['#54A0FF', '#5F27CD'], // Light Blue to Purple
  ['#00D2D3', '#54A0FF'], // Cyan to Blue
  ['#FF9F43', '#FECA57'], // Orange to Yellow
  ['#5F27CD', '#00D2D3'], // Purple to Cyan
  ['#10AC84', '#1DD1A1'], // Green variants
  ['#F79F1F', '#EA2027'], // Orange to Red
  ['#006BA6', '#0496C7'], // Blue variants
  ['#E17055', '#74B9FF'], // Coral to Sky Blue
  ['#A29BFE', '#FD79A8'], // Lavender to Pink
  ['#FDCB6E', '#6C5CE7'], // Golden to Purple
  ['#55A3FF', '#FF7675'], // Azure to Red
  ['#00B894', '#FDCB6E'], // Mint to Gold
  ['#E84393', '#0984E3'], // Magenta to Blue
  ['#00CEC9', '#FF7675'], // Turquoise to Coral
  ['#A29BFE', '#55EFC4'], // Purple to Mint
  ['#FD79A8', '#FDCB6E'], // Pink to Yellow
  ['#74B9FF', '#81ECEC'], // Blue to Cyan
  ['#FF7675', '#00B894'], // Red to Green
  ['#6C5CE7', '#FFA502'], // Purple to Orange
  ['#00CEC9', '#E17055'], // Teal to Terracotta
  ['#FDCB6E', '#E84393'], // Gold to Pink
  ['#55EFC4', '#74B9FF'], // Mint to Blue
];

// Generate consistent gradient colors based on show name
export const generateGradientColors = (showName: string): [string, string] => {
  // Use show name to consistently pick same colors
  let hash = 0;
  for (let i = 0; i < showName.length; i++) {
    const char = showName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate much darker versions of the colors for backgrounds
export const generateDarkGradientColors = (showName: string): [string, string] => {
  const [originalStart, originalEnd] = generateGradientColors(showName);
  
  // Function to convert hex to RGB and darken significantly
  const darkenColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Darken to about 15% of original brightness
    const darkenedR = Math.floor(r * 0.15);
    const darkenedG = Math.floor(g * 0.15);
    const darkenedB = Math.floor(b * 0.15);
    
    return `rgb(${darkenedR}, ${darkenedG}, ${darkenedB})`;
  };
  
  return [darkenColor(originalStart), darkenColor(originalEnd)];
};
