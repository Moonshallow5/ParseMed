import { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';

function ViewConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8000/get-configurations');
      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }
      const data = await response.json();
      if (data.success) {
        setConfigs(data.configurations || []);
      } else {
        setError(data.error || 'Failed to fetch configurations');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleViewJson = (cfg) => {
    navigate('/configuration', { state: { config: cfg } });
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 3, width: '100%', minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{paddingTop:'80px'}} >
          <Typography variant="h4" gutterBottom>View Configs</Typography>
          <Card elevation={8} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 0 }}>
        <TableContainer component={Paper} >
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((cfg) => (
                <TableRow key={cfg.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{cfg.id}</TableCell>
                  <TableCell>{cfg.name}</TableCell>
                  <TableCell>{cfg.created_by || 'N/A'}</TableCell>
                  <TableCell>{cfg.created_at ? new Date(cfg.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="text" onClick={() => handleViewJson(cfg)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </CardContent>
        </Card>
      </Box>
    </MainLayout>
  );
}

export default ViewConfigs;