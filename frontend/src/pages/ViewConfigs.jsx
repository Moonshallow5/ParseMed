import React, { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
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
import { API_BASE_URL } from '../config';

function ViewConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/get-configurations`);
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
      <Box>
          <Typography variant="h4" style={{color:'black'}} gutterBottom>View Configs</Typography>
          <TableContainer component={Paper} sx={{borderRadius:'20px', width:'100%'}}>
            <Table sx={{  width:'100%', tableLayout:'fixed' }}>
              <TableHead sx={{backgroundColor:'#e9edf6'}}>
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
                  <TableRow key={cfg.id}>
                    <TableCell component="th" scope="row">{cfg.id}</TableCell>
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
          </Box>
    </MainLayout>
  );
}

export default ViewConfigs;