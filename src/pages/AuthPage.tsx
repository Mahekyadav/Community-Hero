import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Alert,
  CircularProgress,
  MenuItem,
  Collapse,
} from '@mui/material';
import { ShieldAlert, LogIn, UserPlus, Chrome, BadgeCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { DEPARTMENTS, WARDS } from '../constants';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, user, userProfile, loading } =
    useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');

  // Officer-specific registration fields
  const [badgeId, setBadgeId] = useState('');
  const [officerDepartment, setOfficerDepartment] = useState('');
  const [officerCity, setOfficerCity] = useState('');
  const [officerWard, setOfficerWard] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetOfficerFields = () => {
    setBadgeId('');
    setOfficerDepartment('');
    setOfficerCity('');
    setOfficerWard('');
  };

  // Redirect already-authenticated users
  if (!loading && user && userProfile) {
    let destination = '/dashboard';
    if (userProfile.role === 'admin') destination = '/admin';
    else if (userProfile.role === 'officer') {
      destination = userProfile.status === 'pending' ? '/pending-approval' : '/officer';
    }
    return <Navigate to={destination} replace />;
  }

  const quickLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmail(demoEmail, demoPass);
      setTimeout(() => navigate('/'), 300);
    } catch (err: any) {
      setError(err.message || 'Demo login failed. Ensure the demo account exists in Firebase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name.');

        const extraData =
          role === 'officer'
            ? {
                badgeId: badgeId.trim() || undefined,
                department: officerDepartment || undefined,
                city: officerCity.trim() || undefined,
                ward: officerWard || undefined,
              }
            : undefined;

        await signUpWithEmail(email, password, name, role, extraData);
      }
      setTimeout(() => navigate('/'), 500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An authentication error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle(role, !isLogin);
      setTimeout(() => navigate('/'), 500);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      console.error(err);
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOfficerSignUp = !isLogin && role === 'officer';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        {/* Brand */}
        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            mb: 4,
            cursor: 'pointer',
          }}
        >
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
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={24} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 800, fontSize: '1.4rem' }}
          >
            Community <span className="text-blue-600">Hero</span>
          </Typography>
        </Box>

        <Card sx={{ boxShadow: '0px 20px 50px rgba(15,23,42,0.08)', borderRadius: 5 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Typography
              variant="h5"
              sx={{
                textAlign: 'center',
                fontWeight: 800,
                mb: 1,
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: { xs: '1.2rem', sm: '1.5rem' },
              }}
            >
              {isLogin ? 'Welcome Back' : 'Create Civic Account'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3.5 }}>
              {isLogin
                ? 'Securely access your civic dashboards'
                : 'Join local citizens to build better neighborhoods'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {error}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
            >
              {/* Full Name — all sign-ups */}
              {!isLogin && (
                <TextField
                  label="Full Name"
                  fullWidth
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              )}

              <TextField
                label="Email Address"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              {/* Role Picker — sign-up only */}
              {!isLogin && (
                <Box
                  sx={{
                    border: '1px solid rgba(226,232,240,1)',
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'rgba(248,250,252,0.5)',
                  }}
                >
                  <FormLabel
                    component="legend"
                    sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary', mb: 1 }}
                  >
                    Select Platform Role
                  </FormLabel>
                  <RadioGroup
                    row
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as UserRole);
                      resetOfficerFields();
                    }}
                  >
                    <FormControlLabel
                      value="citizen"
                      control={<Radio size="small" />}
                      label={<span className="text-xs font-semibold">Citizen</span>}
                    />
                    <FormControlLabel
                      value="officer"
                      control={<Radio size="small" />}
                      label={<span className="text-xs font-semibold">Municipal Officer</span>}
                    />
                    <FormControlLabel
                      value="admin"
                      control={<Radio size="small" />}
                      label={<span className="text-xs font-semibold">Admin</span>}
                    />
                  </RadioGroup>
                </Box>
              )}

              {/* ── Officer-only expanded registration fields ── */}
              <Collapse in={isOfficerSignUp} unmountOnExit>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 2.5,
                    borderRadius: 3,
                    border: '1px solid rgba(37,99,235,0.15)',
                    bgcolor: 'rgba(239,246,255,0.5)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <BadgeCheck size={16} color="#2563eb" />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      Officer Credentials — saved to your pending profile
                    </Typography>
                  </Box>

                  <TextField
                    label="Employee / Badge ID"
                    fullWidth
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    placeholder="e.g. MUN-2024-0042"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />

                  <TextField
                    select
                    label="Department (Issue Category you handle)"
                    fullWidth
                    value={officerDepartment}
                    onChange={(e) => setOfficerDepartment(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  >
                    <MenuItem value="">
                      <em>Select Department</em>
                    </MenuItem>
                    {DEPARTMENTS.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="City"
                    fullWidth
                    value={officerCity}
                    onChange={(e) => setOfficerCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />

                  <TextField
                    select
                    label="Assigned Ward / District"
                    fullWidth
                    value={officerWard}
                    onChange={(e) => setOfficerWard(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  >
                    <MenuItem value="">
                      <em>Select Ward</em>
                    </MenuItem>
                    {WARDS.map((w) => (
                      <MenuItem key={w} value={w}>
                        {w}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Collapse>

              {/* Login role picker (shown only on login tab) */}
              {isLogin && (
                <Box
                  sx={{
                    border: '1px solid rgba(226,232,240,1)',
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'rgba(248,250,252,0.5)',
                  }}
                >
                  <FormLabel
                    component="legend"
                    sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary', mb: 1 }}
                  >
                    Select Platform Role
                  </FormLabel>
                  <RadioGroup
                    row
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    <FormControlLabel
                      value="citizen"
                      control={<Radio size="small" />}
                      label={<span className="text-xs font-semibold">Citizen</span>}
                    />
                    <FormControlLabel
                      value="officer"
                      control={<Radio size="small" />}
                      label={<span className="text-xs font-semibold">Municipal Officer</span>}
                    />
                    <FormControlLabel
                      value="admin"
                      control={<Radio size="small" />}
                      label={<span className="text-xs font-semibold">Admin</span>}
                    />
                  </RadioGroup>
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submitting}
                startIcon={isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                sx={{
                  py: 1.75,
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  boxShadow: '0px 6px 20px rgba(37,99,235,0.25)',
                  minHeight: 52,
                }}
              >
                {submitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Sign Up'
                )}
              </Button>
            </Box>

            <Box sx={{ my: 3.5 }}>
              <Divider>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  OR CONTINUE WITH
                </Typography>
              </Divider>
            </Box>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              startIcon={<Chrome size={18} />}
              sx={{
                py: 1.5,
                borderRadius: 3,
                borderColor: 'rgba(226,232,240,1)',
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.9rem',
                backgroundColor: 'white',
                minHeight: 52,
                '&:hover': { backgroundColor: '#F8FAFC' },
              }}
            >
              Sign In with Google
            </Button>

            {/* Hackathon quick-access — login tab only */}
            {isLogin && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'rgba(254,252,232,0.9)',
                  border: '1px dashed rgba(202,138,4,0.5)',
                  borderRadius: 3,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: '#92400e',
                    display: 'block',
                    mb: 1.5,
                    letterSpacing: '0.3px',
                  }}
                >
                  ⚡ Hackathon Demo — Quick Access
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    disabled={submitting}
                    onClick={() => quickLogin('admin.demo@communityhero.gov', 'AdminPass123!')}
                    sx={{
                      borderColor: '#b45309',
                      color: '#92400e',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      borderRadius: 2,
                      py: 1,
                      '&:hover': { bgcolor: 'rgba(180,83,9,0.06)', borderColor: '#92400e' },
                    }}
                  >
                    Demo Admin
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    disabled={submitting}
                    onClick={() => quickLogin('officer.demo@communityhero.gov', 'OfficerPass123!')}
                    sx={{
                      borderColor: '#1d4ed8',
                      color: '#1e40af',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      borderRadius: 2,
                      py: 1,
                      '&:hover': { bgcolor: 'rgba(29,78,216,0.06)', borderColor: '#1d4ed8' },
                    }}
                  >
                    Demo Officer
                  </Button>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  resetOfficerFields();
                }}
                sx={{ fontWeight: 700, fontSize: '0.8rem' }}
              >
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
