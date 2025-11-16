import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type Props = {
  super?: string;
  title: string;
  infoPieces?: React.ReactNode;
};

export default function HeaderBar({ super: superText, title, infoPieces }: Props) {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        p: 2,
        mb: 4,
        borderRadius: 0,
        bgcolor: "background.paper",      // theme-aware
        boxShadow: 3,
      }}
    >
      <Box>
        {superText && (
          <Typography
            variant="overline"
            sx={{
              display: "block",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "text.secondary",
              mb: 0.5,
            }}
          >
            {superText}
          </Typography>
        )}
        <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
          {title}
        </Typography>
      </Box>

      <Box
        sx={{
          ml: "auto",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          // keep right-hand elements compact on small screens
          "& > *": { whiteSpace: "nowrap" },
        }}
      >
        {infoPieces}
      </Box>
    </Box>
  );
}