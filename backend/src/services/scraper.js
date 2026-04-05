const axios = require("axios").default;
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const { JSDOM } = require("jsdom");
require('dotenv').config();

const PORTAL_URL = 'https://www.srkrexams.in/Login.aspx';
const STUDENT_HISTORY_URL = 'https://www.srkrexams.in/StudentHistory.aspx';

const SEMESTERS_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

async function scrapeStudentData(regNo, targetSemester, targetSubjectCode = null) {
  const password = regNo; // Use registration number as the password as requested

  // Setup Cookie Jar and Axios instance
  const jar = new CookieJar();
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Origin": "https://www.srkrexams.in",
      "Referer": "https://www.srkrexams.in/Login.aspx"
    },
    maxRedirects: 10
  }));

  let dom = null;
  let hDom = null;

  try {
    console.log(`\n[${regNo}] -> Initiating Fast-Scrape (HTTP API)...`);

    // 1. Get Login Page
    const loginRes = await client.get(PORTAL_URL);
    dom = new JSDOM(loginRes.data);
    const doc = dom.window.document;

    const viewState = doc.getElementById("__VIEWSTATE")?.value || "";
    const viewStateGen = doc.getElementById("__VIEWSTATEGENERATOR")?.value || "";
    const eventValidation = doc.getElementById("__EVENTVALIDATION")?.value || "";

    if (!viewState) {
      throw new Error("Could not find __VIEWSTATE (Site offline or blocked)");
    }

    // 2. Perform Login POST
    console.log(`[${regNo}] -> Injecting credentials & executing ASP.NET POST...`);
    const params = new URLSearchParams();
    params.append("__VIEWSTATE", viewState);
    params.append("__VIEWSTATEGENERATOR", viewStateGen);
    params.append("__EVENTVALIDATION", eventValidation);
    params.append("ctl00$ContentPlaceHolder1$txtUsername", regNo);
    params.append("ctl00$ContentPlaceHolder1$txtPassword", password);
    params.append("ctl00$ContentPlaceHolder1$btnLogin", "Login");

    await client.post(PORTAL_URL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    // 3. Fetch History Page
    console.log(`[${regNo}] -> Transiting to Student History Page...`);
    const historyRes = await client.get(STUDENT_HISTORY_URL);

    // 4. Process Architecture
    const historyHtml = historyRes.data;
    hDom = new JSDOM(historyHtml);
    const hDoc = hDom.window.document;

    const targetRoman = SEMESTERS_ROMAN[parseInt(targetSemester, 10) - 1] || 'I';
    console.log(`[${regNo}] -> Extracted HTML. Processing architecture for Semester ${targetRoman}...`);

    const extractedRowsMap = {};
    const tableRows = hDoc.querySelectorAll(`table tbody tr, table tr`);

    let currentSemesterContext = false;
    const targetHeaderKeyword = `SEMESTER-${targetRoman}`;

    tableRows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      const rowText = row.textContent.trim().toUpperCase();

      if (rowText.includes('SEMESTER-')) {
        // Precise matching for Roman numerals to avoid 'I' matching 'III'
        const tokens = rowText.split(/[\s-]/);
        if (tokens.includes(targetRoman)) {
          currentSemesterContext = true;
        } else {
          currentSemesterContext = false;
        }
      }
      else if (currentSemesterContext && cells.length >= 6) {
        const cellMap = Array.from(cells).map(c => {
          const input = c.querySelector('input');
          return input ? input.value.trim() : c.textContent.trim();
        });

        const subjectCode = cellMap[0] || "";
        const subjectName = cellMap[1] || "";
        const credits = parseFloat(cellMap[2]) || 0;
        const grade = cellMap[3] || "";
        const exammy = cellMap[4] || "";
        const result = cellMap[5] || "";

        if (subjectCode && subjectCode.toUpperCase() !== "CODE" && grade) {
          // If we see the same subject code again, it overwrites the previous one.
          // Since tables are read top-to-bottom, this automatically keeps the LAST occurring result (e.g. supply passed).
          extractedRowsMap[subjectCode] = { subjectCode, subjectName, credits, grade, exammy, result };
        }
      }
    });

    let extractedRows = Object.values(extractedRowsMap);

    // If user provided a specific target subject code to scrape, filter the results
    if (targetSubjectCode && targetSubjectCode.trim() !== "") {
      extractedRows = extractedRows.filter(
        row => row.subjectCode.toUpperCase() === targetSubjectCode.trim().toUpperCase() || 
               row.subjectName.toUpperCase().includes(targetSubjectCode.trim().toUpperCase())
      );
    }

    let sgpa = null;
    let cgpa = null;
    const sgpaRows = hDoc.querySelectorAll('#cBody_gvSGPA_CGPA tr');
    sgpaRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        const semLabel = cells[0].textContent.trim().toUpperCase();
        if (semLabel === targetRoman) {
          sgpa = parseFloat(cells[1].textContent.trim()) || null;
          cgpa = parseFloat(cells[2].textContent.trim()) || null;
        }
      }
    });

    if (extractedRows.length === 0) {
      console.log(`[${regNo}] -> ERROR: No target rows matched Semester ${targetSemester} (${targetRoman}).`);
      return { regNo, success: false, error: `No data found for Semester ${targetSemester}` };
    }

    console.log(`[${regNo}] -> SUCCESS: Scraped ${extractedRows.length} subject entries. SGPA: ${sgpa}`);
    return {
      regNo,
      success: true,
      results: extractedRows,
      sgpa: sgpa,
      cgpa: cgpa
    };

  } catch (error) {
    console.error(`[${regNo}] -> CRITICAL FAILURE: ${error.message}`);
    return { regNo, success: false, error: error.message || 'Scraping failed for this student' };
  } finally {
    // Explicitly close JSDOM instances to free memory
    if (dom) dom.window.close();
    if (hDom) hDom.window.close();
  }
}

module.exports = { scrapeStudentData };
