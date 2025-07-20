import { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TextField from '@mui/material/TextField';

export default function KeyValueTable({
  initialColumns = ["", ""],
  initialRows = [["", ""]],
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);

  // Add a new column
  const handleAddColumn = () => {
    setColumns([...columns, `Column ${columns.length + 1}`]);
    setRows(rows.map(row => [...row, ""]));
  };

  // Remove a column
  const handleDeleteColumn = (colIdx) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, idx) => idx !== colIdx));
    setRows(rows.map(row => row.filter((_, idx) => idx !== colIdx)));
  };

  // Edit a column header
  const handleColumnChange = (idx, value) => {
    const updated = [...columns];
    updated[idx] = value;
    setColumns(updated);
  };

  // Add a new row
  const handleAddRow = () => {
    setRows([...rows, Array(columns.length).fill("")]);
  };

  // Remove a row
  const handleDeleteRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Edit a cell
  const handleCellChange = (rowIdx, colIdx, value) => {
    const updated = rows.map((row, rIdx) =>
      rIdx === rowIdx ? row.map((cell, cIdx) => (cIdx === colIdx ? value : cell)) : row
    );
    setRows(updated);
  };

  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((col, idx) => (
            <TableCell key={idx}>
              <TextField
                value={col}
                onChange={e => handleColumnChange(idx, e.target.value)}
                size="small"
                fullWidth
              />
              <IconButton onClick={() => handleDeleteColumn(idx)} size="small" disabled={columns.length <= 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </TableCell>
          ))}
          <TableCell>
            <IconButton onClick={handleAddColumn} size="small">
              <AddIcon fontSize="small" />
            </IconButton>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, rowIdx) => (
          <TableRow key={rowIdx}>
            {columns.map((_, colIdx) => (
              <TableCell key={colIdx}>
                <TextField
                  value={row[colIdx] || ""}
                  onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ minWidth: 200 }}
                />
              </TableCell>
            ))}
            <TableCell>
              <IconButton onClick={() => handleDeleteRow(rowIdx)} size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={columns.length + 1} align="center">
            <IconButton onClick={handleAddRow} size="small">
              <AddIcon fontSize="small" />
            </IconButton>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
} 