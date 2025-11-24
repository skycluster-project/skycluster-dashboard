import React from "react";
import YAML from "yaml";
import Box from "@mui/material/Box";
import TreeView from "@mui/lab/TreeView";
import TreeItem from "@mui/lab/TreeItem";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { ClaimExtended } from "../types.ts";

const YAMLCodeBlock = ({ obj }: { obj: ClaimExtended }) => {
  // clone to avoid mutating props
  const data = JSON.parse(JSON.stringify(obj));

  // strip fields as before
  if (data.metadata?.managedFields) data.metadata.managedFields = undefined;
  if (data.composition) data.composition = undefined;
  if (data.managedResources) data.managedResources = undefined;
  if (data.managedResourcesClaims) data.managedResourcesClaims = undefined;
  if (data.managedResourcesXRs) data.managedResourcesXRs = undefined;
  if (data.parentXR) data.parentXR = undefined;
  const lastApplied = "kubectl.kubernetes.io/last-applied-configuration";
  if (data.metadata?.annotations && data.metadata.annotations[lastApplied]) {
    delete data.metadata.annotations[lastApplied];
  }

  const isObject = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v);
  const makeId = (path: string) => path || "root";

  // collect expandable nodes to expand by default
  const collectExpandableIds = (value: any, path = ""): string[] => {
    const ids: string[] = [];
    if (isObject(value) || Array.isArray(value)) {
      ids.push(makeId(path || "root"));
      if (Array.isArray(value)) {
        value.forEach((item, idx) =>
          ids.push(...collectExpandableIds(item, path ? `${path}.${idx}` : `${idx}`))
        );
      } else {
        Object.entries(value).forEach(([k, v]) =>
          ids.push(...collectExpandableIds(v, path ? `${path}.${k}` : k))
        );
      }
    }
    return ids;
  };
  const defaultExpanded = Array.from(new Set(collectExpandableIds(data)));

  // color map
  const colors = {
    key: "#00799aff", // cyan-ish
    string: "#648c46ff", // green
    number: "#931bb8ff", // purple
    boolean: "#5a5a5aff", // orange
    nil: "#7f848e", // grey
    punctuation: "#a0a0a0",
  };

  const renderScalar = (value: any) => {
    if (value === null) return <span style={{ color: colors.nil }}>null</span>;
    if (typeof value === "boolean")
      return <span style={{ color: colors.boolean }}>{String(value)}</span>;
    if (typeof value === "number")
      return <span style={{ color: colors.number }}>{String(value)}</span>;
    if (typeof value === "string")
      return <span style={{ color: colors.string }}>"{value}"</span>;
    return <span style={{ color: colors.string }}>{String(value)}</span>;
  };

  // NOTE: for blocks (objects/arrays) we do NOT display "{...}" or "[...]" — just the key:
  const renderLabel = (key: string, value: any) => (
    <span style={{ fontFamily: "monospace", fontSize: 13 }}>
      <span style={{ color: colors.key }}>{key}</span>
      <span style={{ color: colors.punctuation }}>:</span>
      {/* If scalar, show value; if object/array, show nothing after colon (no {...} / [...]) */}
      {isObject(value) || Array.isArray(value) ? null : <span> {renderScalar(value)}</span>}
    </span>
  );

  const renderTree = (key: string, value: any, path = ""): React.ReactNode => {
    const nodePath = path ? `${path}.${key}` : key;
    const nodeId = makeId(nodePath);

    if (Array.isArray(value)) {
      return (
        <TreeItem key={nodeId} nodeId={nodeId} label={renderLabel(key, value)}>
          {value.map((item, idx) =>
            isObject(item) || Array.isArray(item)
              ? renderTree(String(idx), item, nodePath)
              : (
                <TreeItem
                  key={makeId(`${nodePath}.${idx}`)}
                  nodeId={makeId(`${nodePath}.${idx}`)}
                  label={renderLabel(String(idx), item)}
                />
              )
          )}
        </TreeItem>
      );
    }

    if (isObject(value)) {
      return (
        <TreeItem key={nodeId} nodeId={nodeId} label={renderLabel(key, value)}>
          {Object.entries(value).map(([k, v]) => renderTree(k, v, nodePath))}
        </TreeItem>
      );
    }

    // scalar
    return (
      <TreeItem
        key={nodeId}
        nodeId={nodeId}
        label={renderLabel(key, value)}
      />
    );
  };

  return (
    <Box className="border" sx={{ p: 1, maxHeight: "70vh", overflow: "auto" }}>
      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        defaultExpanded={defaultExpanded}
      >
        {Object.entries(data).map(([k, v]) => renderTree(k, v, ""))}
      </TreeView>
    </Box>
  );
};

export default YAMLCodeBlock;