import React from "react";

function createIcon(pathD) {
  return function Icon({ size = 24, className = "" }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d={pathD} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };
}

export const Icons = {
  Grid: createIcon("M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"),
  Car: createIcon("M3 16l1-5 2-4h12l2 4 1 5M5 16h14M7 16v2M17 16v2"),
  Home: createIcon("M3 11l9-8 9 8v10H3V11Z"),
  Smartphone: createIcon("M8 2h8v20H8V2Zm0 16h8"),
  Zap: createIcon("M13 2L3 14h7l-1 8 10-12h-7l1-8Z"),
  Monitor: createIcon("M4 5h16v11H4V5Zm6 16h4"),
  Armchair: createIcon("M7 10V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2M6 12h12M7 12v7M17 12v7M5 19h14"),
  Shirt: createIcon("M8 4l4 2 4-2 3 4-3 2v12H8V10L5 8l3-4Z"),
  Motorcycle: createIcon("M5 18a3 3 0 1 0 0 .1M19 18a3 3 0 1 0 0 .1M9 18l3-7h3l2 3"),
  Wifi: createIcon("M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0M11 18a2 2 0 0 1 2 0"),
  Briefcase: createIcon("M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M4 7h16v13H4V7Z"),
  Wrench: createIcon("M14.7 6.3a4 4 0 0 1-5.4 5.4L5 16v3h3l4.3-4.3a4 4 0 0 0 5.4-5.4L15 7Z"),
  BookOpen: createIcon("M12 6c-2-2-6-2-8 0v14c2-2 6-2 8 0M12 6c2-2 6-2 8 0v14c-2-2-6-2-8 0"),
  PawPrint: createIcon("M8 14a2 2 0 1 0-4 0c0 2 2 3 4 3s4-1 4-3a2 2 0 1 0-4 0Zm8 0a2 2 0 1 0-4 0c0 2 2 3 4 3s4-1 4-3a2 2 0 1 0-4 0Z"),
  ShoppingBag: createIcon("M6 7l1-3h10l1 3M5 7h14l-1 14H6L5 7Z"),
  Plus: createIcon("M12 5v14M5 12h14"),
  Map: createIcon("M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"),
  List: createIcon("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"),
  Search: createIcon("M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"),
  MapPin: createIcon("M12 21s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11Z"),
};
