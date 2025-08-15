import { useState, useEffect } from "react";
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function DocumentUploadMarkdown() {
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [selectedConfigData, setSelectedConfigData] = useState(null);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState(null);
  const [file, setFile] = useState(null);
  const [markdown, setMarkdown] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonError, setJsonError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Fetch configurations on component mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setConfigsLoading(true);
        setConfigsError(null);
        const response = await fetch('http://localhost:8000/get-configurations');
        if (!response.ok) {
          throw new Error('Failed to fetch configurations');
        }
        const data = await response.json();
        if (data.success) {
          setConfigs(data.configurations || []);
        } else {
          setConfigsError(data.error || 'Failed to fetch configurations');
        }
      } catch (err) {
        setConfigsError(err.message);
      } finally {
        setConfigsLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  // Reset file and related state when config changes
  useEffect(() => {
    setFile(null);
    setMarkdown(null);
    setExtractedData(null);
    setExtractError(null);
    setJsonError(null);
    
    // Set the selected config data for reference
    if (selectedConfig) {
      const config = configs.find(c => c.id === selectedConfig);
      setSelectedConfigData(config);
    } else {
      setSelectedConfigData(null);
    }
  }, [selectedConfig, configs]);

  const onFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMarkdown(null);
      setExtractedData(null);
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

  const handleExtractData = async () => {
    if (!selectedConfigData || !markdown) return;
    
    setJsonLoading(true);
    setJsonError(null);
    setExtractedData(null);
    
    try {
      // Send the full markdown and configuration template to OpenAI
      const response = await fetch('http://localhost:8000/markdown-to-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          markdown: markdown,
          template: selectedConfigData.template_json // Send the configuration template
        }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      setExtractedData(data.json);
      console.log('LLM Extracted Data:', data.json);
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setJsonLoading(false);
    }
  };

  // Helper function to get all unique keys from extracted data
  const getAllKeys = (data) => {
    if (!data || typeof data !== 'object') return [];
    
    const allKeys = new Set();
    
    if (Array.isArray(data)) {
      // If data is an array, get keys from all objects
      data.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(key => allKeys.add(key));
        }
      });
    } else {
      // If data is a single object, get its keys
      Object.keys(data).forEach(key => allKeys.add(key));
    }
    
    return Array.from(allKeys).sort();
  };

  // Helper function to normalize data for table display
  const normalizeDataForTable = (data) => {
    if (!data) return [];
    
    if (Array.isArray(data)) {
      return data;
    } else if (typeof data === 'object') {
      // Convert single object to array with one item
      return [data];
    } else {
      // If it's a primitive value, wrap it in an object
      return [{ value: data }];
    }
  };

  // Edit functions
  const startEditing = (rowIndex, columnKey, currentValue) => {
    setEditingCell({ rowIndex, columnKey });
    setEditValue(currentValue || '');
  };

  const saveEdit = () => {
    if (editingCell && extractedData) {
      const { rowIndex, columnKey } = editingCell;
      const updatedData = [...extractedData];
      
      if (updatedData[rowIndex]) {
        updatedData[rowIndex] = { ...updatedData[rowIndex], [columnKey]: editValue };
        setExtractedData(updatedData);
      }
      
      setEditingCell(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const addRow = () => {
    if (!extractedData) return;
    
    const updatedData = [...extractedData];
    const allKeys = getAllKeys(updatedData);
    
    const newRow = {};
    allKeys.forEach(key => {
      newRow[key] = '';
    });
    
    updatedData.push(newRow);
    setExtractedData(updatedData);
  };

  const deleteRow = (rowIndex) => {
    if (!extractedData) return;
    
    const updatedData = [...extractedData];
    updatedData.splice(rowIndex, 1);
    setExtractedData(updatedData);
  };

  const saveDataToJson = () => {
    if (!extractedData) return;
    
    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `extracted_data_${timestamp}.json`;
    
    // Create the data object with metadata
    const dataToSave = {
      metadata: {
        extractedAt: new Date().toISOString(),
        source: file?.name || 'Unknown PDF',
        configuration: selectedConfigData?.name || 'Unknown Config',
        totalRows: Array.isArray(extractedData) ? extractedData.length : 1
      },
      extractedData: extractedData
    };
    
    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(dataToSave, null, 2);
    
    // Create and download the file
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Optional: Show success message
    alert(`Data saved successfully as ${filename}`);
  };

  const saveDataToBackend = async () => {
    if (!extractedData) return;
    
    try {
      // Convert PDF file to base64
      let pdfBase64 = null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const binary = bytes.reduce((data, byte) => data + String.fromCharCode(byte), '');
        pdfBase64 = 'data:application/pdf;base64,' + btoa(binary);
      }
      
      const dataToSave = {
        metadata: {
          extractedAt: new Date().toISOString(),
          source: file?.name || 'Unknown PDF',
          configuration: selectedConfigData?.name || 'Unknown Config',
          totalRows: Array.isArray(extractedData) ? extractedData.length : 1
        },
        extractedData: extractedData,
        pdf_file: pdfBase64
      };
      
      const response = await fetch('http://localhost:8000/save-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result = await response.json();
      alert(`Data and PDF saved to S3 successfully!\nJSON: ${result.s3_keys.tables_json}\nPDF: ${result.s3_keys.pdf_file}`);
      
    } catch (err) {
      alert(`Error saving to S3: ${err.message}`);
    }
  };

  return (
    <MainLayout>
      <Box sx={{paddingTop:'80px'}}>
        <Typography variant="h4" gutterBottom>
          PDF Data Extraction with Configuration
        </Typography>
        
        {/* Configuration Selection */}
        <FormControl fullWidth>
          <InputLabel>Select Configuration</InputLabel>
          <Select
            value={selectedConfig}
            label="Select Configuration"
            onChange={(e) => setSelectedConfig(e.target.value)}
            disabled={configsLoading}
            variant="standard"
            fullWidth
            MenuProps={MenuProps}
            sx={{backgroundColor:'white'}}
          >

            {configs.map((config) => (
              <MenuItem key={config.id} value={config.id}>
                {config.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {configsError && (
          <Typography color="error" sx={{ fontSize: '0.875rem' }}>
            {configsError}
          </Typography>
        )}

        {/* Show selected configuration details */}
        
        {selectedConfigData && (
          <Card sx={{ mt: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration: {selectedConfigData.name}
              </Typography>
              
              {/* Debug: Show the full template_json structure */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Template Structure:</strong>
              </Typography>
              <Box sx={{ 
                background: '#f5f5f5', 
                p: 1, 
                borderRadius: 1, 
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <pre>{JSON.stringify(selectedConfigData.template_json, null, 2)}</pre>
              </Box>
              
              {/* Show attributes if they exist */}
              {selectedConfigData.template_json?.attributes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  <strong>Attributes to extract:</strong> {(selectedConfigData.template_json.attributes.length)}
                </Typography>
              )}
              
              {/* Show queries if they exist */}
              {selectedConfigData.template_json?.queries && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Queries:</strong> {Object.keys(selectedConfigData.template_json.queries).join(', ')}
                </Typography>
              )}
              
              {/* Show creation date */}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Created:</strong> {selectedConfigData.created_at ? new Date(selectedConfigData.created_at).toLocaleString() : 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* File Upload - Only show after config selection */}
        {selectedConfig && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Upload PDF for "{configs.find(c => c.id === selectedConfig)?.name}"
            </Typography>
            <div>
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          style={{ marginBottom: 16 }}
          disabled={loadingExtract || jsonLoading}
        />
            </div>
          </Box>
        )}

        {!selectedConfig && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Please select a configuration first to begin PDF extraction.
          </Typography>
        )}

        {loadingExtract && <Typography sx={{ mt: 2 }}>Extracting Markdown from PDF...</Typography>}
        {extractError && <Typography color="error" sx={{ mt: 2 }}>{extractError}</Typography>}
        
                 {markdown && (
           <Card sx={{ mt: 2, p: 2, maxWidth: '800px' }}>
             <CardContent>
              <Typography variant="h6">Extracted Markdown</Typography>
               <pre style={{ 
                 background: '#f7f7f7', 
                 padding: 8, 
                 borderRadius: 4, 
                 overflowX: 'auto',
                 fontSize: '0.75rem',
                 lineHeight: '1.2',
                 maxHeight: '200px',
                 overflowY: 'auto'
              }}>{markdown.substring(0, 500)}...</pre>
               <Button
                 variant="contained"
                 sx={{ mt: 2 }}
                onClick={handleExtractData}
                 disabled={jsonLoading}
               >
                {jsonLoading ? 'Extracting Data...' : 'Extract Data with LLM'}
               </Button>
               {jsonError && <Typography color="error" sx={{ mt: 2 }}>{jsonError}</Typography>}
             </CardContent>
           </Card>
         )}

        {/* Extracted Data Display */}
        {extractedData && (
         <Box sx={{ mt: 4 }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
             <Typography variant="h5">
                Extracted Data
             </Typography>
             <Box sx={{ display: 'flex', gap: 2 }}>
               <Button
                 variant="outlined"
                 color="primary"
                  onClick={saveDataToJson}
                 startIcon={<SaveIcon />}
               >
                 Download JSON
               </Button>
                               <Button
                  variant="contained"
                  color="primary"
                  onClick={saveDataToBackend}
                  startIcon={<SaveIcon />}
                >
                  Save to S3
                </Button>
             </Box>
           </Box>
            
            {/* JSON Display */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  OpenAI Extraction Result
                </Typography>
                <Box sx={{ 
                  background: '#f8f9fa', 
                  p: 2, 
                  borderRadius: 1, 
                  border: '1px solid #e9ecef',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <pre style={{ 
                    margin: 0,
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                </Box>
                
                {/* Summary of extracted data */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Extracted {Object.keys(extractedData).length} field(s):</strong> {Object.keys(extractedData).join(', ')}
                      </Typography>
                    </Box>
              </CardContent>
            </Card>
            
            {/* Table Display of Extracted Data */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Extracted Data Table
                </Typography>
                   <TableContainer component={Paper} sx={{ mb: 2, maxWidth: '100%', overflowX: 'auto' }}>
                     <Table size="small" sx={{ minWidth: 500, maxWidth: '100%' }}>
                       <TableHead>
                         <TableRow>
                        <TableCell sx={{ 
                          fontWeight: 'bold',
                          backgroundColor: '#f5f5f5',
                          minWidth: 150
                        }}>
                          Field Name
                        </TableCell>
                        {(() => {
                          // Find the maximum number of comma-separated values across all fields
                          const maxColumns = Math.max(
                            ...Object.values(extractedData).map(value => 
                              String(value).split(';').length
                            )
                          );
                          
                          // Generate column headers
                          return Array.from({ length: maxColumns }, (_, index) => (
                              <TableCell 
                              key={index} 
                                sx={{ 
                                  fontWeight: 'bold',
                                  backgroundColor: '#f5f5f5',
                                textAlign: 'center',
                                minWidth: 120
                              }}
                            >
                              Value {index + 1}
                              </TableCell>
                          ));
                        })()}
                         </TableRow>
                       </TableHead>
                                             <TableBody>
                      {Object.entries(extractedData).map(([key, value], rowIdx) => {
                        // Split the value by comma and trim whitespace
                        const values = String(value).split(';').map(v => v.trim());
                        
                        return (
                             <TableRow key={rowIdx}>
                            <TableCell sx={{ 
                                   fontWeight: 'bold',
                                   backgroundColor: '#f0f0f0',
                              minWidth: 150
                            }}>
                              {key}
                               </TableCell>
                            {(() => {
                              // Find the maximum number of columns needed
                              const maxColumns = Math.max(
                                ...Object.values(extractedData).map(value => 
                                  String(value).split(';').length
                                )
                              );
                              
                              // Generate cells for this row
                              return Array.from({ length: maxColumns }, (_, colIdx) => (
                                   <TableCell 
                                     key={colIdx}
                                     sx={{ 
                                    textAlign: 'center',
                                    minWidth: 120,
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {values[colIdx] || ''}
                                   </TableCell>
                              ));
                            })()}
                          </TableRow>
                                 );
                               })}
                       </TableBody>
                    </Table>
                  </TableContainer>
              </CardContent>
            </Card>
          </Box>
          )}
        </Box>
    </MainLayout>
  );
}

export default DocumentUploadMarkdown;