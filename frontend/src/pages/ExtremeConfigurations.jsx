import React, { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { API_BASE_URL } from '../config';
import { useLocation } from 'react-router-dom';

function ExtremeConfigurations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [configurationTitle, setConfigurationTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [favoriteMode, setFavoriteMode] = useState(null); // cardId when saving favorite
  const [favoriteName, setFavoriteName] = useState('');
  const [userFavorites, setUserFavorites] = useState([]);
  const [selectedFavorites, setSelectedFavorites] = useState(new Set()); // Track which cards have selected favorite templates
  const [favoriteTemplates, setFavoriteTemplates] = useState(new Map()); // Track the original favorite template data for each card

  const location = useLocation();

  // Load existing configuration if editing
  useEffect(() => {
    const config = location.state?.config;
    if (config) {
      setIsEditing(true);
      setEditingConfigId(config.id);
      setConfigurationTitle(config.name || '');
      
      // Parse the template_json to extract data
      let template = config.template_json;
      if (typeof template === 'string') {
        try {
          template = JSON.parse(template);
        } catch {
          template = {};
        }
      }
      
      const attributes = template?.attributes || [];
      
      // Reset all cards
      const newCards = cards.map(card => ({ ...card, selectedTemplates: [], tableData: [] }));
      
      // Process attributes to populate cards
      let currentCardIndex = -1;
      const processedInterventions = new Set(); // Track which interventions we've processed
      const processedTableData = new Set(); // Track which table data we've already added
      
      attributes.forEach(attr => {
        if (attr.name.startsWith('--- ') && attr.name.endsWith(' ---')) {
          // This is a category separator
          const categoryName = attr.name.replace('--- ', '').replace(' ---', '');
          
          // Check if this is an intervention-specific category (e.g., "Population - Supraorbital/Eyebrow")
          if (categoryName.includes(' - ')) {
            const [baseCategory, intervention] = categoryName.split(' - ');
            const cardIndex = newCards.findIndex(card => card.title === baseCategory);
            if (cardIndex !== -1) {
              currentCardIndex = cardIndex;
              newCards[cardIndex].expanded = true;
              
              // Mark this intervention as selected
              if (newCards[cardIndex].interventions && newCards[cardIndex].interventions[intervention] !== undefined) {
                newCards[cardIndex].interventions[intervention] = true;
                processedInterventions.add(intervention);
              }
            }
          } else {
            // Regular category (e.g., "Population")
            const cardIndex = newCards.findIndex(card => card.title === categoryName);
            if (cardIndex !== -1) {
              currentCardIndex = cardIndex;
              newCards[cardIndex].expanded = true;
            }
          }
        } else if (currentCardIndex !== -1 && attr.name && attr.query) {
          // Create a unique key for this table data to avoid duplicates
          const tableDataKey = `${currentCardIndex}-${attr.name}`;
          
          // Only add table data if we haven't processed it before
          if (!processedTableData.has(tableDataKey)) {
            // Clean up intervention filters from the description
            let cleanDescription = attr.query;
            if (newCards[currentCardIndex].title === 'Population' && newCards[currentCardIndex].interventions) {
              const interventionMatch = attr.query.match(/\[Filter for patients with interventions: (.+?)\]/);
              if (interventionMatch) {
                cleanDescription = attr.query.replace(/\[Filter for patients with interventions: .+?\]/, '').trim();
              }
            }
            
            newCards[currentCardIndex].tableData.push({
              field: attr.name,
              description: cleanDescription
            });
            
            processedTableData.add(tableDataKey);
          }
        }
      });
      
      setCards(newCards);
    }
  }, [location.state]);



  // Predefined table templates that users can pick from
  const tableTemplates = [
    {
      id: 'author-details',
      name: 'Author Details',
      description: 'Basic author information template',
      category: 'Author Details',
      template: [
        { field: 'Author Name', description: 'Full name of the author' },
        { field: 'Author Institution', description: 'University or organization' },
        { field: 'Author Department', description: 'Department or division' },
        { field: 'Author Email', description: 'Contact email address' },
        { field: 'Author ORCID', description: 'ORCID identifier if available' }
      ]
    },
    {
      id: 'author-details-advanced',
      name: 'Author Details - Advanced',
      description: 'Basic population demographics',
      category: 'Author Details',
      template: [
        { field: 'Number of Patients', description: 'Total patient count' },
        { field: 'Patient Age Range', description: 'Age distribution' },
        { field: 'Patient Gender', description: 'Gender distribution' },
        { field: 'Patient History', description: 'Medical history details' }
      ]

    },
    {
      id: 'population-basic',
      name: 'Population - Basic',
      description: 'Basic population demographics',
      category: 'Population',
      template: [
        { field: 'Number of Patients', description: 'Total patient count' },
        { field: 'Patient Age Range', description: 'Age distribution' },
        { field: 'Patient Gender', description: 'Gender distribution' },
        { field: 'Patient History', description: 'Medical history details' }
      ]
    },
    {
      id: 'population-advanced',
      name: 'Population - Advanced',
      description: 'Advanced population with inclusion/exclusion criteria',
      category: 'Population',
      template: [
        { field: 'Number of Patients', description: 'Total patient count' },
        { field: 'Patient Age Range', description: 'Age distribution' },
        { field: 'Patient Gender', description: 'Gender distribution' },
        { field: 'Patient History', description: 'Medical history details' },
        { field: 'Inclusion Criteria', description: 'Study inclusion requirements' },
        { field: 'Exclusion Criteria', description: 'Study exclusion requirements' }
      ]
    },
    {
      id: 'tumor-specific',
      name: 'Tumor Patient Data',
      description: 'Specific to patients with tumors',
      category: 'Population',
      template: [
        { field: 'Tumor Type', description: 'Type of tumor' },
        { field: 'Tumor Stage', description: 'Tumor staging' },
        { field: 'Tumor Size', description: 'Size of tumor' },
        { field: 'Metastasis', description: 'Metastasis status' },
        { field: 'Treatment History', description: 'Previous treatments' }
      ]
    },
    {
      id: 'outcomes-basic',
      name: 'Outcomes - Basic',
      description: 'Basic outcome measures',
      category: 'Outcomes',
      template: [
        { field: 'Primary Outcome', description: 'Main study outcome measure' },
        { field: 'Secondary Outcomes', description: 'Additional outcome measures' },
        { field: 'Success Rate', description: 'Percentage of successful outcomes' }
      ]
    },
    {
      id: 'outcomes-advanced',
      name: 'Outcomes - Advanced',
      description: 'Advanced outcome measures with statistics',
      category: 'Outcomes',
      template: [
        { field: 'Primary Outcome', description: 'Main study outcome measure' },
        { field: 'Secondary Outcomes', description: 'Additional outcome measures' },
        { field: 'Success Rate', description: 'Percentage of successful outcomes' },
        { field: 'Follow-up Period', description: 'Duration of follow-up' },
        { field: 'Statistical Significance', description: 'P-value and confidence intervals' }
      ]
    }
  ];

  // Sample card categories - initially empty, will be populated when users select templates
  const [cards, setCards] = useState([
    {
      id: 1,
      title: 'Author Details',
      description: 'Details about the author of the document.',
      expanded: true, // Auto-expand this card
      selectedTemplates: [],
      tableData: []
    },
    {
      id: 2,
      title: 'Population',
      description: 'Details about the population of the study.',
      expanded: false,
      selectedTemplates: [],
      tableData: [],
      interventions: {
        'Supraorbital/Eyebrow (SOA)': false,
        'Endoscopic Transorbital approach (TTA)': false,
        'Transnasal': false,
        'Transcranial': false,
        'Combined Approach': false
      }
    },
    {
      id: 3,
      title: 'Outcomes',
      description: 'Details about the outcome of the study.',
      expanded: false,
      selectedTemplates: [],
      tableData: []
    }
  ]);



  const handleCardExpand = (cardId) => {
    setCards(prevCards => 
      prevCards.map(card => 
        card.id === cardId 
          ? { ...card, expanded: !card.expanded }
          : { ...card, expanded: false } // Close other cards
      )
    );
  };

  const handleAddTemplate = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      loadUserFavorites(card.title);
    }
    setSelectedCard(cardId);
    setDrawerOpen(true);
  };

  const handleTemplateSelect = (template) => {
    // Handle both predefined templates and user favorites
    const templateData = template.template || template.template_data || [];
    
    // Check if this is a user favorite (has template_data property)
    const isUserFavorite = template.template_data !== undefined;
    
    setCards(prevCards => 
      prevCards.map(card => 
        card.id === selectedCard 
          ? { 
              ...card, 
              selectedTemplates: [...card.selectedTemplates, template],
              tableData: [...card.tableData, ...templateData]
            }
          : card
      )
    );
    
    // If user selected a favorite template, mark this card as having a selected favorite
    if (isUserFavorite) {
      setSelectedFavorites(prev => new Set([...prev, selectedCard]));
      // Store the original favorite template data for comparison
      setFavoriteTemplates(prev => new Map(prev).set(selectedCard, templateData));
    }
    
    setDrawerOpen(false);
    setSelectedCard(null);
  };

  const handleRemoveTemplate = (cardId, templateId) => {
    setCards(prevCards => {
      const updatedCards = prevCards.map(card => 
        card.id === cardId 
          ? { 
              ...card, 
              selectedTemplates: card.selectedTemplates.filter(t => t.id !== templateId),
              tableData: card.tableData.filter(item => {
                // Find the template being removed
                const templateToRemove = card.selectedTemplates.find(t => t.id === templateId);
                if (!templateToRemove) return true;
                
                // Check if this item belongs to the template being removed
                const templateData = templateToRemove.template || templateToRemove.template_data || [];
                return !templateData.some(field => field.field === item.field);
              })
            }
          : card
      );
      
      // Check if we need to clear favorite status after removing template
      const updatedCard = updatedCards.find(c => c.id === cardId);
      const originalFavoriteData = favoriteTemplates.get(cardId);
      
      if (selectedFavorites.has(cardId) && originalFavoriteData) {
        const isMatching = JSON.stringify(updatedCard.tableData) === JSON.stringify(originalFavoriteData);
        if (!isMatching) {
          // Clear favorite status if data doesn't match
          setSelectedFavorites(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardId);
            return newSet;
          });
          setFavoriteTemplates(prev => {
            const newMap = new Map(prev);
            newMap.delete(cardId);
            return newMap;
          });
        }
      }
      
      return updatedCards;
    });
  };

  const handleAddRow = (cardId) => {
    setCards(prevCards => {
      const updatedCards = prevCards.map(card => 
        card.id === cardId 
          ? { 
              ...card, 
              tableData: [...card.tableData, { field: 'New Field', description: 'New description' }]
            }
          : card
      );
      
      return updatedCards;
    });
  };

  const handleUpdateRow = (cardId, index, field, value) => {
    setCards(prevCards => {
      const updatedCards = prevCards.map(card => 
        card.id === cardId 
          ? { 
              ...card, 
              tableData: card.tableData.map((item, i) => 
                i === index ? { ...item, [field]: value } : item
              )
            }
          : card
      );
      
      return updatedCards;
    });
  };

  const handleRemoveRow = (cardId, index) => {
    setCards(prevCards => {
      const updatedCards = prevCards.map(card => 
        card.id === cardId 
          ? { 
              ...card, 
              tableData: card.tableData.filter((_, i) => i !== index)
            }
          : card
      );
      
      return updatedCards;
    });
  };

  const handleInterventionChange = (cardId, intervention, checked) => {
    setCards(prevCards => {
      const updatedCards = prevCards.map(card => 
        card.id === cardId 
          ? { 
              ...card, 
              interventions: {
                ...card.interventions,
                [intervention]: checked
              }
            }
          : card
      );
      
      return updatedCards;
    });
  };

  // Filter templates based on the selected card
  const getFilteredTemplates = () => {
    if (!selectedCard) return [];
    
    const card = cards.find(c => c.id === selectedCard);
    if (!card) return [];
    
    return tableTemplates.filter(template => template.category === card.title);
  };

  // Get user favorites for the selected card category
  const getFilteredFavorites = () => {
    if (!selectedCard) return [];
    
    const card = cards.find(c => c.id === selectedCard);
    if (!card) return [];
    
    return userFavorites.filter(favorite => favorite.category === card.title);
  };

  // Load user favorites when drawer opens
  const loadUserFavorites = async (category) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-favorite-templates?category=${encodeURIComponent(category)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUserFavorites(prev => {
            // Merge with existing favorites, avoiding duplicates
            const existingIds = prev.map(f => f.id);
            const newFavorites = result.templates.filter(t => !existingIds.includes(t.id));
            return [...prev, ...newFavorites];
          });
        }
      }
    } catch (error) {
      console.error('Failed to load user favorites:', error);
    }
  };



  // Handle favorite card functionality
  const handleFavoriteClick = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.tableData.length === 0) {
      setSaveMessage('Please add some data to this card before saving as favorite');
      return;
    }
    setFavoriteMode(cardId);
    setFavoriteName(`${card.title} - Custom Template`);
  };

  const handleSaveFavorite = async () => {
    try {
      const card = cards.find(c => c.id === favoriteMode);
      if (!card || !favoriteName.trim()) {
        setSaveMessage('Please enter a name for your favorite template');
        return;
      }

      const favoriteData = {
        name: favoriteName.trim(),
        category: card.title,
        description: `Custom template for ${card.title}`,
        template: card.tableData.map(row => ({
          field: row.field,
          description: row.description
        }))
      };

      const response = await fetch(`${API_BASE_URL}/save-favorite-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(favoriteData)
      });

      if (!response.ok) {
        throw new Error('Failed to save favorite template');
      }

      const result = await response.json();
      if (result.success) {
        setSaveMessage('Favorite template saved successfully!');
        setUserFavorites(prev => [...prev, { ...favoriteData, id: result.id }]);
        setSelectedFavorites(prev => new Set([...prev, favoriteMode])); // Mark this card as having a selected favorite
        // Store the original favorite template data for comparison
        setFavoriteTemplates(prev => new Map(prev).set(favoriteMode, card.tableData));
        setFavoriteMode(null);
        setFavoriteName('');
      } else {
        throw new Error(result.error || 'Failed to save favorite');
      }
    } catch (error) {
      setSaveMessage(`Failed to save favorite: ${error.message}`);
    }
  };

  const handleCancelFavorite = () => {
    setFavoriteMode(null);
    setFavoriteName('');
  };

  // Check if current table data matches the original favorite template
  const isTableDataMatchingFavorite = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    const originalFavoriteData = favoriteTemplates.get(cardId);
    
    if (!card || !originalFavoriteData) return false;
    
    // Use JSON.stringify for simple and reliable comparison
    return JSON.stringify(card.tableData) === JSON.stringify(originalFavoriteData);
  };



  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      // Validate title
      if (!configurationTitle.trim()) {
        setSaveMessage('Please enter a configuration title');
        return;
      }

      // Check if any cards have data
      const hasData = cards.some(card => card.tableData.length > 0);
      if (!hasData) {
        setSaveMessage('Please add at least one template or row to save');
        return;
      }

      // Convert the card data to the format expected by the save-configuration endpoint
      const attributes = [];
      
      cards.forEach(card => {
        if (card.tableData.length > 0) {
          // Check if this card has interventions and if any are selected
          const selectedInterventions = card.interventions ? 
            Object.entries(card.interventions)
              .filter(([_, checked]) => checked)
              .map(([intervention, _]) => intervention) : [];
          
          if (selectedInterventions.length > 0) {
            // Create separate categories for each selected intervention
            selectedInterventions.forEach(intervention => {
              // Add category separator for this intervention
              attributes.push({
                name: `--- ${card.title} - ${intervention} ---`,
                query: `Category: ${card.title} - ${intervention}`
              });
              
              // Add each field from the card with intervention-specific query
              card.tableData.forEach(row => {
                attributes.push({
                  name: row.field,
                  query: `${row.description} [Filter for patients with interventions: ${intervention}]`
                });
              });
            });
          } else {
            // No interventions selected, create regular category
            attributes.push({
              name: `--- ${card.title} ---`,
              query: `Category: ${card.title}`
            });
            
            // Add each field from the card
            card.tableData.forEach(row => {
              attributes.push({
                name: row.field,
                query: row.description
              });
            });
          }
        }
      });

      // Prepare the data in the format expected by save-configuration
      const templateJson = {
        attributes: attributes
      };

      const saveData = {
        name: configurationTitle.trim(),
        template_json: templateJson
      };

      // Use the same endpoint as Configuration.jsx
      const url = isEditing
        ? `${API_BASE_URL}/update-configuration/${editingConfigId}`
        : `${API_BASE_URL}/save-configuration`;
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      const result = await response.json();
      if (result.success) {
        setSaveMessage(isEditing ? 'Configuration updated successfully!' : 'Configuration saved successfully! You can view it in View Configs.');
        
        if (isEditing) {
          // If editing, just clear the editing state
          setIsEditing(false);
          setEditingConfigId(null);
        } else {
          // If creating new, reset the form
          setConfigurationTitle('');
          setCards(prevCards => 
            prevCards.map(card => ({ 
              ...card, 
              selectedTemplates: [], 
              tableData: [],
              expanded: card.id === 1 // Keep only first card expanded
            }))
          );
        }
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (err) {
      setSaveMessage(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };



  return (
    <MainLayout>
      <Box sx={{ 
        p: 3, 
        textAlign: 'center'
      }}>
        <Typography variant="h4" sx={{ color: 'black', mb: 3 }}>
          Extreme Configurations
        </Typography>
        
                 <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
           Select and organize configurations for different document categories
         </Typography>

         {/* Configuration Title Input */}
         <Box sx={{ mb: 3 }}>
           <TextField
             fullWidth
             variant="outlined"
             label="Configuration Title"
             value={configurationTitle}
             onChange={(e) => setConfigurationTitle(e.target.value)}
             placeholder="Enter a title for this configuration (e.g., Medical Research Paper Template)"
             sx={{ backgroundColor: 'white', width: '100%' }}
             required
           />
         </Box>

                 {/* Configuration Cards */}
       <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {cards.map((card) => (
            <Box key={card.id} sx={{ position: 'relative' }}>
              {/* Favorite Input Field - appears when favoriteMode is active for this card */}
              {favoriteMode === card.id && (
                <Box sx={{ 
                  mb: 2, 
                  p: 2, 
                  border: '2px solid #1976d2', 
                  borderRadius: 1, 
                  backgroundColor: '#f0f7ff' 
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Save as Favorite Template
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      fullWidth
                      variant="outlined"
                      label="Template Name"
                      value={favoriteName}
                      onChange={(e) => setFavoriteName(e.target.value)}
                      placeholder="Enter a name for this template"
                    />
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={handleSaveFavorite}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      Save
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={handleCancelFavorite}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}

              <Card sx={{ width: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton 
                        onClick={() => handleFavoriteClick(card.id)}
                        sx={{ 
                          color: selectedFavorites.has(card.id) && isTableDataMatchingFavorite(card.id) ? '#ffc107' : '#ccc',
                          '&:hover': { color: selectedFavorites.has(card.id) && isTableDataMatchingFavorite(card.id) ? '#ff9800' : '#999' }
                        }}
                        disabled={favoriteMode === card.id}
                        title={selectedFavorites.has(card.id) && isTableDataMatchingFavorite(card.id) ? "Edit favorite template" : "Save as favorite template"}
                      >
                        {selectedFavorites.has(card.id) && isTableDataMatchingFavorite(card.id) ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                      <IconButton onClick={() => handleCardExpand(card.id)}>
                        {card.expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>

                                 {/* Expanded View */}
                 {card.expanded && (
                   <Box sx={{ mt: 2 }}>
                     {/* Intervention Checkboxes - Only for Population card */}
                     {card.title === 'Population' && card.interventions && (
                       <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                         <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                           🔬 Medical Interventions (Select to filter data extraction)
                         </Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                           {Object.entries(card.interventions).map(([intervention, checked]) => (
                             <FormControlLabel
                               key={intervention}
                               control={
                                 <Checkbox
                                   checked={checked}
                                   onChange={(e) => handleInterventionChange(card.id, intervention, e.target.checked)}
                                   color="primary"
                                 />
                               }
                               label={intervention}
                               sx={{ 
                                 '& .MuiFormControlLabel-label': { 
                                   fontSize: '0.875rem',
                                   fontWeight: checked ? 600 : 400
                                 }
                               }}
                             />
                           ))}
                         </Box>
                         {Object.values(card.interventions).some(checked => checked) && (
                           <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary', fontStyle: 'italic' }}>
                             Selected interventions will be included in the extraction query to filter for specific patient groups.
                           </Typography>
                         )}
                       </Box>
                     )}
                     
                     {/* Selected Templates Display */}
                     {card.selectedTemplates.length > 0 && (
                       <Box sx={{ mb: 2 }}>
                         <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                           Selected Templates:
                         </Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                           {card.selectedTemplates.map((template) => {
                             // Check if this template is a user favorite and if the current data matches it
                             const isUserFavorite = template.template_data !== undefined;
                             const isMatchingFavorite = isUserFavorite && selectedFavorites.has(card.id) && isTableDataMatchingFavorite(card.id);
                             
                             return (
                               <Box
                                 key={template.id}
                                 sx={{
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: 1,
                                   p: 1,
                                   border: '1px solid #e0e0e0',
                                   borderRadius: 1,
                                   backgroundColor: isUserFavorite && isMatchingFavorite ? '#e8f5e8' : '#f5f5f5'
                                 }}
                               >
                                 <Typography variant="body2">{template.name}</Typography>
                                 {/* Only show X button if it's not a matching favorite */}
                                 { (
                                   <IconButton
                                     size="small"
                                     onClick={() => handleRemoveTemplate(card.id, template.id)}
                                     sx={{ p: 0.5 }}
                                   >
                                     ×
                                   </IconButton>
                                 )}
                               </Box>
                             );
                           })}
                         </Box>
                       </Box>
                     )}

                     {/* Editable Table Data */}
                     {card.tableData.length > 0 ? (
                       <TableContainer component={Paper} sx={{ mb: 2 }}>
                         <Table size="small">
                           <TableHead>
                             <TableRow>
                               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '40%' }}>
                                 Field Name
                               </TableCell>
                               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '50%' }}>
                                 Description
                               </TableCell>
                               <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '10%' }}>
                                 Actions
                               </TableCell>
                             </TableRow>
                           </TableHead>
                           <TableBody>
                             {card.tableData.map((row, index) => (
                               <TableRow key={index}>
                                 <TableCell>
                                   <input
                                     type="text"
                                     value={row.field}
                                     onChange={(e) => handleUpdateRow(card.id, index, 'field', e.target.value)}
                                     style={{
                                       width: '100%',
                                       border: 'none',
                                       outline: 'none',
                                       backgroundColor: 'transparent',
                                       fontSize: 'inherit',
                                       color: 'black'
                                     }}
                                   />
                                 </TableCell>
                                 <TableCell>
                                   <input
                                     type="text"
                                     value={row.description}
                                     onChange={(e) => handleUpdateRow(card.id, index, 'description', e.target.value)}
                                     style={{
                                       width: '100%',
                                       border: 'none',
                                       outline: 'none',
                                       backgroundColor: 'transparent',
                                       fontSize: 'inherit',
                                       color: 'black'
                                     }}
                                   />
                                 </TableCell>
                                 <TableCell>
                                   <IconButton
                                     size="small"
                                     onClick={() => handleRemoveRow(card.id, index)}
                                     sx={{ p: 0.5 }}
                                   >
                                     <DeleteIcon />
                                   </IconButton>
                                 </TableCell>
                               </TableRow>
                             ))}
                           </TableBody>
                         </Table>
                       </TableContainer>
                     ) : (
                       <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                         No table data yet. Add a template to get started.
                       </Typography>
                     )}
                     
                     <Box sx={{ display: 'flex', gap: 1 }}>
                       <Button
                         startIcon={<AddIcon />}
                         variant="outlined"
                         onClick={() => handleAddTemplate(card.id)}
                       >
                         Add Template
                       </Button>
                       <Button
                         startIcon={<AddIcon />}
                         variant="outlined"
                         onClick={() => handleAddRow(card.id)}
                       >
                         Add Row
                       </Button>
                     </Box>
                   </Box>
                 )}
                             </CardContent>
               </Card>
             </Box>
           ))}
         </Box>

                 {/* Save All Button */}
         <Box sx={{ display: 'flex', justifyContent: 'center' }}>
           <Button
             variant="contained"
             size="large"
             startIcon={<SaveIcon />}
             onClick={handleSaveAll}
             disabled={saving}
             sx={{ px: 4, py: 1.5 }}
           >
             {saving ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Configuration' : 'Save Configuration')}
           </Button>
         </Box>

         {/* Save Message */}
         {saveMessage && (
           <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
             <Alert 
               severity={saveMessage.includes('failed') ? 'error' : 'success'}
               onClose={() => setSaveMessage(null)}
             >
               {saveMessage}
             </Alert>
           </Box>
         )}
       </Box>

       {/* Table Template Selection Drawer */}
       <Drawer
         anchor="right"
         open={drawerOpen}
         onClose={() => {
           setDrawerOpen(false);
           setSelectedCard(null);
         }}
         sx={{ '& .MuiDrawer-paper': { width: 500 } }}
       >
         <Box sx={{ p: 2 }}>
           <Typography variant="h6" sx={{ mb: 2 }}>
             Select Table Template for {selectedCard ? cards.find(c => c.id === selectedCard)?.title : ''}
           </Typography>
           
                     <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose from predefined templates or your saved favorites
          </Typography>
          
          {/* User Favorites Section */}
          {getFilteredFavorites().length > 0 && (
            <>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1976d2' }}>
                Your Favorites
              </Typography>
              {getFilteredFavorites().map((favorite) => (
                <Card key={`favorite-${favorite.id}`} sx={{ mb: 2, cursor: 'pointer', border: '1px solid #1976d2' }} onClick={() => handleTemplateSelect(favorite)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <StarIcon sx={{ color: '#ffc107', fontSize: '1.2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {favorite.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {favorite.description}
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                              Field Name
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                              Description
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(favorite.template_data || []).map((field, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {field.field}
                              </TableCell>
                              <TableCell>
                                {field.description}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
          
          {/* Predefined Templates Section */}
          {getFilteredTemplates().length > 0 && (
            <>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: getFilteredFavorites().length > 0 ? 3 : 0 }}>
                Predefined Templates
              </Typography>
              {getFilteredTemplates().map((template) => (
                <Card key={template.id} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => handleTemplateSelect(template)}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                              Field Name
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                              Description
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {template.template.map((field, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {field.field}
                              </TableCell>
                              <TableCell>
                                {field.description}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
          
          {/* No templates available */}
          {getFilteredTemplates().length === 0 && getFilteredFavorites().length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No templates available for {selectedCard ? cards.find(c => c.id === selectedCard)?.title : 'this category'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                You can add custom rows using the "Add Row" button, or save your current configuration as a favorite template.
              </Typography>
            </Box>
          )}
         </Box>
       </Drawer>
    </MainLayout>
  );
}

export default ExtremeConfigurations;
