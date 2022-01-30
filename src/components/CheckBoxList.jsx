/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import Checkbox from "@mui/material/Checkbox";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";

const CheckBoxList = ({ listState, setListState, listLabels = {} }) => (
  // listState is an object where each property name is a key and each property value is a bool
  // e.g. {a: true, b: false}
  // listState and setListState should also be the results of useState i.e.
  //  const [listState, setListState] = useState(defaultListState)
  <FormGroup>
    {Object.entries(listState).map(([key, value]) => (
      <FormControlLabel
        control={
          <Checkbox
            checked={listState[key]}
            onChange={(e) => {
              const updatedKey = e.target.name;
              const updatedValue = e.target.checked;
              setListState({
                ...listState,
                ...{ [updatedKey]: updatedValue },
              });
            }}
          />
        }
        label={listLabels[key] ?? key}
        key={key}
        name={key}
      />
    ))}
  </FormGroup>
);
export default CheckBoxList;
