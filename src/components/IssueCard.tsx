import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import { ThumbsUp, CheckCircle, MessageSquare, AlertTriangle, Calendar, MapPin, User } from 'lucide-react';
import { Issue, IssueStatus } from '../types';

interface IssueCardProps {
  issue: Issue;
  onViewDetails: (issue: Issue) => void;
  onUpvote?: (issueId: string) => void;
  onVerify?: (issueId: string) => void;
  currentUserId?: string;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onViewDetails,
  onUpvote,
  onVerify,
  currentUserId,
}) => {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Road Damage': return '#F59E0B';
      case 'Garbage': return '#EF4444';
      case 'Water Leakage': return '#3B82F6';
      case 'Street Light': return '#10B981';
      case 'Electricity': return '#8B5CF6';
      case 'Traffic': return '#EC4899';
      case 'Public Safety': return '#D97706';
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

  const hasUpvoted = currentUserId && issue.upvotedBy?.includes(currentUserId);
  const hasVerified = currentUserId && issue.verifiedBy?.includes(currentUserId);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0px 12px 35px rgba(15,23,42,0.08)' } }}>
      {issue.imageUrl ? (
        <CardMedia
          component="img"
          height="160"
          image={issue.imageUrl}
          alt={issue.title}
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: 160,
            background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <AlertTriangle size={48} className="opacity-20 text-blue-600" />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip
            label={issue.category}
            size="small"
            sx={{
              background: getCategoryColor(issue.category),
              color: 'white',
              fontWeight: 700,
              fontSize: '0.65rem',
              height: '22px',
            }}
          />
          <Chip
            label={issue.status}
            size="small"
            color={getStatusColor(issue.status)}
            sx={{ fontWeight: 700, fontSize: '0.65rem', height: '22px' }}
          />
          <Chip
            label={issue.priority}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.65rem', height: '22px' }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: '1.1rem',
            lineHeight: 1.3,
            mb: 1,
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
          onClick={() => onViewDetails(issue)}
        >
          {issue.title}
        </Typography>

        {/* Description Snippet */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.85rem' }}>
          {issue.description}
        </Typography>

        {/* Meta Info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 2, mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <MapPin size={14} className="text-blue-600 shrink-0" />
            <Typography variant="caption" noWrap sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              {issue.address}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <User size={14} className="text-blue-600 shrink-0" />
            <Typography variant="caption" noWrap sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              By {issue.creatorName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <Calendar size={14} className="text-blue-600 shrink-0" />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              {new Date(issue.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Action buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              size="small"
              startIcon={<ThumbsUp size={14} />}
              color={hasUpvoted ? 'primary' : 'inherit'}
              onClick={() => onUpvote && onUpvote(issue.id)}
              disabled={!currentUserId || hasUpvoted}
              sx={{ minWidth: 'unset', px: 1, height: '30px', fontSize: '0.75rem' }}
            >
              {issue.upvotesCount || 0}
            </Button>
            <Button
              size="small"
              startIcon={<CheckCircle size={14} />}
              color={hasVerified ? 'secondary' : 'inherit'}
              onClick={() => onVerify && onVerify(issue.id)}
              disabled={!currentUserId || hasVerified}
              sx={{ minWidth: 'unset', px: 1, height: '30px', fontSize: '0.75rem' }}
            >
              {issue.verificationsCount || 0}
            </Button>
          </Box>

          <Button
            size="small"
            variant="contained"
            onClick={() => onViewDetails(issue)}
            sx={{ py: '4px', px: 2, height: '30px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            View Details
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
