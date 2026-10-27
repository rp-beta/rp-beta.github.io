'use strict';

(() => {
    const byId = id => document.getElementById(id);
    const sine = Array.from({ length: 120 }, (_, t) => Math.sin(0.1 * Math.PI * t));
    const resets = {};
    const status = (id, text, correct = false) => {
        const element = byId(id);
        element.textContent = text;
        element.classList.toggle('success', correct);
    };
    function closeSolution(exercise) {
        byId(exercise).querySelectorAll('details').forEach(detail => { detail.open = false; });
    }
    function distances(series, m = 1, tau = 1) {
        const size = series.length - (m - 1) * tau;
        const values = new Float64Array(size * size);
        for (let i = 0; i < size; i++) {
            for (let j = i; j < size; j++) {
                let sum = 0;
                for (let k = 0; k < m; k++) {
                    const difference = series[i + k * tau] - series[j + k * tau];
                    sum += difference * difference;
                }
                values[i * size + j] = values[j * size + i] = Math.sqrt(sum);
            }
        }
        return { size, values };
    }
    function drawRP(canvas, data, epsilon, color = [15, 23, 42]) {
        const { size, values } = data;
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const pixels = ctx.createImageData(size, size);
        let recurrent = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const accepted = data.recurrences ? data.recurrences[i * size + j] === 1 : values[i * size + j] <= epsilon;
                if (accepted) recurrent++;
                const index = ((size - 1 - i) * size + j) * 4;
                for (let channel = 0; channel < 3; channel++) {
                    pixels.data[index + channel] = accepted ? color[channel] : 255;
                }
                pixels.data[index + 3] = 255;
            }
        }
        ctx.putImageData(pixels, 0, 0);
        return 100 * recurrent / values.length;
    }
    function drawSignal(canvas, series) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const min = Math.min(...series);
        const span = Math.max(...series) - min || 1;
        const xAt = index => 10 + index / (series.length - 1) * (width - 20);
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        series.forEach((value, index) => {
            const x = xAt(index);
            const y = height - 10 - (value - min) / span * (height - 20);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
    function blank(id) {
        const canvas = byId(id);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Generate RP', canvas.width / 2, canvas.height / 2);
        canvas.setAttribute('aria-label', 'No plot generated for the selected parameters.');
    }
    function thresholdForRate(data, rate) {
        const sorted = data.values.slice().sort();
        return sorted[Math.max(0, Math.ceil(rate * sorted.length) - 1)];
    }
    drawRP(byId('hero-rp'), distances(sine, 2, 5), 0.35, [79, 70, 229]);

    const vectorSeries = [2, 7, 4, 9, 1, 6, 3, 8];
    function worksheetParameters() {
        const m = Number(byId('vector-m').value);
        const tau = Number(byId('vector-tau').value);
        return { m, tau, size: vectorSeries.length - (m - 1) * tau };
    }
    function locateVector(start) {
        const { m, tau } = worksheetParameters();
        const indices = Array.from({ length: m }, (_, k) => start + k * tau);
        byId('vector-observations').querySelectorAll('.observation').forEach((cell, index) => {
            cell.classList.toggle('is-source', indices.includes(index));
        });
        byId('vector-table-body').querySelectorAll('[data-locate]').forEach(button => {
            button.setAttribute('aria-pressed', String(Number(button.dataset.locate) === start));
        });
        const samples = indices.map(index => index + 1).join(', ');
        byId('vector-source-note').textContent = start === 0
            ? 'Worked row: samples ' + samples + ' give (' + indices.map(index => vectorSeries[index]).join(', ') + ').'
            : 'Samples ' + samples + ' give (' + indices.map(index => vectorSeries[index]).join(', ') + ').';
    }
    function updateVector() {
        const { m, tau, size } = worksheetParameters();
        const header = document.createElement('tr');
        const startHeading = document.createElement('th');
        startHeading.scope = 'col';
        startHeading.textContent = 'Starting sample';
        header.appendChild(startHeading);
        for (let coordinate = 0; coordinate < m; coordinate++) {
            const heading = document.createElement('th');
            heading.scope = 'col';
            heading.textContent = coordinate === 0 ? 'First value' : (coordinate * tau) + (coordinate * tau === 1 ? ' sample later' : ' samples later');
            header.appendChild(heading);
        }
        byId('vector-table-head').replaceChildren(header);
        byId('vector-table-body').replaceChildren();
        for (let start = 0; start < size; start++) {
            const row = document.createElement('tr');
            if (start === 0) row.className = 'worked-row';
            const rowHeading = document.createElement('th');
            rowHeading.scope = 'row';
            const label = document.createElement('span');
            label.textContent = 'Sample ' + (start + 1);
            rowHeading.appendChild(label);
            if (start === 0) {
                const example = document.createElement('small');
                example.textContent = 'Example';
                rowHeading.appendChild(example);
            }
            const locate = document.createElement('button');
            locate.type = 'button';
            locate.className = 'show-vector-solution';
            locate.textContent = 'Show solution';
            locate.dataset.locate = start;
            locate.setAttribute('aria-label', 'Show solution for the row starting at sample ' + (start + 1));
            locate.setAttribute('aria-pressed', 'false');
            locate.addEventListener('click', () => {
                locateVector(start);
                row.querySelectorAll('input').forEach(input => {
                    input.value = vectorSeries[start + Number(input.dataset.coordinate) * tau];
                    input.setAttribute('aria-invalid', 'false');
                    input.dataset.result = 'correct';
                });
                status('vector-feedback', 'Solution shown for the row starting at sample ' + (start + 1) + '.');
            });
            rowHeading.appendChild(locate);
            row.appendChild(rowHeading);
            for (let coordinate = 0; coordinate < m; coordinate++) {
                const cell = document.createElement('td');
                if (start === 0) {
                    const value = document.createElement('strong');
                    value.textContent = vectorSeries[coordinate * tau];
                    cell.appendChild(value);
                } else {
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.step = 'any';
                    input.inputMode = 'decimal';
                    input.autocomplete = 'off';
                    input.dataset.start = start;
                    input.dataset.coordinate = coordinate;
                    input.setAttribute('aria-label', 'Row starting at sample ' + (start + 1) + ', value ' + (coordinate + 1));
                    input.addEventListener('input', () => {
                        input.removeAttribute('aria-invalid');
                        delete input.dataset.result;
                        status('vector-feedback', 'Answers changed. Check the completed vectors.');
                    });
                    cell.appendChild(input);
                }
                row.appendChild(cell);
            }
            byId('vector-table-body').appendChild(row);
        }
        const explanation = document.createElement('p');
        explanation.textContent = 'With m = ' + m + ' and τ = ' + tau + ', there are ' + size + ' vectors. Each row advances the starting sample by one position.';
        const list = document.createElement('ul');
        for (let start = 0; start < size; start++) {
            const indices = Array.from({ length: m }, (_, k) => start + k * tau);
            const item = document.createElement('li');
            item.textContent = 'Samples ' + indices.map(index => index + 1).join(', ') + ' → (' + indices.map(index => vectorSeries[index]).join(', ') + ')';
            list.appendChild(item);
        }
        byId('vector-solution').replaceChildren(explanation, list);
        status('vector-feedback', 'Complete the empty cells. The first row is provided as an example.');
        closeSolution('exercise-1');
        byId('vector-observations').querySelectorAll('.observation').forEach(cell => cell.classList.remove('is-source'));
        byId('vector-source-note').textContent = '';
    }
    vectorSeries.forEach((value, index) => {
        const cell = document.createElement('div');
        cell.className = 'observation';
        const label = document.createElement('span');
        label.textContent = 'Sample ' + (index + 1);
        const number = document.createElement('strong');
        number.textContent = value;
        cell.append(label, number);
        byId('vector-observations').appendChild(cell);
    });
    ['vector-m', 'vector-tau'].forEach(id => byId(id).addEventListener('change', updateVector));
    byId('vector-form').addEventListener('submit', event => {
        event.preventDefault();
        const { tau, size } = worksheetParameters();
        const inputs = [...byId('vector-table-body').querySelectorAll('input')];
        let correct = 0, empty = 0, wrong = 0;
        inputs.forEach(input => {
            const expected = vectorSeries[Number(input.dataset.start) + Number(input.dataset.coordinate) * tau];
            const missing = input.value.trim() === '';
            const matches = !missing && Number(input.value) === expected;
            if (matches) correct++;
            else if (missing) empty++;
            else wrong++;
            input.setAttribute('aria-invalid', String(!matches));
            input.dataset.result = matches ? 'correct' : 'incorrect';
        });
        status('vector-feedback', correct === inputs.length
            ? 'Correct. All ' + size + ' state vectors are complete.'
            : correct + ' of ' + inputs.length + ' entries correct. ' + (empty ? empty + ' empty ' + (empty === 1 ? 'cell' : 'cells') + '. ' : '') + (wrong ? wrong + ' ' + (wrong === 1 ? 'value needs' : 'values need') + ' correction.' : '') + ' Check the outlined cells.', correct === inputs.length);
    });
    resets.vector = () => {
        byId('vector-m').value = '3';
        byId('vector-tau').value = '2';
        updateVector();
    };
    updateVector();

    const matrixSeries = [0, 1, 2, 1, 0, 1];
    const matrixDistances = distances(matrixSeries, 2, 2);
    const matrixVectors = Array.from({ length: matrixDistances.size }, (_, start) => [matrixSeries[start], matrixSeries[start + 2]]);
    matrixVectors.forEach((vector, index) => {
        const item = document.createElement('div');
        const label = document.createElement('dt');
        label.textContent = 'Sample ' + (index + 1);
        const value = document.createElement('dd');
        value.textContent = '(' + vector.join(', ') + ')';
        item.append(label, value);
        byId('matrix-states').appendChild(item);
    });
    const grid = byId('matrix-grid');
    for (let i = 3; i >= 0; i--) {
        for (let j = 0; j < 4; j++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.textContent = '0';
            cell.dataset.i = i;
            cell.dataset.j = j;
            cell.setAttribute('aria-label', 'Time i = ' + (i + 1) + ', state (' + matrixVectors[i].join(', ') + '); time j = ' + (j + 1) + ', state (' + matrixVectors[j].join(', ') + '). Toggle recurrence.');
            cell.setAttribute('aria-pressed', 'false');
            cell.addEventListener('click', () => {
                const selected = cell.getAttribute('aria-pressed') !== 'true';
                cell.setAttribute('aria-pressed', String(selected));
                cell.textContent = selected ? '1' : '0';
                grid.querySelectorAll('[data-error]').forEach(item => delete item.dataset.error);
                status('matrix-feedback', 'Entries changed. Select Check entries to check the result.');
            });
            grid.appendChild(cell);
        }
    }
    function resetMatrix() {
        grid.querySelectorAll('button').forEach(cell => {
            cell.setAttribute('aria-pressed', 'false');
            cell.textContent = '0';
            delete cell.dataset.error;
        });
        status('matrix-feedback', 'All entries are initially 0.');
        closeSolution('exercise-2');
    }
    function matrixSolution() {
        const epsilon = Number(byId('matrix-epsilon').value);
        const matrix = document.createElement('table');
        matrix.className = 'solution-matrix';
        const caption = matrix.createCaption();
        caption.textContent = 'Recurrence matrix · rows 1–4 from top to bottom';
        const header = matrix.createTHead().insertRow();
        ['i / j', '1', '2', '3', '4'].forEach(label => {
            const cell = document.createElement('th');
            cell.scope = 'col';
            cell.textContent = label;
            header.appendChild(cell);
        });
        const body = matrix.createTBody();
        let count = 0;
        for (let i = 0; i < 4; i++) {
            const row = body.insertRow();
            const label = document.createElement('th');
            label.scope = 'row';
            label.textContent = i + 1;
            row.appendChild(label);
            matrixVectors.forEach((_, j) => {
                const result = Number(matrixDistances.values[i * matrixDistances.size + j] <= epsilon);
                count += result;
                row.insertCell().textContent = result;
            });
        }
        const text = document.createElement('p');
        text.textContent = count + ' recurrent pairs out of 16 · RR = ' + (100 * count / 16) + '%.';
        const note = document.createElement('p');
        note.textContent = 'The identity line compares each state with itself and is present even for random data. With Euclidean distance, swapping the two states leaves their distance unchanged, so the matrix is symmetric.';
        byId('matrix-solution').replaceChildren(text, matrix, note);
    }
    byId('matrix-epsilon').addEventListener('change', () => { resetMatrix(); matrixSolution(); });
    byId('check-matrix').addEventListener('click', () => {
        const epsilon = Number(byId('matrix-epsilon').value);
        let errors = 0;
        grid.querySelectorAll('button').forEach(cell => {
            const expected = matrixDistances.values[Number(cell.dataset.i) * matrixDistances.size + Number(cell.dataset.j)] <= epsilon;
            const actual = cell.getAttribute('aria-pressed') === 'true';
            if (actual !== expected) { cell.dataset.error = 'true'; errors++; }
            else delete cell.dataset.error;
        });
        status('matrix-feedback', errors === 0 ? 'Correct' : 'Incorrect', errors === 0);
    });
    byId('reset-matrix').addEventListener('click', resetMatrix);
    matrixSolution();

    const thresholdEmbedding = { m: 3, tau: 5 };
    const thresholdDistances = distances(sine, thresholdEmbedding.m, thresholdEmbedding.tau);
    drawSignal(byId('threshold-signal'), sine);
    const rateIds = { '0.05': 'rate-005', '0.20': 'rate-020', '0.80': 'rate-080' };
    Object.entries(rateIds).forEach(([epsilon, id]) => {
        const count = thresholdDistances.values.reduce((sum, value) => sum + Number(value <= Number(epsilon)), 0);
        byId(id).textContent = (100 * count / thresholdDistances.values.length).toFixed(1) + '%';
    });
    function updateThreshold() {
        const epsilon = Number(byId('epsilon').value);
        byId('epsilon-value').textContent = epsilon.toFixed(2);
        const thresholdRate = drawRP(byId('threshold-rp'), thresholdDistances, epsilon);
        byId('threshold-stats').textContent = 'm = ' + thresholdEmbedding.m + ', τ = ' + thresholdEmbedding.tau + ' · ' + thresholdDistances.size + ' × ' + thresholdDistances.size + ' states · RR = ' + thresholdRate.toFixed(1) + '%';
        byId('threshold-rp').setAttribute('aria-label', 'Recurrence plot with dimension ' + thresholdEmbedding.m + ', delay ' + thresholdEmbedding.tau + ', at ε = ' + epsilon.toFixed(2) + ', RR = ' + thresholdRate.toFixed(1) + ' percent.');
        document.querySelectorAll('[data-epsilon]').forEach(button => {
            button.setAttribute('aria-pressed', String(Number(button.dataset.epsilon) === epsilon));
        });
    }
    byId('epsilon').addEventListener('input', updateThreshold);
    document.querySelectorAll('[data-epsilon]').forEach(button => button.addEventListener('click', () => {
        byId('epsilon').value = button.dataset.epsilon;
        updateThreshold();
    }));
    byId('threshold-answer').addEventListener('change', () => status('threshold-feedback', 'Answer selected. Check your choice.'));
    byId('threshold-form').addEventListener('submit', event => {
        event.preventDefault();
        const correct = byId('threshold-answer').value === 'increase';
        status('threshold-feedback', correct
            ? 'Correct. Pairs accepted at a smaller threshold remain accepted when ε increases.'
            : 'Incorrect. Increasing ε can add recurrent pairs; previously accepted pairs remain.', correct);
    });
    resets.threshold = () => {
        byId('threshold-form').reset();
        byId('epsilon').value = '0.15';
        updateThreshold();
        closeSolution('exercise-3');
        status('threshold-feedback', 'Compare the plots and rates, then select an answer.');
    };
    updateThreshold();

    let embeddingM = 1, embeddingTau = 1;
    const completedEmbeddings = new Set();
    const descriptions = {
        '1-1': 'States are individual observations. Equal amplitudes on the rising and falling parts of the sine wave produce mirrored structures.',
        '2-1': 'The coordinates are one sample apart and strongly related at this sampling rate. Some mirrored structure remains.',
        '2-5': 'The coordinates are a quarter-cycle apart, separating rising and falling states at the same amplitude.',
        '3-5': 'Each state spans ten samples. The third coordinate changes the Euclidean distances as well as the number of available vectors.'
    };
    drawSignal(byId('embedding-signal'), sine);
    function selectEmbedding(m, tau) {
        embeddingM = m;
        embeddingTau = tau;
        document.querySelectorAll('.embedding-options button').forEach(button => {
            button.setAttribute('aria-pressed', String(Number(button.dataset.m) === m && Number(button.dataset.tau) === tau));
        });
        byId('embedding-count').value = '';
        byId('embedding-explanation').querySelector('h4').textContent = 'm = ' + m + ', τ = ' + tau;
        byId('embedding-explanation').querySelector('p').textContent = 'Calculate the number of vectors, then generate the RP for these parameters.';
        byId('embedding-stats').textContent = 'No plot generated for this selection.';
        byId('embedding-calculation-expression').textContent = 'N′ = 120 − (' + m + ' − 1) × ' + tau + '.';
        status('embedding-feedback', '');
        blank('embedding-rp');
    }
    document.querySelectorAll('.embedding-options button').forEach(button => button.addEventListener('click', () => selectEmbedding(Number(button.dataset.m), Number(button.dataset.tau))));
    byId('embedding-form').addEventListener('submit', event => {
        event.preventDefault();
        const data = distances(sine, embeddingM, embeddingTau);
        const correct = Number(byId('embedding-count').value) === data.size;
        const rate = drawRP(byId('embedding-rp'), data, 0.30);
        byId('embedding-rp').setAttribute('aria-label', 'RP for m = ' + embeddingM + ', τ = ' + embeddingTau + ', ' + data.size + ' state vectors.');
        byId('embedding-stats').textContent = data.size + ' vectors · RR = ' + rate.toFixed(1) + '%';
        const key = embeddingM + '-' + embeddingTau;
        byId('embedding-explanation').querySelector('p').textContent = descriptions[key];
        if (correct) completedEmbeddings.add(key);
        byId('embedding-history').textContent = 'Completed comparisons: ' + completedEmbeddings.size + ' of 4.';
        status('embedding-feedback', (correct ? 'Correct. ' : 'Check the calculation: ') + '120 − (' + embeddingM + ' − 1) × ' + embeddingTau + ' = ' + data.size + ' state vectors.', correct);
    });
    resets.embedding = () => {
        completedEmbeddings.clear();
        byId('embedding-history').textContent = 'Completed comparisons: 0 of 4.';
        closeSolution('exercise-4');
        selectEmbedding(1, 1);
    };
    selectEmbedding(1, 1);

    function seededRandom(seed) {
        let state = seed >>> 0;
        return () => {
            state = (Math.imul(1664525, state) + 1013904223) >>> 0;
            return (state + 0.5) / 4294967296;
        };
    }
    function gaussian(random) {
        return Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
    }
    const noisyRandom = seededRandom(47), noiseRandom = seededRandom(2026), plateauRandom = seededRandom(73);
    const periodic = Array.from({ length: 160 }, (_, t) => Math.sin(0.1 * Math.PI * t));
    const plateauSignal = periodic.map((value, t) => {
        if ((t >= 20 && t < 45) || (t >= 75 && t < 100)) return 0.5;
        if (t >= 130 && t < 150) return -0.5;
        return value;
    });
    const exampleSeries = {
        periodic,
        noisy: periodic.map(value => value + 0.30 * gaussian(noisyRandom)),
        noise: periodic.map(() => gaussian(noiseRandom)),
        drift: periodic.map((value, t) => value + 3 * t / 159),
        plateaus: plateauSignal,
        plateausNoisy: plateauSignal.map(value => value + 0.08 * gaussian(plateauRandom))
    };
    const signalNames = { periodic: 'Periodic', noisy: 'Periodic + noise', noise: 'Independent noise', drift: 'Periodic + drift', plateaus: 'Constant plateaus', plateausNoisy: 'Constant plateaus + noise' };
    const patternNotes = {
        periodic: 'The regular diagonal spacing reflects repeated cycles.',
        noisy: 'Added noise fragments the periodic bands.',
        noise: 'Recurrences are scattered, with short chance structures.',
        drift: 'Drift changes the recurrence pattern between distant cycles.',
        plateaus: 'Constant states form vertical and horizontal runs, joined into blocks. Repeated plateaus also recur away from the identity line.',
        plateausNoisy: 'Noise perturbs the plateau states and breaks their vertical and horizontal runs into shorter segments.'
    };
    Object.entries(exampleSeries).forEach(([name, series], index) => {
        const letter = String.fromCharCode(65 + index);
        const figure = document.createElement('figure');
        figure.className = 'pattern-example';
        figure.innerHTML = '<h4>Plot ' + letter + '</h4>' +
            '<div class="signal-reveal" id="reveal-' + name + '" hidden><canvas id="signal-' + name + '" class="mini-signal" width="320" height="82" role="img" aria-label="Time series for plot ' + letter + '."></canvas></div>' +
            '<div class="plot-frame"><span class="axis-y">Time i ↑</span><canvas id="rp-' + name + '" width="155" height="155" role="img" aria-label="Recurrence plot ' + letter + ', dimension 2 and delay 5."></canvas><span class="axis-x">Time j →</span></div>' +
            '<figcaption id="stats-' + name + '" class="pattern-stats"></figcaption>' +
            '<button type="button" class="signal-toggle" data-signal="' + name + '" aria-expanded="false" aria-controls="reveal-' + name + '">Show time series</button>' +
            '<label for="identify-' + name + '">Signal for plot ' + letter + '</label>' +
            '<select id="identify-' + name + '" required><option value="">Select a signal</option>' +
            Object.entries(signalNames).map(([value, label]) => '<option value="' + value + '">' + label + '</option>').join('') + '</select>' +
            '<p id="answer-' + name + '" class="pattern-answer" role="status"></p>';
        byId('pattern-panels').appendChild(figure);
        drawSignal(byId('signal-' + name), series);
        const data = distances(series, 2, 5);
        const epsilon = name === 'plateaus' || name === 'plateausNoisy' ? 0.15 : thresholdForRate(data, 0.15);
        const rate = drawRP(byId('rp-' + name), data, epsilon);
        byId('stats-' + name).textContent = 'RR = ' + rate.toFixed(1) + '% · ε = ' + epsilon.toFixed(3);
        byId('identify-' + name).addEventListener('change', () => {
            byId('answer-' + name).textContent = '';
            figure.removeAttribute('data-result');
            status('patterns-feedback', 'Identifications changed. Check the six answers.');
        });
    });
    document.querySelectorAll('[data-signal]').forEach(button => button.addEventListener('click', () => {
        const show = button.getAttribute('aria-expanded') !== 'true';
        byId('reveal-' + button.dataset.signal).hidden = !show;
        button.setAttribute('aria-expanded', String(show));
        button.textContent = show ? 'Hide time series' : 'Show time series';
    }));
    byId('patterns-form').addEventListener('submit', event => {
        event.preventDefault();
        let correct = 0;
        Object.keys(exampleSeries).forEach(name => {
            const matched = byId('identify-' + name).value === name;
            if (matched) correct++;
            byId('answer-' + name).textContent = (matched ? 'Correct. ' : signalNames[name] + '. ') + patternNotes[name];
            byId('identify-' + name).closest('.pattern-example').dataset.result = matched ? 'correct' : 'incorrect';
        });
        const total = Object.keys(exampleSeries).length;
        status('patterns-feedback', correct + ' of ' + total + ' correct.' + (correct === total ? ' Compare the structures with the revealed time series.' : ' The feedback under each plot explains its signal.'), correct === total);
    });
    resets.patterns = () => {
        byId('patterns-form').reset();
        Object.keys(exampleSeries).forEach(name => {
            byId('answer-' + name).textContent = '';
            byId('identify-' + name).closest('.pattern-example').removeAttribute('data-result');
            byId('reveal-' + name).hidden = true;
        });
        document.querySelectorAll('[data-signal]').forEach(button => {
            button.setAttribute('aria-expanded', 'false');
            button.textContent = 'Show time series';
        });
        closeSolution('exercise-5');
        status('patterns-feedback', 'Select a signal for each plot.');
    };

    function scalarBeta(a, b, beta) {
        if (a === b) return 0;
        if (beta === 2) return 0.5 * (a - b) ** 2;
        if (beta === 1) return Math.max(0, a * Math.log(a / b) - a + b);
        if (beta === 0) return Math.max(0, a / b - Math.log(a / b) - 1);
        return Math.max(0, (a ** beta + (beta - 1) * b ** beta - beta * a * b ** (beta - 1)) / (beta * (beta - 1)));
    }
    const betaBaseline = Array.from({ length: 120 }, (_, t) => 2 + 0.4 * Math.sin(0.1 * Math.PI * t));
    const betaOutlierIndices = [14, 32, 50, 68, 86, 104];
    const betaLowerValues = [0.04, 0.06, 0.03, 0.05, 0.02, 0.045];
    const betaSignals = { low: [...betaBaseline], high: [...betaBaseline] };
    betaOutlierIndices.forEach((index, outlier) => {
        betaSignals.low[index] = betaLowerValues[outlier];
        betaSignals.high[index] = 4 / betaLowerValues[outlier];
    });
    function betaDistances(series, beta, tau = 2) {
        const size = series.length - tau;
        const values = new Float64Array(size * size);
        let maximum = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const divergence = scalarBeta(series[i], series[j], beta) + scalarBeta(series[i + tau], series[j + tau], beta);
                values[i * size + j] = divergence;
                maximum = Math.max(maximum, divergence);
            }
        }
        return { size, values, maximum };
    }
    function drawBetaDistances(canvas, data, sharedMaximum) {
        const { size, values } = data;
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const pixels = ctx.createImageData(size, size);
        const dark = [15, 23, 42], light = [248, 250, 252];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const intensity = values[i * size + j] / (sharedMaximum || 1);
                const index = ((size - 1 - i) * size + j) * 4;
                for (let channel = 0; channel < 3; channel++) pixels.data[index + channel] = Math.round(dark[channel] + intensity * (light[channel] - dark[channel]));
                pixels.data[index + 3] = 255;
            }
        }
        ctx.putImageData(pixels, 0, 0);
    }
    Object.entries(betaSignals).forEach(([name, series]) => drawSignal(byId('beta-signal-' + name), series));
    function renderBetaOutliers() {
        const beta = Number(byId('beta-slider').value);
        const data = Object.fromEntries(Object.entries(betaSignals).map(([name, series]) => [name, betaDistances(series, beta)]));
        const sharedMaximum = Math.max(data.low.maximum, data.high.maximum);
        byId('beta-value').textContent = String(beta);
        Object.entries(data).forEach(([name, matrix]) => {
            const canvas = byId('beta-rp-' + name);
            drawBetaDistances(canvas, matrix, sharedMaximum);
            canvas.setAttribute('aria-label', 'Unthresholded beta-divergence RP for the signal with six ' + (name === 'low' ? 'lower' : 'upper') + ' outliers, beta ' + beta + '. Both RPs use the same colour scale. Time increases upwards and rightwards.');
        });
    }
    byId('beta-slider').addEventListener('input', () => {
        renderBetaOutliers();
        status('beta-feedback', 'Compare the two RPs, then select an answer.');
    });
    byId('beta-form').addEventListener('change', () => status('beta-feedback', 'Answer selected. Check your choice.'));
    byId('beta-form').addEventListener('submit', event => {
        event.preventDefault();
        const answer = byId('beta-form').querySelector('input[name="beta-answer"]:checked');
        if (!answer) return;
        const correct = answer.value === 'high-more';
        const feedback = correct
            ? 'Correct. Higher β gives more weight to differences at high amplitudes.'
            : 'Compare β = −2 with β = 4. Use dβ(ca, cb) = c^β dβ(a, b) to decide how increasing β changes the weight of a larger amplitude.';
        status('beta-feedback', feedback, correct);
    });
    resets.beta = () => {
        byId('beta-form').reset();
        byId('beta-slider').value = '0';
        renderBetaOutliers();
        closeSolution('exercise-6');
        status('beta-feedback', 'Compare the two RPs, then select an answer.');
    };
    renderBetaOutliers();

    const betaSineSeries = Array.from({ length: 81 }, (_, t) => 2 + Math.sin(2 * Math.PI * t / 40));
    const betaSineTau = 10, betaSineRate = 0.25;
    let betaSineMatrix = null, betaSineLastBeta = null;
    function fixedRateBetaMatrix(data) {
        const { size, values } = data;
        const target = Math.max(size, Math.min(values.length, size + 2 * Math.round((betaSineRate * values.length - size) / 2)));
        const tolerance = Math.max(1, data.maximum) * 1e-12;
        const keys = Float64Array.from(values, value => Math.round(value / tolerance));
        const tieOrder = Uint32Array.from(values, (_, index) => {
            const i = Math.floor(index / size), j = index % size;
            return Math.imul(Math.min(i, j) * size + Math.max(i, j), 2654435761) >>> 0;
        });
        const ranked = Array.from(values, (_, index) => index).filter(index => index % (size + 1) !== 0);
        ranked.sort((a, b) => keys[a] - keys[b] || tieOrder[a] - tieOrder[b] || a - b);
        const recurrences = new Uint8Array(values.length);
        for (let i = 0; i < size; i++) recurrences[i * size + i] = 1;
        const remaining = target - size;
        for (let rank = 0; rank < remaining; rank++) recurrences[ranked[rank]] = 1;
        const cutoffKey = keys[ranked[remaining - 1]];
        const splitTie = remaining < ranked.length && keys[ranked[remaining]] === cutoffKey;
        let epsilon = 0;
        values.forEach((value, index) => { if (keys[index] <= cutoffKey) epsilon = Math.max(epsilon, value); });
        return { ...data, recurrences, epsilon, keys, cutoffKey, splitTie, recurrenceCount: target };
    }
    function drawBetaSineSignal() {
        const canvas = byId('beta-sine-signal'), ctx = canvas.getContext('2d');
        const width = canvas.clientWidth, height = canvas.clientHeight;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const xAt = index => 24 + index / (betaSineSeries.length - 1) * (width - 48);
        const yAt = value => 16 + (3 - value) / 2 * (height - 32);
        ctx.clearRect(0, 0, width, height);
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        [1, 2, 3].forEach(value => {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(24, yAt(value)); ctx.lineTo(width - 24, yAt(value)); ctx.stroke();
            ctx.fillStyle = '#64748b'; ctx.fillText(String(value), 3, yAt(value) + 5);
        });
        ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 1.7; ctx.beginPath();
        betaSineSeries.forEach((value, index) => {
            if (index === 0) ctx.moveTo(xAt(index), yAt(value));
            else ctx.lineTo(xAt(index), yAt(value));
        });
        ctx.stroke();
    }
    function renderBetaSine() {
        const beta = Number(byId('beta-sine-slider').value);
        if (!betaSineMatrix || beta !== betaSineLastBeta) {
            betaSineMatrix = fixedRateBetaMatrix(betaDistances(betaSineSeries, beta, betaSineTau));
            betaSineLastBeta = beta;
        }
        byId('beta-sine-value').textContent = String(beta);
        const canvas = byId('beta-sine-rp');
        const rate = drawRP(canvas, betaSineMatrix, betaSineMatrix.epsilon);
        byId('beta-sine-rp-stats').textContent = 'RR = ' + rate.toFixed(1) + '%';
        canvas.setAttribute('aria-label', 'Beta-divergence RP of two sine-wave periods, beta ' + beta + ', fixed recurrence rate ' + rate.toFixed(1) + ' percent. Time increases upwards and rightwards.');
    }
    byId('beta-sine-slider').addEventListener('input', renderBetaSine);
    window.addEventListener('resize', drawBetaSineSignal);
    drawBetaSineSignal();
    renderBetaSine();

    document.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => resets[button.dataset.reset]()));
    const contentsLinks = [...document.querySelectorAll('.guide-sidebar ol a')];
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            const current = entries.find(entry => entry.isIntersecting);
            if (!current) return;
            contentsLinks.forEach(link => {
                if (link.hash === '#' + current.target.id) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        }, { rootMargin: '-100px 0px -55% 0px', threshold: 0 });
        document.querySelectorAll('.lesson').forEach(section => observer.observe(section));
    }
})();
