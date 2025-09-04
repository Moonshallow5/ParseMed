import { BrowserRouter, Routes, Route,Navigate } from 'react-router-dom';
import App from '../pages/App.jsx';
import DocumentUploadMarkdown from '../pages/DocumentUploadMarkdown.jsx';
import Configuration from '../pages/Configuration.jsx';
import ViewConfigs from '../pages/ViewConfigs.jsx';
import SideBySide from '../pages/SideBySide.jsx';
import ExtremeConfigurations from '../pages/ExtremeConfigurations.jsx';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/summary" replace />} />
        <Route path="/summary" element={<App />} />
        <Route path="/upload-markdown" element={<DocumentUploadMarkdown />} />
        <Route path="/configuration" element={<Configuration />} />
        <Route path="/view-configs" element={<ViewConfigs />} />
        <Route path="/side-by-side" element={<SideBySide />} />
        <Route path="/extreme-configurations" element={<ExtremeConfigurations />} />
      </Routes>
    </BrowserRouter>
  );
}
