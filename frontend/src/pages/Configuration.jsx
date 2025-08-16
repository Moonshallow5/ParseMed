import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { API_BASE_URL } from '../config';

function Configuration() {
  const location = useLocation();
  const [configName, setConfigName] = useState('');
  const [attributes, setAttributes] = useState([
    {
      name: '',
      query: '',
      placeholder_name: 'Enter attribute name (e.g., Patient Age)',
      placeholder: 'Enter query (e.g., What is the patient\'s age?)'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const isEditing = !!location.state?.config;

  // Prefill from navigation state (when coming from ViewConfigs)
  useEffect(() => {
    const cfg = location.state?.config;
    if (!cfg) return;

    // Prefill name
    setConfigName(cfg.name || '');

    // Extract attributes from template_json, handling both object and string
    let template = cfg.template_json;
    if (typeof template === 'string') {
      try {
        template = JSON.parse(template);
      } catch {
        template = {};
      }
    }
    const attrs = Array.isArray(template?.attributes) ? template.attributes : [];
    if (attrs.length > 0) {
      setAttributes(
        attrs.map(a => ({
          name: a.name || '',
          query: a.query || '',
          placeholder_name: 'Enter attribute name',
          placeholder: 'Enter query'
        }))
      );
    }
  }, [location.state]);

  // Add new row
  const addRow = () => {
    setAttributes([
      ...attributes,
      {
        name: '',
        query: '',
        placeholder_name: 'Enter attribute name (e.g., Diagnosis)',
        placeholder: 'Enter query (e.g., What is the primary diagnosis?)'
      }
    ]);
  };

  // Remove row
  const removeRow = (index) => {
    if (attributes.length > 1) {
      const newAttributes = attributes.filter((_, i) => i !== index);
      setAttributes(newAttributes);
    }
  };

  // Update attribute field
  const updateAttribute = (index, field, value) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  // Save configuration
  const saveTable = async () => {
    if (!configName.trim()) {
      alert('Please enter a configuration name.');
      return;
    }

    setLoading(true);
    try {
      // Filter out empty rows
      const validAttributes = attributes.filter(attr => attr.name.trim() && attr.query.trim());
      
      if (validAttributes.length === 0) {
        alert('Please add at least one attribute with both name and query filled.');
        return;
      }

      // Prepare the data in the required format
      const templateJson = {
        attributes: validAttributes.map(attr => ({
          name: attr.name.trim(),
          query: attr.query.trim()
        }))
      };

      // Send to backend API
      const payload = {
        name: configName.trim(),
        template_json: templateJson
      };
      const url = isEditing
        ? `${API_BASE_URL}/update-configuration/${location.state.config.id}`
        : `${API_BASE_URL}/save-configuration`;
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      const result = await response.json();
      console.log('Configuration saved:', result);
      
      alert(isEditing ? 'Configuration updated successfully!' : 'Configuration saved successfully!');
      
      // Reset form
      if (!isEditing) {
        setConfigName('');
        setAttributes([{
          name: '',
          query: '',
          placeholder_name: 'Enter attribute name (e.g., Patient Age)',
          placeholder: 'Enter query (e.g., What is the patient\'s age?)'
        }]);
      }
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert(`Error saving configuration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ p: 5 }}>
        <Typography variant="h4" gutterBottom sx={{marginTop:'30px'}} >
          Extraction Configuration
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 3, color: 'white' }}>
          Define the attributes and queries you want OpenAI to extract from your documents.
        </Typography>

        {/* Configuration Name Field */}
        <TextField
          fullWidth
          variant="filled"
          label="Configuration Name"
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          placeholder="Name for this configuration"
          sx={{ mb: 3, backgroundColor: 'white' }}
          required
        />

        <Card elevation={8} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{ backgroundColor: '#f7f5f1' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                    <TableCell sx={{ width: '40%', fontWeight: 'bold' }}>
                      Attribute Name
                    </TableCell>
                    <TableCell sx={{ width: '50%', fontWeight: 'bold' }}>
                      Query
                    </TableCell>
                    <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attributes.map((attribute, index) => (
                    <TableRow key={index} sx={{ backgroundColor: '#f7f5f1' }}>
                      <TableCell sx={{ width: '40%' }}>
                        <TextField
                          fullWidth
                          variant="standard"
                          value={attribute.name}
                          onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                          placeholder={attribute.placeholder_name}
                          sx={{
                            '& .MuiInputBase-root': {
                              fontSize: '14px',
                            },
                            '& .MuiInputBase-input': {
                              padding: '8px 0',
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ width: '50%' }}>
                        <TextField
                          fullWidth
                          variant="standard"
                          value={attribute.query}
                          onChange={(e) => updateAttribute(index, 'query', e.target.value)}
                          placeholder={attribute.placeholder}
                          sx={{
                            '& .MuiInputBase-root': {
                              fontSize: '14px',
                            },
                            '& .MuiInputBase-input': {
                              padding: '8px 0',
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ width: '10%', textAlign: 'center' }}>
                        <IconButton
                          onClick={() => removeRow(index)}
                          disabled={attributes.length === 1}
                          sx={{
                            minWidth: '32px',
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            color: attributes.length === 1 ? 'text.disabled' : 'error.main'
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <Button
            variant="solo"
            startIcon={<AddIcon />}
            onClick={addRow}
            sx={{
              backgroundColor: 'transparent',
              color: '#4f76f6',
              textTransform: 'none',

            }}
          >
            Add Row
          </Button>
          
          <Button
            variant="contained"
            onClick={saveTable}
            loading={loading}
            sx={{
              backgroundColor: '#4f76f6',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#3f5fd6',
              }
            }}
          >
            {loading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update' : 'Save')}
          </Button>
        </Box>
      </Box>
    </MainLayout>
  );
}

export default Configuration;