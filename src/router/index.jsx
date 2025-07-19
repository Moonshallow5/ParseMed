import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '../pages/App.jsx';
import DocumentUpload from '../pages/DocumentUpload.jsx';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/summary" element={<App />} />
        <Route path="/upload" element={<DocumentUpload />} />
      </Routes>
    </BrowserRouter>
  );
}
