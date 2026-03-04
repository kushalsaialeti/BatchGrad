const puppeteer = require('puppeteer');
require('dotenv').config();

const PORTAL_URL = 'https://www.srkrexams.in/Login.aspx';
const STUDENT_HISTORY_URL = 'https://www.srkrexams.in/StudentHistory.aspx';

// Roman numeral mapper for accurate semester matching
const SEMESTERS_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

async function scrapeStudentData(regNo, targetSemester) {
  let browser = null;
  const password = regNo; // Use registration number as the password as requested

  try {
    console.log(`\n[${regNo}] -> Initiating browser instance...`);
    browser = await puppeteer.launch({
      headless: "new",
      // Adding ignore-certificate-errors and removing sandbox limits to fix detached frame issues
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280x800'
      ]
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000); // 60s timeout for slow university portals
    await page.setDefaultTimeout(60000);

    // Removed aggressive request interception. ASP.NET often relies on hidden scripts/callbacks
    // and aborting them causes the "Navigating frame was detached" error during .goto.

    // Navigate to Login Page
    console.log(`[${regNo}] -> Accessing Login URL: ${PORTAL_URL}`);
    await page.goto(PORTAL_URL, { waitUntil: 'load' });

    // Dynamic Login Logic
    console.log(`[${regNo}] -> Injecting credentials & executing ASP.NET postback...`);

    // Check if the inputs exist natively or fallback
    await page.evaluate((rNo, pwd) => {
      const userBox = document.querySelector('#ContentPlaceHolder1_txtUsername') || document.querySelector('input[type="text"]');
      const pwdBox = document.querySelector('#ContentPlaceHolder1_txtPassword') || document.querySelector('input[type="password"]');
      const submitBtn = document.querySelector('#ContentPlaceHolder1_btnLogin') || document.querySelector('input[type="submit"], button');

      if (userBox) userBox.value = rNo;
      if (pwdBox) pwdBox.value = pwd;
      if (submitBtn) submitBtn.click();
    }, regNo, password);

    console.log(`[${regNo}] -> Waiting for redirect barrier...`);
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => console.log(`[${regNo}] -> Navigation await skipped (ASP.NET Quick Redirect)`));

    // Navigate to History Page directly
    console.log(`[${regNo}] -> Transiting to Student History Page: ${STUDENT_HISTORY_URL}`);
    await page.goto(STUDENT_HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Enforce wait for data table render
    await page.waitForSelector('table', { timeout: 15000 }).catch(() => {
      console.warn(`[${regNo}] -> Form table timeout. DOM might be empty or missing element.`);
    });

    const fullHtml = await page.content();
    console.log(`[${regNo}] -> Extracted resulting HTML block (length: ${fullHtml.length} bytes). Processing architecture...`);

    const extractedData = await page.evaluate(({ semesterTarget, targetRoman }) => {
      const extractedRows = [];
      const tableRows = document.querySelectorAll(`table tbody tr, table tr`);

      let currentSemesterContext = false;
      const targetHeaderKeyword = `SEMESTER-${targetRoman}`;

      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        const rowText = row.innerText.trim().toUpperCase();

        // Check if it's a semester breaking row (i.e. SEMESTER-I, SEMESTER-II, etc.)
        if (rowText.includes('SEMESTER-')) {
          // Standardize text locally and check if it has exact string "SEMESTER-I" or whichever target
          if (rowText.includes(targetHeaderKeyword)) {
            // We found the correct block!
            currentSemesterContext = true;
          } else {
            // We entered a different semester block, turn off extraction
            currentSemesterContext = false;
          }
        }
        // If we are currently inside the validated block, and row looks like a course row
        else if (currentSemesterContext && cells.length >= 6) {
          const cellMap = Array.from(cells).map(c => {
            const input = c.querySelector('input');
            return input ? input.value.trim() : c.innerText.trim();
          });

          const subjectCode = cellMap[0] || "";
          const subjectName = cellMap[1] || "";
          const credits = parseFloat(cellMap[2]) || 0;
          const grade = cellMap[3] || "";
          const exammy = cellMap[4] || "";
          const result = cellMap[5] || "";

          // Ensure it's not a secondary header row "Code | Course Name | CR" and subject has characters
          if (subjectCode && subjectCode.toUpperCase() !== "CODE" && grade) {
            extractedRows.push({ subjectCode, subjectName, credits, grade, exammy, result });
          }
        }
      });

      // Extract SGPA & CGPA explicitly from the top summary table if available
      let sgpa = null;
      let cgpa = null;

      const sgpaRows = document.querySelectorAll('#cBody_gvSGPA_CGPA tr');
      sgpaRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const semLabel = cells[0].innerText.trim().toUpperCase();
          if (semLabel === targetRoman) {
            sgpa = parseFloat(cells[1].innerText.trim()) || null;
            cgpa = parseFloat(cells[2].innerText.trim()) || null;
          }
        }
      });

      return {
        rows: extractedRows,
        sgpa: sgpa,
        cgpa: cgpa
      };
    }, {
      semesterTarget: parseInt(targetSemester, 10),
      targetRoman: SEMESTERS_ROMAN[parseInt(targetSemester, 10) - 1] || 'I'
    });

    if (extractedData.rows.length === 0) {
      console.log(`[${regNo}] -> ERROR: No target rows matched Semester ${targetSemester} (${SEMESTERS_ROMAN[parseInt(targetSemester, 10) - 1]}).`);
      return { regNo, success: false, error: `No data found for Semester ${targetSemester}` };
    }

    console.log(`[${regNo}] -> SUCCESS: Scraped ${extractedData.rows.length} subject entries for Semester ${targetSemester}. SGPA: ${extractedData.sgpa}`);
    return {
      regNo,
      success: true,
      results: extractedData.rows,
      sgpa: extractedData.sgpa,
      cgpa: extractedData.cgpa
    };

  } catch (error) {
    console.error(`[${regNo}] -> CRITICAL FAILURE: ${error.message}`);
    return { regNo, success: false, error: error.message || 'Scraping failed for this student' };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeStudentData };
