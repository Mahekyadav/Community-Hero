import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Container,
  Chip,
  Badge,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import { ShieldAlert, Award, LogOut, LayoutDashboard, FileSpreadsheet, Bell, UserCog } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types';

export const Navbar: React.FC<{ onScrollTo?: (sectionId: string) => void }> = ({
  onScrollTo,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Real-time notification stream for the signed-in user.
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Notification[] = snap.docs.map((d) => d.data() as Notification);
        // Sort newest-first client-side (avoids requiring a composite Firestore index).
        data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(data.slice(0, 20));
      },
      () => {
        /* notification errors are non-critical — silently ignore */
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (notif: Notification) => {
    if (notif.read) return;
    await updateDoc(doc(db, 'notifications', notif.id), { read: true });
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
    );
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/');
  };

  const isLandingPage = location.pathname === '/';

  const handleNavClick = (sectionId: string) => {
    if (isLandingPage && onScrollTo) {
      onScrollTo(sectionId);
    } else {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  const dashboardPath =
    userProfile?.role === 'admin'
      ? '/admin'
      : userProfile?.role === 'officer'
      ? '/officer'
      : '/dashboard';

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: '70px' }}>
          {/* Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <ShieldAlert size={22} />
            </Box>
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.5px',
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Community <span className="text-blue-600">Hero</span>
            </Typography>
          </Box>

          {/* Center Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <Button
              color="inherit"
              onClick={() => navigate('/')}
              sx={{ color: 'text.secondary', px: 2 }}
            >
              Home
            </Button>
            <Button
              color="inherit"
              onClick={() => handleNavClick('features')}
              sx={{ color: 'text.secondary', px: 2 }}
            >
              Features
            </Button>
            <Button
              color="inherit"
              onClick={() => handleNavClick('how-it-works')}
              sx={{ color: 'text.secondary', px: 2 }}
            >
              How It Works
            </Button>
            <Button
              color="inherit"
              onClick={() => handleNavClick('about')}
              sx={{ color: 'text.secondary', px: 2 }}
            >
              About
            </Button>
          </Box>

          {/* Right Side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user && userProfile ? (
              <>
                {/* Points chip — citizens only */}
                {userProfile.role === 'citizen' && (
                  <Chip
                    icon={<Award size={16} className="text-amber-500" />}
                    label={`${userProfile.heroPoints || 0} pts`}
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      background: 'rgba(245, 158, 11, 0.05)',
                      display: { xs: 'none', sm: 'flex' },
                    }}
                  />
                )}

                {/* Dashboard shortcut */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LayoutDashboard size={16} />}
                  onClick={() => navigate(dashboardPath)}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Dashboard
                </Button>

                {/* Notification Bell */}
                <IconButton
                  color="inherit"
                  aria-label="notifications"
                  onClick={(e) => setNotifAnchor(e.currentTarget)}
                >
                  <Badge badgeContent={unreadCount || 0} color="error">
                    <Bell size={20} />
                  </Badge>
                </IconButton>

                {/* Notification Popover */}
                <Popover
                  open={Boolean(notifAnchor)}
                  anchorEl={notifAnchor}
                  onClose={() => setNotifAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{
                    paper: {
                      sx: {
                        width: 360,
                        maxHeight: 480,
                        borderRadius: 3,
                        boxShadow: '0px 10px 30px rgba(15,23,42,0.12)',
                        border: '1px solid rgba(226,232,240,0.8)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      },
                    },
                  }}
                >
                  {/* Popover Header */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(226,232,240,0.8)',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      Notifications
                      {unreadCount > 0 && (
                        <Box
                          component="span"
                          sx={{
                            px: 0.8,
                            py: 0.1,
                            bgcolor: 'error.main',
                            color: 'white',
                            borderRadius: 10,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          {unreadCount} new
                        </Box>
                      )}
                    </Typography>
                    {unreadCount > 0 && (
                      <Button
                        size="small"
                        onClick={handleMarkAllRead}
                        sx={{ fontSize: '0.72rem', py: 0.3, minHeight: 'unset' }}
                      >
                        Mark all read
                      </Button>
                    )}
                  </Box>

                  {/* Scrollable notification list */}
                  <Box sx={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Bell size={28} color="#94a3b8" />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1.5, fontSize: '0.82rem' }}
                        >
                          No notifications yet
                        </Typography>
                      </Box>
                    ) : (
                      <List disablePadding>
                        {notifications.map((notif, idx) => (
                          <React.Fragment key={notif.id}>
                            <ListItemButton
                              onClick={() => handleMarkRead(notif)}
                              sx={{
                                px: 2,
                                py: 1.5,
                                alignItems: 'flex-start',
                                bgcolor: notif.read ? 'transparent' : 'rgba(37,99,235,0.04)',
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: notif.read ? 500 : 700,
                                      fontSize: '0.82rem',
                                      lineHeight: 1.3,
                                      mb: 0.3,
                                      pr: 1,
                                    }}
                                  >
                                    {notif.title}
                                  </Typography>
                                }
                                secondary={
                                  <>
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{
                                        fontSize: '0.75rem',
                                        display: '-webkit-box',
                                        overflow: 'hidden',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                      }}
                                    >
                                      {notif.message}
                                    </Typography>
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: '0.65rem', mt: 0.3, display: 'block' }}
                                    >
                                      {new Date(notif.createdAt).toLocaleString()}
                                    </Typography>
                                  </>
                                }
                                disableTypography={false}
                              />
                              {!notif.read && (
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    mt: 0.8,
                                    ml: 1,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </ListItemButton>
                            {idx < notifications.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                </Popover>

                {/* Profile Avatar + Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
                    <Avatar
                      alt={userProfile.displayName ?? ''}
                      src={user.photoURL || ''}
                      sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}
                    >
                      {(userProfile.displayName ?? userProfile.email ?? '?')
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                  </IconButton>

                  <Menu
                    id="profile-menu"
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1.5,
                          width: 220,
                          boxShadow: '0px 10px 25px rgba(15, 23, 42, 0.08)',
                          borderRadius: 3,
                          border: '1px solid rgba(226, 232, 240, 0.8)',
                        },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                        {userProfile.displayName ?? userProfile.email ?? 'User'}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {userProfile.email}
                      </Typography>
                      <Chip
                        label={(userProfile.role ?? 'user').toUpperCase()}
                        size="small"
                        color={
                          userProfile.role === 'admin'
                            ? 'error'
                            : userProfile.role === 'officer'
                            ? 'secondary'
                            : 'primary'
                        }
                        sx={{ mt: 1, height: '20px', fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </Box>

                    <MenuItem
                      onClick={() => {
                        handleMenuClose();
                        navigate(dashboardPath);
                      }}
                    >
                      <LayoutDashboard size={16} className="mr-2 text-slate-500" />
                      My Dashboard
                    </MenuItem>

                    {userProfile.role === 'citizen' && (
                      <MenuItem
                        onClick={() => {
                          handleMenuClose();
                          navigate('/report');
                        }}
                      >
                        <FileSpreadsheet size={16} className="mr-2 text-slate-500" />
                        Report Issue
                      </MenuItem>
                    )}

                    {(userProfile.role === 'officer' || userProfile.role === 'admin') && (
                      <MenuItem
                        onClick={() => {
                          handleMenuClose();
                          navigate(
                            userProfile.role === 'admin' ? '/admin/profile' : '/officer/profile'
                          );
                        }}
                      >
                        <UserCog size={16} className="mr-2 text-slate-500" />
                        My Profile
                      </MenuItem>
                    )}

                    <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                      <LogOut size={16} className="mr-2" />
                      Logout
                    </MenuItem>
                  </Menu>
                </Box>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
