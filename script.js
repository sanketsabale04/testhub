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
    // Add the final answer key here, e.g. 1: 'A', 2: 'C', 3: 'B', ...
};

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
    keyedQuestions.forEach(q => {
        if (userAnswers[q] && userAnswers[q] === answerKey[q]) correct += 1;
    });
    return {
        correct,
        total: keyedQuestions.length,
        percent: Math.round((correct / keyedQuestions.length) * 100),
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
}

function selectOption(val) {
    userAnswers[currentQ] = val;
    reviewStatus[currentQ] = reviewStatus[currentQ] || false;
    updatePaletteButton(currentQ);
    updateOptionUI();
    updateAnalysis();
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

function populateResults() {
    const overall = getOverallCounts();
    const scoreSummary = getScoreSummary();

    document.getElementById('result-attempted').innerText = overall.answered;
    document.getElementById('result-review').innerText = overall.review;
    document.getElementById('result-unanswered').innerText = overall.unanswered;
    document.getElementById('result-score').innerText = scoreSummary ? `${scoreSummary.correct}/${scoreSummary.total} (${scoreSummary.percent}%)` : 'Answer key not provided';

    const summaryEl = document.getElementById('section-summary');
    summaryEl.innerHTML = sections.map(section => {
        const counts = getSectionCounts(section);
        return `<div class="results-row"><span>${section.name}</span><strong>${counts.answered}/${counts.total} answered, ${counts.review} review</strong></div>`;
    }).join('');

    const notesEl = document.getElementById('result-notes');
    notesEl.innerText = scoreSummary ? 'The result calculation used the provided answer key.' : 'Fill in the answer key in script.js to see score accuracy.';
}

function showResultsPage() {
    document.querySelector('main').classList.add('hidden');
    document.getElementById('results-page').classList.remove('hidden');
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
    window.location.reload();
}

function submitTest() {
    if (!confirm('Are you sure you want to end the test?')) return;
    populateResults();
    showResultsPage();
}

// Attach submit function to the "End Test" button
const endButton = document.querySelector('.end-btn');
if (endButton) endButton.onclick = submitTest;

function nextQ() { if (currentQ < totalQ) loadQuestion(currentQ + 1); }
function prevQ() { if (currentQ > 1) loadQuestion(currentQ - 1); }

loadQuestion(1); // Initialize
startTimer();