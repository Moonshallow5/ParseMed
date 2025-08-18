import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import pdf2md from '@opendocsg/pdf2md';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API_BASE_URL } from '../config';



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
  const [attributesOrder, setAttributesOrder] = useState([]);
  const [pdfPresignedUrl, setPdfPresignedUrl] = useState(null);
  const [s3PdfKey, setS3PdfKey] = useState(null);
  const navigate = useNavigate();

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Fetch configurations on component mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setConfigsLoading(true);
        setConfigsError(null);
        const response = await fetch(`${API_BASE_URL}/get-configurations`);
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
      const response = await fetch(`${API_BASE_URL}/markdown-to-json`, {
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

  // Keep a stable order of attribute cards
  useEffect(() => {
    if (extractedData && typeof extractedData === 'object' && !Array.isArray(extractedData)) {
      setAttributesOrder(Object.keys(extractedData));
    } else {
      setAttributesOrder([]);
    }
  }, [extractedData]);

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

  // Normalize any value (string/object/array) into an array of column strings
  const normalizeValueToColumns = (value) => {
    if (value == null) return [""];
    if (Array.isArray(value)) {
      // Flatten one level to strings
      return value.map((item) => {
        if (item == null) return "";
        if (typeof item === 'object') return JSON.stringify(item);
        return String(item);
      });
    }
    if (typeof value === 'object') {
      // Turn object entries into "key: value"
      try {
        return Object.entries(value).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
      } catch (_) {
        return [JSON.stringify(value)];
      }
    }
    // Primitive/string → split by ';'
    return String(value)
      .split(';')
      .map((v) => v.trim())
      .filter((v) => v.length > 0 || v === "");
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
      
      const response = await fetch(`${API_BASE_URL}/save-tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result = await response.json();
      alert(`Data and PDF saved to S3 successfully!\nJSON: ${result.s3_keys.tables_json}\nPDF: ${result.s3_keys.pdf_file}`);
      setPdfPresignedUrl(result?.s3_urls?.pdf_file_url || null);
      setS3PdfKey(result?.s3_keys?.pdf_file || null);
 
    } catch (err) {
      alert(`Error saving to S3: ${err.message}`);
    }
  };

  // Per-attribute card helpers (matrix-based: rows x columns)
  const stringifyCell = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

  const deriveColumnsAndRows = (attributeKey) => {
    const raw = extractedData?.[attributeKey];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const columns = Object.keys(raw);
      const rows = [columns.map((k) => stringifyCell(raw[k]))];
      return { columns, rows, type: 'object' };
    }
    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
      const columns = Object.keys(raw[0]);
      const rows = raw.map((item) => columns.map((k) => stringifyCell(item?.[k])));
      return { columns, rows, type: 'arrayOfObjects' };
    }
    if (Array.isArray(raw)) {
      const columns = raw.map((_, idx) => `Value ${idx + 1}`);
      const rows = [raw.map((v) => stringifyCell(v))];
      return { columns, rows, type: 'array' };
    }
    const values = String(raw ?? '')
      .split(';')
      .map((v) => v.trim());
    const columns = values.map((_, idx) => `Value ${idx + 1}`);
    const rows = [values];
    return { columns, rows, type: 'primitive' };
  };

  const writeBackAttribute = (attributeKey, columns, rows, type) => {
    const updated = { ...extractedData };
    if (type === 'object') {
      const obj = {};
      columns.forEach((k, idx) => {
        obj[k] = rows[0]?.[idx] ?? '';
      });
      updated[attributeKey] = obj;
    } else if (type === 'arrayOfObjects') {
      const arr = rows.map((row) => {
        const obj = {};
        columns.forEach((k, idx) => {
          obj[k] = row?.[idx] ?? '';
        });
        return obj;
      });
      updated[attributeKey] = arr;
    } else if (type === 'array') {
      updated[attributeKey] = rows[0] ?? [];
    } else {
      updated[attributeKey] = (rows[0] ?? []).join('; ');
    }
    setExtractedData(updated);
  };

  const handleCellChange = (attributeKey, rowIndex, colIndex, newValue) => {
    const { columns, rows, type } = deriveColumnsAndRows(attributeKey);
    const nextRows = rows.map((r) => [...r]);
    // Ensure row exists
    while (nextRows.length <= rowIndex) nextRows.push(Array.from({ length: columns.length }, () => ''));
    // Ensure column exists across rows
    if (colIndex >= columns.length) {
      const numToAdd = colIndex - columns.length + 1;
      for (let i = 0; i < numToAdd; i++) {
        columns.push(`Value ${columns.length + 1}`);
        for (let r = 0; r < nextRows.length; r++) nextRows[r].push('');
      }
    }
    nextRows[rowIndex][colIndex] = newValue;
    writeBackAttribute(attributeKey, columns, nextRows, type);
  };

  const handleHeaderRename = (attributeKey, colIndex, newName) => {
    const { columns, rows, type } = deriveColumnsAndRows(attributeKey);
    if (!(type === 'object' || type === 'arrayOfObjects')) return;
    const nextColumns = [...columns];
    nextColumns[colIndex] = newName;
    writeBackAttribute(attributeKey, nextColumns, rows, type);
  };

  const handleAddColumn = (attributeKey) => {
    const { columns, rows, type } = deriveColumnsAndRows(attributeKey);
    const nextColumns = [...columns];
    const nextRows = rows.map((r) => [...r]);
    if (type === 'object' || type === 'arrayOfObjects') {
      let base = 'new_key';
      let idx = 1;
      let name = base;
      while (nextColumns.includes(name)) {
        name = `${base}_${idx++}`;
      }
      nextColumns.push(name);
    } else {
      nextColumns.push(`Value ${nextColumns.length + 1}`);
    }
    for (let r = 0; r < nextRows.length; r++) nextRows[r].push('');
    writeBackAttribute(attributeKey, nextColumns, nextRows, type);
  };

  const handleRemoveColumn = (attributeKey, colIndex) => {
    const { columns, rows, type } = deriveColumnsAndRows(attributeKey);
    const nextColumns = columns.filter((_, idx) => idx !== colIndex);
    const nextRows = rows.map((r) => r.filter((_, idx) => idx !== colIndex));
    writeBackAttribute(attributeKey, nextColumns, nextRows, type);
  };

  const handleAddRow = (attributeKey) => {
    const { columns, rows, type } = deriveColumnsAndRows(attributeKey);
    const nextRows = [...rows, Array.from({ length: columns.length }, () => '')];
    const nextType = type === 'object' ? 'arrayOfObjects' : type;
    writeBackAttribute(attributeKey, columns, nextRows, nextType);
  };

  const handleRemoveRow = (attributeKey, rowIndex) => {
    const { columns, rows, type } = deriveColumnsAndRows(attributeKey);
    if (type === 'object') {
      // Clear the single row
      const cleared = [Array.from({ length: columns.length }, () => '')];
      writeBackAttribute(attributeKey, columns, cleared, 'object');
      return;
    }
    if (type === 'arrayOfObjects') {
      const nextRows = rows.filter((_, idx) => idx !== rowIndex);
      writeBackAttribute(attributeKey, columns, nextRows, type);
      return;
    }
    // Primitive/array: remove last value (column)
    if (rows[0]?.length > 0) {
      const nextRows = [rows[0].slice(0, -1)];
      writeBackAttribute(attributeKey, columns.slice(0, -1), nextRows, type);
    }
  };


  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = attributesOrder.indexOf(active.id);
    const newIndex = attributesOrder.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setAttributesOrder((items) => arrayMove(items, oldIndex, newIndex));
  };

  const deleteAttributeRow = (attributeKey) => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    delete updated[attributeKey];
    setExtractedData(updated);
    setAttributesOrder((prev) => prev.filter((k) => k !== attributeKey));
  };

  // Sortable card wrapper
  function SortableAttributeCard({ attributeKey, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: attributeKey });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
    };
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        {children({ listeners })}
      </div>
    );
  }

  return (
    <MainLayout>
      <Box sx={{paddingTop:'80px'}}>
        <Typography variant="h4" gutterBottom>
          Document Upload
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
          <Card sx={{ mt: 2, mb: 2, alignSelf: 'flex-start' }}>
            <CardContent>
              <Typography variant="h6"  gutterBottom>
                Configuration: {selectedConfigData.name}
              </Typography>
              
              {/* Configuration attributes table (replaces raw JSON) */}
              {Array.isArray(selectedConfigData.template_json?.attributes) && selectedConfigData.template_json.attributes.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Configuration Attributes</strong>
                  </Typography>
                  <TableContainer component={Paper} sx={{ overflowX: 'auto', backgroundColor: '#f7f5f1' }}>
                    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 600 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Attribute Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Query</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedConfigData.template_json.attributes.map((attr, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ wordBreak: 'break-word' }}>{attr?.name || ''}</TableCell>
                            <TableCell sx={{ wordBreak: 'break-word' }}>{attr?.query || ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              
              {/* Show attributes if they exist */}
              {selectedConfigData.template_json?.attributes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  <strong>Attributes to extract:</strong> {(selectedConfigData.template_json.attributes.length)}
                </Typography>
              )}
                            
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Created:</strong> {selectedConfigData.created_at ? new Date(selectedConfigData.created_at).toLocaleString() : 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* File Upload - Only show after config selection */}
        {selectedConfig && (
          <Box sx={{ textAlign: 'left' }}>
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
                          <Button
                          variant="contained"
                          sx={{ mt: 2 }}
                         onClick={handleExtractData}
                          disabled={jsonLoading}
                        >
                         {jsonLoading ? 'Extracting Data...' : 'Extract Data with LLM'}
                        </Button>
         )}

        {/* Extracted Data Display */}
        {extractedData && (
         <Box sx={{ mt: 4 }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
             <Typography variant="h5">
                Extracted Data
             </Typography>
           </Box>
            
            {/* JSON Display
            <Card sx={{ mt: 2, p: 2, maxWidth: '800px' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  OpenAI Extraction Result
                </Typography>
              
                  <pre style={{ 
                 background: '#f7f7f7', 
                 padding: 8, 
                 borderRadius: 4, 
                 overflowX: 'auto',
                 fontSize: '0.75rem',
                 lineHeight: '1.2',
                 maxHeight: '200px',
                 overflowY: 'auto'
              }}>
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Extracted {Object.keys(extractedData).length} field(s):</strong> {Object.keys(extractedData).join(', ')}
                      </Typography>
                    </Box>
              </CardContent>
            </Card> */}
            
            {/* Table Display of Extracted Data */}
            <Card sx={{ mt: 2, maxWidth: '800px', width: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Extracted Data Table
                </Typography>
                   <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
                     <Table size="small"  style={{ tableLayout: 'fixed', width: '100%', minWidth: 700 }}>
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
                           // Compute max columns across normalized values
                           const maxColumns = Math.max(
                             ...Object.values(extractedData).map((value) => normalizeValueToColumns(value).length)
                           );
                           return Array.from({ length: maxColumns }, (_, index) => (
                             <TableCell
                               key={index}
                               sx={{
                                 fontWeight: 'bold',
                                 backgroundColor: '#f5f5f5',
                                 textAlign: 'center',
                                 minWidth: 120,
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
                        const values = normalizeValueToColumns(value);
                        
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
                              const maxColumns = Math.max(
                                ...Object.values(extractedData).map((v) => normalizeValueToColumns(v).length)
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
                                  {values[colIdx] ?? ''}
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

            {/* Draggable per-attribute cards */}
            {extractedData && typeof extractedData === 'object' && !Array.isArray(extractedData) && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Attribute Cards (Draggable, Inline Editable)
                </Typography>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={attributesOrder} strategy={verticalListSortingStrategy}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {attributesOrder.map((attrKey) => {
                        const { columns, rows, type } = deriveColumnsAndRows(attrKey);
                        return (
                          <SortableAttributeCard key={attrKey} attributeKey={attrKey}>
                            {({ listeners }) => (
                              <Card sx={{ p: 1, width: '100%', maxWidth: '800px' }}>
                                <CardContent>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                      {attrKey}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Button startIcon={<AddIcon />} size="small" onClick={() => handleAddColumn(attrKey)}>
                                        Add Column
                                      </Button>
                                      <IconButton size="small" {...listeners} aria-label="drag">
                                        <DragIndicatorIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                  <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          {columns.map((hdr, idx) => (
                                            <TableCell key={idx} align="center" sx={{ fontWeight: 'bold' }}>
                                              {(type === 'object' || type === 'arrayOfObjects') ? (
                                                <TextField
                                                  value={hdr}
                                                  onChange={(e) => handleHeaderRename(attrKey, idx, e.target.value)}
                                                  variant="standard"
                                                  size="small"
                                                  inputProps={{ style: { textAlign: 'center', fontWeight: 700 } }}
                                                />
                                              ) : (
                                                hdr
                                              )}
                                              <IconButton size="small" onClick={() => handleRemoveColumn(attrKey, idx)} aria-label={`remove column ${idx + 1}`}>
                                                <DeleteIcon fontSize="small" />
                                              </IconButton>
                                            </TableCell>
                                          ))}
                                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {rows.map((row, rowIdx) => {
                                          return (
                                            <TableRow key={rowIdx}>
                                              {row.map((val, colIdx) => (
                                                <TableCell key={colIdx} align="center">
                                                  <TextField
                                                    value={val}
                                                    onChange={(e) => handleCellChange(attrKey, rowIdx, colIdx, e.target.value)}
                                                    variant="standard"
                                                    fullWidth
                                                  />
                                                </TableCell>
                                              ))}
                                              <TableCell align="center">
                                                <IconButton color="error" onClick={() => handleRemoveRow(attrKey, rowIdx)} aria-label={`delete row ${rowIdx + 1}`}>
                                                  <DeleteIcon />
                                                </IconButton>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Button startIcon={<AddIcon />} size="small" onClick={() => handleAddRow(attrKey)}>
                                      Add Row
                                    </Button>
                                  </Box>
                                </CardContent>
                              </Card>
                            )}
                          </SortableAttributeCard>
                        );
                      })}
                    </Box>
                  </SortableContext>
                </DndContext>
              </Box>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, justifyContent: 'flex-start' }}>
               {/* <Button
                 variant="outlined"
                 color="primary"
                  onClick={saveDataToJson}
                 startIcon={<SaveIcon />}
               >
                 Download JSON
               </Button> */}
                 <Button
                   variant="contained"
                   color="primary"
                   onClick={saveDataToBackend}
                   startIcon={<SaveIcon />}
                 >
                   Save to S3
                 </Button>
                 <Button
                   variant="contained"
                   color="secondary"
                   disabled={!pdfPresignedUrl || !extractedData}
                   onClick={() => navigate('/side-by-side', { state: { pdfUrl: pdfPresignedUrl, extractedData, s3PdfKey } })}
                 >
                   Open Side-by-Side
                 </Button>
              </Box>
          </Box>
          )}
        </Box>
    </MainLayout>
  );
}

export default DocumentUploadMarkdown;