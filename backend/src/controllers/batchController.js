const { z } = require('zod');
const { processSection } = require('../services/batcher');
const { analyzeSection } = require('../utils/analyzer');
const { generateExcelBuffer } = require('../utils/excel');
const { supabase } = require('../config/supabase');
const xlsx = require('xlsx');

// Year is now passed as string format e.g. "2023-27"
const ScrapeRequestSchema = z.object({
    year: z.string().min(1),
    semester: z.union([z.string(), z.number()]).transform(val => parseInt(val, 10)),
    branch: z.string().min(1),
    section: z.string().min(1)
});

const uploadBatchController = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No excel file uploaded' });

        const { year, branch, section } = req.body;
        if (!year || !branch || !section) {
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

        const inserts = regNos.map(regNo => ({
            reg_no: regNo,
            year: year,
            branch: branch.toUpperCase(),
            section: section.toUpperCase()
        }));

        const { error } = await supabase.from('student_registry').upsert(inserts, { onConflict: 'reg_no' });

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to save to database', error: error.message });
        }

        res.json({ success: true, count: regNos.length });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const checkBatchController = async (req, res) => {
    try {
        const { year, branch, section } = req.query;
        if (!year || !branch || !section) return res.status(400).json({ success: false, message: 'Missing parameters' });

        const { count, error } = await supabase
            .from('student_registry')
            .select('*', { count: 'exact', head: true })
            .match({ year: String(year), branch: branch.toUpperCase(), section: section.toUpperCase() });

        if (error) throw error;

        res.json({ success: true, exists: count > 0, count });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

const analyzeSectionController = async (req, res) => {
    try {
        const validatedData = ScrapeRequestSchema.parse(req.body);
        const { year, semester, branch, section } = validatedData;

        // Set Headers for progressive chunked streaming
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Progressive stream callback passed to Batcher Engine
        const onProgress = (data) => {
            const streamPacket = { type: 'progress', data };
            res.write(JSON.stringify(streamPacket) + '\n');
        };

        const batchResults = await processSection(String(year), branch, section, semester, onProgress);

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

module.exports = {
    analyzeSectionController,
    checkBatchController,
    uploadBatchController
};
