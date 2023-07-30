/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// @ts-nocheck
import React, { useEffect, useState } from "react";

import { MODES_DEFAULT, MODES_INFO_ALL } from "../constants";
import CheckBoxTreeView from "./CheckBoxTreeView";
import { components as LineComponents } from "../types/Line";
import { catchHttpError } from "../utils";
import { getModes, getLinesByModes } from "../api";

type Mode = LineComponents["schemas"]["Tfl"];
type Line = LineComponents["schemas"]["Tfl-19"];

const ModeCheckList = ({
  stateGetter,
  stateSetter,
}: {
  stateGetter: string[];
  stateSetter: UseStateSetter<string[]>;
}) => {
  const useLines = false;

  const parentId = "parent:all";
  const parentLabel = "All Transport Modes";

  const [data, setData] = useState<RenderTree | undefined>();
  // const defaultExpanded = [parentId];
  const defaultExpanded: string[] = [];
  useEffect(() => {
    (async () => {
      const modeLineTree: RenderTree = {
        id: parentId,
        name: parentLabel,
        children: [],
      };
      let modes: Mode[] = [];

      modes = (await catchHttpError(getModes)()) as unknown as Mode[];
      const modeNames = modes
        .filter(
          (mode) =>
            mode.isScheduledService &&
            mode.isFarePaying &&
            (mode.isTflService || mode.modeName === "national-rail"),
        )
        .map(({ modeName }) => modeName)
        .filter(
          (modeName) =>
            MODES_INFO_ALL[modeName] && !MODES_INFO_ALL[modeName].hidden,
        );

      const chosenByDefault = modeNames.filter(
        (modeName) => MODES_DEFAULT[modeName],
      );
      stateSetter(chosenByDefault);

      const children: RenderTree[] = [];
      for (const modeName of modeNames) {
        const child: RenderTree = {
          id: modeName,
          name: MODES_INFO_ALL[modeName].label || modeName,
        };
        if (useLines) {
          const grandchildren = (
            (await getLinesByModes([modeName])) as Line[]
          ).map(({ id, name }) => ({
            id,
            name,
          }));
          child.children = grandchildren;
        }
        children.push(child);
      }
      modeLineTree.children = children;

      setData(modeLineTree);
    })();
  }, []);

  if (data!) {
    return (
      <CheckBoxTreeView
        data={data}
        stateGetter={stateGetter}
        stateSetter={stateSetter}
        defaultExpanded={defaultExpanded}
      />
    );
  }
  return <>Loading mode checklist...</>;
};
export default ModeCheckList;
