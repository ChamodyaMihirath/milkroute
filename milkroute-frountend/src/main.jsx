import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { MilkRouteProvider } from "./context/MilkRouteContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MilkRouteProvider>
      <App />
    </MilkRouteProvider>
  </React.StrictMode>
);