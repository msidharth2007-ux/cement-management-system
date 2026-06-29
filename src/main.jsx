/**
 * main.jsx
 * --------
 * This is the ENTRY POINT of our React app.
 * It renders the App component inside the HTML page.
 * We also import our global CSS here.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Render the app inside the <div id="root"> element in index.html
// BrowserRouter enables page navigation (routing) in our app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
