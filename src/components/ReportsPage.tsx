import { useState } from 'react';
import { motion } from 'motion/react';

const FEELING_EMOJIS: Record<string, string> = {
  'Hoarseness': '🗣️', 'Dryness': '💧', 'Tension': '😬',
  'Breathiness': '💨', 'Fatigue': '😴', 'Pain': '😣',
};

function noteFromHz(hz: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const semitones = Math.round(12 * Math.log2(hz / 440)) + 69;
  const note = noteNames[((semitones % 12) + 12) % 12];
  const octave = Math.floor(semitones / 12) - 1;
  return `${note}${octave}`;
}

function CircleMetric({ value, unit, sub, label, accent, tooltip }: { value: string; unit: string; sub: string; label: string; accent: string; tooltip?: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <motion.div
        whileHover={{ scale: 1.07 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="w-[118px] h-[118px] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-default relative group"
        style={{
          background: `radial-gradient(circle at 38% 32%, ${accent}22 0%, ${accent}08 100%)`,
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 28px ${accent}12, inset 0 0 20px ${accent}08`,
        }}
      >
        <div className="flex flex-col items-center gap-0.5 transition-opacity duration-150 group-hover:opacity-0">
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-[22px] font-light tabular-nums" style={{ color: accent }}>{value}</span>
            {unit && <span className="text-[11px] font-light" style={{ color: `${accent}90` }}>{unit}</span>}
          </div>
          {sub && <span className="text-[10px] font-mono mt-1" style={{ color: `${accent}60` }}>{sub}</span>}
        </div>
        {tooltip && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-4 pointer-events-none">
            <p className="text-[8px] font-mono text-center leading-relaxed" style={{ color: `${accent}bb` }}>{tooltip}</p>
          </div>
        )}
      </motion.div>
      <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">{label}</span>
    </div>
  );
}
import VoiceAnalyzerPage from './VoiceAnalyzerPage';
import {
  Trash2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Download,
  SlidersHorizontal,
  ChevronDown,
  Mic,
  CheckSquare
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { VocalReport } from '../types/onboarding';

interface ReportsPageProps {
  reports: VocalReport[];
  onAddReport: (report: Omit<VocalReport, 'id'>) => void;
  onDeleteReport: (id: string) => void;
}

export default function ReportsPage({
  reports,
  onAddReport,
  onDeleteReport,
}: ReportsPageProps) {
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [activeReportDetail, setActiveReportDetail] = useState<VocalReport | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'fatigue'>('recent');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredReports = [...reports].sort((a, b) => {
    if (sortBy === 'fatigue') {
      return b.fatigueLevel - a.fatigueLevel;
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const exportToPDF = (report: VocalReport) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const primaryColor: [number, number, number] = [23, 169, 201];
    const darkSlateColor: [number, number, number] = [26, 32, 44];
    const lightGray: [number, number, number] = [247, 250, 252];
    const borderGray: [number, number, number] = [226, 232, 240];
    const textMuted: [number, number, number] = [113, 128, 150];

    doc.setProperties({
      title: `${report.ritualName} - Vocal Diagnostic.pdf`,
      subject: 'Vocal Diagnostics Performance Log',
      author: 'Laryngeal Wellness Clinical Suite',
      creator: 'Vocal Practice Diagnostics App'
    });

    doc.setFillColor(...darkSlateColor);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setFillColor(...primaryColor);
    doc.rect(0, 42, 210, 1.5, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('LARYNGEAL SYSTEM DIAGNOSTICS', 16, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(170, 210, 222);
    doc.text('CLINICAL COHESIVE PRACTICE LOG & ANATOMICAL INSIGHTS', 16, 24);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.circle(180, 21, 10);
    doc.setDrawColor(...primaryColor);
    doc.circle(180, 21, 11);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('V', 178.5, 22.5);

    let currentY = 56;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...darkSlateColor);
    doc.text(report.ritualName, 16, currentY);
    currentY += 8;

    const colWidth = 59;
    const startX = 16;

    doc.setFillColor(...lightGray);
    doc.roundedRect(startX, currentY, 178, 22, 2, 2, 'F');
    doc.setDrawColor(...borderGray);
    doc.rect(startX, currentY, 178, 22, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    doc.text('CLASSIFICATION CATEGORY', startX + 6, currentY + 7);
    doc.text('ELAPSED DURATION', startX + colWidth + 6, currentY + 7);
    doc.text('RECORDED DATE & TIME', startX + colWidth * 2 + 6, currentY + 7);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(report.category.toUpperCase(), startX + 6, currentY + 15);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...darkSlateColor);
    doc.text(report.duration || 'N/A', startX + colWidth + 6, currentY + 15);
    doc.text(report.date || 'N/A', startX + colWidth * 2 + 6, currentY + 15);

    currentY += 34;

    doc.setFillColor(...lightGray);
    doc.roundedRect(startX, currentY, 178, 24, 2, 2, 'F');
    doc.setDrawColor(...borderGray);
    doc.rect(startX, currentY, 178, 24, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkSlateColor);
    doc.text('VOCAL MUSCLE BURDEN COEFFICIENT (FATIGUE LEVEL)', startX + 6, currentY + 7);

    const isMild = report.fatigueLevel <= 33;
    const isMed = report.fatigueLevel <= 66;
    const levelLabel = isMild ? 'Low Strain' : isMed ? 'Moderate Load' : 'High Compression';
    const labelColor: [number, number, number] = isMild ? [34, 197, 94] : isMed ? [217, 119, 6] : [239, 68, 68];

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...labelColor);
    doc.text(`${report.fatigueLevel}% - ${levelLabel}`, startX + 6, currentY + 15);

    doc.setFillColor(226, 232, 240);
    doc.rect(startX + 92, currentY + 11.5, 78, 4, 'F');
    doc.setFillColor(...labelColor);
    doc.rect(startX + 92, currentY + 11.5, (report.fatigueLevel / 100) * 78, 4, 'F');

    currentY += 34;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...darkSlateColor);
    doc.text('SENSORIMOTOR SENSATION MAP', startX, currentY);
    currentY += 4.5;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(startX, currentY, startX + 25, currentY);
    currentY += 8;

    if (report.feelings && report.feelings.length > 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...darkSlateColor);

      let itemX = startX;
      let itemY = currentY;
      report.feelings.forEach((feeling) => {
        const textWidth = doc.getTextWidth(`[+] ${feeling}`) + 6;
        if (itemX + textWidth > startX + 178) { itemX = startX; itemY += 7; }

        doc.setFillColor(...lightGray);
        doc.roundedRect(itemX, itemY - 4.5, textWidth - 2, 6.5, 1, 1, 'F');
        doc.setDrawColor(...borderGray);
        doc.rect(itemX, itemY - 4.5, textWidth - 2, 6.5, 'S');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.text('+', itemX + 2, itemY);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...darkSlateColor);
        doc.text(feeling, itemX + 6, itemY - 0.2);

        itemX += textWidth + 2;
      });
      currentY = itemY + 14;
    } else {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text('No sensorimotor feedback notes recorded.', startX, currentY);
      currentY += 12;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...darkSlateColor);
    doc.text('PHYSICAL FEEDBACK & OBSERVATIONS', startX, currentY);
    currentY += 4.5;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(startX, currentY, startX + 25, currentY);
    currentY += 8;

    const notesContent = report.notes ? report.notes.trim() : 'No custom notes logged for this session. System registered typical physiology tracking.';
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...darkSlateColor);
    const notesLines = doc.splitTextToSize(notesContent, 178);
    notesLines.forEach((line: string) => { doc.text(line, startX, currentY); currentY += 5; });
    currentY += 10;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...darkSlateColor);
    doc.text('VOICE DIAGNOSTICS & SYSTEM RECOMMENDATION', startX, currentY);
    currentY += 4.5;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(startX, currentY, startX + 25, currentY);
    currentY += 8;

    doc.setFillColor(...lightGray);
    doc.roundedRect(startX, currentY, 178, 30, 3, 3, 'F');
    doc.setFillColor(...primaryColor);
    doc.rect(startX, currentY, 1.8, 30, 'F');
    doc.setDrawColor(...borderGray);
    doc.rect(startX, currentY, 178, 30, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('SMART SYSTEM INTEGRAL EVALUATION', startX + 6, currentY + 6.5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkSlateColor);
    const recContent = report.insight || "Cohesive tissue calibration parameters verified successfully. Keep fluid lubrication consistent.";
    const recLines = doc.splitTextToSize(recContent, 166);
    let recY = currentY + 13;
    recLines.forEach((line: string) => { doc.text(line, startX + 6, recY); recY += 4.5; });

    const footerY = 280;
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.line(startX, footerY - 5, startX + 178, footerY - 5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('LARYNGEAL SYSTEM CLINICAL WELLNESS APPLICATION', startX, footerY);
    doc.text('CONFIDENTIAL MEDICAL STABILITY DIAGNOSTICS REPORT', startX, footerY + 4);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('STABILITY LEVEL METRIC VERIFIED', startX + 120, footerY);

    doc.save(`${report.ritualName.replace(/\s+/g, '_')}_Diagnostics_Report.pdf`);
  };

  if (activeReportDetail) {
    return (
      <div className="w-full pb-10 select-none" id="report-detail-page-container">

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
            <div className="flex flex-col gap-5 p-8 rounded-3xl max-w-sm w-full mx-4" style={{ background: '#13161c', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[18px] font-light text-white tracking-wide">Delete report?</h2>
                <p className="text-[12px] text-zinc-500 font-light leading-relaxed">This can't be undone. Vocal Report {filteredReports.indexOf(activeReportDetail) + 1} will be permanently removed.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-mono tracking-widest uppercase text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onDeleteReport(activeReportDetail.id); setActiveReportDetail(null); setShowDeleteConfirm(false); }}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-mono tracking-widest uppercase text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all duration-200 cursor-pointer"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mb-8 mt-8 flex items-center gap-3">
          <button
            onClick={() => setActiveReportDetail(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105"
            style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
          >
            <ChevronLeft className="w-4 h-4 text-[#21e8ff]" />
          </button>
          <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">Reports</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-extralight tracking-wide text-white mb-1.5">
              Vocal Report {filteredReports.indexOf(activeReportDetail) + 1}
            </h1>
            <p className="text-xs text-zinc-500 font-light tracking-wide">
              {activeReportDetail.date} &nbsp;·&nbsp; {activeReportDetail.duration || '2 mins'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              onClick={() => exportToPDF(activeReportDetail)}
              title="Export PDF"
              className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105"
              style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
            >
              <Download className="w-4 h-4 text-[#21e8ff]" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete report"
              className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>

        {(activeReportDetail.resonanceScore !== undefined && activeReportDetail.clarityPct !== undefined) && (() => {
          const r = activeReportDetail.resonanceScore!;
          const c = activeReportDetail.clarityPct!;
          const f = activeReportDetail.fatigueLevel;
          const seg1 = Math.round(r * 0.30);
          const seg2 = Math.round(c * 0.30);
          const seg3 = Math.round(f * 0.20);
          const reserve = 100 - seg1 - seg2 - seg3;
          const totalScore = Math.round(r * 0.4 + c * 0.4 + (100 - f) * 0.2);
          const scoreLabel = totalScore >= 80 ? 'Excellent session' : totalScore >= 60 ? 'Strong performance' : totalScore >= 40 ? 'Moderate — room to grow' : 'Recovery recommended';
          const fatigueTint = f <= 33 ? '#22d3ee' : f <= 66 ? '#fbbf24' : '#fb7185';
          return (
            <div className="w-full max-w-5xl mb-8 flex flex-col gap-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.45)' }}>Vocal Profile</span>
                  <span className="text-[11px] font-light text-zinc-400">{scoreLabel}</span>
                </div>
                <div className="flex items-end gap-1.5 leading-none">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
                    className="text-[24px] font-light text-white tabular-nums"
                    style={{ lineHeight: 1 }}
                  >{totalScore}</motion.span>
                  <span className="text-[11px] font-mono text-zinc-600 mb-1">/ 100</span>
                </div>
              </div>
              <div className="w-full relative">
                <div className="absolute inset-x-0 -bottom-1.5 h-4 rounded-full blur-lg opacity-25 pointer-events-none" style={{ background: `linear-gradient(90deg, #fbbf24 0%, #34d399 50%, ${fatigueTint} 100%)` }} />
                <div className="relative w-full h-5 rounded-xl flex overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${seg1}%` }} transition={{ duration: 1.0, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ background: 'linear-gradient(90deg, #d97706, #fbbf24)', flexShrink: 0 }} className="h-full" />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${seg2}%` }} transition={{ duration: 1.0, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ background: 'linear-gradient(90deg, #059669, #34d399)', borderLeft: '1px solid rgba(0,0,0,0.18)', flexShrink: 0 }} className="h-full" />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${seg3}%` }} transition={{ duration: 1.0, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ background: `linear-gradient(90deg, ${fatigueTint}88, ${fatigueTint})`, borderLeft: '1px solid rgba(0,0,0,0.18)', flexShrink: 0 }} className="h-full" />
                  <div style={{ flexGrow: 1, borderLeft: reserve > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }} className="h-full" />
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#fbbf24' }} /><span className="text-[9px] font-mono tracking-wide text-zinc-500">Resonance</span></div>
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} /><span className="text-[9px] font-mono tracking-wide text-zinc-500">Clarity</span></div>
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: fatigueTint }} /><span className="text-[9px] font-mono tracking-wide text-zinc-500">Fatigue</span></div>
              </div>
            </div>
          );
        })()}

        {(activeReportDetail.pitchHz || activeReportDetail.resonanceScore !== undefined || activeReportDetail.clarityPct !== undefined) && (
          <>
          <div className="flex flex-wrap justify-start gap-5 mb-8 py-2">
            {activeReportDetail.pitchHz && (
              <CircleMetric
                value={`${Math.round(activeReportDetail.pitchHz)}`} unit="Hz"
                sub={noteFromHz(activeReportDetail.pitchHz)}
                label="Pitch" accent="#21e8ff"
                tooltip="The fundamental note your voice naturally sits at, detected via waveform autocorrelation."
              />
            )}
            {activeReportDetail.pitchRangeHz && (
              <CircleMetric
                value={`${Math.round(activeReportDetail.pitchRangeHz)}`} unit="Hz"
                sub={activeReportDetail.pitchRangeHz < 40 ? 'Narrow' : activeReportDetail.pitchRangeHz < 120 ? 'Moderate' : 'Wide'}
                label="Range" accent="#a78bfa"
                tooltip="How much your pitch varied. A wider range means more expressive, dynamic delivery."
              />
            )}
            {activeReportDetail.resonanceScore !== undefined && (
              <CircleMetric
                value={`${Math.round(activeReportDetail.resonanceScore)}`} unit="" sub="/ 100"
                label="Resonance" accent="#fbbf24"
                tooltip="Energy in the 1–4 kHz presence band. Higher = fuller, more projected sound."
              />
            )}
            {activeReportDetail.clarityPct !== undefined && (
              <CircleMetric
                value={`${Math.round(activeReportDetail.clarityPct)}`} unit="%" sub="clarity"
                label="Clarity" accent="#34d399"
                tooltip="Dominant frequency vs. total spectral noise. Higher = cleaner, more focused tone."
              />
            )}
            {(() => {
              const f = activeReportDetail.fatigueLevel;
              const estimate = f <= 33 ? 'Low' : f <= 66 ? 'Moderate' : 'High';
              const accent = f <= 33 ? '#22d3ee' : f <= 66 ? '#fbbf24' : '#fb7185';
              return (
                <CircleMetric
                  value={estimate} unit="" sub="fatigue"
                  label="Energy" accent={accent}
                  tooltip="Estimated from pitch jitter. Low jitter means your pitch held steady — less vocal strain."
                />
              );
            })()}
          </div>

          {activeReportDetail.insight && (
            <div className="relative flex flex-col gap-3 py-7 px-6 mb-8">
              <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(23,169,201,0.1) 0%, rgba(33,232,255,0.04) 55%, transparent 100%)' }} />
              <p className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.6)' }}>AI Insight</p>
              <p className="text-[14px] font-light text-zinc-200 leading-relaxed">{activeReportDetail.insight}</p>
            </div>
          )}
          </>
        )}

        <div className="space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-3 block">How did it feel?</span>
              {activeReportDetail.feelings.length === 0 ? (
                <p className="text-zinc-600 text-xs italic font-light">No sensations logged for this session.</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {activeReportDetail.feelings.map(f => (
                    <div key={f} className="flex flex-col items-center gap-2">
                      <div
                        className="w-[90px] h-[90px] rounded-full flex items-center justify-center"
                        style={{
                          background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.38) 0%, rgba(23,169,201,0.16) 100%)',
                          border: '1.5px solid rgba(33,232,255,0.65)',
                          boxShadow: '0 0 24px rgba(33,232,255,0.3), inset 0 0 18px rgba(33,232,255,0.12)',
                        }}
                      >
                        <span className="text-2xl leading-none">{FEELING_EMOJIS[f] ?? '•'}</span>
                      </div>
                      <span className="text-[9px] font-mono text-[#21e8ff] tracking-widest">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-3 block">Notes</span>
              <div
                className="w-full rounded-xl px-4 py-3 text-[12px] font-light text-zinc-300 leading-relaxed min-h-[160px]"
                style={{
                  background: 'rgba(23,169,201,0.04)',
                  border: '1px solid rgba(33,232,255,0.12)',
                  boxShadow: '0 0 12px rgba(33,232,255,0.04)',
                }}
              >
                {activeReportDetail.notes || <span className="text-zinc-600 italic">No notes logged for this session.</span>}
              </div>
            </div>
        </div>
      </div>
    );
  }

  if (showAnalyzer) {
    return (
      <VoiceAnalyzerPage
        onBack={() => setShowAnalyzer(false)}
        onSave={(report) => { onAddReport(report); setShowAnalyzer(false); }}
      />
    );
  }

  return (
    <div className="w-full pb-10 select-none" id="reports-page-container">
      <div className="mb-8 mt-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-3xl font-light tracking-tight text-white mb-2">
              Vocal Diagnostics & Reporting
            </h2>
            <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
              Review dynamic performance check-ins, vocal fatigue scores, and physiological recommendations generated from your clinical warmup rituals.
            </p>
          </div>

          {/* Sort + multi-select row */}
          <div className="flex items-center gap-2 self-start">
            <div className="relative">
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-[#181b22] hover:bg-[#1d212a] border border-zinc-800/80 hover:border-[#17A9C9]/35 rounded-xl text-zinc-300 hover:text-white text-xs font-medium cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)] select-none"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#21e8ff]" />
                <span>Sort: <strong className="font-semibold text-white">{sortBy === 'recent' ? 'Most Recent' : 'Highest Fatigue'}</strong></span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 text-zinc-500 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSortDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-48 bg-[#12141a] border border-zinc-800/80 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] py-1.5 z-50">
                    {(['recent', 'fatigue'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setIsSortDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left cursor-pointer transition-colors ${sortBy === opt ? 'text-[#21e8ff] bg-[#17A9C9]/10 font-semibold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                      >
                        <span>{opt === 'recent' ? 'Most Recent' : 'Highest Fatigue'}</span>
                        {sortBy === opt && <span className="w-1.5 h-1.5 rounded-full bg-[#21e8ff]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsMultiSelect(!isMultiSelect)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-medium cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)] select-none ${isMultiSelect
                ? 'bg-[#17A9C9]/15 border-[#17A9C9]/45 text-[#21e8ff]'
                : 'bg-[#181b22] hover:bg-[#1d212a] border-zinc-800/80 hover:border-[#17A9C9]/35 text-zinc-300 hover:text-white'
                }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select</span>
            </button>
          </div>
        </div>

        {/* Voice Analyzer circle button */}
        <button
          onClick={() => setShowAnalyzer(true)}
          className="group/va relative flex flex-col items-center gap-3 cursor-pointer flex-shrink-0 mt-4"
        >
          <div
            className="relative w-[92px] h-[92px] rounded-full flex items-center justify-center transition-all duration-300 group-hover/va:scale-105"
            style={{
              background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.22) 0%, rgba(23,169,201,0.08) 55%, rgba(12,14,18,0.9) 100%)',
              border: '1.5px solid rgba(33,232,255,0.45)',
              boxShadow: '0 0 28px rgba(33,232,255,0.18), inset 0 0 20px rgba(33,232,255,0.06)',
            }}
          >
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ border: '1px solid rgba(33,232,255,0.6)', animationDuration: '2.4s' }}
            />
            <Mic className="w-7 h-7 text-[#21e8ff] group-hover/va:scale-110 transition-transform duration-300" style={{ filter: 'drop-shadow(0 0 8px rgba(33,232,255,0.6))' }} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[13px] font-light text-[#21e8ff] tracking-wide">New Analysis</span>
          </div>
        </button>
      </div>

      <div className="border-b border-zinc-900/40 mb-6" />

      {filteredReports.length === 0 ? (
        <div className="bg-gradient-to-b from-zinc-900/20 to-[#12141a]/90 border border-zinc-800/60 rounded-[30px] p-16 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-950/40 border border-zinc-800 flex items-center justify-center mb-2">
            <BookOpen className="w-5 h-5 text-[#21e8ff]/70" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-300">No report records found</h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Begin practice routines or complete your status check-ins to build up structured performance analytics here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {filteredReports.map((report, index) => {
            return (
              <div
                key={report.id}
                onClick={() => setActiveReportDetail(report)}
                className="group relative overflow-hidden bg-[#181b22] hover:bg-[#1d212a] border border-zinc-800/80 hover:border-[#17A9C9]/45 rounded-2xl px-6 py-4 transition-all duration-500 cursor-pointer flex items-center justify-between gap-6 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.35),0_8px_20px_rgba(23,169,201,0.08)] hover:-translate-y-[1px]"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#21e8ff]/30 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -skew-x-[20deg] translate-x-[-150%] group-hover:translate-x-[250%] transition-transform duration-[1200ms] ease-out pointer-events-none" />

                <div className="flex-1 min-w-0 flex items-center gap-4 relative z-10">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <h3 className="text-[15px] font-light text-white tracking-wide group-hover:text-[#21e8ff] transition-colors duration-300 truncate">
                      Vocal Report {index + 1}
                    </h3>
                    <span className="text-[10.5px] text-zinc-500 font-light tracking-wide">{report.date}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-zinc-900/60 group-hover:bg-[#17A9C9]/10 border border-zinc-800/60 group-hover:border-[#21e8ff]/50 flex items-center justify-center text-zinc-500 group-hover:text-[#21e8ff] transition-all duration-300">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
