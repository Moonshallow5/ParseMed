import { useState } from "react";
import MainLayout from '../components/MainLayout';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import pdf2md from '@opendocsg/pdf2md';

function extractTableSections(markdown) {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  let result = '';
  let currentTable = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we're starting Table 1 or Table 2
    if (/^TABLE\s*[12]\./i.test(line)) {
      // If we have content from a previous table, add it to result
      if (currentTable.length > 0) {
        result += currentTable.join('\n') + '\n\n';
      }
      // Start new table content
      currentTable = [line];
      continue;
    }
    
    // If we have table content, collect lines
    if (currentTable.length > 0) {
      // Stop if we hit a sentence (starts with capital letter and ends with period)
      if (/^[A-Z][^.]*\.$/.test(line) && line.length > 20) {
        break;
      }
      
      // Stop if we hit footnotes or abbreviations
      if (
        /^[*†‡]/.test(line) ||                     // footnote symbols
        /^[A-Z]{2,}\s*=/.test(line) ||             // abbreviation definitions
        /^Abbreviations[:]?/i.test(line) ||        // catch "Abbreviations:"
        /^See.*Table/i.test(line)                  // catch references
      ) {
        break;
      }
      
      // Add the line if it's not empty or just whitespace
      if (line.length > 0) {
        currentTable.push(line);
      }
    }
  }
  
  // Add the last table if we have content
  if (currentTable.length > 0) {
    result += currentTable.join('\n');
  }

  return result.trim() || 'No Table 1 or Table 2 found in Markdown.';
}

// Clean table body by removing footnotes and definitions
// function cleanTableBody(text) {
//   return text
//     .split('\n')
//     .filter(line => {
//       const trimmed = line.trim();
//       return (
//         trimmed !== '' &&
//         !/^\s*(\*|†|‡)/.test(trimmed) && // footnotes
//         !/^[A-Z]{2,}\s*=/.test(trimmed) // definitions like EDH = ...
//       );
//     })
//     .join('\n');
// }

function DocumentUploadMarkdown() {
  const [file, setFile] = useState(null);
  const [markdown, setMarkdown] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [jsonOutput, setJsonOutput] = useState(null);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonError, setJsonError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const onFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMarkdown(null);
      setJsonOutput(null);
      setExtractError(null);
      setJsonError(null);
      setLoadingExtract(true);
      try {
        // Read the PDF as ArrayBuffer
        const arrayBuffer = await selectedFile.arrayBuffer();
        // Convert PDF to Markdown
        const md = await pdf2md(arrayBuffer);
        setMarkdown(md);
      } catch (err) {
        setExtractError(err.message);
      } finally {
        setLoadingExtract(false);
      }
    }
  };

  const handleExtractJson = async () => {
    setJsonLoading(true);
    setJsonError(null);
    setJsonOutput(null);
    try {
      // Extract only the table sections from the markdown
      const extractedTables = extractTableSections(markdown);
      
      const response = await fetch('http://localhost:8000/markdown-to-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: extractedTables }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setJsonOutput(data.json);
      console.log('LLM Extracted JSON:', data.json);
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setJsonLoading(false);
    }
  };

  const handleLogout = () => {
    alert('Logged out!');
  };

  // Helper function to get all unique column keys from all rows
  const getAllColumnKeys = (rows) => {
    const allKeys = new Set();
    rows.forEach(row => {
      if (!row.group) {
        Object.keys(row).forEach(key => allKeys.add(key));
      }
    });
    return Array.from(allKeys).sort(); // Sort keys for consistent ordering
  };

  // Edit functions
  const startEditing = (tableKey, rowIndex, columnKey, currentValue) => {
    setEditingCell({ tableKey, rowIndex, columnKey });
    setEditValue(currentValue || '');
  };

  const saveEdit = () => {
    if (editingCell) {
      const { tableKey, rowIndex, columnKey } = editingCell;
      const updatedOutput = { ...jsonOutput };
      const tableRows = [...updatedOutput[tableKey]];
      
      if (tableRows[rowIndex]) {
        tableRows[rowIndex] = { ...tableRows[rowIndex], [columnKey]: editValue };
        updatedOutput[tableKey] = tableRows;
        setJsonOutput(updatedOutput);
      }
      
      setEditingCell(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const addRow = (tableKey) => {
    const updatedOutput = { ...jsonOutput };
    const tableRows = [...updatedOutput[tableKey]];
    const allKeys = getAllColumnKeys(tableRows);
    
    const newRow = {};
    allKeys.forEach(key => {
      newRow[key] = '';
    });
    
    tableRows.push(newRow);
    updatedOutput[tableKey] = tableRows;
    setJsonOutput(updatedOutput);
  };

  const deleteRow = (tableKey, rowIndex) => {
    const updatedOutput = { ...jsonOutput };
    const tableRows = [...updatedOutput[tableKey]];
    tableRows.splice(rowIndex, 1);
    updatedOutput[tableKey] = tableRows;
    setJsonOutput(updatedOutput);
  };



  return (
    <MainLayout onLogout={handleLogout}>
      <Box>
        <h2>Upload PDF (Markdown Table Extraction)</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          style={{ marginBottom: 16 }}
          disabled={loadingExtract || jsonLoading}
        />
        {loadingExtract && <Typography sx={{ mt: 2 }}>Extracting Markdown from PDF...</Typography>}
        {extractError && <Typography color="error" sx={{ mt: 2 }}>{extractError}</Typography>}
                 {markdown && (
           <Card sx={{ mt: 2, p: 2, maxWidth: '800px' }}>
             <CardContent>
               <Typography variant="h6">Extracted Markdown (Table 1 & 2 only)</Typography>
               <pre style={{ 
                 background: '#f7f7f7', 
                 padding: 8, 
                 borderRadius: 4, 
                 overflowX: 'auto',
                 fontSize: '0.75rem',
                 lineHeight: '1.2',
                 maxHeight: '200px',
                 overflowY: 'auto'
               }}>{extractTableSections(markdown)}</pre>
               <Button
                 variant="contained"
                 sx={{ mt: 2 }}
                 onClick={handleExtractJson}
                 disabled={jsonLoading}
               >
                 {jsonLoading ? 'Extracting...' : 'Extract Table Data with LLM'}
               </Button>
               {jsonError && <Typography color="error" sx={{ mt: 2 }}>{jsonError}</Typography>}
             </CardContent>
           </Card>
         )}
      </Box>

      {/* Table Layout - Outside the Box */}
      {jsonOutput && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Extracted Table Data (Formatted)
          </Typography>
          {typeof jsonOutput === 'object' ? (
            Object.entries(jsonOutput).map(([tableKey, rows], tableIdx) => {
              const allColumnKeys = getAllColumnKeys(rows);
              return (
                                 <Box key={tableIdx} sx={{ mb: 4 }}>
                                       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {tableKey}
                      </Typography>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => addRow(tableKey)}
                        startIcon={<AddIcon />}
                      >
                        Add Row
                      </Button>
                    </Box>
                   <TableContainer component={Paper} sx={{ mb: 2, maxWidth: '100%', overflowX: 'auto' }}>
                     <Table size="small" sx={{ minWidth: 500, maxWidth: '100%' }}>
                       <TableHead>
                         <TableRow>
                                                       {allColumnKeys.map((key, idx) => (
                              <TableCell 
                                key={idx} 
                                sx={{ 
                                  fontWeight: 'bold',
                                  textAlign: idx === 0 ? 'left' : 'center',
                                  backgroundColor: '#f5f5f5',
                                  maxWidth: idx === 0 ? 150 : 80,
                                  minWidth: idx === 0 ? 120 : 70,
                                  padding: '8px 4px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {key}
                              </TableCell>
                            ))}
                           <TableCell sx={{ width: 60, backgroundColor: '#f5f5f5' }}>
                             Actions
                           </TableCell>
                         </TableRow>
                       </TableHead>
                                             <TableBody>
                         {rows.map((row, rowIdx) =>
                           row.group ? (
                             <TableRow key={rowIdx}>
                               <TableCell
                                 colSpan={allColumnKeys.length + 1}
                                 sx={{
                                   fontWeight: 'bold',
                                   backgroundColor: '#f0f0f0',
                                   textAlign: 'left',
                                   padding: '6px 8px',
                                   fontSize: '0.8rem'
                                 }}
                               >
                                 {row.group}
                               </TableCell>
                             </TableRow>
                           ) : (
                             <TableRow key={rowIdx}>
                               {allColumnKeys.map((key, colIdx) => {
                                 const isEditing = editingCell && 
                                   editingCell.tableKey === tableKey && 
                                   editingCell.rowIndex === rowIdx && 
                                   editingCell.columnKey === key;
                                 
                                 return (
                                   <TableCell 
                                     key={colIdx}
                                     sx={{ 
                                       textAlign: colIdx === 0 ? 'left' : 'center',
                                       wordBreak: 'break-word',
                                       maxWidth: colIdx === 0 ? 150 : 80,
                                       minWidth: colIdx === 0 ? 120 : 70,
                                       padding: '6px 4px',
                                       fontSize: '0.75rem',
                                       lineHeight: '1.2',
                                       cursor: 'pointer',
                                       '&:hover': {
                                         backgroundColor: '#f5f5f5'
                                       }
                                     }}
                                     onClick={() => startEditing(tableKey, rowIdx, key, row[key])}
                                   >
                                     {isEditing ? (
                                       <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                         <TextField
                                           size="small"
                                           value={editValue}
                                           onChange={(e) => setEditValue(e.target.value)}
                                           onKeyPress={(e) => {
                                             if (e.key === 'Enter') saveEdit();
                                             if (e.key === 'Escape') cancelEdit();
                                           }}
                                           onBlur={saveEdit}
                                           autoFocus
                                           sx={{ flex: 1 }}
                                         />
                                         <IconButton size="small" onClick={cancelEdit} sx={{ ml: 1 }}>
                                           <CancelIcon fontSize="small" />
                                         </IconButton>
                                       </Box>
                                     ) : (
                                       <span>{row[key] || ''}</span>
                                     )}
                                   </TableCell>
                                 );
                               })}
                               <TableCell sx={{ width: 60 }}>
                                 <IconButton 
                                   size="small" 
                                   onClick={() => deleteRow(tableKey, rowIdx)}
                                   color="error"
                                 >
                                   <DeleteIcon fontSize="small" />
                                 </IconButton>
                               </TableCell>
                             </TableRow>
                           )
                         )}
                       </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })
          ) : (
            <Card sx={{ mt: 2, background: '#f7f7f7' }}>
              <CardContent>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {jsonOutput}
                </pre>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </MainLayout>
  );
}

export default DocumentUploadMarkdown;