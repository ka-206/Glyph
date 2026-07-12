import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// This is the "wiring" step: find the <div id="root"> from index.html,
// and tell React "render the <App /> component inside it."
// You'll basically never touch this file again.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
