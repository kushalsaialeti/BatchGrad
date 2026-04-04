"use client";

import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  BarChart3,
  Users,
  Award,
  AlertCircle,
  Loader2,
  GraduationCap,
  Lock,
  Upload,
  CheckCircle2,
  TerminalSquare,
  Search
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface AnalyticsData {
  metadata: {
    year: string;
    semester: number;
    branch: string;
    section: string;
  };
  averageGPA: number;
  successfulScrapes: number;
  totalAttempted: number;
  gradeDistribution: Record<string, number>;
  courseGradeDistributions: Record<string, Record<string, number>>;
  students: Record<string, unknown>[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Home() {
  const [formData, setFormData] = useState({
    year: "",
    semester: "",
    branch: "",
    section: "",
    targetSubjectCode: "",
  });

  const [batchStatus, setBatchStatus] = useState<'entering' | 'needs_upload' | 'ready'>('entering');
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Live stream states
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [liveFeedRows, setLiveFeedRows] = useState<Record<string, string>[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [excelBase64, setExcelBase64] = useState<string | null>(null);

  const [fetchedSubjects, setFetchedSubjects] = useState<{ code: string; name: string }[] | null>(null);
  const [fetchingSubjects, setFetchingSubjects] = useState(false);

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer Effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name !== 'semester' && e.target.name !== 'targetSubjectCode') {
      setBatchStatus('entering');
      setAnalytics(null);
      setLiveFeedRows([]);
      setFetchedSubjects(null);
    }
    if (e.target.name === 'semester') {
      setFetchedSubjects(null);
    }
  };

  const handleFetchSubjects = async () => {
    if (!formData.year || !formData.semester || !formData.branch || !formData.section) {
      setError("Please fill out Year, Branch, Section, and Target Semester first.");
      return;
    }
    setFetchingSubjects(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/fetch-subjects`, {
        params: {
          year: formData.year,
          semester: formData.semester,
          branch: formData.branch,
          section: formData.section
        }
      });
      if (response.data.success) {
        setFetchedSubjects(response.data.subjects);
        setFormData(prev => ({ ...prev, targetSubjectCode: "" })); // default to ALL
      }
    } catch {
      setError("Failed to fetch subjects. Ensure the target semester is valid for this batch.");
    } finally {
      setFetchingSubjects(false);
    }
  };

  const handleVerifyBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.year || !formData.branch || !formData.section) {
      setError("Please fill out Batch Year, Branch, and Section first.");
      return;
    }

    setChecking(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/check-batch`, {
        params: {
          year: formData.year,
          branch: formData.branch,
          section: formData.section
        }
      });

      if (response.data.exists) {
        setBatchStatus('ready');
      } else {
        setBatchStatus('needs_upload');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to verify batch consistency.");
      } else {
        setError("Failed to verify batch consistency.");
      }
    } finally {
      setChecking(false);
    }
  };

  const handleFileUpload = async () => {
    if (!excelFile) {
      setError("Please select an Excel file.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", excelFile);
      uploadData.append("year", formData.year);
      uploadData.append("branch", formData.branch);
      uploadData.append("section", formData.section);

      const response = await axios.post(`${API_BASE_URL}/api/upload-batch`, uploadData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.success) {
        setBatchStatus('ready');
        setExcelFile(null);
      } else {
        setError("Failed to upload batch data.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "File upload error: Are you sure column exists?");
      } else {
        setError("File upload error: Are you sure column exists?");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.semester) {
      setError("Please specify the target semester before analyzing.");
      return;
    }

    setLoading(true);
    setAnalytics(null);
    setExcelBase64(null);
    setLiveFeedRows([]);
    setProcessedCount(0);
    setTotalCount(0);
    setElapsedTime(0);
    setSelectedCourseFilter("ALL");

    try {
      const fetchResponse = await fetch(`${API_BASE_URL}/api/analyze-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: formData.year,
          semester: parseInt(formData.semester, 10),
          branch: formData.branch.toUpperCase(),
          section: formData.section.toUpperCase(),
          targetSubjectCode: formData.targetSubjectCode,
        })
      });

      if (!fetchResponse.body) throw new Error("Stream failure");

      const reader = fetchResponse.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);

            // Handle Live Processing Stream
            if (parsed.type === 'progress') {
              const { completed, total, regNo, result } = parsed.data;
              setProcessedCount(completed);
              setTotalCount(total);

              // Unshift dynamically into live array feed if grade is found
              if (result.success && result.results && result.results.length > 0) {
                setLiveFeedRows(prev => {
                  const expanded = result.results.map((r: { subjectName: string; grade: string }) => ({
                    regNo,
                    subject: r.subjectName,
                    grade: r.grade
                  }));
                  const next = [...expanded, ...prev];
                  return next.slice(0, 10); // Keep max 10 to speed up DOM rendering
                });
              }
            }
            // Handle Result Output
            else if (parsed.type === 'complete') {
              setAnalytics(parsed.data);
              setExcelBase64(parsed.excelBase64);
            }
            else if (parsed.type === 'error') {
              setError(parsed.message);
              setLoading(false);
            }
          } catch { }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred processing the stream.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!excelBase64 || !analytics) return;

    const { year, branch, section, semester } = analytics.metadata;
    const fileName = `BatchGrad-${year}-${branch}-${section}-Sem${semester}.xlsx`;

    const link = document.createElement("a");
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBase64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatChartData = () => {
    if (!analytics) return [];
    const sourceData = selectedCourseFilter === "ALL"
      ? analytics.gradeDistribution
      : analytics.courseGradeDistributions[selectedCourseFilter] || {};

    return Object.entries(sourceData)
      .map(([grade, count]) => ({ grade, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => {
        const order = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center space-y-4 mb-16 text-center"
        >
          <div className="p-4 bg-indigo-500/10 rounded-2xl ring-1 ring-indigo-500/20 backdrop-blur-sm">
            <GraduationCap className="w-12 h-12 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">
            BatchGrad Analytics
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Real-time intelligent extraction mapped directly via HTTP Streams with a zero-persistence architecture.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-2xl sticky top-8"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-indigo-300">
              <Lock className="w-5 h-5" />
              Batch Configuration
            </h2>

            <form onSubmit={handleVerifyBatch} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Batch Year</label>
                <select
                  name="year"
                  required
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono appearance-none"
                >
                  <option value="" disabled>Select Core Batch Year</option>
                  <option value="2021-25">2021-25</option>
                  <option value="2022-26">2022-26</option>
                  <option value="2023-27">2023-27</option>
                  <option value="2024-28">2024-28</option>
                  <option value="2025-29">2025-29</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Branch</label>
                  <input
                    required
                    name="branch"
                    type="text"
                    placeholder="e.g. CSE"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Section</label>
                  <input
                    required
                    name="section"
                    type="text"
                    placeholder="e.g. A"
                    value={formData.section}
                    onChange={handleInputChange}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono uppercase"
                  />
                </div>
              </div>

              {batchStatus === 'entering' && (
                <button
                  type="submit"
                  disabled={checking}
                  className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Directory Setup"}
                </button>
              )}
            </form>

            <AnimatePresence mode="popLayout">
              {batchStatus === 'needs_upload' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 p-5 bg-teal-500/10 border border-teal-500/20 rounded-xl"
                >
                  <h4 className="text-sm font-semibold text-teal-300 mb-2 flex flex-row items-center gap-2"><Upload className="w-4 h-4" /> Roster Not Found</h4>
                  <p className="text-xs text-teal-200/70 mb-4 font-mono">
                    Upload an Excel sheet identifying the target batch. The scraper seeks the column named <b>redg_no</b> starting from row 2 until it hits an empty block.
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-500/20 file:text-teal-400 hover:file:bg-teal-500/30 mb-4 transition-colors"
                  />
                  <button
                    onClick={handleFileUpload}
                    disabled={uploading || !excelFile}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium py-2.5 px-4 rounded-lg shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Index Batch Records"}
                  </button>
                </motion.div>
              )}

              {batchStatus === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6"
                >
                  <div className="flex items-center justify-between text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Registry linked.</span>
                    </div>
                    <button onClick={() => setBatchStatus('needs_upload')} type="button" className="text-xs hover:text-emerald-300 underline underline-offset-2">Update registry</button>
                  </div>

                  <div className="space-y-2 mb-6">
                    <label className="text-sm font-medium text-gray-400">Target Semester</label>
                    <input
                      required
                      name="semester"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="e.g. 5"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-4 mb-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-400">Target Subjects</label>
                      <button 
                        type="button" 
                        onClick={handleFetchSubjects}
                        disabled={fetchingSubjects || !formData.semester}
                        className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-indigo-300 transition-colors disabled:opacity-50"
                      >
                        {fetchingSubjects ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        Fetch Subjects
                      </button>
                    </div>

                    {!fetchedSubjects ? (
                      <div className="text-xs text-gray-500 italic px-1 cursor-default">
                        Click &apos;Fetch Subjects&apos; to populate valid courses for this semester.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-white/5 bg-black/20 p-2 rounded-xl">
                         <button
                           type="button"
                           onClick={() => setFormData(prev => ({ ...prev, targetSubjectCode: "" }))}
                           className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${formData.targetSubjectCode === "" ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}`}
                         >
                           <span className="font-bold flex gap-2">ALL SUBJECTS <span className="text-gray-500 font-normal">Extract entire semester</span></span>
                         </button>
                         {fetchedSubjects.map(sub => (
                           <button
                             type="button"
                             key={sub.code}
                             onClick={() => setFormData(prev => ({ ...prev, targetSubjectCode: sub.code }))}
                             className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${formData.targetSubjectCode === sub.code ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}`}
                           >
                             <span className="font-bold">{sub.code}</span> - <span className="opacity-80">{sub.name}</span>
                           </button>
                         ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !formData.semester}
                    className="w-full bg-gradient-to-r from-indigo-500 to-teal-600 hover:from-indigo-400 hover:to-teal-500 text-white font-medium py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Establishing Connections
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Initialize Extractions
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Dashboard Area */}
          <div className="lg:col-span-8 space-y-6">
            {!analytics && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] border border-white/5 rounded-3xl bg-white/[0.02] flex flex-col items-center justify-center text-center p-8 border-dashed"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <TerminalSquare className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-medium text-gray-300">Terminal Idle</h3>
                <p className="text-gray-500 mt-2 max-w-sm">
                  Awaiting parameters. Live grade streams and analytical distributions will manifest here organically.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] border border-white/5 rounded-3xl bg-[#0a0f18] flex flex-col items-center justify-center p-8"
              >
                <div className="text-center mb-8">
                  <div className="relative mb-6 inline-block">
                    <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-teal-400 font-bold">
                      {totalCount > 0 ? `${Math.round((processedCount / totalCount) * 100)}%` : '0%'}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-teal-300">Extraction in Progress</h3>
                  <p className="text-gray-400 font-mono mt-1 text-sm bg-black/40 px-3 py-1 rounded inline-block border border-white/5">
                    Processed: {processedCount} / {totalCount || '?'} Queries
                  </p>
                  <div className="mt-3 text-emerald-400/80 font-mono flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Elapsed Time: {formatTime(elapsedTime)}
                  </div>
                </div>

                {/* Live Terminal UI */}
                <div className="w-full max-w-2xl bg-black border border-white/10 rounded-xl overflow-hidden font-mono text-xs">
                  <div className="bg-gray-900 border-b border-white/10 px-4 py-2 flex items-center gap-2 text-gray-400">
                    <TerminalSquare className="w-4 h-4" />
                    Live Extraction Feed (Top 10)
                  </div>
                  <div className="p-4 h-48 overflow-y-auto space-y-2 flex flex-col justify-end text-emerald-400/90 tracking-wide">
                    {liveFeedRows.length === 0 && <span className="opacity-50 blur-[0.5px]">Waiting for raw pipeline buffers...</span>}
                    <AnimatePresence>
                      {liveFeedRows.map((row, idx) => (
                        <motion.div
                          key={`${row.regNo}-${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="border-b border-emerald-900/30 pb-1 flex gap-4"
                        >
                          <span className="text-indigo-400 font-bold shrink-0">[{row.regNo}]</span>
                          <span className="truncate flex-1">{row.subject}</span>
                          <span className="text-white bg-white/10 px-2 rounded shrink-0">{row.grade}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {analytics && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all rounded-full" />
                    <div className="flex items-center gap-3 mb-2 text-indigo-300">
                      <Award className="w-5 h-5" />
                      <span className="font-medium">Batch Average GPA</span>
                    </div>
                    <p className="text-5xl font-black text-white tracking-tighter">
                      {analytics.averageGPA.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 blur-3xl group-hover:bg-teal-500/20 transition-all rounded-full" />
                    <div className="flex items-center gap-3 mb-2 text-teal-300">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Identities Scraped</span>
                    </div>
                    <p className="text-5xl font-black text-white tracking-tighter">
                      {analytics.successfulScrapes}
                      <span className="text-xl text-gray-500 font-medium tracking-normal ml-2">/ {analytics.totalAttempted}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-semibold text-gray-200">Volume Matrix</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          className="bg-black/50 border border-white/10 text-xs text-gray-300 rounded px-2 py-1 outline-none"
                          value={selectedCourseFilter}
                          onChange={(e) => setSelectedCourseFilter(e.target.value)}
                        >
                          <option value="ALL">All Subjects Combined</option>
                          {Object.keys(analytics.courseGradeDistributions).map(course => (
                            <option key={course} value={course}>{course}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg ext-indigo-300">
                        <span className="text-sm font-medium text-indigo-400">Total Entries: </span>
                        <span className="font-mono font-bold text-white text-lg ml-1">
                          {formatChartData().reduce((sum, item) => sum + item.count, 0)}
                        </span>
                      </div>

                      <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        Export Matrix (XLSX)
                      </button>
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatChartData()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis
                          dataKey="grade"
                          stroke="#ffffff40"
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#ffffff40"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: '#ffffff05' }}
                          contentStyle={{
                            backgroundColor: '#171717',
                            border: '1px solid #333',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                          }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {formatChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-white/5 gap-4">
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <Lock className="w-3 h-3 shrink-0" />
                    Results reside entirely in memory. Raw student data is eliminated on generation.
                  </div>
                  <button
                    onClick={() => {
                      setAnalytics(null);
                      setBatchStatus('entering');
                      setFormData({ year: '', semester: '', branch: '', section: '', targetSubjectCode: '' });
                      setExcelFile(null);
                      setExcelBase64(null);
                      setLiveFeedRows([]);
                      setFetchedSubjects(null);
                    }}
                    className="text-xs font-medium text-gray-400 hover:text-white px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                  >
                    Configure New Target
                  </button>
                </div>

              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
