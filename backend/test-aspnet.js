const axios = require("axios").default;
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const { JSDOM } = require("jsdom");
const https = require("https");

const PORTAL_URL = "https://www.srkrexams.in/Login.aspx";
const STUDENT_HISTORY_URL = "https://www.srkrexams.in/StudentHistory.aspx";

async function testAxiosScrape(regNo) {
    // 1. Setup Cookie Jar and Axios instance
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

    try {
        console.log(`[${regNo}] Fetching Login Page to get ASP.NET tokens...`);
        const loginRes = await client.get(PORTAL_URL);

        // Extract hidden fields
        const dom = new JSDOM(loginRes.data);
        const doc = dom.window.document;

        const viewState = doc.getElementById("__VIEWSTATE")?.value || "";
        const viewStateGen = doc.getElementById("__VIEWSTATEGENERATOR")?.value || "";
        const eventValidation = doc.getElementById("__EVENTVALIDATION")?.value || "";

        if (!viewState) {
            console.error("Could not find __VIEWSTATE. Site might be blocking or changed format.");
            return;
        }

        console.log(`[${regNo}] Found Tokens. Sending POST Login request...`);

        // 2. Perform Login POST
        const params = new URLSearchParams();
        params.append("__VIEWSTATE", viewState);
        params.append("__VIEWSTATEGENERATOR", viewStateGen);
        params.append("__EVENTVALIDATION", eventValidation);
        params.append("ctl00$ContentPlaceHolder1$txtUsername", regNo);
        params.append("ctl00$ContentPlaceHolder1$txtPassword", regNo);
        params.append("ctl00$ContentPlaceHolder1$btnLogin", "Login");

        const postRes = await client.post(PORTAL_URL, params.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        console.log(`[${regNo}] Login POST Response URL:`, postRes.request.res.responseUrl);

        // 3. Fetch Student History directly
        console.log(`[${regNo}] Fetching Student History Page...`);
        const historyRes = await client.get(STUDENT_HISTORY_URL);

        const historyHtml = historyRes.data;
        console.log(`[${regNo}] History HTML size:`, historyHtml.length);

        const hDom = new JSDOM(historyHtml);
        const hDoc = hDom.window.document;

        // Check if we are really logged in
        const tableRows = hDoc.querySelectorAll("table tr");
        console.log(`[${regNo}] Number of table rows found:`, tableRows.length);

        if (tableRows.length > 5) {
            console.log(`SUCCESS! Extracted pure HTML data instantly. ${tableRows.length} rows.`);

            // Print the first row representing student info to confirm
            const studentInfoRow = Array.from(tableRows).find(tr => tr.textContent.includes("REG NO"));
            if (studentInfoRow) {
                console.log("Extracted Profile Header: ", studentInfoRow.textContent.trim().replace(/\s+/g, " "));
            }

        } else {
            console.log("Failed to login or load history.");
            console.log("Title of page:", hDoc.title);
            // Sometimes login might say Invalid Credentials
            const lblMsg = hDoc.getElementById("ContentPlaceHolder1_lblMsg");
            if (lblMsg) console.log("Login Message:", lblMsg.textContent);
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testAxiosScrape("23B91A0501");
