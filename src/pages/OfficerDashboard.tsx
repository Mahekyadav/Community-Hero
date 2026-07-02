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
  List,
  ListItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  MenuItem,
} from '@mui/material';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import {
  CheckCircle,
  Clock,
  Sparkles,
  Bot,
  Search,
  TrendingUp,
  ClipboardList,
  PlayCircle,
  CheckCircle2,
  BadgeCheck,
  User,
  Archive,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Issue, IssuePriority } from '../types';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { MapContainer } from '../components/MapContainer';

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export const OfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Tab + filter state
  const [activeTab, setActiveTab] = useState<'queue' | 'archives'>('queue');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'priority'>('newest');

  // Modal state
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [beginningId, setBeginningId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'issues')),
      (snapshot) => {
        const data: Issue[] = [];
        snapshot.forEach((d) => data.push(d.data() as Issue));
        setIssues(data);
        setLoadingIssues(false);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'issues')
    );
    return () => unsubscribe();
  }, []);

  // Officer must have city + ward + department set for direct assignment to work.
  const profileComplete = Boolean(
    userProfile?.city && userProfile?.ward && userProfile?.department
  );

  // Direct-assignment queue: issues in this officer's city ∩ ward ∩ department, non-resolved.
  const myQueue = profileComplete
    ? issues.filter(
        (issue) =>
          issue.category === userProfile!.department &&
          issue.ward === userProfile!.ward &&
          (issue.city ?? '').toLowerCase().trim() ===
            (userProfile!.city ?? '').toLowerCase().trim() &&
          issue.status !== 'Resolved' &&
          issue.status !== 'Closed'
      )
    : [];

  // Archives: issues this officer resolved, newest first.
  const resolvedByMe = issues
    .filter(
      (i) =>
        i.assignedOfficerId === user?.uid &&
        (i.status === 'Resolved' || i.status === 'Closed')
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Apply search, priority filter, and sort to active queue.
  const applyFilters = (list: Issue[]): Issue[] => {
    let out = searchTerm
      ? list.filter((i) => {
          const t = searchTerm.toLowerCase();
          return (
            i.title.toLowerCase().includes(t) ||
            i.description.toLowerCase().includes(t) ||
            i.address.toLowerCase().includes(t)
          );
        })
      : list;

    if (filterPriority) {
      out = out.filter((i) => i.priority === filterPriority);
    }

    if (sortOrder === 'oldest') {
      out = [...out].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sortOrder === 'priority') {
      out = [...out].sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
      );
    } else {
      // newest first (default)
      out = [...out].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return out;
  };

  const filteredQueue = applyFilters(myQueue);

  // Personal stats (live — driven by onSnapshot).
  const inProgressByMe = issues.filter(
    (i) => i.assignedOfficerId === user?.uid && i.status === 'In Progress'
  );
  const myResolutionRate =
    resolvedByMe.length + myQueue.length > 0
      ? Math.round((resolvedByMe.length / (resolvedByMe.length + myQueue.length)) * 100)
      : 0;

  // Category breakdown for the sidebar.
  const categoryBreakdown = myQueue.reduce(
    (acc: Record<string, number>, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    },
    {}
  );

  // ── Step 1: Begin Resolution → "In Progress" ──────────────────────────────
  const handleBeginResolution = async (issue: Issue) => {
    if (!user || !userProfile) return;
    setBeginningId(issue.id);
    try {
      await updateDoc(doc(db, 'issues', issue.id), {
        status: 'In Progress',
        assignedOfficerId: user.uid,
        assignedOfficerName: userProfile.displayName,
        updatedAt: new Date().toISOString(),
      });
      const notifId = `notif_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: issue.createdBy,
        title: 'Officer Has Begun Resolving Your Report',
        message: `Municipal officer ${userProfile.displayName} has started working on your report: "${issue.title}".`,
        read: false,
        relatedIssueId: issue.id,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${issue.id}`);
    } finally {
      setBeginningId(null);
    }
  };

  // Optional: Generate AI public summary.
  const handleGenerateAISummary = async () => {
    if (!selectedIssue || !resolutionDescription.trim()) return;
    setSummarizing(true);
    try {
      const res = await fetch('/api/resolution-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueTitle: selectedIssue.title,
          issueDesc: selectedIssue.description,
          resolutionDetails: resolutionDescription,
        }),
      });
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      setAiSummary(data.summary);
    } catch {
      setAiSummary(`Resolution Completed: ${resolutionDescription}`);
    } finally {
      setSummarizing(false);
    }
  };

  // ── Step 2: Mark as Resolved — atomic batch write ─────────────────────────
  const handleMarkResolved = async () => {
    if (!selectedIssue || !resolutionDescription.trim() || !user || !userProfile) return;
    setSubmitting(true);
    try {
      const publicSummary = aiSummary.trim() || resolutionDescription.trim();
      const now = new Date().toISOString();
      const notifId = `notif_${Date.now()}`;
      const ptsId = `notif_pts_${Date.now() + 1}`;

      const batch = writeBatch(db);

      // 1. Resolve the issue.
      batch.update(doc(db, 'issues', selectedIssue.id), {
        status: 'Resolved',
        resolutionDescription: resolutionDescription.trim(),
        assignedOfficerId: user.uid,
        assignedOfficerName: userProfile.displayName,
        updatedAt: now,
        aiAnalysis: {
          ...selectedIssue.aiAnalysis,
          resolutionSummary: publicSummary,
        },
      });

      // 2. Award +10 points to the citizen — atomic with the issue update.
      batch.update(doc(db, 'users', selectedIssue.createdBy), {
        pointsEarned: increment(10),
      });

      // 3. Resolution notification for the citizen.
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: selectedIssue.createdBy,
        title: 'Your Issue Has Been Resolved!',
        message: `Officer ${userProfile.displayName} resolved your report "${selectedIssue.title}". ${publicSummary}`,
        read: false,
        relatedIssueId: selectedIssue.id,
        createdAt: now,
      });

      // 4. Points notification for the citizen.
      batch.set(doc(db, 'notifications', ptsId), {
        id: ptsId,
        userId: selectedIssue.createdBy,
        title: '+10 Points Earned!',
        message: `Your issue "${selectedIssue.title}" was resolved — you earned 10 points!`,
        read: false,
        relatedIssueId: selectedIssue.id,
        createdAt: now,
      });

      await batch.commit();

      setSelectedIssue(null);
      setResolutionDescription('');
      setAiSummary('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${selectedIssue.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColor = (p: IssuePriority) =>
    p === 'Critical' ? 'error' : p === 'High' ? 'warning' : 'default';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Navbar />

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif' }}
            >
              Municipal Operations Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profileComplete
                ? `Direct assignments for ${userProfile!.city} · ${userProfile!.ward} · ${userProfile!.department}`
                : 'Complete your profile to receive direct issue assignments'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<User size={14} />}
            onClick={() => navigate('/officer/profile')}
            sx={{ fontWeight: 700, borderRadius: 3 }}
          >
            Edit Profile
          </Button>
        </Box>

        {/* Profile incomplete warning */}
        {!profileComplete && (
          <Alert
            severity="warning"
            sx={{ mb: 3, borderRadius: 3 }}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={() => navigate('/officer/profile')}
              >
                Complete Profile
              </Button>
            }
          >
            Set your <strong>City</strong>, <strong>Ward</strong>, and{' '}
            <strong>Department</strong> in your profile to receive direct issue assignments.
          </Alert>
        )}

        {/* Stats Row — live-updated via onSnapshot */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(234,179,8,0.04)' }}>
              <CardContent
                sx={{
                  p: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    My Queue
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, mt: 0.5, color: '#b45309' }}
                  >
                    {myQueue.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#d97706', width: 44, height: 44 }}>
                  <ClipboardList size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(37,99,235,0.04)' }}>
              <CardContent
                sx={{
                  p: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    In Progress
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}
                  >
                    {inProgressByMe.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
                  <Clock size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(34,197,94,0.04)' }}>
              <CardContent
                sx={{
                  p: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Resolved by Me
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}
                  >
                    {resolvedByMe.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 44, height: 44 }}>
                  <CheckCircle size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(139,92,246,0.04)' }}>
              <CardContent
                sx={{
                  p: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Resolution Rate
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, mt: 0.5, color: '#8B5CF6' }}
                  >
                    {myResolutionRate}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#8B5CF6', width: 44, height: 44 }}>
                  <TrendingUp size={22} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main content: Queue + Sidebar */}
        <Grid container spacing={4}>
          {/* Issue Queue / Archives panel */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ p: { xs: 2, md: 3 } }}>
              {/* Panel header: title + tabs + search */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2.5,
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  {/* Tab toggle */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant={activeTab === 'queue' ? 'contained' : 'outlined'}
                      startIcon={<ClipboardList size={14} />}
                      onClick={() => setActiveTab('queue')}
                      sx={{ borderRadius: 3, fontWeight: 700, fontSize: '0.78rem' }}
                    >
                      Active Queue ({myQueue.length})
                    </Button>
                    <Button
                      size="small"
                      variant={activeTab === 'archives' ? 'contained' : 'outlined'}
                      startIcon={<Archive size={14} />}
                      color={activeTab === 'archives' ? 'success' : 'inherit'}
                      onClick={() => setActiveTab('archives')}
                      sx={{ borderRadius: 3, fontWeight: 700, fontSize: '0.78rem' }}
                    >
                      Resolution Archives ({resolvedByMe.length})
                    </Button>
                  </Box>

                  {/* Jurisdiction chips (queue tab only) */}
                  {activeTab === 'queue' && profileComplete && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={userProfile!.city!}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(37,99,235,0.08)',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                      <Chip
                        label={userProfile!.ward!}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(37,99,235,0.08)',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                      <Chip
                        label={userProfile!.department!}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(37,99,235,0.08)',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Search (queue tab only) */}
                {activeTab === 'queue' && (
                  <TextField
                    placeholder="Search issues…"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Search size={16} style={{ marginRight: 4, color: '#94a3b8' }} />
                        ),
                      },
                    }}
                    sx={{
                      width: { xs: '100%', sm: 200 },
                      '& .MuiOutlinedInput-root': { borderRadius: 3 },
                    }}
                  />
                )}
              </Box>

              {/* Filter toolbar — active queue only */}
              {activeTab === 'queue' && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                    mb: 2.5,
                    pb: 2.5,
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <TextField
                    select
                    label="Priority"
                    size="small"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    sx={{ width: 150, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    <MenuItem value="Critical">Critical</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="Sort By"
                    size="small"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as typeof sortOrder)
                    }
                    sx={{ width: 185, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  >
                    <MenuItem value="newest">Newest First</MenuItem>
                    <MenuItem value="oldest">Oldest First</MenuItem>
                    <MenuItem value="priority">Priority: High → Low</MenuItem>
                  </TextField>
                </Box>
              )}

              {/* ── Active Queue content ──────────────────────────────────── */}
              {activeTab === 'queue' && (
                <>
                  {loadingIssues ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                      <CircularProgress />
                    </Box>
                  ) : filteredQueue.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {!profileComplete
                          ? 'Complete your profile to see assigned issues.'
                          : filterPriority
                          ? `No ${filterPriority}-priority issues in your queue.`
                          : 'No active issues match your assignment criteria.'}
                      </Typography>
                      {profileComplete && !filterPriority && (
                        <Typography variant="caption" color="text.secondary">
                          Issues will appear here when citizens report problems in{' '}
                          <strong>{userProfile!.city}</strong> /{' '}
                          <strong>{userProfile!.ward}</strong> under category{' '}
                          <strong>"{userProfile!.department}"</strong>.
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <List
                      disablePadding
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
                    >
                      {filteredQueue.map((issue) => {
                        const isInProgressByMe =
                          issue.status === 'In Progress' &&
                          issue.assignedOfficerId === user?.uid;
                        const isInProgressByOther =
                          issue.status === 'In Progress' &&
                          Boolean(issue.assignedOfficerId) &&
                          issue.assignedOfficerId !== user?.uid;
                        const isBeginning = beginningId === issue.id;

                        return (
                          <ListItem
                            key={issue.id}
                            disablePadding
                            sx={{
                              display: 'block',
                              p: 2,
                              borderRadius: 3,
                              border: '1px solid',
                              borderColor: isInProgressByMe
                                ? 'rgba(37,99,235,0.25)'
                                : 'rgba(0,0,0,0.07)',
                              bgcolor: isInProgressByMe
                                ? 'rgba(37,99,235,0.03)'
                                : 'transparent',
                            }}
                          >
                            {/* Badge row */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                              <Chip
                                label="Directly Assigned"
                                size="small"
                                icon={<BadgeCheck size={11} />}
                                sx={{
                                  bgcolor: 'rgba(234,179,8,0.12)',
                                  color: '#92400e',
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  height: 22,
                                }}
                              />
                              <Chip
                                label={issue.category}
                                size="small"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                              />
                              <Chip
                                label={issue.status}
                                size="small"
                                variant="outlined"
                                color={isInProgressByMe ? 'primary' : 'default'}
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                              <Chip
                                label={issue.priority}
                                size="small"
                                color={
                                  priorityColor(issue.priority) as
                                    | 'error'
                                    | 'warning'
                                    | 'default'
                                }
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                              />
                            </Box>

                            {/* Title — clamp to 2 lines */}
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 800,
                                mb: 0.5,
                                display: '-webkit-box',
                                overflow: 'hidden',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {issue.title}
                            </Typography>

                            {/* Meta */}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.8rem',
                                mb: 0.5,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              📍 {issue.address}
                            </Typography>

                            <Box
                              sx={{
                                display: 'flex',
                                gap: 2,
                                flexWrap: 'wrap',
                                mb: 1.5,
                              }}
                            >
                              {issue.city && (
                                <Typography variant="caption" color="text.secondary">
                                  🏙️ {issue.city}
                                </Typography>
                              )}
                              {issue.ward && (
                                <Typography variant="caption" color="text.secondary">
                                  📌 {issue.ward}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                By: <strong>{issue.creatorName}</strong>
                              </Typography>
                              {isInProgressByMe && (
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'primary.main', fontWeight: 700 }}
                                >
                                  ✓ You are the handling officer
                                </Typography>
                              )}
                              {isInProgressByOther && (
                                <Typography variant="caption" color="text.secondary">
                                  Officer: <strong>{issue.assignedOfficerName}</strong>
                                </Typography>
                              )}
                            </Box>

                            {/* Action */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {isInProgressByMe ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircle2 size={14} />}
                                  sx={{ minHeight: 40 }}
                                  onClick={() => {
                                    setSelectedIssue(issue);
                                    setResolutionDescription('');
                                    setAiSummary('');
                                  }}
                                >
                                  Submit Resolution
                                </Button>
                              ) : isInProgressByOther ? null : (
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={isBeginning}
                                  sx={{ minHeight: 40 }}
                                  startIcon={
                                    isBeginning ? (
                                      <CircularProgress size={12} color="inherit" />
                                    ) : (
                                      <PlayCircle size={14} />
                                    )
                                  }
                                  onClick={() => handleBeginResolution(issue)}
                                >
                                  Begin Resolution
                                </Button>
                              )}
                            </Box>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </>
              )}

              {/* ── Resolution Archives content ───────────────────────────── */}
              {activeTab === 'archives' && (
                <>
                  {loadingIssues ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                      <CircularProgress />
                    </Box>
                  ) : resolvedByMe.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Archive size={32} color="#94a3b8" />
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mt: 1.5 }}
                      >
                        No resolved issues yet.
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Issues you resolve will appear here as a permanent record.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {resolvedByMe.map((issue) => (
                        <Box
                          key={issue.id}
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            border: '1px solid rgba(34,197,94,0.2)',
                            bgcolor: 'rgba(34,197,94,0.02)',
                          }}
                        >
                          {/* Title row */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 1,
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 800,
                                lineHeight: 1.3,
                                flex: 1,
                                display: '-webkit-box',
                                overflow: 'hidden',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {issue.title}
                            </Typography>
                            <Chip
                              label="Resolved"
                              size="small"
                              color="success"
                              sx={{ fontSize: '0.65rem', height: 20, flexShrink: 0 }}
                            />
                          </Box>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: '0.78rem',
                              mb: 0.75,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            📍 {issue.address}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Chip
                              label={issue.category}
                              size="small"
                              sx={{ fontSize: '0.65rem', height: 18 }}
                            />
                            <Chip
                              label={issue.priority}
                              size="small"
                              color={
                                priorityColor(issue.priority) as
                                  | 'error'
                                  | 'warning'
                                  | 'default'
                              }
                              sx={{ fontSize: '0.65rem', height: 18 }}
                            />
                            {issue.city && (
                              <Chip
                                label={`🏙️ ${issue.city}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 18 }}
                              />
                            )}
                          </Box>

                          {issue.resolutionDescription && (
                            <Box
                              sx={{
                                p: 1.5,
                                bgcolor: 'rgba(0,0,0,0.03)',
                                borderRadius: 2,
                                mb: 0.75,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  display: 'block',
                                  mb: 0.3,
                                  color: 'text.secondary',
                                }}
                              >
                                Resolution Notes
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: '0.78rem',
                                  color: 'text.secondary',
                                  display: '-webkit-box',
                                  overflow: 'hidden',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {issue.resolutionDescription}
                              </Typography>
                            </Box>
                          )}

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: '0.65rem' }}
                          >
                            Resolved:{' '}
                            {new Date(issue.updatedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </>
              )}
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card sx={{ height: 300, overflow: 'hidden' }}>
                <MapContainer issues={myQueue} />
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2.5 }}>
                    Queue Breakdown
                  </Typography>
                  {myQueue.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: 'center', py: 2 }}
                    >
                      No issues in queue yet.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Object.entries(categoryBreakdown).map(([cat, count]) => {
                        const pct = Math.round((count / myQueue.length) * 100);
                        return (
                          <Box key={cat}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.8rem', fontWeight: 600 }}
                              >
                                {cat}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.8rem', fontWeight: 700 }}
                                color="primary"
                              >
                                {count}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                width: '100%',
                                height: 8,
                                bgcolor: '#F1F5F9',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  bgcolor: 'primary.main',
                                  borderRadius: 4,
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ── Submit Resolution Modal ──────────────────────────────────────────── */}
      <Dialog
        open={Boolean(selectedIssue)}
        onClose={() => {
          setSelectedIssue(null);
          setResolutionDescription('');
          setAiSummary('');
        }}
        maxWidth="sm"
        fullWidth
      >
        {selectedIssue && (
          <>
            <DialogTitle
              sx={{ fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif' }}
            >
              Submit Resolution
            </DialogTitle>

            <DialogContent
              sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}
            >
              {/* Issue summary */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#F8FAFC',
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {selectedIssue.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: '0.8rem', mt: 0.5 }}
                >
                  📍 {selectedIssue.address}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={selectedIssue.category}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 18 }}
                  />
                  <Chip
                    label={selectedIssue.priority}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 18 }}
                  />
                </Box>
              </Box>

              {/* Resolution textarea */}
              <TextField
                label="Resolution Description / Notes"
                fullWidth
                multiline
                rows={4}
                required
                value={resolutionDescription}
                onChange={(e) => setResolutionDescription(e.target.value)}
                placeholder="Describe repairs completed, materials used, crew deployed, etc."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />

              {/* Optional AI public summary */}
              <Button
                size="small"
                variant="outlined"
                disabled={!resolutionDescription.trim() || summarizing}
                onClick={handleGenerateAISummary}
                startIcon={<Bot size={14} />}
                sx={{ alignSelf: 'flex-start' }}
              >
                {summarizing ? (
                  <CircularProgress size={14} />
                ) : (
                  'Generate AI Public Summary (Optional)'
                )}
              </Button>

              {aiSummary && (
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(37,99,235,0.03)',
                    border: '1px solid rgba(37,99,235,0.1)',
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Sparkles size={14} style={{ color: '#2563eb' }} />
                    AI Public Update (editable)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={aiSummary}
                    onChange={(e) => setAiSummary(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      '& .MuiOutlinedInput-root': { borderRadius: 3 },
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Citizens will see this message. Issue reporter receives{' '}
                    <strong>+10 Points</strong>.
                  </Typography>
                </Paper>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 3, gap: 1 }}>
              <Button
                onClick={() => {
                  setSelectedIssue(null);
                  setResolutionDescription('');
                  setAiSummary('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={!resolutionDescription.trim() || submitting}
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )
                }
                onClick={handleMarkResolved}
              >
                Mark as Resolved
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Footer />
    </Box>
  );
};
