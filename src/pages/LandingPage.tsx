import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Avatar,
  Divider,
  Grid,
} from '@mui/material';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Brain,
  MapPin,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Camera,
  Users,
  CheckSquare,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const statCards = [
    { value: '1,250+', label: 'Issues Reported', color: 'primary.main' },
    { value: '860', label: 'Resolved', color: 'success.main' },
    { value: '520', label: 'Active Citizens', color: 'secondary.main' },
    { value: '94%', label: 'Resolution Rate', color: 'info.main' },
  ];

  const features = [
    {
      icon: <Camera size={28} />,
      title: 'AI Image Analysis',
      desc: 'Simply snap a photo and Gemini will auto-generate title, description, and pinpoint exact details.',
      color: '#3B82F6',
    },
    {
      icon: <Brain size={28} />,
      title: 'Smart Categorization',
      desc: 'Issues are immediately sorted into Departments like Sanitation, Roads, Traffic, or Utilities.',
      color: '#10B981',
    },
    {
      icon: <MapPin size={28} />,
      title: 'Google Maps platform',
      desc: 'Interactive visual vector mapping for locating nearby issues, tracking real-time hot spots.',
      color: '#EC4899',
    },
    {
      icon: <Users size={28} />,
      title: 'Community Verification',
      desc: 'Allows upvotes, verifying accuracy, and discussions to help municipal officers prioritize.',
      color: '#8B5CF6',
    },
    {
      icon: <CheckSquare size={28} />,
      title: 'Live Tracking',
      desc: 'Chronological transparent status updates from Pending, Assigned, to full Authority Resolution.',
      color: '#F59E0B',
    },
    {
      icon: <ShieldCheck size={28} />,
      title: 'Officer Dashboard',
      desc: 'Robust administration view for city managers, including auto summaries and task assignments.',
      color: '#6366F1',
    },
  ];

  const steps = [
    { label: 'Upload Photo', desc: 'Snap and upload a photo of any damaged road, leak, or litter.' },
    { label: 'AI Analysis', desc: 'Gemini AI automatically assesses category, priority, and department.' },
    { label: 'Community Verification', desc: 'Local citizens verify and upvote the issue to push it to top queues.' },
    { label: 'Authority Resolution', desc: 'Assigned municipal officers resolve the issue and publish verified proof.' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Navbar onScrollTo={handleScrollTo} />

      {/* Hero Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="xl">
          <Grid container spacing={6} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 24,
                    bgcolor: 'rgba(37,99,235,0.06)',
                    color: 'primary.main',
                    mb: 3,
                  }}
                >
                  <Sparkles size={16} />
                  <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                    Google AI Studio Hackathon Winner
                  </Typography>
                </Box>

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                    lineHeight: 1.1,
                    letterSpacing: '-1.5px',
                    fontWeight: 800,
                    color: 'text.primary',
                    mb: 2.5,
                  }}
                >
                  Empowering Communities with <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI</span>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    maxWidth: '600px',
                    mb: 4.5,
                  }}
                >
                  Report local issues, collaborate with your community, and help authorities solve problems faster using Artificial Intelligence and smart mapping.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowRight size={18} />}
                    onClick={() => {
                      if (user && userProfile?.role === 'citizen') navigate('/report');
                      else if (user && userProfile?.role === 'officer') navigate('/officer');
                      else if (user && userProfile?.role === 'admin') navigate('/admin');
                      else navigate('/login');
                    }}
                    sx={{
                      py: 1.5,
                      px: 4,
                      fontSize: '1rem',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      boxShadow: '0px 10px 25px rgba(37, 99, 235, 0.35)',
                    }}
                  >
                    Report Issue
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      if (user && userProfile?.role === 'citizen') navigate('/dashboard');
                      else if (user && userProfile?.role === 'officer') navigate('/officer');
                      else if (user && userProfile?.role === 'admin') navigate('/admin');
                      else navigate('/login');
                    }}
                    sx={{
                      py: 1.5,
                      px: 4,
                      fontSize: '1rem',
                      borderColor: 'rgba(37, 99, 235, 0.3)',
                      color: 'text.primary',
                      background: 'white',
                      '&:hover': { background: '#F8FAFC' },
                    }}
                  >
                    Explore Map
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Illustration Mockup */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                component={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1',
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(37, 99, 235, 0.1)',
                  boxShadow: '0px 20px 50px rgba(37, 99, 235, 0.08)',
                }}
              >
                {/* Floating mockup cards */}
                <Card
                  sx={{
                    position: 'absolute',
                    top: '15%',
                    left: '10%',
                    width: '65%',
                    p: 2,
                    boxShadow: '0px 12px 30px rgba(0,0,0,0.06)',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#EF4444' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Garbage Overflow
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                    📍 Sector 4, Metro Blvd. Reported 5m ago.
                  </Typography>
                </Card>

                <Card
                  sx={{
                    position: 'absolute',
                    bottom: '15%',
                    right: '10%',
                    width: '65%',
                    p: 2,
                    boxShadow: '0px 12px 30px rgba(0,0,0,0.06)',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#10B981' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Resolved by Officer Green
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                    ✅ Resolution uploaded with 100pts rewarded.
                  </Typography>
                </Card>

                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'primary.main',
                    boxShadow: '0px 10px 30px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  <ShieldCheck size={48} />
                </Avatar>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Statistics Section */}
      <Box sx={{ py: 6, borderTop: '1px solid rgba(226, 232, 240, 0.8)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', bgcolor: '#F8FAFC' }}>
        <Container maxWidth="xl">
          <Grid container spacing={3}>
            {statCards.map((stat, i) => (
              <Grid size={{ xs: 6, md: 3 }} key={i}>
                <Card sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="h3" sx={{ color: stat.color, fontWeight: 800 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {stat.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features" sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Everything needed for local transparency
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              Advanced platform mechanics bringing speed and absolute accountability into municipal workflows.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feat, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Card sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 3,
                      bgcolor: `${feat.color}15`,
                      color: feat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {feat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {feat.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feat.desc}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box id="how-it-works" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F1F5F9' }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Simple, transparent workflow
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              From initial photo to verified resolution, trace every single step interactively.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {steps.map((step, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -16,
                      left: 20,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <CardContent sx={{ pt: 4, p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      {step.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {step.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
};
