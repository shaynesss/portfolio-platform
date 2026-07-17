import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Every load starts at the landing section — a refresh (or back/forward
// navigation) restoring a mid-scroll position would drop the visitor
// straight into the middle of the scroll-driven scene transitions.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
