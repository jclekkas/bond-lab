import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import css from "./term/styles.css?inline";
import Terminal from "./term/Terminal";

const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Terminal />
  </StrictMode>,
);
