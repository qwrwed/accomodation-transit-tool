/* eslint-disable */
import React, { useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
// import Box from "@mui/material/Box";
import { Button, Paper } from "@mui/material";
import { objectKeysToList } from "../utils"

import CheckBoxList from "./CheckBoxList";
import logo from "../logo.svg";
import "./App/App.css";

const sampleListLabels = {
  "NaptanMetroStation": "Underground/Overground",
  "NaptanRailStation": "National Rail",
  "NaptanBusCoachStation": "Bus Stations",
  "NaptanPublicBusCoachTram": "Bus/Tram Stops",
  "NaptanFerryPort": "River Transport",
};
// https://www.freecodecamp.org/news/how-to-work-with-multiple-checkboxes-in-react/


const App = () => {

  const [sampleListState, setSampleListState] = useState({
    NaptanMetroStation: true,
    NaptanRailStation: false,
    NaptanBusCoachStation: true,
    NaptanPublicBusCoachTram: true,
    NaptanFerryPort: false,
  });

  return (
    <Container maxWidth="sm" className="App">
      <Paper>
        <img src={logo} className="App-logo" alt="logo" />
        <Container>===</Container>
        <CheckBoxList
          listState={sampleListState}
          setListState={setSampleListState}
          listLabels={sampleListLabels}
        />
        <Container>{objectKeysToList(sampleListState)}</Container>
        <Container>===</Container>

        <Typography variant="h4" component="h1" gutterBottom>
          Create React App + Material-UI
        </Typography>
        <Button variant="contained" color="primary">
          Primary Button
        </Button>
        <Button variant="contained" color="secondary">
          Secondary Button
        </Button>
      </Paper>
    </Container>
  );
};

export default App;
