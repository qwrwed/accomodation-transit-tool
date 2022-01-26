import React, { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Paper } from "@mui/material";

import "../App/App.css";
import { MODES_DEFAULT, MODES_LABELS } from "../../constants";
import CheckBoxList from "../CheckBoxList";
import { setGraphListFromChosenModes, MultipleGraph } from "../Graphs";

const App = () => {
  const [chosenModes, setChosenModes] = useState(MODES_DEFAULT);
  const [graphList, setGraphList] = useState([]);

  useEffect(() => {
    setGraphListFromChosenModes(chosenModes, setGraphList);
  }, [chosenModes]);

  return (
    <Container maxWidth="lg" className="App">
      <Paper>
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <CheckBoxList
          listState={chosenModes}
          setListState={setChosenModes}
          listLabels={MODES_LABELS}
        />
        <Container>===</Container>
        {/* <SingleGraph graph={graphInfo} /> */}
        <MultipleGraph graphs={graphList} />
        <Container>===</Container>
        <Typography variant="h4" component="h1" gutterBottom>
          Create React App + Material-UI + Graphology + Sigma.js
        </Typography>
      </Paper>
    </Container>
  );
};

export default App;
