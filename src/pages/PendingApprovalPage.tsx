import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Card, CardContent, Typography, Button, Avatar, Chip } from '@mui/material';
import { Clock, ShieldAlert, LogOut, UserCog } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const PendingApprovalPage: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        {/* Brand */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0px 4px 12px rgba(37,99,235,0.2)',
            }}
          >
            <ShieldAlert size={24} />
          </Box>
          <Typography variant="h5" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 800 }}>
            Community <span style={{ color: '#2563EB' }}>Hero</span>
          </Typography>
        </Box>

        <Card sx={{ boxShadow: '0px 20px 50px rgba(15,23,42,0.08)', borderRadius: 5 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            {/* Status icon */}
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'rgba(234,179,8,0.12)',
                color: '#b45309',
                mx: 'auto',
                mb: 3,
              }}
            >
              <Clock size={40} />
            </Avatar>

            <Chip
              label="Pending Admin Approval"
              sx={{
                bgcolor: 'rgba(234,179,8,0.12)',
                color: '#92400e',
                fontWeight: 700,
                mb: 2.5,
                fontSize: '0.8rem',
              }}
            />

            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, fontFamily: '"Space Grotesk", sans-serif' }}>
              Account Under Review
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 1, lineHeight: 1.7 }}>
              Hello, <strong>{userProfile?.displayName}</strong>. Your Municipal Officer account has been
              created and is currently awaiting approval from a system administrator.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
              Once an admin approves your account, you will gain full access to the Officer Dashboard.
              You will be able to sign in normally at that point.
            </Typography>

            {/* Actions */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<UserCog size={16} />}
                onClick={() => navigate('/officer/profile')}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  boxShadow: '0px 6px 20px rgba(37,99,235,0.25)',
                }}
              >
                Set Up My Officer Profile
              </Button>

              <Button
                variant="outlined"
                startIcon={<LogOut size={16} />}
                onClick={handleLogout}
                sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, borderColor: 'rgba(226,232,240,1)', color: 'text.secondary' }}
              >
                Sign Out
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, opacity: 0.7 }}>
              If you believe this is taking too long, please contact your system administrator.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
