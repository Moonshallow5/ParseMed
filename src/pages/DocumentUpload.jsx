import { useState } from "react";
import MainLayout from '../components/MainLayout';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [notes, setNotes] = useState("");

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
      <Box sx={{ padding: 3 }}>
        <h2>Upload and View PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          style={{ marginBottom: 16 }}
        />
        {file && fileUrl && (
          <Card sx={{ display: 'flex', gap: 3, marginTop: 2, maxHeight: 600, minWidth: 650, overflow: 'auto' }}>
            <CardContent sx={{ flex: 2, overflow: 'auto', minWidth: 400 }}>
              <iframe
                src={fileUrl}
                width="100%"
                height="500"
                style={{ border: 'none' }}
                title="PDF Viewer"
              />
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