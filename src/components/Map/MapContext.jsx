import React, { createContext, useMemo, useState } from "react";

export const DEFAULT_MIN_BEDROOMS = 0;
export const DEFAULT_MAX_BEDROOMS = 2;
export const DEFAULT_MIN_PRICE = 0;
export const DEFAULT_MAX_PRICE = 1750;
export const DEFAULT_HOME_RADIUS_MILES = 0.5;

export const defaultFilterData = {
  "min-bedrooms": DEFAULT_MIN_BEDROOMS,
  "max-bedrooms": DEFAULT_MAX_BEDROOMS,
  "max-price": DEFAULT_MAX_PRICE,
  "home-radius": DEFAULT_HOME_RADIUS_MILES,
};

export const MapContext = createContext();

export const MapProvider = ({ children }) => {
  const [filterData, setFilterData] = useState(defaultFilterData);
  return (
    <MapContext.Provider value={useMemo(() => ({ filterData, setFilterData }))}>
      {children}
    </MapContext.Provider>
  );
};
