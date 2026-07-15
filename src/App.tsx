/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  TrendingUp,
  Award,
  Clock,
  Settings,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Flame,
  Sparkles,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Shuffle,
  BarChart3,
  HelpCircle,
  ArrowRight,
  Info,
  Check,
  AlertTriangle,
  Trophy,
  History,
  Lock,
  Key,
  Plus,
  Copy,
  Users,
  RefreshCw,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface SymbolMap {
  [symbol: string]: number;
}

interface Question {
  id: number;
  originalIndex: number; // to preserve identity across retries and shuffles
  symbol1: string;
  symbol2: string;
  operator: '+' | '-';
  correctAnswer: number;
  userAnswer: string;
  symbolMap: SymbolMap; // Unique map per question as per Unhan standards
}

interface HistoryRecord {
  id: string;
  date: string; // ISO format
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  accuracy: number; // percentage
  timeSpent: number; // seconds
  avgTimePerQuestion: number; // seconds
  shuffled: boolean;
  timerMode: 'per-soal' | 'cumulative';
}

interface ParticipantCode {
  code: string;
  createdAt: string;
  usedAt?: string;
  isUsed: boolean;
  notes?: string;
}

interface BimbelUnhanLogoProps {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  layout?: 'row' | 'stacked';
}

export function BimbelUnhanLogo({ className = "w-12 h-12", textClassName = "text-[#0c2640]", showText = true, layout = 'row' }: BimbelUnhanLogoProps) {
  const isStacked = layout === 'stacked';
  return (
    <div className={isStacked ? "flex flex-col items-center gap-3 text-center" : "flex items-center gap-2.5"}>
      <img src="/logo.png" alt="Logo" className={`${className} object-contain`} />
      {showText && (
        isStacked ? (
          <div className={`flex flex-col items-center text-center font-sans tracking-tight ${textClassName}`}>
            <span className="text-xl font-black leading-none uppercase">BIMBEL</span>
            <span className="text-[10px] font-bold tracking-[0.25em] leading-none mt-2.5 uppercase opacity-95">UNIVERSITAS</span>
            <span className="text-[10px] font-black tracking-[0.25em] leading-none mt-1.5 uppercase opacity-95">PERTAHANAN</span>
          </div>
        ) : (
          <div className={`flex flex-col text-left font-sans tracking-tight ${textClassName}`}>
            <span className="text-sm font-black leading-none uppercase">BIMBEL</span>
            <span className="text-[9px] font-bold tracking-wider leading-none mt-1 uppercase opacity-90">UNIVERSITAS</span>
            <span className="text-[9px] font-black tracking-wider leading-none mt-0.5 uppercase opacity-90">PERTAHANAN</span>
          </div>
        )
      )}
    </div>
  );
}

const ALL_SYMBOLS = ['&', '€', '@', '%', '§', '¢', '¥', '$', '£', '#'];

// Web Audio synthesizer for crisp, lag-free sound effects in iframe
const playSound = (type: 'click' | 'correct' | 'wrong' | 'timer' | 'victory' | 'buzz', enabled: boolean) => {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'timer') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'buzz') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(110, ctx.currentTime);
      osc2.frequency.setValueAtTime(112, ctx.currentTime);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.3);
    } else if (type === 'victory') {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.18);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.18);
      });
    }
  } catch (e) {
    console.warn('Audio feedback failed to initialize:', e);
  }
};

export default function App() {
  // ==========================================
  // APP CONFIG & SETTINGS STATE
  // ==========================================
  const [screen, setScreen] = useState<'welcome' | 'testing' | 'results' | 'history' | 'admin'>(() => {
    const isAdmin = localStorage.getItem('unhan_admin_authorized') === 'true';
    return isAdmin ? 'admin' : 'welcome';
  });
  const [questionCount, setQuestionCount] = useState<number>(40);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [questionTimerLimit, setQuestionTimerLimit] = useState<number>(3); // 3 atau 5 detik per soal

  // ==========================================
  // ACCESS CODE PROTECTION STATE
  // ==========================================
  const [accessCode, setAccessCode] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return localStorage.getItem('unhan_access_authorized') === 'true';
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('unhan_admin_authorized') === 'true';
  });
  const [accessError, setAccessError] = useState<string | null>(null);

  // Dynamic participant codes list state
  const [participantCodes, setParticipantCodes] = useState<ParticipantCode[]>(() => {
    const saved = localStorage.getItem('unhan_participant_codes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Default seed codes for initial demonstration
    return [
      { code: 'PESERTA-5219', createdAt: new Date().toISOString(), isUsed: false, notes: 'Agus Setiawan (Simulasi)' },
      { code: 'PESERTA-9043', createdAt: new Date().toISOString(), isUsed: true, usedAt: new Date().toISOString(), notes: 'Siti Rahma (Simulasi)' },
      { code: 'PESERTA-7104', createdAt: new Date().toISOString(), isUsed: false, notes: 'Budi Hartono (Simulasi)' }
    ];
  });

  // Sync participant codes to localStorage & fetch from server when admin logged in
  useEffect(() => {
    localStorage.setItem('unhan_participant_codes', JSON.stringify(participantCodes));
  }, [participantCodes]);

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetch('/api/codes', {
        headers: {
          'x-admin-key': 'UNHAN2027'
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Gagal memuat kode dari server');
      })
      .then(data => {
        setParticipantCodes(data);
      })
      .catch(err => {
        console.error(err);
      });
    }
  }, [isAdminLoggedIn]);

  // Admin form and table filter states
  const [newCustomCode, setNewCustomCode] = useState<string>('');
  const [newCodeNotes, setNewCodeNotes] = useState<string>('');
  const [adminCodeFilter, setAdminCodeFilter] = useState<'all' | 'active' | 'used'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Custom modal-based alerts and confirmations (to bypass browser/iframe sandboxing issues)
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm(null);
      }
    });
  };

  const triggerAlert = (title: string, message: string) => {
    setCustomAlert({
      isOpen: true,
      title,
      message
    });
  };

  const handleVerifyAccessCode = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = accessCode.trim().toUpperCase();
    if (!normalized) {
      setAccessError('Kode akses tidak boleh kosong.');
      return;
    }
    
    // Get or generate deviceId
    let deviceId = localStorage.getItem('unhan_device_id');
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('unhan_device_id', deviceId);
    }

    fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: normalized, deviceId })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(data => { throw new Error(data.message || 'Verifikasi gagal'); });
    })
    .then(data => {
      if (data.success) {
        setCustomAlert(null); // Clear any popup message on successful login
        localStorage.setItem('unhan_access_authorized', 'true');
        setIsAuthorized(true);
        if (data.isAdmin) {
          localStorage.setItem('unhan_admin_authorized', 'true');
          setIsAdminLoggedIn(true);
          setScreen('admin');
        } else {
          localStorage.removeItem('unhan_admin_authorized');
          setIsAdminLoggedIn(false);
          setScreen('welcome');
        }
        setAccessError(null);
        playSound('victory', soundEnabled);
      } else {
        setAccessError(data.message || 'Kode akses tidak valid atau belum terdaftar.');
        playSound('buzz', soundEnabled);
      }
    })
    .catch(err => {
      console.error(err);
      setAccessError(err.message || 'Gagal terhubung ke server verifikasi.');
      playSound('buzz', soundEnabled);
    });
  };

  const handleLogoutAccess = () => {
    localStorage.removeItem('unhan_access_authorized');
    localStorage.removeItem('unhan_admin_authorized');
    setIsAuthorized(false);
    setIsAdminLoggedIn(false);
    setAccessCode('');
    setScreen('welcome');
    playSound('click', soundEnabled);
  };

  // ==========================================
  // ADMIN PANEL CODE MANAGEMENT METHODS
  // ==========================================
  const handleRandomizeCodeField = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = 'UNHAN-';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCustomCode(rand);
    playSound('click', soundEnabled);
  };

  const handleAddCustomCode = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = newCustomCode.trim().toUpperCase();
    if (!formattedCode) {
      triggerAlert('Peringatan', 'Kode akses tidak boleh kosong!');
      return;
    }

    // Check duplicates in dynamic codes or static words
    const isDuplicate = participantCodes.some(c => c.code.trim().toUpperCase() === formattedCode) ||
      formattedCode === 'UNHAN2027';

    if (isDuplicate) {
      triggerAlert('Kode Duplikat', 'Kode akses tersebut sudah terdaftar atau tidak dapat digunakan!');
      playSound('buzz', soundEnabled);
      return;
    }

    const newCodeItem: ParticipantCode = {
      code: formattedCode,
      createdAt: new Date().toISOString(),
      isUsed: false,
      notes: newCodeNotes.trim() || 'Dibuat Manual'
    };

    fetch('/api/codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'UNHAN2027'
      },
      body: JSON.stringify({ codes: [newCodeItem] })
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Gagal menyimpan kode ke server');
    })
    .then(data => {
      setParticipantCodes(data);
      setNewCustomCode('');
      setNewCodeNotes('');
      playSound('victory', soundEnabled);
    })
    .catch(err => {
      console.error(err);
      triggerAlert('Gagal', 'Gagal memposting kode ke server backend.');
    });
  };

  const handleGenerateBulk = (count: number) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const newItems: ParticipantCode[] = [];
    const timestamp = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      // Ensure uniqueness
      let rand = '';
      let isDuplicate = true;
      let attempts = 0;

      while (isDuplicate && attempts < 100) {
        rand = 'UNHAN-';
        for (let j = 0; j < 4; j++) {
          rand += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        isDuplicate = participantCodes.some(c => c.code === rand) || 
          newItems.some(c => c.code === rand) ||
          rand === 'UNHAN2027';
        attempts++;
      }

      newItems.push({
        code: rand,
        createdAt: timestamp,
        isUsed: false,
        notes: `Bulk Gen #${i + 1} (${new Date().toLocaleDateString('id-ID')})`
      });
    }

    fetch('/api/codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'UNHAN2027'
      },
      body: JSON.stringify({ codes: newItems })
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Gagal menyimpan kode bulk ke server');
    })
    .then(data => {
      setParticipantCodes(data);
      playSound('victory', soundEnabled);
    })
    .catch(err => {
      console.error(err);
      triggerAlert('Gagal', 'Gagal menyimpan kode bulk ke server.');
    });
  };

  const handleDeleteCode = (codeToDelete: string) => {
    triggerConfirm(
      'Hapus Kode Akses',
      `Apakah Anda yakin ingin menghapus kode akses "${codeToDelete}"? Peserta dengan kode ini tidak akan bisa masuk lagi ke dalam sistem.`,
      () => {
        fetch(`/api/codes/${encodeURIComponent(codeToDelete)}`, {
          method: 'DELETE',
          headers: {
            'x-admin-key': 'UNHAN2027'
          }
        })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Gagal menghapus kode di server');
        })
        .then(data => {
          setParticipantCodes(data);
          playSound('click', soundEnabled);
        })
        .catch(err => {
          console.error(err);
          triggerAlert('Gagal', 'Gagal menghapus kode akses di server.');
        });
      }
    );
  };

  const handleClearAllCodes = () => {
    triggerConfirm(
      'Hapus Semua Kode',
      'Apakah Anda yakin ingin menghapus SEMUA kode akses peserta? Tindakan ini tidak bisa dibatalkan.',
      () => {
        fetch('/api/codes', {
          method: 'DELETE',
          headers: {
            'x-admin-key': 'UNHAN2027'
          }
        })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Gagal mengosongkan kode di server');
        })
        .then(data => {
          setParticipantCodes([]);
          playSound('click', soundEnabled);
        })
        .catch(err => {
          console.error(err);
          triggerAlert('Gagal', 'Gagal mengosongkan kode di server.');
        });
      }
    );
  };

  const handleCopyToClipboard = (codeToCopy: string) => {
    navigator.clipboard.writeText(codeToCopy).then(() => {
      setCopiedCode(codeToCopy);
      setTimeout(() => setCopiedCode(null), 2000);
      playSound('click', soundEnabled);
    }).catch(err => {
      console.warn('Clipboard write failed:', err);
    });
  };

  // Active Session State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [testActive, setTestActive] = useState<boolean>(false);
  const [hasStartedAnswering, setHasStartedAnswering] = useState<boolean>(false);

  // Cumulative Mode Timers (kept for historical log type compatibility, but not used actively)
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [totalTimeLimit, setTotalTimeLimit] = useState<number>(120);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  // Sync references to avoid stale closures in fast timers
  const questionsRef = useRef<Question[]>(questions);
  const timeSpentRef = useRef<number>(0);
  const activeIdxRef = useRef<number>(0);
  const questionTimerLimitRef = useRef<number>(3);
  const questionEndTimeRef = useRef<number>(0);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    timeSpentRef.current = timeSpent;
  }, [timeSpent]);

  useEffect(() => {
    activeIdxRef.current = activeIdx;
  }, [activeIdx]);

  useEffect(() => {
    questionTimerLimitRef.current = questionTimerLimit;
  }, [questionTimerLimit]);

  // Per-Soal (Individual) Mode Timers
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(3.0);
  const lastTickTime = useRef<number>(Date.now());

  // History / Logs State
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  // Interactive UI Helpers
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
  // Custom non-blocking iframe dialog/modal states
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<boolean>(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showPreTestInstructions, setShowPreTestInstructions] = useState<boolean>(false);
  const [pendingQuestionCount, setPendingQuestionCount] = useState<number>(40);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('unhan_kecermatan_history');
    if (saved) {
      try {
        setHistoryList(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Autofocus input when active question index changes
  useEffect(() => {
    if (screen === 'testing' && testActive) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [activeIdx, screen, testActive]);

  // Handle active countdown timers
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (testActive && hasStartedAnswering) {
      // Individual Question Timer
      interval = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTickTime.current) / 1000;
        lastTickTime.current = now;

        const remaining = (questionEndTimeRef.current - now) / 1000;
        if (remaining <= 0) {
          // Time expired! Play buzzer sound
          playSound('buzz', soundEnabled);

          const currIdx = activeIdxRef.current;
          const nextIdx = currIdx + 1;

          if (nextIdx >= questionsRef.current.length) {
            // End of test - immediately save and show results
            handleCompleteTest(false, questionsRef.current);
          } else {
            // Reset timer end-time and progress to next index
            questionEndTimeRef.current = Date.now() + questionTimerLimitRef.current * 1000;
            setQuestionTimeLeft(questionTimerLimitRef.current);
            setActiveIdx(nextIdx);
          }
        } else {
          setQuestionTimeLeft(remaining);
          setTimeSpent((prev) => prev + delta);
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testActive, hasStartedAnswering, soundEnabled]);

  // ==========================================
  // SYMBOLS & QUESTIONS GENERATION LOGIC
  // ==========================================

  // Generate unique randomized symbol map
  const generateRandomSymbolMap = (): SymbolMap => {
    const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
    // Shuffle numbers 1-10
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    const map: SymbolMap = {};
    ALL_SYMBOLS.forEach((symbol, index) => {
      map[symbol] = numbers[index];
    });
    return map;
  };

  // Generate questions list
  const generateQuestionsList = (count: number): Question[] => {
    const list: Question[] = [];
    for (let i = 1; i <= count; i++) {
      // Each question gets its own randomized map as required
      const qMap = generateRandomSymbolMap();
      
      // Select two distinct symbols
      const s1Idx = Math.floor(Math.random() * ALL_SYMBOLS.length);
      let s2Idx = Math.floor(Math.random() * ALL_SYMBOLS.length);
      while (s1Idx === s2Idx) {
        s2Idx = Math.floor(Math.random() * ALL_SYMBOLS.length);
      }

      const s1 = ALL_SYMBOLS[s1Idx];
      const s2 = ALL_SYMBOLS[s2Idx];
      const op = '+';
      
      const v1 = qMap[s1];
      const v2 = qMap[s2];

      // Ambil angka terakhir dari hasil penjumlahan (misalnya 6 + 7 = 13, maka kunci jawaban = 3)
      const correctAnswer = (v1 + v2) % 10;

      list.push({
        id: i,
        originalIndex: i,
        symbol1: s1,
        symbol2: s2,
        operator: op,
        correctAnswer,
        userAnswer: '',
        symbolMap: qMap,
      });
    }
    return list;
  };

  // ==========================================
  // CORE APP CONTROLLERS
  // ==========================================

  const handleStartNewTest = (count: number = questionCount) => {
    playSound('click', soundEnabled);
    const newQuestions = generateQuestionsList(count);
    
    setQuestions(newQuestions);
    setQuestionCount(count);
    setActiveIdx(0);
    
    // Limits
    const cumulativeLimit = count * questionTimerLimit;
    setTimeLeft(cumulativeLimit);
    setTotalTimeLimit(cumulativeLimit);
    setQuestionTimeLeft(questionTimerLimit);
    questionEndTimeRef.current = Date.now() + questionTimerLimit * 1000;
    
    setTimeSpent(0);
    setHasStartedAnswering(false);
    setTestActive(true);
    setScreen('testing');
  };

  // Reset/Retry active set
  const handleRetrySameSet = (shuffleOrder: boolean = false) => {
    playSound('click', soundEnabled);

    let resetQuestions = questions.map((q) => ({
      ...q,
      userAnswer: ''
    }));

    if (shuffleOrder) {
      // Shuffle the array of questions
      for (let i = resetQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resetQuestions[i], resetQuestions[j]] = [resetQuestions[j], resetQuestions[i]];
      }
      // Re-index displayed id to be clean sequential
      resetQuestions = resetQuestions.map((q, idx) => ({
        ...q,
        id: idx + 1
      }));
    } else {
      // Restore natural originalIndex order
      resetQuestions.sort((a, b) => a.originalIndex - b.originalIndex);
      resetQuestions = resetQuestions.map((q, idx) => ({
        ...q,
        id: idx + 1
      }));
    }

    setQuestions(resetQuestions);
    setActiveIdx(0);
    
    const cumulativeLimit = questions.length * questionTimerLimit;
    setTimeLeft(cumulativeLimit);
    setTotalTimeLimit(cumulativeLimit);
    setQuestionTimeLeft(questionTimerLimit);
    questionEndTimeRef.current = Date.now() + questionTimerLimit * 1000;
    
    setTimeSpent(0);
    setHasStartedAnswering(false);
    setTestActive(true);
    setScreen('testing');
  };

  // Submit test and review answers
  const handleCompleteTest = (autoTimeOut: boolean = false, customQuestions?: Question[]) => {
    setTestActive(false);

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const questionsToEvaluate = customQuestions || questionsRef.current;
    const evaluatedTimeSpent = timeSpentRef.current;

    questionsToEvaluate.forEach((q) => {
      const trimmed = q.userAnswer.trim();
      if (trimmed === '') {
        unansweredCount++;
      } else {
        const parsed = parseInt(trimmed, 10);
        if (parsed === q.correctAnswer) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    const accuracy = questionsToEvaluate.length > 0 ? Math.round((correctCount / questionsToEvaluate.length) * 100) : 0;
    const avgSpeed = (correctCount + wrongCount + unansweredCount) > 0 
      ? parseFloat((evaluatedTimeSpent / questionsToEvaluate.length).toFixed(1)) 
      : 0;

    // Save statistics in log
    const newRecord: HistoryRecord = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      totalQuestions: questionsToEvaluate.length,
      correctCount,
      wrongCount,
      unansweredCount,
      accuracy,
      timeSpent: Math.round(evaluatedTimeSpent),
      avgTimePerQuestion: avgSpeed,
      shuffled: false,
      timerMode: 'per-soal'
    };

    const updatedHistory = [newRecord, ...historyList];
    setHistoryList(updatedHistory);
    localStorage.setItem('unhan_kecermatan_history', JSON.stringify(updatedHistory));

    setScreen('results');

    if (accuracy >= 80) {
      playSound('victory', soundEnabled);
    } else {
      playSound('correct', soundEnabled);
    }
  };

  const handleCancelTest = () => {
    playSound('click', soundEnabled);
    setShowCancelConfirm(true);
  };

  const executeCancelTest = () => {
    setTestActive(false);
    setScreen('welcome');
    setShowCancelConfirm(false);
    playSound('click', soundEnabled);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('click', soundEnabled);
    setDeleteItemId(id);
  };

  const executeDeleteHistoryItem = () => {
    if (deleteItemId) {
      const updated = historyList.filter((item) => item.id !== deleteItemId);
      setHistoryList(updated);
      localStorage.setItem('unhan_kecermatan_history', JSON.stringify(updated));
      playSound('wrong', soundEnabled);
      setDeleteItemId(null);
    }
  };

  const handleClearAllHistoryLogs = () => {
    playSound('click', soundEnabled);
    setConfirmDeleteAll(true);
  };

  const executeClearAllHistoryLogs = () => {
    setHistoryList([]);
    localStorage.removeItem('unhan_kecermatan_history');
    playSound('wrong', soundEnabled);
    setConfirmDeleteAll(false);
  };

  // Keyboard navigation / input handler inside the active question
  const handleAnswerInput = (val: string) => {
    // Only accept numbers
    if (val !== '' && !/^\d+$/.test(val)) return;

    if (!hasStartedAnswering) {
      setHasStartedAnswering(true);
      lastTickTime.current = Date.now();
      questionEndTimeRef.current = Date.now() + questionTimerLimit * 1000;
    }

    const updated = [...questions];
    updated[activeIdx].userAnswer = val;
    setQuestions(updated);
    questionsRef.current = updated; // Sync ref synchronously to prevent race conditions with fast timers
    playSound('click', soundEnabled);

    // Auto-advance logic:
    // Since the correct answer is always a single digit (0-9), we immediately advance upon typing a digit if autoAdvance is enabled.
    if (autoAdvance && val.length > 0) {
      if (activeIdx < updated.length - 1) {
        setActiveIdx(activeIdx + 1);
        setQuestionTimeLeft(questionTimerLimit);
        questionEndTimeRef.current = Date.now() + questionTimerLimit * 1000;
        playSound('click', soundEnabled);
      } else {
        // Last question answered with auto-advance! Auto-complete the test in per-soal mode
        handleCompleteTest(false, updated);
      }
    }
  };

  // Navigations for the single focus question mode
  const handlePrevQuestion = () => {
    if (activeIdx > 0) {
      setActiveIdx(activeIdx - 1);
      setQuestionTimeLeft(questionTimerLimit);
      questionEndTimeRef.current = Date.now() + questionTimerLimit * 1000;
      playSound('click', soundEnabled);
    }
  };

  const handleNextQuestion = () => {
    if (activeIdx < questions.length - 1) {
      setActiveIdx(activeIdx + 1);
      setQuestionTimeLeft(questionTimerLimit);
      questionEndTimeRef.current = Date.now() + questionTimerLimit * 1000;
      playSound('click', soundEnabled);
    } else {
      // If last question is reached and they try to go next (e.g. hitting Enter or ArrowRight)
      // automatically complete the test!
      handleCompleteTest(false, questions);
    }
  };

  // Handle Keyboard Shortcuts for high speed answer pacing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'testing' || !testActive) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevQuestion();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNextQuestion();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelTest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screen, testActive, activeIdx, questions.length, questionTimerLimit]);

  // ==========================================
  // CALCULATIONS & STATISTICS SELECTORS
  // ==========================================

  const performanceStats = useMemo(() => {
    const total = historyList.length;
    if (total === 0) {
      return { total, avgAccuracy: 0, bestScore: 0, avgSpeed: 0, totalSolved: 0 };
    }
    const sumAccuracy = historyList.reduce((sum, item) => sum + item.accuracy, 0);
    const maxScore = historyList.reduce((max, item) => Math.max(max, item.correctCount), 0);
    const sumSpeed = historyList.reduce((sum, item) => sum + item.avgTimePerQuestion, 0);
    const totalSolved = historyList.reduce((sum, item) => sum + item.correctCount + item.wrongCount, 0);

    return {
      total,
      avgAccuracy: Math.round(sumAccuracy / total),
      bestScore: maxScore,
      avgSpeed: parseFloat((sumSpeed / total).toFixed(1)),
      totalSolved
    };
  }, [historyList]);

  const filteredLogs = useMemo(() => {
    if (historyFilter === 'all') return historyList;
    return historyList.filter((item) => item.totalQuestions === parseInt(historyFilter, 10));
  }, [historyList, historyFilter]);

  const chartPoints = useMemo(() => {
    const lastTen = [...historyList].slice(0, 10).reverse();
    return lastTen.map((item, idx) => ({
      index: idx + 1,
      accuracy: item.accuracy,
      speed: item.avgTimePerQuestion,
      date: new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      ratio: `${item.correctCount}/${item.totalQuestions}`
    }));
  }, [historyList]);

  const getMilitaryFeedback = (accuracy: number) => {
    if (accuracy >= 95) {
      return {
        label: 'Sangat Unggul (Kategori A)',
        desc: 'Sangat direkomendasikan untuk kualifikasi perwira militer taruna Unhan.',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      };
    }
    if (accuracy >= 85) {
      return {
        label: 'Unggul (Kategori B)',
        desc: 'Tingkat akurasi tinggi dan fokus prima. Sangat layak bersaing.',
        color: 'text-teal-700 bg-teal-50 border-teal-200'
      };
    }
    if (accuracy >= 70) {
      return {
        label: 'Cukup Cermat (Kategori C)',
        desc: 'Memenuhi batas aman dasar kecermatan. Tingkatkan kecepatan Anda.',
        color: 'text-amber-700 bg-amber-50 border-amber-200'
      };
    }
    return {
      label: 'Kurang / Perlu Latihan (Kategori D)',
      desc: 'Di bawah batas kompetisi seleksi ketat Unhan. Lakukan latihan berkala.',
      color: 'text-rose-700 bg-rose-50 border-rose-200'
    };
  };

  // Active question's symbol table
  const activeQuestion = questions[activeIdx];
  const activeSymbolMap = activeQuestion ? activeQuestion.symbolMap : {};

  // If not authorized, show access code verification screen
  if (!isAuthorized) {
    return (
      <div className={`min-h-screen transition-colors duration-300 font-sans antialiased flex flex-col justify-between ${
        highContrast ? 'bg-zinc-950 text-white' : 'bg-[#f4f7fc]'
      }`}>
        {/* Simple header */}
        <header className={`border-b backdrop-blur-md transition-all duration-300 ${
          highContrast 
            ? 'bg-zinc-900/95 border-zinc-800 text-white' 
            : 'bg-white/95 border-slate-200/80 shadow-xs text-slate-800'
        }`}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-white p-1.5 rounded-xl border border-slate-200/60 shadow-xs">
                <BimbelUnhanLogo className="w-7 h-7" showText={false} textClassName="text-[#0c2640]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold bg-[#0f2942] text-white px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                  BIMBEL MASUK UNHAN
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                id="access-sound-toggle"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  playSound('click', !soundEnabled);
                }}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  soundEnabled ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}
                title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Suara"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                id="access-contrast-toggle"
                onClick={() => setHighContrast(!highContrast)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  highContrast ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                title="Kontras Visual"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main interactive form */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className={`max-w-md w-full rounded-2xl shadow-xl border p-5 sm:p-8 space-y-6 transition-all transform hover:scale-[1.01] ${
            highContrast ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-100 text-[#0f2942]'
          }`}>
            <div className="text-center space-y-3">
              <div className="flex justify-center mb-1">
                <div className="p-4 bg-white rounded-3xl shadow-xs border border-slate-100">
                  <BimbelUnhanLogo className="w-16 h-16 text-[#0c2640]" showText={true} layout="stacked" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-[#0c2640] tracking-tight">
                  Tes Kecermatan Psikologi Unhan
                </h2>
                <p className="text-xs text-slate-500 font-light max-w-[180px] sm:max-w-xs mx-auto leading-relaxed">
                  Simulasi latihan tes kecermatan Pemeriksaan Psikologi (RIKPSI) Unhan 2027
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyAccessCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block text-left">
                  KODE AKSES
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value);
                      if (accessError) setAccessError(null);
                    }}
                    placeholder="MASUKKAN KODE AKSES"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#0c2640] focus:ring-2 focus:ring-[#0c2640]/10 outline-none text-sm font-bold tracking-widest text-center uppercase transition-all bg-slate-50/50"
                    autoFocus
                  />
                </div>
                {accessError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1 justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                    {accessError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#0c2640] hover:bg-[#143d66] text-white font-extrabold py-3.5 rounded-xl transition-all duration-150 text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                Verifikasi &amp; Masuk
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </form>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-left space-y-3">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-widest block">
                💡 INFORMASI AKSES &amp; ADMINISTRATOR
              </span>
              <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                Aplikasi ini mendukung kode akses unik setiap peserta. Bagi peserta yang belum mempunyai kode akses bisa menghubungi admin Bimbel Masuk Unhan (BMU) untuk kode aksesnya.
              </p>
              
              <a
                href="https://wa.me/6285156574081?text=Hello,%20BMU%0ASaya%20ingin%20informasi%20kode%20akses%20untuk%20Tes%20Kecermatan%20Masuk%20Unhan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs text-center cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                Hubungi Admin BMU (WhatsApp)
              </a>

              <div className="space-y-1.5 pt-2 border-t border-amber-500/15">
                <span className="text-[9px] font-bold text-amber-900 block uppercase">Panel Admin (Generator Kode):</span>
                <button
                  onClick={() => {
                    setAccessCode('');
                    setAccessError(null);
                    playSound('click', soundEnabled);
                    triggerAlert('Akses Admin', 'Silakan ketik kode akses admin statis pada kolom input di atas untuk masuk ke Panel Admin.');
                  }}
                  type="button"
                  className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-950 font-bold text-[11px] border border-amber-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-800" />
                  Akses Panel Admin
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 text-center border-t border-slate-200/40">
          <p className="text-xs text-slate-400">
            &copy; 2026 Bimbel Masuk Unhan. All Rights Reserved.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased ${
      highContrast ? 'bg-zinc-950 text-white' : 'bg-[#f4f7fc] text-[#0f2942]'
    }`}>
      
      {/* ==========================================
          HEADER UTILITY PANEL
          ========================================== */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${
        highContrast 
          ? 'bg-zinc-900/95 border-zinc-800 text-white' 
          : 'bg-white/95 border-slate-200/80 shadow-sm text-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex-shrink-0 bg-white p-1 sm:p-1.5 rounded-xl border border-slate-200/60 shadow-xs">
              <BimbelUnhanLogo className="w-6 h-6 sm:w-7 sm:h-7" showText={false} textClassName="text-[#0c2640]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[8px] sm:text-[10px] font-extrabold bg-[#0f2942] text-white px-1.5 py-0.5 rounded uppercase tracking-wider truncate">
                  BIMBEL MASUK UNHAN
                </span>
                <span className="text-[9px] text-amber-500 font-bold tracking-widest uppercase hidden md:inline">
                  • SIMULASI KECERMATAN
                </span>
              </div>
              <h1 className="text-[12px] sm:text-sm md:text-lg font-extrabold tracking-tight leading-tight text-[#0f2942] truncate">
                TES KECERMATAN PSIKOLOGI UNHAN
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-center sm:justify-end w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100/50">
            <button
              id="sound-toggle-btn"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playSound('click', !soundEnabled);
              }}
              className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 ${
                soundEnabled ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 text-slate-400'
              }`}
              title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Suara"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            <button
              id="contrast-toggle-btn"
              onClick={() => setHighContrast(!highContrast)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 ${
                highContrast ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
              }`}
              title="Kontras Visual"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {isAdminLoggedIn && (
              <button
                id="toggle-admin-panel-btn"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setScreen(screen === 'admin' ? 'welcome' : 'admin');
                }}
                className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-black px-2 sm:px-3.5 cursor-pointer shadow-xs ${
                  screen === 'admin' 
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-500/10' 
                    : 'bg-[#0c2640] hover:bg-[#143d66] text-white border border-[#1e4e7e]/50'
                }`}
                title={screen === 'admin' ? "Kembali ke Beranda" : "Kelola Kode Akses Peserta"}
              >
                {screen === 'admin' ? <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
                <span className="hidden sm:inline">{screen === 'admin' ? "Kembali" : "Panel Admin"}</span>
              </button>
            )}

            <button
              id="help-toggle-btn"
              onClick={() => {
                playSound('click', soundEnabled);
                setShowHelp(true);
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-200"
              title="Panduan Petunjuk"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              id="logout-access-btn"
              onClick={handleLogoutAccess}
              className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/80 transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-extrabold px-2 sm:px-3 cursor-pointer"
              title="Kunci Aplikasi"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Kunci</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN AREA CONTENT
          ========================================== */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">

        {/* ==========================================
            ADMIN SCREEN: ACCESSIBLE CODE GENERATOR
            ========================================== */}
        {screen === 'admin' && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fadeIn">
            
            {/* Header Section */}
            <div className={`p-4 sm:p-6 rounded-2xl border transition-all duration-300 ${
              highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200/80 shadow-xs'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        ADMIN CONSOLE
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0f2942] tracking-tight">
                      Generator &amp; Manajemen Kode Akses
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kelola kode login unik untuk masing-masing peserta bimbingan simulasi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="admin-dashboard-back-btn"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setScreen('welcome');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali Ke Dashboard
                  </button>
                  {participantCodes.length > 0 && (
                    <button
                      id="clear-all-codes-btn"
                      onClick={handleClearAllCodes}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-extrabold text-xs uppercase tracking-wider cursor-pointer transition-all"
                    >
                      Hapus Semua Kode
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className={`p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${
                highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200 shadow-2xs'
              }`}>
                <div className="p-3 rounded-xl bg-[#0f2942]/10 text-[#0f2942]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Total Kode</span>
                  <span className="text-2xl font-black text-[#0f2942] leading-none block mt-1">{participantCodes.length}</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${
                highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-[#ecfdf5] border-emerald-100 shadow-2xs'
              }`}>
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600/75 block">Aktif (Belum Dipakai)</span>
                  <span className="text-2xl font-black text-emerald-700 leading-none block mt-1">
                    {participantCodes.filter(c => !c.isUsed).length}
                  </span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${
                highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-[#f8fafc] border-slate-200/60 shadow-2xs'
              }`}>
                <div className="p-3 rounded-xl bg-slate-200/60 text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Sudah Dipakai</span>
                  <span className="text-2xl font-black text-slate-600 leading-none block mt-1">
                    {participantCodes.filter(c => c.isUsed).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Creators and Bulkers layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
              
              {/* Creator Form */}
              <div className={`lg:col-span-5 p-4 sm:p-6 rounded-2xl border transition-all duration-300 ${
                highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200/80 shadow-2xs'
              }`}>
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <Plus className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-base text-[#0f2942]">Buat Kode Tunggal</h3>
                </div>

                <form onSubmit={handleAddCustomCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Kode Akses (Kapital)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={newCustomCode}
                          onChange={(e) => setNewCustomCode(e.target.value.toUpperCase())}
                          placeholder="CONTOH: UNHAN-BUDI"
                          className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#0c2640] focus:ring-2 focus:ring-[#0c2640]/10 outline-none text-xs font-extrabold uppercase tracking-wider transition-all bg-slate-50/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRandomizeCodeField}
                        className="px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/40 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        title="Acak Kode Akses"
                      >
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                        Acak
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Catatan / Nama Peserta
                    </label>
                    <input
                      type="text"
                      value={newCodeNotes}
                      onChange={(e) => setNewCodeNotes(e.target.value)}
                      placeholder="Contoh: Ahmad Dhani - Sesi Siang"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#0c2640] focus:ring-2 focus:ring-[#0c2640]/10 outline-none text-xs transition-all bg-slate-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#0c2640] hover:bg-[#143d66] text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    Tambahkan Kode Akses
                  </button>
                </form>

                <div className="mt-4 sm:mt-8 pt-6 border-t border-slate-100">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest mb-3 block">
                    ⚡ Pembuat Kode Massal (Bulk)
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">
                    Butuh banyak kode secara cepat? Klik tombol di bawah untuk langsung menjerat sekumpulan kode acak dengan format unik.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleGenerateBulk(num)}
                        className="py-2.5 rounded-xl border border-slate-200 hover:border-[#0c2640] hover:bg-[#0c2640]/5 text-[#0c2640] font-extrabold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                      >
                        <span className="text-sm font-black">{num}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Kode Acak</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Codes Table List */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Search / Filter bar */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200 shadow-3xs'
                }`}>
                  <span className="text-xs font-extrabold text-[#0c2640] uppercase tracking-wider">
                    Daftar Kode Akses Aktif ({participantCodes.filter(c => {
                      if (adminCodeFilter === 'active') return !c.isUsed;
                      if (adminCodeFilter === 'used') return c.isUsed;
                      return true;
                    }).length})
                  </span>

                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/40">
                    {(['all', 'active', 'used'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setAdminCodeFilter(mode);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          adminCodeFilter === mode
                            ? 'bg-white text-[#0f2942] shadow-xs'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {mode === 'all' ? 'Semua' : mode === 'active' ? 'Aktif' : 'Terpakai'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Codes view container */}
                <div className={`rounded-2xl border overflow-hidden ${
                  highContrast ? 'bg-zinc-900 border-white' : 'bg-white border-slate-200 shadow-3xs'
                }`}>
                  {participantCodes.filter(c => {
                    if (adminCodeFilter === 'active') return !c.isUsed;
                    if (adminCodeFilter === 'used') return c.isUsed;
                    return true;
                  }).length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-full inline-block text-slate-300 border border-slate-100/60">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">Tidak ada kode akses ditemukan.</p>
                      <p className="text-xs text-slate-400/80">Silakan buat kode baru atau gunakan Bulk Generator.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                      {participantCodes.filter(c => {
                        if (adminCodeFilter === 'active') return !c.isUsed;
                        if (adminCodeFilter === 'used') return c.isUsed;
                        return true;
                      }).map((item) => (
                        <div key={item.code} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-all">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-sm tracking-widest text-[#0f2942]">
                                {item.code}
                              </span>
                              
                              <button
                                type="button"
                                onClick={() => handleCopyToClipboard(item.code)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200/40 transition-all cursor-pointer flex items-center justify-center min-w-[32px] min-h-[24px]"
                                title="Salin Kode Akses"
                              >
                                {copiedCode === item.code ? (
                                  <span className="text-[9px] font-extrabold text-emerald-600 uppercase px-1">Disalin!</span>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <p className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-xs font-semibold">
                              🏷️ {item.notes}
                            </p>

                            <p className="text-[10px] text-slate-400 font-medium">
                              Dibuat: {new Date(item.createdAt).toLocaleDateString('id-ID')} - {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2.5 sm:pt-0 border-t border-slate-100 sm:border-0">
                            {item.isUsed ? (
                              <div className="text-left sm:text-right">
                                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/60 text-slate-500 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                                  Sudah Terpakai
                                </span>
                                {item.usedAt && (
                                  <span className="block text-[9px] text-slate-400 mt-0.5 font-semibold text-left sm:text-right">
                                    {new Date(item.usedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                                Aktif (Ready)
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteCode(item.code)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100/40 cursor-pointer"
                              title="Hapus Kode"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            1. WELCOME SCREEN / STATISTICS DASHBOARD
            ========================================== */}
        {screen === 'welcome' && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fadeIn">
            {/* Admin Alert Banner */}
            {isAdminLoggedIn && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 mt-0.5">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-[#0c2640] text-sm">Mode Administrator Aktif</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Anda masuk sebagai Admin. Anda dapat membuat, memantau, dan menghapus kode akses peserta yang terdaftar secara dinamis.
                    </p>
                  </div>
                </div>
                <button
                  id="admin-open-panel-btn"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    setScreen('admin');
                  }}
                  className="bg-[#0c2640] hover:bg-[#143d66] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 uppercase tracking-wider self-start sm:self-auto shadow-sm"
                >
                  Buka Panel Admin
                </button>
              </div>
            )}

            {/* Config & Progress Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
              
              {/* Left Config Panel */}
              <div className={`lg:col-span-5 p-4 sm:p-6 rounded-2xl border transition-all duration-300 ${
                highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-[#0f2942]">Konfigurasi Tes</h3>
                    <p className="text-xs text-slate-500">Sesuaikan simulasi sebelum pengerjaan</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Select Question Count */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                      Jumlah Soal Simulasi
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[20, 40, 60, 120].map((count) => (
                        <button
                          key={count}
                          id={`config-count-${count}`}
                          onClick={() => {
                            setQuestionCount(count);
                            playSound('click', soundEnabled);
                          }}
                          className={`py-3 px-2 rounded-xl border font-black transition-all duration-150 text-center text-sm ${
                            questionCount === count
                              ? 'border-amber-500 bg-amber-500/10 text-amber-700 font-extrabold'
                              : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          {count}
                          <span className="block text-[9px] font-medium text-slate-400 mt-0.5">Soal</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Durasi Timer Per Soal */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                      Durasi Waktu Per Soal
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="timer-limit-3s"
                        onClick={() => {
                          setQuestionTimerLimit(3);
                          playSound('click', soundEnabled);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          questionTimerLimit === 3
                            ? 'border-amber-500 bg-amber-500/10 text-amber-700 font-extrabold'
                            : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="font-bold text-xs block">3 Detik</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Standar Kategori Keras Unhan</span>
                      </button>

                      <button
                        id="timer-limit-5s"
                        onClick={() => {
                          setQuestionTimerLimit(5);
                          playSound('click', soundEnabled);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          questionTimerLimit === 5
                            ? 'border-amber-500 bg-amber-500/10 text-amber-700 font-extrabold'
                            : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="font-bold text-xs block">5 Detik</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Waktu lebih longgar &amp; taktis</span>
                      </button>
                    </div>
                  </div>



                  <button
                    id="start-session-btn"
                    onClick={() => {
                      setPendingQuestionCount(questionCount);
                      setShowPreTestInstructions(true);
                      playSound('click', soundEnabled);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#0c2640] hover:bg-[#143d66] text-white font-extrabold py-4 rounded-xl shadow-lg transition-all duration-150 text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-amber-400 fill-current" />
                    Mulai Simulasi Sekarang
                  </button>
                </div>
              </div>

              {/* Right Stats Dashboard Panel */}
              <div className={`lg:col-span-7 p-4 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-[#0f2942]">Dasbor Perkembangan</h3>
                        <p className="text-xs text-slate-500 font-light">Monitor perkembangan akurasi taktis militer Anda</p>
                      </div>
                    </div>
                    {historyList.length > 0 && (
                      <button
                        id="view-all-logs"
                        onClick={() => setScreen('history')}
                        className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Riwayat Latihan <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {historyList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <BarChart3 className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">Belum Ada Sesi Tersimpan</p>
                        <p className="text-xs text-slate-400 max-w-sm px-4">
                          Log pencapaian dan analisis performa akan ditampilkan otomatis sesaat setelah Anda merampungkan latihan pertama Anda.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Metric Widgets */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sesi</span>
                          <span className="text-2xl font-black text-[#0f2942]">{performanceStats.total}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Akurasi Rata²</span>
                          <span className={`text-2xl font-black ${
                            performanceStats.avgAccuracy >= 85 ? 'text-emerald-600' : 'text-amber-600'
                          }`}>{performanceStats.avgAccuracy}%</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Skor Terbaik</span>
                          <span className="text-2xl font-black text-amber-500">{performanceStats.bestScore} <span className="text-[10px] text-slate-400 font-medium">Soal</span></span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempo Speed</span>
                          <span className="text-2xl font-black text-slate-700">{performanceStats.avgSpeed}s <span className="text-[9px] text-slate-400 block font-normal">/soal</span></span>
                        </div>
                      </div>

                      {/* Sparkline Graphic chart */}
                      {chartPoints.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tren Perkembangan Akurasi (%)</h4>
                          <div className="h-32 w-full bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-end relative overflow-hidden">
                            {/* SVG Line Chart */}
                            <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                              {/* Horizontal guidelines */}
                              <line x1="0" y1="15" x2="100" y2="15" stroke="#edf2f7" strokeWidth="1" />
                              <line x1="0" y1="50" x2="100" y2="50" stroke="#edf2f7" strokeWidth="1" />
                              <line x1="0" y1="85" x2="100" y2="85" stroke="#edf2f7" strokeWidth="1" />

                              {chartPoints.length > 1 && (
                                <polyline
                                  fill="none"
                                  stroke="#F59E0B"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={chartPoints.map((pt, i) => {
                                    const x = (i / (chartPoints.length - 1)) * 100;
                                    // Mapping accuracy 0-100 to y coordinate (85 to 15)
                                    const y = 85 - (pt.accuracy / 100) * 70;
                                    return `${x},${y}`;
                                  }).join(' ')}
                                />
                              )}
                            </svg>

                            {/* Hover elements and labels */}
                            <div className="absolute inset-0 p-3 flex justify-between items-end z-10">
                              {chartPoints.map((pt, i) => (
                                <div key={i} className="flex flex-col items-center h-full justify-end group relative" style={{ width: `${100 / chartPoints.length}%` }}>
                                  <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                    Skor {pt.ratio} ({pt.accuracy}%)
                                  </div>
                                  <div
                                    className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white shadow transform hover:scale-125 transition-transform"
                                    style={{ marginBottom: `${(pt.accuracy / 100) * 70 - 1.5}px` }}
                                  ></div>
                                  <span className="text-[8px] text-slate-400 font-medium truncate w-full text-center mt-1">
                                    {pt.date}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-[#4b6b88] leading-relaxed mt-4 bg-[#eef5fc] p-4 rounded-xl border border-[#d1e3f8] flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Rekomendasi Seleksi:</strong> Gunakan keyboard <strong>tombol angka</strong> langsung untuk pengisian, dan tombol <strong>panah</strong> atau <strong>Enter</strong> untuk bergeser apabila tidak menggunakan fitur auto-lompat. Pertahankan akurasi minimal <strong>85%</strong>.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            2. SCREEN 2: ACTIVE TESTING SIMULATOR
            ========================================== */}
        {screen === 'testing' && activeQuestion && (
          <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
            
            {/* Upper Status Bar */}
            <div className={`p-4 rounded-xl border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              
              {/* Question Index Progress */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                  SOAL {activeIdx + 1} / {questions.length}
                </span>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold block">Progress Pengerjaan</span>
                  <div className="w-36 bg-slate-100 h-2 rounded-full overflow-hidden mt-1 border border-slate-200">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${((activeIdx + 1) / questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Countdown timer */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-[#0c2640] text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#1e4e7e] shadow-sm flex-shrink-0">
                  <Clock className={`w-4 h-4 ${questionTimeLeft < 1.0 ? 'text-rose-400 animate-pulse' : 'text-amber-400 animate-pulse'}`} />
                  <span className="text-sm sm:text-base font-extrabold font-mono tracking-tight">
                    Timer: {questionTimeLeft.toFixed(1)}s
                  </span>
                </div>

                <button
                  id="header-finish-btn"
                  onClick={() => {
                    if (window.confirm('Simpan dan periksa semua jawaban Anda sekarang?')) {
                      handleCompleteTest();
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-[#0c2640] font-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-md text-xs uppercase tracking-wider cursor-pointer"
                >
                  Periksa Jawaban
                </button>

                <button
                  id="header-exit-btn"
                  onClick={handleCancelTest}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 sm:py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Keluar
                </button>
              </div>

            </div>

            {/* Prompt for First interaction if timer hasn't started */}
            {!hasStartedAnswering && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-semibold animate-pulse">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span>Timer belum berjalan. Ketik angka jawaban Anda untuk memulai hitungan mundur simulasi kecermatan!</span>
              </div>
            )}

            {/* ====================================================================
                DASHBOARD WORKSPACE (MATCHING THE UPLOADED SPECIFICATION IMAGE)
                ==================================================================== */}
            <div className="p-3 sm:p-6 rounded-2xl border border-[#d1e3f8] bg-[#f5f9fc] shadow-sm space-y-5">
              
              {/* Reference Symbols key Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#4b6b88]">
                    Tabel Kode Sandi Simbol
                  </h3>
                </div>

                {/* 10 Symbols reference grid - 5 cols on mobile, 10 cols on desktop so it never requires swiping */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2.5 border border-[#d1e3f8] bg-white rounded-xl p-2 sm:p-4 shadow-xs">
                  {[...ALL_SYMBOLS].sort((a, b) => (activeSymbolMap[a] || 0) - (activeSymbolMap[b] || 0)).map((symbol) => {
                    // Pull mapping corresponding to active question
                    const mapValue = activeSymbolMap[symbol] || 0;
                    return (
                      <div
                        key={symbol}
                        id={`sandi-card-${symbol}`}
                        className="bg-[#eef4fc] border border-[#d1e3f8]/50 rounded-lg py-1 sm:py-2 px-1 sm:px-2 flex flex-col items-center justify-center text-center transform hover:scale-[1.03] transition-all"
                      >
                        <span className="text-[#0c2640] text-sm sm:text-lg font-black font-sans">
                          {symbol}
                        </span>
                        <span className="text-[#4b6b88] text-[9px] sm:text-xs font-mono font-extrabold mt-0.5 sm:mt-1">
                          = {mapValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Math Formula Card - Sized beautifully on mobile with min-height and zero wrapping */}
              <div className="bg-[#eef5fc] border border-[#cbdff2] rounded-2xl p-4 sm:p-10 flex flex-col items-center justify-center gap-4 relative min-h-[160px] sm:min-h-[200px] transition-all shadow-inner overflow-hidden">
                
                {/* Timer countdown bar overlay at top */}
                {hasStartedAnswering && (
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-200/50 rounded-t-2xl overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        questionTimeLeft < 1.0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                      }`}
                      style={{ width: `${(questionTimeLeft / questionTimerLimit) * 100}%` }}
                    ></div>
                  </div>
                )}

                {/* Main calculation components row - Flex nowrap prevents formula break on mobile screens */}
                <div className="flex items-center justify-center gap-2 sm:gap-6 flex-nowrap w-full">
                  
                  {/* Symbol Card 1 */}
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border border-[#c9def0] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-[#0c2640] text-2xl sm:text-4xl font-extrabold font-sans select-none">
                      {activeQuestion.symbol1}
                    </span>
                  </div>

                  {/* Math Operator */}
                  <div className="text-[#0c2640] text-xl sm:text-3xl font-extrabold select-none flex-shrink-0 px-0.5">
                    {activeQuestion.operator}
                  </div>

                  {/* Symbol Card 2 */}
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border border-[#c9def0] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-[#0c2640] text-2xl sm:text-4xl font-extrabold font-sans select-none">
                      {activeQuestion.symbol2}
                    </span>
                  </div>

                  {/* Equals Sign */}
                  <div className="text-[#0c2640] text-xl sm:text-3xl font-extrabold select-none flex-shrink-0 px-0.5">
                    =
                  </div>

                  {/* Interactive Answer Input Square Card */}
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border-2 border-dashed border-[#4b6b88] rounded-xl flex items-center justify-center shadow-inner relative group focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all flex-shrink-0">
                    
                    {/* Floating visual placeholder when empty and not focused */}
                    {activeQuestion.userAnswer === '' && (
                      <div className="absolute pointer-events-none text-[#0c2640]/30 text-2xl sm:text-4xl font-extrabold font-sans">
                        ?
                      </div>
                    )}

                    <input
                      ref={inputRef}
                      type="text"
                      pattern="\d*"
                      inputMode="numeric"
                      value={activeQuestion.userAnswer}
                      onChange={(e) => handleAnswerInput(e.target.value)}
                      placeholder=""
                      autoComplete="off"
                      className="absolute inset-0 w-full h-full text-center bg-transparent text-2xl sm:text-4xl font-extrabold text-[#0c2640] focus:outline-none font-sans z-10"
                    />
                  </div>

                </div>

                {/* Countdown Indicator or Helper Hint */}
                <div className="text-[10px] sm:text-xs text-[#4b6b88] font-medium text-center">
                  <span>Sisa waktu: <strong className="font-bold text-[#0c2640]">{questionTimeLeft.toFixed(1)} detik</strong> sebelum lanjut otomatis!</span>
                </div>

              </div>

            </div>

            {/* Pagination / All questions navigation Belt */}
            <div className={`p-5 rounded-2xl border ${
              highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200 shadow-xs'
            } space-y-4`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Navigasi Lompat Soal
                </span>
                <span className="text-xs text-[#4b6b88]">
                  Total Terjawab: <strong>{questions.filter(q => q.userAnswer !== '').length}</strong> dari {questions.length}
                </span>
              </div>

              {/* Flex block with pagination indices */}
              <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                {questions.map((q, idx) => {
                  const isCurrent = idx === activeIdx;
                  const isAnswered = q.userAnswer !== '';
                  return (
                    <button
                      key={q.id}
                      id={`page-idx-${idx}`}
                      onClick={() => {
                        setActiveIdx(idx);
                        setQuestionTimeLeft(questionTimerLimit);
                        questionEndTimeRef.current = Date.now() + questionTimerLimit * 1000;
                        playSound('click', soundEnabled);
                      }}
                      className={`w-10 h-10 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 font-extrabold ring-4 ring-amber-500/20'
                          : isAnswered
                            ? 'bg-[#0f2942] text-white'
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Next/Prev micro buttons */}
              <div className="flex justify-between gap-4 pt-1">
                <button
                  id="nav-prev-btn"
                  onClick={handlePrevQuestion}
                  disabled={activeIdx === 0}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeIdx === 0
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </button>



                <button
                  id="nav-next-btn"
                  onClick={handleNextQuestion}
                  disabled={activeIdx === questions.length - 1}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeIdx === questions.length - 1
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'bg-[#0f2942] hover:bg-[#143d66] text-white cursor-pointer'
                  }`}
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            3. SCREEN 3: TEST RESULTS / REVIEW PANEL
            ========================================== */}
        {screen === 'results' && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fadeIn max-w-5xl mx-auto">
            
            {/* Main Result Card */}
            <div className={`p-8 rounded-2xl border text-center transition-all duration-300 ${
              highContrast ? 'bg-zinc-900 border-white text-white' : 'bg-white border-slate-200/80 shadow-md'
            }`}>
              
              <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Visual badge */}
                <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-500 mx-auto animate-bounce">
                  <Trophy className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2942]">Simulasi Selesai Diperiksa</h2>
                  <p className="text-sm text-slate-400">Berikut hasil evaluasi menyeluruh berdasarkan kriteria seleksi Taruna Unhan</p>
                </div>

                {/* Score Big Indicator circles */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 max-w-xl mx-auto">
                  
                  {/* Accuracy */}
                  {(() => {
                    const correctAnswers = questions.filter(q => {
                      const ans = q.userAnswer.trim();
                      return ans !== '' && parseInt(ans, 10) === q.correctAnswer;
                    }).length;
                    const accuracyPercent = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
                    
                    return (
                      <div className="p-2.5 sm:p-5 rounded-2xl bg-[#edf5fc] border border-[#d1e3f8] flex flex-col justify-center items-center">
                        <span className="text-xl sm:text-3xl font-black text-amber-500">{accuracyPercent}%</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#4b6b88] uppercase tracking-wider mt-1 block text-center">Akurasi</span>
                      </div>
                    );
                  })()}

                  {/* Ratio Count */}
                  {(() => {
                    const correctAnswers = questions.filter(q => {
                      const ans = q.userAnswer.trim();
                      return ans !== '' && parseInt(ans, 10) === q.correctAnswer;
                    }).length;
                    
                    return (
                      <div className="p-2.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-center items-center">
                        <span className="text-sm sm:text-2xl md:text-3xl font-black text-[#0f2942] break-all text-center">
                          {correctAnswers}/{questions.length}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 block text-center">Benar</span>
                      </div>
                    );
                  })()}

                  {/* Average speed */}
                  <div className="p-2.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-center items-center">
                    <span className="text-xl sm:text-3xl font-black text-slate-700">
                      {parseFloat((timeSpent / questions.length).toFixed(1))}s
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 block text-center">Tempo</span>
                  </div>

                </div>

                {/* Qualitative military feedback indicator */}
                {(() => {
                  const correctAnswers = questions.filter(q => {
                    const ans = q.userAnswer.trim();
                    return ans !== '' && parseInt(ans, 10) === q.correctAnswer;
                  }).length;
                  const accuracyPercent = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
                  const feedback = getMilitaryFeedback(accuracyPercent);

                  return (
                    <div className={`p-4 rounded-xl border text-left space-y-1 ${feedback.color} transition-all`}>
                      <span className="font-extrabold text-sm block flex items-center gap-2">
                        <Award className="w-5 h-5 flex-shrink-0" />
                        Status Kelayakan: {feedback.label}
                      </span>
                      <p className="text-xs opacity-90">{feedback.desc}</p>
                    </div>
                  );
                })()}

                {/* Action Buttons to retry */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center pt-2">
                  <button
                    id="retry-same-btn"
                    onClick={() => handleRetrySameSet(false)}
                    className="flex items-center justify-center gap-2 bg-[#0c2640] hover:bg-[#143d66] text-white font-extrabold px-5 py-3.5 rounded-xl transition-all duration-150 text-xs sm:text-sm cursor-pointer w-full sm:w-auto"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    Coba Lagi Set Ini
                  </button>

                  <button
                    id="retry-shuffled-btn"
                    onClick={() => handleRetrySameSet(true)}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3 rounded-xl border border-slate-200 transition-all duration-150 text-xs sm:text-sm cursor-pointer w-full sm:w-auto"
                  >
                    <Shuffle className="w-4 h-4 text-slate-500" />
                    Coba Lagi (Acak Urutan)
                  </button>

                  <button
                    id="start-new-session"
                    onClick={() => {
                      setPendingQuestionCount(questionCount);
                      setShowPreTestInstructions(true);
                      playSound('click', soundEnabled);
                    }}
                    className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-3 rounded-xl transition-all duration-150 text-xs sm:text-sm cursor-pointer shadow-sm hover:shadow-md w-full sm:w-auto"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Mulai Sesi Baru
                  </button>

                  <button
                    id="back-home-btn"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setScreen('welcome');
                    }}
                    className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold px-5 py-3 rounded-xl border border-slate-200 transition-all duration-150 text-xs sm:text-sm cursor-pointer w-full sm:w-auto"
                  >
                    Dashboard Utama
                  </button>
                </div>

              </div>

            </div>

            {/* Comprehensive review key cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0f2942]" />
                  <h3 className="font-extrabold text-lg text-[#0f2942]">Kunci &amp; Evaluasi Jawaban</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Review soal-soal Anda secara lengkap di bawah ini
                </span>
              </div>

              {/* Review cards Grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {questions.map((q, idx) => {
                  const uAnswer = q.userAnswer.trim();
                  const isCorrect = uAnswer !== '' && parseInt(uAnswer, 10) === q.correctAnswer;
                  const isUnanswered = uAnswer === '';

                  return (
                    <div
                      key={q.id}
                      id={`review-card-${idx}`}
                      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : isUnanswered
                            ? 'border-slate-200 bg-slate-50/70'
                            : 'border-rose-200 bg-rose-50/50'
                      }`}
                    >
                      {/* Top bar info */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">
                          Soal #{q.id}
                        </span>

                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                            <Check className="w-3 h-3" /> Benar
                          </span>
                        ) : isUnanswered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 uppercase">
                            Kosong
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 uppercase">
                            Salah
                          </span>
                        )}
                      </div>

                      {/* Display Formula and calculation with corresponding values */}
                      <div className="flex items-center justify-between p-3.5 bg-white rounded-lg border border-slate-100">
                        
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-slate-800 leading-tight">
                            {q.symbol1}
                          </span>
                          <span className="text-[10px] font-mono text-[#4b6b88] mt-0.5">
                            Val: {q.symbolMap[q.symbol1]}
                          </span>
                        </div>

                        <span className="text-slate-400 font-extrabold">
                          {q.operator}
                        </span>

                        <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-slate-800 leading-tight">
                            {q.symbol2}
                          </span>
                          <span className="text-[10px] font-mono text-[#4b6b88] mt-0.5">
                            Val: {q.symbolMap[q.symbol2]}
                          </span>
                        </div>

                        <span className="text-slate-400 font-extrabold">=</span>

                        {/* Calculations result output */}
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-amber-500 leading-tight">
                            {q.correctAnswer}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                            Kunci
                          </span>
                        </div>

                      </div>

                      {/* Answer comparisons bar */}
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-slate-200/60">
                        <span className="text-slate-400">Jawaban Anda:</span>
                        <span className={`font-black ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isUnanswered ? 'Belum Diisi' : uAnswer}
                        </span>
                      </div>

                      {/* Explicit correction guide if incorrect */}
                      {!isCorrect && (
                        <div className="text-[10px] text-slate-400 bg-white/70 p-2 rounded border border-slate-100 mt-1">
                          Sandi: <strong>{q.symbol1} ({q.symbolMap[q.symbol1]})</strong> {q.operator} <strong>{q.symbol2} ({q.symbolMap[q.symbol2]})</strong> = <strong>{q.correctAnswer}</strong>.
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            4. SCREEN 4: DETAILED HISTORY / LOGS
            ========================================== */}
        {screen === 'history' && (
          <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <button
                  id="history-back-btn"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    setScreen('welcome');
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f2942] flex items-center gap-2">
                    <History className="w-5.5 h-5.5 text-amber-500" />
                    Riwayat Latihan
                  </h2>
                  <p className="text-xs text-slate-400 font-light">
                    Kumpulan data statistik dari latihan-latihan sebelumnya
                  </p>
                </div>
              </div>

              {/* Filtering + Clear actions */}
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                <select
                  id="history-filter"
                  value={historyFilter}
                  onChange={(e) => {
                    setHistoryFilter(e.target.value);
                    playSound('click', soundEnabled);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="all">Semua Jumlah Soal</option>
                  <option value="20">20 Soal</option>
                  <option value="40">40 Soal</option>
                  <option value="60">60 Soal</option>
                  <option value="120">120 Soal</option>
                </select>

                <button
                  id="clear-all-history"
                  onClick={handleClearAllHistoryLogs}
                  className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Semua
                </button>
              </div>
            </div>

            {/* List Records */}
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 sm:py-10 sm:py-20 text-center space-y-4 bg-white border border-slate-100 rounded-2xl shadow-xs">
                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <AlertTriangle className="w-6 h-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Tidak Ada Log Riwayat</p>
                  <p className="text-xs text-slate-400">Tidak ditemukan log riwayat yang sesuai dengan saringan Anda.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((item) => {
                  const dateStr = new Date(item.date).toLocaleString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={item.id}
                      id={`history-item-${item.id}`}
                      className={`p-5 rounded-2xl border bg-white border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black bg-slate-100 text-[#0f2942] px-2.5 py-0.5 rounded uppercase">
                            {item.totalQuestions} Soal
                          </span>
                          <span className="text-xs font-black bg-amber-500/10 text-amber-700 px-2.5 py-0.5 rounded uppercase">
                            {item.timerMode === 'per-soal' ? 'Timer Per Soal' : 'Timer Kumulatif'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {dateStr}
                          </span>
                        </div>

                        {/* Small summary text */}
                        <div className="text-xs text-[#4b6b88] font-light">
                          Skor: <strong className="font-bold text-[#0c2640]">{item.correctCount} benar</strong>, {item.wrongCount} salah, {item.unansweredCount} kosong. Selesai dalam {item.timeSpent}s.
                        </div>
                      </div>

                      {/* Left side actions and percentages */}
                      <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Akurasi</span>
                          <span className={`text-xl font-black ${
                            item.accuracy >= 85 ? 'text-emerald-600' : 'text-amber-500'
                          }`}>{item.accuracy}%</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Kec. Jawab</span>
                          <span className="text-xl font-black text-slate-700">{item.avgTimePerQuestion}s <span className="text-[10px] text-slate-400 font-normal">/soal</span></span>
                        </div>

                        <button
                          id={`delete-log-${item.id}`}
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Hapus Rekaman"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* ==========================================
          5. MODAL / RULES HELP POPUP
          ========================================== */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-5 sm:p-8 space-y-6 border border-slate-100">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-6 h-6 text-amber-500" />
                <h3 className="font-black text-lg sm:text-xl text-[#0c2640]">Petunjuk &amp; Aturan Tes Kecermatan</h3>
              </div>
              <button
                id="close-guide-modal"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setShowHelp(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-extrabold p-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[#4b6b88] leading-relaxed font-light">
              
              <div className="space-y-1 bg-[#eef5fc] border border-[#d1e3f8] p-4 rounded-xl">
                <strong className="text-[#0c2640] font-bold block mb-1">Mekanisme Pengacakan &amp; Operasi Simbol:</strong>
                <p className="mb-2">Terdapat <strong>10 Sandi Simbol</strong> yang diacak nilainya secara acak unik dari 1 sampai 10. Tabel kode sandi ditampilkan secara <strong>berurutan 1 sampai 10</strong> untuk memudahkan pencarian visual.</p>
                <p>Operasi matematika yang diuji adalah <strong>penumlahan saja</strong>. Kunci jawaban adalah <strong>angka terakhir (angka satuan)</strong> dari hasil penjumlahan tersebut (Contoh: jika hasil penjumlahan adalah 13, maka kunci jawabannya adalah 3. Jika hasil penjumlahan adalah 10, kunci jawabannya adalah 0).</p>
              </div>

              <div className="space-y-2">
                <strong className="text-[#0c2640] font-extrabold block uppercase tracking-wider text-xs">Aturan Timer:</strong>
                <ul className="list-disc list-inside space-y-1.5 pl-1.5">
                  <li>
                    <strong>Timer Per Soal:</strong> Tiap-tiap soal diberikan waktu persis <strong>3 Detik</strong>. Jika waktu habis, jawaban yang sudah Anda ketik akan <strong>tetap tersimpan</strong>, lalu sistem mengeluarkan peringatan suara buzzer singkat dan bergeser otomatis ke pertanyaan selanjutnya.
                  </li>
                  <li>
                    <strong>Timer Kumulatif:</strong> Anda diberikan waktu akumulasi setara 3 detik dikali jumlah total soal (misal: 120 detik untuk 40 soal) untuk merampungkan seluruh pengerjaan soal secara santai namun mantap.
                  </li>
                </ul>
              </div>



              <div className="space-y-1">
                <strong className="text-[#0c2640] font-extrabold block uppercase tracking-wider text-xs">Penetapan Kategori Akurasi Unhan:</strong>
                <ul className="space-y-1">
                  <li>🚀 <strong>&gt;= 95%:</strong> Sangat Unggul (Kategori A)</li>
                  <li>✨ <strong>&gt;= 85%:</strong> Unggul (Kategori B)</li>
                  <li>✅ <strong>&gt;= 70%:</strong> Cukup Cermat (Kategori C)</li>
                  <li>⚠️ <strong>&lt; 70%:</strong> Kurang Cermat (Kategori D)</li>
                </ul>
              </div>

            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                id="modal-understand-btn"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setShowHelp(false);
                }}
                className="bg-[#0c2640] hover:bg-[#143d66] text-white font-bold px-6 py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                Saya Mengerti
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ==========================================
          5.1. PRE-TEST INSTRUCTIONS MODAL
          ========================================== */}
      {showPreTestInstructions && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-8 space-y-6 border border-slate-100">
            
            {/* Header branding */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-xs">
                  <BimbelUnhanLogo className="w-10 h-10" showText={false} textClassName="text-[#0c2640]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold bg-[#0c2640] text-white px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                    BIMBEL MASUK UNHAN
                  </span>
                  <h3 className="font-black text-lg sm:text-xl text-[#0c2640] mt-0.5">Petunjuk Pengerjaan Tes</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  playSound('click', soundEnabled);
                  setShowPreTestInstructions(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-extrabold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Batalkan
              </button>
            </div>

            {/* Core instructions based on exact Unhan constraints */}
            <div className="space-y-4 text-xs sm:text-sm text-[#4b6b88] leading-relaxed font-light">
              
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>Aturan Utama Kunci Jawaban (Sandi Simbol)</span>
                </div>
                <p className="text-[#0c2640] font-medium">
                  Tabel kode sandi simbol diletakkan berurutan dari angka 1 s.d 10. Carilah nilai masing-masing simbol dari tabel tersebut, kemudian jumlahkan nilainya.
                </p>
                <div className="mt-2 bg-white/80 p-3 rounded-lg border border-amber-500/10 space-y-1.5">
                  <p className="text-slate-800 text-xs font-bold flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-slate-950 rounded-full font-black text-[10px]">!</span>
                    Rumus Nilai Hasil Akhir (Satuan Terakhir)
                  </p>
                  <p className="text-slate-600 text-xs pl-6">
                    Bila jumlah penjumlahan bernilai lebih dari 10 atau bernilai puluhan, maka yang menjadi kunci jawaban hanya <strong>angka satuannya (angka terakhir)</strong> saja.
                  </p>
                  <div className="pl-6 pt-1 text-slate-700 font-mono text-xs space-y-1">
                    <div>• Contoh 1: <strong className="text-emerald-600">6 + 7 = 13</strong> &rarr; Jawaban: <strong className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">3</strong></div>
                    <div>• Contoh 2: <strong className="text-emerald-600">5 + 5 = 10</strong> &rarr; Jawaban: <strong className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">0</strong></div>
                    <div>• Contoh 3: <strong className="text-emerald-600">4 + 2 = 6</strong> &rarr; Jawaban: <strong className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">6</strong></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
                  <span className="font-extrabold text-xs text-[#0c2640] uppercase tracking-wider block">⏱️ Waktu Per Soal:</span>
                  <p className="text-xs text-slate-600">
                    Setiap soal memiliki batasan waktu <strong>{questionTimerLimit} Detik</strong>. Selesaikan sebelum waktu habis!
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
                  <span className="font-extrabold text-xs text-[#0c2640] uppercase tracking-wider block">💾 Penyimpanan Otomatis:</span>
                  <p className="text-xs text-slate-600">
                    Jika waktu habis dan Anda sedang mengisi, jawaban tersebut <strong>tetap tersimpan</strong> dan sistem akan otomatis lanjut ke soal berikutnya.
                  </p>
                </div>
              </div>



            </div>

            <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="text-xs text-slate-400">
                Jumlah soal: <span className="font-extrabold text-slate-600">{pendingQuestionCount} soal</span> | Durasi: <span className="font-extrabold text-slate-600">{questionTimerLimit}s/soal</span>
              </div>
              <button
                onClick={() => {
                  setShowPreTestInstructions(false);
                  handleStartNewTest(pendingQuestionCount);
                }}
                className="w-full sm:w-auto bg-[#0c2640] hover:bg-[#143d66] text-white font-extrabold px-8 py-3.5 rounded-xl transition-all duration-150 text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 text-amber-400 fill-current" />
                Mulai Tes Sekarang
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          5.2. CANCEL TEST CONFIRMATION MODAL
          ========================================== */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-100 text-center space-y-5">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-[#0c2640]">Batalkan Simulasi Latihan?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Seluruh kemajuan dan jawaban aktif Anda pada sesi pengerjaan ini akan hilang secara permanen.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
              >
                Lanjutkan Latihan
              </button>
              <button
                onClick={executeCancelTest}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          5.3. CLEAR ALL HISTORY CONFIRMATION MODAL
          ========================================== */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-100 text-center space-y-5">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-[#0c2640]">Hapus Semua Riwayat Latihan?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Seluruh catatan simulasi dan statistik Anda sebelumnya akan dihapus secara permanen dari sistem ini. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeClearAllHistoryLogs}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          5.4. DELETE SINGLE HISTORY ITEM MODAL
          ========================================== */}
      {deleteItemId && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-100 text-center space-y-5">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-[#0c2640]">Hapus Rekaman Sejarah?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Apakah Anda ingin menghapus catatan sejarah latihan terpilih ini dari daftar riwayat Anda?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteItemId(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeDeleteHistoryItem}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Hapus Rekaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          5.5. CUSTOM CODES CONFIRMATION DIALOG MODAL
          ========================================== */}
      {customConfirm && customConfirm.isOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-100 text-center space-y-5">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-[#0c2640]">{customConfirm.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                {customConfirm.message}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCustomConfirm(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={customConfirm.onConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          5.6. CUSTOM CODES ALERT DIALOG MODAL
          ========================================== */}
      {customAlert && customAlert.isOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-100 text-center space-y-5">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-[#0c2640]">{customAlert.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                {customAlert.message}
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setCustomAlert(null)}
                className="w-full py-3 px-4 rounded-xl bg-[#0c2640] hover:bg-[#143d66] text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          FOOTER COPYRIGHT
          ========================================== */}
      <footer className="max-w-7xl mx-auto px-4 py-6 sm:py-10 mt-6 sm:mt-12 border-t border-slate-200/60 text-center">
        <p className="text-xs text-slate-400 font-light">
          Simulasi Tes Kecermatan Seleksi Masuk Unhan v2.0 • Dioptimalkan untuk Kecepatan Refleks &amp; Konsentrasi Tinggi.
        </p>
      </footer>

    </div>
  );
}
