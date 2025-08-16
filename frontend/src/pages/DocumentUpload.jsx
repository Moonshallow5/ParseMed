import { useState } from "react";
import { API_BASE_URL } from '../config';
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

function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [rawTables, setRawTables] = useState(null);
  const [tablesRaw, setTablesRaw] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [aiOutput, setAiOutput] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const onFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setRawTables(null);
      setTablesRaw(null);
      setAiOutput(null);
      setExtractError(null);
      setAiError(null);
      setLoadingExtract(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const response = await fetch(`${API_BASE_URL}/extract-tables`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        setRawTables(data.tables);
        setTablesRaw(data.tables_raw);
        console.log('Extracted tables (2D arrays):', data.tables);
        console.log('Extracted tables (raw JSON):', data.tables_raw);
        console.log('Table structure check:');
        data.tables.forEach((table, idx) => {
          console.log(`Table ${idx}:`, table);
          console.log(`Table ${idx} type:`, typeof table);
          console.log(`Table ${idx} is array:`, Array.isArray(table));
          if (Array.isArray(table)) {
            table.forEach((row, rowIdx) => {
              console.log(`  Row ${rowIdx}:`, row);
              console.log(`  Row ${rowIdx} type:`, typeof row);
              console.log(`  Row ${rowIdx} is array:`, Array.isArray(row));
            });
          }
        });
      } catch (err) {
        setExtractError(err.message);
      } finally {
        setLoadingExtract(false);
      }
    }
  };

  const handleAnalyzeAI = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiOutput(null);
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: rawTables }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setAiOutput(data.result);
      console.log('AI Output:', data.result);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    alert('Logged out!');
  };

  // Helper to render a table from 2D array
  const renderTable = (table, idx) => {
    // Safety check: ensure table is an array
    if (!Array.isArray(table)) {
      console.error(`Table ${idx} is not an array:`, table);
      return <Typography color="error">Invalid table structure</Typography>;
    }
    
    return (
      <TableContainer key={idx} sx={{ mb: 2 }}>
        <Table size="small">
          <TableBody>
            {table.map((row, rIdx) => {
              // Safety check: ensure row is an array
              if (!Array.isArray(row)) {
                console.error(`Row ${rIdx} in table ${idx} is not an array:`, row);
                return <TableRow key={rIdx}><TableCell>Invalid row structure</TableCell></TableRow>;
              }
              
              return (
                <TableRow key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <TableCell key={cIdx}>{cell}</TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <MainLayout onLogout={handleLogout}>
      <Box>
        <h2>Upload PDF (Table Extraction Only)</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          style={{ marginBottom: 16 }}
          disabled={loadingExtract || aiLoading}
        />
        {loadingExtract && <Typography sx={{ mt: 2 }}>Extracting tables from PDF...</Typography>}
        {extractError && <Typography color="error" sx={{ mt: 2 }}>{extractError}</Typography>}
        {rawTables && (
          <Card sx={{ mt: 2, p: 2 }}>
            <CardContent>
              <Typography variant="h6">Extracted Table Data</Typography>
              {rawTables.length === 0 && <Typography>No tables found in PDF.</Typography>}
              {rawTables.map((table, idx) => renderTable(table, idx))}
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={handleAnalyzeAI}
                disabled={aiLoading}
              >
                {aiLoading ? 'Analyzing...' : 'Analyze with AI'}
              </Button>
              {aiError && <Typography color="error" sx={{ mt: 2 }}>{aiError}</Typography>}
              {aiOutput && (
                <Card sx={{ mt: 2, background: '#f7f7f7' }}>
                  <CardContent>
                    <Typography variant="h6">AI Output</Typography>
                    {/* If AI output is a table, render as table, else show as JSON */}
                    {Array.isArray(aiOutput) ? (
                      aiOutput.map((table, idx) => renderTable(table, idx))
                    ) : (
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(aiOutput, null, 2)}</pre>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </MainLayout>
  );
}

export default DocumentUpload;