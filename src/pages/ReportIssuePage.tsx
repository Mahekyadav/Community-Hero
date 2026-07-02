import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Paper,
  Grid,
} from '@mui/material';
import { Camera, MapPin, Sparkles, ArrowLeft, Upload, FileCheck, CheckCircle2 } from 'lucide-react';
import { setDoc, doc, collection, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { IssueCategory, IssuePriority, Issue, AIAnalysisResult } from '../types';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { WARDS } from '../constants';

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, addHeroPoints, awardBadge } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Other');
  const [priority, setPriority] = useState<IssuePriority>('Medium');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [address, setAddress] = useState('San Francisco, CA');
  const [city, setCity] = useState('');
  const [ward, setWard] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Auto-populate city and ward from the citizen's GPS-resolved profile
  useEffect(() => {
    if (userProfile?.city && !city) setCity(userProfile.city);
    if (userProfile?.ward && !ward) setWard(userProfile.ward);
  }, [userProfile]);

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AIAnalysisResult | null>(null);

  const categories: IssueCategory[] = [
    'Road Damage',
    'Garbage',
    'Water Leakage',
    'Street Light',
    'Electricity',
    'Traffic',
    'Public Safety',
    'Other',
  ];

  const priorities: IssuePriority[] = ['Low', 'Medium', 'High', 'Critical'];

  // Downscale and re-encode the image so the resulting base64 payload stays
  // well under Vercel's serverless function body-size limit (4.5MB) and
  // Firestore's per-document size limit (1MB), which raw phone-camera photos
  // (often 3000x4000px, multiple MB) would otherwise exceed.
  const compressImage = (file: File, maxDimension = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for compression'));
      };
      img.src = objectUrl;
    });
  };

  const processImageFile = async (file: File) => {
    setError(null);

    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Max size allowed is 5MB.');
      return;
    }

    try {
      const base64 = await compressImage(file);
      setImageBase64(base64);
      analyzeImageWithGemini(base64);
    } catch (err) {
      console.error(err);
      setError('Could not process the selected image. Please try a different file.');
    }
  };

  // Handle Image Selection and Conversion to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  // Analyze uploaded image using the Gemini API endpoint
  const analyzeImageWithGemini = async (base64: string) => {
    setAnalyzing(true);
    setAiSuggestions(null);
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(response.status === 503
          ? (body?.error || 'AI analysis is temporarily busy. Please try again in a moment.')
          : 'AI analysis service failed.');
      }

      const data = await response.json();
      setAiSuggestions(data);

      // Populate input fields with suggestions
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      if (data.severity) setPriority(data.severity);
    } catch (err: any) {
      console.error(err);
      setError(err.message === 'AI analysis service failed.' || !err.message
        ? 'AI Image Analysis offline. Please fill in report details manually.'
        : err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Submit report to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to report an issue.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const issueId = `issue_${Date.now()}`;
    const issueData: Issue = {
      id: issueId,
      title,
      description,
      category,
      priority,
      status: 'Pending',
      latitude,
      longitude,
      address,
      city: city.trim() || undefined,
      ward: ward || undefined,
      imageUrl: imageBase64 || undefined,
      createdBy: user.uid,
      creatorName: userProfile?.displayName || 'Anonymous Hero',
      upvotesCount: 0,
      verificationsCount: 0,
      confidenceScore: 10, // Starts at 10 for original report
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upvotedBy: [],
      verifiedBy: [],
      aiAnalysis: aiSuggestions ? {
        suggestedDepartment: aiSuggestions.suggestedDepartment,
        possibleDuplicatesCount: 0,
      } : undefined,
    };

    try {
      await setDoc(doc(db, 'issues', issueId), issueData);

      // Initialize pointsEarned to 0 if not yet set; no-op if already exists (increment by 0)
      await updateDoc(doc(db, 'users', user.uid), { pointsEarned: increment(0) });

      // Award legacy hero points
      await addHeroPoints(50, 'Reported new civic issue');
      await awardBadge('First Reporter');

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `issues/${issueId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 }, px: { xs: 2, md: 3 } }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 3, fontWeight: 700 }}
        >
          Back to Dashboard
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontFamily: '"Space Grotesk", sans-serif' }}>
          Report Civic Issue
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Take a photo of any civic issue in your neighborhood. Gemini AI will analyze the picture and help format details for the city departments.
        </Typography>

        {success ? (
          <Card sx={{ p: 5, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: 4, borderRadius: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <CheckCircle2 size={64} className="text-green-500 animate-pulse" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
              Issue Submitted Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Thank you for being a Community Hero! Your report is now in the Community queue.
              <br />
              <strong>+50 Hero Points</strong> and the <strong>First Reporter</strong> badge have been awarded to your profile!
            </Typography>
            <CircularProgress size={24} />
          </Card>
        ) : (
          <Grid container spacing={{ xs: 2, md: 4 }}>
            {/* Form Side */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 1 } }}>
              <Card sx={{ boxShadow: '0px 10px 30px rgba(0,0,0,0.03)', borderRadius: 5 }}>
                <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                      {error}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Report Title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Broken Water Pipe / Huge Pothole"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          select
                          label="Category"
                          required
                          value={category}
                          onChange={(e) => setCategory(e.target.value as IssueCategory)}
                          fullWidth
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        >
                          {categories.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {cat}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          select
                          label="Priority / Severity"
                          required
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as IssuePriority)}
                          fullWidth
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        >
                          {priorities.map((p) => (
                            <MenuItem key={p} value={p}>
                              {p}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>

                    <TextField
                      label="Detailed Description"
                      required
                      multiline
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please supply specific details of the damage, blockages, or safety hazards..."
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />

                    {/* Location routing fields — used to match the issue to the correct officer */}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="City"
                          required
                          fullWidth
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Mumbai"
                          helperText="Must match the officer's city"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          select
                          label="Ward / District"
                          required
                          fullWidth
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                          helperText="Must match the officer's assigned ward"
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
                      </Grid>
                    </Grid>

                    {/* Live location summary — updated whenever the map pin moves */}
                    <Box sx={{ p: 2, border: '1px dashed rgba(37,99,235,0.25)', borderRadius: 3, bgcolor: 'rgba(239,246,255,0.6)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MapPin size={16} className="text-blue-600" />
                        Pinned Location
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                        📍 {address}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Lat: {latitude.toFixed(5)} · Lng: {longitude.toFixed(5)}
                      </Typography>
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={submitting || analyzing}
                      startIcon={<FileCheck size={18} />}
                      sx={{
                        py: 1.75,
                        minHeight: 52,
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        boxShadow: '0px 8px 25px rgba(37,99,235,0.3)',
                        fontWeight: 700,
                      }}
                    >
                      {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Community Report'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Media/Image uploading Side — appears first on mobile so citizens can photo first */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 2 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* Image Drag and Drop Upload Card */}
                <Card sx={{ p: 3, textAlign: 'center', border: '2px dashed rgba(37, 99, 235, 0.25)', borderRadius: 5 }}>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center p-6 cursor-pointer"
                  >
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="image-file-input"
                      type="file"
                      onChange={handleImageChange}
                    />
                    <label htmlFor="image-file-input" className="cursor-pointer">
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: 'rgba(37, 99, 235, 0.08)',
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2.5,
                          mx: 'auto',
                        }}
                      >
                        <Camera size={28} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Upload Issue Photo
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
                        Drag & Drop or click to browse files
                      </Typography>
                    </label>
                  </div>

                  {imageBase64 && (
                    <Box sx={{ mt: 3, position: 'relative' }}>
                      <Box
                        component="img"
                        src={imageBase64}
                        sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 3 }}
                      />
                    </Box>
                  )}
                </Card>

                {/* AI Suggestions Box */}
                {(analyzing || aiSuggestions) && (
                  <Card sx={{ p: 3, bgcolor: 'rgba(37, 99, 235, 0.03)', borderColor: 'rgba(37, 99, 235, 0.1)', borderRadius: 5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Sparkles size={18} className="text-blue-600" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif' }}>
                        Gemini AI Assistant Insights
                      </Typography>
                    </Box>

                    {analyzing ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
                        <CircularProgress size={32} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Gemini is analyzing issue image...
                        </Typography>
                      </Box>
                    ) : (
                      aiSuggestions && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            🎉 <strong>Photo Analysis successful!</strong> Gemini has auto-filled the title, category, priority, and description. You can adjust them before submitting.
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 2, bg: 'white', borderRadius: 3 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
                              <strong>Suggested Department:</strong> {aiSuggestions.suggestedDepartment || 'N/A'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              <strong>Estimated Severity:</strong> {aiSuggestions.severity || 'Medium'}
                            </Typography>
                          </Paper>
                        </Box>
                      )
                    )}
                  </Card>
                )}

                {/* Interactive OpenStreetMap / Leaflet location picker */}
                <Card sx={{ overflow: 'hidden', borderRadius: 5 }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapPin size={16} className="text-blue-600" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Pin Exact Location
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      Click map or drag the marker
                    </Typography>
                  </Box>

                  <Box sx={{ height: 300 }}>
                    <LocationPickerMap
                      lat={latitude}
                      lng={longitude}
                      onLocationChange={(lat, lng, addr) => {
                        setLatitude(lat);
                        setLongitude(lng);
                        setAddress(addr);
                      }}
                    />
                  </Box>

                  <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      📍 {address}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </Typography>
                  </Box>
                </Card>

              </Box>
            </Grid>
          </Grid>
        )}
      </Container>
      <Footer />
    </Box>
  );
};
