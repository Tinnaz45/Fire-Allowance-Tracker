import { useClaims } from "../../context/ClaimsContext";

export default function ClaimList() {
  const { claims } = useClaims();

  if (claims.length === 0) {
    return <p>No claims yet</p>;
  }

  return (
    <div>
      <h2>Your Claims</h2>

      {claims.map((claim) => (
        <div key={claim.id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
          <p><strong>Type:</strong> {claim.type}</p>
          <p><strong>Date:</strong> {claim.date}</p>
          <p><strong>Station:</strong> {claim.station}</p>
          <p><strong>Notes:</strong> {claim.notes}</p>
          <p><strong>Status:</strong> {claim.status}</p>
        </div>
      ))}
    </div>
  );
}