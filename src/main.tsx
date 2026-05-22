import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// DEBUG: expõe window.auditNomesNovaIguacu() para auditoria pontual
// if (import.meta.env.DEV) {
//   import("./debug/auditNomesNovaIguacu");
// }

createRoot(document.getElementById("root")!).render(<App />);
