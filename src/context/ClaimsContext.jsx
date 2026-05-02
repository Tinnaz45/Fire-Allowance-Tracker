import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const ClaimsContext = createContext();

export function ClaimsProvider({ children }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims() {
    console.log("Fetching claims...");
    setLoading(true);
    const { data, error } = await supabase
      .from('fire_allowance_claims')
      .select('*')
      .order('created_at', { ascending: false });
    console.log("Fetched claims:", data);
    if (!error && data) setClaims(data);
    setLoading(false);
  }

  const addClaim = async (form) => {
    console.log("Submitting claim:", form);

    const { data, error } = await supabase
      .from("fire_allowance_claims")
      .insert([form])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      alert("Insert failed: " + error.message);
      return;
    }

    console.log("Inserted row:", data);

    setClaims((prev) => [...data, ...prev]);
  };

  const deleteClaim = async (id) => {
    const { error } = await supabase
      .from('fire_allowance_claims')
      .delete()
      .eq('id', id);
    if (!error) setClaims((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <ClaimsContext.Provider value={{ claims, addClaim, deleteClaim, loading }}>
      {children}
    </ClaimsContext.Provider>
  );
}

export function useClaims() {
  return useContext(ClaimsContext);
}
