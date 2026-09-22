/**
 * CardioAI — Main Application Controller
 * Coordinates UI state, form validation, ML evaluation, Chart.js visualizations,
 * patient history storage, and PDF report triggers.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // State Management
  let selectedAlgorithm = 'rf';
  let shapChartInstance = null;
  let riskFactorChartInstance = null;
  const toggleState = {
    gender: 'male',
    diabetes: 'no',
    smoking: 'no',
    exang: 'no'
  };

  // Initialize Engines & UI
  window.ECGEngine && window.ECGEngine.init();
  initAuth();
  initNavigation();
  initFormControls();
  initModelPicker();
  initChartJS();
  loadPatientHistory();

  /**
   * Authentication & Session Handler
   */
  function initAuth() {
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const btnFillDoctor = document.getElementById('btnFillDoctor');
    const btnFillAdmin = document.getElementById('btnFillAdmin');
    const navUserBadge = document.getElementById('navUserBadge');
    const navUserName = document.getElementById('navUserName');
    const btnLogout = document.getElementById('btnLogout');

    // Auth Navigation Tabs Switcher
    const authTabs = document.querySelectorAll('.auth-tab');
    const views = ['loginFormView', 'registerFormView', 'forgotFormView'];
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        authTabs.forEach(t => {
          t.classList.remove('active');
          t.style.background = 'none';
          t.style.color = 'var(--text-muted)';
          t.style.boxShadow = 'none';
        });
        tab.classList.add('active');
        tab.style.background = '#ffffff';
        tab.style.color = 'var(--navy)';
        tab.style.boxShadow = 'var(--shadow-sm)';

        views.forEach(v => {
          const el = document.getElementById(v);
          if (el) el.style.display = (v === target) ? 'block' : 'none';
        });
      });
    });

    const linkForgot = document.getElementById('linkForgot');
    linkForgot && linkForgot.addEventListener('click', (e) => {
      e.preventDefault();
      const resetTab = document.querySelector('[data-target="forgotFormView"]');
      resetTab && resetTab.click();
    });

    // Quick-Fill Demo Buttons
    btnFillDoctor && btnFillDoctor.addEventListener('click', () => {
      loginEmail.value = 'dr.smith@cardioai.med';
      loginPassword.value = 'cardio2025';
      loginError.style.display = 'none';
    });

    btnFillAdmin && btnFillAdmin.addEventListener('click', () => {
      loginEmail.value = 'admin@cardioai.med';
      loginPassword.value = 'admin2025';
      loginError.style.display = 'none';
    });

    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    const regMsg = document.getElementById('regMsg');
    registerForm && registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim().toLowerCase();
      const role = document.getElementById('regRole').value;
      const password = document.getElementById('regPassword').value.trim();

      if (!name || !email || !password) {
        regMsg.style.color = 'var(--crimson)';
        regMsg.textContent = 'Please fill out all registration fields.';
        regMsg.style.display = 'block';
        return;
      }

      // Save user profile locally
      let customUsers = {};
      try { customUsers = JSON.parse(localStorage.getItem('cardioai_custom_users') || '{}'); } catch(err){}
      customUsers[email] = { name, password, role };
      localStorage.setItem('cardioai_custom_users', JSON.stringify(customUsers));

      regMsg.style.color = '#166534';
      regMsg.textContent = '✓ Account created! Redirecting to sign in...';
      regMsg.style.display = 'block';

      setTimeout(() => {
        loginEmail.value = email;
        loginPassword.value = password;
        document.querySelector('[data-target="loginFormView"]').click();
        regMsg.style.display = 'none';
        registerForm.reset();
      }, 1400);
    });

    // Forgot Password Form Handler
    const forgotForm = document.getElementById('forgotForm');
    const forgotMsg = document.getElementById('forgotMsg');
    forgotForm && forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail').value.trim().toLowerCase();

      forgotMsg.style.background = '#f0fdf4';
      forgotMsg.style.border = '1px solid #bbf7d0';
      forgotMsg.style.color = '#166534';
      forgotMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Reset instructions sent to <strong>${email}</strong>! Check your inbox.`;
      forgotMsg.style.display = 'block';

      setTimeout(() => {
        forgotForm.reset();
      }, 3000);
    });

    // Check existing session
    const savedUser = sessionStorage.getItem('cardioai_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setLoggedInUI(u);
    } else {
      loginModal.style.display = 'flex';
    }

    // Login Form Submit
    loginForm && loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      loginError.style.display = 'none';

      // Attempt API login if backend is live, otherwise local fallback
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          sessionStorage.setItem('cardioai_user', JSON.stringify(data.user));
          setLoggedInUI(data.user);
          return;
        }
      } catch (err) {}

      // Client-side fallback authentication check
      let customUsers = {};
      try { customUsers = JSON.parse(localStorage.getItem('cardioai_custom_users') || '{}'); } catch(err){}

      if ((email === 'dr.smith@cardioai.med' && password === 'cardio2025') ||
          (email === 'admin@cardioai.med' && password === 'admin2025')) {
        const u = {
          email,
          name: email.includes('smith') ? 'Dr. Alexander Smith' : 'Administrator',
          role: email.includes('smith') ? 'Senior Cardiologist' : 'Clinical Lead'
        };
        sessionStorage.setItem('cardioai_user', JSON.stringify(u));
        setLoggedInUI(u);
      } else if (customUsers[email] && customUsers[email].password === password) {
        const u = {
          email,
          name: customUsers[email].name,
          role: customUsers[email].role
        };
        sessionStorage.setItem('cardioai_user', JSON.stringify(u));
        setLoggedInUI(u);
      } else {
        loginError.textContent = 'Invalid credentials. Click quick-fill demo buttons or create a new account.';
        loginError.style.display = 'block';
      }
    });

    const userProfileModal = document.getElementById('userProfileModal');
    const profileModalName = document.getElementById('profileModalName');
    const profileModalRole = document.getElementById('profileModalRole');
    const profileModalEmail = document.getElementById('profileModalEmail');
    const btnCloseProfileModal = document.getElementById('btnCloseProfileModal');
    const btnProfileClose = document.getElementById('btnProfileClose');
    const btnProfileLogout = document.getElementById('btnProfileLogout');

    // Click User Badge -> Open Profile Details Modal
    navUserBadge && navUserBadge.addEventListener('click', () => {
      const savedUser = sessionStorage.getItem('cardioai_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        profileModalName.textContent = u.name || 'Practitioner';
        profileModalRole.textContent = u.role || 'Senior Cardiologist';
        profileModalEmail.textContent = u.email || 'user@cardioai.med';
      }
      userProfileModal.style.display = 'flex';
    });

    const closeProfile = () => { if (userProfileModal) userProfileModal.style.display = 'none'; };
    btnCloseProfileModal && btnCloseProfileModal.addEventListener('click', closeProfile);
    btnProfileClose && btnProfileClose.addEventListener('click', closeProfile);

    btnProfileLogout && btnProfileLogout.addEventListener('click', () => {
      closeProfile();
      btnLogout && btnLogout.click();
    });

    // Logout Handler
    btnLogout && btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('cardioai_user');
      navUserBadge.style.display = 'none';
      btnLogout.style.display = 'none';
      loginModal.style.display = 'flex';
    });

    function setLoggedInUI(user) {
      loginModal.style.display = 'none';
      navUserBadge.style.display = 'inline-flex';
      navUserName.textContent = user.name;
      btnLogout.style.display = 'inline-block';
    }
  }

  /**
   * Navigation & Mobile Drawer
   */
  function initNavigation() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      highlightActiveNav();
    });

    hamburger && hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }

  function highlightActiveNav() {
    const sections = ['home', 'about', 'prediction', 'models', 'history-section'];
    let current = 'home';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) {
        current = id;
      }
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  /**
   * Model Picker Tabs (RF, SVM, LR, DT)
   */
  function initModelPicker() {
    const tabs = document.querySelectorAll('.model-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        selectedAlgorithm = tab.dataset.algo;
      });
    });
  }

  /**
   * Form Controls & Toggle Options
   */
  function initFormControls() {
    // Range Slider Synced Display
    const ageInput = document.getElementById('age');
    const ageVal = document.getElementById('ageVal');
    if (ageInput && ageVal) {
      ageInput.addEventListener('input', (e) => {
        ageVal.textContent = e.target.value;
      });
    }

    // Toggle Buttons (Gender, Diabetes, Smoking, Exang)
    document.querySelectorAll('.toggle-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        const val = btn.dataset.val;
        toggleState[field] = val;

        const parent = btn.closest('.toggle-selector');
        parent.querySelectorAll('.toggle-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Preset Profiles Quick Fill
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.preset;
        loadPreset(p);
      });
    });

    // Predict Button Event Listener
    const btnPredict = document.getElementById('btnPredict');
    btnPredict && btnPredict.addEventListener('click', handlePrediction);

    // Reset Button Event Listener
    const btnReset = document.getElementById('btnReset');
    btnReset && btnReset.addEventListener('click', resetForm);

    // Export PDF Report Event Listener
    const btnExportReport = document.getElementById('btnExportReport');
    btnExportReport && btnExportReport.addEventListener('click', exportPDFReport);
  }

  /**
   * Form Validation & Sanitization
   */
  function validateForm() {
    let isValid = true;
    const rules = [
      { id: 'bp', min: 40, max: 300 },
      { id: 'chol', min: 30, max: 800 },
      { id: 'hr', min: 20, max: 300 },
      { id: 'sugar', min: 20, max: 600 },
      { id: 'cp', isSelect: true }
    ];

    rules.forEach(rule => {
      const el = document.getElementById(rule.id);
      if (!el) return;

      let pass = true;
      if (rule.isSelect) {
        pass = el.value !== '';
      } else {
        const val = Number(el.value);
        pass = el.value !== '' && !isNaN(val) && val >= rule.min && val <= rule.max;
      }

      if (!pass && el.value !== '') {
        el.classList.add('error');
      } else {
        el.classList.remove('error');
      }
    });

    return true; // Always allow calculation with sanitized defaults
  }

  /**
   * Prediction Handler
   */
  async function handlePrediction() {
    validateForm();

    const bpInput = document.getElementById('bp').value;
    const cholInput = document.getElementById('chol').value;
    const hrInput = document.getElementById('hr').value;
    const sugarInput = document.getElementById('sugar').value;
    const cpInput = document.getElementById('cp').value;

    const patientData = {
      age: Number(document.getElementById('age').value || 45),
      gender: toggleState.gender || 'female',
      bp: bpInput !== '' && !isNaN(Number(bpInput)) ? Number(bpInput) : 120,
      chol: cholInput !== '' && !isNaN(Number(cholInput)) ? Number(cholInput) : 200,
      hr: hrInput !== '' && !isNaN(Number(hrInput)) ? Number(hrInput) : 75,
      sugar: sugarInput !== '' && !isNaN(Number(sugarInput)) ? Number(sugarInput) : 100,
      cp: cpInput !== '' ? Number(cpInput) : 3,
      diabetes: toggleState.diabetes || 'no',
      smoking: toggleState.smoking || 'no',
      exang: toggleState.exang || 'no'
    };

    // Show Loading Overlay briefly
    const overlay = document.getElementById('loadingOverlay');
    overlay && overlay.classList.add('active');

    // Attempt to evaluate via REST API if Flask backend is live, otherwise local ML engine
    let assessment;
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientData, algorithm: selectedAlgorithm })
      });
      if (response.ok) {
        assessment = await response.json();
      } else {
        assessment = window.MLEngine.evaluate(patientData, selectedAlgorithm);
      }
    } catch (e) {
      // Fallback to local JS engine
      assessment = window.MLEngine.evaluate(patientData, selectedAlgorithm);
    }

    setTimeout(() => {
      overlay && overlay.classList.remove('active');
      renderResults(assessment, patientData);
      saveToHistory(assessment, patientData);
    }, 800);
  }

  /**
   * Render Assessment Results & SHAP Chart
   */
  function renderResults(assessment, patientData) {
    const resultSection = document.getElementById('result-section');
    const resultCard = document.getElementById('resultCard');

    resultSection.style.display = 'block';
    resultCard.className = `result-card ${assessment.riskClass}`;

    document.getElementById('resultIcon').textContent = assessment.icon;
    document.getElementById('resultLevel').textContent = assessment.category;
    document.getElementById('resultSub').textContent = assessment.subtitle;

    document.getElementById('mScore').textContent = `${assessment.riskPercentage}%`;
    document.getElementById('mConf').textContent = `${assessment.confidence}%`;
    document.getElementById('mFactors').textContent = `${assessment.riskFactorCount}/${assessment.totalFactors}`;
    document.getElementById('mAlgo').textContent = assessment.algorithmUsed;

    // Render Recommendations
    const adviceList = document.getElementById('adviceList');
    adviceList.innerHTML = '';
    const recs = getRecommendations(assessment.riskPercentage);
    recs.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${r}`;
      adviceList.appendChild(li);
    });

    // Render SHAP Feature Impact Chart
    renderSHAPChart(assessment.shapFactors);

    // Render AHA Clinical Guidelines Benchmark Table
    renderAHABenchmarkTable(patientData);

    // Store patientData for Multi-Model comparison toggle
    window.currentPatientData = patientData;

    // Scroll smoothly to results
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Render AHA Vitals Guidelines Benchmark Table
   */
  function renderAHABenchmarkTable(p) {
    const body = document.getElementById('ahaBenchmarkBody');
    if (!body) return;

    const rows = [
      {
        name: 'Systolic Blood Pressure',
        val: `${p.bp} mmHg`,
        target: '< 120 mmHg',
        status: p.bp < 120 ? 'Optimal' : (p.bp < 130 ? 'Elevated' : (p.bp < 140 ? 'Stage 1 Hypertensive' : 'Stage 2 Hypertensive')),
        badge: p.bp < 120 ? 'low' : (p.bp < 130 ? 'medium' : 'high')
      },
      {
        name: 'Serum Total Cholesterol',
        val: `${p.chol} mg/dL`,
        target: '< 200 mg/dL',
        status: p.chol < 200 ? 'Desirable' : (p.chol < 240 ? 'Borderline High' : 'High Hypercholesterolemia'),
        badge: p.chol < 200 ? 'low' : (p.chol < 240 ? 'medium' : 'high')
      },
      {
        name: 'Fasting Blood Sugar',
        val: `${p.sugar} mg/dL`,
        target: '< 100 mg/dL',
        status: p.sugar < 100 ? 'Normal Fasting' : (p.sugar <= 125 ? 'Impaired Fasting' : 'Diabetic Threshold'),
        badge: p.sugar < 100 ? 'low' : (p.sugar <= 125 ? 'medium' : 'high')
      },
      {
        name: 'Max Heart Rate',
        val: `${p.hr} bpm`,
        target: '100 – 170 bpm',
        status: p.hr >= 100 && p.hr <= 170 ? 'Target Aerobic Range' : (p.hr < 100 ? 'Bradycardia Range' : 'Tachycardia Range'),
        badge: p.hr >= 100 && p.hr <= 170 ? 'low' : 'medium'
      }
    ];

    body.innerHTML = rows.map(r => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding:10px; font-weight:600;">${r.name}</td>
        <td style="padding:10px;">${r.val}</td>
        <td style="padding:10px; color:var(--text-muted);">${r.target}</td>
        <td style="padding:10px;"><span class="risk-tag ${r.badge}">${r.status}</span></td>
      </tr>
    `).join('');
  }

  // Multi-Model Comparison Chart
  let multiModelChartInstance = null;
  const btnCompareModels = document.getElementById('btnCompareModels');
  btnCompareModels && btnCompareModels.addEventListener('click', () => {
    const view = document.getElementById('multiModelComparisonView');
    if (!view || !window.currentPatientData) return;

    if (view.style.display === 'block') {
      view.style.display = 'none';
      return;
    }

    view.style.display = 'block';
    const p = window.currentPatientData;
    const rf = window.MLEngine.evaluate(p, 'rf').riskPercentage;
    const svm = window.MLEngine.evaluate(p, 'svm').riskPercentage;
    const lr = window.MLEngine.evaluate(p, 'lr').riskPercentage;
    const dt = window.MLEngine.evaluate(p, 'dt').riskPercentage;

    const ctx = document.getElementById('multiModelChart');
    if (!ctx) return;
    if (multiModelChartInstance) multiModelChartInstance.destroy();

    multiModelChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Random Forest (92%)', 'SVM (89%)', 'Logistic Regression (85%)', 'Decision Tree (81%)'],
        datasets: [{
          label: 'Predicted Risk Score (%)',
          data: [rf, svm, lr, dt],
          backgroundColor: ['#c0001a', '#1e3a8a', '#06b6d4', '#f59e0b'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100 } }
      }
    });
  });

  // History Action Handlers
  const btnExportCSV = document.getElementById('btnExportCSV');
  btnExportCSV && btnExportCSV.addEventListener('click', () => {
    let history = [];
    try { history = JSON.parse(localStorage.getItem('cardioai_history') || '[]'); } catch(e) {}
    if (history.length === 0) { alert('No history data to export.'); return; }

    const csvRows = ['Date,Time,Age,Gender,BP,Cholesterol,RiskCategory,RiskScore,Model'];
    history.forEach(h => {
      csvRows.push(`${h.date},${h.time},${h.age},${h.gender},${h.bp},${h.chol},"${h.category}",${h.score}%,${h.model}`);
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardioai_patient_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const btnClearHistory = document.getElementById('btnClearHistory');
  btnClearHistory && btnClearHistory.addEventListener('click', () => {
    if (confirm('Clear all stored patient assessment history?')) {
      localStorage.removeItem('cardioai_history');
      loadPatientHistory();
    }
  });

  /**
   * Clinical Recommendations Matrix
   */
  function getRecommendations(score) {
    if (score < 35) {
      return [
        'Maintain current regular physical activity (minimum 150 min/week).',
        'Follow a balanced low-sodium Mediterranean or DASH diet.',
        'Schedule annual baseline routine check-ups with your General Practitioner.',
        'Keep tracking blood pressure and lipid profile every 6 months.'
      ];
    } else if (score < 65) {
      return [
        'Schedule a formal cardiology consultation within 30 days.',
        'Adopt strict dietary modifications to lower total cholesterol & LDL.',
        'Begin daily blood pressure monitoring twice daily.',
        'Avoid tobacco exposure and begin supervised aerobic conditioning.'
      ];
    } else {
      return [
        'Seek prompt clinical cardiology evaluation — do not postpone care.',
        'Perform a baseline diagnostic ECG / Echocardiogram as ordered by doctor.',
        'Strictly adhere to prescribed anti-hypertensive or lipid-lowering therapy.',
        'Avoid strenuous physical exertion until fully evaluated by a specialist.'
      ];
    }
  }

  /**
   * Render SHAP Feature Contribution Chart (Chart.js)
   */
  function renderSHAPChart(factors) {
    const ctx = document.getElementById('shapChart');
    if (!ctx) return;

    if (shapChartInstance) {
      shapChartInstance.destroy();
    }

    const labels = factors.map(f => f.label);
    const values = factors.map(f => f.val);
    const colors = values.map(v => v > 0 ? '#ef4444' : '#10b981');

    shapChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Risk Contribution (%)',
          data: values,
          backgroundColor: colors,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Impact: ${ctx.raw > 0 ? '+' : ''}${ctx.raw}% risk score`
            }
          }
        },
        scales: {
          x: { grid: { color: '#e2e8f0' } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  /**
   * Initialize Static Chart.js Distributions
   */
  function initChartJS() {
    const ctx = document.getElementById('riskFactorChart');
    if (!ctx) return;

    riskFactorChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Age > 55', 'High BP', 'High Cholesterol', 'Smoking', 'Diabetes', 'Angina'],
        datasets: [{
          data: [24, 21, 19, 15, 12, 9],
          backgroundColor: ['#c0001a', '#1e3a8a', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6'],
          borderWidth: 3,
          borderColor: '#ffffff'
        }]
      },
      options: {
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 12 } } }
        }
      }
    });
  }

  /**
   * Patient History Management (localStorage)
   */
  function saveToHistory(assessment, patientData) {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('cardioai_history') || '[]');
    } catch (e) { history = []; }

    const entry = {
      date: new Date().toLocaleDateString(),
      time: assessment.timestamp,
      age: patientData.age,
      gender: patientData.gender,
      bp: patientData.bp,
      chol: patientData.chol,
      score: assessment.riskPercentage,
      category: assessment.category,
      model: assessment.algorithmUsed
    };

    history.unshift(entry);
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem('cardioai_history', JSON.stringify(history));

    loadPatientHistory();
  }

  function loadPatientHistory() {
    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) return;

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('cardioai_history') || '[]');
    } catch (e) { history = []; }

    if (history.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:20px;">No prior risk assessments recorded.</td></tr>`;
      return;
    }

    tableBody.innerHTML = history.map(item => {
      const tagClass = item.score > 65 ? 'high' : (item.score > 35 ? 'medium' : 'low');
      return `
        <tr>
          <td>${item.date} ${item.time}</td>
          <td>${item.age} yrs (${item.gender.toUpperCase()})</td>
          <td>${item.bp} / ${item.chol}</td>
          <td><span class="risk-tag ${tagClass}">${item.category} (${item.score}%)</span></td>
          <td>${item.model}</td>
          <td><button onclick="window.print()" style="background:none; border:none; color:#c0001a; cursor:pointer;"><i class="fa-solid fa-print"></i></button></td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Reset Form
   */
  function resetForm() {
    document.getElementById('bp').value = '';
    document.getElementById('chol').value = '';
    document.getElementById('hr').value = '';
    document.getElementById('sugar').value = '';
    document.getElementById('cp').value = '';
    document.getElementById('age').value = 45;
    document.getElementById('ageVal').textContent = '45';

    document.getElementById('result-section').style.display = 'none';
  }

  function loadPreset(presetName) {
    const presets = {
      healthy: { age: 30, gender: 'female', bp: 115, chol: 170, hr: 155, sugar: 90, diabetes: 'no', smoking: 'no', cp: 3, exang: 'no' },
      moderate: { age: 54, gender: 'male', bp: 138, chol: 235, hr: 135, sugar: 112, diabetes: 'no', smoking: 'yes', cp: 1, exang: 'no' },
      high: { age: 68, gender: 'male', bp: 175, chol: 310, hr: 95, sugar: 160, diabetes: 'yes', smoking: 'yes', cp: 0, exang: 'yes' }
    };

    const p = presets[presetName];
    if (!p) return;

    document.getElementById('age').value = p.age;
    document.getElementById('ageVal').textContent = p.age;
    document.getElementById('bp').value = p.bp;
    document.getElementById('chol').value = p.chol;
    document.getElementById('hr').value = p.hr;
    document.getElementById('sugar').value = p.sugar;
    document.getElementById('cp').value = p.cp;

    ['gender', 'diabetes', 'smoking', 'exang'].forEach(field => {
      toggleState[field] = p[field];
      const parent = document.querySelector(`[data-field="${field}"]`)?.closest('.toggle-selector');
      if (parent) {
        parent.querySelectorAll('.toggle-option').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === p[field]);
        });
      }
    });

    handlePrediction();
  }

  /**
   * PDF Report Trigger
   */
  function exportPDFReport() {
    window.ReportEngine && window.ReportEngine.downloadPDFReport();
  }
});
