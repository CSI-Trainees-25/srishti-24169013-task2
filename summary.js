document.addEventListener('DOMContentLoaded', () => {
const summaryList = document.getElementById('summary-list');
const summaryData = sessionStorage.getItem('taskSummary');

if (!summaryData) {
summaryList.innerHTML = '<p>No summary data available.</p>';
return;
}

const tasks = JSON.parse(summaryData);
tasks.forEach(task => {
const div = document.createElement('div');
div.className = 'summary-item';
let statusText = 'Pending';
let statusClass = 'pending';

if (task.completed) {
statusText = `Completed at ${new Date(task.executionEnd).toLocaleTimeString()}`;
statusClass = 'completed';
} else if (task.skipped) {
statusText = 'Skipped';
statusClass = 'skipped';
}

div.classList.add(statusClass);
div.innerHTML = `<strong>${task.name}</strong> - <em>${statusText}</em>`;
summaryList.appendChild(div);
});
});

