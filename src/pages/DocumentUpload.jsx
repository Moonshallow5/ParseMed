import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import MainLayout from '../components/MainLayout';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';


pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [notes, setNotes] = useState("");

  const onFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleLogout = () => {
    alert('Logged out!');
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <MainLayout onLogout={handleLogout}>
      <Box sx={{ padding: 3 }}>
        <h2>Upload and View PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          style={{ marginBottom: 16 }}
        />
        {file && (
          <Card sx={{ display: 'flex', gap: 3, marginTop: 2, maxHeight: 600, minWidth: 650, overflow: 'auto' }}>
            <CardContent sx={{ flex: 2, overflow: 'auto', minWidth: 400 }}>
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                loading="Loading PDF..."
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={400}
                  />
                ))}
              </Document>
            </CardContent>
            <CardContent sx={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
              <h3>Notes</h3>
              <TextField
                label="Write your notes here"
                multiline
                minRows={10}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                variant="outlined"
                fullWidth
              />
            </CardContent>
          </Card>
        )}
      </Box>
    </MainLayout>
  );
}

export default DocumentUpload;