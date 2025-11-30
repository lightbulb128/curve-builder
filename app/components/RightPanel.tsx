"use client";

import { Box, Paper, Stack, Typography, Divider, Button, Select, MenuItem, IconButton, TextField, FormControlLabel, Checkbox } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import { SequencedMover } from "../type/Mover";
import { Parser, Tokenizer } from "../type/Parser";
import { useState } from "react";

type Props = {
  onChange: (mover: SequencedMover) => void;
};

export default function RightPanel({ onChange }: Props) {

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
    const mover = parser.parse();
    // compile
    if (typeof mover === "string") {
      setErrorMessage(mover);
      return;
    }
    onChange(mover);
    setErrorMessage("");
  }

  return (
    <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
      <Stack spacing={2}>
        <Typography variant="h6">Path Builder</Typography>
        <Divider />
        <TextField
          label="Path"
          multiline
          rows={20}
          variant="outlined"
          fullWidth
          onChange={e => handleInputChange(e.target.value)}
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
