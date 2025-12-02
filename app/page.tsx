"use client";
import { useState } from "react";
import { Container, Box } from "@mui/material";
import CanvasContainer from "./components/CanvasContainer";
import RightPanel from "./components/RightPanel";
import CanvasSetting from "./type/CanvasSetting";
import { SequencedMover } from "./type/Mover";
import { Parser, Program } from "./type/Parser";

const startValue = `new MoverBuilder()
  .Uniform(100, e => e
    .Start(new Vector2(0, 3f))
    .Line(new Vector2(0.7f, 1.3f))
    .Arc(new Vector2(2f, 1.5f), 0.8f)
  )
  .Sine(220, e => e
    .BezierContinue(2.9f, new Vector2(2f, -3f), new Vector2(0, -3f), 100)
    .ArcContinue(1f, -2f)
    .LineContinue(0.7f)
    .ArcContinue(1.2f, 2f)
  )
  .SmoothStep(150, e => e
    .BezierContinue(1f, new Vector2(-2, 1.5f), new Vector2(-3, 2f), 100)
    .LineContinue(0.4f)
    .Bezier(new Vector2(-3, 4f), new Vector2(-1, 2f), new Vector2(0, 5f), 100)
  );
`
const startProgram = new Parser(startValue).parse() as Program;

function MainPage() {
  const [canvasSetting] = useState<CanvasSetting>(CanvasSetting.default());
  const [program, setProgram] = useState<Program>(startProgram);
  const [programString, setProgramString] = useState<string>(startValue);
  const setProgramWithString = (program: Program) => {
    setProgram(program);
    setProgramString(program.toProgramString());
  }
  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{ minHeight: "100vh", height: "100vh", width: "100vw", py: 0 }}
    >
      <Box display="flex" height="100%" width="100%">
        <Box
          flex="0 0 66.666%"
          maxWidth="66.666%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          {/* Keep the canvas centered inside the left two-thirds panel */}
          <Box display="flex" justifyContent="center" alignItems="center" width="100%" height="100%">
            <CanvasContainer settings={canvasSetting} program={program} setProgram={setProgramWithString} />
          </Box>
        </Box>
        <Box flex="0 0 33.333%" maxWidth="33.333%" height="100%">
          <RightPanel setProgram={setProgram} programString={programString} setProgramString={setProgramString} />
        </Box>
      </Box>
    </Container>
  );
}

export default function Home() {
  return <MainPage />;
}
