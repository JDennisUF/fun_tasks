const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const motivationalMessages = {
  general: [
    "You've got this! 💪",
    "Every task completed is a step forward!",
    "Small wins fuel big dreams. Keep moving!",
    "Momentum is building – stay in flow!",
    "Future you is already grateful for this effort."
  ],
  creation: [
    "Great idea! Let's make it happen.",
    "New quests unlocked – time to earn rewards!",
    "Planning is the first superpower."
  ],
  completion: [
    "Task slayed! Confetti activated. 🎉",
    "Another win in the books. Keep it rolling!",
    "That felt good, right? Grab the next one!",
    "Productivity streak unlocked!"
  ]
};

const priorityPoints = {
  low: 10,
  medium: 20,
  high: 30,
  urgent: 50
};

const achievementDefinitions = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first task',
    category: 'Starter',
    check: (state) => state.stats.totalCompleted >= 1
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Create five tasks',
    category: 'Starter',
    check: (state) => state.stats.tasksCreated >= 5
  },
  {
    id: 'organized',
    name: 'Organized',
    description: 'Use each priority level at least once',
    category: 'Starter',
    check: (state) => ['low', 'medium', 'high', 'urgent'].every((p) => state.stats.usedPriorities.includes(p))
  },
  {
    id: 'productive-day',
    name: 'Productive Day',
    description: 'Complete five tasks in a single day',
    category: 'Productivity',
    check: (state) => state.stats.dailyProgress >= 5
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Complete twenty total tasks',
    category: 'Productivity',
    check: (state) => state.stats.totalCompleted >= 20
  },
  {
    id: 'on-a-roll',
    name: 'On a Roll',
    description: 'Maintain a three day streak',
    category: 'Streak',
    check: (state) => state.stats.streak >= 3
  },
  {
    id: 'committed',
    name: 'Committed',
    description: 'Maintain a seven day streak',
    category: 'Streak',
    check: (state) => state.stats.streak >= 7
  },
  {
    id: 'priority-master',
    name: 'Priority Master',
    description: 'Complete ten urgent tasks',
    category: 'Special',
    check: (state) => state.stats.urgentCompleted >= 10
  }
];

const defaultState = {
  tasks: [],
  stats: {
    points: 0,
    totalCompleted: 0,
    streak: 0,
    bestStreak: 0,
    lastCompletionDate: null,
    dailyGoal: 5,
    dailyProgress: 0,
    dailyProgressDate: null,
    goalRewardedToday: false,
    urgentCompleted: 0,
    usedPriorities: [],
    tasksCreated: 0,
    achievements: {},
    streakBonusAwarded: []
  }
};

let state = loadState();
let editingTaskId = null;

const elements = {
  form: document.getElementById('taskForm'),
  resetBtn: document.getElementById('resetBtn'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  priority: document.getElementById('priority'),
  dueDate: document.getElementById('dueDate'),
  category: document.getElementById('category'),
  taskId: document.getElementById('taskId'),
  motivation: document.getElementById('motivation'),
  taskGrid: document.getElementById('taskGrid'),
  achievementList: document.getElementById('achievementList'),
  pointsValue: document.getElementById('pointsValue'),
  streakValue: document.getElementById('streakValue'),
  bestStreak: document.getElementById('bestStreak'),
  dailyGoal: document.getElementById('dailyGoal'),
  dailyProgress: document.getElementById('dailyProgress'),
  progressFill: document.getElementById('progressFill'),
  statusFilter: document.getElementById('statusFilter'),
  priorityFilter: document.getElementById('priorityFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect')
};

initialize();

function initialize() {
  syncDailyProgress();
  renderMotivation('general');
  renderTasks();
  updateStatsUI();
  renderAchievements();
  bindEvents();
}

function bindEvents() {
  elements.form.addEventListener('submit', handleSubmit);
  elements.resetBtn.addEventListener('click', resetForm);
  elements.statusFilter.addEventListener('change', renderTasks);
  elements.priorityFilter.addEventListener('change', renderTasks);
  elements.categoryFilter.addEventListener('input', renderTasks);
  elements.searchInput.addEventListener('input', renderTasks);
  elements.sortSelect.addEventListener('change', renderTasks);
}

function handleSubmit(event) {
  event.preventDefault();
  const title = elements.title.value.trim();
  if (!title) return;

  const payload = {
    title,
    description: elements.description.value.trim(),
    priority: elements.priority.value,
    dueDate: elements.dueDate.value || null,
    category: elements.category.value.trim(),
    completed: false
  };

  if (editingTaskId) {
    updateTask(editingTaskId, payload);
  } else {
    addTask(payload);
  }

  resetForm();
  renderTasks();
  saveState();
}

function addTask(task) {
  const newTask = {
    id: crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...task
  };
  state.tasks.unshift(newTask);
  updateStatsAfterCreation(task.priority);
  renderMotivation('creation');
}

function updateTask(id, updates) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task));
  editingTaskId = null;
}

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  const completed = !task.completed;
  task.completed = completed;
  if (completed) {
    task.completedAt = new Date().toISOString();
    awardPoints(task);
  } else {
    // Reversing a completion removes stats impact for simplicity
    state.stats.totalCompleted = Math.max(0, state.stats.totalCompleted - 1);
    state.stats.points = Math.max(0, state.stats.points - priorityPoints[task.priority]);
  }
  saveState();
  renderTasks();
  updateStatsUI();
  renderAchievements();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveState();
  renderTasks();
}

function editTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  editingTaskId = id;
  elements.taskId.value = id;
  elements.title.value = task.title;
  elements.description.value = task.description || '';
  elements.priority.value = task.priority;
  elements.dueDate.value = task.dueDate || '';
  elements.category.value = task.category || '';
  elements.title.focus();
}

function resetForm() {
  editingTaskId = null;
  elements.form.reset();
  elements.priority.value = 'low';
}

function renderTasks() {
  const tasks = applyFilters();
  elements.taskGrid.innerHTML = '';

  if (!tasks.length) {
    const row = document.createElement('div');
    row.className = 'task-row';
    const empty = document.createElement('article');
    empty.className = 'task-card';
    empty.setAttribute('role', 'listitem');
    empty.innerHTML = '<p>No tasks match your filters yet. Add something fun! ✨</p>';
    row.appendChild(empty);
    elements.taskGrid.appendChild(row);
    return;
  }

  for (let index = 0; index < tasks.length; index += 3) {
    const row = document.createElement('div');
    row.className = 'task-row';
    tasks.slice(index, index + 3).forEach((task) => {
      row.appendChild(createTaskCard(task));
    });
    elements.taskGrid.appendChild(row);
  }
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card ${task.completed ? 'completed' : ''}`;
  card.setAttribute('role', 'listitem');
  const dueText = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
  const createdText = new Date(task.createdAt).toLocaleDateString();
  const descriptionBlock = task.description ? `<p>${task.description}</p>` : '';

  card.innerHTML = `
    <header>
      <h3>${task.title}</h3>
      <span class="priority-pill priority-${task.priority}">${task.priority}</span>
    </header>
    ${descriptionBlock}
    <div class="task-meta">
      <span>Created ${createdText}</span>
      <span>Due ${dueText}</span>
      ${task.category ? `<span>#${task.category}</span>` : ''}
    </div>
    <div class="task-actions">
      <button class="complete" data-action="toggle">${task.completed ? 'Mark active' : 'Mark complete'}</button>
      <button class="edit" data-action="edit">Edit</button>
      <button class="delete" data-action="delete">Delete</button>
    </div>
  `;

  card.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleTask(task.id));
  card.querySelector('[data-action="edit"]').addEventListener('click', () => editTask(task.id));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(task.id));

  return card;
}

function applyFilters() {
  const status = elements.statusFilter.value;
  const priority = elements.priorityFilter.value;
  const category = elements.categoryFilter.value.trim().toLowerCase();
  const query = elements.searchInput.value.trim().toLowerCase();
  const sort = elements.sortSelect.value;

  let tasks = [...state.tasks];

  if (status !== 'all') {
    tasks = tasks.filter((task) => (status === 'completed' ? task.completed : !task.completed));
  }

  if (priority !== 'all') {
    tasks = tasks.filter((task) => task.priority === priority);
  }

  if (category) {
    tasks = tasks.filter((task) => (task.category || '').toLowerCase().includes(category));
  }

  if (query) {
    tasks = tasks.filter((task) =>
      task.title.toLowerCase().includes(query) || (task.description || '').toLowerCase().includes(query)
    );
  }

  const priorityOrder = ['low', 'medium', 'high', 'urgent'];
  tasks.sort((a, b) => {
    switch (sort) {
      case 'created-asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'due-asc':
        return getDueDateSortValue(a) - getDueDateSortValue(b) || new Date(a.createdAt) - new Date(b.createdAt);
      case 'priority-desc':
        return priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority);
      case 'title-asc':
        return a.title.localeCompare(b.title);
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return tasks;
}

function getDueDateSortValue(task) {
  if (!task.dueDate) return Number.POSITIVE_INFINITY;
  const time = new Date(task.dueDate).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function awardPoints(task) {
  const base = priorityPoints[task.priority];
  let bonus = 0;
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const completionDate = new Date();
    if (completionDate < due) bonus += 10;
    else if (completionDate.toDateString() === due.toDateString()) bonus += 5;
  }

  state.stats.points += base + bonus;
  state.stats.totalCompleted += 1;
  if (task.priority === 'urgent') state.stats.urgentCompleted += 1;

  handleStreakProgress();
  handleDailyProgress();
  const reachedGoal = state.stats.dailyProgress >= state.stats.dailyGoal;
  if (reachedGoal && !state.stats.goalRewardedToday) {
    state.stats.points += 25;
    state.stats.goalRewardedToday = true;
  }

  const streakMilestones = [3, 7, 30];
  if (streakMilestones.includes(state.stats.streak) && !state.stats.streakBonusAwarded?.includes(state.stats.streak)) {
    state.stats.points += 50;
    state.stats.streakBonusAwarded = [...(state.stats.streakBonusAwarded || []), state.stats.streak];
  }

  saveState();
  updateStatsUI();
  renderAchievements();
  renderMotivation('completion');
}

function handleStreakProgress() {
  const today = new Date();
  const last = state.stats.lastCompletionDate ? new Date(state.stats.lastCompletionDate) : null;
  if (!last) {
    state.stats.streak = 1;
  } else {
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // same day, streak unchanged
    } else if (diffDays === 1) {
      state.stats.streak += 1;
    } else {
      state.stats.streak = 1;
    }
  }
  state.stats.lastCompletionDate = today.toISOString();
  state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
}

function handleDailyProgress() {
  const todayKey = new Date().toDateString();
  if (state.stats.dailyProgressDate !== todayKey) {
    state.stats.dailyProgress = 0;
    state.stats.dailyProgressDate = todayKey;
    state.stats.goalRewardedToday = false;
  }
  state.stats.dailyProgress += 1;
}

function syncDailyProgress() {
  const todayKey = new Date().toDateString();
  if (state.stats.dailyProgressDate !== todayKey) {
    state.stats.dailyProgressDate = todayKey;
    state.stats.dailyProgress = 0;
    state.stats.goalRewardedToday = false;
  }
}

function updateStatsAfterCreation(priority) {
  state.stats.tasksCreated += 1;
  if (!state.stats.usedPriorities.includes(priority)) {
    state.stats.usedPriorities.push(priority);
  }
  saveState();
  updateStatsUI();
  renderAchievements();
}

function updateStatsUI() {
  elements.pointsValue.textContent = state.stats.points.toString();
  elements.streakValue.textContent = `${state.stats.streak} day${state.stats.streak === 1 ? '' : 's'}`;
  elements.bestStreak.textContent = `Best streak: ${state.stats.bestStreak} day${state.stats.bestStreak === 1 ? '' : 's'}`;
  elements.dailyGoal.textContent = state.stats.dailyGoal;
  elements.dailyProgress.textContent = state.stats.dailyProgress;
  const progress = Math.min(100, Math.round((state.stats.dailyProgress / state.stats.dailyGoal) * 100));
  elements.progressFill.style.width = `${progress}%`;
}

function renderAchievements() {
  elements.achievementList.innerHTML = '';
  achievementDefinitions.forEach((achievement) => {
    const unlocked = Boolean(state.stats.achievements[achievement.id]);
    if (!unlocked && achievement.check(state)) {
      state.stats.achievements[achievement.id] = {
        unlockedAt: new Date().toISOString()
      };
      saveState();
    }
    const li = document.createElement('li');
    li.className = `achievement-card ${state.stats.achievements[achievement.id] ? 'unlocked' : ''}`;
    const statusText = state.stats.achievements[achievement.id]
      ? `Unlocked ${new Date(state.stats.achievements[achievement.id].unlockedAt).toLocaleDateString()}`
      : 'Locked';
    li.innerHTML = `
      <p class="label">${achievement.category}</p>
      <h3>${achievement.name}</h3>
      <p>${achievement.description}</p>
      <p class="status">${statusText}</p>
    `;
    elements.achievementList.appendChild(li);
  });
}

function renderMotivation(type) {
  const pool = motivationalMessages[type] || motivationalMessages.general;
  const message = pool[Math.floor(Math.random() * pool.length)];
  elements.motivation.textContent = message;
}

function loadState() {
  try {
    const raw = localStorage.getItem('funTasksState');
    if (!raw) return clone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...clone(defaultState),
      ...parsed,
      stats: {
        ...clone(defaultState.stats),
        ...parsed.stats
      }
    };
  } catch (error) {
    console.warn('Unable to load state', error);
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem('funTasksState', JSON.stringify(state));
}
