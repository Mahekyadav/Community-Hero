import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from '@mui/material';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import {
  ShieldAlert,
  Users,
  Settings,
  Database,
  UserCheck,
  Trash2,
  Lock,
  Zap,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Issue, UserProfile, UserRole } from '../types';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Users List
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersData: UserProfile[] = [];
        snapshot.forEach((doc) => {
          usersData.push(doc.data() as UserProfile);
        });
        setUsers(usersData);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'users')
    );

    // 2. Fetch Issues
    const issuesQuery = query(collection(db, 'issues'));
    const unsubscribeIssues = onSnapshot(
      issuesQuery,
      (snapshot) => {
        const issuesData: Issue[] = [];
        snapshot.forEach((doc) => {
          issuesData.push(doc.data() as Issue);
        });
        setIssues(issuesData);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'issues')
    );

    return () => {
      unsubscribeUsers();
      unsubscribeIssues();
    };
  }, []);

  // Update user role
  const handleUpdateRole = async (targetUid: string, newRole: UserRole) => {
    const userRef = doc(db, 'users', targetUid);
    try {
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  // Approve a pending officer
  const handleApproveOfficer = async (targetUid: string) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), { status: 'approved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  // Delete User
  const handleDeleteUser = async (targetUid: string) => {
    if (targetUid === user?.uid) return; // Prevent self-deletion
    const userRef = doc(db, 'users', targetUid);
    try {
      await deleteDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
    }
  };

  // Derived stats
  const totalUsersCount = users.length;
  const totalOfficersCount = users.filter((u) => u.role === 'officer' && u.status !== 'pending').length;
  const pendingOfficers = users.filter((u) => u.role === 'officer' && u.status === 'pending');
  const totalIssuesCount = issues.length;
  const openIssuesCount = issues.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed').length;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Navbar />

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif' }}>
              System Command Console
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review deployment telemetry, modify user access credentials, adjust municipal department mapping, and inspect system-wide activity.
            </Typography>
          </Box>
        </Box>

        {/* Telemetry Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(37,99,235,0.04)', borderColor: 'rgba(37,99,235,0.1)' }}>
              <CardContent sx={{ p: 3, display: 'flex', justifyItems: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Total Citizens</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>{totalUsersCount}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
                  <Users size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.1)' }}>
              <CardContent sx={{ p: 3, display: 'flex', justifyItems: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Active Officers</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>{totalOfficersCount}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 44, height: 44 }}>
                  <UserCheck size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(139,92,246,0.04)', borderColor: 'rgba(139,92,246,0.1)' }}>
              <CardContent sx={{ p: 3, display: 'flex', justifyItems: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Total Issues Logged</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'purple.700' }}>{totalIssuesCount}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#8B5CF6', width: 44, height: 44 }}>
                  <Database size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.1)' }}>
              <CardContent sx={{ p: 3, display: 'flex', justifyItems: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>System Health</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>Operational</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 44, height: 44 }}>
                  <Zap size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Officer Approval Requests */}
        {pendingOfficers.length > 0 && (
          <Card sx={{ mb: 4, border: '1px solid rgba(234,179,8,0.3)', bgcolor: 'rgba(254,252,232,0.6)', borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Avatar sx={{ bgcolor: 'rgba(234,179,8,0.15)', color: '#b45309', width: 38, height: 38 }}>
                  <Clock size={18} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    Officer Approval Requests
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pendingOfficers.length} officer{pendingOfficers.length > 1 ? 's' : ''} awaiting activation
                  </Typography>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingOfficers.map((officer) => (
                      <TableRow key={officer.uid}>
                        <TableCell sx={{ fontWeight: 600 }}>{officer.displayName}</TableCell>
                        <TableCell>{officer.email}</TableCell>
                        <TableCell>{officer.department || <em style={{ opacity: 0.5 }}>Not set</em>}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                          {new Date(officer.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckCheck size={14} />}
                            onClick={() => handleApproveOfficer(officer.uid)}
                            sx={{
                              bgcolor: '#16a34a',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRadius: 2,
                              '&:hover': { bgcolor: '#15803d' },
                            }}
                          >
                            Approve Account
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Administration panels */}
        <Grid container spacing={4}>
          {/* User management */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                User Credentials Management
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>City</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Ward</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Points</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.filter((row) => row.role !== 'admin').map((row) => (
                        <TableRow key={row.uid}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {row.displayName || <span style={{ color: '#94a3b8' }}>—</span>}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem' }}>
                            {row.email?.trim()
                              ? row.email.trim()
                              : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>not on file</span>}
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              size="small"
                              value={row.role}
                              onChange={(e) => handleUpdateRole(row.uid, e.target.value as UserRole)}
                              sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                              <MenuItem value="citizen">Citizen</MenuItem>
                              <MenuItem value="officer">Officer</MenuItem>
                              <MenuItem value="admin">Admin</MenuItem>
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {row.city || <span style={{ color: '#94a3b8' }}>—</span>}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row.ward || <span style={{ color: '#94a3b8' }}>—</span>}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {row.department ? (
                              <Chip label={row.department} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                            ) : (
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: row.role === 'citizen' ? 700 : 400 }}>
                              {row.role === 'citizen'
                                ? (row.pointsEarned ?? 0)
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteUser(row.uid)}
                              disabled={row.uid === user?.uid}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Grid>

          {/* Department setup */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                Department Assignments
              </Typography>
              <List>
                <ListItem sx={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: 3, mb: 2 }}>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        Roads & Public Works
                      </Typography>
                    }
                    secondary="Assigned Category: Road Damage, Street Light"
                  />
                  <Chip label="2 Officers" size="small" />
                </ListItem>
                <ListItem sx={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: 3, mb: 2 }}>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        Sanitation Department
                      </Typography>
                    }
                    secondary="Assigned Category: Garbage"
                  />
                  <Chip label="1 Officer" size="small" />
                </ListItem>
                <ListItem sx={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: 3, mb: 2 }}>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        Water & Power
                      </Typography>
                    }
                    secondary="Assigned Category: Water Leakage, Electricity"
                  />
                  <Chip label="1 Officer" size="small" />
                </ListItem>
              </List>
            </Card>
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </Box>
  );
};
