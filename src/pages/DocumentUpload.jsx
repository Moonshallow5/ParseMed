import { useState, useRef } from "react";
import MainLayout from '../components/MainLayout';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyValueTable from '../components/KeyValueTable';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';

function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [studyIdentificationRows, setStudyIdentificationRows] = useState([{ key: '', value: '' }]);
  const [sampleSizeRows, setSampleSizeRows] = useState([{ key: '', value: '' }]);

  // Unique id generator for subcategories
  const subcategoryId = useRef(2); // start at 2 since 0 and 1 are used below

  // Editable subcategories for Methods
  const [methodSubcategories, setMethodSubcategories] = useState([
    { id: 0, label: "Design", color: "#ffe0b2", rows: [["", ""]] },
    { id: 1, label: "Blinding", color: "#b2dfdb", rows: [["", ""]] }
  ]);

  // Edit subcategory label
  const handleEditSubcategoryLabel = (idx, value) => {
    setMethodSubcategories(subs =>
      subs.map((sub, i) => i === idx ? { ...sub, label: value } : sub)
    );
  };

  // Delete subcategory
  const handleDeleteSubcategory = (idx) => {
    setMethodSubcategories(subs => subs.filter((_, i) => i !== idx));
  };

  // Update rows for a subcategory
  const handleUpdateSubcategoryRows = (idx, newRows) => {
    setMethodSubcategories(subs =>
      subs.map((sub, i) => i === idx ? { ...sub, rows: newRows } : sub)
    );
  };

  // Add a new subcategory
  const handleAddSubcategory = () => {
    setMethodSubcategories(subs => [
      ...subs,
      { id: subcategoryId.current++, label: `New Subcategory`, color: "#e0e0e0", rows: [["", ""]] }
    ]);
  };

  const onFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create a URL for the file to display in iframe
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
    }
  };

  const handleLogout = () => {
    alert('Logged out!');
  };

  return (
    <MainLayout onLogout={handleLogout}>
      <Box >
        <h2>Upload and View PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          style={{ marginBottom: 16 }}
        />
        {file && fileUrl && (
          <Card sx={{ display: 'flex', marginTop: 2, minWidth: 650 }}>
            <CardContent sx={{ flex:1, overflow: 'auto', maxWidth: 400 }}>
              <iframe
                src={fileUrl}
                width="100%"
                height="99%"
                style={{ border: 'none' }}
                title="PDF Viewer"
              />
            </CardContent>
            <CardContent
              sx={{
                flex: 1,
                minWidth: 200,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: 'aqua' }}>Methods</AccordionSummary>
                <AccordionDetails sx={{ overflowX: 'auto' }}>
                  {methodSubcategories.map((sub, idx) => (
                    <Box key={sub.id} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          backgroundColor: sub.color,
                          color: '#333',
                          px: 2,
                          py: 0.5,
                          width: "100%",
                          borderRadius: 1,
                          fontWeight: 500,
                          fontSize: 14,
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <TextField
                          value={sub.label}
                          onChange={e => handleEditSubcategoryLabel(idx, e.target.value)}
                          variant="standard"
                          sx={{ fontWeight: 500, fontSize: 14, background: 'transparent', flex: 1 }}
                          InputProps={{ disableUnderline: true }}
                          fullWidth
                        />
                        <IconButton onClick={() => handleDeleteSubcategory(idx)} size="small" sx={{ ml: 1 }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <KeyValueTable
                        rows={sub.rows}
                        setRows={newRows => handleUpdateSubcategoryRows(idx, newRows)}
                      />
                    </Box>
                  ))}
                  <Button onClick={handleAddSubcategory} size="small" sx={{ mt: 1 }}>Add Subcategory</Button>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: 'pink' }}>Study Identification</AccordionSummary>
                <AccordionDetails sx={{ overflowX: 'auto' }}>
                  <KeyValueTable rows={studyIdentificationRows} setRows={setStudyIdentificationRows} />
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: 'pink' }}>Sample Size</AccordionSummary>
                <AccordionDetails sx={{ overflowX: 'auto' }}>
                  <KeyValueTable rows={sampleSizeRows} setRows={setSampleSizeRows} />
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </Box>
    </MainLayout>
  );
}

export default DocumentUpload;