// src/context/FilterContext.js
import React, { createContext, useContext, useState, useMemo } from 'react';

const FilterContext = createContext();

export const useFilters = () => useContext(FilterContext);

export function FilterProvider({ children }) {
  // 💡 Move the search state management here
  const [globalSearch, setGlobalSearch] = useState("");
  // You might want to move other key filter states here too, like modelQ, sortBy, etc.
  const [sortBy, setSortBy] = useState("relevance");

  const value = useMemo(() => ({
    globalSearch,
    setGlobalSearch,
    sortBy,
    setSortBy,
    // Add other shared filter states/setters here
  }), [globalSearch, sortBy]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}