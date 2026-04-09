import React, { useState } from 'react';
import { TerminalSquare, AlertCircle, BarChart3, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Component Imports
import Header from './components/Layout/Header';
import BatchConfigForm from './components/Config/BatchConfigForm';
import RegistryStatus from './components/Config/RegistryStatus';
import SubjectFilter from './components/Config/SubjectFilter';
import StatsSummary from './components/Analytics/StatsSummary';
import GradeChart from './components/Analytics/GradeChart';
import LiveFeed from './components/Analytics/LiveFeed';

// Hook & Service Imports
import useBatchAnalytics from './hooks/useBatchAnalytics';
import { checkBatch, uploadBatch, fetchSubjects } from './services/api';

const App = () => {
  const [formData, setFormData] = useState({
    year: "",
    semester: "",
    branch: "",
    section: "",
    targetSubjectCode: "",
  });

  const [batchStatus, setBatchStatus] = useState('entering');
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(false);
  const [fetchedSubjects, setFetchedSubjects] = useState(null);

  const {
    loading, analytics, excelBase64, error, setError,
    processedCount, totalCount, liveFeedRows, elapsedTime,
    startAnalysis, resetState
  } = useBatchAnalytics();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name !== 'semester' && name !== 'targetSubjectCode') {
      setBatchStatus('entering');
      resetState();
      setFetchedSubjects(null);
    }
    if (name === 'semester') {
      setFetchedSubjects(null);
    }
  };

  const handleVerifyBatch = async (e) => {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const response = await checkBatch(formData.year, formData.branch, formData.section);
      if (response.data.exists) {
        setBatchStatus('ready');
      } else {
        setBatchStatus('needs_upload');
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify batch consistency.");
    } finally {
      setChecking(false);
    }
  };

  const handleFileUpload = async () => {
    if (!excelFile) return;
    setUploading(true);
    setError(null);
    try {
      const uploadData = new FormData();
      uploadData.append("file", excelFile);
      uploadData.append("year", formData.year);
      uploadData.append("branch", formData.branch);
      uploadData.append("section", formData.section);

      const response = await uploadBatch(uploadData);
      if (response.data.success) {
        setBatchStatus('ready');
        setExcelFile(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "File upload error: Are you sure column exists?");
    } finally {
      setUploading(false);
    }
  };

  const handleFetchSubjects = async () => {
    setFetchingSubjects(true);
    setError(null);
    try {
      const response = await fetchSubjects(formData.year, formData.semester, formData.branch, formData.section);
      if (response.data.success) {
        setFetchedSubjects(response.data.subjects);
        setFormData(prev => ({ ...prev, targetSubjectCode: "" }));
      }
    } catch {
      setError("Failed to fetch subjects.");
    } finally {
      setFetchingSubjects(false);
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-2xl sticky top-8"
          >
            <BatchConfigForm 
               formData={formData} 
               onChange={handleInputChange} 
               onVerify={handleVerifyBatch}
               checking={checking}
               batchStatus={batchStatus}
            />

            {batchStatus !== 'entering' && (
              <>
                <RegistryStatus 
                  status={batchStatus} 
                  onUpload={handleFileUpload}
                  onUpdateRegistry={() => setBatchStatus('needs_upload')}
                  uploading={uploading}
                  excelFile={excelFile}
                  setExcelFile={setExcelFile}
                />

                {batchStatus === 'ready' && (
                  <>
                    <SubjectFilter 
                      semester={formData.semester}
                      onSemesterChange={handleInputChange}
                      onFetchSubjects={handleFetchSubjects}
                      fetchingSubjects={fetchingSubjects}
                      subjects={fetchedSubjects}
                      targetCode={formData.targetSubjectCode}
                      onSubjectSelect={(code) => setFormData(prev => ({ ...prev, targetSubjectCode: code }))}
                    />

                    <button
                      onClick={() => startAnalysis(formData)}
                      disabled={loading || !formData.semester}
                      className="w-full bg-gradient-to-r from-indigo-500 to-teal-600 hover:from-indigo-400 hover:to-teal-500 text-white font-medium py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                           <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><AlertCircle className="w-5 h-5" /></motion.div>
                           Establishing Connections
                        </div>
                      ) : (
                        <>
                          <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Initialize Extractions
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

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

            <LiveFeed 
              loading={loading}
              rows={liveFeedRows}
              processedCount={processedCount}
              totalCount={totalCount}
              elapsedTime={elapsedTime}
            />

            {analytics && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <StatsSummary analytics={analytics} />
                <GradeChart analytics={analytics} onDownload={handleDownloadExcel} />
                <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-white/5 gap-4">
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Results reside entirely in memory. Raw student data is eliminated on generation.
                  </div>
                  <button 
                    onClick={() => {
                        resetState();
                        setBatchStatus('entering');
                        setFormData({ year: '', semester: '', branch: '', section: '', targetSubjectCode: '' });
                        setFetchedSubjects(null);
                    }} 
                    className="text-xs font-medium text-gray-400 hover:text-white px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
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
};

export default App;
