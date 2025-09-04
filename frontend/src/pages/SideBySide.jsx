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

  const [isViewingSavedTable, setIsViewingSavedTable] = useState(false);
  const pdfContainerRef = useRef(null);
  const [pagePositions, setPagePositions] = useState([]);
  const [pdfWidth, setPdfWidth] = useState(800);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Function to fetch PDF from backend and get base64
  const fetchPdfAsBase64 = async (s3Key) => {
    try {
      // Get presigned URL from backend
      const response = await fetch(`${API_BASE_URL}/get-pdf-base64?pdf_key=${encodeURIComponent(s3Key)}`);
      
      if (!response.ok) {
        throw new Error('Failed to get PDF URL from backend');
      }
      
      const data = await response.json();
      if (!data.success || !data.pdf_url) {
        throw new Error(data.error || 'No PDF URL received');
      }
      
      console.log('Got presigned URL, fetching PDF...');
      
      // Fetch the PDF using the presigned URL
      const pdfResponse = await fetch(data.pdf_url);
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF from S3');
      }
      
      // Convert to base64 using FileReader (same method as DocumentUploadMarkdown)
      const blob = await pdfResponse.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result; // This is the base64 string
          console.log('PDF converted to base64, length:', base64.length);
          console.log('Base64 starts with:', base64.substring(0, 50));
          
          // Validate base64 format
          if (base64.startsWith('data:application/pdf;base64,')) {
            const base64Data = base64.split(',')[1];
            if (base64Data && base64Data.length > 100) {
              console.log('Base64 PDF URL set successfully');
              resolve(base64);
            } else {
              console.error('Invalid base64 PDF data length');
              reject(new Error('Invalid base64 PDF data'));
            }
          } else {
            console.error('Invalid base64 format');
            reject(new Error('Invalid base64 format'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      console.error('Error fetching PDF as base64:', error);
      return null;
    }
  };

  useEffect(() => {
    try {
      if (location && location.state) {
        const { 
          pdfUrl: navPdfUrl, 
          extractedData: navData, 
          s3PdfKey: navPdfKey,
          sourceFilename: navSourceFilename,
          isFromSavedTable: navIsFromSavedTable
        } = location.state || {};
        
        if (navData && typeof navData === 'object' && !Array.isArray(navData)) {
          setExtractedData(navData);
          
          // Check if this is from an extreme configuration (has category separators)
          const isExtremeConfig = Object.keys(navData).some(key => 
            key.startsWith('--- ') && key.endsWith(' ---')
          );
          
          if (isExtremeConfig) {
            // For extreme configurations, organize by categories
            const categories = [];
            let currentCategory = null;
            
            Object.entries(navData).forEach(([key, value]) => {
              if (key.startsWith('--- ') && key.endsWith(' ---')) {
                // This is a category separator
                currentCategory = key.replace('--- ', '').replace(' ---', '');
                categories.push(currentCategory);
              }
            });
            
            setAttributesOrder(categories);
          } else {
            // Regular configuration - use all keys
            setAttributesOrder(Object.keys(navData));
          }
        }
        if (navPdfUrl) {
          // Check if it's a base64 data URL
          if (navPdfUrl.startsWith('data:application/pdf;base64,')) {
            console.log('Setting base64 PDF URL from navigation');
            // Validate base64 format
            const base64Data = navPdfUrl.split(',')[1];
            if (base64Data && base64Data.length > 100) { // Basic validation
              setPdfUrl(navPdfUrl);
            } else {
              console.error('Invalid base64 PDF data');
            }
          } else if (navPdfUrl.startsWith('blob:')) {
            // Handle blob URLs (fallback)
            console.log('Setting blob PDF URL from navigation');
            setPdfUrl(navPdfUrl);
          } else {
            // Handle other URL types (like S3 presigned URLs)
            console.log('Setting other PDF URL from navigation:', navPdfUrl.substring(0, 50) + '...');
            setPdfUrl(navPdfUrl);
          }
        }
        if (navSourceFilename) setSourceFilename(navSourceFilename);
        if (navPdfKey) setS3PdfKey(navPdfKey);
        
        // If coming from a saved table, mark it as such
        if (navIsFromSavedTable) {
          setIsViewingSavedTable(true);
        }
        
        // If we have s3PdfKey but no pdfUrl, load the PDF
        if (navPdfKey && !navPdfUrl) {
          console.log('Loading PDF from S3 key:', navPdfKey);
          setPdfLoading(true);
          fetchPdfAsBase64(navPdfKey).then((base64Data) => {
            if (base64Data) {
              setPdfUrl(base64Data);
              console.log('PDF loaded successfully from S3');
            } else {
              console.error('Failed to load PDF from S3');
            }
            setPdfLoading(false);
          }).catch((error) => {
            console.error('Error loading PDF from S3:', error);
            setPdfLoading(false);
          });
        }
        
        return;
      }
    } catch (_) {}
  }, [location]);



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
    
    const handleUp = () => {
      console.log('Resizing stopped');
      setIsResizing(false);
    };
    
    // Add a timeout to automatically stop resizing if no events are received
    const autoStopTimer = setTimeout(() => {
      console.log('Auto-stopping resizing due to timeout');
      setIsResizing(false);
    }, 5000); // 5 second timeout
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    
    // Also listen for mouse leave to handle edge cases
    window.addEventListener('mouseleave', handleUp);
    
    return () => {
      clearTimeout(autoStopTimer);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('mouseleave', handleUp);
    };
  }, [isResizing]);



  // Cleanup PDF URL when component unmounts
  useEffect(() => {
    return () => {
      // Only cleanup blob URLs that we created here
      // Don't cleanup base64 URLs as they don't need cleanup
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

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



  // Update PDF width when resizing stops to get final position
  useEffect(() => {
    if (!isResizing) {
      // Add a small delay to ensure resizing is completely finished
      const timer = setTimeout(() => {
        const newWidth = Math.min(
          Math.max(700, (100 - leftWidthPct) * 0.9 * window.innerWidth / 100),
          1200
        );
        setPdfWidth(newWidth);
      }, 100); // 100ms delay
      
      return () => clearTimeout(timer);
    }
  }, [isResizing, leftWidthPct]);

  // Debug: Monitor pdfUrl changes
  useEffect(() => {
    if (pdfUrl) {
      console.log('pdfUrl state updated:', {
        type: pdfUrl.startsWith('data:application/pdf;base64,') ? 'Base64' : 
              pdfUrl.startsWith('blob:') ? 'Blob' : 'URL',
        length: pdfUrl.length,
        startsWith: pdfUrl.substring(0, 50)
      });
    } else {
      console.log('pdfUrl state cleared');
    }
  }, [pdfUrl]);

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
    
    // Check if this is an extreme configuration
    const isExtremeConfig = Object.keys(extractedData).some(key => 
      key.startsWith('--- ') && key.endsWith(' ---')
    );
    
    if (isExtremeConfig) {
      // For extreme configurations, add a new category card
      let base = 'New Category';
      let categoryName = base;
      let idx = 1;
      while (updated[`--- ${categoryName} ---`] !== undefined) {
        categoryName = `${base} ${idx++}`;
      }
      
      // Add the category separator
      updated[`--- ${categoryName} ---`] = `Category: ${categoryName}`;
      
      // Add a default attribute to the new category
      let attrBase = 'new_attribute';
      let attrName = attrBase;
      let attrIdx = 1;
      while (updated[attrName] !== undefined) {
        attrName = `${attrBase}_${attrIdx++}`;
      }
      updated[attrName] = '';
      
      setExtractedData(updated);
      
      // Update attributesOrder to include the new category
      const newCategories = [];
      let currentCategory = null;
      
      Object.entries(updated).forEach(([key, value]) => {
        if (key.startsWith('--- ') && key.endsWith(' ---')) {
          currentCategory = key.replace('--- ', '').replace(' ---', '');
          newCategories.push(currentCategory);
        }
      });
      
      setAttributesOrder(newCategories);
    } else {
      // Regular configuration - add new attribute card
      let base = 'new_attribute';
      let name = base;
      let idx = 1;
      while (updated[name] !== undefined) {
        name = `${base}_${idx++}`;
      }
      updated[name] = {};
      setExtractedData(updated);
      setAttributesOrder((prev) => [...prev, name]);
    }
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
      
      // First, save the PDF and extracted data to S3 if we have a PDF URL
      let finalPdfKey = s3PdfKey;
      
      if (pdfUrl && !s3PdfKey) {
        // We already have the PDF in base64 format from the URL
        const dataToSave = {
          metadata: {
            extractedAt: new Date().toISOString(),
            source: sourceFilename || 'Unknown PDF',
            configuration: 'Edited via SideBySide',
            totalRows: Array.isArray(extractedData) ? extractedData.length : 1
          },
          extractedData: extractedData,
          pdf_file: pdfUrl // Use the existing base64 URL
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
            {/* Check if this is from an extreme configuration */}
            {extractedData && Object.keys(extractedData).some(key => 
              key.includes('---') || key.includes('Category')
            ) && (
              <Typography variant="caption" display="block" sx={{ color: 'primary.main', mt: 1, fontWeight: 'bold' }}>
                🔥 Extreme Configuration: Organized by categories
              </Typography>
            )}
          </Typography>
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={attributesOrder} strategy={verticalListSortingStrategy}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {attributesOrder.map((attrKey) => {
                  // Check if this is a category (for extreme configurations)
                  const isExtremeConfig = Object.keys(extractedData).some(key => 
                    key.startsWith('--- ') && key.endsWith(' ---')
                  );
                  
                  if (isExtremeConfig) {
                    // For extreme configurations, render category-based cards
                    const categoryAttributes = [];
                    let currentCategory = null;
                    
                    Object.entries(extractedData).forEach(([key, value]) => {
                      if (key.startsWith('--- ') && key.endsWith(' ---')) {
                        currentCategory = key.replace('--- ', '').replace(' ---', '');
                      } else if (currentCategory === attrKey) {
                        categoryAttributes.push({ key, value });
                      }
                    });
                    
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
                                <TextField
                                  value={attrKey}
                                  onChange={(e) => {
                                    // For extreme configurations, rename the category
                                    const isExtremeConfig = Object.keys(extractedData).some(key => 
                                      key.startsWith('--- ') && key.endsWith(' ---')
                                    );
                                    
                                    if (isExtremeConfig) {
                                      const updated = { ...extractedData };
                                      const oldSeparator = `--- ${attrKey} ---`;
                                      const newSeparator = `--- ${e.target.value} ---`;
                                      
                                      // Update the separator
                                      if (updated[oldSeparator] !== undefined) {
                                        updated[newSeparator] = updated[oldSeparator];
                                        delete updated[oldSeparator];
                                      }
                                      
                                      setExtractedData(updated);
                                      
                                      // Update attributesOrder
                                      const newCategories = [];
                                      let currentCategory = null;
                                      
                                      Object.entries(updated).forEach(([key, value]) => {
                                        if (key.startsWith('--- ') && key.endsWith(' ---')) {
                                          currentCategory = key.replace('--- ', '').replace(' ---', '');
                                          newCategories.push(currentCategory);
                                        }
                                      });
                                      
                                      setAttributesOrder(newCategories);
                                    } else {
                                      // For regular configurations, rename the attribute
                                      const updated = { ...extractedData };
                                      const oldValue = updated[attrKey];
                                      delete updated[attrKey];
                                      updated[e.target.value] = oldValue;
                                      setExtractedData(updated);
                                      setAttributesOrder((prev) => prev.map(item => item === attrKey ? e.target.value : item));
                                    }
                                  }}
                                  variant="standard"
                                  size="small"
                                  inputProps={{ 
                                    style: { 
                                      fontWeight: 600, 
                                      fontSize: '1.1rem',
                                      textAlign: 'center'
                                    } 
                                  }}
                                  sx={{ minWidth: '200px' }}
                                />
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
                                    // Remove entire category and its attributes
                                    const updated = { ...(extractedData || {}) };
                                    const categorySeparator = `--- ${attrKey} ---`;
                                    delete updated[categorySeparator];
                                    
                                    // Remove all attributes in this category
                                    categoryAttributes.forEach(({ key }) => {
                                      delete updated[key];
                                    });
                                    
                                    setExtractedData(updated);
                                    
                                    // Update attributes order
                                    const remainingCategories = [];
                                    let currentCategory = null;
                                    Object.entries(updated).forEach(([key, value]) => {
                                      if (key.startsWith('--- ') && key.endsWith(' ---')) {
                                        currentCategory = key.replace('--- ', '').replace(' ---', '');
                                        remainingCategories.push(currentCategory);
                                      }
                                    });
                                    setAttributesOrder(remainingCategories);
                                  }} aria-label={`delete category ${attrKey}`}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 1 }}>
                                <IconButton size="large" {...listeners} aria-label="drag">
                                  <DragIndicatorIcon fontSize="large" />
                                </IconButton>
                              </Box>
                              
                                                             {/* Render category attributes as a table */}
                               <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
                                 <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                                   <TableHead>
                                     <TableRow>
                                       <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Attribute</TableCell>
                                       <TableCell sx={{ fontWeight: 'bold', width: '50%' }}>Value</TableCell>
                                       <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Action</TableCell>
                                     </TableRow>
                                   </TableHead>
                                   <TableBody>
                                     {categoryAttributes.map(({ key, value }, idx) => {
                                       const values = String(value ?? '')
                                         .split(';')
                                         .map((v) => v.trim())
                                         .filter((v) => v.length > 0 || v === "");
                                       
                                       return (
                                         <TableRow key={idx}>
                                           <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                             <TextField
                                               value={key}
                                               onChange={(e) => {
                                                 // Rename the attribute key
                                                 const updated = { ...extractedData };
                                                 const oldValue = updated[key];
                                                 delete updated[key];
                                                 updated[e.target.value] = oldValue;
                                                 setExtractedData(updated);
                                               }}
                                               variant="standard"
                                               size="small"
                                               inputProps={{ style: { fontWeight: 'bold' } }}
                                             />
                                           </TableCell>
                                           <TableCell>
                                             <TextField
                                               value={values.join('; ')}
                                               onChange={(e) => {
                                                 const updated = { ...extractedData };
                                                 updated[key] = e.target.value;
                                                 setExtractedData(updated);
                                               }}
                                               variant="standard"
                                               fullWidth
                                               multiline
                                             />
                                           </TableCell>
                                           <TableCell align="center">
                                             <IconButton 
                                               size="small" 
                                               color="error" 
                                               onClick={() => {
                                                 // Remove this specific attribute from the category
                                                 const updated = { ...extractedData };
                                                 delete updated[key];
                                                 setExtractedData(updated);
                                               }} 
                                               aria-label={`delete attribute ${key}`}
                                             >
                                               <DeleteIcon fontSize="small" />
                                             </IconButton>
                                           </TableCell>
                                         </TableRow>
                                       );
                                     })}
                                   </TableBody>
                                 </Table>
                               </TableContainer>
                               
                               {/* Add new attribute button for this category */}
                               <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, alignItems: 'center' }}>
                                 <Button 
                                   startIcon={<AddIcon />} 
                                   size="small" 
                                   onClick={() => {
                                     // Add new attribute to this specific category
                                     const updated = { ...extractedData };
                                     let base = 'new_attribute';
                                     let name = base;
                                     let idx = 1;
                                     while (updated[name] !== undefined) {
                                       name = `${base}_${idx++}`;
                                     }
                                     
                                     // For extreme configurations, we need to ensure the new attribute
                                     // is associated with the current category
                                     const categorySeparator = `--- ${attrKey} ---`;
                                     console.log('Adding attribute to category:', attrKey);
                                     console.log('Category separator:', categorySeparator);
                                     
                                     if (updated[categorySeparator] !== undefined) {
                                       // Create a new object with proper ordering
                                       const newData = {};
                                       let foundCategory = false;
                                       let categoryEnded = false;
                                       let processedCategoryAttributes = 0;
                                       
                                       console.log('Original data keys:', Object.keys(updated));
                                       
                                       // Copy all existing data in order and add new attribute at the right place
                                       Object.entries(updated).forEach(([key, value], index) => {
                                         console.log(`Processing key: ${key}, index: ${index}, foundCategory: ${foundCategory}, categoryEnded: ${categoryEnded}`);
                                         
                                         // If we encounter the next category separator, mark that the current category has ended
                                         if (key.startsWith('--- ') && key.endsWith(' ---') && key !== categorySeparator && foundCategory) {
                                           categoryEnded = true;
                                           console.log('Category ended because next separator found');
                                         }
                                         
                                         // If we just found our category separator, mark that we found our category
                                         if (key === categorySeparator) {
                                           foundCategory = true;
                                           console.log('Found our category separator');
                                         }
                                         
                                         // If we're in our category and processing an attribute (not a separator), count it
                                         if (foundCategory && !categoryEnded && !key.startsWith('--- ')) {
                                           processedCategoryAttributes++;
                                           console.log(`Processed ${processedCategoryAttributes} attributes in category`);
                                         }
                                         
                                         // If we're in our category and haven't ended yet, and the next key is a category separator, add our new attribute
                                         if (foundCategory && !categoryEnded) {
                                           const originalKeys = Object.keys(updated);
                                           const currentIndex = originalKeys.indexOf(key);
                                           const nextKey = originalKeys[currentIndex + 1];
                                           
                                           console.log(`Checking if next key is separator. Current index: ${currentIndex}, Next key: ${nextKey}`);
                                           
                                           if (nextKey && nextKey.startsWith('--- ') && nextKey.endsWith(' ---')) {
                                             // Next key is a category separator, so we're at the end of our category
                                             console.log(`Adding new attribute at end of category after processing ${processedCategoryAttributes} attributes`);
                                             newData[key] = value;
                                             newData[name] = '';
                                             categoryEnded = true;
                                             return;
                                           }
                                         }
                                         
                                         newData[key] = value;
                                       });
                                       
                                       // If we didn't add the attribute yet (category is the last one), add it at the very end
                                       if (!newData[name]) {
                                         console.log('Adding new attribute at very end (last category)');
                                         newData[name] = '';
                                       }
                                       
                                       console.log('Final newData keys:', Object.keys(newData));
                                       setExtractedData(newData);
                                     } else {
                                       // Fallback for regular configurations
                                       updated[name] = '';
                                       setExtractedData(updated);
                                     }
                                   }}
                                 >
                                   Add Attribute
                                 </Button>
                               </Box>
                            </CardContent>
                          </Card>
                        )}
                      </SortableAttributeCard>
                    );
                  } else {
                    // Regular configuration - render individual attribute cards
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
                                <TextField
                                  value={attrKey}
                                  onChange={(e) => {
                                    // For regular configurations, rename the attribute
                                    const updated = { ...extractedData };
                                    const oldValue = updated[attrKey];
                                    delete updated[attrKey];
                                    updated[e.target.value] = oldValue;
                                    setExtractedData(updated);
                                    setAttributesOrder((prev) => prev.map(item => item === attrKey ? e.target.value : item));
                                  }}
                                  variant="standard"
                                  size="small"
                                  inputProps={{ 
                                    style: { 
                                      fontWeight: 600, 
                                      fontSize: '1.1rem',
                                      textAlign: 'center'
                                    } 
                                  }}
                                  sx={{ minWidth: '200px' }}
                                />
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
                              
                              <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                                <Table size="small" sx={{ tableLayout: 'auto' }}>
                                  <TableBody>
                                    {/* Each column becomes a row */}
                                    {columns.map((columnName, colIdx) => (
                                      <TableRow key={colIdx}>
                                        {/* Column Name/Header */}
                                        <TableCell 
                                          align="center" 
                                          sx={{ 
                                            fontWeight: 'bold', 
                                            backgroundColor: '#f5f5f5',
                                            minWidth: '120px',
                                            borderRight: '2px solid #e0e0e0'
                                          }}
                                        >
                                          {(type === 'object' || type === 'arrayOfObjects') ? (
                                            <TextField
                                              value={columnName}
                                              onChange={(e) => handleHeaderRename(attrKey, colIdx, e.target.value)}
                                              variant="standard"
                                              size="small"
                                              inputProps={{ style: { textAlign: 'center', fontWeight: 700 } }}
                                            />
                                          ) : (
                                            columnName
                                          )}
                                        </TableCell>
                                         
                                        {/* Data Values for this column across all rows */}
                                        {rows.map((row, rowIdx) => (
                                          <TableCell 
                                            key={rowIdx} 
                                            align="center" 
                                            sx={{ 
                                              minWidth: '150px',
                                              borderRight: '1px solid #e0e0e0'
                                            }}
                                          >
                                            <TextField
                                              value={row[colIdx] || ''}
                                              onChange={(e) => handleCellChange(attrKey, rowIdx, colIdx, e.target.value)}
                                              variant="standard"
                                              fullWidth
                                              size="small"
                                            />
                                          </TableCell>
                                        ))}
                                        
                                        {/* Actions for this column */}
                                        <TableCell align="center" sx={{ minWidth: '80px' }}>
                                          <IconButton 
                                            size="small" 
                                            onClick={() => handleRemoveColumn(attrKey, colIdx)} 
                                            aria-label={`remove column ${colIdx + 1}`}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, alignItems: 'center' }}>
                                <Button startIcon={<AddIcon />} size="small" onClick={() => handleAddColumn(attrKey)}>
                                  Add Row
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        )}
                      </SortableAttributeCard>
                    );
                  }
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
          onMouseDown={(e) => {
            console.log('Resizing started (mouse)');
            setIsResizing(true);
            e.preventDefault();
          }}
          onTouchStart={(e) => {
            console.log('Resizing started (touch)');
            setIsResizing(true);
            e.preventDefault();
          }}
          sx={{ 
            width: '10px', 
            cursor: 'col-resize', 
            backgroundColor: isResizing ? '#ccc' : '#eee', 
            '&:hover': { backgroundColor: '#ddd' },
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '-5px',
              right: '-5px',
              cursor: 'col-resize'
            }
          }}
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
            // Fix grey background when selecting class is added
            '& .react-pdf__Page__textContent.selecting': {
              backgroundColor: 'transparent !important'
            },
            '& .react-pdf__Page__textContent.selecting *': {
              backgroundColor: 'transparent !important'
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#000' }}>PDF Preview</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Debug: Show resizing state */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <Typography variant="caption" sx={{ color: isResizing ? 'warning.main' : 'success.main' }}>
                  {isResizing ? '🔄 Resizing' : '✅ Stable'}
                </Typography>
              </Box>
              {pdfUrl && (
                <Typography variant="caption" sx={{ color: 'text.secondary', mr: 2 }}>
                  Type: {pdfUrl.startsWith('data:application/pdf;base64,') ? 'Base64' : 
                         pdfUrl.startsWith('blob:') ? 'Blob' : 'URL'}
                </Typography>
              )}
              {numPages > 0 && (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Page {currentPage} of {numPages}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                    Width: {Math.round(pdfWidth)}px
                  </Typography>
                </>
              )}
            </Box>
          </Box>
                     {pdfLoading ? (
             <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
               <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                 Loading PDF from S3...
               </Typography>
               <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                 This may take a moment for large files
               </Typography>
             </Box>
           ) : pdfUrl ? (
             <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               {isResizing ? (
                 <Typography variant="body1" sx={{ color: 'text.secondary', mt: 4 }}>
                   Resizing... PDF will update when finished
                 </Typography>
               ) : (
                 <Document 
                   file={pdfUrl} 
                   onLoadSuccess={({ numPages }) => {
                     console.log('PDF loaded successfully with', numPages, 'pages');
                     setNumPages(numPages);
                   }}
                   onLoadError={(error) => {
                     console.error('PDF load error:', error);
                   }}
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
               )}
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
