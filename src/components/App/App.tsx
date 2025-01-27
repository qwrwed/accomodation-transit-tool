/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
/* eslint-disable func-names */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable object-curly-newline */
/* eslint-disable max-len */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
// /* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback, useContext } from "react";
// import React, { useState } from "react";
// import Button from "react-bootstrap/Button";
import toast, { Toaster } from "react-hot-toast";

import Graph from "graphology";
import { dfsFromNode } from "graphology-traversal/dfs";
import subgraph from "graphology-operators/subgraph";
import reverse from "graphology-operators/reverse";

import { MenuItem } from "@mui/material";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
// import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
// import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";

import "bootstrap/dist/css/bootstrap.min.css";
import {
  NAPTAN_STOPTYPES,
  DEFAULT_POSTCODE,
  DEFAULT_RADIUS,
  LINE_COLORS,
  // GRAPH_NODE_SIZE_POI,
} from "../../constants";

// import logo from './logo.svg';
import logo from "../../assets/tfl_roundel_no_text.svg";
// import logo from "../SVG/TflRoundelNoText";
import "./App.css";
import {
  getPropertyByKeyArray,
  mapArrayOfKeysToObject,
  objectFilter,
  setNestedObject,
} from "../../utils";
import Map from "../Map/Map";

import {
  getLatLonFromPostCode,
  getStopPointsByRadius,
  filterStopPoints,
  // lineModeDictionary,
} from "../../api/api";

import {
  getLineGraphObjectFromLineIdList,
  // GraphComponent,
  mergeGraphObject,
  mergeGraph,
  makeLineGraphUndirected,
} from "../Graphs";

import { components as StopPointComponents } from "../../types/StopPoint";
import { components as LineComponents } from "../../types/Line";
import ModeCheckList from "../ModeCheckList";

import {
  DEFAULT_MAX_BEDROOMS,
  DEFAULT_MIN_BEDROOMS,
  DEFAULT_HOME_RADIUS_MILES,
  DEFAULT_MAX_PRICE,
} from "../../api/properties";
import { defaultFilterData, MapContext } from "../Map/MapContext";

// type LineModeGroup = StopPointComponents["schemas"]["Tfl-8"];
type StopPoint = StopPointComponents["schemas"]["Tfl-11"];
type MatchedStop = LineComponents["schemas"]["Tfl-20"];

const mergeStopPoint = (
  graph: Graph,
  stopPoint: MatchedStop,
  lineName: string,
) => {
  const branchDataKeys = ["stationId", "topMostParentId"];
  graph.mergeNode(getPropertyByKeyArray(stopPoint, branchDataKeys), {
    ...stopPoint,
    x: stopPoint.lon,
    y: stopPoint.lat,
    label: stopPoint.name,
    color: LINE_COLORS[lineName],
  });
};

const withToast = (fn: any, info: any, show = true) =>
  async function (...args: any[]) {
    const promise = fn(...args);
    if (show) {
      toast.promise(promise, {
        loading: info,
        success: info,
        error: info,
      });
    }
    return promise;
  };

const handleKeyDown = (e) => {
  if (e.key === "Enter" || e.key === "Escape") {
    if (e.key === "Enter") {
      const { form } = e.target;
      const index = [...form].indexOf(e.target);
      for (let i = index + 1; i < form.length; i++) {
        const element = form.elements[i];
        if (element.localName === "input") {
          element.focus();
          break;
        }
      }
      e.preventDefault();
    } else {
      e.target.blur();
    }
  }
};

const TextInputCustom = ({
  name,
  label,
  dataObject,
  handleFormChange,
  error,
}) => (
  <TextField
    id={`input-${name}`}
    name={name}
    label={label || name}
    variant="outlined"
    defaultValue={dataObject[name]}
    onBlur={handleFormChange}
    onKeyDown={handleKeyDown}
    error={error || false}
  />
);

const NumInputCustom = ({
  name,
  label,
  dataObject,
  handleNumChange,
  adornment,
  error,
  float = false,
}) => (
  <TextField
    id={`input-${name}`}
    name={name}
    label={label || name}
    variant="outlined"
    value={dataObject[name]}
    onChange={(e) => handleNumChange(e, float)}
    onKeyDown={handleKeyDown}
    InputProps={
      adornment
        ? {
            [`${adornment.type}Adornment`]: (
              <InputAdornment position={adornment.type}>
                {adornment.text}
              </InputAdornment>
            ),
          }
        : null
    }
    error={error || false}
  />
);

const SelectInputCustom = ({
  name,
  label,
  dataObject,
  handleFormChange,
  options,
}) => (
  <TextField
    id={`input-${name}`}
    name={name}
    label={label || name}
    select
    variant="outlined"
    defaultValue={dataObject[name]}
    onBlur={handleFormChange}
    onKeyDown={handleKeyDown}
  >
    {Object.entries(options).map(([k, v], i) => (
      <MenuItem id={k} key={k} value={v}>
        {k}
      </MenuItem>
    ))}
  </TextField>
);

const App = () => {
  const [info, setInfo] = useState("Waiting for search...");
  const [isBusy, setBusy] = useState(true);

  // const [formData["destination-postcode"], setPostcode] = useState(DEFAULT_POSTCODE);
  // const [formData["destination-radius"], setRadius] = useState(DEFAULT_RADIUS);

  const [displayedGraph, setDisplayedGraph] = useState(new Graph());
  // const [reverseGraph, setReverseGraph] = useState(true);
  // const reverseGraph = false;

  // map data
  const [originInfo, setOriginInfo] = useState<{
    postcode: string;
    latLon: LatLon;
    radius: number;
  }>();
  const [nearbyStopPoints, setNearbyStopPoints] = useState<StopPoint[]>([]);
  const [graphSerialized, setGraphSerialized] = useState<any>();

  const [getModeCheckList, setModeCheckList] = useState<string[]>([]);

  const defaultFormData = {
    "destination-postcode": DEFAULT_POSTCODE,
    "destination-radius": DEFAULT_RADIUS,
  };

  const [formData, setFormData] = useState(defaultFormData);
  // const [filterData, setFilterData] = useState(defaultFilterData);
  const { filterData, setFilterData } = useContext(MapContext);
  const [executeOnload, setExecuteOnload] = useState(undefined);

  useEffect(() => {
    // (async () => {
    // })();
    const urlParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlParams);
    const _formData = objectFilter(params, (v, k) => k in defaultFormData);
    const _filterData = objectFilter(params, (v, k) => k in defaultFilterData);
    setFormData({ ...formData, ..._formData });
    setFilterData({ ...filterData, ..._filterData });
    setExecuteOnload(params.onload);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (
      !executeOnload ||
      !filterData ||
      !formData ||
      getModeCheckList.length === 0 ||
      isBusy
    ) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    execute();
    setExecuteOnload(false);
  }, [executeOnload, filterData, formData, getModeCheckList, isBusy]);

  const handleFormChange = (e, value = null) => {
    const cnd = e.target.name in defaultFormData;
    const setFn = cnd ? setFormData : setFilterData;
    const dataObject = cnd ? formData : filterData;
    setFn({
      ...dataObject,
      [e.target.name]: value !== null ? value : e.target.value,
    });
  };

  const handleNumChange = (e, allowFloat = false) => {
    // https://stackoverflow.com/a/43177957

    // pattern = '[0-9]*\.?[0-9]*'
    const pattern = allowFloat ? /[^0-9.]/g : /[^0-9]/g;
    const onlyInts = e.target.value.replace(pattern, "");
    handleFormChange(e, onlyInts);
    // setFormData({ ...formData, [e.target.name]: onlyInts });
  };

  const updateUrl = (onload = true) => {
    const onloadData = onload ? { onload: 1 } : {};
    const queryString = new URLSearchParams({
      ...formData,
      ...filterData,
      ...onloadData,
    }).toString();
    window.history.pushState({}, "", `?${queryString}`);
  };

  const execute = async () => {
    // return;

    let _info;
    const toastId = "toast";

    // convert postcode to latitude, longitude
    _info = `Getting latitude/longitude of postcode ${formData["destination-postcode"]}...`;
    setInfo(_info);
    console.info(_info);
    toast.loading(_info, { id: toastId });
    const latLon = await getLatLonFromPostCode(
      formData["destination-postcode"],
    );
    if (latLon) {
      toast.success(_info, { id: toastId });
    } else {
      _info = `Postcode "${formData["destination-postcode"]}" not found`;
      setInfo(_info);
      console.info(_info);
      toast.error(_info, { id: toastId });
      return;
    }

    setOriginInfo({
      postcode: formData["destination-postcode"],
      latLon,
      radius: formData["destination-radius"],
    });

    // get list of stopPoints within radius
    _info = `Searching for stops within ${
      formData["destination-radius"]
    } metres of ${formData["destination-postcode"]} (${JSON.stringify(
      latLon,
    )})...`;
    setInfo(_info);
    console.info(_info);
    toast.loading(_info, { id: toastId });
    let stopPoints = await getStopPointsByRadius(
      NAPTAN_STOPTYPES,
      latLon,
      formData["destination-radius"],
    );
    toast.success(_info, { id: toastId });
    // console.log(JSON.parse(JSON.stringify({ stopPoints })));

    // check for no result
    if (stopPoints.length === 0) {
      _info = `No stops found within ${formData["destination-radius"]} metres of postcode ${formData["destination-postcode"]}`;
      setInfo(_info);
      console.info(_info);
      return;
    }
    console.info("stopPoints:", stopPoints);

    const chosenModesSet = new Set(getModeCheckList);
    stopPoints = await filterStopPoints(
      stopPoints,
      chosenModesSet,
      undefined,
      undefined,
    );
    setNearbyStopPoints(stopPoints);
    console.info("stopPoints for modes", chosenModesSet, stopPoints);

    const summary = stopPoints.map(({ commonName, distance }) => ({
      commonName,
      distance: typeof distance !== "undefined" ? Math.round(distance) : "???",
    }));
    summary.sort((a, b) => (a.distance > b.distance ? 1 : -1));
    const summaryText = summary.map(
      ({ commonName, distance }) => `${commonName} (${distance}m)`,
    );
    _info = `Stops within ${
      formData["destination-radius"]
    } metres of postcode ${formData["destination-postcode"]} (${JSON.stringify(
      latLon,
    )}): ${summaryText.join(", ")}`;
    setInfo(_info);
    console.info(_info);

    _info = "Plotting map...";
    console.info(_info);
    toast.loading(_info, { id: toastId });
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
    const multi = true;
    // const directions: Direction[] = ["outbound"];
    // const directions: Direction[] = ["inbound"];
    const directions: Direction[] = ["inbound", "outbound"];

    let finalGraphOutward = new Graph({ multi });
    let finalGraphInward = new Graph({ multi });

    for (const reverseGraph of [true, false]) {
      // for (const reverseGraph of [false]) {
      const finalGraphDirections: Record<string, Graph> =
        mapArrayOfKeysToObject(directions, () => new Graph({ multi }));

      for (const direction of directions) {
        const lineGraphObjectInDirection =
          await getLineGraphObjectFromLineIdList(
            nearbyLineIdList,
            [direction],
            reverseGraph,
            false,
          );

        finalGraphDirections[direction] = new Graph({ multi });

        for (const modeName in nearbyStopPointsOnLines) {
          for (const lineId in nearbyStopPointsOnLines[modeName]) {
            const stopPointsReachableFromNearbyStopPointsOnLineGraph =
              new Graph({ multi });
            const graphDirectionLine = lineGraphObjectInDirection[lineId];
            for (const stopPoint of nearbyStopPointsOnLines[modeName][lineId]) {
              // console.log(
              //   `Graphing line "${lineId}" stop "${stopPoint.commonName}" (${stopPoint.stationNaptan}) in direction "${direction}" (reverseGraph=${reverseGraph})`,
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
            // let sub = graphDirectionLine;
            // sub = makeLineGraphUndirected(sub);
            const sub = subgraph(
              graphDirectionLine,
              stopPointsReachableFromNearbyStopPointsOnLineGraph.nodes(),
            );
            // for (const stopPoint of nearbyStopPointsOnLines[modeName][
            //   lineId
            // ]) {
            //   sub.mergeNode(stopPoint.stationNaptan, {
            //     size: GRAPH_NODE_SIZE_POI,
            //   });
            // }
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
    const _displayedGraph = finalGraphOutward;

    setDisplayedGraph(_displayedGraph.copy()); // changes input for some reason, so pass a copy
    setGraphSerialized(makeLineGraphUndirected(_displayedGraph).export());
    toast.success(_info, { id: toastId });
  };

  const handleButtonClick = async (e) => {
    e.preventDefault();
    updateUrl();
    await execute();
  };

  const SearchButton = useCallback(
    () => (
      <div>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          // onClick={handleButtonClick}
          disabled={
            formData["destination-radius"] <= 0 ||
            !formData["destination-postcode"]
          }
        >
          Get Data
        </Button>
      </div>
    ),
    [],
  );
  // const handleFormUpdate = (e) => {};
  if (isBusy) return null;
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
        <Grid
          container
          elevation={2}
          sx={{ "& .MuiTextField-root": { m: 1, width: "25ch" } }}
          alignItems="center"
        >
          <Grid
            item
            xs={12}
            sm={6}
            component="form"
            onSubmit={handleButtonClick}
          >
            <Typography variant="h5">Search</Typography>
            <TextInputCustom
              name="destination-postcode"
              label="Commute Destination Postcode"
              dataObject={formData}
              handleFormChange={handleFormChange}
              error={!formData["destination-postcode"]}
            />
            <NumInputCustom
              name="destination-radius"
              label="Commute Destination Search Radius"
              dataObject={formData}
              handleNumChange={handleNumChange}
              adornment={{ type: "end", text: "m" }}
              error={formData["destination-radius"] <= 0}
            />
            <SearchButton />
          </Grid>
          <Grid
            item
            // sx={{ m: 2 }}
            xs={12}
            sm={6}
            component="form"
          >
            <Typography variant="h5">Filters</Typography>
            <NumInputCustom
              name="min-bedrooms"
              label="Min. Bedrooms"
              dataObject={filterData}
              handleNumChange={handleNumChange}
              adornment={{ type: "end", text: "beds" }}
            />
            <NumInputCustom
              name="max-bedrooms"
              label="Max. Bedrooms"
              dataObject={filterData}
              handleNumChange={handleNumChange}
              adornment={{ type: "end", text: "beds" }}
            />
            <NumInputCustom
              name="max-price"
              label="Max. Price"
              dataObject={filterData}
              handleNumChange={handleNumChange}
              adornment={{ type: "start", text: "£" }}
            />
            <NumInputCustom
              float
              id="input-home-radius"
              name="home-radius"
              label="Home Station Search Radius"
              variant="outlined"
              dataObject={filterData}
              handleNumChange={handleNumChange}
              adornment={{ type: "end", text: "miles" }}
            />
            <SelectInputCustom
              name="house-share"
              label="House Share?"
              dataObject={filterData}
              handleFormChange={handleFormChange}
              options={{ Include: 2, Exclude: false, "Show only": true }}
            />
          </Grid>
        </Grid>
        {/* <p>{info}</p> */}
        {/* <p>{JSON.stringify(formData)}</p>
        <p>{JSON.stringify(filterData)}</p> */}
        <Map
          originInfo={originInfo}
          nearbyStopPoints={nearbyStopPoints}
          graphSerialized={graphSerialized}
          // filterData={filterData}
        />
        {/* <GraphComponent graph={displayedGraph} style={{}} /> */}
        <p style={{ fontSize: 10 }}>
          <a
            style={{ fontSize: 12 }}
            href="https://github.com/qwrwed/accomodation-transit-tool"
          >
            Source Code
          </a>
          <br />
          Powered by TfL Open Data
          <br />
          Contains OS data © Crown copyright and database rights (2016) and
          Geomni UK Map data © and database rights (2019)
        </p>
      </Paper>
      <Toaster />
    </Container>
  );
};

export default App;
