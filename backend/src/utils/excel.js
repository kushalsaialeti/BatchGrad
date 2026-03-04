const ExcelJS = require('exceljs');

/**
 * Generates an in-memory Excel buffer from section analytics data.
 * @param {Object} sectionAnalysisData 
 * @param {string} sectionName 
 * @returns {Promise<Buffer>}
 */
async function generateExcelBuffer(sectionAnalysisData, sectionName) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${sectionName} Results`);

    // Dynamically build columns based on maximum course count found in students
    let maxCourses = 0;
    sectionAnalysisData.students.forEach(student => {
        if (student.success && student.results) {
            maxCourses = Math.max(maxCourses, student.results.length);
        }
    });

    const columns = [
        { header: 'Regd No', key: 'regNo', width: 15 }
    ];

    for (let i = 1; i <= maxCourses; i++) {
        columns.push({ header: `Course Name-${i}`, key: `courseName${i}`, width: 30 });
        columns.push({ header: `Grade-${i}`, key: `grade${i}`, width: 10 });
    }

    columns.push({ header: 'SGPA', key: 'sgpa', width: 10 });
    columns.push({ header: 'CGPA', key: 'cgpa', width: 10 });
    columns.push({ header: 'Exam Month/Year', key: 'exammy', width: 15 });
    columns.push({ header: 'Result', key: 'papResult', width: 10 });
    columns.push({ header: 'Status', key: 'status', width: 20 });

    sheet.columns = columns;

    // Add rows
    sectionAnalysisData.students.forEach(student => {
        const rowData = {
            regNo: student.regNo,
            status: student.success ? 'Success' : `Failed: ${student.error}`
        };

        if (student.success && student.results) {
            student.results.forEach((course, index) => {
                const num = index + 1;
                rowData[`courseName${num}`] = course.subjectName;
                rowData[`grade${num}`] = course.grade;
            });

            rowData.sgpa = student.sgpa || 'N/A';
            rowData.cgpa = student.cgpa || 'N/A';

            // Assume exammy and result are somewhat uniform for the semester, taking from the first course
            if (student.results.length > 0) {
                rowData.exammy = student.results[0].exammy || 'N/A';
                // Also can calculate cumulative pass/fail or just take the general Result
                rowData.papResult = student.results.every(r => r.result && r.result.toUpperCase() === 'PASS') ? 'PASS' : 'FAIL';
            }
        }

        sheet.addRow(rowData);
    });

    // Style the header row
    sheet.getRow(1).font = { bold: true };

    // Generate buffer in-memory to respect Zero Persistence architecture
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

module.exports = {
    generateExcelBuffer
};
