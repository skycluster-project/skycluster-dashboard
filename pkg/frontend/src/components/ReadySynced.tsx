import React from "react";
import { Status } from "../types";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const isConditionTrue = (status?: Status, type?: string) =>
  (status?.conditions ?? []).some((c: any) => c.type === type && c.status === "True");

export default function ReadySynced({ status }: { status?: Status }) {
  const ready = isConditionTrue(status, "Ready");
  const synced = isConditionTrue(status, "Synced");

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        size="small"
        label={ready ? "Ready" : "Not Ready"}
        color={ready ? "success" : "default"}
        icon={ready ? <CheckCircleIcon /> : undefined}
      />
      <Chip
        size="small"
        label={synced ? "Synced" : "Not Synced"}
        color={synced ? "info" : "default"}
      />
    </Stack>
  );
}