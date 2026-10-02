import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { CatalogProvider } from "./catalog/CatalogProvider.jsx";
import { StoreProvider } from "./store/StoreProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </CatalogProvider>
    </BrowserRouter>
  </StrictMode>
);
