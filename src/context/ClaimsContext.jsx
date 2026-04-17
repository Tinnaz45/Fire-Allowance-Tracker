import { createContext, useContext, useState } from "react";

const ClaimsContext = createContext();

export function ClaimsProvider({ children }) {
  const [claims, setClaims] = useState([]);

  const addClaim = (claim) => {
    const newClaim = {
      id: Date.now(),
      ...claim,
      createdAt: new Date(),
      status: "pending"
    };

    setClaims((prev) => [newClaim, ...prev]);
  };

  return (
    <ClaimsContext.Provider value={{ claims, addClaim }}>
      {children}
    </ClaimsContext.Provider>
  );
}

export function useClaims() {
  return useContext(ClaimsContext);
}