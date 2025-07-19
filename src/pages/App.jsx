import { useState } from 'react'
import './App.css'
import MainLayout from '../components/MainLayout'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

function App() {
  const [count, setCount] = useState(0)

  const handleLogout = () => {
    // Add logout logic here
    alert('Logged out!')
  }

  // Table data and helper
  function createData(name, fileName,data) {
    return { name, fileName,data}
  }

  const rows = [
    createData('Neurosurgery Document', '030907_neuro.pdf', 159),
    createData('gynecomastia document', '023123_gynapdf',237),

  ]

  return (
    <MainLayout onLogout={handleLogout}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Manage Extractions</TableCell>
              <TableCell align="center">File Name</TableCell>
              <TableCell align="right">Total Extracted Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.name}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell align="center">{row.fileName}</TableCell>
                <TableCell align="right">{row.data}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </MainLayout>
  )
}

export default App
