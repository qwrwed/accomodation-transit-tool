/* eslint-disable react/require-default-props */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable react/jsx-no-useless-fragment */
/* eslint-disable no-restricted-syntax */
// https://github.com/mui-org/material-ui/issues/17407#issuecomment-969029758
import React from "react";

import ChevronRight from "@mui/icons-material/ChevronRight";
import ExpandMore from "@mui/icons-material/ExpandMore";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

const VERBOSE = false;

// Get all children from the current node.
function getAllChild(childNode: RenderTree | null, collectedNodes: any[] = []) {
  if (childNode === null) return collectedNodes;
  collectedNodes.push(childNode.id);
  if (Array.isArray(childNode.children)) {
    for (const node of childNode.children) {
      getAllChild(node, collectedNodes);
    }
  }
  return collectedNodes;
}

function goThroughAllNodes(nodes: RenderTree, map: Record<string, any> = {}) {
  if (!nodes.children) {
    return null;
  }
  map[nodes.id] = getAllChild(nodes).splice(1);
  for (const childNode of nodes.children) {
    goThroughAllNodes(childNode, map);
  }
  return map;
}

// recursive DFS
function getNodeById(node: RenderTree, id: string, parentsPath: string[]): any {
  let result = null;
  if (node.id === id) {
    return node;
  }
  if (Array.isArray(node.children)) {
    for (const childNode of node.children) {
      result = getNodeById(childNode, id, parentsPath);
      if (result) {
        parentsPath.push(node.id);
        return result;
      }
    }
    return result;
  }
  return result;
}

const getChildById = (nodes: RenderTree, id: string) => {
  const array: string[] = [];
  const path: string[] = [];

  const nodeToToggle = getNodeById(nodes, id, path);
  // console.log(path);
  return { childNodesToToggle: getAllChild(nodeToToggle, array), path };
};

export default ({
  data,
  stateGetter,
  stateSetter,
  defaultExpanded = [],
}: {
  data: RenderTree;
  stateGetter: string[];
  stateSetter: UseStateSetter<string[]>;
  defaultExpanded?: string[];
}) => {
  // const [selected, setSelected] = React.useState<string[]>([]);
  if (VERBOSE) console.log(stateGetter);
  const selectedSet = React.useMemo(() => new Set(stateGetter), [stateGetter]);
  const parentMap = React.useMemo(() => goThroughAllNodes(data), []);
  // console.log("parentMap", parentMap);

  function getOnChange(checked: boolean, nodes: RenderTree) {
    const { childNodesToToggle, path } = getChildById(data, nodes.id);
    if (VERBOSE)
      console.log("childNodesToChange", { childNodesToToggle, checked });
    let array = checked
      ? [...stateGetter, ...childNodesToToggle]
      : stateGetter
          .filter((value) => !childNodesToToggle.includes(value))
          .filter((value) => !path.includes(value));
    array = array.filter((v, i) => array.indexOf(v) === i);
    stateSetter(array);
  }

  const renderTree = (nodes: RenderTree) => {
    const allSelectedChildren = parentMap?.[nodes.id]?.every(
      (childNodeId: string) => selectedSet.has(childNodeId),
    );
    const checked = selectedSet.has(nodes.id) || allSelectedChildren || false;

    const indeterminate =
      parentMap?.[nodes.id]?.some((childNodeId: string) =>
        selectedSet.has(childNodeId),
      ) || false;

    if (allSelectedChildren && !selectedSet.has(nodes.id)) {
      if (VERBOSE) console.log("if allSelectedChildren");
      stateSetter([...stateGetter, nodes.id]);
    }

    return (
      <TreeItem
        key={nodes.id}
        nodeId={nodes.id}
        label={
          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                indeterminate={!checked && indeterminate}
                onChange={(event) =>
                  getOnChange(event.currentTarget.checked, nodes)
                }
                onClick={(e) => e.stopPropagation()}
              />
            }
            label={<>{nodes.name}</>}
            key={nodes.id}
          />
        }
      >
        {Array.isArray(nodes.children)
          ? nodes.children.map((node) => renderTree(node))
          : null}
      </TreeItem>
    );
  };

  return (
    <TreeView
      defaultExpanded={defaultExpanded}
      defaultExpandIcon={<ChevronRight />}
      defaultCollapseIcon={<ExpandMore />}
      style={{ textAlign: "initial" }}
    >
      {renderTree(data)}
    </TreeView>
  );
};
