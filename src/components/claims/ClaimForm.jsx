import { useState } from "react";
import { useClaims } from "../../context/ClaimsContext";
import { CLAIM_TYPES } from "../../constants/claimTypes";

export default function ClaimForm() {
  const { addClaim } = useClaims();

  const [form, setForm] = useState({
    type: "recalls",
    date: "",
    station: "",
    notes: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addClaim(form);

    setForm({
      type: "recalls",
      date: "",
      station: "",
      notes: ""
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>New Claim</h2>

      <select name="type" value={form.type} onChange={handleChange}>
        {CLAIM_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <input
        type="date"
        name="date"
        value={form.date}
        onChange={handleChange}
      />

      <input
        type="text"
        name="station"
        placeholder="Station"
        value={form.station}
        onChange={handleChange}
      />

      <textarea
        name="notes"
        placeholder="Notes"
        value={form.notes}
        onChange={handleChange}
      />

      <button type="submit">Add Claim</button>
    </form>
  );
}