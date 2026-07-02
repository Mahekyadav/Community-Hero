import React from 'react';
import { Box, Container, Grid, Typography, Link, IconButton } from '@mui/material';
import { ShieldAlert, Github, Twitter, Linkedin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: 2,
        mt: 'auto',
        backgroundColor: '#0F172A',
        color: 'white',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4} sx={{ justifyContent: 'space-between' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <ShieldAlert size={20} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  color: 'white',
                }}
              >
                Community <span className="text-blue-500">Hero</span>
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94A3B8', pr: { md: 4 }, mb: 2 }}>
              Empowering citizens and municipal officers to build cleaner, safer, and better-managed communities using Artificial Intelligence and interactive maps.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" sx={{ color: '#94A3B8', '&:hover': { color: 'white' } }}>
                <Twitter size={18} />
              </IconButton>
              <IconButton size="small" sx={{ color: '#94A3B8', '&:hover': { color: 'white' } }}>
                <Github size={18} />
              </IconButton>
              <IconButton size="small" sx={{ color: '#94A3B8', '&:hover': { color: 'white' } }}>
                <Linkedin size={18} />
              </IconButton>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, textTransform: 'uppercase', tracking: 1, color: '#F1F5F9' }}>
              Platform
            </Typography>
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li><Link href="/" color="inherit" underline="hover">Home</Link></li>
              <li><Link href="#features" color="inherit" underline="hover">Features</Link></li>
              <li><Link href="#how-it-works" color="inherit" underline="hover">How It Works</Link></li>
              <li><Link href="/login" color="inherit" underline="hover">Get Started</Link></li>
            </ul>
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, textTransform: 'uppercase', tracking: 1, color: '#F1F5F9' }}>
              Categories
            </Typography>
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li><Link href="/login" color="inherit" underline="hover">Road Damage</Link></li>
              <li><Link href="/login" color="inherit" underline="hover">Water Leakage</Link></li>
              <li><Link href="/login" color="inherit" underline="hover">Electricity</Link></li>
              <li><Link href="/login" color="inherit" underline="hover">Garbage Management</Link></li>
            </ul>
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, textTransform: 'uppercase', tracking: 1, color: '#F1F5F9' }}>
              Legal
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
              Suitable for standard hackathons and Google Cloud showcases. Powered by Gemini & Firebase.
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
              © 2026 Community Hero. All rights reserved.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
