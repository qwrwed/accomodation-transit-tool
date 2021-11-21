/* eslint-disable */
import React, { useState } from "react";
// import Button from "react-bootstrap/Button";
import Button from "@mui/material/Button";
// import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
//import { Button, Paper } from "@mui/material/";
import Input from "@mui/material/Input";

import CheckBoxList from "../CheckBoxList";
import "bootstrap/dist/css/bootstrap.min.css";

// import logo from './logo.svg';
import logo from "../../tfl_roundel_no_text.svg";
import "./App.css";
import { objectToList } from "../../utils";

const postcodes = require("node-postcodes.io");

const TFL_API_URL_ROOT = "https://api.tfl.gov.uk";
// https://blog.tfl.gov.uk/2015/10/08/unified-api-part-2-lot-location-of-things/

const NAPTAN_STOPTYPES_LABELS = {
  NaptanMetroStation: "Underground/Overground",
  NaptanRailStation: "National Rail",
  NaptanBusCoachStation: "Bus Stations",
  NaptanPublicBusCoachTram: "Bus/Tram Stops",
  NaptanFerryPort: "River Transport",
};
const NAPTAN_STOPTYPES_DEFAULT = {
  NaptanMetroStation: true,
  NaptanRailStation: true,
  NaptanBusCoachStation: true,
  NaptanPublicBusCoachTram: true,
  NaptanFerryPort: false,
};

const postcodeToLatLong = async (postcode) => {
  const response = await postcodes.lookup(postcode);
  const { result } = response;
  const { latitude, longitude } = result;
  return { lat: latitude, lon: longitude };
};

const makeGetRequest = async (route, otherParams) => {
  const appKey = process.env.REACT_APP_TFL_KEY;
  let params = appKey
    ? { app_key: appKey, ...otherParams }
    : { ...otherParams };
  params = new URLSearchParams(params).toString();
  console.log(params);
  const response = await fetch(`${TFL_API_URL_ROOT}${route}?${params}`);
  return response.json();
};

// const getNaptanTypes = async () => {
//   return await makeGetRequest("/StopPoint/Meta/StopTypes")
// }

const getStoppointDataCategories = async () =>
  makeGetRequest("/StopPoint/Meta/categories");

const getStopPointsByRadius = async (stopTypes, latLong, radius) => {
  const { lat, lon } = latLong;
  const params = {
    stopTypes: stopTypes.join(),
    lat,
    lon,
    radius,
    returnLines: true,
  };
  return makeGetRequest("/StopPoint", params);
};

const filterStopPointsByLineData = (stopPoints) =>
  stopPoints.filter((stopPoint) => stopPoint.lines.length > 0);

const App = () => {
  // const defaultPostcode = "SE1 6TG" // example location in API docs
  const defaultPostcode = "SE1 9SG"; // london bridge bus station
  const defaultRadius = 300;

  const [info, setInfo] = useState("Waiting for search...");
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [radius, setRadius] = useState(defaultRadius);
  const [chosenStoptypes, setChosenStoptypes] = useState(
    NAPTAN_STOPTYPES_DEFAULT
  );

  const handleRadiusChange = (e) => {
    // https://stackoverflow.com/a/43177957
    const onlyNums = e.target.value.replace(/[^0-9]/g, "");
    setRadius(onlyNums);
  };

  const handleButtonClick = async () => {
    const stopTypes = objectToList(chosenStoptypes);
    console.log(stopTypes)
    setInfo(`Getting latitude/longitude of postcode ${postcode}...`);
    const latLong = await postcodeToLatLong(postcode);
    setInfo(
      `Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(
        latLong
      )})...`
    );

    // setData(JSON.stringify(latLong))
    // console.log(process.env.REACT_APP_APP_ID)
    // console.log(process.env.REACT_APP_PRIMARY_KEY)
    // console.log(await getNaptanTypes())
    console.log(await getStoppointDataCategories());
    const result = await getStopPointsByRadius(stopTypes, latLong, radius);
    const resultLatLong = result.centrePoint;
    // console.log(result)
    let { stopPoints } = result;
    // console.log(stopPoints)
    if (stopPoints === undefined || stopPoints.length === 0) {
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`);
      return;
    }

    console.log(stopPoints);
    stopPoints = filterStopPointsByLineData(stopPoints);
    console.log(stopPoints);

    const summary = stopPoints.map(({ commonName, distance }) => ({
      commonName,
      distance: Math.round(distance),
    }));
    const summaryText = summary.map(
      ({ commonName, distance }) => `${commonName} (${distance}m)`
    );
    // console.log(commonNames)
    setInfo(
      `Stops within ${radius} metres of postcode ${postcode} (${resultLatLong}): ${summaryText.join(
        ", "
      )}`
    );
  };
  return (
    // <div className="App">
    //   <header className="App-header">
    //     <img src={logo} className="App-logo" alt="logo" />
    //     <p>transit-tool</p>
    //     {/* {postcode} */}
    //     <input value={postcode} onInput={(e) => setPostcode(e.target.value)} />
    //     <input value={radius} onInput={(e) => setRadius(e.target.value)} />
    //     <Input value={radius} onInput={(e) => setRadius(e.target.value)} />
    //     <Button type="button" onClick={handleButtonClick} variant="contained">
    //       Get Data
    //     </Button>
    //     <p>{info}</p>
    //     {/* <a
    //       className="App-link"
    //       href="https://reactjs.org"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Learn React
    //     </a> */}
    //   </header>
    // </div>
    <Container maxWidth="sm" className="App">
      <Paper>
        <img src={logo} className="App-logo" alt="logo" />
        <Typography variant="h4" component="h1" gutterBottom>
          transit-tool
        </Typography>
        <CheckBoxList
          listState={chosenStoptypes}
          setListState={setChosenStoptypes}
          listLabels={NAPTAN_STOPTYPES_LABELS}
        />
        <Box
          component="form"
          sx={{
            "& .MuiTextField-root": { m: 1, width: "25ch" },
          }}
          noValidate
          autoComplete="off"
        >
          <div>
            <TextField
              variant="outlined"
              label="Postcode"
              value={postcode}
              onInput={(e) => setPostcode(e.target.value)}
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
            />
          </div>
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={handleButtonClick}
            >
              Get Data
            </Button>
          </div>
        </Box>
        <p>{info}</p>
      </Paper>
    </Container>
  );
};

export default App;

// import Toast from "react-bootstrap/Toast";
// import Container from "react-bootstrap/Container";
// import "./App.css";

// // eslint-disable-next-line react/prop-types
// const ExampleToast = ({ children }) => {
//   const [show, toggleShow] = useState(true);

//   return (
//     <>
//       {!show && (
//         <Button variant="filled" onClick={() => toggleShow(true)}>
//           Show Toast
//         </Button>
//       )}
//       <Toast show={show} onClose={() => toggleShow(false)}>
//         <Toast.Header>
//           <strong className="mr-auto">React-Bootstrap</strong>
//         </Toast.Header>
//         <Toast.Body>{children}</Toast.Body>
//       </Toast>
//     </>
//   );
// };

// const App = () => (
//   <Container className="p-3">
//     <div className="jumbotron">
//       <h1 className="header">Welcome To React-Bootstrap</h1>
//       <ExampleToast>
//         We now have Toasts
//         <span role="img" aria-label="tada">
//           🎉
//         </span>
//       </ExampleToast>
//     </div>
//   </Container>
// );

// export default App;
