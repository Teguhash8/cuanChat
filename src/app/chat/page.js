'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/auth';

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const SUGGESTIONS = [
    'Nasi goreng 15rb pake gopay',
    'Grab ke kantor 24k',
    'Kopi 25000 tunai',
    'Beli bensin pertalite 50rb',
    'Sisa budget makan?',
    'Total pengeluaran bulan ini',
    'Cek saldo',
];

// ── Tesseract OCR helper (loaded from CDN) ──
let tesseractLoaded = false;
function loadTesseract() {
    return new Promise((resolve, reject) => {
        if (tesseractLoaded && window.Tesseract) return resolve(window.Tesseract);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.onload = () => { tesseractLoaded = true; resolve(window.Tesseract); };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function ocrImage(imageUrl) {
    const Tesseract = await loadTesseract();
    const { data } = await Tesseract.recognize(imageUrl, 'ind+eng', {
        logger: () => { },
    });
    return data.text;
}

// ── Speech Recognition helper ──
function getSpeechRecognition() {
    if (typeof window === 'undefined') return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;
    return recognition;
}

export default function ChatPage() {
    const [messages, setMessages] = useState([
        {
            id: 0,
            role: 'bot',
            content: '👋 Halo! Saya **CuanChat Bot**, asisten keuangan pribadimu.\n\nCatat pengeluaran dengan cara natural, contoh:\n• \"Nasi goreng 15rb pake gopay\"\n• \"Grab ke kantor 24k\"\n• 📎 Kirim **foto struk** untuk scan otomatis\n• 🎤 Kirim **voice note** untuk catat suara\n\nKetik pesan untuk mulai! 💬',
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [lastTransaction, setLastTransaction] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const vnTranscriptRef = useRef('');

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            if (recognitionRef.current) try { recognitionRef.current.abort(); } catch { }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try { mediaRecorderRef.current.stop(); } catch { }
            }
        };
    }, []);

    const addMessage = useCallback((role, content, extra = {}) => {
        const msg = {
            id: Date.now() + Math.random(),
            role,
            content,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            ...extra,
        };
        setMessages(prev => [...prev, msg]);
        return msg;
    }, []);

    // ── Parse result via existing chat API ──
    const parseAndSave = useCallback(async (text, source = 'chat') => {
        setIsTyping(true);
        try {
            const res = await authFetch('/api/chat/parse', {
                method: 'POST',
                body: JSON.stringify({ message: text }),
            });
            const result = await res.json();
            await new Promise(r => setTimeout(r, 500));
            setIsTyping(false);

            if (result.type === 'query') {
                addMessage('bot', result.response);
            } else if (result.type === 'error') {
                addMessage('bot', result.response);
            } else if (result.type === 'transaction') {
                const td = result.data;
                const saveRes = await authFetch('/api/chat/save', {
                    method: 'POST',
                    body: JSON.stringify(td),
                });
                const saved = await saveRes.json();
                setLastTransaction(saved.transaction);

                const sourceLabel = source === 'ocr' ? '📸 Dari Scan Struk' : source === 'vn' ? '🎤 Dari Voice Note' : '📝 Transaksi Baru';
                const botMsg = `${sourceLabel}\n\nKategori: ${td.category_icon} ${td.category_name}\nNominal: ${formatRupiah(td.amount)}\nAkun: ${td.wallet_icon} ${td.wallet_name}${saved.wallet_balance !== null ? `\nSisa saldo ${td.wallet_name}: ${formatRupiah(saved.wallet_balance)}` : ''}\n\nBalas **"Edit"** untuk mengubah atau **"Batal"** untuk menghapus.`;
                addMessage('bot', botMsg, { isTransaction: true });
            }
        } catch (err) {
            setIsTyping(false);
            addMessage('bot', '❌ Terjadi kesalahan. Coba lagi nanti.');
        }
    }, [addMessage]);

    // ── Send text message ──
    const sendMessage = async (text) => {
        const trimmed = (text || input).trim();
        if (!trimmed) return;
        setInput('');

        addMessage('user', trimmed);
        setIsTyping(true);

        // Handle special commands
        if (trimmed.toLowerCase() === 'batal' && lastTransaction) {
            try {
                await authFetch(`/api/transactions/${lastTransaction.id}`, { method: 'DELETE' });
                setIsTyping(false);
                addMessage('bot', `🗑️ Transaksi "${lastTransaction.description}" telah dihapus.`);
                setLastTransaction(null);
                return;
            } catch {
                setIsTyping(false);
                addMessage('bot', '❌ Gagal menghapus transaksi.');
                return;
            }
        }

        if (trimmed.toLowerCase().startsWith('ganti ke ') && lastTransaction) {
            const walletName = trimmed.substring(9).trim();
            try {
                const walletsRes = await authFetch('/api/wallets');
                const wallets = await walletsRes.json();
                const wallet = wallets.find(w => w.name.toLowerCase().includes(walletName.toLowerCase()));
                if (wallet) {
                    const res = await authFetch('/api/chat/update-wallet', {
                        method: 'POST',
                        body: JSON.stringify({ transaction_id: lastTransaction.id, wallet_id: wallet.id }),
                    });
                    const data = await res.json();
                    setIsTyping(false);
                    addMessage('bot', `✅ Diupdate: Menggunakan saldo ${data.wallet_icon} ${data.wallet_name}.\nSisa saldo ${data.wallet_name}: ${formatRupiah(data.balance)}`);
                    return;
                }
            } catch { }
            setIsTyping(false);
            addMessage('bot', `❌ Dompet "${walletName}" tidak ditemukan.`);
            return;
        }

        // Normal text parse
        try {
            const res = await authFetch('/api/chat/parse', {
                method: 'POST',
                body: JSON.stringify({ message: trimmed }),
            });
            const result = await res.json();
            await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
            setIsTyping(false);

            if (result.type === 'query') {
                addMessage('bot', result.response);
            } else if (result.type === 'error') {
                addMessage('bot', result.response);
            } else if (result.type === 'transaction') {
                const td = result.data;
                const saveRes = await authFetch('/api/chat/save', {
                    method: 'POST',
                    body: JSON.stringify(td),
                });
                const saved = await saveRes.json();
                setLastTransaction(saved.transaction);

                const botMsg = `📝 **Transaksi Baru**\n\nKategori: ${td.category_icon} ${td.category_name}\nNominal: ${formatRupiah(td.amount)}\nAkun: ${td.wallet_icon} ${td.wallet_name}${saved.wallet_balance !== null ? `\nSisa saldo ${td.wallet_name}: ${formatRupiah(saved.wallet_balance)}` : ''}\n\nBalas **"Edit"** untuk mengubah atau **"Batal"** untuk menghapus.`;
                addMessage('bot', botMsg, { isTransaction: true });
            }
        } catch (err) {
            setIsTyping(false);
            addMessage('bot', '❌ Terjadi kesalahan. Coba lagi nanti.');
        }
    };

    // ── Photo attach & OCR ──
    const handlePhotoSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setShowAttachMenu(false);

        // Preview in chat
        const previewUrl = URL.createObjectURL(file);
        addMessage('user', '', { imagePreview: previewUrl, imageFile: file.name });

        // Upload
        const formData = new FormData();
        formData.append('image', file);
        try {
            const uploadRes = await authFetch('/api/attachments/upload', {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadRes.json();
            const serverUrl = `http://localhost:3001${uploadData.url}`;

            // OCR scan
            addMessage('bot', '🔍 **Scanning struk...** Mohon tunggu sebentar.');
            setIsTyping(true);

            try {
                const ocrText = await ocrImage(serverUrl);
                const cleaned = ocrText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
                setIsTyping(false);

                if (cleaned.length < 5) {
                    addMessage('bot', '⚠️ Tidak dapat membaca teks dari gambar. Coba foto struk yang lebih jelas, atau ketik manual.');
                    return;
                }

                addMessage('bot', `📄 **Hasil Scan:**\n\`\`\`\n${cleaned.substring(0, 300)}\n\`\`\`\n\n🔄 Menganalisis transaksi...`);

                // Parse the OCR text
                await parseAndSave(cleaned, 'ocr');
            } catch (ocrErr) {
                setIsTyping(false);
                addMessage('bot', '⚠️ Gagal scan struk. Coba kirim foto yang lebih jelas atau ketik manual.');
            }
        } catch (err) {
            addMessage('bot', '❌ Gagal upload gambar.');
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Voice Note Recording ──
    const startRecording = async () => {
        setShowAttachMenu(false);
        vnTranscriptRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Start MediaRecorder for audio capture
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
            });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Show VN in chat
                const transcript = vnTranscriptRef.current;
                addMessage('user', transcript || '🎤 Voice Note', { audioUrl, audioBlob, isVoiceNote: true });

                if (transcript && transcript.trim().length > 2) {
                    // Upload audio file for reference
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voicenote.webm');
                    try { await authFetch('/api/attachments/upload-audio', { method: 'POST', body: formData }); } catch { }

                    // Parse transcript
                    addMessage('bot', `🎤 **Transcript:** "${transcript}"\n\n🔄 Menganalisis transaksi...`);
                    await parseAndSave(transcript, 'vn');
                } else {
                    // Upload and show without parse
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voicenote.webm');
                    try { await authFetch('/api/attachments/upload-audio', { method: 'POST', body: formData }); } catch { }
                    addMessage('bot', '⚠️ Tidak dapat mengenali ucapan. Coba ulangi dengan suara yang lebih jelas, atau ketik manual.');
                }
            };

            mediaRecorder.start(250);

            // Start Speech Recognition
            const recognition = getSpeechRecognition();
            if (recognition) {
                recognition.onresult = (event) => {
                    let transcript = '';
                    for (let i = 0; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    vnTranscriptRef.current = transcript;
                };
                recognition.onerror = () => { };
                recognition.onend = () => { };
                recognitionRef.current = recognition;
                recognition.start();
            }

            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            addMessage('bot', '❌ Tidak dapat mengakses mikrofon. Pastikan permission sudah diizinkan.');
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ── Render message content ──
    const renderMessageContent = (msg) => {
        // Image message
        if (msg.imagePreview) {
            return (
                <div>
                    <img src={msg.imagePreview} alt="Struk" className="chat-image-preview" onClick={() => window.open(msg.imagePreview, '_blank')} />
                    {msg.content && (
                        <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                    )}
                </div>
            );
        }

        // Voice note message
        if (msg.audioUrl || msg.isVoiceNote) {
            return (
                <div>
                    {msg.audioUrl && (
                        <div className="vn-player">
                            <div className="vn-icon">🎤</div>
                            <audio controls src={msg.audioUrl} className="vn-audio" />
                        </div>
                    )}
                    {msg.content && msg.content !== '🎤 Voice Note' && (
                        <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                    )}
                </div>
            );
        }

        // Regular text
        return (
            <div className="text-sm text-slate-200 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/```([\s\S]*?)```/g, '<pre class="text-xs bg-black/30 rounded-lg p-2 mt-1 overflow-x-auto">$1</pre>') }} />
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />

            {/* Chat Header */}
            <div className="glass-card rounded-b-none p-4 flex items-center gap-3 border-b-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    💰
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-semibold text-slate-200">CuanChat Bot</h2>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft"></span>
                        Online
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="hidden sm:inline">📎 Foto / 🎤 VN</span>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-container">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                            {renderMessageContent(msg)}
                            <p className="text-[10px] text-slate-500 mt-1 text-right">{msg.timestamp}</p>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="chat-bubble-bot flex items-center gap-1 py-3 px-4">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Suggestion chips */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all hover:bg-emerald-900/30 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-300"
                        style={{ borderColor: 'var(--border-color)' }}>
                        {s}
                    </button>
                ))}
            </div>

            {/* Recording overlay */}
            {isRecording && (
                <div className="recording-bar">
                    <div className="flex items-center gap-3">
                        <div className="recording-dot" />
                        <span className="text-red-400 text-sm font-medium">Merekam...</span>
                        <span className="text-slate-400 text-sm font-mono">{formatTime(recordingTime)}</span>
                    </div>
                    <button onClick={stopRecording} className="stop-recording-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                        Selesai
                    </button>
                </div>
            )}

            {/* Attach Menu Popup */}
            {showAttachMenu && (
                <div className="attach-menu">
                    <button className="attach-menu-item" onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false); }}>
                        <span className="attach-menu-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>📷</span>
                        <span>Buka Kamera</span>
                    </button>
                    <button className="attach-menu-item" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}>
                        <span className="attach-menu-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>🖼️</span>
                        <span>Upload Foto</span>
                    </button>
                </div>
            )}

            {/* Input area */}
            <div className="glass-card rounded-t-none p-3 flex items-end gap-2 border-t-0">
                {/* Attach button */}
                <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={isTyping || isRecording}
                    className="attach-btn"
                    title="Lampirkan foto atau VN"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>

                <input
                    ref={inputRef}
                    type="text"
                    className="input-field flex-1"
                    placeholder="Ketik pesan... misal: Kopi 25rb gopay"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping || isRecording}
                />

                {/* VN button (quick access) */}
                {!input.trim() ? (
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isTyping}
                        className={`mic-btn ${isRecording ? 'mic-btn-active' : ''}`}
                        title="Rekam Voice Note"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    </button>
                ) : (
                    <button onClick={() => sendMessage()} disabled={isTyping || !input.trim()}
                        className="btn-primary h-[42px] px-5 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                        Kirim
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
