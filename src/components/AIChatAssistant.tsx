import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  TextField,
  Avatar,
  Paper,
  Button,
  CircularProgress,
  Collapse,
} from '@mui/material';
import { Bot, Send, X, HelpCircle, Sparkles, Minus, MessageSquare } from 'lucide-react';
import { Issue } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatAssistantProps {
  nearbyIssues?: Issue[];
  isFloating?: boolean;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ nearbyIssues = [], isFloating = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm HeroBot, your civic assistant. Ask me anything about local reports, status checks, government department schemes, or how to earn Hero Points!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'How do I report?',
    'Explain Hero Points',
    'List nearby issues',
    'Which badging options exist?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
          })),
          issuesContext: nearbyIssues.map((issue) => ({
            title: issue.title,
            category: issue.category,
            address: issue.address,
            status: issue.status,
            priority: issue.priority,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to chat with AI');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);
    } catch (e: any) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Oops! I had an issue connecting to the central AI mainframe. Please try again soon.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const chatMarkup = (
    <Card
      sx={{
        width: { xs: '320px', sm: '380px' },
        height: '480px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0px 12px 40px rgba(15, 23, 42, 0.15)',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid rgba(226, 232, 240, 0.8)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          color: 'white',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
            <Bot size={18} className="text-white" />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              HeroBot AI Assistant
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem' }}>
              Online • Real-time Civic Support
            </Typography>
          </Box>
        </Box>
        {isFloating && (
          <IconButton size="small" sx={{ color: 'white' }} onClick={() => setIsOpen(false)}>
            <Minus size={18} />
          </IconButton>
        )}
      </Box>

      {/* Message List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bg: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {messages.map((m, index) => {
          const isUser = m.role === 'user';
          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              {!isUser && (
                <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: '0.8rem' }}>
                  H
                </Avatar>
              )}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: isUser ? '16px 16px 2px 16px' : '2px 16px 16px 16px',
                  bgcolor: isUser ? 'primary.main' : '#FFFFFF',
                  color: isUser ? 'white' : 'text.primary',
                  border: isUser ? 'none' : '1px solid rgba(226, 232, 240, 0.8)',
                  maxWidth: '80%',
                }}
              >
                <Typography variant="body2" sx={{ fontSize: '0.825rem', whiteSpace: 'pre-line' }}>
                  {m.content}
                </Typography>
              </Paper>
            </Box>
          );
        })}
        {loading && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
              <Bot size={14} className="text-white" />
            </Avatar>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">HeroBot is typing...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Quick suggestions */}
      {messages.length === 1 && (
        <Box sx={{ px: 2, py: 1, bg: 'white', borderTop: '1px solid rgba(226, 232, 240, 0.5)', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickPrompts.map((p) => (
            <Button
              key={p}
              variant="outlined"
              size="small"
              onClick={() => handleQuickPrompt(p)}
              sx={{
                fontSize: '0.7rem',
                py: '2px',
                px: '8px',
                borderColor: 'rgba(37, 99, 235, 0.2)',
                background: 'rgba(37, 99, 235, 0.02)',
                '&:hover': { background: 'rgba(37, 99, 235, 0.05)' },
              }}
            >
              {p}
            </Button>
          ))}
        </Box>
      )}

      {/* Input */}
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(226, 232, 240, 0.8)', bg: 'white', display: 'flex', gap: 1 }}>
        <TextField
          placeholder="Ask something..."
          size="small"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend(input);
          }}
          disabled={loading}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <IconButton
          color="primary"
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.05)' },
          }}
        >
          <Send size={16} />
        </IconButton>
      </Box>
    </Card>
  );

  if (!isFloating) {
    return chatMarkup;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      <Collapse in={isOpen}>
        <Box sx={{ mb: 2 }}>{chatMarkup}</Box>
      </Collapse>
      {!isOpen && (
        <IconButton
          onClick={() => setIsOpen(true)}
          sx={{
            width: 56,
            height: 56,
            bgcolor: 'primary.main',
            color: 'white',
            boxShadow: '0px 10px 30px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'primary.dark',
              transform: 'scale(1.05)',
            },
          }}
        >
          <Sparkles size={24} />
        </IconButton>
      )}
    </Box>
  );
};
