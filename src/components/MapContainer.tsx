import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import { MapPin, X, Info, Filter, Plus } from 'lucide-react';
import { Issue, IssueCategory, IssueStatus } from '../types';

interface MapContainerProps {
  issues: Issue[];
  onSelectIssue?: (issue: Issue) => void;
  onSelectLocation?: (lat: number, lng: number, address: string) => void;
  allowLocationSelection?: boolean;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  issues,
  onSelectIssue,
  onSelectLocation,
  allowLocationSelection = false,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | 'All'>('All');
  const [placedPin, setPlacedPin] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchCat = selectedCategory === 'All' || issue.category === selectedCategory;
    const matchStatus = selectedStatus === 'All' || issue.status === selectedStatus;
    return matchCat && matchStatus;
  });

  const categories: (IssueCategory | 'All')[] = [
    'All',
    'Road Damage',
    'Garbage',
    'Water Leakage',
    'Street Light',
    'Electricity',
    'Traffic',
    'Public Safety',
    'Other',
  ];

  const statuses: (IssueStatus | 'All')[] = [
    'All',
    'Pending',
    'Verified',
    'Assigned',
    'In Progress',
    'Resolved',
    'Closed',
  ];

  // Map representation coordinates
  // We'll create an interactive municipal map using a styled vector background.
  // This represents the central metropolitan grid (Latitude: 37.7749, Longitude: -122.4194)
  const mapCenterLat = 37.7749;
  const mapCenterLng = -122.4194;

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!allowLocationSelection || !onSelectLocation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert click coordinates to simulated lat/lng offsets from center
    const latOffset = (0.5 - y / rect.height) * 0.05;
    const lngOffset = (x / rect.width - 0.5) * 0.05;
    const lat = Number((mapCenterLat + latOffset).toFixed(5));
    const lng = Number((mapCenterLng + lngOffset).toFixed(5));

    // Reverse geocode simulation
    const simulatedAddresses = [
      'Central Ave & 12th St',
      'Oak Boulevard, Sector 4',
      'Pine Ridge Road Near Highway 101',
      'Commercial District Phase II',
      'Market St Corner, Downtown',
      'Parkway Lane, Residential Block C'
    ];
    const address = simulatedAddresses[Math.floor(Math.random() * simulatedAddresses.length)] + ` (${lat}, ${lng})`;

    setPlacedPin({ lat, lng, address });
    onSelectLocation(lat, lng, address);
  };

  // Color mapping
  const getCategoryColor = (cat: IssueCategory) => {
    switch (cat) {
      case 'Road Damage': return '#F59E0B'; // Amber
      case 'Garbage': return '#EF4444'; // Red
      case 'Water Leakage': return '#3B82F6'; // Blue
      case 'Street Light': return '#10B981'; // Green
      case 'Electricity': return '#8B5CF6'; // Purple
      case 'Traffic': return '#EC4899'; // Pink
      case 'Public Safety': return '#D97706'; // Orange
      default: return '#64748B';
    }
  };

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return 'success';
      case 'In Progress':
      case 'Assigned':
        return 'info';
      case 'Verified':
        return 'secondary';
      default:
        return 'warning';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Map Control Headers */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(226, 232, 240, 0.8)', bg: 'white', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Filter size={18} className="text-blue-600" />
            Interactive Community Map
          </Typography>
          {allowLocationSelection && (
            <Chip
              icon={<MapPin size={14} />}
              label="Click map to pin a location"
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* Filter Badges */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
          <Typography variant="caption" sx={{ alignSelf: 'center', fontWeight: 600, mr: 1 }}>Category:</Typography>
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              onClick={() => setSelectedCategory(cat)}
              color={selectedCategory === cat ? 'primary' : 'default'}
              variant={selectedCategory === cat ? 'filled' : 'outlined'}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
          <Typography variant="caption" sx={{ alignSelf: 'center', fontWeight: 600, mr: 1 }}>Status:</Typography>
          {statuses.map((stat) => (
            <Chip
              key={stat}
              label={stat}
              size="small"
              onClick={() => setSelectedStatus(stat)}
              color={selectedStatus === stat ? 'secondary' : 'default'}
              variant={selectedStatus === stat ? 'filled' : 'outlined'}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>
      </Box>

      {/* Visual Simulated Municipal Grid Map (Highly Interactive, Beautiful) */}
      <Box sx={{ flexGrow: 1, position: 'relative', height: '400px', backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
        
        {/* Styled SVG Municipal Grid Background */}
        <div
          onClick={handleMapClick}
          className="absolute inset-0 cursor-crosshair overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(circle at 100px 100px, rgba(255,255,255,0.4) 0%, transparent 60%),
              linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 40px 40px, 40px 40px',
            backgroundColor: '#F1F5F9',
          }}
        >
          {/* Municipal Rivers, Parks, and Highways (Vector styling) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            {/* River */}
            <path d="M-50,150 Q150,80 300,220 T700,100" fill="none" stroke="#93C5FD" strokeWidth="24" strokeLinecap="round" />
            <path d="M-50,150 Q150,80 300,220 T700,100" fill="none" stroke="#DBEAFE" strokeWidth="12" strokeLinecap="round" />
            
            {/* Park Area */}
            <rect x="350" y="50" width="120" height="100" rx="20" fill="#BBF7D0" />
            <text x="410" y="105" fill="#15803D" fontSize="10" fontWeight="bold" textAnchor="middle">CITY PARK</text>

            {/* Industrial Area */}
            <rect x="50" y="250" width="150" height="90" rx="12" fill="#E2E8F0" />
            <text x="125" y="300" fill="#475569" fontSize="10" fontWeight="bold" textAnchor="middle">INDUSTRIAL PARK</text>

            {/* Main Roads */}
            <line x1="0" y1="200" x2="600" y2="200" stroke="#94A3B8" strokeWidth="6" />
            <line x1="250" y1="0" x2="250" y2="400" stroke="#94A3B8" strokeWidth="6" />
            <text x="100" y="192" fill="#64748B" fontSize="9" fontWeight="bold">GRAND AVENUE</text>
            <text x="260" y="80" fill="#64748B" fontSize="9" fontWeight="bold" transform="rotate(90,260,80)">METRO BLVD</text>
          </svg>

          {/* Active Issue Pins */}
          {filteredIssues.map((issue) => {
            // Map lat/lng offset to map grid coords (bound to grid width/height)
            // lat: [37.749, 37.799] -> y: [100%, 0%]
            // lng: [-122.444, -122.394] -> x: [0%, 100%]
            const latDiff = issue.latitude - mapCenterLat;
            const lngDiff = issue.longitude - mapCenterLng;
            
            // Map around 100% boundary
            const xPercent = 50 + (lngDiff / 0.05) * 100;
            const yPercent = 50 - (latDiff / 0.05) * 100;

            const isCurrent = selectedIssue?.id === issue.id;

            return (
              <button
                key={issue.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIssue(issue);
                  if (onSelectIssue) onSelectIssue(issue);
                }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all"
                style={{
                  left: `${Math.max(5, Math.min(95, xPercent))}%`,
                  top: `${Math.max(5, Math.min(95, yPercent))}%`,
                  zIndex: isCurrent ? 50 : 20,
                }}
              >
                {/* Floating category tooltip */}
                <span className="hidden group-hover:inline-block absolute bottom-8 bg-slate-950 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
                  {issue.category} ({issue.priority})
                </span>

                {/* PIN SVG */}
                <Box
                  sx={{
                    width: isCurrent ? 32 : 24,
                    height: isCurrent ? 32 : 24,
                    borderRadius: '50% 50% 50% 0',
                    background: getCategoryColor(issue.category),
                    transform: 'rotate(-45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isCurrent ? '0px 0px 12px rgba(0,0,0,0.3)' : '0px 2px 6px rgba(0,0,0,0.15)',
                    border: '2px solid white',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box
                    sx={{
                      width: isCurrent ? 12 : 8,
                      height: isCurrent ? 12 : 8,
                      borderRadius: '50%',
                      background: 'white',
                      transform: 'rotate(45deg)',
                    }}
                  />
                </Box>
              </button>
            );
          })}

          {/* User Placed Pin */}
          {placedPin && allowLocationSelection && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-50"
              style={{
                left: `${50 + ((placedPin.lng - mapCenterLng) / 0.05) * 100}%`,
                top: `${50 - ((placedPin.lat - mapCenterLat) / 0.05) * 100}%`,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50% 50% 50% 0',
                  background: '#2563EB',
                  transform: 'rotate(-45deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0px 0px 15px rgba(37, 99, 235, 0.5)',
                  border: '2px solid white',
                  animation: 'bounce 1s infinite alternate',
                }}
              >
                <Plus size={16} className="text-white transform rotate(45deg)" />
              </Box>
            </div>
          )}
        </div>

        {/* Selected Issue Info Overlay Drawer */}
        {selectedIssue && (
          <Card
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              zIndex: 100,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              boxShadow: '0px 8px 30px rgba(15, 23, 42, 0.15)',
              p: 1.5,
              gap: 2,
            }}
          >
            {selectedIssue.imageUrl && (
              <Box
                component="img"
                src={selectedIssue.imageUrl}
                sx={{
                  width: { xs: '100%', sm: 100 },
                  height: 80,
                  borderRadius: 2,
                  objectFit: 'cover',
                  alignSelf: 'stretch',
                }}
              />
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={selectedIssue.category}
                  size="small"
                  sx={{
                    background: getCategoryColor(selectedIssue.category),
                    color: 'white',
                    fontWeight: 600,
                    height: '20px',
                    fontSize: '0.7rem',
                  }}
                />
                <Chip
                  label={selectedIssue.status}
                  size="small"
                  color={getStatusColor(selectedIssue.status)}
                  sx={{ height: '20px', fontSize: '0.7rem', fontWeight: 600 }}
                />
                <Chip
                  label={`Priority: ${selectedIssue.priority}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: '20px', fontSize: '0.7rem' }}
                />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                {selectedIssue.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                📍 {selectedIssue.address}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => onSelectIssue && onSelectIssue(selectedIssue)}
                sx={{ flexGrow: { xs: 1, sm: 0 } }}
              >
                View Details
              </Button>
              <IconButton size="small" onClick={() => setSelectedIssue(null)}>
                <X size={18} />
              </IconButton>
            </Box>
          </Card>
        )}
      </Box>
    </Card>
  );
};
