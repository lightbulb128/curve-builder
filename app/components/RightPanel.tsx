"use client";

import { Box, Paper, Stack, Typography, Divider, Button, Select, MenuItem, IconButton, TextField, FormControlLabel, Checkbox } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import { SequencedMover } from "../type/Mover";
import { Parser, Program, Tokenizer } from "../type/Parser";
import { useState, useEffect, useRef } from "react";

type Props = {
  setProgram: (program: Program) => void;
  programString: string;
  setProgramString: (programString: string) => void;
};

export default function RightPanel({ setProgram, programString, setProgramString }: Props) {

  const [errorMessage, setErrorMessage] = useState("");

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
    const program = parser.parse();
    // compile
    if (typeof program === "string") {
      setErrorMessage(program);
      return;
    }
    setProgram(program);
    setErrorMessage("");
  }

  return (
    <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
      <Stack spacing={2} height="100%">
        <Typography variant="h6">Path Builder</Typography>
        <Divider />
        <Box flex={1} minHeight={0} display="flex">
          <TextField
            label="Path"
            multiline
            variant="outlined"
            fullWidth
            sx={{
              flex: 1,
              "& .MuiInputBase-root": { height: "100%" },
              "& textarea": {
                height: "100% !important",
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "14px",
                whiteSpace: "pre",
                overflowWrap: "normal",
              },
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
            value={programString}
            onChange={e => {
              handleInputChange(e.target.value);
              setProgramString(e.target.value);
            }}
          />
        </Box>
        <Box height="1.5em" display="flex" alignItems="center">
          {errorMessage ? (
            <Typography color="error" noWrap>{errorMessage}</Typography>
          ) : (
            <Typography color="primary">Good</Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
