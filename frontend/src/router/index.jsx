import { BrowserRouter, Routes, Route,Navigate } from 'react-router-dom';
import App from '../pages/App.jsx';
import DocumentUpload from '../pages/DocumentUpload.jsx';
import DocumentUploadMarkdown from '../pages/DocumentUploadMarkdown.jsx';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/summary" replace />} />
        <Route path="/summary" element={<App />} />
        <Route path="/upload" element={<DocumentUpload />} />
        <Route path="/upload-markdown" element={<DocumentUploadMarkdown />} />
      </Routes>
    </BrowserRouter>
  );
}
