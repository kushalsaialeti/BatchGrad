const { z } = require('zod');
const { processSection } = require('../services/batcher');
const { analyzeSection } = require('../utils/analyzer');
const { generateExcelBuffer } = require('../utils/excel');
const { normalizeYearInput, buildYearCandidates, isYearTypeError } = require('../utils/year');
const { supabase } = require('../config/supabase');
const xlsx = require('xlsx');
const { scrapeStudentData } = require('../services/scraper');

// Year is now passed as string format e.g. "2023-27"
const ScrapeRequestSchema = z.object({
    year: z.string().min(1),
    semester: z.union([z.string(), z.number()]).transform(val => parseInt(val, 10)),
    branch: z.string().min(1),
    section: z.string().min(1),
    targetSubjectCode: z.string().optional()
});

const uploadBatchController = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No excel file uploaded' });

        const { year, branch, section } = req.body;
        const normalizedYear = normalizeYearInput(year);

        if (!normalizedYear || !branch || !section) {
            return res.status(400).json({ success: false, message: 'Missing parameters' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Parse raw array to dynamically locate target column
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length === 0) return res.status(400).json({ success: false, message: 'Empty sheet' });

        const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/['"]/g, ''));
        const colIndex = headers.findIndex(h =>
            h === 'redg_no' ||
            h === 'regd_no' ||
            h === 'reg_no' ||
            h === 'registration_number' ||
            h === 'registration no' ||
            h === 'registration no.'
        );

        if (colIndex === -1) {
            return res.status(400).json({ success: false, message: `Column "regd_no" not found in the first column. Detected headers: [${headers.join(', ')}]` });
        }

        const regNos = [];

        // Loop from 2nd row (index 1) to before the first empty row
        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            // Break if the row is entirely empty
            if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === "")) {
                break;
            }

            const val = row[colIndex];
            if (val) {
                const strVal = String(val).trim();
                if (strVal.length >= 6) {
                    regNos.push(strVal);
                }
            }
        }

        if (regNos.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid registration numbers extracted. Ensure the file conforms to requirements.' });
        }

        const yearCandidates = buildYearCandidates(normalizedYear);
        let upsertError = null;

        for (const yearValue of yearCandidates) {
            const inserts = regNos.map(regNo => ({
                reg_no: regNo,
                year: yearValue,
                branch: branch.toUpperCase(),
                section: section.toUpperCase()
            }));

            const { error } = await supabase.from('student_registry').upsert(inserts, { onConflict: 'reg_no' });
            if (!error) {
                upsertError = null;
                break;
            }

            upsertError = error;
            if (!isYearTypeError(error.message)) {
                break;
            }
        }

        if (upsertError) {
            return res.status(500).json({ success: false, message: 'Failed to save to database', error: upsertError.message });
        }

        res.json({ success: true, count: regNos.length });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const checkBatchController = async (req, res) => {
    try {
        const { year, branch, section } = req.query;
        const normalizedYear = normalizeYearInput(year);

        if (!normalizedYear || !branch || !section) return res.status(400).json({ success: false, message: 'Missing parameters' });

        const yearCandidates = buildYearCandidates(normalizedYear);
        let resolvedCount = 0;
        let lastError = null;

        for (const yearValue of yearCandidates) {
            const { count, error } = await supabase
                .from('student_registry')
                .select('*', { count: 'exact', head: true })
                .match({ year: yearValue, branch: branch.toUpperCase(), section: section.toUpperCase() });

            if (error) {
                lastError = error;
                if (!isYearTypeError(error.message)) {
                    break;
                }
                continue;
            }

            lastError = null;
            resolvedCount = count || 0;

            if (resolvedCount > 0) {
                break;
            }
        }

        if (lastError) throw lastError;

        res.json({ success: true, exists: resolvedCount > 0, count: resolvedCount });
    } catch (error) {
        const message = String(error?.message || 'Database check failed');
        const isConnectivityError =
            message.includes('fetch failed') ||
            message.includes('ENOTFOUND') ||
            message.includes('ECONNREFUSED') ||
            message.includes('ETIMEDOUT');

        if (isConnectivityError) {
            return res.status(503).json({
                success: false,
                message: 'Database is unreachable. Check SUPABASE_URL/network connectivity and try again.'
            });
        }

        res.status(500).json({ success: false, message });
    }
}

const analyzeSectionController = async (req, res) => {
    try {
        const validatedData = ScrapeRequestSchema.parse(req.body);
        const { year, semester, branch, section, targetSubjectCode } = validatedData;
        const normalizedYear = normalizeYearInput(year);

        // Set Headers for progressive chunked streaming
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Progressive stream callback passed to Batcher Engine
        const onProgress = (data) => {
            const streamPacket = { type: 'progress', data };
            res.write(JSON.stringify(streamPacket) + '\n');
        };

        const batchResults = await processSection(normalizedYear, branch, section, semester, targetSubjectCode, onProgress);

        const metadata = { year, semester, branch, section };
        const analytics = analyzeSection(batchResults, metadata);

        const excelBuffer = await generateExcelBuffer(analytics, `${year}-${branch}-${section}-Sem${semester}`);

        res.write(JSON.stringify({
            type: 'complete',
            data: analytics,
            excelBase64: excelBuffer.toString('base64')
        }) + '\n');

        res.end();

    } catch (error) {
        if (!res.headersSent) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ success: false, errors: error.errors });
            }
            return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
        } else {
            res.write(JSON.stringify({
                type: 'error',
                message: error.message || 'Internal Server Error occurred during batch generation.'
            }) + '\n');
            res.end();
        }
    }
};

const fetchSubjectsController = async (req, res) => {
    try {
        const { year, semester, branch, section } = req.query;
        const normalizedYear = normalizeYearInput(year);

        if (!normalizedYear || !semester || !branch || !section) {
            return res.status(400).json({ success: false, message: 'Missing parameters' });
        }

        const yearCandidates = buildYearCandidates(normalizedYear);
        let studentRegNo = null;

        for (const yearValue of yearCandidates) {
            const { data, error } = await supabase
                .from('student_registry')
                .select('reg_no')
                .match({ year: yearValue, branch: branch.toUpperCase(), section: section.toUpperCase() })
                .limit(1);

            if (data && data.length > 0) {
                studentRegNo = data[0].reg_no;
                break;
            }
        }

        if (!studentRegNo) {
            return res.status(404).json({ success: false, message: 'No students found in registry for this batch to sample from.' });
        }

        // Use the scraper strictly without a target subject filter to get all subjects for this semester
        const result = await scrapeStudentData(studentRegNo, parseInt(semester, 10));

        if (!result.success) {
            // Try another student if the first one failed (maybe they dropped out)
            const { data } = await supabase
               .from('student_registry')
               .select('reg_no')
               .match({ year: yearCandidates[0] || normalizedYear, branch: branch.toUpperCase(), section: section.toUpperCase() })
               .neq('reg_no', studentRegNo)
               .limit(1);
            
            if (data && data[0]) {
                const secondTry = await scrapeStudentData(data[0].reg_no, parseInt(semester, 10));
                if (!secondTry.success) return res.status(500).json({ success: false, message: 'Sample extraction failed. Could not fetch subjects.' });
                
                const subjects = secondTry.results.map(r => ({ code: r.subjectCode, name: r.subjectName }));
                return res.json({ success: true, subjects });
            }
            return res.status(500).json({ success: false, message: 'Sample extraction failed. Could not fetch subjects.' });
        }

        // Map strictly to code and name for the frontend
        const subjects = result.results.map(r => ({ code: r.subjectCode, name: r.subjectName }));
        res.json({ success: true, subjects });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    analyzeSectionController,
    checkBatchController,
    uploadBatchController,
    fetchSubjectsController
};
