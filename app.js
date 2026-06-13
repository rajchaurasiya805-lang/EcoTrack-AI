/**
 * EcoTrack AI - Main Application JavaScript File
 * Handles state, calculations, charts, gamification, and Eco AI chatbot.
 */

// Global Application Instance
const app = (() => {
  // --- Constants and Co2 Emission Factors (in kg CO2e per unit) ---
  const EMISSION_FACTORS = {
    car: {
      petrol: 0.170,   // kg CO2e per km
      diesel: 0.171,   // kg CO2e per km
      hybrid: 0.080,   // kg CO2e per km
      electric: 0.045  // kg CO2e per km
    },
    bike: 0.100,       // kg CO2e per km
    bus: 0.080,        // kg CO2e per passenger km
    train: 0.030,      // kg CO2e per passenger km
    active: 0.000,     // Walking & Cycling
    electricity: 0.475, // kg CO2e per kWh (US/Global grid average)
    gas: 2.000,        // kg CO2e per USD of gas bill (estimated conversion factor)
    diet: {
      vegan: 1500,     // kg CO2e per year
      vegetarian: 1700,
      'low-meat': 2500,
      'high-meat': 3300
    }
  };

  // --- Default Application State ---
  let state = {
    // Current calculator inputs
    inputs: {
      carDistance: 120,
      carType: 'petrol',
      bikeDistance: 0,
      busDistance: 30,
      trainDistance: 40,
      activeDistance: 10,
      electricityUsage: 250,
      gasBill: 25,
      householdSize: 1,
      diet: 'vegetarian'
    },
    // Calculated score breakdown (in kg CO2e / year)
    breakdown: {
      transport: 0,
      energy: 0,
      diet: 1700,
      total: 1700
    },
    history: [], // Footprint log history
    challenges: [], // Weekly challenges
    unlockedBadges: [], // Names of unlocked badges
    co2Saved: 0.0, // kg of CO2 saved through challenges
    treesSaved: 0.0 // trees offset equivalent through challenges
  };

  // --- Chart Instances (to prevent canvas overlap bugs) ---
  let breakdownChartInst = null;
  let historyChartInst = null;

  // --- UI Elements Reference ---
  const DOM = {};

  // --- Weekly Sustainability Tips Content ---
  const SYSTEM_TIPS = [
    {
      title: "Tip #1: The Phantom Energy Load",
      text: "Did you know appliances draw energy even when turned off? 'Phantom loads' from standby power account for up to 10% of household electricity bills. Solution: Plug your TVs, chargers, and game systems into smart power strips that shut down power completely when not in use."
    },
    {
      title: "Tip #2: Optimal Thermostat Tuning",
      text: "Heating and cooling make up over 50% of typical home energy bills. Adjusting your thermostat by just 1°C lower in winter or 1°C higher in summer can reduce your HVAC system's emissions and energy bill by 5% to 10% annually."
    },
    {
      title: "Tip #3: Choose Cold Water for Laundry",
      text: "Roughly 75% to 90% of the energy consumed by a washing machine goes solely into heating the water. Washing laundry on cold cycles cleans clothes just as effectively and significantly reduces your household carbon footprint."
    },
    {
      title: "Tip #4: Reduce Meat and Dairy Intake",
      text: "The livestock sector is responsible for nearly 14.5% of human-induced greenhouse gases globally. Swapping out beef or dairy for plant-based proteins just twice a week can shave up to 500 kg of CO2 emissions from your personal footprint annually."
    },
    {
      title: "Tip #5: Tire Pressure & Fuel Economy",
      text: "Under-inflated tires increase fuel consumption because they create more rolling resistance. Keeping your car tires properly inflated improves fuel mileage by up to 3%, saving both gas money and reducing carbon emissions."
    }
  ];

  let currentTipIndex = 0;

  // --- Initial System Badges Definition ---
  const SYSTEM_BADGES = [
    { id: 'recruit', name: 'Eco Recruit', description: 'Generated your first carbon footprint estimation.', criteria: 'Log first footprint', icon: 'award' },
    { id: 'plant_based', name: 'Plant Pioneer', description: 'Subscribed to a low impact diet (Vegan or Vegetarian).', criteria: 'Select Vegan/Vegetarian', icon: 'leaf' },
    { id: 'commuter', name: 'Transit Hero', description: 'Low drive commute: drive less than 50 km per week.', criteria: 'Car travel < 50 km/wk', icon: 'bike' },
    { id: 'power_saver', name: 'Power Saver', description: 'Highly efficient energy consumption (under 150 kWh/mo).', criteria: 'Electricity < 150 kWh/mo', icon: 'zap' },
    { id: 'challenger', name: 'Challenge Champion', description: 'Completed 3 sustainability challenges.', criteria: 'Complete 3 challenges', icon: 'check-square' },
    { id: 'conqueror', name: 'Carbon Conqueror', description: 'Achieve a Low Impact carbon rating (< 3.0 Tons/yr).', criteria: 'Score < 3.0 Tons/yr', icon: 'shield-check' }
  ];

  // --- Initial Weekly Challenges Definition ---
  const DEFAULT_CHALLENGES = [
    { id: 'ch1', title: 'Meatless Monday', desc: 'Swap out beef, pork, and chicken for vegetable proteins today.', co2Save: 5.0, completed: false },
    { id: 'ch2', title: 'Pedal & Public Transit Power', desc: 'Commute via bicycle, walking, metro, or bus instead of driving.', co2Save: 8.0, completed: false },
    { id: 'ch3', title: 'Kill the Standby Phantom', desc: 'Unplug chargers, laptops, and consoles when not actively in use.', co2Save: 2.0, completed: false },
    { id: 'ch4', title: 'Cold-Cycle Wash', desc: 'Do a load of laundry using exclusively cold water.', co2Save: 1.5, completed: false },
    { id: 'ch5', title: 'HVAC Break Time', desc: 'Turn off the A/C or heating for 3 hours and open windows/layer clothing.', co2Save: 3.0, completed: false },
    { id: 'ch6', title: 'Zero Food Waste Meal Prep', desc: 'Plan and eat meals using leftovers, generating absolutely zero food waste today.', co2Save: 2.5, completed: false }
  ];

  // --- Simulated AI Responses ---
  const AI_KEYWORD_RESPONSES = {
    car: `**Car emissions** make up the largest percentage of individual carbon footprint for most people. 
          To reduce this, consider:
          1. **Carpooling**: Sharing rides cuts emissions proportionally.
          2. **Eco-Driving**: Smooth acceleration, moderate speeds, and avoiding idling can save 10-15% on fuel.
          3. **Transition to EVs**: Fully electric vehicles run on average grid electricity outputting less than 1/4 the emissions of combustion cars.`,
    commute: `Improving your **weekly commute** is highly effective:
              * Switching from driving a petrol car to taking a **bus** reduces emissions by about 50%.
              * Taking a **metro or electric train** cuts emissions by over 80%!
              * **Biking or walking** produces exactly **0.0 kg CO2**, while improving cardiovascular health.`,
    diet: `Your **food choices** play an outstanding role in environmental conservation.
           * **Red Meat (Beef & Lamb)**: Has the highest climate footprint (approx. 27-30 kg CO2 per kg of food) due to livestock methane emissions.
           * **Poultry/Pork**: Lower footprint, but still requires significant land and feed resources.
           * **Vegan/Vegetarian**: Plant-based diets reduce carbon emissions by up to 55% compared to high-meat diets. Every vegan meal saves water and preserves forest ecosystems!`,
    vegan: `A **vegan diet** is widely recognized as one of the single biggest ways to reduce your environmental impact.
            By removing animal-based foods, you bypass high-emission processing and enteric fermentation. 
            Additionally, vegan diets require roughly **1/10th of the land and water resources** compared to standard diets, helping stop deforestation!`,
    electricity: `**Home utilities & electricity** represent a massive opportunity for savings:
                  * **LED Bulbs**: Upgrade standard bulbs to LED options; they consume 80% less energy.
                  * **Thermostats**: Lower heat in winter to 18-20°C and set A/C in summer to 24-26°C.
                  * **Energy Star**: Buy appliances with high efficiency ratings.
                  * **Green Energy**: If available, subscribe to wind or solar options with your local utility provider.`,
    energy: `**Household energy reduction** pays off in both lower carbon footprint and reduced electricity bills:
             1. **Unplug Standby**: Standard devices draw "vampire power" when off. Use smart power strips.
             2. **Insulate**: Seal leaks around windows and doors to prevent heating/cooling loss.
             3. **Wash Cold**: Laundering clothes in cold water preserves fabrics and uses 90% less electricity.`,
    offset: `**Carbon offsets** are investments in environmental projects (like reforestation or renewable energy) designed to balance out your emissions. 
             While carbon offsets are useful tools, **reducing emissions at the source** is always superior to buying offsets. Treat offsets as a final step for emissions you cannot possibly avoid.`,
    neutral: `**Carbon Neutrality** means balancing greenhouse emissions by offsets, whereas **Net Zero** means eliminating emissions to the absolute maximum extent possible, only using carbon removal techniques for the remaining unavoidable emissions. 
              Aim to minimize your footprint using EcoTrack AI before relying on offsets!`
  };

  // ==========================================
  // Core Methods
  // ==========================================

  // 1. Initialize DOM Nodes
  function cacheElements() {
    DOM.sidebar = document.getElementById('app-sidebar');
    DOM.menuToggleBtn = document.getElementById('menu-toggle-btn');
    DOM.sidebarTreesCount = document.getElementById('sidebar-trees-count');
    DOM.sidebarProgress = document.getElementById('sidebar-progress');
    DOM.topBadgeCount = document.getElementById('top-badge-count');
    DOM.topSavedCo2 = document.getElementById('top-saved-co2');

    // View panels
    DOM.panels = document.querySelectorAll('.view-panel');
    DOM.navLinks = document.querySelectorAll('.nav-link');

    // Dashboard fields
    DOM.dashboardScore = document.getElementById('dashboard-score');
    DOM.gaugeIndicator = document.getElementById('gauge-indicator');
    DOM.impactBadge = document.getElementById('impact-badge');
    DOM.impactDescription = document.getElementById('impact-description');
    DOM.treesRequiredVal = document.getElementById('trees-required-val');
    DOM.treesSavedVal = document.getElementById('trees-saved-val');
    DOM.badgeProgressPercent = document.getElementById('badge-progress-percent');
    DOM.dashboardBadgeProgressBar = document.getElementById('dashboard-badge-progress-bar');
    DOM.dashboardQuickAdvice = document.getElementById('dashboard-quick-advice');

    // Calculator fields
    DOM.calculatorForm = document.getElementById('calculator-form');
    DOM.carDistance = document.getElementById('car-distance');
    DOM.carType = document.getElementById('car-type');
    DOM.bikeDistance = document.getElementById('bike-distance');
    DOM.busDistance = document.getElementById('bus-distance');
    DOM.trainDistance = document.getElementById('train-distance');
    DOM.activeDistance = document.getElementById('active-distance');
    DOM.electricityUsage = document.getElementById('electricity-usage');
    DOM.gasBill = document.getElementById('gas-bill');
    DOM.householdSize = document.getElementById('household-size');
    DOM.dietCards = document.querySelectorAll('.diet-option-card');
    DOM.submitCalculationBtn = document.getElementById('submit-calculation-btn');

    // AI advisor fields
    DOM.aiCurrentScore = document.getElementById('ai-current-score');
    DOM.btnGenerateReport = document.getElementById('btn-generate-report');
    DOM.chatMessagesContainer = document.getElementById('chat-messages-container');
    DOM.chatTextInput = document.getElementById('chat-text-input');
    DOM.chatSendBtn = document.getElementById('chat-send-btn');
    DOM.chatClearBtn = document.getElementById('btn-clear-chat');
    DOM.chatTypingIndicator = document.getElementById('chat-typing-indicator');
    DOM.promptChips = document.querySelectorAll('.prompt-chip');

    // Challenges fields
    DOM.challengesListContainer = document.getElementById('challenges-list-container');
    DOM.badgesGridContainer = document.getElementById('badges-grid-container');
    DOM.unlockedBadgeCountCard = document.getElementById('unlocked-badge-count-card');
    DOM.lockedBadgeCountCard = document.getElementById('locked-badge-count-card');
    DOM.weeklyChallengeScore = document.getElementById('weekly-challenge-score');

    // Tips fields
    DOM.tipCarouselBox = document.getElementById('tip-carousel-box');
    DOM.tipPrevBtn = document.getElementById('tip-prev');
    DOM.tipNextBtn = document.getElementById('tip-next');

    // Validation testing elements
    DOM.btnRunAllTests = document.getElementById('btn-run-all-tests');
    DOM.btnResetTestPanel = document.getElementById('btn-reset-test-panel');
    DOM.testSummaryStatus = document.getElementById('test-summary-status');
    DOM.testSummaryRun = document.getElementById('test-summary-run');
    DOM.testSummaryRate = document.getElementById('test-summary-rate');
    DOM.testSummaryTime = document.getElementById('test-summary-time');
    DOM.testResultsBody = document.getElementById('test-results-body');
  }

  // 2. Load State from LocalStorage or Set Defaults
  function loadState() {
    const saved = localStorage.getItem('ecotrack_state');
    if (saved) {
      try {
        state = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local storage, loading defaults", e);
      }
    } else {
      // Pre-fill history trends for visual appeal on first load
      const now = new Date();
      state.history = [
        { date: formatDate(new Date(now.getFullYear(), now.getMonth() - 3, 15)), score: 6.8 },
        { date: formatDate(new Date(now.getFullYear(), now.getMonth() - 2, 10)), score: 5.9 },
        { date: formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 5)), score: 5.2 }
      ];
      state.challenges = [...DEFAULT_CHALLENGES];
      state.co2Saved = 0.0;
      state.treesSaved = 0.0;
      state.unlockedBadges = [];
      saveState();
    }
  }

  // 3. Save State to LocalStorage
  function saveState() {
    localStorage.setItem('ecotrack_state', JSON.stringify(state));
  }

  // Helper date formatter
  function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // ==========================================
  // Router / Switch Views
  // ==========================================
  function switchView(targetViewId) {
    // 1. Hide all panels
    DOM.panels.forEach(panel => {
      panel.classList.remove('active-view');
    });

    // 2. Deactivate navigation active styling
    DOM.navLinks.forEach(link => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });

    // 3. Display target panel
    const targetPanel = document.getElementById(`${targetViewId}-view`);
    if (targetPanel) {
      targetPanel.classList.add('active-view');
    }

    // 4. Highlight target navigation button
    const targetNavLink = document.querySelector(`.nav-link[data-view="${targetViewId}"]`);
    if (targetNavLink) {
      targetNavLink.classList.add('active');
      targetNavLink.setAttribute('aria-current', 'page');
    }

    // Close mobile menu sidebar if open
    DOM.sidebar.classList.remove('mobile-open');
    DOM.menuToggleBtn.setAttribute('aria-expanded', 'false');

    // Special Chart Updates on Switching to Dashboard
    if (targetViewId === 'dashboard') {
      renderCharts();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================
  // Carbon Footprint Calculations
  // ==========================================
  function computeEmissions(inputs) {
    const {
      carDistance,
      carType,
      bikeDistance,
      busDistance,
      trainDistance,
      electricityUsage,
      gasBill,
      householdSize,
      diet
    } = inputs;

    const carEmissions = carDistance * 52 * EMISSION_FACTORS.car[carType];
    const bikeEmissions = bikeDistance * 52 * EMISSION_FACTORS.bike;
    const busEmissions = busDistance * 52 * EMISSION_FACTORS.bus;
    const trainEmissions = trainDistance * 52 * EMISSION_FACTORS.train;
    const transportTotal = carEmissions + bikeEmissions + busEmissions + trainEmissions;

    const elecEmissions = (electricityUsage * 12 * EMISSION_FACTORS.electricity) / householdSize;
    const gasEmissions = (gasBill * 12 * EMISSION_FACTORS.gas) / householdSize;
    const energyTotal = elecEmissions + gasEmissions;

    const dietTotal = EMISSION_FACTORS.diet[diet] || 1700;

    const grandTotalKg = transportTotal + energyTotal + dietTotal;

    return {
      transport: Math.round(transportTotal),
      energy: Math.round(energyTotal),
      diet: Math.round(dietTotal),
      total: Math.round(grandTotalKg)
    };
  }

  function validateInputs(rawInputs) {
    const errors = {};

    const validateNumber = (val, fieldName, minVal = 0, maxVal = 10000, isInteger = false) => {
      if (val === undefined || val === null || val.toString().trim() === "") {
        return "Field cannot be empty.";
      }
      const num = isInteger ? parseInt(val, 10) : parseFloat(val);
      if (isNaN(num)) {
        return "Must be a valid number.";
      }
      if (num < minVal) {
        return `Value cannot be negative (min: ${minVal}).`;
      }
      if (num > maxVal) {
        return `Value exceeds realistic limit (max: ${maxVal.toLocaleString()}).`;
      }
      if (isInteger && !Number.isInteger(parseFloat(val))) {
        return "Must be a whole number.";
      }
      return null;
    };

    const carErr = validateNumber(rawInputs.carDistance, 'carDistance');
    if (carErr) errors.carDistance = carErr;

    const bikeErr = validateNumber(rawInputs.bikeDistance, 'bikeDistance');
    if (bikeErr) errors.bikeDistance = bikeErr;

    const busErr = validateNumber(rawInputs.busDistance, 'busDistance');
    if (busErr) errors.busDistance = busErr;

    const trainErr = validateNumber(rawInputs.trainDistance, 'trainDistance');
    if (trainErr) errors.trainDistance = trainErr;

    const activeErr = validateNumber(rawInputs.activeDistance, 'activeDistance');
    if (activeErr) errors.activeDistance = activeErr;

    const elecErr = validateNumber(rawInputs.electricityUsage, 'electricityUsage', 0, 100000);
    if (elecErr) errors.electricityUsage = elecErr;

    const gasErr = validateNumber(rawInputs.gasBill, 'gasBill', 0, 10000);
    if (gasErr) errors.gasBill = gasErr;

    const hhErr = validateNumber(rawInputs.householdSize, 'householdSize', 1, 100, true);
    if (hhErr) errors.householdSize = hhErr;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  function clearInputErrors() {
    const inputs = DOM.calculatorForm.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.classList.remove('input-error');
    });

    const errorMsgs = DOM.calculatorForm.querySelectorAll('.input-error-msg');
    errorMsgs.forEach(msg => msg.remove());
  }

  function showInputErrors(errors) {
    for (const [fieldName, errMsg] of Object.entries(errors)) {
      const kebabName = fieldName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      const inputEl = document.getElementById(kebabName);
      if (inputEl) {
        inputEl.classList.add('input-error');

        const errorMsgEl = document.createElement('span');
        errorMsgEl.className = 'input-error-msg';
        errorMsgEl.innerText = errMsg;

        inputEl.parentNode.appendChild(errorMsgEl);
      }
    }
  }

  function navigateToFirstStepWithError(errors) {
    const step1Fields = ['carDistance', 'bikeDistance', 'busDistance', 'trainDistance', 'activeDistance'];
    const step2Fields = ['electricityUsage', 'gasBill', 'householdSize'];

    for (const field of Object.keys(errors)) {
      if (step1Fields.includes(field)) {
        showWizardStep(1);
        return;
      }
    }

    for (const field of Object.keys(errors)) {
      if (step2Fields.includes(field)) {
        showWizardStep(2);
        return;
      }
    }
  }

  function calculateCarbonFootprint() {
    const rawInputs = {
      carDistance: DOM.carDistance.value,
      carType: DOM.carType.value,
      bikeDistance: DOM.bikeDistance.value,
      busDistance: DOM.busDistance.value,
      trainDistance: DOM.trainDistance.value,
      activeDistance: DOM.activeDistance.value,
      electricityUsage: DOM.electricityUsage.value,
      gasBill: DOM.gasBill.value,
      householdSize: DOM.householdSize.value,
      diet: state.inputs.diet
    };

    const validation = validateInputs(rawInputs);

    clearInputErrors();

    if (!validation.isValid) {
      showInputErrors(validation.errors);
      navigateToFirstStepWithError(validation.errors);
      showNotification("Calculation failed: Please correct the errors in the form.", "error");
      return;
    }

    const inputs = {
      carDistance: parseFloat(rawInputs.carDistance),
      carType: rawInputs.carType,
      bikeDistance: parseFloat(rawInputs.bikeDistance),
      busDistance: parseFloat(rawInputs.busDistance),
      trainDistance: parseFloat(rawInputs.trainDistance),
      activeDistance: parseFloat(rawInputs.activeDistance),
      electricityUsage: parseFloat(rawInputs.electricityUsage),
      gasBill: parseFloat(rawInputs.gasBill),
      householdSize: parseInt(rawInputs.householdSize, 10),
      diet: rawInputs.diet
    };

    state.inputs = inputs;
    state.breakdown = computeEmissions(inputs);

    const grandTotalTons = state.breakdown.total / 1000;
    const dateStr = formatDate(new Date());

    const existingLogIdx = state.history.findIndex(h => h.date === dateStr);
    if (existingLogIdx !== -1) {
      state.history[existingLogIdx].score = parseFloat(grandTotalTons.toFixed(2));
    } else {
      state.history.push({
        date: dateStr,
        score: parseFloat(grandTotalTons.toFixed(2))
      });
      if (state.history.length > 6) {
        state.history.shift();
      }
    }

    checkBadgeCriteria(grandTotalTons);

    saveState();
    updateUIElements();

    showNotification("Footprint calculated successfully!", "success");
    switchView('dashboard');
  }

  // ==========================================
  // UI Updates & Syncing
  // ==========================================
  function updateUIElements() {
    const tons = state.breakdown.total / 1000;

    // 1. Dashboard values
    DOM.dashboardScore.textContent = tons.toFixed(1);
    DOM.aiCurrentScore.textContent = `${tons.toFixed(1)} Tons / Year`;

    // Impact Classification
    let impactText = "Medium Impact";
    let impactClass = "text-medium";
    let impactDesc = "Your carbon score is close to the average household standard. Focus on switching utility providers or introducing car-free commute days to shrink it further.";

    if (tons < 3.0) {
      impactText = "Low Impact";
      impactClass = "text-low";
      impactDesc = "Incredible! Your footprint is low and sustainable. You are leading the charge for a cleaner and healthier biosphere.";
    } else if (tons > 7.0) {
      impactText = "High Impact";
      impactClass = "text-high";
      impactDesc = "Your emissions are high compared to green goals. Reducing car commutes, selecting efficiency bulbs, and incorporating more plant meals will yield huge improvements.";
    }

    DOM.impactBadge.textContent = impactText;
    DOM.impactBadge.className = `impact-indicator ${impactClass}`;
    DOM.impactDescription.textContent = impactDesc;

    // Trees Required
    const treesNeeded = Math.round(state.breakdown.total / 22);
    DOM.treesRequiredVal.textContent = treesNeeded.toLocaleString();

    // Trees & CO2 saved stats
    DOM.treesSavedVal.textContent = state.treesSaved.toFixed(1);
    DOM.sidebarTreesCount.textContent = state.treesSaved.toFixed(1);
    DOM.topSavedCo2.textContent = `${state.co2Saved.toFixed(1)} kg`;

    // Circular gauge updates
    // Total range is 0 to 12 tons co2. Calculate percentage
    const maxTonsRange = 12.0;
    const scorePercentage = Math.min(1.0, tons / maxTonsRange);
    const strokeDash = 251.2; // 2 * pi * r (r=40)
    const strokeOffset = strokeDash - (scorePercentage * strokeDash);
    DOM.gaugeIndicator.style.strokeDashoffset = strokeOffset;
    // Set color based on impact
    if (tons < 3.0) {
      DOM.gaugeIndicator.style.stroke = "var(--primary)";
    } else if (tons > 7.0) {
      DOM.gaugeIndicator.style.stroke = "var(--danger)";
    } else {
      DOM.gaugeIndicator.style.stroke = "var(--warning)";
    }

    // 2. Form Wizard Syncing (restore saved inputs on load)
    DOM.carDistance.value = state.inputs.carDistance;
    DOM.carType.value = state.inputs.carType;
    DOM.bikeDistance.value = state.inputs.bikeDistance;
    DOM.busDistance.value = state.inputs.busDistance;
    DOM.trainDistance.value = state.inputs.trainDistance;
    DOM.activeDistance.value = state.inputs.activeDistance;
    DOM.electricityUsage.value = state.inputs.electricityUsage;
    DOM.gasBill.value = state.inputs.gasBill;
    DOM.householdSize.value = state.inputs.householdSize;

    // Diet Selection Card Syncing
    DOM.dietCards.forEach(card => {
      if (card.getAttribute('data-diet') === state.inputs.diet) {
        card.classList.add('active');
        card.setAttribute('aria-checked', 'true');
      } else {
        card.classList.remove('active');
        card.setAttribute('aria-checked', 'false');
      }
    });

    // 3. Badges stats
    const totalBadges = SYSTEM_BADGES.length;
    const unlockedCount = state.unlockedBadges.length;
    const lockedCount = totalBadges - unlockedCount;
    DOM.topBadgeCount.textContent = unlockedCount;
    DOM.unlockedBadgeCountCard.textContent = unlockedCount;
    DOM.lockedBadgeCountCard.textContent = lockedCount;

    // Badge progress mini bar
    const badgeProgressPct = Math.round((unlockedCount / totalBadges) * 100);
    DOM.badgeProgressPercent.textContent = `${badgeProgressPct}%`;
    DOM.dashboardBadgeProgressBar.style.width = `${badgeProgressPct}%`;
    DOM.sidebarProgress.style.width = `${badgeProgressPct}%`;

    // 4. Render Challenges list & Badges grid
    renderChallengesList();
    renderBadgesGrid();

    // 5. Generate AI Dashboard Tip
    generateDashboardQuickTip();
  }

  // Generate quick advice text based on largest emitter
  function generateDashboardQuickTip() {
    const { transport, energy, diet } = state.breakdown;

    if (state.breakdown.total === 0) {
      DOM.dashboardQuickAdvice.innerHTML = "Welcome! Fill out the <strong>Carbon Calculator</strong> tab to see your footprint score and unlock tailored reduction recommendations.";
      return;
    }

    let tip = "";
    if (transport >= energy && transport >= diet) {
      tip = "💡 **Commute Focus**: Transport contributes the most to your footprint. Trying one work-from-home or bus commute day each week can save over **450 kg CO2** yearly. Walk or cycle for nearby tasks!";
    } else if (energy >= transport && energy >= diet) {
      tip = "💡 **Power Efficiency**: Energy is your primary emitter. Unplug standby gadgets, switch to efficient LED bulbs, and choose cold water washes to lower emissions and utility expenditures.";
    } else {
      tip = "💡 **Diet Focus**: Food options compose your highest emitter. Simply replacing red meat with chicken or pulses (beans/lentils) twice a week will diminish emissions by up to **300 kg CO2** annually.";
    }

    // Convert markdown bold to html tags
    DOM.dashboardQuickAdvice.innerHTML = tip.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  // ==========================================
  // Gamification: Challenges & Badges
  // ==========================================

  // Render Challenges List in DOM
  function renderChallengesList() {
    DOM.challengesListContainer.innerHTML = '';

    if (state.challenges.length === 0) {
      state.challenges = [...DEFAULT_CHALLENGES];
      saveState();
    }

    state.challenges.forEach(challenge => {
      const isCompleted = challenge.completed;
      const card = document.createElement('div');
      card.className = `challenge-item ${isCompleted ? 'completed' : ''}`;

      card.innerHTML = `
        <div class="challenge-checkbox-container">
          <input type="checkbox" 
                 class="challenge-checkbox" 
                 id="check-${challenge.id}" 
                 ${isCompleted ? 'checked disabled' : ''} 
                 aria-label="Mark ${challenge.title} as completed">
        </div>
        <div class="challenge-details">
          <h4>${challenge.title}</h4>
          <p>${challenge.desc}</p>
          <div class="challenge-meta">
            <span class="challenge-badge badge-co2"><i data-lucide="zap" style="width: 10px; height: 10px;"></i> -${challenge.co2Save} kg CO₂</span>
            <span class="challenge-badge badge-xp"><i data-lucide="leaf" style="width: 10px; height: 10px;"></i> Offset</span>
          </div>
        </div>
      `;

      // Set listener on checkbox change
      const checkbox = card.querySelector('.challenge-checkbox');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          completeChallenge(challenge.id);
        }
      });

      DOM.challengesListContainer.appendChild(card);
    });

    // Count completions
    const doneCount = state.challenges.filter(c => c.completed).length;
    DOM.weeklyChallengeScore.textContent = doneCount;

    // Refresh lucide icons inside generated html
    lucide.createIcons();
  }

  // Mark Challenge as Completed
  function completeChallenge(challengeId) {
    const challenge = state.challenges.find(c => c.id === challengeId);
    if (challenge && !challenge.completed) {
      challenge.completed = true;

      // Update global saved stats
      state.co2Saved += challenge.co2Save;
      // 1 mature tree offsets ~22 kg CO2 / year
      state.treesSaved = state.co2Saved / 22;

      // Check badge progress
      checkBadgeCriteria();

      saveState();
      updateUIElements();
      showNotification(`Challenge "${challenge.title}" Completed! Saved ${challenge.co2Save} kg CO2e.`);
    }
  }

  // Render Badge Showcase
  function renderBadgesGrid() {
    DOM.badgesGridContainer.innerHTML = '';

    SYSTEM_BADGES.forEach(badge => {
      const isUnlocked = state.unlockedBadges.includes(badge.id);
      const card = document.createElement('div');
      card.className = `badge-card-item ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.setAttribute('data-tooltip', `Requirement: ${badge.criteria}`);

      card.innerHTML = `
        <div class="badge-icon-wrap">
          <i data-lucide="${badge.icon}"></i>
        </div>
        <h4>${badge.name}</h4>
        <p>${badge.description}</p>
      `;

      DOM.badgesGridContainer.appendChild(card);
    });

    lucide.createIcons();
  }

  // Badge unlock validation rules
  function checkBadgeCriteria(currentTons) {
    const initialCount = state.unlockedBadges.length;

    // Helper to add badge
    const unlock = (badgeId) => {
      if (!state.unlockedBadges.includes(badgeId)) {
        state.unlockedBadges.push(badgeId);
        showNotification(`🏆 New Badge Unlocked: ${SYSTEM_BADGES.find(b => b.id === badgeId).name}!`);
      }
    };

    // 1. Eco Recruit (Logged first footprint)
    if (state.history.length > 0 || state.breakdown.total > 0) {
      unlock('recruit');
    }

    // 2. Plant Pioneer (Vegan or vegetarian diet)
    if (state.inputs.diet === 'vegan' || state.inputs.diet === 'vegetarian') {
      unlock('plant_based');
    }

    // 3. Transit Hero (Car travel < 50 km/wk)
    if (state.inputs.carDistance < 50) {
      unlock('commuter');
    }

    // 4. Power Saver (Electricity < 150 kWh/mo)
    if (state.inputs.electricityUsage < 150) {
      unlock('power_saver');
    }

    // 5. Challenge Champion (Complete 3 challenges)
    const completedChallengesCount = state.challenges.filter(c => c.completed).length;
    if (completedChallengesCount >= 3) {
      unlock('challenger');
    }

    // 6. Carbon Conqueror (Score < 3.0 Tons/yr)
    const tons = currentTons || (state.breakdown.total / 1000);
    if (tons > 0 && tons < 3.0) {
      unlock('conqueror');
    }

    if (state.unlockedBadges.length > initialCount) {
      saveState();
    }
  }

  // ==========================================
  // Interactive Dashboard Charts
  // ==========================================
  function renderCharts() {
    // 1. DOUGHNUT BREAKDOWN CHART
    const breakdownCanvas = document.getElementById('breakdownChart');
    if (breakdownCanvas) {
      // Destroy previous instance
      if (breakdownChartInst) {
        breakdownChartInst.destroy();
      }

      const transportVal = state.breakdown.transport;
      const energyVal = state.breakdown.energy;
      const dietVal = state.breakdown.diet;

      const isEmpty = (transportVal + energyVal + dietVal) === 0;

      // Render chart
      breakdownChartInst = new Chart(breakdownCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Transport', 'Utilities', 'Diet'],
          datasets: [{
            data: isEmpty ? [1, 1, 1] : [transportVal, energyVal, dietVal],
            backgroundColor: isEmpty
              ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)']
              : ['#10b981', '#3b82f6', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#94a3b8',
                font: { family: 'Outfit', size: 12 },
                padding: 15
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  if (isEmpty) return ' No data logged';
                  const value = context.raw;
                  return ` ${context.label}: ${value.toLocaleString()} kg CO2/yr`;
                }
              }
            }
          },
          cutout: '65%'
        }
      });
    }

    // 2. LINE HISTORICAL GRAPH
    const historyCanvas = document.getElementById('historyChart');
    if (historyCanvas) {
      if (historyChartInst) {
        historyChartInst.destroy();
      }

      // Collect data from state history
      const labels = state.history.map(item => item.date);
      const dataPoints = state.history.map(item => item.score);

      historyChartInst = new Chart(historyCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Carbon Score (Tons CO₂e/yr)',
            data: dataPoints,
            fill: true,
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.05)',
            tension: 0.35,
            borderWidth: 3,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#070a13',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return ` Score: ${context.raw} Tons`;
                }
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            }
          }
        }
      });
    }
  }

  // ==========================================
  // Eco AI Chat Bot & Audit Generator
  // ==========================================

  // Clear Chat History
  function clearChat() {
    DOM.chatMessagesContainer.innerHTML = `
      <div class="message system-message">
        <div class="msg-avatar">
          <i data-lucide="bot"></i>
        </div>
        <div class="msg-body">
          <p>Chat cleared. I'm ready to run diagnostics. Ask me any question or click **Generate Full Audit Report**!</p>
        </div>
      </div>
    `;
    lucide.createIcons();
  }

  // Handle user inputs in chat
  function handleSendMessage() {
    const query = DOM.chatTextInput.value.trim();
    if (!query) return;

    // Reset input field
    DOM.chatTextInput.value = '';

    // Append User Message to UI
    appendChatMessage('user', query);

    // Show AI Typing indicator
    DOM.chatTypingIndicator.style.display = 'flex';
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;

    // Simulate analysis delay (1 sec)
    setTimeout(() => {
      DOM.chatTypingIndicator.style.display = 'none';

      // Look up keywords
      let reply = "";
      const lowerQuery = query.toLowerCase();

      let matchedKeyword = null;
      for (const keyword of Object.keys(AI_KEYWORD_RESPONSES)) {
        if (lowerQuery.includes(keyword)) {
          matchedKeyword = keyword;
          break;
        }
      }

      if (matchedKeyword) {
        reply = AI_KEYWORD_RESPONSES[matchedKeyword];
      } else {
        reply = `Interesting question! As an **Eco AI Advisor**, I track carbon offsets and sustainability habits.
                
                For this query, I recommend focusing on three core pillars:
                1. **Electrify everything**: Move from gas cooking/heating to electric induction and heat pumps.
                2. **Power with solar**: Look into rooftop panels or solar sharing schemes.
                3. **Reduce waste**: Food packaging and organic compost decay in landfills releasing high levels of greenhouse gases. Recycle and compost diligently!
                
                Try asking about **car commutes**, **vegetarian/vegan diets**, or **home energy savings** for metrics specific to your log profile.`;
      }

      appendChatMessage('system', reply);
    }, 1100);
  }

  // Helper: Append chat bubble to UI with markdown rendering & styling
  function appendChatMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender === 'user' ? 'user-message' : 'system-message'}`;

    // Parse simulated markdown elements (bold, bullet points, numbers)
    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\*\s(.*)$/gm, '<li>$1</li>')
      .replace(/^\s*\*\s(.*)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\.\s(.*)$/gm, '<li><strong>$1.</strong> $2</li>');

    // Wrap list items in lists
    if (formattedText.includes('<li>')) {
      // Check if lists are nested or consecutive
      formattedText = formattedText.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    }

    // Split text by double newlines to make paragraphs
    formattedText = formattedText
      .split('\n\n')
      .map(p => {
        if (p.trim().startsWith('<ul>') || p.trim().startsWith('<div')) return p;
        return `<p>${p}</p>`;
      })
      .join('');

    const icon = sender === 'user' ? 'user' : 'bot';

    msgDiv.innerHTML = `
      <div class="msg-avatar">
        <i data-lucide="${icon}"></i>
      </div>
      <div class="msg-body">
        ${formattedText}
      </div>
    `;

    DOM.chatMessagesContainer.appendChild(msgDiv);
    lucide.createIcons();
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
  }

  // Heuristic report generator
  function generateAuditReport() {
    const { transport, energy, diet, total } = state.breakdown;
    const tons = total / 1000;

    if (total === 0) {
      appendChatMessage('system', "⚠️ **Insufficient Data**: Please complete the Carbon Calculator wizard first to feed diagnostic data into the AI Generator.");
      return;
    }

    DOM.chatTypingIndicator.style.display = 'flex';
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;

    setTimeout(() => {
      DOM.chatTypingIndicator.style.display = 'none';

      // Identify major source
      let primarySource = "Diet Habits";
      let primaryValue = diet;
      let primaryTip = "Transitioning diet to vegetarian or vegan scales back intensive dairy/livestock emissions.";

      if (transport >= energy && transport >= diet) {
        primarySource = "Transportation";
        primaryValue = transport;
        primaryTip = "Commuting via public transit, optimizing car routes, or moving to hybrid/electric vehicles.";
      } else if (energy >= transport && energy >= diet) {
        primarySource = "Utilities & Home Energy";
        primaryValue = energy;
        primaryTip = "Lowering thermostat temperatures, washing clothes in cold water, and unplugging standby gadgets.";
      }

      // Calculations
      const offsetTreesNum = Math.round(total / 22);
      const targetSavingsKg = Math.round(total * 0.35); // 35% standard achievable target
      const targetSavingsTons = targetSavingsKg / 1000;

      const reportHtml = `
        <div class="ai-report">
          <div class="report-header">📋 CARBON DIAGNOSTIC AUDIT REPORT</div>
          
          <div class="report-section">
            <span class="section-title">Emissions Summary</span>
            <span class="section-body">
              Your overall footprint baseline is **${tons.toFixed(2)} Tons CO₂e / year**. 
              This requires planting approximately **${offsetTreesNum} mature trees** to offset completely.
            </span>
          </div>

          <div class="report-section">
            <span class="section-title">Dominant Emitter Highlight</span>
            <span class="section-body">
              Your largest emission source is **${primarySource}** generating **${(primaryValue / 1000).toFixed(2)} Tons CO₂e/yr** (${Math.round((primaryValue / total) * 100)}% of total). 
              Focusing effort here yields the highest returns.
            </span>
          </div>

          <div class="report-section">
            <span class="section-title">35% Reduction Action Blueprint</span>
            <span class="section-body">
              We've created a custom action strategy to save **${targetSavingsTons.toFixed(2)} Tons CO₂e / year**:
              * **Stage 1 (Immediate)**: Complete the "${state.challenges[0].title}" and "${state.challenges[2].title}" weekly challenges to start saving footprint immediately.
              * **Stage 2 (Commute Adjustment)**: Swap 2 days of car travel for public transit, or reduce weekly mileage by 40 km. Saves ~340 kg CO2/yr.
              * **Stage 3 (Food Habits)**: Introduce 2 plant-based dinner meals weekly. Saves ~280 kg CO2/yr.
            </span>
          </div>

          <div class="report-section">
            <span class="section-title">Estimated Annual Financial Savings</span>
            <span class="section-body">
              Implementing this blueprint saves you approximately **$420 - $650 / year** in gasoline bills and electrical utilities utility cost!
            </span>
          </div>
        </div>
      `;

      appendChatMessage('system', reportHtml);
    }, 1500);
  }

  // ==========================================
  // Tips Slider/Carousel Navigation
  // ==========================================
  function renderWeeklyTips() {
    DOM.tipCarouselBox.innerHTML = '';

    SYSTEM_TIPS.forEach((tip, idx) => {
      const slide = document.createElement('div');
      slide.className = `tip-slide ${idx === currentTipIndex ? 'active-slide' : ''}`;
      slide.innerHTML = `
        <h3>${tip.title}</h3>
        <p>${tip.text}</p>
      `;
      DOM.tipCarouselBox.appendChild(slide);
    });
  }

  function changeTip(direction) {
    if (direction === 'next') {
      currentTipIndex = (currentTipIndex + 1) % SYSTEM_TIPS.length;
    } else {
      currentTipIndex = (currentTipIndex - 1 + SYSTEM_TIPS.length) % SYSTEM_TIPS.length;
    }
    renderWeeklyTips();
  }

  // ==========================================
  // Toast Notifications
  // ==========================================
  function showNotification(msg, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `toast-alert toast-${type}`;

    let iconName = 'info';
    let iconColor = 'var(--primary)';
    let borderColor = 'rgba(16, 185, 129, 0.25)';

    if (type === 'error') {
      iconName = 'alert-triangle';
      iconColor = 'var(--danger)';
      borderColor = 'rgba(244, 63, 94, 0.25)';
    } else if (type === 'success') {
      iconName = 'check-circle';
      iconColor = 'var(--primary)';
      borderColor = 'rgba(16, 185, 129, 0.25)';
    }

    alertDiv.innerHTML = `
      <i data-lucide="${iconName}" style="color: ${iconColor};"></i>
      <span>${msg}</span>
    `;

    document.body.appendChild(alertDiv);
    lucide.createIcons();

    // Style toast in JS dynamically to avoid stylesheet bloating
    Object.assign(alertDiv.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      border: `1px solid ${borderColor}`,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      color: '#fff',
      padding: '1rem 1.5rem',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      zIndex: '150',
      backdropFilter: 'blur(8px)',
      animation: 'slide-up var(--transition-fast) forwards'
    });

    // Remove toast after 3.5 seconds
    setTimeout(() => {
      alertDiv.style.animation = 'fade-in 0.3s reverse forwards';
      setTimeout(() => alertDiv.remove(), 300);
    }, 3500);
  }

  // ==========================================
  // Validation Testing Diagnostics Suite
  // ==========================================
  const TEST_CASES = [
    {
      id: "TC-01",
      name: "Valid Normal Baseline Inputs",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "1",
        diet: "vegetarian"
      },
      expectedResult: "Success",
      validateFn: (res, calcRes) => {
        return res.isValid === true && calcRes && calcRes.total > 4900 && calcRes.total < 5000;
      }
    },
    {
      id: "TC-02",
      name: "Negative Value Check (Car Commute)",
      inputs: {
        carDistance: "-50",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "1",
        diet: "vegetarian"
      },
      expectedResult: "Error (Negative value blocked)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.carDistance && res.errors.carDistance.includes("negative");
      }
    },
    {
      id: "TC-03",
      name: "Empty Field Check (Electricity)",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "",
        gasBill: "25",
        householdSize: "1",
        diet: "vegetarian"
      },
      expectedResult: "Error (Empty field blocked)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.electricityUsage && res.errors.electricityUsage.includes("empty");
      }
    },
    {
      id: "TC-04",
      name: "Division by Zero Check (Household Size = 0)",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "0",
        diet: "vegetarian"
      },
      expectedResult: "Error (Household size < 1 blocked)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.householdSize && res.errors.householdSize.includes("min: 1");
      }
    },
    {
      id: "TC-05",
      name: "Negative Household Size Check",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "-3",
        diet: "vegetarian"
      },
      expectedResult: "Error (Negative/invalid household blocked)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.householdSize;
      }
    },
    {
      id: "TC-06",
      name: "Non-numeric Input Check",
      inputs: {
        carDistance: "abc",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "1",
        diet: "vegetarian"
      },
      expectedResult: "Error (Non-numeric value blocked)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.carDistance && res.errors.carDistance.includes("number");
      }
    },
    {
      id: "TC-07",
      name: "Extreme Value Cap Check (Gas Bill)",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "50000",
        householdSize: "1",
        diet: "vegetarian"
      },
      expectedResult: "Error (Realistic limit exceeded)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.gasBill && res.errors.gasBill.includes("limit");
      }
    },
    {
      id: "TC-08",
      name: "Active Commute Zero Carbon Check",
      inputs: {
        carDistance: "0",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "0",
        trainDistance: "0",
        activeDistance: "500",
        electricityUsage: "0",
        gasBill: "0",
        householdSize: "1",
        diet: "vegan"
      },
      expectedResult: "Success (Total matches vegan diet base score)",
      validateFn: (res, calcRes) => {
        return res.isValid === true && calcRes && calcRes.total === 1500;
      }
    }
  ];

  function runValidationTestSuite() {
    DOM.testResultsBody.innerHTML = '';

    let passedCount = 0;
    const totalCount = TEST_CASES.length;
    const startTime = performance.now();

    TEST_CASES.forEach((tc) => {
      const validation = validateInputs(tc.inputs);

      let calcRes = null;
      if (validation.isValid) {
        const inputs = {
          carDistance: parseFloat(tc.inputs.carDistance) || 0,
          carType: tc.inputs.carType,
          bikeDistance: parseFloat(tc.inputs.bikeDistance) || 0,
          busDistance: parseFloat(tc.inputs.busDistance) || 0,
          trainDistance: parseFloat(tc.inputs.trainDistance) || 0,
          activeDistance: parseFloat(tc.inputs.activeDistance) || 0,
          electricityUsage: parseFloat(tc.inputs.electricityUsage) || 0,
          gasBill: parseFloat(tc.inputs.gasBill) || 0,
          householdSize: parseInt(tc.inputs.householdSize, 10) || 1,
          diet: tc.inputs.diet
        };
        calcRes = computeEmissions(inputs);
      }

      const isPassed = tc.validateFn(validation, calcRes);
      if (isPassed) {
        passedCount++;
      }

      const inputsStr = Object.entries(tc.inputs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      let actualResultStr = "";
      if (validation.isValid) {
        actualResultStr = `Success (Score: ${calcRes.total} kg CO2e)`;
      } else {
        actualResultStr = `Error [${Object.keys(validation.errors).join(', ')}]`;
      }

      const row = document.createElement('tr');
      row.className = isPassed ? 'test-row-passed' : 'test-row-failed';
      row.innerHTML = `
        <td class="test-cell-id font-mono">${tc.id}</td>
        <td class="test-cell-name font-semibold">${tc.name}</td>
        <td class="test-cell-inputs font-mono text-xs">${inputsStr}</td>
        <td class="test-cell-expected font-semibold">${tc.expectedResult}</td>
        <td class="test-cell-actual font-semibold">${actualResultStr}</td>
        <td class="test-cell-status">
          <span class="test-status-badge ${isPassed ? 'status-pass' : 'status-fail'}">
            <i data-lucide="${isPassed ? 'check' : 'x'}"></i> ${isPassed ? 'Passed' : 'Failed'}
          </span>
        </td>
      `;

      DOM.testResultsBody.appendChild(row);
    });

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(1);

    DOM.testSummaryStatus.textContent = passedCount === totalCount ? "All Clear" : "Failures Present";
    DOM.testSummaryStatus.className = `test-sum-value ${passedCount === totalCount ? 'text-green' : 'text-rose'}`;

    DOM.testSummaryRun.textContent = `${passedCount} / ${totalCount}`;

    const rate = Math.round((passedCount / totalCount) * 100);
    DOM.testSummaryRate.textContent = `${rate}%`;
    DOM.testSummaryRate.className = `test-sum-value ${rate === 100 ? 'text-green' : 'text-rose'}`;

    DOM.testSummaryTime.textContent = `${duration} ms`;

    lucide.createIcons();
    showNotification(`Diagnostic Suite Completed! Pass rate: ${rate}%`, passedCount === totalCount ? "success" : "error");
  }

  function resetValidationTestSuite() {
    DOM.testResultsBody.innerHTML = `
      <tr>
        <td colspan="6" class="test-table-empty">No tests run yet. Click "Run Verification Suite" to start diagnostics.</td>
      </tr>
    `;

    DOM.testSummaryStatus.textContent = "Idle";
    DOM.testSummaryStatus.className = "test-sum-value text-muted";
    DOM.testSummaryRun.textContent = "0 / 0";
    DOM.testSummaryRate.textContent = "0%";
    DOM.testSummaryRate.className = "test-sum-value";
    DOM.testSummaryTime.textContent = "0 ms";

    showNotification("Diagnostic dashboard reset.", "info");
  }

  // ==========================================
  // Register Listeners
  // ==========================================
  function registerEvents() {
    // 1. Navigation Panel Switches
    DOM.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const targetView = link.getAttribute('data-view');
        switchView(targetView);
      });
    });

    // 2. Mobile Menu Toggle
    DOM.menuToggleBtn.addEventListener('click', () => {
      const isOpen = DOM.sidebar.classList.toggle('mobile-open');
      DOM.menuToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close sidebar when clicking main content on mobile
    document.getElementById('main-content-area').addEventListener('click', () => {
      if (DOM.sidebar.classList.contains('mobile-open')) {
        DOM.sidebar.classList.remove('mobile-open');
        DOM.menuToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // 3. Calculator Stepper Navigation
    const nextBtns = document.querySelectorAll('.next-step-btn');
    const prevBtns = document.querySelectorAll('.prev-step-btn');

    nextBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const nextStep = parseInt(btn.getAttribute('data-next'), 10);
        const currentStep = nextStep - 1;

        // Validate current step
        const errors = {};

        const validate = (val, fieldLabel, min = 0, max = 10000) => {
          if (val === undefined || val === null || val.toString().trim() === "") return "Field cannot be empty.";
          const num = parseFloat(val);
          if (isNaN(num)) return "Must be a valid number.";
          if (num < min) return "Value cannot be negative.";
          if (num > max) return `Value exceeds limit (${max.toLocaleString()}).`;
          return null;
        };

        if (currentStep === 1) {
          const rawInputs = {
            carDistance: DOM.carDistance.value,
            bikeDistance: DOM.bikeDistance.value,
            busDistance: DOM.busDistance.value,
            trainDistance: DOM.trainDistance.value,
            activeDistance: DOM.activeDistance.value
          };

          const carErr = validate(rawInputs.carDistance, 'Car commute');
          if (carErr) errors.carDistance = carErr;
          const bikeErr = validate(rawInputs.bikeDistance, 'Motorcycle commute');
          if (bikeErr) errors.bikeDistance = bikeErr;
          const busErr = validate(rawInputs.busDistance, 'Bus transit');
          if (busErr) errors.busDistance = busErr;
          const trainErr = validate(rawInputs.trainDistance, 'Train transit');
          if (trainErr) errors.trainDistance = trainErr;
          const activeErr = validate(rawInputs.activeDistance, 'Active commute');
          if (activeErr) errors.activeDistance = activeErr;
        } else if (currentStep === 2) {
          const rawInputs = {
            electricityUsage: DOM.electricityUsage.value,
            gasBill: DOM.gasBill.value,
            householdSize: DOM.householdSize.value
          };

          const validateHh = (val) => {
            if (val === undefined || val === null || val.toString().trim() === "") return "Field cannot be empty.";
            const num = parseInt(val, 10);
            if (isNaN(num)) return "Must be a valid number.";
            if (num < 1) return "Household size must be at least 1.";
            if (!Number.isInteger(parseFloat(val))) return "Must be a whole number.";
            if (num > 100) return "Value exceeds limit (100).";
            return null;
          };

          const elecErr = validate(rawInputs.electricityUsage, 'Electricity', 0, 100000);
          if (elecErr) errors.electricityUsage = elecErr;
          const gasErr = validate(rawInputs.gasBill, 'Gas bill', 0, 10000);
          if (gasErr) errors.gasBill = gasErr;
          const hhErr = validateHh(rawInputs.householdSize);
          if (hhErr) errors.householdSize = hhErr;
        }

        clearInputErrors();

        if (Object.keys(errors).length > 0) {
          showInputErrors(errors);
          showNotification("Validation error: Please correct fields.", "error");
        } else {
          showWizardStep(nextStep);
        }
      });
    });

    prevBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prevStep = btn.getAttribute('data-prev');
        showWizardStep(prevStep);
      });
    });

    // Diet Selection Options Event
    DOM.dietCards.forEach(card => {
      card.addEventListener('click', () => {
        DOM.dietCards.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-checked', 'true');
        state.inputs.diet = card.getAttribute('data-diet');
      });

      // Keyboard accessibility (Space/Enter keys select)
      card.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // Submit footprint calculation button
    DOM.submitCalculationBtn.addEventListener('click', calculateCarbonFootprint);

    // 4. AI Chat Bot events
    DOM.btnGenerateReport.addEventListener('click', generateAuditReport);
    DOM.chatSendBtn.addEventListener('click', handleSendMessage);
    DOM.chatClearBtn.addEventListener('click', clearChat);

    // Press enter key triggers send message
    DOM.chatTextInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSendMessage();
      }
    });

    // Quick prompts triggers
    DOM.promptChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        DOM.chatTextInput.value = prompt;
        handleSendMessage();
      });
    });

    // 5. Tips Carousel buttons
    DOM.tipPrevBtn.addEventListener('click', () => changeTip('prev'));
    DOM.tipNextBtn.addEventListener('click', () => changeTip('next'));

    // 6. Validation Diagnostics Center events
    if (DOM.btnRunAllTests) {
      DOM.btnRunAllTests.addEventListener('click', runValidationTestSuite);
    }
    if (DOM.btnResetTestPanel) {
      DOM.btnResetTestPanel.addEventListener('click', resetValidationTestSuite);
    }
  }

  // Stepper Visual Helper
  function showWizardStep(stepNum) {
    // Hide all steps
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(step => step.classList.remove('step-visible'));

    // Show selected step
    document.getElementById(`wizard-step-${stepNum}`).classList.add('step-visible');

    // Update steps stepper colors
    const nodes = document.querySelectorAll('.step-node');
    nodes.forEach(node => {
      const nodeStep = parseInt(node.getAttribute('data-step'));
      if (nodeStep < stepNum) {
        node.classList.remove('active');
        node.classList.add('completed');
      } else if (nodeStep == stepNum) {
        node.classList.add('active');
        node.classList.remove('completed');
      } else {
        node.classList.remove('active', 'completed');
      }
    });

    // Connectors indicators
    const step1Node = document.getElementById('step-node-1');
    const step2Node = document.getElementById('step-node-2');

    // Simple line connections color
    if (stepNum > 1) {
      document.querySelector('.step-connector:nth-of-type(1)').classList.add('completed');
    } else {
      document.querySelector('.step-connector:nth-of-type(1)').classList.remove('completed');
    }

    if (stepNum > 2) {
      document.querySelector('.step-connector:nth-of-type(2)').classList.add('completed');
    } else {
      document.querySelector('.step-connector:nth-of-type(2)').classList.remove('completed');
    }
  }

  // ==========================================
  // Public API
  // ==========================================
  return {
    init: function () {
      cacheElements();
      loadState();
      registerEvents();
      updateUIElements();
      renderWeeklyTips();

      // Render layout charts
      renderCharts();

      // Render icons
      lucide.createIcons();
    },
    switchView: switchView
  };
})();

// Document Ready Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
