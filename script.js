let currentQ = 1;
const totalQ = 180;
let timeLeft = 3 * 60 * 60;
let userAnswers = {}; // Object to store answers {1: 'A', 2: 'C', ...}
let reviewStatus = {}; // Object to store review flags {1: true, 2: false, ...}
let timerInterval;

const sections = [
    { name: 'Physics', start: 1, end: 45 },
    { name: 'Chemistry', start: 46, end: 90 },
    { name: 'Biology', start: 91, end: 180 },
];

const answerKey = {
    1: 'D',
    2: 'D',
    3: 'B',
    4: 'A',
    5: 'B',
    6: 'C',
    7: 'B',
    8: 'B',
    9: 'B',
    10: 'A',
    11: 'B',
    12: 'C',
    13: 'D',
    14: 'C',
    15: 'A',
    16: 'A',
    17: 'B',
    18: 'B',
    19: 'C',
    20: 'B',
    21: 'B',
    22: 'B',
    23: 'D',
    24: 'B',
    25: 'B',
    26: 'C',
    27: 'A',
    28: 'D',
    29: 'C',
    30: 'A',
    31: 'B',
    32: 'D',
    33: 'A',
    34: 'B',
    35: 'D',
    175: 'D'
};

const STORAGE_KEY = 'mocktest:state:v1';

function getSavedState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;
    }
}

function saveState(submitted = false) {
    const state = {
        currentQ,
        timeLeft,
        userAnswers,
        reviewStatus,
        submitted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
}

function loadSavedState() {
    const saved = getSavedState();
    if (!saved) return false;
    if (typeof saved.timeLeft === 'number') timeLeft = saved.timeLeft;
    if (typeof saved.currentQ === 'number' && saved.currentQ >= 1 && saved.currentQ <= totalQ) currentQ = saved.currentQ;
    if (saved.userAnswers && typeof saved.userAnswers === 'object') userAnswers = saved.userAnswers;
    if (saved.reviewStatus && typeof saved.reviewStatus === 'object') reviewStatus = saved.reviewStatus;
    return saved.submitted === true;
}

// 1. Setup Sidebar Grid grouped by section
const grid = document.getElementById('q-grid');
sections.forEach(section => {
    const sectionBlock = document.createElement('div');
    sectionBlock.className = 'palette-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'palette-section-title';
    sectionTitle.innerText = `${section.name} (${section.start}-${section.end})`;
    sectionBlock.appendChild(sectionTitle);

    const sectionGrid = document.createElement('div');
    sectionGrid.className = 'section-grid';

    for (let i = section.start; i <= section.end; i++) {
        let btn = document.createElement('div');
        btn.className = 'q-circle';
        btn.innerText = i;
        btn.onclick = () => loadQuestion(i);
        btn.id = `btn-${i}`;
        sectionGrid.appendChild(btn);
    }

    sectionBlock.appendChild(sectionGrid);
    grid.appendChild(sectionBlock);
});

function startTimer() {
    const timerEl = document.getElementById('timer');
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerEl.innerText = 'Time Up';
            submitTest();
            return;
        }
        timeLeft -= 1;
        const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
        const seconds = String(timeLeft % 60).padStart(2, '0');
        timerEl.innerText = `${hours}:${minutes}:${seconds}`;
        if (timeLeft % 5 === 0) saveState(false);
    }, 1000);
}

function getSectionInfo(q) {
    return sections.find(section => q >= section.start && q <= section.end) || sections[0];
}

function getSectionCounts(section) {
    const answered = Object.keys(userAnswers).filter(key => {
        const index = Number(key);
        return index >= section.start && index <= section.end;
    }).length;
    const review = Object.keys(reviewStatus).filter(key => {
        const index = Number(key);
        return reviewStatus[index] && index >= section.start && index <= section.end;
    }).length;
    return { answered, review, total: section.end - section.start + 1, unanswered: (section.end - section.start + 1) - answered };
}

function getOverallCounts() {
    const answered = Object.keys(userAnswers).length;
    const review = Object.keys(reviewStatus).filter(key => reviewStatus[key]).length;
    return { answered, review, unanswered: totalQ - answered };
}

function getScoreSummary() {
    const keyedQuestions = Object.keys(answerKey).map(Number);
    if (!keyedQuestions.length) return null;
    let correct = 0;
    let incorrect = 0;

    keyedQuestions.forEach(q => {
        if (userAnswers[q]) {
            if (userAnswers[q] === answerKey[q]) {
                correct += 1;
            } else {
                incorrect += 1;
            }
        }
    });

    const marks = correct * 4 - incorrect;
    const maxMarks = totalQ * 4;
    return {
        correct,
        incorrect,
        total: keyedQuestions.length,
        marks,
        maxMarks,
        percent: Math.round((marks / maxMarks) * 100),
    };
}

function setImageWithFallback(imgEl, basePath) {
    imgEl.classList.add('hidden');
    imgEl.dataset.triedFallback = 'false';
    imgEl.onload = () => {
        imgEl.classList.remove('hidden');
    };
    imgEl.onerror = function () {
        if (this.dataset.triedFallback === 'false') {
            this.dataset.triedFallback = 'true';
            this.src = `${basePath}.png`;
            return;
        }
        this.classList.add('hidden');
    };
    imgEl.src = `${basePath}.jpg`;
}

function loadQuestion(n) {
    currentQ = n;
    document.getElementById('q-number').innerText = `Question ${currentQ}`;

    const section = getSectionInfo(currentQ);
    document.getElementById('section-label').innerText = `Section: ${section.name}`;

    const questionImg = document.getElementById('question-img');
    setImageWithFallback(questionImg, `questions/${currentQ}`);
    questionImg.alt = `Question ${currentQ}`;

    const subImg = document.getElementById('question-img-sub');
    setImageWithFallback(subImg, `questions/${currentQ}_`);
    subImg.alt = `Question ${currentQ} subpart`;

    document.querySelectorAll('.q-circle').forEach(el => {
        el.classList.remove('active', 'answered', 'review');
        const index = Number(el.innerText);
        if (userAnswers[index]) el.classList.add('answered');
        if (reviewStatus[index]) el.classList.add('review');
    });
    const activeBtn = document.getElementById(`btn-${currentQ}`);
    if (activeBtn) activeBtn.classList.add('active');

    updateOptionUI();
    updateReviewButton();
    updateAnalysis();
    saveState(false);
}

function selectOption(val) {
    userAnswers[currentQ] = val;
    reviewStatus[currentQ] = reviewStatus[currentQ] || false;
    updatePaletteButton(currentQ);
    updateOptionUI();
    updateAnalysis();
    saveState(false);
}

function updateOptionUI() {
    document.querySelectorAll('.opt-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.innerText === userAnswers[currentQ]);
    });
}

function toggleReview() {
    reviewStatus[currentQ] = !reviewStatus[currentQ];
    updateReviewButton();
    updatePaletteButton(currentQ);
    updateAnalysis();
    saveState(false);
}

function updateReviewButton() {
    const reviewButton = document.getElementById('mark-review');
    if (!reviewButton) return;
    if (reviewStatus[currentQ]) {
        reviewButton.innerText = 'Remove Review';
        reviewButton.classList.add('active-review');
    } else {
        reviewButton.innerText = 'Mark for Review';
        reviewButton.classList.remove('active-review');
    }
}

function updatePaletteButton(index) {
    const paletteBtn = document.getElementById(`btn-${index}`);
    if (!paletteBtn) return;
    paletteBtn.classList.remove('answered', 'review');
    if (reviewStatus[index]) {
        paletteBtn.classList.add('review');
    } else if (userAnswers[index]) {
        paletteBtn.classList.add('answered');
    }
}

function updateAnalysis() {
    const overall = getOverallCounts();
    const currentSection = getSectionInfo(currentQ);
    const currentCounts = getSectionCounts(currentSection);
    const physicsCounts = getSectionCounts(sections[0]);
    const chemistryCounts = getSectionCounts(sections[1]);
    const biologyCounts = getSectionCounts(sections[2]);
    const scoreSummary = getScoreSummary();

    document.getElementById('answered-count').innerText = overall.answered;
    document.getElementById('review-count').innerText = overall.review;
    document.getElementById('unanswered-count').innerText = overall.unanswered;
    document.getElementById('section-progress').innerText = `${currentSection.name} ${currentCounts.answered}/${currentCounts.total}`;
    document.getElementById('physics-progress').innerText = `${physicsCounts.answered}/${physicsCounts.total}`;
    document.getElementById('chemistry-progress').innerText = `${chemistryCounts.answered}/${chemistryCounts.total}`;
    document.getElementById('biology-progress').innerText = `${biologyCounts.answered}/${biologyCounts.total}`;
}

function getSectionResults(section) {
    const counts = getSectionCounts(section);
    const keyedQuestions = Object.keys(answerKey)
        .map(Number)
        .filter(q => q >= section.start && q <= section.end);
    const correct = keyedQuestions.reduce((sum, q) => (
        userAnswers[q] && userAnswers[q] === answerKey[q] ? sum + 1 : sum
    ), 0);
    const incorrect = keyedQuestions.reduce((sum, q) => (
        userAnswers[q] && userAnswers[q] !== answerKey[q] ? sum + 1 : sum
    ), 0);
    const marks = correct * 4 - incorrect;
    return {
        ...counts,
        correct,
        incorrect,
        marks,
        keyedTotal: keyedQuestions.length,
    };
}

function getDetailedQuestionLists() {
    const incorrectQuestions = Object.keys(answerKey)
        .map(Number)
        .filter(q => userAnswers[q] && userAnswers[q] !== answerKey[q]);

    const unansweredQuestions = Array.from({ length: totalQ }, (_, index) => index + 1)
        .filter(q => !userAnswers[q]);

    const reviewQuestions = Object.keys(reviewStatus)
        .filter(key => reviewStatus[key])
        .map(Number)
        .sort((a, b) => a - b);

    return {
        incorrectQuestions,
        unansweredQuestions,
        reviewQuestions,
    };
}

function createPieChartSvg(correct, incorrect, unanswered) {
    const total = correct + incorrect + unanswered;
    if (total === 0) {
        return `<div class="chart-empty">No score data available</div>`;
    }

    const angles = [
        { label: 'Correct', value: correct, color: '#16a34a' },
        { label: 'Incorrect', value: incorrect, color: '#dc2626' },
        { label: 'Unanswered', value: unanswered, color: '#fbbf24' }
    ].filter(item => item.value > 0);

    let cumulative = 0;
    const segments = angles.map(item => {
        const start = cumulative;
        const sweep = (item.value / total) * 360;
        const end = start + sweep;
        cumulative += sweep;
        const largeArc = sweep > 180 ? 1 : 0;
        const startRadians = (Math.PI / 180) * (start - 90);
        const endRadians = (Math.PI / 180) * (end - 90);
        const x1 = 100 + 100 * Math.cos(startRadians);
        const y1 = 100 + 100 * Math.sin(startRadians);
        const x2 = 100 + 100 * Math.cos(endRadians);
        const y2 = 100 + 100 * Math.sin(endRadians);
        return `<path d="M100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 100 100 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${item.color}" />`;
    }).join('');

    return `
        <svg viewBox="0 0 200 200" class="result-pie">
            ${segments}
            <circle cx="100" cy="100" r="60" fill="white" />
            <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" class="pie-center-text">${Math.round((correct / total) * 100)}%</text>
        </svg>
        <div class="pie-legend">
            ${angles.map(item => `<div class="pie-legend-item"><span class="legend-badge" style="background:${item.color}"></span><strong>${item.label}:</strong> ${item.value}</div>`).join('')}
        </div>
    `;
}

function populateResults() {
    const overall = getOverallCounts();
    const scoreSummary = getScoreSummary();
    const detailed = getDetailedQuestionLists();

    document.getElementById('result-attempted').innerText = overall.answered;
    document.getElementById('result-review').innerText = overall.review;
    document.getElementById('result-unanswered').innerText = overall.unanswered;
    document.getElementById('result-score').innerText = scoreSummary
        ? `${scoreSummary.marks}/720 (${scoreSummary.percent}%)`
        : 'Answer key not provided';

    const correctCount = scoreSummary ? scoreSummary.correct : 0;
    const incorrectCount = scoreSummary ? scoreSummary.incorrect : 0;
    const unansweredCount = overall.unanswered;
    document.getElementById('result-chart').innerHTML = createPieChartSvg(correctCount, incorrectCount, unansweredCount);

    document.getElementById('result-details').innerHTML = `
        <div class="score-detail-card">
            <div class="score-detail-row"><span>Total Marks</span><strong>${scoreSummary ? `${scoreSummary.marks}/720` : 'N/A'}</strong></div>
            <div class="score-detail-row"><span>Correct</span><strong>${correctCount}</strong></div>
            <div class="score-detail-row"><span>Wrong</span><strong>${incorrectCount}</strong></div>
            <div class="score-detail-row"><span>Unattempted</span><strong>${unansweredCount}</strong></div>
        </div>
    `;

    const summaryEl = document.getElementById('section-summary');
    summaryEl.innerHTML = sections.map(section => {
        const sectionResult = getSectionResults(section);
        const scoreLabel = sectionResult.keyedTotal
            ? `${sectionResult.correct}/${sectionResult.keyedTotal}`
            : 'N/A';
        const percentLabel = sectionResult.keyedTotal
            ? `${Math.round((sectionResult.marks / (sectionResult.keyedTotal * 4)) * 100)}%`
            : 'N/A';
        const sectionMarks = sectionResult.keyedTotal
            ? `${sectionResult.marks}/${sectionResult.keyedTotal * 4}`
            : 'N/A';

        return `
            <div class="section-card">
                <div class="section-card-title">
                    <h3>${section.name}</h3>
                    <span class="section-percent">${percentLabel}</span>
                </div>
                <div class="section-card-row"><span>Attempted</span><strong>${sectionResult.answered}</strong></div>
                <div class="section-card-row"><span>Section Marks</span><strong>${sectionMarks}</strong></div>
                <div class="section-card-row"><span>Marked Review</span><strong>${sectionResult.review}</strong></div>
                <div class="section-card-row"><span>Unanswered</span><strong>${sectionResult.unanswered}</strong></div>
            </div>`;
    }).join('');

    const breakdownEl = document.getElementById('section-breakdown');
    breakdownEl.innerHTML = `
        <div class="breakdown-card">
            <h4>Accuracy Summary</h4>
            <div class="results-row"><span>Correct Answers</span><strong>${scoreSummary ? scoreSummary.correct : 'N/A'}</strong></div>
            <div class="results-row"><span>Incorrect Answers</span><strong>${scoreSummary ? scoreSummary.incorrect : 'N/A'}</strong></div>
            <div class="results-row"><span>Unanswered Questions</span><strong>${detailed.unansweredQuestions.length}</strong></div>
        </div>
    `;

    const questionBreakdownEl = document.getElementById('question-breakdown');
    questionBreakdownEl.innerHTML = `
        <div class="breakdown-card">
            <h4>Review Checklist</h4>
            <div class="breakdown-item"><span>Incorrect Answers</span><strong>${detailed.incorrectQuestions.length}</strong></div>
            <div class="breakdown-item"><span>Marked for review</span><strong>${detailed.reviewQuestions.length}</strong></div>
            <div class="breakdown-item"><span>Unanswered</span><strong>${detailed.unansweredQuestions.length}</strong></div>
        </div>
    `;

    const notesEl = document.getElementById('result-notes');
    notesEl.innerText = scoreSummary ?
        'The result calculation uses the answer key from the current script. Use the review list to revisit missed or unchecked questions.' :
        'Fill in the answer key in script.js to see score accuracy on the report.';
}

function showResultsPage() {
    const mainContent = document.querySelector('main');
    const resultsPage = document.getElementById('results-page');
    if (mainContent) mainContent.classList.add('hidden');
    if (resultsPage) {
        resultsPage.classList.remove('hidden');
        resultsPage.style.display = 'flex';
    }
    document.querySelector('header')?.classList.add('hidden');
}

function startTest() {
    document.getElementById('welcome-page').classList.add('hidden');
    document.querySelector('header')?.classList.remove('hidden');
    document.querySelector('main')?.classList.remove('hidden');

    if (wasSubmitted) {
        populateResults();
        showResultsPage();
        return;
    }

    loadQuestion(currentQ);
    startTimer();
}

function downloadAnswers() {
    let resultText = "--- MOCK TEST RESULTS ---\n\n";
    for (let i = 1; i <= totalQ; i++) {
        resultText += `Q${i}: ${userAnswers[i] || "Not Answered"}\n`;
    }
    const blob = new Blob([resultText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_test_answers.txt';
    a.click();
}

function restartTest() {
    clearInterval(timerInterval);
    clearSavedState();
    window.location.reload();
}

function submitTest() {
    if (!confirm('Are you sure you want to end the test?')) return;
    populateResults();
    showResultsPage();
    saveState(true);
}

// Attach submit function to the "End Test" button
const endButton = document.querySelector('.end-btn');
if (endButton) endButton.onclick = submitTest;

function nextQ() { if (currentQ < totalQ) loadQuestion(currentQ + 1); }
function prevQ() { if (currentQ > 1) loadQuestion(currentQ - 1); }

const wasSubmitted = loadSavedState();
// Wait for the user to click Start before showing the quiz or starting the timer.
