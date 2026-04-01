// ============================================================
// State
// ============================================================
let currentDataSource = 'function'; // 'function' | 'upload'
let uploadedSeries = null;          // Float64Array or null
let uploadedFileName = null;

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('metric').value = 'beta';
    toggleThresholdInput();
    initUploadZone();
});

// ============================================================
// Data source toggle
// ============================================================
function setDataSource(source) {
    currentDataSource = source;
    document.getElementById('src-function').classList.toggle('active', source === 'function');
    document.getElementById('src-upload').classList.toggle('active', source === 'upload');
    document.getElementById('function-input-group').classList.toggle('hidden', source !== 'function');
    document.getElementById('upload-input-group').classList.toggle('hidden', source !== 'upload');
}

// ============================================================
// Format guide modal
// ============================================================
function toggleFormatModal() {
    const modal = document.getElementById('format-modal');
    modal.classList.toggle('hidden');
    document.body.style.overflow = modal.classList.contains('hidden') ? 'auto' : 'hidden';
}

function closeFormatModal(event) {
    if (event.target.id === 'format-modal') toggleFormatModal();
}

// ============================================================
// File upload — click, drag-and-drop
// ============================================================
function initUploadZone() {
    const zone = document.getElementById('upload-zone');
    if (!zone) return;

    zone.addEventListener('dragover', function(e) {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function() {
        zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            processFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = parseTimeSeries(e.target.result);
            uploadedSeries = parsed;
            uploadedFileName = file.name;
            showFileInfo(file.name, parsed.length);
        } catch (err) {
            uploadedSeries = null;
            uploadedFileName = null;
            resetUploadZone();
            alert('Parse error: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function parseTimeSeries(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) throw new Error('File is empty.');

    // Detect delimiter from the first non-empty line
    let startIdx = 0;
    const delimiters = [',', ';', '\t', /\s+/];

    function splitLine(line) {
        for (const d of delimiters) {
            const parts = line.split(d).map(s => s.trim()).filter(s => s.length > 0);
            if (parts.length > 1) return parts;
        }
        return [line.trim()];
    }

    // Check if first line is a header (contains non-numeric tokens)
    const firstParts = splitLine(lines[0]);
    const isHeader = firstParts.some(p => isNaN(parseFloat(p)));
    if (isHeader) startIdx = 1;

    const values = [];
    for (let i = startIdx; i < lines.length; i++) {
        const parts = splitLine(lines[i]);
        // Take last column as the value
        const raw = parts[parts.length - 1];
        const val = parseFloat(raw);
        if (!isFinite(val)) throw new Error(`Non-numeric value on line ${i + 1}: "${raw}"`);
        values.push(val);
    }

    if (values.length < 3) throw new Error('Need at least 3 data points.');
    return values;
}

function showFileInfo(name, length) {
    const zone = document.getElementById('upload-zone');
    zone.classList.add('has-file');
    document.getElementById('upload-label').textContent = name;
    document.getElementById('upload-sublabel').textContent = length + ' samples loaded';
    document.getElementById('file-info').classList.remove('hidden');
    document.getElementById('file-info-text').textContent = name + '  —  ' + length + ' points';
}

function clearUploadedFile() {
    uploadedSeries = null;
    uploadedFileName = null;
    document.getElementById('file-input').value = '';
    resetUploadZone();
}

function resetUploadZone() {
    const zone = document.getElementById('upload-zone');
    zone.classList.remove('has-file');
    document.getElementById('upload-label').textContent = 'Click or drop a file here';
    document.getElementById('upload-sublabel').textContent = '.csv, .txt, or .tsv';
    document.getElementById('file-info').classList.add('hidden');
}

// ============================================================
// Original helpers (unchanged)
// ============================================================
function toggleAuthorModal(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('author-modal');
    modal.classList.toggle('hidden');
    document.body.style.overflow = modal.classList.contains('hidden') ? 'auto' : 'hidden';
}

function closeAuthorModal(event) {
    if (event.target.id === 'author-modal') toggleAuthorModal();
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

function copyCode(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = btnElement.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fa-solid fa-check text-green-400';
        setTimeout(() => { icon.className = originalClass; }, 2000);
    }).catch(err => console.error('Failed to copy: ', err));
}

const bibtexData = {
    'deckert2025': `@INPROCEEDINGS{deckert2025,
  author={Deckert, Elena and Dreesen, Philippe and Marwan, Norbert and Boussé, Martijn},
  booktitle={2025 33rd European Signal Processing Conference (EUSIPCO)}, 
  title={{Beta-Divergence-Based Recurrence Plots for Audio Time-Series Analysis}}, 
  year={2025},
  volume={},
  number={},
  keywords={Machine learning algorithms;Time series analysis;Europe;Data visualization;Signal processing;Extraterrestrial measurements;Machine listening;Tuning;Physics;Astronomy;recurrence plots;$\\beta$-divergences;audio analysis},
  doi={10.23919/EUSIPCO63237.2025.11226301}}`,
    'polakowski2026': `@unpublished{polakowski2026,
  author    = {Filip Polakowski-Karol and Carlos Martínez and Pietro Bonizzi and Joël Karel and Ralf Peeters and Philippe Dreesen and Martijn Boussé},
  title     = {Beta-Divergence-Based Recurrence Analysis of EEG Signals for Seizure Detection},
  note      = {Submitted to EUSIPCO 2026, under review},
  year      = {2026}
}`
};

function copyBibtex(id, btnElement) {
    if (bibtexData[id]) {
        navigator.clipboard.writeText(bibtexData[id]).then(() => {
            const icon = btnElement.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fa-solid fa-check text-green-500';
            setTimeout(() => { icon.className = originalClass; }, 2000);
        }).catch(err => console.error('Failed to copy BibTeX: ', err));
    }
}

function copyObfuscatedEmail(user, domain, btnElement) {
    const email = user + '@' + domain;
    navigator.clipboard.writeText(email).then(() => {
        const icon = btnElement.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fa-solid fa-check text-green-500';
        btnElement.innerHTML = `<i class="${icon.className} mr-1"></i> Copied!`;
        setTimeout(() => {
            btnElement.innerHTML = `<i class="${originalClass} mr-1"></i> Copy Email`;
        }, 2000);
    }).catch(err => console.error('Failed to copy email: ', err));
}

function toggleBeta() {
    const metric = document.getElementById('metric').value;
    const betaGroup = document.getElementById('beta_group');
    betaGroup.style.display = (metric === 'beta') ? 'block' : 'none';
}

function toggleThresholdInput() {
    const rpType = document.getElementById('rp_type').value;
    const thresholdInput = document.getElementById('threshold');
    thresholdInput.disabled = (rpType === 'unthresholded');
}

function downloadImage() {
    const imgElement = document.getElementById('result');
    const link = document.createElement('a');
    link.href = imgElement.src;
    link.download = 'recurrence_plot.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function linspace(start, end, num) {
    const arr = [];
    const step = (end - start) / (num - 1);
    for (let i = 0; i < num; i++) arr.push(start + i * step);
    return arr;
}

function getViridisColor(t) {
    const stops = [
        { pct: 0.00, c: [68, 1, 84] },
        { pct: 0.25, c: [59, 82, 139] },
        { pct: 0.50, c: [33, 145, 140] },
        { pct: 0.75, c: [94, 201, 98] },
        { pct: 1.00, c: [253, 231, 37] }
    ];
    if (t <= 0) return stops[0].c;
    if (t >= 1) return stops[4].c;
    for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].pct && t <= stops[i+1].pct) {
            let range = stops[i+1].pct - stops[i].pct;
            let localPct = (t - stops[i].pct) / range;
            return [
                Math.round(stops[i].c[0] + localPct * (stops[i+1].c[0] - stops[i].c[0])),
                Math.round(stops[i].c[1] + localPct * (stops[i+1].c[1] - stops[i].c[1])),
                Math.round(stops[i].c[2] + localPct * (stops[i+1].c[2] - stops[i].c[2]))
            ];
        }
    }
}

// ============================================================
// Main RP calculation — now supports both data sources
// ============================================================
async function calculateRP() {
    const metric = document.getElementById("metric").value;
    const beta = parseFloat(document.getElementById('beta').value);
    const rpType = document.getElementById('rp_type').value;
    const threshold = parseFloat(document.getElementById('threshold').value);
    const m = parseInt(document.getElementById('embedding_dim').value);
    const tau = parseInt(document.getElementById('time_delay').value);

    const imgElement = document.getElementById('result');
    const errorElement = document.getElementById('errorMessage');
    const loadingElement = document.getElementById('loading');
    const placeholderText = document.getElementById('placeholder-text');
    const downloadBtn = document.getElementById('downloadBtn');
    const plotTitle = document.getElementById('plotTitle');

    errorElement.classList.add('hidden');
    imgElement.classList.add('hidden');
    downloadBtn.classList.add('hidden');
    plotTitle.classList.add('hidden');
    placeholderText.classList.add('hidden');
    loadingElement.classList.remove('hidden');
    loadingElement.classList.add('flex');

    await new Promise(r => setTimeout(r, 50));

    try {
        let series;
        let titleLabel;

        if (currentDataSource === 'function') {
            const funcStr = document.getElementById("function").value;
            const t = linspace(0, 10, 500);
            const compiled = math.compile(funcStr);
            series = t.map(v => compiled.evaluate({x: v}));
            titleLabel = `f(x) = ${funcStr}`;
        } else {
            if (!uploadedSeries || uploadedSeries.length === 0) {
                throw new Error("No data loaded. Please upload a file first.");
            }
            series = uploadedSeries;
            titleLabel = uploadedFileName || 'uploaded data';
        }

        if (metric === 'beta' && series.some(val => val <= 0)) {
            throw new Error("For Beta divergence, all values must be strictly > 0.");
        }

        const N = series.length;
        const N_prime = N - (m - 1) * tau;

        if (N_prime <= 0) {
            throw new Error("Time series is too short for the given embedding dimension and time delay.");
        }

        let distances = [];
        let min_dist = Infinity;
        let max_dist = -Infinity;

        for (let i = 0; i < N_prime; i++) {
            distances[i] = [];
            let vec_i = [];
            for (let k = 0; k < m; k++) vec_i.push(series[i + k * tau]);

            for (let j = 0; j < N_prime; j++) {
                let vec_j = [];
                for (let k = 0; k < m; k++) vec_j.push(series[j + k * tau]);

                let dist = 0;
                if (metric === 'euclidean') {
                    let sumSq = 0;
                    for (let k = 0; k < m; k++) {
                        let diff = vec_i[k] - vec_j[k];
                        sumSq += diff * diff;
                    }
                    dist = Math.sqrt(sumSq);
                } else if (metric === 'beta') {
                    for (let k = 0; k < m; k++) {
                        let x = vec_i[k];
                        let y = vec_j[k];
                        let div = 0;
                        if (Math.abs(beta - 1.0) < 0.001) {
                            div = x * Math.log(x/y) - x + y;
                        } else if (Math.abs(beta - 0.0) < 0.001) {
                            div = (x/y) - Math.log(x/y) - 1.0;
                        } else {
                            div = (Math.pow(x, beta) + (beta - 1)*Math.pow(y, beta) - beta * x * Math.pow(y, beta - 1)) / (beta * (beta - 1));
                        }
                        dist += div;
                    }
                }
                distances[i][j] = dist;
                if (dist < min_dist) min_dist = dist;
                if (dist > max_dist) max_dist = dist;
            }
        }

        const canvas = document.createElement("canvas");
        canvas.width = N_prime;
        canvas.height = N_prime;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(N_prime, N_prime);

        for (let i = 0; i < N_prime; i++) {
            for (let j = 0; j < N_prime; j++) {
                let dist = distances[i][j];
                let canvasX = j;
                let canvasY = N_prime - 1 - i;
                let idx = (canvasY * N_prime + canvasX) * 4;

                if (rpType === 'thresholded') {
                    if (dist < threshold) {
                        imgData.data[idx] = 0;
                        imgData.data[idx+1] = 0;
                        imgData.data[idx+2] = 0;
                    } else {
                        imgData.data[idx] = 255;
                        imgData.data[idx+1] = 255;
                        imgData.data[idx+2] = 255;
                    }
                    imgData.data[idx+3] = 255;
                } else {
                    let norm = max_dist > min_dist ? (dist - min_dist) / (max_dist - min_dist) : 0;
                    let color = getViridisColor(norm);
                    imgData.data[idx] = color[0];
                    imgData.data[idx+1] = color[1];
                    imgData.data[idx+2] = color[2];
                    imgData.data[idx+3] = 255;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);

        loadingElement.classList.remove('flex');
        loadingElement.classList.add('hidden');

        const metricLabel = metric === 'beta' ? 'β-RP' : 'Euclidean-RP';
        plotTitle.innerText = `${metricLabel}: ${titleLabel}`;
        plotTitle.classList.remove('hidden');

        imgElement.src = canvas.toDataURL("image/png");
        imgElement.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');

    } catch (err) {
        loadingElement.classList.remove('flex');
        loadingElement.classList.add('hidden');
        errorElement.innerText = err.message || "An error occurred during calculation.";
        errorElement.classList.remove('hidden');
    }
}
