const Papa = require('papaparse');
const { execSync } = require('child_process');

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTp8VNm5yS63RiflBpMY4b8d4RBTPecjU_RrC10EDcgSitcQxRtt1QbeN67g8bYOyqB088GLOTHIG5g/pub?gid=90746110&single=true&output=csv';

try {
    console.log('Downloading...');
    const csv = execSync(`wget -qO- "${CSV_URL}"`).toString();
    console.log('Parsing...');
    const res = Papa.parse(csv, { header: true, skipEmptyLines: true });

    console.log('--- HEADERS ---');
    console.log(res.meta.fields);

    /* const problemRow = res.data.find(r => JSON.stringify(r).includes('Metov')); */
    const problemRow = res.data.find(r => r['Kit Number'] === 'YF078230');

    if (problemRow) {
        console.log('\n--- PROBLEM ROW YF078230 ---');
        console.log('Kit:', problemRow['Kit Number']);
        console.log('Name Value:', `"${problemRow['Name']}"`);
        console.log('Ancestor Value:', `"${problemRow['Paternal Ancestor Name']}"`);

        console.log('\n--- ALL KEYS MATCHING "Name" ---');
        Object.keys(problemRow).forEach(k => {
            if (k.toLowerCase().includes('name')) {
                console.log(`Key [${k}]: "${problemRow[k]}"`);
            }
        });

        console.log('\nIn import-csv.js logic:');
        const name = problemRow['Name'] || problemRow.Name || problemRow.fullname || problemRow.FullName || problemRow.full_name || '';
        console.log('Resolved Name:', `"${name}"`);
    } else {
        console.log('Row not found');
    }

} catch (e) {
    console.error(e);
}
