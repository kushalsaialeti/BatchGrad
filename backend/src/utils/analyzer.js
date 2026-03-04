/**
 * Maps grades to cumulative points.
 */
const GRADE_MAP = {
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'F': 0
};

/**
 * Calculates individual student GPA.
 */
function computeStudentGPA(studentDataResult) {
    if (!studentDataResult || !studentDataResult.success || !studentDataResult.results || studentDataResult.results.length === 0) {
        return {
            regNo: studentDataResult.regNo,
            gpa: 0,
            totalCredits: 0,
            success: false,
            error: studentDataResult.error || 'No results found or scraping failed'
        };
    }

    let totalCredits = 0;

    studentDataResult.results.forEach(subject => {
        totalCredits += subject.credits;
    });

    // Use exactly the extracted SGPA from the university table
    const gpa = studentDataResult.sgpa !== undefined && studentDataResult.sgpa !== null
        ? studentDataResult.sgpa
        : 0;

    return {
        regNo: studentDataResult.regNo,
        gpa: parseFloat(gpa), // We name it gpa for compatibility but it's exact SGPA
        sgpa: studentDataResult.sgpa,
        cgpa: studentDataResult.cgpa,
        totalCredits,
        success: true,
        results: studentDataResult.results
    };
}

/**
 * Aggregates Section Results calculating Averages and distributions.
 */
function analyzeSection(batchResults, metadata = {}) {
    const analyzedStudents = batchResults.map(computeStudentGPA);

    let totalGPA = 0;
    let successfulStudentsCount = 0;

    const gradeDistribution = {
        'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0
    };

    const courseGradeDistributions = {};

    analyzedStudents.forEach(student => {
        if (student.success && student.results) {
            totalGPA += student.gpa;
            successfulStudentsCount++;

            // Calculate grade distribution counts overall
            student.results.forEach(sub => {
                if (gradeDistribution[sub.grade] !== undefined) {
                    gradeDistribution[sub.grade]++;
                }

                // Course-wise distribution
                if (!courseGradeDistributions[sub.subjectName]) {
                    courseGradeDistributions[sub.subjectName] = {
                        'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0
                    };
                }
                if (courseGradeDistributions[sub.subjectName][sub.grade] !== undefined) {
                    courseGradeDistributions[sub.subjectName][sub.grade]++;
                }
            });
        }
    });

    const averageGPA = successfulStudentsCount > 0 ? (totalGPA / successfulStudentsCount) : 0;

    return {
        metadata,
        averageGPA: parseFloat(averageGPA.toFixed(2)),
        successfulScrapes: successfulStudentsCount,
        totalAttempted: batchResults.length,
        gradeDistribution,
        courseGradeDistributions,
        students: analyzedStudents
    };
}

module.exports = {
    computeStudentGPA,
    analyzeSection
};
