import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import TextField from '@mui/material/TextField';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SaveIcon from '@mui/icons-material/Save';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { API_BASE_URL } from '../config';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {pdfjs} from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function stringifyCell(v) {
  return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
}

function deriveColumnsAndRowsForValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const columns = Object.keys(value);
    const rows = [columns.map((k) => stringifyCell(value[k]))];
    return { columns, rows, type: 'object' };
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
    const columns = Object.keys(value[0]);
    const rows = value.map((item) => columns.map((k) => stringifyCell(item?.[k])));
    return { columns, rows, type: 'arrayOfObjects' };
  }
  if (Array.isArray(value)) {
    const columns = value.map((_, idx) => `Value ${idx + 1}`);
    const rows = [value.map((v) => stringifyCell(v))];
    return { columns, rows, type: 'array' };
  }
  const values = String(value ?? '')
    .split(';')
    .map((v) => v.trim());
  const columns = values.map((_, idx) => `Value ${idx + 1}`);
  const rows = [values];
  return { columns, rows, type: 'primitive' };
}

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

export default function SideBySide() {
  const location = useLocation();
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [attributesOrder, setAttributesOrder] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [sourceFilename, setSourceFilename] = useState(null);
  const [s3PdfKey, setS3PdfKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const containerRef = useRef(null);
  const [leftWidthPct, setLeftWidthPct] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUrlLoading, setPdfUrlLoading] = useState(false);
  const [isViewingSavedTable, setIsViewingSavedTable] = useState(false);
  const pdfContainerRef = useRef(null);
  const [pagePositions, setPagePositions] = useState([]);
  const [pdfWidth, setPdfWidth] = useState(800);

  useEffect(() => {
    try {
      if (location && location.state) {
        const { 
          pdfUrl: navPdfUrl, 
          extractedData: navData, 
          s3PdfKey: navPdfKey,
          pdfFile: navPdfFile,
          sourceFilename: navSourceFilename,
          isFromSavedTable: navIsFromSavedTable
        } = location.state || {};
        
        if (navData && typeof navData === 'object' && !Array.isArray(navData)) {
          setExtractedData(navData);
          setAttributesOrder(Object.keys(navData));
        }
        if (navPdfUrl) setPdfUrl(navPdfUrl);
        if (navPdfFile) setPdfFile(navPdfFile);
        if (navSourceFilename) setSourceFilename(navSourceFilename);
        if (navPdfKey) setS3PdfKey(navPdfKey);
        
        // If coming from a saved table, we need to generate a fresh presigned URL
        if (navIsFromSavedTable && navPdfKey) {
          setIsViewingSavedTable(true);
          generateFreshPdfUrl(navPdfKey);
        }
        
        return;
      }
    } catch (_) {}
  }, [location]);

  // Function to generate fresh presigned URL for PDF
  const generateFreshPdfUrl = async (pdfKey) => {
    try {
      setPdfUrlLoading(true);
      const response = await fetch(`${API_BASE_URL}/get-pdf-url?pdf_key=${encodeURIComponent(pdfKey)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.pdf_url) {
          setPdfUrl(data.pdf_url);
        }
      } else {
        console.error('Failed to generate fresh PDF URL');
      }
    } catch (err) {
      console.error('Error generating fresh PDF URL:', err);
    } finally {
      setPdfUrlLoading(false);
    }
  };

  // Function to scroll to a specific page in the PDF
  const scrollToPage = (pageNumber) => {
    if (pdfContainerRef.current && pagePositions[pageNumber - 1] !== undefined) {
      pdfContainerRef.current.scrollTo({
        top: pagePositions[pageNumber - 1],
        behavior: 'smooth'
      });
    }
  };

  // Function to handle card click and scroll to relevant page
  const handleCardClick = (attrKey) => {
    if (numPages === 0) return;
    
    // Enhanced logic: you can customize this based on your needs
    // Option 1: Scroll to a specific page based on attribute key
    // Option 2: Scroll to a page based on extracted data content
    // Option 3: Scroll to a random page (current implementation)
    
    // For now, using a hash-based approach to get consistent page for same attribute
    const hash = attrKey.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const targetPage = Math.abs(hash) % numPages + 1;
    
    console.log(`Scrolling to page ${targetPage} for attribute: ${attrKey}`);
    scrollToPage(targetPage);
    
    // You can enhance this by:
    // 1. Storing page information in your extracted data
    // 2. Using text analysis to find relevant pages
    // 3. Creating a mapping between attributes and pages
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e) => {
      try {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        const pct = (relativeX / rect.width) * 100;
        const clamped = Math.min(80, Math.max(20, pct));
        setLeftWidthPct(clamped);
      } catch {}
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isResizing]);

  // Create object URL from file if needed
  useEffect(() => {
    if (pdfFile && !pdfUrl) {
      const objectUrl = URL.createObjectURL(pdfFile);
      setPdfUrl(objectUrl);
      
      // Cleanup function to revoke URL only when component unmounts
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [pdfFile, pdfUrl]);

  // Calculate page positions when PDF loads
  useEffect(() => {
    if (numPages > 0 && pdfContainerRef.current) {
      const container = pdfContainerRef.current;
      const positions = [];
      let currentTop = 0;
      
      // Estimate page heights (you can adjust these values)
      const pageHeight = 1000; // Approximate height in pixels
      const pageMargin = 24; // 24px margin between pages
      
      for (let i = 0; i < numPages; i++) {
        positions.push(currentTop);
        currentTop += pageHeight + pageMargin;
      }
      
      setPagePositions(positions);
    }
  }, [numPages]);

  // Add scroll listener to track current page
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let currentPage = 1;
      
      for (let i = 0; i < pagePositions.length; i++) {
        if (scrollTop >= pagePositions[i]) {
          currentPage = i + 1;
        } else {
          break;
        }
      }
      
      setCurrentPage(currentPage);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pagePositions, numPages]);

  // Update PDF width when left panel width changes or window resizes
  useEffect(() => {
    const updatePdfWidth = () => {
      const newWidth = Math.min(
        Math.max(700, (100 - leftWidthPct) * 0.9 * window.innerWidth / 100),
        1200
      );
      setPdfWidth(newWidth);
    };

    // Update immediately
    updatePdfWidth();

    // Add window resize listener
    window.addEventListener('resize', updatePdfWidth);
    return () => window.removeEventListener('resize', updatePdfWidth);
  }, [leftWidthPct]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = attributesOrder.indexOf(active.id);
    const newIndex = attributesOrder.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setAttributesOrder((items) => arrayMove(items, oldIndex, newIndex));
  };

  const handleCellChange = (attributeKey, rowIndex, colIndex, newValue) => {
    const { columns, rows, type } = deriveColumnsAndRowsForValue(extractedData?.[attributeKey]);
    const nextRows = rows.map((r) => [...r]);
    while (nextRows.length <= rowIndex) nextRows.push(Array.from({ length: columns.length }, () => ''));
    if (colIndex >= columns.length) {
      const numToAdd = colIndex - columns.length + 1;
      for (let i = 0; i < numToAdd; i++) {
        columns.push(`Value ${columns.length + 1}`);
        for (let r = 0; r < nextRows.length; r++) nextRows[r].push('');
      }
    }
    nextRows[rowIndex][colIndex] = newValue;

    const updated = { ...extractedData };
    if (type === 'object') {
      const obj = {};
      columns.forEach((k, idx) => (obj[k] = nextRows[0]?.[idx] ?? ''));
      updated[attributeKey] = obj;
    } else if (type === 'arrayOfObjects') {
      updated[attributeKey] = nextRows.map((row) => {
        const obj = {};
        columns.forEach((k, idx) => (obj[k] = row?.[idx] ?? ''));
        return obj;
      });
    } else if (type === 'array') {
      updated[attributeKey] = nextRows[0] ?? [];
    } else {
      updated[attributeKey] = (nextRows[0] ?? []).join('; ');
    }
    setExtractedData(updated);
  };

  const handleHeaderRename = (attributeKey, colIndex, newName) => {
    const { columns, rows, type } = deriveColumnsAndRowsForValue(extractedData?.[attributeKey]);
    if (!(type === 'object' || type === 'arrayOfObjects')) return;
    const nextColumns = [...columns];
    nextColumns[colIndex] = newName;

    const updated = { ...extractedData };
    if (type === 'object') {
      const obj = {};
      nextColumns.forEach((k, idx) => (obj[k] = rows[0]?.[idx] ?? ''));
      updated[attributeKey] = obj;
    } else if (type === 'arrayOfObjects') {
      updated[attributeKey] = rows.map((row) => {
        const obj = {};
        nextColumns.forEach((k, idx) => (obj[k] = row?.[idx] ?? ''));
        return obj;
      });
    }
    setExtractedData(updated);
  };

  const handleAddColumn = (attributeKey) => {
    const { columns, rows, type } = deriveColumnsAndRowsForValue(extractedData?.[attributeKey]);
    const nextColumns = [...columns];
    const nextRows = rows.map((r) => [...r]);
    if (type === 'object' || type === 'arrayOfObjects') {
      let base = 'new_key';
      let idx = 1;
      let name = base;
      while (nextColumns.includes(name)) name = `${base}_${idx++}`;
      nextColumns.push(name);
    } else {
      nextColumns.push(`Value ${nextColumns.length + 1}`);
    }
    for (let r = 0; r < nextRows.length; r++) nextRows[r].push('');

    const updated = { ...extractedData };
    if (type === 'object') {
      const obj = {};
      nextColumns.forEach((k, idx) => (obj[k] = nextRows[0]?.[idx] ?? ''));
      updated[attributeKey] = obj;
    } else if (type === 'arrayOfObjects') {
      updated[attributeKey] = nextRows.map((row) => {
        const obj = {};
        nextColumns.forEach((k, idx) => (obj[k] = row?.[idx] ?? ''));
        return obj;
      });
    } else if (type === 'array') {
      updated[attributeKey] = nextRows[0] ?? [];
    } else {
      updated[attributeKey] = (nextRows[0] ?? []).join('; ');
    }
    setExtractedData(updated);
  };

  const handleRemoveColumn = (attributeKey, colIndex) => {
    const { columns, rows, type } = deriveColumnsAndRowsForValue(extractedData?.[attributeKey]);
    const nextColumns = columns.filter((_, idx) => idx !== colIndex);
    const nextRows = rows.map((r) => r.filter((_, idx) => idx !== colIndex));

    const updated = { ...extractedData };
    if (type === 'object') {
      const obj = {};
      nextColumns.forEach((k, idx) => (obj[k] = nextRows[0]?.[idx] ?? ''));
      updated[attributeKey] = obj;
    } else if (type === 'arrayOfObjects') {
      updated[attributeKey] = nextRows.map((row) => {
        const obj = {};
        nextColumns.forEach((k, idx) => (obj[k] = row?.[idx] ?? ''));
        return obj;
      });
    } else if (type === 'array') {
      updated[attributeKey] = nextRows[0] ?? [];
    } else {
      updated[attributeKey] = (nextRows[0] ?? []).join('; ');
    }
    setExtractedData(updated);
  };

  const handleAddRow = (attributeKey) => {
    const { columns, rows, type } = deriveColumnsAndRowsForValue(extractedData?.[attributeKey]);
    const nextRows = [...rows, Array.from({ length: columns.length }, () => '')];
    const updated = { ...extractedData };
    const nextType = type === 'object' ? 'arrayOfObjects' : type;
    if (nextType === 'arrayOfObjects') {
      updated[attributeKey] = nextRows.map((row) => {
        const obj = {};
        columns.forEach((k, idx) => (obj[k] = row?.[idx] ?? ''));
        return obj;
      });
    } else if (nextType === 'array') {
      updated[attributeKey] = nextRows[0] ?? [];
    } else {
      updated[attributeKey] = (nextRows[0] ?? []).join('; ');
    }
    setExtractedData(updated);
  };

  const handleRemoveRow = (attributeKey, rowIndex) => {
    const { columns, rows, type } = deriveColumnsAndRowsForValue(extractedData?.[attributeKey]);
    if (type === 'object') {
      const updated = { ...extractedData };
      updated[attributeKey] = columns.reduce((acc, k) => ({ ...acc, [k]: '' }), {});
      setExtractedData(updated);
      return;
    }
    if (type === 'arrayOfObjects') {
      const nextRows = rows.filter((_, idx) => idx !== rowIndex);
      const updated = { ...extractedData };
      updated[attributeKey] = nextRows.map((row) => {
        const obj = {};
        columns.forEach((k, idx) => (obj[k] = row?.[idx] ?? ''));
        return obj;
      });
      setExtractedData(updated);
      return;
    }
    // array/primitive
    if (rows[0]?.length > 0) {
      const nextRows = [rows[0].slice(0, -1)];
      const updated = { ...extractedData };
      updated[attributeKey] = nextRows[0];
      setExtractedData(updated);
    }
  };

  const handleAddCard = () => {
    const updated = { ...(extractedData || {}) };
    let base = 'new_attribute';
    let name = base;
    let idx = 1;
    while (updated[name] !== undefined) {
      name = `${base}_${idx++}`;
    }
    updated[name] = {};
    setExtractedData(updated);
    setAttributesOrder((prev) => [...prev, name]);
  };

   const handleActionMenuOpen = (event, attrKey, rowIdx) => {
    setActionMenuAnchor(event.currentTarget);
    setActiveRow({ attrKey, rowIdx });
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActiveRow(null);
  };

  const handleActionMenuAction = (action) => {
    if (!activeRow) return;
    
    const { attrKey, rowIdx } = activeRow;
    
    if (action === 'add') {
      handleAddRow(attrKey);
    } else if (action === 'delete') {
      handleRemoveRow(attrKey, rowIdx);
    }
    
    handleActionMenuClose();
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      
      // First, save the PDF and extracted data to S3 if we have a PDF file
      let finalPdfKey = s3PdfKey;
      
      if (pdfFile && !s3PdfKey) {
        // Convert PDF file to base64
        const arrayBuffer = await pdfFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const binary = bytes.reduce((data, byte) => data + String.fromCharCode(byte), '');
        const pdfBase64 = 'data:application/pdf;base64,' + btoa(binary);
        
        const dataToSave = {
          metadata: {
            extractedAt: new Date().toISOString(),
            source: sourceFilename || 'Unknown PDF',
            configuration: 'Edited via SideBySide',
            totalRows: Array.isArray(extractedData) ? extractedData.length : 1
          },
          extractedData: extractedData,
          pdf_file: pdfBase64
        };
        
        const saveResponse = await fetch(`${API_BASE_URL}/save-tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        });
        
        if (!saveResponse.ok) {
          throw new Error(await saveResponse.text());
        }
        
        const saveResult = await saveResponse.json();
        finalPdfKey = saveResult?.s3_keys?.pdf_file || null;
        
        // Update local state with the new S3 key for future reference
        setS3PdfKey(finalPdfKey);
      }
      
      // Now save the final edited data to the database
      const payload = {
        filename: sourceFilename || 'Edited via SideBySide',
        pdf_key: finalPdfKey || null,
        extracted_json: extractedData,
      };
      
      const res = await fetch(`${API_BASE_URL}/finalize-extracted-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save');
      
      setSaveMsg('Saved successfully to S3 and database');
    } catch (e) {
      setSaveMsg(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!extractedData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">No data loaded. Go to Upload Markdown and extract first.</Typography>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} sx={{ height: '100vh', width: '100vw', overflow: 'hidden', userSelect: isResizing ? 'none' : 'auto' }}>
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Left: Cards */}
        <Box sx={{ 
          width: `${leftWidthPct}%`, 
          overflowY: 'auto', 
          p: 2, 
          boxSizing: 'border-box',
          '&::-webkit-scrollbar': {
            width: '0px',
            background: 'transparent'
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <Box sx={{ p: 1 }}>
            <Button variant="outlined" onClick={() => navigate('/upload-markdown')} startIcon={<ArrowBackIcon />}>Back</Button>
          </Box>
          <Typography variant="h6" sx={{ mb: 2, color: '#000', textAlign: 'center' }}>
            Extracted Attributes
            {isViewingSavedTable && (
              <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 1 }}>
                Viewing saved table
              </Typography>
            )}
          </Typography>
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={attributesOrder} strategy={verticalListSortingStrategy}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {attributesOrder.map((attrKey) => {
                  const { columns, rows, type } = deriveColumnsAndRowsForValue(extractedData?.[attrKey]);
                  return (
                    <SortableAttributeCard key={attrKey} attributeKey={attrKey}>
                      {({ listeners }) => (
                        <Card 
                          sx={{ 
                            p: 1, 
                            width: '100%',
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: 3,
                              backgroundColor: 'rgba(0, 0, 0, 0.02)'
                            }
                          }}
                          onClick={() => handleCardClick(attrKey)}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography 
                                variant="subtitle1" 
                                sx={{ fontWeight: 600 }}
                              >
                                {attrKey}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleCardClick(attrKey)}
                                  sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
                                >
                                  View in PDF
                                </Button>
                                <IconButton size="small" color="error" onClick={() => {
                                  const updated = { ...(extractedData || {}) };
                                  delete updated[attrKey];
                                  setExtractedData(updated);
                                  setAttributesOrder((prev) => prev.filter((k) => k !== attrKey));
                                }} aria-label={`delete card ${attrKey}`}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 1 }}>
                              <IconButton size="large" {...listeners} aria-label="drag">
                                <DragIndicatorIcon fontSize="large" />
                              </IconButton>
                            </Box>
                            
                            <TableContainer component={Paper}>
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
                                          {hdr}
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
                                  {rows.map((row, rowIdx) => (
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
                                        <IconButton 
                                          size="small"
                                          onClick={(event) => handleActionMenuOpen(event, attrKey, rowIdx)}
                                          aria-label={`actions for row ${rowIdx + 1}`}
                                        >
                                          <MoreVertIcon />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, alignItems: 'center' }}>
                              <Button startIcon={<AddIcon />} size="small" onClick={() => handleAddColumn(attrKey)}>
                                Add Column
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
          
          <Box sx={{ bottom: 0, pt: 2, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddCard}>Add Card</Button>
            </Box>
            <Button color="primary" variant="contained" startIcon={<SaveIcon />} onClick={handleSaveAll} disabled={saving}>
              {saving ? 'Saving…' : 'Save All'}
            </Button>
          </Box>
        </Box>

        {/* Vertical resizer */}
        <Box
          onMouseDown={() => setIsResizing(true)}
          onTouchStart={() => setIsResizing(true)}
          sx={{ width: '10px', cursor: 'col-resize', backgroundColor: isResizing ? '#ccc' : '#eee', '&:hover': { backgroundColor: '#ddd' } }}
        />

        {/* Right: PDF via react-pdf */}
        <Box 
          ref={pdfContainerRef}
          sx={{ 
            width: `${100 - leftWidthPct}%`, 
            overflow: 'auto', 
            p: 2,
            '& .react-pdf__Page__canvas': {
              marginTop: '20px',
              display: 'block',
              imageRendering: 'high-quality',

            },

          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#000' }}>PDF Preview</Typography>
                         {numPages > 0 && (
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                   Page {currentPage} of {numPages}
                 </Typography>
                 <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                   Width: {Math.round(pdfWidth)}px
                 </Typography>
               </Box>
             )}
          </Box>
          {pdfUrlLoading ? (
            <Typography variant="body1" sx={{ color: 'black' }}>Loading PDF...</Typography>
          ) : pdfUrl ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Document 
                file={pdfUrl} 
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<Typography variant="body1" sx={{ color: 'black' }}>Loading PDF...</Typography>}
                error={<Typography variant="body1" color="error">Failed to load PDF</Typography>}
              >
                {numPages > 0 && Array.apply(null, { length: numPages }).map((_, index) => (
                  <Box key={`page_${index + 1}`} sx={{ mb: 3 }}>
                                         <Page 
                       pageNumber={index + 1} 
                       width={pdfWidth} // Responsive width from state
                       loading={<Typography variant="body1" sx={{ color: 'black' }}>Loading page...</Typography>}
                       renderTextLayer={true} // Enable text layer for better quality
                       renderAnnotationLayer={true} // Enable annotation layer
                     />
                  </Box>
                ))}
              </Document>
            </Box>
          ) : (
            <Typography variant="body1">No PDF URL found. Save to S3 from Upload Markdown first.</Typography>
          )}
        </Box>
      </Box>
      
      {/* Action Menu Dropdown */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleActionMenuAction('add')}>
          <AddIcon sx={{ mr: 1 }} fontSize="small" />
          Add Row
        </MenuItem>
        <MenuItem onClick={() => handleActionMenuAction('delete')}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Row
        </MenuItem>
      </Menu>
      
      <Snackbar open={!!saveMsg} autoHideDuration={3000} onClose={() => setSaveMsg(null)}>
        <Alert onClose={() => setSaveMsg(null)} severity={saveMsg?.startsWith('Save failed') ? 'error' : 'success'} sx={{ width: '100%' }}>
          {saveMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
