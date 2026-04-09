import { useState, useCallback, useRef, useEffect } from 'react';
import { ANALYZE_URL } from '../services/api';

/**
 * Custom hook to manage the extraction process and real-time data stream
 * @param {string} apiBaseUrl - Base URL of the API
 */
export function useBatchAnalytics(apiBaseUrl = ANALYZE_URL) {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [excelBase64, setExcelBase64] = useState(null);
  const [error, setError] = useState(null);
  
  // Real-time progress states
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [liveFeedRows, setLiveFeedRows] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  const timerRef = useRef(null);

  // Timer logic
  useEffect(() => {
    if (loading) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const resetState = useCallback(() => {
    setAnalytics(null);
    setExcelBase64(null);
    setLiveFeedRows([]);
    setProcessedCount(0);
    setTotalCount(0);
    setError(null);
    setElapsedTime(0);
  }, []);

  const startAnalysis = useCallback(async (formData) => {
    setError(null);
    setLoading(true);
    resetState();

    try {
      const fetchResponse = await fetch(apiBaseUrl, {
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
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);

            if (parsed.type === 'progress') {
              const { completed, total, regNo, result } = parsed.data;
              setProcessedCount(completed);
              setTotalCount(total);

              if (result.success && result.results && result.results.length > 0) {
                setLiveFeedRows(prev => {
                  const expanded = result.results.map(r => ({
                    regNo,
                    subject: r.subjectName,
                    grade: r.grade
                  }));
                  const next = [...expanded, ...prev];
                  return next.slice(0, 10);
                });
              }
            } else if (parsed.type === 'complete') {
              setAnalytics(parsed.data);
              setExcelBase64(parsed.excelBase64);
              setLoading(false);
            } else if (parsed.type === 'error') {
              setError(parsed.message);
              setLoading(false);
            }
          } catch (e) {
            // Silently ignore individual JSON parse errors for stream robustness
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error in extraction pipeline.");
      setLoading(false);
    }
  }, [apiBaseUrl, resetState]);

  return {
    loading,
    analytics,
    excelBase64,
    error,
    processedCount,
    totalCount,
    liveFeedRows,
    elapsedTime,
    startAnalysis,
    resetState,
    setAnalytics,
    setError
  };
}

export default useBatchAnalytics;
