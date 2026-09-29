'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Download,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Gamepad2,
  CheckCircle2,
  X,
  Layers,
  ArrowUpDown,
  Sliders,
  Info,
  Save,
  Flame,
  Swords,
  Medal,
  Eye,
  Check,
  Lock,
  Send,
  FileSpreadsheet,
  FileText,
  Printer,
  Globe2,
  Edit3
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { getTournamentBySlug } from '@/lib/tournaments-db';
import { getXenovaSession } from '@/lib/auth-session';

interface ScoringRule {
  id: string;
  tournament_id: string;
  name: string;
  type: 'PER_UNIT' | 'OCCURRENCE' | 'PENALTY' | 'PLACEMENT';
  points_per_unit: number;
  sort_order: number;
  placement_points: { placement: number; points: number }[];
}

interface MatchTeamResult {
  rank?: number;
  team_id: string;
  team_name: string;
  captain_name: string;
  captain_in_game_name: string;
  college?: string;
  pass_id: string;
  raw_scores: Record<string, number>;
  calculated_scores: Record<string, number>;
  total_points: number;
  attended_at?: string;
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  match_number: number;
  title: string;
  status: string;
  created_at?: string;
}

interface StandingsTeamRow {
  rank: number;
  team_id: string;
  team_name: string;
  captain_name: string;
  captain_in_game_name: string;
  college?: string;
  pass_id?: string;
  match_scores: Record<string, number>;
  match_breakdowns: Record<
    string,
    {
      match_id: string;
      match_title: string;
      match_number: number;
      total_points: number;
      raw_scores: Record<string, number>;
      calculated_scores: Record<string, number>;
    }
  >;
  overall_total: number;
}

export default function OrganizerLeaderboardPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = decodeURIComponent((params?.id as string) || '').trim();

  const [session, setSession] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [columns, setColumns] = useState<ScoringRule[]>([]);
  const [counts, setCounts] = useState<{ registered: number; present: number; matches: number }>({
    registered: 0,
    present: 0,
    matches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active navigation tab: 'standings' (Phase 4), 'matches' (Phase 3), 'rules' (Phase 2)
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'rules'>('standings');

  // Phase 4: Cumulative Standings State
  const [standings, setStandings] = useState<StandingsTeamRow[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Phase 3: Match State
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchTeams, setMatchTeams] = useState<MatchTeamResult[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [savingResults, setSavingResults] = useState(false);

  // Raw score input state: keyed by team_id -> { rule_id: number | string }
  const [rawInputs, setRawInputs] = useState<Record<string, Record<string, any>>>({});

  // Match Modals state
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [newMatchTitle, setNewMatchTitle] = useState('');
  const [deleteConfirmMatch, setDeleteConfirmMatch] = useState<TournamentMatch | null>(null);

  // Scoring Rules Modals state (Phase 2 foundation reused)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<ScoringRule | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form State for Add / Edit Rule
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'PER_UNIT' | 'OCCURRENCE' | 'PENALTY' | 'PLACEMENT'>('PER_UNIT');
  const [formPointsPerUnit, setFormPointsPerUnit] = useState<number>(1);
  const [formPlacementMatrix, setFormPlacementMatrix] = useState<{ placement: number; points: number }[]>([
    { placement: 1, points: 12 },
    { placement: 2, points: 9 },
    { placement: 3, points: 8 },
    { placement: 4, points: 7 },
    { placement: 5, points: 6 },
    { placement: 6, points: 5 },
    { placement: 7, points: 4 },
    { placement: 8, points: 3 },
    { placement: 9, points: 2 },
    { placement: 10, points: 1 },
  ]);

  // Phase 5 & 6: Finalization, Export, Review & Approval State
  const [tournamentStatus, setTournamentStatus] = useState<'LIVE' | 'FINALIZED' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED' | string>('LIVE');
  const [statusDetails, setStatusDetails] = useState<{
    is_locked: boolean;
    finalized_at: string | null;
    finalized_by: string | null;
    submitted_at: string | null;
    submitted_by: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
    published_at?: string | null;
    published_by?: string | null;
    change_request_reason?: string | null;
    change_requested_by?: string | null;
    change_requested_at?: string | null;
    submission_id?: string | null;
  }>({
    is_locked: false,
    finalized_at: null,
    finalized_by: null,
    submitted_at: null,
    submitted_by: null,
    approved_at: null,
    approved_by: null,
    published_at: null,
    published_by: null,
    change_request_reason: null,
    change_requested_by: null,
    change_requested_at: null,
  });

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | 'html' | null>(null);

  const isLocked = Boolean(
    statusDetails.is_locked ||
    tournamentStatus === 'FINALIZED' ||
    tournamentStatus === 'SUBMITTED' ||
    tournamentStatus === 'APPROVED' ||
    tournamentStatus === 'PUBLISHED'
  );

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3800);
  };

  // ════════════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ════════════════════════════════════════════════════════════════════════════════

  const loadMatchDetails = async (targetSlug: string, matchId: string, currentRules?: ScoringRule[]) => {
    setMatchLoading(true);
    try {
      const res = await flaskApi.getMatchDetails(targetSlug, matchId);
      if (res && res.success) {
        const teamsData: MatchTeamResult[] = res.teams || [];
        setMatchTeams(teamsData);

        // Populate rawInputs state
        const initialInputs: Record<string, Record<string, any>> = {};
        teamsData.forEach((t) => {
          initialInputs[t.team_id] = {};
          const activeCols = currentRules || columns;
          activeCols.forEach((col) => {
            initialInputs[t.team_id][col.id] = t.raw_scores?.[col.id] !== undefined ? t.raw_scores[col.id] : 0;
          });
        });
        setRawInputs(initialInputs);
      } else {
        showToast('error', res?.message || 'Failed to load match details.');
      }
    } catch (e) {
      console.error('Failed to load match details:', e);
      showToast('error', 'Error loading match details.');
    } finally {
      setMatchLoading(false);
    }
  };

  const loadData = async (targetSlug: string, preferredMatchId?: string) => {
    try {
      // 1. Fetch tournament metadata
      const tourn = await getTournamentBySlug(targetSlug);
      setTournament(tourn || { slug: targetSlug, title: targetSlug, game: 'Free Fire', format: 'Battle Royale' });

      // 2. Fetch Leaderboard columns & attendance counts
      const res = await flaskApi.getOrganizerLeaderboard(targetSlug);
      let loadedColumns: ScoringRule[] = [];
      if (res && res.success) {
        loadedColumns = res.columns || [];
        setColumns(loadedColumns);
      }

      // 3. Fetch Matches
      const matchesRes = await flaskApi.getTournamentMatches(targetSlug);
      let matchList: TournamentMatch[] = [];
      if (matchesRes && matchesRes.success) {
        matchList = matchesRes.matches || [];
        setMatches(matchList);

        let targetMatchId = preferredMatchId || selectedMatchId;
        const exists = matchList.some((m) => m.id === targetMatchId);
        if (!exists && matchList.length > 0) {
          targetMatchId = matchList[0].id;
        } else if (matchList.length === 0) {
          targetMatchId = null;
          setMatchTeams([]);
        }

        setSelectedMatchId(targetMatchId);

        if (targetMatchId) {
          await loadMatchDetails(targetSlug, targetMatchId, loadedColumns);
        }
      }

      // 4. Fetch Phase 4 Live Standings
      const standingsRes = await flaskApi.getTournamentStandings(targetSlug);
      if (standingsRes && standingsRes.success) {
        setStandings(standingsRes.standings || []);
        if (standingsRes.counts) {
          setCounts({
            registered: standingsRes.counts.registered || 0,
            present: standingsRes.counts.present || 0,
            matches: standingsRes.counts.matches || matchList.length,
          });
        }
      } else if (res && res.counts) {
        setCounts({
          registered: res.counts.registered || 0,
          present: res.counts.present || 0,
          matches: matchList.length,
        });
      }

      // 5. Fetch Phase 5 & 6 Tournament Status (LIVE / FINALIZED / SUBMITTED / CHANGES_REQUESTED / APPROVED / PUBLISHED)
      const statusRes = await flaskApi.getTournamentLeaderboardStatus(targetSlug);
      if (statusRes && statusRes.success) {
        setTournamentStatus(statusRes.status || 'LIVE');
        setStatusDetails({
          is_locked: !!statusRes.is_locked,
          finalized_at: statusRes.finalized_at || null,
          finalized_by: statusRes.finalized_by || null,
          submitted_at: statusRes.submitted_at || null,
          submitted_by: statusRes.submitted_by || null,
          approved_at: statusRes.approved_at || null,
          approved_by: statusRes.approved_by || null,
          published_at: statusRes.published_at || null,
          published_by: statusRes.published_by || null,
          change_request_reason: statusRes.change_request_reason || null,
          change_requested_by: statusRes.change_requested_by || null,
          change_requested_at: statusRes.change_requested_at || null,
          submission_id: statusRes.submission_id || null,
        });
      }
    } catch (e) {
      console.error('Failed to load organizer leaderboard:', e);
      showToast('error', 'Failed to load leaderboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const user = getXenovaSession();
    if (!user) {
      router.replace('/login');
      return;
    }
    setSession(user);
    loadData(rawId);
  }, [router, rawId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(rawId, selectedMatchId || undefined);
  };

  // ════════════════════════════════════════════════════════════════════════════════
  // MATCH MANAGEMENT (PHASE 3)
  // ════════════════════════════════════════════════════════════════════════════════

  const handleSelectMatch = async (matchId: string) => {
    setSelectedMatchId(matchId);
    await loadMatchDetails(rawId, matchId);
  };

  const handleOpenAddMatchModal = () => {
    const nextNum = matches.length + 1;
    setNewMatchTitle(`Match ${nextNum}`);
    setShowAddMatchModal(true);
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const res = await flaskApi.createTournamentMatch(rawId, {
        title: newMatchTitle.trim() || undefined,
      });

      if (res && res.success && res.match) {
        showToast('success', `${res.match.title} created successfully!`);
        setShowAddMatchModal(false);
        setNewMatchTitle('');
        await loadData(rawId, res.match.id);
        setActiveTab('matches');
      } else {
        showToast('error', res?.message || 'Failed to create match.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error creating match.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!deleteConfirmMatch) return;
    setModalLoading(true);
    try {
      const res = await flaskApi.deleteTournamentMatch(rawId, deleteConfirmMatch.id);
      if (res && res.success) {
        showToast('success', `${deleteConfirmMatch.title} deleted.`);
        setDeleteConfirmMatch(null);
        await loadData(rawId);
      } else {
        showToast('error', res?.message || 'Failed to delete match.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error deleting match.');
    } finally {
      setModalLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════════
  // RAW SCORE INPUT & AUTOMATIC RECALCULATION
  // ════════════════════════════════════════════════════════════════════════════════

  const handleRawScoreChange = (teamId: string, ruleId: string, val: string) => {
    setRawInputs((prev) => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [ruleId]: val,
      },
    }));
  };

  const handleSaveMatchResults = async () => {
    if (!selectedMatchId) {
      showToast('error', 'No match selected.');
      return;
    }

    if (matchTeams.length === 0) {
      showToast('info', 'No PRESENT teams available to record scores.');
      return;
    }

    setSavingResults(true);
    try {
      // Build results payload with entered RAW scores
      const payloadResults = matchTeams.map((t) => {
        const teamRaw = rawInputs[t.team_id] || {};
        const sanitizedRaw: Record<string, number> = {};
        columns.forEach((col) => {
          const rawVal = teamRaw[col.id];
          sanitizedRaw[col.id] = rawVal !== undefined && rawVal !== '' ? Number(rawVal) : 0;
        });

        return {
          team_id: t.team_id,
          raw_scores: sanitizedRaw,
        };
      });

      const res = await flaskApi.saveMatchResults(rawId, selectedMatchId, payloadResults);
      if (res && res.success) {
        showToast('success', `Scores automatically calculated and saved by server!`);
        // Refresh both match details and cumulative standings
        await loadData(rawId, selectedMatchId);
      } else {
        showToast('error', res?.message || 'Failed to save match scores.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error saving match results.');
    } finally {
      setSavingResults(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════════
  // SCORING RULE MANAGEMENT (PHASE 2 FOUNDATION REUSED)
  // ════════════════════════════════════════════════════════════════════════════════

  const openAddModal = () => {
    setEditingRule(null);
    setFormName('');
    setFormType('PER_UNIT');
    setFormPointsPerUnit(1);
    setFormPlacementMatrix([
      { placement: 1, points: 12 },
      { placement: 2, points: 9 },
      { placement: 3, points: 8 },
      { placement: 4, points: 7 },
      { placement: 5, points: 6 },
      { placement: 6, points: 5 },
      { placement: 7, points: 4 },
      { placement: 8, points: 3 },
      { placement: 9, points: 2 },
      { placement: 10, points: 1 },
    ]);
    setShowAddModal(true);
  };

  const openEditModal = (rule: ScoringRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormType(rule.type);
    setFormPointsPerUnit(rule.points_per_unit);
    if (rule.type === 'PLACEMENT' && rule.placement_points && rule.placement_points.length > 0) {
      setFormPlacementMatrix([...rule.placement_points]);
    } else {
      setFormPlacementMatrix([
        { placement: 1, points: 12 },
        { placement: 2, points: 9 },
        { placement: 3, points: 8 },
      ]);
    }
    setShowAddModal(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('error', 'Column name is required.');
      return;
    }

    setModalLoading(true);
    try {
      const payload: any = {
        name: formName.trim(),
        type: formType,
        points_per_unit: formPointsPerUnit,
      };

      if (formType === 'PLACEMENT') {
        payload.placement_points = formPlacementMatrix.map((p) => ({
          placement: Number(p.placement),
          points: Number(p.points),
        }));
      }

      if (editingRule) {
        const res = await flaskApi.updateScoringRule(rawId, editingRule.id, payload);
        if (res.success) {
          showToast('success', `Scoring rule "${formName}" updated. All match results and standings recalculated.`);
          setShowAddModal(false);
          await loadData(rawId, selectedMatchId || undefined);
        } else {
          showToast('error', res.message || 'Failed to update column.');
        }
      } else {
        payload.sort_order = columns.length + 1;
        const res = await flaskApi.createScoringRule(rawId, payload);
        if (res.success) {
          showToast('success', `Scoring column "${formName}" added successfully.`);
          setShowAddModal(false);
          await loadData(rawId, selectedMatchId || undefined);
        } else {
          showToast('error', res.message || 'Failed to add column.');
        }
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error saving scoring column.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteConfirmRule) return;
    setModalLoading(true);
    try {
      const res = await flaskApi.deleteScoringRule(rawId, deleteConfirmRule.id);
      if (res.success) {
        showToast('success', `Scoring column "${deleteConfirmRule.name}" deleted. Standings recalculated.`);
        setDeleteConfirmRule(null);
        await loadData(rawId, selectedMatchId || undefined);
      } else {
        showToast('error', res.message || 'Failed to delete column.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error deleting column.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddPlacementRow = () => {
    const nextPlacement =
      formPlacementMatrix.length > 0 ? Math.max(...formPlacementMatrix.map((p) => p.placement)) + 1 : 1;
    setFormPlacementMatrix([...formPlacementMatrix, { placement: nextPlacement, points: 0 }]);
  };

  const handleRemovePlacementRow = (index: number) => {
    setFormPlacementMatrix(formPlacementMatrix.filter((_, i) => i !== index));
  };

  const handlePlacementPointChange = (index: number, points: number) => {
    const updated = [...formPlacementMatrix];
    updated[index].points = points;
    setFormPlacementMatrix(updated);
  };

  // ════════════════════════════════════════════════════════════════════════════════
  // PHASE 5: FINALIZATION, EXPORT & SUBMISSION ACTIONS
  // ════════════════════════════════════════════════════════════════════════════════

  const handleOpenFinalizeModal = () => {
    if (matches.length === 0) {
      showToast('error', 'Cannot finalize tournament: at least one match must exist.');
      return;
    }
    setShowFinalizeModal(true);
  };

  const handleConfirmFinalize = async () => {
    setFinalizing(true);
    try {
      const res = await flaskApi.finalizeTournamentResults(rawId);
      if (res && res.success) {
        showToast('success', 'Tournament results successfully finalized! Scoring rules and match results are now locked.');
        setShowFinalizeModal(false);
        await loadData(rawId, selectedMatchId || undefined);
      } else {
        showToast('error', res?.message || 'Failed to finalize tournament results.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error finalizing tournament results.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleOpenSubmitModal = () => {
    if (tournamentStatus !== 'FINALIZED') {
      showToast('error', 'You must finalize results before submitting to Admin.');
      return;
    }
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await flaskApi.submitTournamentResults(rawId, {
        notes: submitNotes.trim() || undefined,
      });
      if (res && res.success) {
        showToast('success', 'Tournament results submitted to Admin! Status: Awaiting Admin Review.');
        setShowSubmitModal(false);
        await loadData(rawId, selectedMatchId || undefined);
      } else {
        showToast('error', res?.message || 'Failed to submit tournament results.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error submitting tournament results.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleExportDownload = async (format: 'csv' | 'xlsx' | 'html') => {
    setExportingFormat(format);
    try {
      if (format === 'html') {
        const url = flaskApi.getLeaderboardExportUrl(rawId, 'html');
        window.open(url, '_blank');
        showToast('success', 'Printable PDF preview opened in a new tab.');
      } else {
        const res = await flaskApi.downloadLeaderboardExport(rawId, format);
        if (res && res.success && res.blob) {
          const blobUrl = window.URL.createObjectURL(res.blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = res.filename || `leaderboard_${rawId}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          showToast('success', `${format.toUpperCase()} export downloaded successfully.`);
        } else {
          showToast('error', res?.message || `Failed to export ${format.toUpperCase()}.`);
        }
      }
    } catch (e: any) {
      showToast('error', e?.message || `Error downloading export.`);
    } finally {
      setExportingFormat(null);
    }
  };

  const toggleExpandTeam = (teamId: string) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  const jumpToMatchEdit = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveTab('matches');
    loadMatchDetails(rawId, matchId);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Tournament Leaderboard...</p>
        </div>
      </div>
    );
  }

  const activeMatchObj = matches.find((m) => m.id === selectedMatchId);

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-8 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-300'
                : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-indigo-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">

        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href={`/organizer/tournament/${rawId}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-400 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournament Hub
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/organizer/tournament/${rawId}/attendance`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 rounded-xl transition"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Attendance Desk
            </Link>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 rounded-xl transition cursor-pointer"
              title="Refresh Leaderboard & Standings"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Sync
            </button>
          </div>
        </div>

        {/* Header Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0C111D] p-6 sm:p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {tournamentStatus === 'LIVE' ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Live Cumulative Leaderboard
                  </span>
                ) : tournamentStatus === 'FINALIZED' ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Final Results • Locked
                  </span>
                ) : tournamentStatus === 'CHANGES_REQUESTED' ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Changes Requested by Admin
                  </span>
                ) : tournamentStatus === 'APPROVED' ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Results Approved by Admin
                  </span>
                ) : tournamentStatus === 'PUBLISHED' ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                    <Globe2 className="h-3 w-3" /> Results Published Live
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Final Results • Submitted
                  </span>
                )}
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {tournament?.game || 'Free Fire'} • {tournament?.format || 'Battle Royale'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
                {tournament?.title || tournament?.name || rawId}
              </h1>

              <p className="text-xs text-slate-400 max-w-2xl">
                Real-time tournament standings calculated automatically from all match totals. Only verified present squads appear. Ranks and overall totals are server-authoritative.
              </p>
            </div>

            {/* Attendance & Stats Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[90px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registered</p>
                <p className="text-2xl font-black text-white">{counts.registered}</p>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center min-w-[90px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Present (Active)</p>
                <p className="text-2xl font-black text-emerald-300">{counts.present}</p>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center min-w-[90px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Matches</p>
                <p className="text-2xl font-black text-amber-300">{matches.length}</p>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-center min-w-[90px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Scoring Rules</p>
                <p className="text-2xl font-black text-indigo-300">{columns.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 5 & 6 Status Lifecycle Notice Banners */}
        {tournamentStatus === 'FINALIZED' && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-wider text-amber-200">
                  Tournament Results Finalized & Locked
                </p>
                <p className="text-[11px] text-amber-300/80">
                  Matches, raw scores, and scoring rules are frozen. Export the complete table or submit to Admin for review.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenSubmitModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-purple-950/40 transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Results to Admin
              </button>
            </div>
          </div>
        )}

        {tournamentStatus === 'SUBMITTED' && (
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-300 flex items-center gap-3 shadow-xl">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-wider text-purple-200">
                Results Submitted — Awaiting Admin Review
              </p>
              <p className="text-[11px] text-purple-300/80">
                Results and final standings have been safely transmitted for administrative review. Editing is locked.
              </p>
            </div>
          </div>
        )}

        {tournamentStatus === 'CHANGES_REQUESTED' && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-rose-200">
                  Admin Requested Changes
                </p>
                {statusDetails.change_request_reason && (
                  <p className="text-xs text-rose-300 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-rose-500/20">
                    Feedback: "{statusDetails.change_request_reason}"
                  </p>
                )}
                <p className="text-[11px] text-rose-300/80">
                  Editing is unlocked. Correct the scores/matches below, then finalize again and resubmit.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('matches')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-rose-950/40 transition cursor-pointer font-bold"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Results
              </button>
            </div>
          </div>
        )}

        {tournamentStatus === 'APPROVED' && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-center gap-3 shadow-xl">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-wider text-amber-200">
                Results Approved by Admin
              </p>
              <p className="text-[11px] text-amber-300/80">
                Standings have been verified and approved by Xenova Admins. Results are locked and awaiting public publishing.
              </p>
            </div>
          </div>
        )}

        {tournamentStatus === 'PUBLISHED' && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Globe2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-200">
                  Results Published Live
                </p>
                <p className="text-[11px] text-emerald-300/80">
                  Official tournament standings are now live on the public Xenova Leaderboards!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/leaderboards"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-zinc-950 rounded-xl shadow-lg shadow-emerald-950/40 transition cursor-pointer font-bold"
              >
                <Globe2 className="h-3.5 w-3.5" />
                View on Public Leaderboard
              </Link>
            </div>
          </div>
        )}

        {/* View Mode Switcher: Live Standings vs Match Results vs Scoring Rules */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tab 1: Live Standings (Phase 4) */}
            <button
              onClick={() => setActiveTab('standings')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'standings'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              {isLocked ? 'Final Standings' : 'Live Standings'} ({standings.length})
            </button>

            {/* Tab 2: Match Results (Phase 3) */}
            <button
              onClick={() => setActiveTab('matches')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Swords className="h-4 w-4" />
              Match Results ({matches.length})
            </button>

            {/* Tab 3: Scoring Rules (Phase 2) */}
            <button
              onClick={() => setActiveTab('rules')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Scoring Rules ({columns.length})
            </button>
          </div>

          {/* Phase 5 & 6 Action Buttons */}
          <div className="flex items-center gap-2">
            {(tournamentStatus === 'LIVE' || tournamentStatus === 'CHANGES_REQUESTED') && (
              <button
                onClick={handleOpenFinalizeModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-amber-950/40 transition cursor-pointer"
                title="Finalize tournament results and freeze standings"
              >
                <Lock className="h-3.5 w-3.5" />
                Finalize Results
              </button>
            )}

            {tournamentStatus === 'FINALIZED' && (
              <button
                onClick={handleOpenSubmitModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-purple-950/40 transition cursor-pointer"
                title="Submit finalized results to Admin"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Results to Admin
              </button>
            )}

            <button
              onClick={handleExportClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-white rounded-xl transition cursor-pointer"
              title="Export complete leaderboard table (CSV, Excel, PDF)"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Export
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: LIVE CUMULATIVE STANDINGS (PHASE 4) */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'standings' && (
          <div className="space-y-6">

            {/* Live Standings Controls & Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0C111D] border border-white/10">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" /> Cumulative Standings Table
                </h3>
                <p className="text-xs text-slate-400">
                  Overall points = Sum of each match total. Click any squad row to inspect match-by-match score breakdowns.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isLocked ? (
                  <button
                    onClick={handleOpenAddMatchModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-amber-950/40 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    + Add Match
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-slate-400">
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    Standings Finalized
                  </span>
                )}
              </div>
            </div>

            {/* Standings Table Container */}
            <section className="rounded-3xl border border-white/10 bg-[#0C111D] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto min-h-[350px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-4 px-4 w-16 text-center shrink-0">Rank</th>
                      <th className="py-4 px-4 min-w-[220px]">Team</th>
                      <th className="py-4 px-4 min-w-[190px]">Captain In-Game Name</th>

                      {/* Dynamic Match Columns: M1, M2, M3... */}
                      {matches.map((m, idx) => (
                        <th
                          key={m.id}
                          className="py-4 px-4 min-w-[90px] text-center border-l border-white/5 cursor-pointer hover:bg-white/5 transition"
                          onClick={() => jumpToMatchEdit(m.id)}
                          title={`Click to edit ${m.title}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-white font-extrabold">{`M${m.match_number || idx + 1}`}</span>
                            <span className="text-[10px] text-slate-500 font-normal truncate max-w-[80px]">
                              {m.title}
                            </span>
                          </div>
                        </th>
                      ))}

                      {/* Overall Total Column */}
                      <th className="py-4 px-5 min-w-[130px] text-right font-black text-emerald-400 border-l border-white/10">
                        Overall Total
                      </th>
                      <th className="py-4 px-3 w-12 text-center border-l border-white/5">
                        Inspect
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {standings.length === 0 ? (
                      <tr>
                        <td colSpan={4 + matches.length + 1} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="p-4 rounded-full bg-white/5 border border-white/10 text-slate-400">
                              <Trophy className="h-8 w-8 text-amber-400" />
                            </div>
                            <h3 className="text-base font-bold text-white uppercase tracking-wider">
                              No Standings Available Yet
                            </h3>
                            <p className="text-xs text-slate-400 max-w-md">
                              {counts.present === 0
                                ? 'No squads are marked PRESENT yet. Head to the Attendance Desk to mark teams present.'
                                : matches.length === 0
                                ? 'No matches have been added yet. Click "+ Add Match" to create Match 1 and begin recording scores.'
                                : 'Enter scores in the Match Results tab to see live standings.'}
                            </p>
                            {matches.length === 0 && (
                              <button
                                onClick={handleOpenAddMatchModal}
                                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-black uppercase tracking-wider text-white rounded-xl transition"
                              >
                                <Plus className="h-4 w-4" /> Create Match 1
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      standings.map((t) => {
                        const isExpanded = expandedTeamId === t.team_id;
                        return (
                          <React.Fragment key={t.team_id}>
                            <tr
                              onClick={() => toggleExpandTeam(t.team_id)}
                              className={`transition cursor-pointer ${
                                isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              {/* Rank */}
                              <td className="py-4 px-4 text-center font-bold">
                                {t.rank === 1 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/25 border border-amber-500/50 text-amber-300 font-black text-xs shadow-md shadow-amber-950/40">
                                    🥇 1
                                  </span>
                                ) : t.rank === 2 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/25 border border-slate-300/50 text-slate-200 font-black text-xs shadow-md shadow-slate-950/40">
                                    🥈 2
                                  </span>
                                ) : t.rank === 3 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/25 border border-amber-700/50 text-amber-500 font-black text-xs shadow-md shadow-amber-950/40">
                                    🥉 3
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-semibold">{t.rank}</span>
                                )}
                              </td>

                              {/* Team Name */}
                              <td className="py-4 px-4">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-white text-sm tracking-tight">{t.team_name}</span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {t.college || 'Collegiate Squad'} • Cap: {t.captain_name}
                                  </span>
                                </div>
                              </td>

                              {/* Captain In-Game Name */}
                              <td className="py-4 px-4">
                                {t.captain_in_game_name ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px] font-bold">
                                    🎮 {t.captain_in_game_name}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic text-[11px]">Not provided</span>
                                )}
                              </td>

                              {/* Dynamic Match Total Points: M1, M2, M3... */}
                              {matches.map((m) => {
                                const pts = t.match_scores?.[m.id] !== undefined ? t.match_scores[m.id] : 0;
                                return (
                                  <td
                                    key={m.id}
                                    className="py-4 px-4 text-center font-mono font-bold border-l border-white/5"
                                  >
                                    <span
                                      className={`${
                                        pts > 0 ? 'text-white' : 'text-slate-500 font-normal'
                                      }`}
                                    >
                                      {pts}
                                    </span>
                                  </td>
                                );
                              })}

                              {/* Overall Cumulative Total */}
                              <td className="py-4 px-5 text-right font-black font-mono text-emerald-400 text-sm border-l border-white/10">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  {t.overall_total} pts
                                </span>
                              </td>

                              {/* Expand Chevron */}
                              <td className="py-4 px-3 text-center border-l border-white/5 text-slate-500">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-emerald-400 mx-auto" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 hover:text-white mx-auto transition" />
                                )}
                              </td>
                            </tr>

                            {/* ════════════════════════════════════════════════════════════════════ */}
                            {/* EXPANDABLE MATCH-BY-MATCH BREAKDOWN CARD (REQUIREMENT 6) */}
                            {/* ════════════════════════════════════════════════════════════════════ */}
                            {isExpanded && (
                              <tr className="bg-slate-950/60 border-b border-white/10">
                                <td colSpan={4 + matches.length + 1} className="p-4 sm:p-6">
                                  <div className="space-y-4 rounded-2xl bg-[#090D17] border border-white/10 p-4 sm:p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                                          <Gamepad2 className="h-4 w-4" />
                                        </span>
                                        <div>
                                          <h4 className="text-xs font-black uppercase tracking-wider text-white">
                                            {t.team_name} — Match Scoring Breakdown
                                          </h4>
                                          <p className="text-[11px] text-slate-400">
                                            Captain: {t.captain_name} ({t.captain_in_game_name || 'No IGN'}) • Overall:{' '}
                                            <span className="text-emerald-400 font-bold">{t.overall_total} pts</span>
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-[11px] text-slate-400">
                                        Showing raw inputs and server calculations for each match
                                      </div>
                                    </div>

                                    {matches.length === 0 ? (
                                      <p className="text-xs text-slate-500 italic">No matches created yet.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {matches.map((m) => {
                                          const b = t.match_breakdowns?.[m.id];
                                          const matchPts = b?.total_points ?? 0;
                                          const raw = b?.raw_scores || {};
                                          const calc = b?.calculated_scores || {};

                                          return (
                                            <div
                                              key={m.id}
                                              className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300">
                                                    M{m.match_number}
                                                  </span>
                                                  <span className="text-xs font-bold text-white truncate max-w-[120px]">
                                                    {m.title}
                                                  </span>
                                                </div>

                                                <span className="text-xs font-mono font-black text-emerald-400">
                                                  {matchPts} pts
                                                </span>
                                              </div>

                                              {/* Columns breakdown for this match */}
                                              <div className="space-y-1 text-[11px] border-t border-white/5 pt-2 font-mono">
                                                {columns.map((col) => {
                                                  const rawVal = raw[col.id] !== undefined ? raw[col.id] : 0;
                                                  const calcVal = calc[col.id] !== undefined ? calc[col.id] : 0;
                                                  return (
                                                    <div
                                                      key={col.id}
                                                      className="flex items-center justify-between text-slate-400"
                                                    >
                                                      <span>{col.name}:</span>
                                                      <span className="text-slate-200">
                                                        {rawVal} (raw) →{' '}
                                                        <span
                                                          className={
                                                            calcVal > 0
                                                              ? 'text-emerald-400 font-bold'
                                                              : calcVal < 0
                                                              ? 'text-rose-400 font-bold'
                                                              : 'text-slate-400'
                                                          }
                                                        >
                                                          {calcVal > 0 ? `+${calcVal}` : calcVal} pts
                                                        </span>
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>

                                              <div className="pt-1 flex items-center justify-end">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    jumpToMatchEdit(m.id);
                                                  }}
                                                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition"
                                                >
                                                  {isLocked ? 'View in Match Results →' : 'Edit in Match Results →'}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: MATCH RESULTS ENTRY (PHASE 3) */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'matches' && (
          <div className="space-y-6">

            {/* Match Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0C111D] border border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1 pl-2">
                  Select Match:
                </span>

                {matches.length === 0 ? (
                  <span className="text-xs text-slate-500 italic pl-1">No matches yet. Click Add Match.</span>
                ) : (
                  matches.map((m) => {
                    const isSelected = m.id === selectedMatchId;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMatch(m.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/30'
                            : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Gamepad2 className="h-3.5 w-3.5 text-amber-400" />
                        {m.title}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                {!isLocked && (
                  <button
                    onClick={handleOpenAddMatchModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-amber-950/40 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    + Add Match
                  </button>
                )}
              </div>
            </div>

            {/* Match Result Work Area */}
            {matches.length === 0 ? (
              /* No Matches Empty State */
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-[#0C111D] shadow-2xl space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Gamepad2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase italic tracking-wider text-white">
                    No Matches Configured Yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Create Match 1, Match 2, etc. to start recording raw game scores for verified present squads.
                  </p>
                </div>
                {!isLocked && (
                  <button
                    onClick={handleOpenAddMatchModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-xs font-black uppercase tracking-wider text-white rounded-xl transition shadow-lg shadow-amber-950/40 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    + Create Match 1
                  </button>
                )}
              </div>
            ) : matchLoading ? (
              /* Match Loading State */
              <div className="p-16 text-center rounded-3xl border border-white/10 bg-[#0C111D] shadow-2xl flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Match Standings...</p>
              </div>
            ) : (
              /* Match Table Container */
              <section className="rounded-3xl border border-white/10 bg-[#0C111D] overflow-hidden shadow-2xl space-y-0">
                {/* Active Match Info Header */}
                <div className="p-5 sm:p-6 bg-slate-900/60 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                        {activeMatchObj?.title || 'Current Match'}
                      </span>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-[11px] font-semibold text-emerald-400">
                        {matchTeams.length} Verified Present Squads
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Enter <span className="text-white font-bold">RAW values</span> only (e.g. actual kills, placement position). The backend calculates points and totals.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {activeMatchObj && !isLocked && (
                      <button
                        onClick={() => setDeleteConfirmMatch(activeMatchObj)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition cursor-pointer"
                        title="Delete this match"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Match
                      </button>
                    )}

                    {!isLocked ? (
                      <button
                        onClick={handleSaveMatchResults}
                        disabled={savingResults || matchTeams.length === 0}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
                      >
                        <Save className={`h-4 w-4 ${savingResults ? 'animate-spin' : ''}`} />
                        {savingResults ? 'Calculating...' : 'Save Match Results'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        Match Results Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Result Table */}
                <div className="overflow-x-auto min-h-[300px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-4 px-4 w-14 text-center shrink-0">#</th>
                        <th className="py-4 px-4 min-w-[200px]">Team</th>
                        <th className="py-4 px-4 min-w-[180px]">Captain In-Game Name</th>

                        {/* Dynamic Scoring Rule Columns */}
                        {columns.map((col) => (
                          <th key={col.id} className="py-4 px-4 min-w-[140px] text-center border-l border-white/5">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-white font-extrabold">{col.name}</span>
                              <span className="text-[10px] font-semibold text-slate-400 lowercase">
                                {col.type === 'PER_UNIT' && `${col.points_per_unit} pt/unit`}
                                {col.type === 'OCCURRENCE' && `${col.points_per_unit} pts on event`}
                                {col.type === 'PENALTY' && `${col.points_per_unit} pt penalty`}
                                {col.type === 'PLACEMENT' && `custom matrix`}
                              </span>
                            </div>
                          </th>
                        ))}

                        <th className="py-4 px-5 min-w-[120px] text-right font-black text-emerald-400 border-l border-white/10">
                          Match Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {matchTeams.length === 0 ? (
                        <tr>
                          <td colSpan={4 + columns.length} className="py-16 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="p-4 rounded-full bg-white/5 border border-white/10 text-slate-400">
                                <ShieldCheck className="h-8 w-8 text-amber-400" />
                              </div>
                              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                                No Teams Marked Present
                              </h3>
                              <p className="text-xs text-slate-400 max-w-md">
                                Only verified <span className="text-emerald-400 font-bold">PRESENT</span> teams appear for match result entry. Absent or unverified teams cannot enter results.
                              </p>
                              <Link
                                href={`/organizer/tournament/${rawId}/attendance`}
                                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-white rounded-xl transition"
                              >
                                Go to Attendance Desk
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        matchTeams.map((t, idx) => {
                          const teamRaw = rawInputs[t.team_id] || {};
                          return (
                            <tr key={t.team_id} className="hover:bg-white/[0.02] transition">
                              {/* Index */}
                              <td className="py-4 px-4 text-center font-bold text-slate-400">
                                {idx + 1}
                              </td>

                              {/* Team Name */}
                              <td className="py-4 px-4">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-white text-sm tracking-tight">{t.team_name}</span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {t.college || 'Collegiate Squad'} • Cap: {t.captain_name}
                                  </span>
                                </div>
                              </td>

                              {/* Captain In-Game Name */}
                              <td className="py-4 px-4">
                                {t.captain_in_game_name ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px] font-bold">
                                    🎮 {t.captain_in_game_name}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic text-[11px]">Not provided</span>
                                )}
                              </td>

                              {/* Dynamic Columns - RAW INPUTS */}
                              {columns.map((col) => {
                                const currentRawVal = teamRaw[col.id] !== undefined ? teamRaw[col.id] : 0;
                                const calculatedPts =
                                  t.calculated_scores?.[col.id] !== undefined ? t.calculated_scores[col.id] : null;

                                return (
                                  <td key={col.id} className="py-3 px-3 text-center border-l border-white/5">
                                    <div className="flex flex-col items-center gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        value={currentRawVal}
                                        disabled={isLocked}
                                        readOnly={isLocked}
                                        onChange={(e) => handleRawScoreChange(t.team_id, col.id, e.target.value)}
                                        className={`w-20 px-2 py-1.5 text-center font-mono font-bold text-xs rounded-lg bg-black/40 border border-white/15 text-white focus:border-emerald-500 focus:bg-black/60 outline-none transition ${
                                          isLocked ? 'opacity-70 cursor-not-allowed' : ''
                                        }`}
                                        placeholder="0"
                                      />
                                      {calculatedPts !== null && (
                                        <span
                                          className={`text-[10px] font-mono font-bold ${
                                            col.type === 'PENALTY' && calculatedPts < 0
                                              ? 'text-rose-400'
                                              : calculatedPts > 0
                                              ? 'text-emerald-400'
                                              : 'text-slate-500'
                                          }`}
                                        >
                                          {calculatedPts > 0 ? `+${calculatedPts}` : calculatedPts} pts
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              {/* Total Points calculated server-side */}
                              <td className="py-4 px-5 text-right font-black font-mono text-emerald-400 text-sm border-l border-white/10">
                                {t.total_points ?? 0} pts
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Bar with Save Button */}
                {matchTeams.length > 0 && (
                  <div className="p-4 bg-slate-900/60 border-t border-white/10 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {isLocked ? (
                        <span className="text-amber-300 font-bold flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5" /> Results are locked because this tournament has been finalized.
                        </span>
                      ) : (
                        <>💡 Click <span className="text-white font-bold">Save Match Results</span> to send raw values to the server. Standings update immediately.</>
                      )}
                    </p>

                    {!isLocked ? (
                      <button
                        onClick={handleSaveMatchResults}
                        disabled={savingResults}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
                      >
                        <Save className={`h-4 w-4 ${savingResults ? 'animate-spin' : ''}`} />
                        {savingResults ? 'Calculating...' : 'Save Match Results'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        Match Results Locked
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SCORING RULES CONFIGURATION (PHASE 2 FOUNDATION) */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'rules' && (
          <div className="space-y-6">

            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0C111D] border border-white/10">
              <div>
                <h3 className="text-base font-black italic uppercase tracking-wider text-white">
                  Tournament Scoring Rules
                </h3>
                <p className="text-xs text-slate-400">
                  Every tournament has independent scoring rules. Changes automatically recalculate all match results and live cumulative standings.
                </p>
              </div>

              {!isLocked ? (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Scoring Column
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  Scoring Rules Locked
                </span>
              )}
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="p-5 rounded-2xl bg-[#0C111D] border border-white/10 hover:border-white/20 transition space-y-4 shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                        {col.type}
                      </span>
                      <h4 className="text-lg font-black uppercase tracking-tight text-white mt-1">
                        {col.name}
                      </h4>
                    </div>

                    {!isLocked ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(col)}
                          className="p-1.5 hover:text-indigo-400 transition cursor-pointer text-slate-400 rounded-lg hover:bg-white/5"
                          title="Edit Column"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmRule(col)}
                          className="p-1.5 hover:text-rose-400 transition cursor-pointer text-slate-400 rounded-lg hover:bg-white/5"
                          title="Delete Column"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="p-1 text-slate-500" title="Scoring column locked">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 font-mono bg-white/5 p-3 rounded-xl border border-white/5">
                    {col.type === 'PER_UNIT' && (
                      <p>Points per unit: <span className="text-emerald-400 font-bold">{col.points_per_unit}</span></p>
                    )}
                    {col.type === 'OCCURRENCE' && (
                      <p>Points on event: <span className="text-emerald-400 font-bold">{col.points_per_unit}</span></p>
                    )}
                    {col.type === 'PENALTY' && (
                      <p>Penalty deduction: <span className="text-rose-400 font-bold">{col.points_per_unit}</span></p>
                    )}
                    {col.type === 'PLACEMENT' && (
                      <div>
                        <p className="text-[11px] text-slate-400 mb-1">Custom Placement Matrix:</p>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {(col.placement_points || []).slice(0, 6).map((pm, pidx) => (
                            <span key={pidx} className="text-amber-300">
                              #{pm.placement}: {pm.points} pts
                            </span>
                          ))}
                          {(col.placement_points || []).length > 6 && (
                            <span className="text-slate-500 italic">+{(col.placement_points || []).length - 6} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* ADD MATCH MODAL (PHASE 3) */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddMatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#0C111D] p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase tracking-wider text-white">Add Match</h3>
                    <p className="text-xs text-slate-400">Create a new match for this tournament.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddMatchModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMatch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Match Title
                  </label>
                  <input
                    type="text"
                    value={newMatchTitle}
                    onChange={(e) => setNewMatchTitle(e.target.value)}
                    placeholder={`e.g. Match ${matches.length + 1}`}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm font-medium"
                  />
                  <p className="text-[11px] text-slate-400">
                    Only teams marked PRESENT at the attendance desk will participate.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddMatchModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-950/40 transition cursor-pointer disabled:opacity-50"
                  >
                    {modalLoading ? 'Creating...' : 'Create Match'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* DELETE MATCH CONFIRMATION MODAL (PHASE 3) */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteConfirmMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-rose-500/25 bg-[#0C111D] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Delete Match?</h3>
                  <p className="text-xs text-rose-300 font-bold">{deleteConfirmMatch.title}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Delete <span className="font-extrabold text-white">"{deleteConfirmMatch.title}"</span>? This will remove recorded match scores and update cumulative standings. Team registrations and attendance records remain untouched.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmMatch(null)}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMatch}
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-950/40 transition cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Deleting...' : 'Delete Match'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT SCORING COLUMN MODAL (PHASE 2 FOUNDATION) */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0C111D] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase tracking-wider text-white">
                      {editingRule ? 'Edit Scoring Column' : 'Add Scoring Column'}
                    </h3>
                    <p className="text-xs text-slate-400">Configure scoring behavior for this column.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="space-y-5">
                {/* Column Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Column Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Kills, Booyah, Placement, Fouls"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                {/* Scoring Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Scoring Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'PER_UNIT', label: 'Per Unit', desc: 'Points per kill, assist, etc.' },
                      { id: 'OCCURRENCE', label: 'Occurrence', desc: 'Fixed points on event (Booyah)' },
                      { id: 'PENALTY', label: 'Penalty', desc: 'Negative deduction for fouls' },
                      { id: 'PLACEMENT', label: 'Placement', desc: 'Custom position points matrix' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setFormType(t.id as any);
                          if (t.id === 'PENALTY' && formPointsPerUnit > 0) {
                            setFormPointsPerUnit(-Math.abs(formPointsPerUnit));
                          } else if (t.id !== 'PENALTY' && formPointsPerUnit < 0) {
                            setFormPointsPerUnit(Math.abs(formPointsPerUnit));
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          formType === t.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <p className="text-xs font-black uppercase tracking-wider text-white">{t.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Points configuration for Non-Placement types */}
                {formType !== 'PLACEMENT' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {formType === 'PER_UNIT' && 'Points Per Unit'}
                      {formType === 'OCCURRENCE' && 'Points per Occurrence'}
                      {formType === 'PENALTY' && 'Penalty Points (e.g. -5)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formPointsPerUnit}
                      onChange={(e) => setFormPointsPerUnit(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500 text-sm font-mono font-bold"
                    />
                  </div>
                ) : (
                  /* Custom Placement Matrix Table */
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Custom Placement Matrix
                        </label>
                        <p className="text-[11px] text-slate-400">Configure points for each finishing position.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPlacementRow}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/15 text-[11px] font-bold text-emerald-400 rounded-lg transition cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> Add Position
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {formPlacementMatrix.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="w-16 text-xs font-extrabold text-slate-300">
                            {p.placement === 1
                              ? '1st'
                              : p.placement === 2
                              ? '2nd'
                              : p.placement === 3
                              ? '3rd'
                              : `${p.placement}th`}
                          </span>

                          <span className="text-xs text-slate-500">→</span>

                          <input
                            type="number"
                            step="any"
                            value={p.points}
                            onChange={(e) => handlePlacementPointChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-24 px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-white font-mono font-bold text-xs focus:border-emerald-500 outline-none"
                          />
                          <span className="text-[11px] text-slate-400">pts</span>

                          <button
                            type="button"
                            onClick={() => handleRemovePlacementRow(idx)}
                            className="ml-auto p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Remove position"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {modalLoading ? 'Saving...' : editingRule ? 'Update Column' : 'Create Column'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* DELETE SCORING COLUMN CONFIRMATION MODAL (PHASE 2 FOUNDATION) */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteConfirmRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-rose-500/25 bg-[#0C111D] p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Delete Scoring Column?</h3>
                  <p className="text-xs text-rose-300 font-bold">{deleteConfirmRule.name}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Delete the <span className="font-extrabold text-white">"{deleteConfirmRule.name}"</span> column? All match results across this tournament will be automatically recalculated using remaining rules.
              </p>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-400 space-y-1">
                <p>✓ Team registration records will <span className="text-white font-bold">NOT</span> be deleted.</p>
                <p>✓ Existing attendance records will <span className="text-white font-bold">NOT</span> be affected.</p>
                <p>✓ Raw match inputs for other columns are safely preserved.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmRule(null)}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRule}
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-950/40 transition cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Deleting...' : 'Delete Column'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* PHASE 5: FINALIZE RESULTS CONFIRMATION MODAL */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showFinalizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0C111D] p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <Lock className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Finalize Results</h3>
                  <p className="text-xs text-amber-300 font-bold">Lock scoring rules and match scores</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed font-semibold">
                Are you sure you want to finalize this tournament's results?
                <br />
                <span className="text-white font-black">
                  After finalization, match results and scoring rules will become locked.
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="font-bold text-white uppercase tracking-wider text-[11px]">What happens next:</p>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  <li>Scoring rules, matches, and team scores are permanently frozen.</li>
                  <li>Organizer cannot edit, delete, or modify match scores or scoring rules.</li>
                  <li>Attendance records will <span className="text-white font-bold">NOT</span> be modified.</li>
                  <li>A reproducible leaderboard snapshot is preserved for export and review.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  disabled={finalizing}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFinalize}
                  disabled={finalizing}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-950/40 transition cursor-pointer disabled:opacity-50"
                >
                  <Lock className={`h-4 w-4 ${finalizing ? 'animate-spin' : ''}`} />
                  {finalizing ? 'Finalizing...' : 'Confirm & Finalize Results'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* PHASE 5: SUBMIT RESULTS TO ADMIN MODAL */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-purple-500/30 bg-[#0C111D] p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-purple-400">
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <Send className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Submit Results to Admin</h3>
                  <p className="text-xs text-purple-300 font-bold">Transmit final standings for administrative review</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 leading-relaxed font-semibold">
                Submit the finalized results for this tournament for administrative verification.
                <br />
                <span className="text-white font-black">
                  Once submitted, the tournament status will transition to "Awaiting Admin Review" and results cannot be modified.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Organizer Notes for Admin (Optional)
                </label>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g. All 3 matches conducted smoothly. No fouls or disputed points."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:border-purple-500 outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-purple-950/40 transition cursor-pointer disabled:opacity-50"
                >
                  <Send className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
                  {submitting ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* PHASE 5: EXPORT COMPLETE LEADERBOARD MODAL */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-3xl border border-emerald-500/30 bg-[#0C111D] p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Download className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-wider text-white">
                      Export Complete Leaderboard
                    </h3>
                    <p className="text-xs text-slate-400">
                      Download full standings snapshot and dynamic scoring breakdown
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Exports include tournament metadata, overall rankings, dynamic scoring columns ({columns.map((c) => c.name).join(', ') || 'configured rules'}), raw inputs, and match totals. Read-only operation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Format 1: CSV */}
                <button
                  type="button"
                  onClick={() => handleExportDownload('csv')}
                  disabled={exportingFormat !== null}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition cursor-pointer group text-center space-y-2 disabled:opacity-50"
                >
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-white">CSV Format</p>
                    <p className="text-[10px] text-slate-400">Comma-separated values (.csv)</p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 group-hover:underline">
                    {exportingFormat === 'csv' ? 'Generating...' : 'Download CSV →'}
                  </span>
                </button>

                {/* Format 2: Excel (.xlsx) */}
                <button
                  type="button"
                  onClick={() => handleExportDownload('xlsx')}
                  disabled={exportingFormat !== null}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition cursor-pointer group text-center space-y-2 disabled:opacity-50"
                >
                  <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-110 transition">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-white">Excel Workbook</p>
                    <p className="text-[10px] text-slate-400">Formatted spreadsheet (.xlsx)</p>
                  </div>
                  <span className="text-[11px] font-bold text-teal-400 group-hover:underline">
                    {exportingFormat === 'xlsx' ? 'Generating...' : 'Download Excel →'}
                  </span>
                </button>

                {/* Format 3: Printable PDF */}
                <button
                  type="button"
                  onClick={() => handleExportDownload('html')}
                  disabled={exportingFormat !== null}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition cursor-pointer group text-center space-y-2 disabled:opacity-50"
                >
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
                    <Printer className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-white">Print / PDF</p>
                    <p className="text-[10px] text-slate-400">High-res printable view</p>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-400 group-hover:underline">
                    {exportingFormat === 'html' ? 'Opening...' : 'Print / Save PDF →'}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
