const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = `
<table class="table-bordered bootstrap-datatable datatable" cellspacing="0" rules="all" border="1" id="cBody_dgvStudentHistory" style="height:500px;border-collapse:collapse;">
<tbody><tr>
<th scope="col">Code </th><th scope="col">Course Name</th><th scope="col">CR</th><th scope="col">GR</th><th scope="col">EXAMMY</th><th scope="col">Result</th>
</tr>
    <tr style="color:White;background-color:#2268B4;">
<td></td>
        <td><span id="cBody_dgvStudentHistory_lblPName_0">SEMESTER-I</span></td>
        <td></td><td></td><td></td><td></td>
</tr>
    <tr style="color:Green;background-color:White;">
<td><span id="cBody_dgvStudentHistory_lblPCODE_1">B23HS1101</span></td>
        <td><span id="cBody_dgvStudentHistory_lblPName_1">Communicative English</span></td>
        <td><input type="text" value="2.00"></td>
        <td><input type="text" value="A"></td>
        <td><input type="text" value="Feb-2024"></td>
        <td><input type="text" value="PASS"></td>
</tr>
    <tr style="color:White;background-color:#2268B4;">
<td></td>
        <td><span id="cBody_dgvStudentHistory_lblPName_0">SEMESTER-II</span></td>
        <td></td><td></td><td></td><td></td>
</tr>
    <tr style="color:Green;background-color:White;">
<td><span id="cBody_dgvStudentHistory_lblPCODE_1">B23HS2201</span></td>
        <td><span id="cBody_dgvStudentHistory_lblPName_1">Maths</span></td>
        <td><input type="text" value="3.00"></td>
        <td><input type="text" value="C"></td>
        <td><input type="text" value="Feb-2025"></td>
        <td><input type="text" value="PASS"></td>
</tr>
</table>`;
const dom = new JSDOM(html);
const document = dom.window.document;

const extractedRows = [];
const tableRows = document.querySelectorAll(`table tbody tr, table tr`);
      
let currentSemesterContext = false;
const targetRoman = 'I';
const targetHeaderKeyword = `SEMESTER-${targetRoman}`;

tableRows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    const rowText = row.textContent.trim().toUpperCase(); // JSDOM uses textContent instead of innerText

    if (rowText.includes('SEMESTER-')) {
        if (rowText.includes(targetHeaderKeyword)) {
            currentSemesterContext = true;
        } else {
            currentSemesterContext = false;
        }
    } 
    else if (currentSemesterContext && cells.length >= 6) {
        // extract values from inputs if available, otherwise text
        const cellMap = Array.from(cells).map(c => {
            const input = c.querySelector('input');
            return input ? input.value : c.textContent.trim();
        });
        
        const subjectCode = cellMap[0] || "";
        const subjectName = cellMap[1] || "";
        const credits = parseFloat(cellMap[2]) || 0;
        const grade = cellMap[3] || "";
        const exammy = cellMap[4] || "";
        const result = cellMap[5] || "";

        if (subjectCode && subjectCode.toUpperCase() !== "CODE" && grade) {
            extractedRows.push({ subjectCode, subjectName, credits, grade, result });
        }
    }
});
console.log(extractedRows);
