import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import client from '../../api/client';

interface ChatMessage {
  id: string;
  message: string;
  sender: 'USER' | 'AI';
  createdAt: string;
}

export const AiTutor: React.FC = () => {
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested prompt chips
  const suggestedPrompts = [
    { text: 'Explain linear momentum', query: 'What is Linear Momentum and how does it relate to mass and velocity?' },
    { text: 'Ohm\'s Law', query: 'Can you explain Ohm\'s Law and how to calculate resistance?' },
    { text: 'Balancing equations', query: 'Show me how to balance a chemical equation step-by-step.' },
    { text: 'Discriminant nature', query: 'What does the Discriminant tell us about the roots of a quadratic equation?' }
  ];

  useEffect(() => {
    fetchHistoryAndCheckInitial();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchHistoryAndCheckInitial = async () => {
    setLoading(true);
    try {
      const res = await client.get('/ai-tutor/chat');
      setMessages(res.data);

      if (location.state?.initialPrompt) {
        const prompt = location.state.initialPrompt;
        await handleSendMessage(prompt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    
    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      message: text,
      sender: 'USER',
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setInputValue('');

    try {
      const res = await client.post('/ai-tutor/chat', { message: text });
      
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        res.data.userMessage,
        res.data.aiMessage
      ]);
    } catch (err) {
      console.error(err);
      alert('Tutor connection error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleExplainAgain = (precedingTopic: string) => {
    const prompt = `Can you explain that again but in even simpler terms? Provide a real-life analogy.`;
    handleSendMessage(prompt);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
        <h1 className="header-title" style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Class 10 Doubt Assistant
        </h1>
        <p className="header-subtitle" style={{ margin: 0, fontSize: '13px' }}>
          Type a question below. Explanations adapt to your active cognitive profile.
        </p>
      </div>

      {/* Suggestion Chips Row */}
      {messages.length === 0 && !loading && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '8px' }}>
            Get started with a suggested topic:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {suggestedPrompts.map((chip, idx) => (
              <button
                key={idx}
                className="btn btn-accent"
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  textTransform: 'none',
                  borderRadius: '20px',
                  boxShadow: 'none'
                }}
                onClick={() => handleSendMessage(chip.query)}
              >
                {chip.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main chat history list area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        border: '1px solid var(--color-border-dark)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'white',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontWeight: 600, color: 'var(--color-text-light)', fontSize: '13.5px' }}>
            Retrieving messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '12px',
            color: 'var(--color-text-light)'
          }}>
            <h3 style={{ fontWeight: 700, color: 'var(--color-text-dark)', fontSize: '16px' }}>Ask your Teacher Assistant</h3>
            <p style={{ fontSize: '13px', maxWidth: '350px', textAlign: 'center' }}>
              Ask a question about Class 10 Chemistry, Physics, or Math to get an explanation.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isAi = msg.sender === 'AI';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  {/* Bubble Container */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    borderTopLeftRadius: isAi ? '2px' : '14px',
                    borderTopRightRadius: isAi ? '14px' : '2px',
                    backgroundColor: isAi ? 'var(--color-accent-light)' : 'var(--color-bg)',
                    border: isAi ? '1px solid var(--color-accent)' : '1px solid var(--color-border-dark)',
                    color: 'var(--color-text-dark)',
                    fontWeight: 500,
                    fontSize: '14px',
                    whiteSpace: 'pre-line',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    {msg.message}
                  </div>
                  
                  {/* Utility Sub-bar */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '10px', color: 'var(--color-text-light)' }}>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isAi && (
                      <>
                        <span>•</span>
                        <button
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--color-primary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0
                          }}
                          onClick={() => handleExplainAgain(msg.message)}
                        >
                          Explain Again
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            
            {sending && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'flex-start',
                backgroundColor: 'var(--color-accent-light)',
                border: '1px dashed var(--color-accent)',
                padding: '10px 16px',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-accent-dark)'
              }}>
                Teacher is typing...
              </div>
            )}
            
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Ask a question..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{ flex: 1, padding: '14px' }}
          disabled={sending}
          required
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '120px', textTransform: 'none', padding: '12px', boxShadow: 'none' }}
          disabled={sending || !inputValue.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};
