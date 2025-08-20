import { useState, useEffect } from 'react'
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

function App() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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
                  <Button
                    variant="contained"
                    size="small"
                    style={{ textTransform: 'none' }}
                    onClick={() => handleViewTable(table)}
                  >
                    View Tables
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
    </MainLayout>
  )
}

export default App
