document.addEventListener('DOMContentLoaded', () => {
const taskNameInput = document.getElementById('task-name');
const taskDurationInput = document.getElementById('task-duration');
const taskDateTimeInput = document.getElementById('task-date-time');
const addTaskBtn = document.getElementById('add-task');
const clearAllBtn = document.getElementById('clear-all');
const taskList = document.getElementById('task-list');
const totalCountSpan = document.getElementById('total-count');
const runningCountSpan = document.getElementById('running-count');
const doneCountSpan = document.getElementById('done-count');
const startTasksBtn = document.getElementById('start-tasks-btn');
const endEarlyBtn = document.getElementById('end-early-btn');

const activeTaskContainer = document.querySelector('.right-section .now');

let tasks = [];
let isRunning = false;
let currentTaskAbortController = null;

const saveTasks = () => {
localStorage.setItem('todoTasks', JSON.stringify(tasks));
renderTasks();
};

const loadTasks = () => {
const storedTasks = localStorage.getItem('todoTasks');
tasks = storedTasks ? JSON.parse(storedTasks) : [];
renderTasks();
};

const updateCounters = () => {
const total = tasks.length;
const done = tasks.filter(t => t.completed).length;
const running = isRunning ? tasks.filter(t => !t.completed && !t.skipped).length : 0;

totalCountSpan.textContent = `${total} total`;
runningCountSpan.textContent = `${running} running`;
doneCountSpan.textContent = `${done} done`;
};

const renderTasks = () => {
taskList.innerHTML = '';
tasks.forEach(task => {
const li = document.createElement('li');
li.className = 'task-item';
li.dataset.id = task.id;
li.setAttribute('draggable', true);

if (task.completed) li.classList.add('completed');
if (task.skipped) li.classList.add('skipped');

const taskDateTime = new Date(task.dateTime).toLocaleString();

li.innerHTML = `
<div class="task-item-details">
<strong>${task.name}</strong>
<small>${task.duration} mins @ ${taskDateTime}</small>
</div>
<div class="task-item-controls">
<button class="complete-btn" data-id="${task.id}">✔</button>
<button class="skip-btn" data-id="${task.id}">⏭</button>
</div>
`;
taskList.appendChild(li);
});
updateCounters();
};

const handleAddTask = () => {
const name = taskNameInput.value.trim();
const duration = parseFloat(taskDurationInput.value);
const dateTime = taskDateTimeInput.value;

if (!name || !duration || !dateTime) {
alert('Please fill in all task fields.');
return;
}

const newTask = {
id: Date.now(),
name,
duration,
dateTime,
completed: false,
skipped: false
};

tasks.push(newTask);
saveTasks();
taskNameInput.value = '';
taskDurationInput.value = '1';
taskDateTimeInput.value = '';
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const executeTask = (task) => {
return new Promise((resolve) => {
currentTaskAbortController = new AbortController();
const signal = currentTaskAbortController.signal;

let timerInterval;

const cleanupAndResolve = (status) => {
clearInterval(timerInterval); 

clearTimeout(timer);
task.executionEnd = new Date();
if (status === 'completed') task.completed = true;
if (status === 'skipped') task.skipped = true;
document.querySelector(`[data-id='${task.id}']`)?.classList.remove('active');
activeTaskContainer.innerHTML = '<p>No active task</p>';
saveTasks();
resolve();
};

signal.addEventListener('abort', () => cleanupAndResolve(signal.reason));

const durationMs = task.duration * 60 * 1000;
const timer = setTimeout(() => cleanupAndResolve('completed'), durationMs);

document.querySelector(`[data-id='${task.id}']`)?.classList.add('active');

const endTime = Date.now() + durationMs;

const updateTimerDisplay = () => {
const timeLeftMs = endTime - Date.now();
if (timeLeftMs < 0) {
activeTaskContainer.innerHTML = `<h4>${task.name}</h4><p>Time's up!</p>`;
return;
}
const minutes = Math.floor(timeLeftMs / 60000);
const seconds = Math.floor((timeLeftMs % 60000) / 1000);
activeTaskContainer.innerHTML = `
<h4>${task.name}</h4>
<p>Time remaining: ${minutes}m ${seconds.toString().padStart(2, '0')}s</p>
`;
};

updateTimerDisplay(); 

timerInterval = setInterval(updateTimerDisplay, 1000);
});
};

const startAllTasks = async () => {
if (isRunning) return;
isRunning = true;
startTasksBtn.disabled = true;

for (const task of tasks) {
if (task.completed || task.skipped) continue;

const scheduledTime = new Date(task.dateTime).getTime();
const now = Date.now();
if (scheduledTime > now) {
activeTaskContainer.innerHTML = `<p>Waiting for "${task.name}"...</p>`;
await wait(scheduledTime - now);
}

await executeTask(task);

const nextTaskIndex = tasks.indexOf(task) + 1;
if (nextTaskIndex < tasks.length) {
activeTaskContainer.innerHTML = '<p>Taking a 30s break...</p>';
await wait(30000);
}
}

isRunning = false;
startTasksBtn.disabled = false;
navigateToSummary();
};

const navigateToSummary = () => {
sessionStorage.setItem('taskSummary', JSON.stringify(tasks));
window.location.href = 'summary.html';
};

let draggedItemId = null;
taskList.addEventListener('dragstart', (e) => {
draggedItemId = parseInt(e.target.dataset.id);
e.target.classList.add('dragging');
});

taskList.addEventListener('dragover', e => e.preventDefault());

taskList.addEventListener('drop', (e) => {
const dropTarget = e.target.closest('.task-item');
if (!dropTarget) return;

dropTarget.classList.remove('dragging');
const droppedOnId = parseInt(dropTarget.dataset.id);

const draggedIndex = tasks.findIndex(t => t.id === draggedItemId);
const targetIndex = tasks.findIndex(t => t.id === droppedOnId);

const [draggedItem] = tasks.splice(draggedIndex, 1);
tasks.splice(targetIndex, 0, draggedItem);

saveTasks();
});

// --- Event Listeners ---
addTaskBtn.addEventListener('click', handleAddTask);
clearAllBtn.addEventListener('click', () => {
if (confirm('Are you sure you want to clear all tasks?')) {
tasks = [];
saveTasks();
}
});

startTasksBtn.addEventListener('click', startAllTasks);
endEarlyBtn.addEventListener('click', () => {
if (isRunning && currentTaskAbortController) {
currentTaskAbortController.abort('skipped');
}
navigateToSummary();
});

taskList.addEventListener('click', (e) => {
const id = parseInt(e.target.dataset.id);
if (e.target.classList.contains('complete-btn')) {
if (isRunning && currentTaskAbortController) currentTaskAbortController.abort('completed');
else {
const task = tasks.find(t => t.id === id);
if(task) task.completed = true;
saveTasks();
}
}
if (e.target.classList.contains('skip-btn')) {
if (isRunning && currentTaskAbortController) currentTaskAbortController.abort('skipped');
else {
const task = tasks.find(t => t.id === id);
if(task) task.skipped = true;
saveTasks();
}
}
});

loadTasks();
});
 