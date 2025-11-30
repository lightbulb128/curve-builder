"use client";
import { useState } from "react";
import { Container, Box } from "@mui/material";
import CanvasContainer from "./components/CanvasContainer";
import RightPanel from "./components/RightPanel";
import CanvasSetting from "./type/CanvasSetting";
import { SequencedMover } from "./type/Mover";

function MainPage() {
  const [canvasSetting] = useState<CanvasSetting>(CanvasSetting.default());
  const [mover, setMover] = useState<SequencedMover>(new SequencedMover([]));
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" gap={2}>
        <Box flex={1} minWidth={0}>
          <CanvasContainer settings={canvasSetting} mover={mover} />
        </Box>
        <Box flexShrink={0} width={360}>
          <RightPanel onChange={setMover} />
        </Box>
      </Box>
    </Container>
  );
}

export default function Home() {
  return <MainPage />;
}
