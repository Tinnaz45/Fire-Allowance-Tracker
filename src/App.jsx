import { ClaimsProvider } from "./context/ClaimsContext";
import ClaimForm from "./components/claims/ClaimForm";
import ClaimList from "./components/claims/ClaimList";

function App() {
  return (
    <ClaimsProvider>
      <div style={{ padding: "20px" }}>
        <h1>Fire Allowance Tracker</h1>

        <ClaimForm />
        <ClaimList />
      </div>
    </ClaimsProvider>
  );
}

export default App;