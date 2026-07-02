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
  ListItemAvatar,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Badge,
  Paper,
  Grid,
} from '@mui/material';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  addDoc,
  arrayUnion,
  getDocs,
} from 'firebase/firestore';
import {
  FileText,
  CheckCircle,
  Clock,
  Award,
  Plus,
  Map as MapIcon,
  MessageSquare,
  ThumbsUp,
  Sparkles,
  Bot,
  Bell,
  Trash2,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Issue, Notification, UserProfile, Comment, IssueStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { IssueCard } from '../components/IssueCard';
import { MapContainer } from '../components/MapContainer';
import { AIChatAssistant } from '../components/AIChatAssistant';

export const CitizenDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, addHeroPoints, awardBadge } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Viewing Issue Details
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isVerifyComment, setIsVerifyComment] = useState(false);

  // Fetch collections
  useEffect(() => {
    if (!user) return;

    // 1. Fetch Issues
    const issuesQuery = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribeIssues = onSnapshot(
      issuesQuery,
      (snapshot) => {
        const issuesData: Issue[] = [];
        snapshot.forEach((doc) => {
          issuesData.push(doc.data() as Issue);
        });
        setIssues(issuesData);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'issues')
    );

    // 2. Fetch User Notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifData: Notification[] = [];
        snapshot.forEach((doc) => {
          notifData.push(doc.data() as Notification);
        });
        setNotifications(notifData);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'notifications')
    );

    // 3. Fetch Leaderboard (top users by heroPoints)
    const leaderboardQuery = query(
      collection(db, 'users'),
      where('role', '==', 'citizen'),
      orderBy('heroPoints', 'desc')
    );
    getDocs(leaderboardQuery)
      .then((snapshot) => {
        const leaderboardData: UserProfile[] = [];
        snapshot.forEach((doc) => {
          leaderboardData.push(doc.data() as UserProfile);
        });
        setLeaderboard(leaderboardData.slice(0, 5));
      })
      .catch((err) => handleFirestoreError(err, OperationType.GET, 'users/leaderboard'));

    return () => {
      unsubscribeIssues();
      unsubscribeNotifications();
    };
  }, [user]);

  // Fetch comments for selected issue
  useEffect(() => {
    if (!selectedIssue) return;

    const commentsQuery = query(
      collection(db, `issues/${selectedIssue.id}/comments`),
      orderBy('createdAt', 'asc')
    );
    const unsubscribeComments = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const commentsData: Comment[] = [];
        snapshot.forEach((doc) => {
          commentsData.push(doc.data() as Comment);
        });
        setComments(commentsData);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `issues/${selectedIssue.id}/comments`)
    );

    return () => unsubscribeComments();
  }, [selectedIssue]);

  // Statistics calculations
  const myReports = issues.filter((i) => i.createdBy === user?.uid);
  const totalReportsCount = myReports.length;
  const resolvedReportsCount = myReports.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;
  const pendingReportsCount = myReports.filter((i) => i.status === 'Pending').length;

  // Upvote Action
  const handleUpvote = async (issueId: string) => {
    if (!user) return;
    const issueRef = doc(db, 'issues', issueId);
    try {
      await updateDoc(issueRef, {
        upvotesCount: increment(1),
        upvotedBy: arrayUnion(user.uid),
        confidenceScore: increment(5),
        updatedAt: new Date().toISOString(),
      });
      await addHeroPoints(10, 'Upvoted local civic issue report');
      await awardBadge('Road Guardian');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${issueId}/upvote`);
    }
  };

  // Verify Action
  const handleVerify = async (issueId: string) => {
    if (!user) return;
    const issueRef = doc(db, 'issues', issueId);
    try {
      await updateDoc(issueRef, {
        verificationsCount: increment(1),
        verifiedBy: arrayUnion(user.uid),
        confidenceScore: increment(15),
        status: 'Verified',
        updatedAt: new Date().toISOString(),
      });
      await addHeroPoints(15, 'Community-verified a reported issue');
      await awardBadge('Community Hero');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${issueId}/verify`);
    }
  };

  // Submit Comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedIssue || !newComment.trim()) return;

    const commentId = `comment_${Date.now()}`;
    const commentData: Comment = {
      id: commentId,
      issueId: selectedIssue.id,
      userId: user.uid,
      userName: userProfile?.displayName || 'Anonymous Hero',
      userRole: userProfile?.role || 'citizen',
      content: newComment,
      isVerification: isVerifyComment,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, `issues/${selectedIssue.id}/comments`), commentData);

      // Award Points for helpful comment
      await addHeroPoints(5, 'Shared feedback on reported civic issue');

      // If they marked it as verification, also trigger verify logic
      if (isVerifyComment && !selectedIssue.verifiedBy?.includes(user.uid)) {
        await handleVerify(selectedIssue.id);
      }

      setNewComment('');
      setIsVerifyComment(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `issues/${selectedIssue.id}/comments`);
    }
  };

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    notifications.forEach(async (notif) => {
      if (!notif.read) {
        try {
          await updateDoc(doc(db, 'notifications', notif.id), { read: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notifications/${notif.id}`);
        }
      }
    });
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Navbar />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Welcome Block */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif' }}>
              Welcome Back, {userProfile?.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Help make your community better. Track reports, earn points, and assist municipal authorities.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate('/report')}
              sx={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                fontWeight: 700,
                boxShadow: '0px 8px 20px rgba(37, 99, 235, 0.2)',
              }}
            >
              Report Civic Issue
            </Button>
          </Box>
        </Box>

        {/* Bento Stat Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(37,99,235,0.04)', borderColor: 'rgba(37,99,235,0.1)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', p: 3 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>My Reports</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>{totalReportsCount}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  <FileText size={24} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.1)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', p: 3 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Resolved</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>{resolvedReportsCount}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                  <CheckCircle size={24} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.1)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', p: 3 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Pending Approval</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main', mt: 0.5 }}>{pendingReportsCount}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                  <Clock size={24} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'rgba(139,92,246,0.04)', borderColor: 'rgba(139,92,246,0.1)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', p: 3 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Hero Points Earned</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'purple.700', mt: 0.5 }}>{userProfile?.heroPoints || 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
                  <Award size={24} />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Map view section */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <MapContainer
              issues={issues}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
              allowLocationSelection={false}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {/* Notifications and Leaderboard */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
              
              {/* Leaderboard */}
              <Card sx={{ flexGrow: 1 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Award size={20} className="text-amber-500" />
                    Top Contributors
                  </Typography>
                  <List disablePadding>
                    {leaderboard.map((player, index) => (
                      <React.Fragment key={player.uid}>
                        <ListItem sx={{ px: 0, py: 1 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>
                              {index + 1}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                {player.displayName}
                              </Typography>
                            }
                            secondary={
                              <Typography color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {player.heroPoints || 0} Hero Points
                              </Typography>
                            }
                          />
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {player.badges?.slice(0, 2).map((b) => (
                              <Chip key={b} label={b.split(' ')[0]} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                            ))}
                          </Box>
                        </ListItem>
                        {index < leaderboard.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card sx={{ flexGrow: 1, maxHeight: '200px', overflowY: 'auto' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Bell size={18} />
                      Notifications
                    </Typography>
                    {unreadNotificationsCount > 0 && (
                      <Button size="small" onClick={handleMarkNotificationsRead} sx={{ fontSize: '0.7rem' }}>
                        Mark read
                      </Button>
                    )}
                  </Box>
                  <List disablePadding>
                    {notifications.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No new updates.
                      </Typography>
                    ) : (
                      notifications.map((notif) => (
                        <Box key={notif.id} sx={{ mb: 1, p: 1, borderRadius: 2, bgcolor: notif.read ? 'transparent' : 'rgba(37,99,235,0.05)', border: '1px solid rgba(0,0,0,0.03)' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{notif.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{notif.message}</Typography>
                        </Box>
                      ))
                    )}
                  </List>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Complaints List Grid */}
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, fontFamily: '"Space Grotesk", sans-serif' }}>
          Recent Community Reports
        </Typography>

        <Grid container spacing={3}>
          {issues.slice(0, 6).map((issue) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={issue.id}>
              <IssueCard
                issue={issue}
                onViewDetails={(issue) => setSelectedIssue(issue)}
                onUpvote={handleUpvote}
                onVerify={handleVerify}
                currentUserId={user?.uid}
              />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Floating AI Chat Assistant */}
      <AIChatAssistant nearbyIssues={issues} isFloating={true} />

      {/* ISSUE DETAILS DIALOG MODAL */}
      <Dialog
        open={Boolean(selectedIssue)}
        onClose={() => setSelectedIssue(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        {selectedIssue && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: '"Space Grotesk", sans-serif' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={selectedIssue.category} size="small" sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 700 }} />
                <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
                  {selectedIssue.title}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedIssue(null)}>
                <X size={20} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  {selectedIssue.imageUrl && (
                    <Box
                      component="img"
                      src={selectedIssue.imageUrl}
                      alt={selectedIssue.title}
                      sx={{ width: '100%', height: 260, borderRadius: 4, objectFit: 'cover', mb: 2 }}
                    />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
                    {selectedIssue.description}
                  </Typography>

                  {/* AI Metadata suggestions */}
                  {selectedIssue.aiAnalysis && (
                    <Paper sx={{ p: 2, bg: 'rgba(244,244,244,0.5)', borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Bot size={16} className="text-blue-600" />
                        AI Analysis Findings
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
                        <strong>Suggested Department:</strong> {selectedIssue.aiAnalysis.suggestedDepartment || 'N/A'}
                      </Typography>
                      {selectedIssue.aiAnalysis.resolutionSummary && (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          <strong>Resolution Summary:</strong> {selectedIssue.aiAnalysis.resolutionSummary}
                        </Typography>
                      )}
                    </Paper>
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  {/* Commet List */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Community Verification & Comments
                  </Typography>

                  <Box sx={{ maxHeight: 250, overflowY: 'auto', mb: 2, pr: 1 }}>
                    {comments.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No feedback yet. Be the first to verify or comment!
                      </Typography>
                    ) : (
                      comments.map((comment) => (
                        <Paper key={comment.id} sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{comment.userName}</Typography>
                              <Chip label={comment.userRole.toUpperCase()} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700 }} />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontSize: '0.825rem' }}>{comment.content}</Typography>
                          {comment.isVerification && (
                            <Chip label="Verified Location Accuracy" color="success" size="small" sx={{ mt: 1, height: 16, fontSize: '0.6rem' }} />
                          )}
                        </Paper>
                      ))
                    )}
                  </Box>

                  {/* Add Comment Form */}
                  <Box component="form" onSubmit={handleCommentSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      label="Add helper feedback or verification detail"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="e.g. This is fully accurate, I live nearby..."
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        size="small"
                        color={isVerifyComment ? 'secondary' : 'inherit'}
                        onClick={() => setIsVerifyComment(!isVerifyComment)}
                        startIcon={<CheckCircle size={14} />}
                      >
                        {isVerifyComment ? 'Verification Active' : 'Mark as Verification'}
                      </Button>
                      <Button type="submit" variant="contained" size="small" disabled={!newComment.trim()}>
                        Post Feedback
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      <Footer />
    </Box>
  );
};
