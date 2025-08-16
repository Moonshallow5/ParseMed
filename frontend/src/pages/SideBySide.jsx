import { useEffect, useState } from 'react';
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
  const [s3PdfKey, setS3PdfKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    try {
      if (location && location.state) {
        const { pdfUrl: navPdfUrl, extractedData: navData, s3PdfKey: navPdfKey } = location.state || {};
        if (navData && typeof navData === 'object' && !Array.isArray(navData)) {
          setExtractedData(navData);
          setAttributesOrder(Object.keys(navData));
        }
        if (navPdfUrl) setPdfUrl(navPdfUrl);
        if (navPdfKey) setS3PdfKey(navPdfKey);
        return;
      }
    } catch (_) {}
  }, [location]);

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

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const payload = {
        filename: 'Edited via SideBySide',
        pdf_key: s3PdfKey || null,
        extracted_json: extractedData,
      };
      const res = await fetch('http://localhost:8000/finalize-extracted-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save');
      setSaveMsg('Saved successfully');
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
    <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Left: Cards */}
        <Box sx={{ width: '50%', overflowY: 'auto', p: 2, boxSizing: 'border-box' }}>
          <Box sx={{ p: 1 }}>
        <Button variant="outlined" onClick={() => navigate('/upload-markdown')} startIcon={<ArrowBackIcon />}>Back</Button>
      </Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Extracted Attributes</Typography>
          {/* Add Card moved to bottom sticky bar */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={attributesOrder} strategy={verticalListSortingStrategy}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {attributesOrder.map((attrKey) => {
                  const { columns, rows } = deriveColumnsAndRowsForValue(extractedData?.[attrKey]);
                  return (
                    <SortableAttributeCard key={attrKey} attributeKey={attrKey}>
                      {({ listeners }) => (
                        <Card sx={{ p: 1, width: '100%' }}>
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
                            <TableContainer component={Paper}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    {columns.map((hdr, idx) => (
                                      <TableCell key={idx} align="center" sx={{ fontWeight: 'bold' }}>
                                        {hdr}
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
                                        <IconButton color="error" onClick={() => handleRemoveRow(attrKey, rowIdx)} aria-label={`delete row ${rowIdx + 1}`}>
                                          <DeleteIcon />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
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
          <Box sx={{  bottom: 0, pt: 2, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddCard}>Add Card</Button>
            </Box>
            <Button color="primary" variant="contained" startIcon={<SaveIcon />} onClick={handleSaveAll} disabled={saving}>
              {saving ? 'Saving…' : 'Save All'}
            </Button>
          </Box>
        </Box>

        {/* Right: PDF via iframe */}
        <Box sx={{ width: '50%', borderLeft: '1px solid #eee', overflow: 'hidden', p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>PDF Preview</Typography>
          {pdfUrl ? (
            <iframe
              title="pdf-preview"
              src={pdfUrl}
              style={{ width: '100%', height: 'calc(100% - 40px)', border: 'none' }}
            />
          ) : (
            <Typography variant="body1">No PDF URL found. Save to S3 from Upload Markdown first.</Typography>
          )}
        </Box>
      </Box>
      <Snackbar open={!!saveMsg} autoHideDuration={3000} onClose={() => setSaveMsg(null)}>
        <Alert onClose={() => setSaveMsg(null)} severity={saveMsg?.startsWith('Save failed') ? 'error' : 'success'} sx={{ width: '100%' }}>
          {saveMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
