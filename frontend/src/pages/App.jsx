import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import MainLayout from '../components/MainLayout'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import Box from '@mui/material/Box';
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ListItemIcon from '@mui/material/ListItemIcon'
import Cloud from '@mui/icons-material/Cloud'
import Visibility from '@mui/icons-material/Visibility'
import ListItemText from '@mui/material/ListItemText'

function App() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null)
  const [activeTable, setActiveTable] = useState(null)

  const handleLogout = () => {
    // Add logout logic here
    alert('Logged out!')
  }

  // Fetch tables from backend
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/get-saved-tables`)
        if (!response.ok) {
          throw new Error('Failed to fetch tables')
        }
        const data = await response.json()
        if (data.success) {
          setTables(data.tables)
        } else {
          setError(data.error || 'Failed to fetch tables')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTables()
  }, [])

  // Handle viewing table details
  const handleViewTable = (table) => {
    setSelectedTable(table)
    setDialogOpen(true)
  }

  // Handle viewing table in side-by-side view
  const handleViewInSideBySide = async (table) => {
    try {      
      // Parse the extracted JSON data
      const extractedData = JSON.parse(table.extracted_json);
      
      // Navigate immediately to side-by-side - let it handle PDF loading
      navigate('/side-by-side', {
        state: {
          extractedData,
          sourceFilename: table.filename,
          s3PdfKey: table.filepath, // Pass the S3 key for SideBySide to load PDF
          isFromSavedTable: true // Flag to indicate this is from a saved table
        }
      });
    } catch (err) {
      console.error('Error loading table data for side-by-side view:', err);
      alert('Error loading table data for side-by-side view');
    }
  }

  // Handle opening the actions menu
  const handleActionMenuOpen = (event, table) => {
    setActionMenuAnchor(event.currentTarget);
    setActiveTable(table);
  };

  // Handle closing the actions menu
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActiveTable(null);
  };

  // Handle menu item selection
  const handleMenuAction = (action) => {
    if (!activeTable) return;
    
    if (action === 'view') {
      handleViewTable(activeTable);
    } else if (action === 'sideBySide') {
      handleViewInSideBySide(activeTable);
    }
    
    handleActionMenuClose();
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Parse and display JSON data
  const renderTableData = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
  
      return (
        <div>
          {Object.entries(data).map(([tableName, tableData], index) => {
            let rows = [];
            let columns = [];
  
            if (Array.isArray(tableData)) {
              // Array of objects
              if (tableData.length > 0 && typeof tableData[0] === "object") {
                columns = Object.keys(tableData[0]);
                rows = tableData;
              }
            } else if (typeof tableData === "object" && tableData !== null) {
              // Single object → make one row
              columns = Object.keys(tableData);
              rows = [tableData];
            } else {
              // Primitive value → single cell
              columns = ["Value"];
              rows = [{ Value: String(tableData) }];
            }
  
            return (
              <div key={index} style={{ marginBottom: "20px" }}>
                <Typography variant="h6" gutterBottom>
                  {tableName}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell key={col}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {columns.map((col) => (
                          <TableCell key={col}>
                            {typeof row[col] === "object"
                              ? JSON.stringify(row[col])
                              : String(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      );
    } catch (err) {
      return <Typography color="error">Error parsing table data</Typography>;
    }
  };

  if (loading) {
    return (
      <MainLayout onLogout={handleLogout}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout onLogout={handleLogout}>
        <Alert severity="error" style={{ margin: '20px' }}>
          {error}
        </Alert>
      </MainLayout>
    )
  }

  return (
    <MainLayout >
       <Box>
          <Typography variant="h4" sx={{color:'black'}} gutterBottom>Extraction results</Typography>
          <Card elevation={8} sx={{ p:3  }}>
          <CardContent >
      <TableContainer component={Paper} sx={{borderRadius:'20px'}}>
        <Table style={{ tableLayout: 'fixed', width: '100%'}}>
          <TableHead sx={{backgroundColor:'#e9edf6'}}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Filename</TableCell>
              <TableCell>Filepath</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tables.map((table) => (
              <TableRow
                key={table.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>{table.id}</TableCell>
                <TableCell>{table.filename}</TableCell>
                <TableCell>{table.filepath}</TableCell>
                <TableCell>{formatDate(table.created_at)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(event) => handleActionMenuOpen(event, table)}
                    aria-label="actions"
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </CardContent>
      </Card>
      </Box>

      {/* Dialog for viewing table details */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Extracted Tables - {selectedTable?.filename}
        </DialogTitle>
        <DialogContent>
          {selectedTable && renderTableData(selectedTable.extracted_json)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
              </Dialog>
        
        {/* Actions Menu */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
          
        >
          <MenuItem onClick={() => handleMenuAction('view')}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Tables</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('sideBySide')}>
          <ListItemIcon>
            <Cloud fontSize="small" />
          </ListItemIcon>
          <ListItemText>Side-by-Side</ListItemText>
          </MenuItem>
        </Menu>
      </MainLayout>
    )
  }

export default App
