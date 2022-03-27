/* eslint-disable object-curly-newline */
/* eslint-disable max-len */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable */
import React, { ChangeEvent, useState } from "react";
// import React, { useState } from "react";
// import Button from "react-bootstrap/Button";

import Graph from "graphology";
import { dfsFromNode } from "graphology-traversal/dfs";
import subgraph from "graphology-operators/subgraph";
import reverse from "graphology-operators/reverse";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import "bootstrap/dist/css/bootstrap.min.css";
import {
  NAPTAN_STOPTYPES,
  DEFAULT_POSTCODE,
  DEFAULT_RADIUS,
  LINE_COLORS,
  GRAPH_NODE_SIZE_POI,
} from "../../constants";

// import logo from './logo.svg';
import logo from "../../tfl_roundel_no_text.svg";
import "./App.css";
import { mapArrayOfKeysToObject, setNestedObject } from "../../utils";
import Map from "../Map/Map";

import {
  getLatLonFromPostCode,
  getStopPointsByRadius,
  filterStopPoints,
} from "../../api";

import {
  getLineGraphObjectFromLineIdList,
  GraphComponent,
  mergeGraphObject,
  mergeGraph,
} from "../Graphs";

import { components as StopPointComponents } from "../../types/StopPoint";
import { components as LineComponents } from "../../types/Line";
import ModeCheckList from "../ModeCheckList";
import { AnyNaptrRecord } from "dns";

// type LineModeGroup = StopPointComponents["schemas"]["Tfl-8"];
type StopPoint = StopPointComponents["schemas"]["Tfl-11"];

type MatchedStop = LineComponents["schemas"]["Tfl-20"];

const mergeStopPoint = (
  graph: Graph,
  stopPoint: MatchedStop,
  lineName: string,
) => {
  const branchDataKey = "stationId";
  graph.mergeNode(stopPoint[branchDataKey], {
    ...stopPoint,
    x: stopPoint.lon,
    y: stopPoint.lat,
    label: stopPoint.name,
    color: LINE_COLORS[lineName],
  });
};

const App = () => {
  const [info, setInfo] = useState("Waiting for search...");
  const [postcode, setPostcode] = useState(DEFAULT_POSTCODE);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [displayedGraph, setDisplayedGraph] = useState(new Graph());
  const [graphSerialized, setGraphSerialized] = useState<any>();
  // const [reverseGraph, setReverseGraph] = useState(true);
  // const reverseGraph = false;

  // map data
  const [originInfo, setOriginInfo] =
    useState<{ postcode: string; latLong: LatLon; radius: number }>();
  const [mapLineSegments, setMapLineSegments] = useState<any>();
  const [nearbyStopPoints, setNearbyStopPoints] = useState<StopPoint[]>([]);

  const [getModeCheckList, setModeCheckList] = useState<string[]>([]);

  const handleRadiusChange = (e: ChangeEvent<HTMLInputElement>) => {
    // const handleRadiusChange = (e) => {
    // https://stackoverflow.com/a/43177957
    const onlyInts = e.target.value.replace(/[^0-9]/g, "");
    setRadius(+onlyInts);
  };

  const handleButtonClick = async () => {
    // convert postcode to latitude, longitude
    setInfo(`Getting latitude/longitude of postcode ${postcode}...`);
    // const latLong: [number, number] = await getLatLonFromPostCode(postcode);
    const latLong = await getLatLonFromPostCode(postcode);
    setOriginInfo({ postcode, latLong, radius });

    // get list of stopPoints within radius
    setInfo(
      `Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(
        latLong,
      )})...`,
    );
    let stopPoints = await getStopPointsByRadius(
      NAPTAN_STOPTYPES,
      latLong,
      radius,
    );

    // console.log(JSON.parse(JSON.stringify({ stopPoints })));

    // check for no result
    if (stopPoints.length === 0) {
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`);
      return;
    }

    const chosenModesSet = new Set(getModeCheckList);
    stopPoints = await filterStopPoints(
      stopPoints,
      chosenModesSet,
      undefined,
      undefined,
    );
    setNearbyStopPoints(stopPoints);

    const summary = stopPoints.map(({ commonName, distance }) => ({
      commonName,
      distance: typeof distance !== "undefined" ? Math.round(distance) : "???",
    }));
    summary.sort((a, b) => (a.distance > b.distance ? 1 : -1));
    const summaryText = summary.map(
      ({ commonName, distance }) => `${commonName} (${distance}m)`,
    );
    setInfo(
      `Stops within ${radius} metres of postcode ${postcode} (${JSON.stringify(
        latLong,
      )}): ${summaryText.join(", ")}`,
    );

    // organise the nearby stopPoints by mode and line; {mode: {line: [stopPoint]}}
    const nearbyLineIdList: string[] = [];
    const nearbyStopPointsOnLines: Record<
      ModeId,
      Record<LineId, StopPoint[]>
    > = {};
    for (const stopPoint of stopPoints) {
      for (const { modeName, lineIdentifier } of stopPoint.lineModeGroups) {
        if (chosenModesSet.has(modeName)) {
          for (const line of lineIdentifier) {
            if (
              typeof nearbyStopPointsOnLines?.[modeName]?.[line] === "undefined"
            ) {
              setNestedObject(nearbyStopPointsOnLines, [modeName, line], []);
              nearbyLineIdList.push(line);
            }
            nearbyStopPointsOnLines[modeName][line].push(stopPoint);
          }
        }
      }
    }

    // const directions: Direction[] = ["outbound"];
    // const directions: Direction[] = ["inbound"];
    const directions: Direction[] = ["inbound", "outbound"];

    let finalGraphOutward = new Graph({multi: true});
    let finalGraphInward = new Graph({multi: true});

    for (const reverseGraph of [true, false]) {
    // for (const reverseGraph of [false]) {
      const finalGraphDirections: Record<string, Graph> =
        mapArrayOfKeysToObject(directions, () => new Graph({multi: true}));

      for (const direction of directions) {
        const lineGraphObjectInDirection =
          await getLineGraphObjectFromLineIdList(
            nearbyLineIdList,
            [direction],
            reverseGraph,
          );

        finalGraphDirections[direction] = new Graph({multi: true});

        for (const modeName in nearbyStopPointsOnLines) {
          for (const lineId in nearbyStopPointsOnLines[modeName]) {
            const stopPointsReachableFromNearbyStopPointsOnLineGraph =
              new Graph({multi: true});
            const graphDirectionLine = lineGraphObjectInDirection[lineId];
            for (const stopPoint of nearbyStopPointsOnLines[modeName][
              lineId
            ]) {
              // console.log(
              //   `Graphing line "${lineName}" stop "${stopPoint.commonName}" (${stopPoint.stationNaptan}) in direction "${direction}" (reverseGraph=${reverseGraph})`,
              // );
              if (graphDirectionLine.hasNode(stopPoint.stationNaptan)) {
                dfsFromNode(
                  graphDirectionLine,
                  stopPoint.stationNaptan,
                  (node, attr) => {
                    mergeStopPoint(
                      stopPointsReachableFromNearbyStopPointsOnLineGraph,
                      attr as MatchedStop,
                      lineId,
                    );
                  },
                );
              } else {
                // console.log("Not found");
              }
            }
            const sub = subgraph(
              graphDirectionLine,
              stopPointsReachableFromNearbyStopPointsOnLineGraph.nodes(),
            );
            for (const stopPoint of nearbyStopPointsOnLines[modeName][
              lineId
            ]) {
              sub.mergeNode(stopPoint.stationNaptan, {
                size: GRAPH_NODE_SIZE_POI,
              });
            }
            mergeGraph(sub, finalGraphDirections[direction]);
          }
        }
      }
      let finalGraphMerged = mergeGraphObject(finalGraphDirections);
      if (reverseGraph) {
        finalGraphMerged = reverse(finalGraphMerged);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        finalGraphInward = finalGraphMerged;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        finalGraphOutward = finalGraphMerged;
      }
    }
    const _displayedGraph = finalGraphOutward

    setDisplayedGraph(_displayedGraph.copy()); // changes input for some reason, so pass a copy
      setGraphSerialized(_displayedGraph.export());
    
  };

  return (
    <Container maxWidth="md" className="App">
      <Paper>
        <img src={logo} className="App-logo" alt="logo" />
        <Typography variant="h4" component="h1" gutterBottom>
          transit-tool
        </Typography>
        <ModeCheckList
          stateGetter={getModeCheckList}
          stateSetter={setModeCheckList}
        />
        <Box
          component="form"
          sx={{ "& .MuiTextField-root": { m: 1, width: "25ch" } }}
          noValidate
          autoComplete="off"
        >
          <div>
            <TextField
              variant="outlined"
              label="Postcode"
              value={postcode}
              onInput={(e: ChangeEvent<HTMLInputElement>) =>
                setPostcode(e.target.value)
              }
            />
          </div>
          <div>
            <TextField
              variant="outlined"
              label="Radius"
              value={radius}
              onInput={handleRadiusChange}
              InputProps={{
                endAdornment: <InputAdornment position="end">m</InputAdornment>,
              }}
              error={radius === 0}
            />
          </div>
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={handleButtonClick}
              disabled={radius === 0}
            >
              Get Data
            </Button>
          </div>
        </Box>
        <p>{info}</p>
        <Map originInfo={originInfo} nearbyStopPoints={nearbyStopPoints} graphSerialized={graphSerialized}/>
        {/* <GraphComponent graph={displayedGraph} style={{}} /> */}
      </Paper>
    </Container>
  );
};

export default App;
