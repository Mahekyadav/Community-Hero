import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
} from '@mui/material';
import { ArrowLeft, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { DEPARTMENTS, WARDS } from '../constants';

export const AdminProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [ward, setWard] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName ?? '');
      setBadgeId(userProfile.badgeId ?? '');
      setContactNumber(userProfile.contactNumber ?? '');
      setCity(userProfile.city ?? '');
      setDepartment(userProfile.department ?? '');
      setWard(userProfile.ward ?? '');
    }
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccess(false);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        badgeId,
        contactNumber,
        city,
        department,
        ward,
        updatedAt: new Date().toISOString(),
      });
      setSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user?.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Navbar />

      <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/admin')}
          sx={{ mb: 3, fontWeight: 700 }}
        >
          Back to Dashboard
        </Button>

        <Card sx={{ boxShadow: '0px 10px 30px rgba(0,0,0,0.04)', borderRadius: 5 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'error.main' }}>
                <ShieldAlert size={28} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif' }}>
                  Admin Profile
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {userProfile?.email}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {success && (
              <Alert severity="success" icon={<CheckCircle2 size={18} />} sx={{ mb: 3, borderRadius: 3 }}>
                Profile saved successfully.
              </Alert>
            )}

            <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Full Name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Admin Priya Sharma"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              <TextField
                label="Badge / Employee ID"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="e.g. ADMIN-2024-001"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              <TextField
                label="Contact Number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              <TextField
                label="City"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              <TextField
                select
                label="Department / Oversight Area"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
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
                select
                label="Assigned Ward / District"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
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

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  boxShadow: '0px 6px 20px rgba(220,38,38,0.25)',
                }}
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>

      <Footer />
    </Box>
  );
};
