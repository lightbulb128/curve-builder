"use client";

import { Box, Paper, Stack, Typography, Divider, Button, Select, MenuItem, IconButton, TextField, FormControlLabel, Checkbox } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import { SequencedMover } from "../type/Mover";
import { Parser, Tokenizer } from "../type/Parser";
import { useState, useEffect, useRef } from "react";

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

type Props = {
  onChange: (mover: SequencedMover) => void;
};

export default function RightPanel({ onChange }: Props) {

  const [errorMessage, setErrorMessage] = useState("");
  const [inputValue, setInputValue] = useState(startValue);
  const didInitRef = useRef(false);

  const handleInputChange = (value: string) => {
    if (false) {
      const tokenizer = new Tokenizer(value);
      console.log("Tokenized:")
      while (true) {
        const token = tokenizer.nextToken();
        if (token === null) break;
        console.log(token);
      }
    }
    const parser = new Parser(value);
    const mover = parser.parse();
    // compile
    if (typeof mover === "string") {
      setErrorMessage(mover);
      return;
    }
    onChange(mover);
    setErrorMessage("");
  }

  // Call onChange once with the initial startValue (guarded against React StrictMode double effect)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    handleInputChange(startValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
      <Stack spacing={2}>
        <Typography variant="h6">Path Builder</Typography>
        <Divider />
        <TextField
          label="Path"
          multiline
          rows={25}
          variant="outlined"
          fullWidth
          slotProps={{
            input: { style: { 
              fontFamily: "monospace",
              fontSize: "14px",
              overflow: "auto",
              whiteSpace: "pre",
              overflowWrap: "normal",
            } },
          }}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const target = e.target as HTMLInputElement;
              const start = target.selectionStart || 0;
              const end = target.selectionEnd || 0;
              const value = target.value;
              target.value = value.substring(0, start) + '\t' + value.substring(end);
              target.selectionStart = target.selectionEnd = start + 1;
            } else if (e.key === 'Enter') {
              // add indentation
              const target = e.target as HTMLInputElement;
              const start = target.selectionStart || 0;
              const value = target.value;
              const lineStart = value.lastIndexOf('\n', start - 1) + 1;
              const line = value.substring(lineStart, start);
              const indentMatch = line.match(/^\s*/);
              const indent = indentMatch ? indentMatch[0] : '';
              target.value = value.substring(0, start) + '\n' + indent + value.substring(start);
              target.selectionStart = target.selectionEnd = start + 1 + indent.length;
              e.preventDefault();
            }
          }}
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            handleInputChange(e.target.value);
          }}
        />
        {errorMessage && (
          <Typography color="error">{errorMessage}</Typography>
        )}
        {errorMessage === "" && (
          <Typography color="primary">Good</Typography>
        )}
      </Stack>
    </Paper>
  );
}
