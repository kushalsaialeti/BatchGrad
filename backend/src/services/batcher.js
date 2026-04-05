const { scrapeStudentData } = require('./scraper');
const { supabase } = require('../config/supabase');
const { buildYearCandidates, isYearTypeError } = require('../utils/year');

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

async function processSection(year, branch, section, targetSemester, targetSubjectCode, onProgress) {
    try {
        const yearCandidates = buildYearCandidates(year);
        let students = [];
        let lastError = null;

        for (const yearValue of yearCandidates) {
            const { data, error } = await supabase
                .from('student_registry')
                .select('reg_no')
                .match({ year: yearValue, branch: branch.toUpperCase(), section: section.toUpperCase() });

            if (error) {
                lastError = error;
                if (!isYearTypeError(error.message)) {
                    break;
                }
                continue;
            }

            lastError = null;
            students = data || [];

            if (students.length > 0) {
                break;
            }
        }

        if (lastError) {
            throw new Error(`Database query failed: ${lastError.message}`);
        }

        if (!students || students.length === 0) {
            throw new Error(`No students found for ${year}-${branch}-${section} in the registry`);
        }

        const regNos = students.map(s => s.reg_no);
        const CHUNK_SIZE = 8; // Reduced to 8 for memory safety on Render
        const chunks = chunkArray(regNos, CHUNK_SIZE);

        let allResults = [];
        let completed = 0;
        const total = regNos.length;

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async regNo => {
                let attempts = 0;
                let result = null;
                while (attempts < 3) {
                    attempts++;
                    try {
                        result = await scrapeStudentData(regNo, targetSemester, targetSubjectCode);
                        if (result.success || (result.error && (result.error.includes('No data found') || result.error.includes('No target rows')))) {
                            break;
                        }
                    } catch (e) {
                        result = { regNo, success: false, error: e.message };
                    }
                    if (attempts < 3) {
                        console.log(`\n[${regNo}] -> Retrying attempt ${attempts}/3 due to crash...`);
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                completed++;

                // Fire live stream event directly to frontend
                if (onProgress) {
                    onProgress({ completed, total, regNo, result });
                }

                return result;
            });

            const chunkResults = await Promise.all(chunkPromises);
            allResults = allResults.concat(chunkResults);
        }

        return allResults;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    processSection
};
