/**
 * Color mapping for hazard types using Buddywise brand colors
 * Returns HSL color strings for consistent theming
 */

export const getHazardColor = (hazard: string): string => {
  const hazardLower = hazard.toLowerCase();
  
  // Buddywise specific color mappings (case-insensitive substring match)
  if (hazardLower.includes('obstructed') && hazardLower.includes('vehicle')) {
    return 'hsl(32, 100%, 27%)'; // #8A5B00 - Dark Orange/Brown
  }
  
  if (hazardLower.includes('vehicle') && hazardLower.includes('near')) {
    return 'hsl(32, 100%, 27%)'; // #8A5B00 - Dark Orange/Brown
  }
  
  if (hazardLower.includes('obstructed') && hazardLower.includes('pedestrian')) {
    return 'hsl(267, 45%, 60%)'; // #9163CB - Purple
  }
  
  if (hazardLower.includes('ppe') || hazardLower.includes('overall')) {
    return 'hsl(167, 78%, 40%)'; // #118C7B - Teal
  }
  
  if (hazardLower.includes('person') && hazardLower.includes('near')) {
    return 'hsl(142, 69%, 58%)'; // Buddywise Green
  }
  
  // Generate deterministic hash-based color for unknown hazards
  let hash = 0;
  for (let i = 0; i < hazard.length; i++) {
    hash = hazard.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
};

export const CHART_COLORS = {
  primary: 'hsl(142, 69%, 58%)', // Buddywise Green
  secondary: 'hsl(22, 96%, 50%)', // Safety Orange
  tertiary: 'hsl(45, 93%, 47%)', // Warning Yellow
  quaternary: 'hsl(0, 84%, 60%)', // Safety Red
};
