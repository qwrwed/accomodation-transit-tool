import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import App from "./components/App/App";
// import App from "./components/test";
// import App from "./components/GraphScreen/GraphScreen";
// import App from "./components/CheckBoxTreeView";
import theme from "./theme";

import reportWebVitals from "./reportWebVitals";
import { MapProvider } from "./components/Map/MapContext";

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <MapProvider>
        <CssBaseline />
        <App />
      </MapProvider>
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById("root"),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
