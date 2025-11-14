export const Theme = {
  // Text colors
  text: "#FFFFFF",
  textMuted: "#999999",

  // Background colors
  background: "#000000",
  backgroundPanel: "#1E1E1E", // Dark gray panel background

  // Primary/accent colors
  primary: "#FFA500", // Orange
  accent: "#00FF80", // Light green (was using this for dates)

  // Accessory colors (from List component)
  info: "#FFA500", // Orange for text accessories
  success: "#00FF80", // Green for date accessories
  warning: "#FF8000", // Orange for tag accessories
  error: "#FF0000", // Red for errors

  // Additional UI colors
  border: "#333333",
  highlight: "#FFA500",
  selected: "#FFA500",
  yellow: "#FFA500", // Orange for icons
  link: "#FFA500", // Orange for links

  // Transparent
  transparent: undefined, // Use undefined for no background color
} as const;
