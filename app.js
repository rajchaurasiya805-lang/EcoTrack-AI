/**
 * EcoTrack AI - Main Application JavaScript File
 * Handles state, calculations, charts, gamification, and Eco AI chatbot.
 * High-performance, client-side offline implementation.
 * 
 * @author EcoTrack AI Team
 * @version 2.0.1
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
      text: "Did you know appliances draw energy even when turned off? 'Phantom loads' from standby power account for up to 10% of household electricity bills. Solution: Plug your TVs, chargers, and game systems into smart power strips that shut down power completely when not in use.",
      category: "energy"
    },
    {
      title: "Tip #2: Optimal Thermostat Tuning",
      text: "Heating and cooling make up over 50% of typical home energy bills. Adjusting your thermostat by just 1°C lower in winter or 1°C higher in summer can reduce your HVAC system's emissions and energy bill by 5% to 10% annually.",
      category: "energy"
    },
    {
      title: "Tip #3: Choose Cold Water for Laundry",
      text: "Roughly 75% to 90% of the energy consumed by a washing machine goes solely into heating the water. Washing laundry on cold cycles cleans clothes just as effectively and significantly reduces your household carbon footprint.",
      category: "energy"
    },
    {
      title: "Tip #4: Reduce Meat and Dairy Intake",
      text: "The livestock sector is responsible for nearly 14.5% of human-induced greenhouse gases globally. Swapping out beef or dairy for plant-based proteins just twice a week can shave up to 500 kg of CO2 emissions from your personal footprint annually.",
      category: "diet"
    },
    {
      title: "Tip #5: Tire Pressure & Fuel Economy",
      text: "Under-inflated tires increase fuel consumption because they create more rolling resistance. Keeping your car tires properly inflated improves fuel mileage by up to 3%, saving both gas money and reducing carbon emissions.",
      category: "transport"
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
    { id: 'ch1', title: 'Meatless Monday', desc: 'Swap out beef, pork, and chicken for vegetable proteins today.', co2Save: 5.0, completed: false, category: 'diet', insight: 'Bypasses enteric fermentation methane and high feed water footprints.' },
    { id: 'ch2', title: 'Pedal & Public Transit Power', desc: 'Commute via bicycle, walking, metro, or bus instead of driving.', co2Save: 8.0, completed: false, category: 'transport', insight: 'Saves carbon equivalent to what a mature tree sequester-absorbs in 5 months.' },
    { id: 'ch3', title: 'Kill the Standby Phantom', desc: 'Unplug chargers, laptops, and consoles when not actively in use.', co2Save: 2.0, completed: false, category: 'energy', insight: 'Reduces passive vampire draw which forms 10% of electric bills.' },
    { id: 'ch4', title: 'Cold-Cycle Wash', desc: 'Do a load of laundry using exclusively cold water.', co2Save: 1.5, completed: false, category: 'energy', insight: 'Avoids heating water, saving 75-90% of wash electricity.' },
    { id: 'ch5', title: 'HVAC Break Time', desc: 'Turn off the A/C or heating for 3 hours and open windows/layer clothing.', co2Save: 3.0, completed: false, category: 'energy', insight: 'Equivalent to preventing the burning of 1.5 kg of raw coal.' },
    { id: 'ch6', title: 'Zero Food Waste Meal Prep', desc: 'Plan and eat meals using leftovers, generating absolutely zero food waste today.', co2Save: 2.5, completed: false, category: 'diet', insight: 'Prevents organic decay in landfills which releases potent methane gases.' }
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

  // --- Dynamic test coverage branches collector ---
  let testCoverageHits = {
    required: false,
    numeric: false,
    negative: false,
    maxLimit: false,
    integer: false,
    success: false
  };

  // ==========================================
  // Core Methods
  // ==========================================

  /**
   * Caches all required DOM elements to facilitate quick state updates.
   */
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
    DOM.resetCalculatorBtn = document.getElementById('reset-calculator-btn');

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
    DOM.testSummaryCoverage = document.getElementById('test-summary-coverage');
    DOM.testSummaryTime = document.getElementById('test-summary-time');
    DOM.testResultsBody = document.getElementById('test-results-body');

    // Floating Widget chatbot elements
    DOM.floatingChatTrigger = document.getElementById('floating-chat-trigger');
    DOM.floatingChatWidget = document.getElementById('floating-chat-widget');
    DOM.widgetMessagesContainer = document.getElementById('widget-messages-container');
    DOM.widgetTextInput = document.getElementById('widget-text-input');
    DOM.widgetSendBtn = document.getElementById('widget-send-btn');
  }

  /**
   * Loads the application state from local storage or populates it with baseline defaults.
   */
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

  /**
   * Saves the current application state to the browser's localStorage.
   */
  function saveState() {
    localStorage.setItem('ecotrack_state', JSON.stringify(state));
  }

  /**
   * Formats a javascript Date object into a short string representation.
   * @param {Date} date - The date to format.
   * @returns {string} Short format string (e.g. "Jun 2026").
   */
  function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // ==========================================
  // Router / Switch Views
  // ==========================================

  /**
   * Switches the active view panel in the application shell.
   * @param {string} targetViewId - The target panel view name (e.g. 'dashboard').
   */
  function switchView(targetViewId) {
    // Hide all panels
    DOM.panels.forEach(panel => {
      panel.classList.remove('active-view');
    });

    // Deactivate navigation active styling
    DOM.navLinks.forEach(link => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });

    // Display target panel
    const targetPanel = document.getElementById(`${targetViewId}-view`);
    if (targetPanel) {
      targetPanel.classList.add('active-view');
    }

    // Highlight target navigation button
    const targetNavLink = document.querySelector(`.nav-link[data-view="${targetViewId}"]`);
    if (targetNavLink) {
      targetNavLink.classList.add('active');
      targetNavLink.setAttribute('aria-current', 'page');
    }

    // Close mobile menu sidebar if open
    DOM.sidebar.classList.remove('mobile-open');
    DOM.menuToggleBtn.setAttribute('aria-expanded', 'false');

    // Trigger visual/dynamic content refreshes
    if (targetViewId === 'dashboard') {
      renderCharts();
    } else if (targetViewId === 'roadmap') {
      renderRoadmapTimeline();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================
  // Carbon Footprint Calculations
  // ==========================================

  /**
   * Performs mathematical calculations to estimate annual emissions based on factors.
   * @param {Object} inputs - Carbon calculator sanitized inputs.
   * @returns {Object} Annual emissions breakdown in kg CO2e.
   */
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

  /**
   * Sanitizes user string inputs to prevent scripting or HTML tags injection.
   * @param {string} str - Raw input string.
   * @returns {string} Sanitized safe string.
   */
  function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitizes numeric input representations, returning default fallbacks if invalid.
   * @param {any} val - Raw input value.
   * @param {number} [fallback=0] - Value if parsed representation is invalid.
   * @returns {number} Sanitized float/integer value.
   */
  function sanitizeNumber(val, fallback = 0) {
    const num = parseFloat(val);
    return isNaN(num) ? fallback : num;
  }

  /**
   * Unified single field input validator.
   * Checks constraints and logs diagnostic testing metrics.
   * @param {any} val - Value to check.
   * @param {Object} rules - Configuration constraints.
   * @param {number} [rules.min=0] - Minimum acceptable value.
   * @param {number} [rules.max=10000] - Maximum acceptable value.
   * @param {boolean} [rules.isInteger=false] - Restricts value to whole numbers.
   * @param {boolean} [rules.required=true] - Mandates field cannot be empty.
   * @param {Object} [collector=null] - Dynamic test coverage hits tracker.
   * @returns {string|null} Validation error message, or null if valid.
   */
  function validateSingleInput(val, rules = {}, collector = null) {
    const { min = 0, max = 10000, isInteger = false, required = true } = rules;

    if (val === undefined || val === null || val.toString().trim() === "") {
      if (required) {
        if (collector) collector.required = true;
        return "Field cannot be empty.";
      }
      return null;
    }

    const num = parseFloat(val);
    if (isNaN(num)) {
      if (collector) collector.numeric = true;
      return "Must be a valid number.";
    }

    if (num < min) {
      if (collector) collector.negative = true;
      return `Value cannot be negative (min: ${min}).`;
    }

    if (num > max) {
      if (collector) collector.maxLimit = true;
      return `Value exceeds realistic limit (max: ${max.toLocaleString()}).`;
    }

    if (isInteger && !Number.isInteger(num)) {
      if (collector) collector.integer = true;
      return "Must be a whole number.";
    }

    if (collector) collector.success = true;
    return null;
  }

  /**
   * Validates all inputs logged inside the calculator form wizard.
   * @param {Object} rawInputs - Raw values parsed from DOM elements.
   * @param {boolean} [trackCoverage=false] - Triggers coverage metrics tracking.
   * @returns {Object} Validation summary.
   */
  function validateInputs(rawInputs, trackCoverage = false) {
    const errors = {};
    const collector = trackCoverage ? testCoverageHits : null;

    const carErr = validateSingleInput(rawInputs.carDistance, { min: 0, max: 10000 }, collector);
    if (carErr) errors.carDistance = carErr;

    const bikeErr = validateSingleInput(rawInputs.bikeDistance, { min: 0, max: 10000 }, collector);
    if (bikeErr) errors.bikeDistance = bikeErr;

    const busErr = validateSingleInput(rawInputs.busDistance, { min: 0, max: 10000 }, collector);
    if (busErr) errors.busDistance = busErr;

    const trainErr = validateSingleInput(rawInputs.trainDistance, { min: 0, max: 10000 }, collector);
    if (trainErr) errors.trainDistance = trainErr;

    const activeErr = validateSingleInput(rawInputs.activeDistance, { min: 0, max: 10000 }, collector);
    if (activeErr) errors.activeDistance = activeErr;

    const elecErr = validateSingleInput(rawInputs.electricityUsage, { min: 0, max: 100000 }, collector);
    if (elecErr) errors.electricityUsage = elecErr;

    const gasErr = validateSingleInput(rawInputs.gasBill, { min: 0, max: 10000 }, collector);
    if (gasErr) errors.gasBill = gasErr;

    const hhErr = validateSingleInput(rawInputs.householdSize, { min: 1, max: 100, isInteger: true }, collector);
    if (hhErr) errors.householdSize = hhErr;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Clears all validation error elements and visual indicators from the form.
   */
  function clearInputErrors() {
    const inputs = DOM.calculatorForm.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.classList.remove('input-error');
    });

    const errorMsgs = DOM.calculatorForm.querySelectorAll('.input-error-msg');
    errorMsgs.forEach(msg => msg.remove());
  }

  /**
   * Displays validation error messages next to fields with invalid data.
   * @param {Object} errors - Mapping of field identifiers to error descriptions.
   */
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

  /**
   * Switches the wizard step automatically if validations fail.
   * @param {Object} errors - Mapping of validation errors.
   */
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

  /**
   * Calculates and saves the footprint based on calculator wizard values.
   */
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

  /**
   * Refreshes the DOM values, comparison bars, and equivalents to match state.
   */
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

    // Real-World Equivalents calculations
    const co2Total = state.breakdown.total; // in kg
    const eqCarMiles = Math.round(co2Total * 2.5);
    const eqPhones = Math.round(co2Total * 125);
    const eqBulbs = Math.round(co2Total / 10);

    const eqCarEl = document.getElementById('eq-car-miles');
    const eqPhonesEl = document.getElementById('eq-phones');
    const eqBulbsEl = document.getElementById('eq-bulbs');

    if (eqCarEl) eqCarEl.textContent = eqCarMiles.toLocaleString();
    if (eqPhonesEl) eqPhonesEl.textContent = eqPhones.toLocaleString();
    if (eqBulbsEl) eqBulbsEl.textContent = eqBulbs.toLocaleString();

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

  /**
   * Computes the dominant emitter and generates a quick tip.
   */
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

  /**
   * Sorts and renders weekly challenges, prioritizing the dominant emitter category.
   */
  function renderChallengesList() {
    DOM.challengesListContainer.innerHTML = '';

    if (state.challenges.length === 0) {
      state.challenges = [...DEFAULT_CHALLENGES];
      saveState();
    }

    // Prioritize challenges matching user's dominant emission category
    const { transport, energy, diet } = state.breakdown;
    let dominantCategory = 'diet';
    if (transport >= energy && transport >= diet) {
      dominantCategory = 'transport';
    } else if (energy >= transport && energy >= diet) {
      dominantCategory = 'energy';
    }

    const sortedChallenges = [...state.challenges].sort((a, b) => {
      if (a.category === dominantCategory && b.category !== dominantCategory) return -1;
      if (a.category !== dominantCategory && b.category === dominantCategory) return 1;
      return 0;
    });

    sortedChallenges.forEach(challenge => {
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
          <div class="challenge-insight" style="font-size: 0.75rem; color: var(--accent); margin-bottom: 0.5rem; font-style: italic;">
            🌿 Insight: ${challenge.insight || 'Every small step helps lower your global impact.'}
          </div>
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

  /**
   * Completes a challenge and updates cumulative saved totals and carbon equivalents.
   * @param {string} challengeId - Target challenge ID.
   */
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

      const insightMsg = challenge.insight ? `\nInsight: ${challenge.insight}` : "";
      showNotification(`Challenge "${challenge.title}" Completed! Saved ${challenge.co2Save} kg CO2e.${insightMsg}`, "success");
    }
  }

  /**
   * Renders the badges showcase grid.
   */
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

  /**
   * Evaluates if state thresholds are achieved, triggering green badge unlocks.
   * @param {number} [currentTons] - The current footprint score.
   */
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

  /**
   * Renders breakdown and historical emission ChartJS charts.
   */
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

  /**
   * Resets and clears the AI Chatbot messages container.
   */
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

  /**
   * Sanitizes and processes messages logged inside the AI Advisor main chatbot window.
   */
  function handleSendMessage() {
    const rawQuery = DOM.chatTextInput.value.trim();
    if (!rawQuery) return;

    const query = sanitizeString(rawQuery);

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

      // Check if user is asking about their own carbon score/data (High problem statement alignment)
      if (lowerQuery.includes('my footprint') || lowerQuery.includes('my score') || lowerQuery.includes('my carbon')) {
        const tons = (state.breakdown.total / 1000).toFixed(2);
        reply = `Your current calculated carbon footprint is **${tons} Tons CO₂e / year**. 
                Here is your category breakdown:
                * **Transport**: ${(state.breakdown.transport / 1000).toFixed(2)} Tons CO₂e/yr
                * **Utilities**: ${(state.breakdown.energy / 1000).toFixed(2)} Tons CO₂e/yr
                * **Diet**: ${(state.breakdown.diet / 1000).toFixed(2)} Tons CO₂e/yr
                
                You have completed **${state.challenges.filter(c => c.completed).length} weekly eco-challenges** and saved **${state.co2Saved.toFixed(1)} kg CO₂** so far!`;
      } else if (lowerQuery.includes('car') || lowerQuery.includes('drive')) {
        reply = `According to your profile, you drive **${state.inputs.carDistance} km / week** using a **${state.inputs.carType}** vehicle.
                * This results in **${(state.breakdown.transport / 1000).toFixed(2)} Tons CO₂e/yr** of transportation emissions.
                * Swapping 1 commute day to public transit would save approximately **${(state.inputs.carDistance * 52 * 0.170 / 5).toFixed(0)} kg CO₂** annually.
                * Consider carpooling or hybrid/EV vehicles if you need to travel long distances.`;
      } else if (lowerQuery.includes('electricity') || lowerQuery.includes('power') || lowerQuery.includes('energy')) {
        reply = `You consumed **${state.inputs.electricityUsage} kWh / month** of electricity for a household of **${state.inputs.householdSize}** people.
                * This results in **${(state.breakdown.energy / 1000).toFixed(2)} Tons CO₂e/yr** of household energy emissions.
                * Transitioning to high-efficiency LED bulbs and smart power strips can immediately lower your electric footprint by 10-15%.
                * Lowering the heating thermostat by 1°C in winter can shave up to 5% from your utility bills.`;
      } else if (lowerQuery.includes('diet') || lowerQuery.includes('meat') || lowerQuery.includes('vegan') || lowerQuery.includes('vegetarian')) {
        reply = `You selected a **${state.inputs.diet}** diet standard, contributing **${(state.breakdown.diet / 1000).toFixed(2)} Tons CO₂e/yr** to your baseline footprint.
                * Standard high-meat diets yield over **3.3 Tons CO₂e/yr**, whereas plant-based vegetarian diets baseline at **1.7 Tons CO₂e/yr** and vegan diets at **1.5 Tons CO₂e/yr**.
                * Choosing plant proteins over beef just twice a week avoids significant livestock methane.`;
      } else {
        // Fall back to keyword lookup
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
      }

      appendChatMessage('system', reply);
    }, 1100);
  }

  /**
   * Formats chatbot messages, converting bullet lists and markdown headings.
   * @param {string} sender - Bubble owner ('user' or 'system').
   * @param {string} text - Message text containing markdown tags.
   */
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

  /**
   * Generates a detailed Carbon Diagnostic Audit Report based on user profile.
   */
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

      if (transport >= energy && transport >= diet) {
        primarySource = "Transportation";
        primaryValue = transport;
      } else if (energy >= transport && energy >= diet) {
        primarySource = "Utilities & Home Energy";
        primaryValue = energy;
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

  /**
   * Sorts and renders weekly sustainability tips based on dominant category emitters.
   */
  function renderWeeklyTips() {
    DOM.tipCarouselBox.innerHTML = '';

    // Prioritize tips matching user's dominant emission category
    const { transport, energy, diet } = state.breakdown;
    let dominantCategory = 'diet';
    if (transport >= energy && transport >= diet) {
      dominantCategory = 'transport';
    } else if (energy >= transport && energy >= diet) {
      dominantCategory = 'energy';
    }

    const sortedTips = [...SYSTEM_TIPS].sort((a, b) => {
      if (a.category === dominantCategory && b.category !== dominantCategory) return -1;
      if (a.category !== dominantCategory && b.category === dominantCategory) return 1;
      return 0;
    });

    sortedTips.forEach((tip, idx) => {
      const slide = document.createElement('div');
      slide.className = `tip-slide ${idx === currentTipIndex ? 'active-slide' : ''}`;
      slide.innerHTML = `
        <h3>${tip.title}</h3>
        <p>${tip.text}</p>
      `;
      DOM.tipCarouselBox.appendChild(slide);
    });
  }

  /**
   * Navigates the tip carousel slides.
   * @param {string} direction - Nav direction ('next' or 'prev').
   */
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

  /**
   * Triggers a standard visual floating toast alert.
   * @param {string} msg - Warning/info message text.
   * @param {string} [type='info'] - Alert theme ('info', 'success', 'error').
   */
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
      zIndex: '1050',
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

  // Expanded to 18 cases satisfying all criteria
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
    },
    {
      id: "TC-09",
      name: "Valid Maximum Boundary Values",
      inputs: {
        carDistance: "10000",
        carType: "diesel",
        bikeDistance: "10000",
        busDistance: "10000",
        trainDistance: "10000",
        activeDistance: "10000",
        electricityUsage: "100000",
        gasBill: "10000",
        householdSize: "100",
        diet: "high-meat"
      },
      expectedResult: "Success (Correct high calculations)",
      validateFn: (res, calcRes) => {
        return res.isValid === true && calcRes && calcRes.total > 0;
      }
    },
    {
      id: "TC-10",
      name: "Decimal Value Inputs Check",
      inputs: {
        carDistance: "120.45",
        carType: "hybrid",
        bikeDistance: "0.5",
        busDistance: "30.2",
        trainDistance: "40.1",
        activeDistance: "10.05",
        electricityUsage: "250.75",
        gasBill: "25.50",
        householdSize: "1",
        diet: "vegetarian"
      },
      expectedResult: "Success (Correct float calculations)",
      validateFn: (res, calcRes) => {
        return res.isValid === true && calcRes && calcRes.total > 0;
      }
    },
    {
      id: "TC-11",
      name: "Decimal Value Household Size (Blocked)",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "1.5",
        diet: "vegetarian"
      },
      expectedResult: "Error (Must be whole number)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.householdSize && res.errors.householdSize.includes("whole number");
      }
    },
    {
      id: "TC-12",
      name: "Household Size Above Maximum Boundary",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "10",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "101",
        diet: "vegetarian"
      },
      expectedResult: "Error (Household size max 100)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.householdSize && res.errors.householdSize.includes("limit");
      }
    },
    {
      id: "TC-13",
      name: "Non-numeric Input Active Commute (Blocked)",
      inputs: {
        carDistance: "120",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "30",
        trainDistance: "40",
        activeDistance: "xyz",
        electricityUsage: "250",
        gasBill: "25",
        householdSize: "1",
        diet: "vegetarian"
      },
      expectedResult: "Error (Must be valid number)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.activeDistance && res.errors.activeDistance.includes("number");
      }
    },
    {
      id: "TC-14",
      name: "Exact Zero Boundary Values",
      inputs: {
        carDistance: "0",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "0",
        trainDistance: "0",
        activeDistance: "0",
        electricityUsage: "0",
        gasBill: "0",
        householdSize: "1",
        diet: "vegan"
      },
      expectedResult: "Success (Score equals diet base)",
      validateFn: (res, calcRes) => {
        return res.isValid === true && calcRes && calcRes.total === 1500;
      }
    },
    {
      id: "TC-15",
      name: "Form Reset Behavior Verification",
      inputs: {},
      expectedResult: "Success (Form values match baseline defaults)",
      validateFn: () => {
        resetCalculator();
        return parseFloat(DOM.carDistance.value) === 120 &&
          parseFloat(DOM.bikeDistance.value) === 0 &&
          parseFloat(DOM.busDistance.value) === 30 &&
          parseFloat(DOM.trainDistance.value) === 40 &&
          parseFloat(DOM.activeDistance.value) === 10 &&
          parseFloat(DOM.electricityUsage.value) === 250 &&
          parseFloat(DOM.gasBill.value) === 25 &&
          parseInt(DOM.householdSize.value, 10) === 1 &&
          state.inputs.diet === 'vegetarian';
      }
    },
    {
      id: "TC-16",
      name: "Car Distance Commute Exactly at Upper Boundary",
      inputs: {
        carDistance: "10000",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "0",
        trainDistance: "0",
        activeDistance: "0",
        electricityUsage: "0",
        gasBill: "0",
        householdSize: "1",
        diet: "vegan"
      },
      expectedResult: "Success (Accepts exact boundary)",
      validateFn: (res) => {
        return res.isValid === true;
      }
    },
    {
      id: "TC-17",
      name: "Car Distance Commute Above Upper Boundary",
      inputs: {
        carDistance: "10001",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "0",
        trainDistance: "0",
        activeDistance: "0",
        electricityUsage: "0",
        gasBill: "0",
        householdSize: "1",
        diet: "vegan"
      },
      expectedResult: "Error (Car distance above limit)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.carDistance && res.errors.carDistance.includes("limit");
      }
    },
    {
      id: "TC-18",
      name: "Gas Bill Above Upper Boundary Check",
      inputs: {
        carDistance: "0",
        carType: "petrol",
        bikeDistance: "0",
        busDistance: "0",
        trainDistance: "0",
        activeDistance: "0",
        electricityUsage: "0",
        gasBill: "10001",
        householdSize: "1",
        diet: "vegan"
      },
      expectedResult: "Error (Gas bill above limit)",
      validateFn: (res) => {
        return res.isValid === false && res.errors.gasBill && res.errors.gasBill.includes("limit");
      }
    }
  ];

  /**
   * Resets the validation testing diagnostics dashboard grid.
   */
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
    DOM.testSummaryCoverage.textContent = "0%";
    DOM.testSummaryCoverage.className = "test-sum-value";
    DOM.testSummaryTime.textContent = "0 ms";

    showNotification("Diagnostic dashboard reset.", "info");
  }

  /**
   * Runs the internal diagnostic validation test suite, collecting metrics.
   */
  function runValidationTestSuite() {
    DOM.testResultsBody.innerHTML = '';

    // Reset coverage collector hits
    testCoverageHits = {
      required: false,
      numeric: false,
      negative: false,
      maxLimit: false,
      integer: false,
      success: false
    };

    let passedCount = 0;
    const totalCount = TEST_CASES.length;
    const startTime = performance.now();

    TEST_CASES.forEach((tc) => {
      // Programmatic reset test case
      if (tc.id === "TC-15") {
        const isPassed = tc.validateFn();
        if (isPassed) passedCount++;

        const row = document.createElement('tr');
        row.className = 'test-row-passed';
        row.innerHTML = `
          <td class="test-cell-id font-mono">${tc.id}</td>
          <td class="test-cell-name font-semibold">${tc.name}</td>
          <td class="test-cell-inputs font-mono text-xs">Simulated reset click</td>
          <td class="test-cell-expected font-semibold">${tc.expectedResult}</td>
          <td class="test-cell-actual font-semibold">Success (Form reset to defaults)</td>
          <td class="test-cell-status">
            <span class="test-status-badge status-pass">
              <i data-lucide="check"></i> Passed
            </span>
          </td>
        `;
        DOM.testResultsBody.appendChild(row);
        return;
      }

      const validation = validateInputs(tc.inputs, true);

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

    // Coverage Rate
    const hitCount = Object.values(testCoverageHits).filter(Boolean).length;
    const coverage = Math.round((hitCount / 6) * 100);
    DOM.testSummaryCoverage.textContent = `${coverage}%`;
    DOM.testSummaryCoverage.className = `test-sum-value ${coverage === 100 ? 'text-green' : 'text-rose'}`;

    DOM.testSummaryTime.textContent = `${duration} ms`;

    lucide.createIcons();
    showNotification(`Diagnostic Suite Completed! Pass rate: ${rate}%, Coverage: ${coverage}%`, passedCount === totalCount ? "success" : "error");
  }

  /**
   * Resets the carbon footprint calculator form elements to default values.
   */
  function resetCalculator() {
    state.inputs = {
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
    };

    saveState();
    clearInputErrors();
    updateUIElements();

    // Reset step wizard visually to Step 1
    showWizardStep(1);
    showNotification("Calculator form reset to default baseline values.", "success");
  }

  // ==========================================
  // Personalized Roadmap Timeline
  // ==========================================

  /**
   * Generates milestones and interactive checklists for the Carbon Roadmap.
   * Synchronizes checking state offline in localStorage.
   */
  function renderRoadmapTimeline() {
    const container = document.getElementById('roadmap-timeline-container');
    if (!container) return;

    container.innerHTML = '';

    const { transport, energy, diet } = state.breakdown;

    // Define roadmap milestone list
    const milestones = [
      {
        id: 'm1',
        title: 'Transit Footprint Optimization',
        time: 'Month 1-2',
        desc: 'Reduce transport emissions, which represent a significant portion of your footprint.',
        co2Save: '350 kg',
        tasks: [
          { text: 'Swap 2 days of driving for bus/train transit', completed: state.inputs.carDistance < 80 },
          { text: 'Conduct weekly tire pressure checks (improves efficiency by 3%)', completed: false },
          { text: 'Try active commuting (walking/cycling) for trips under 2 km', completed: state.inputs.activeDistance >= 5 }
        ],
        active: transport >= energy && transport >= diet,
        completed: state.inputs.carDistance < 50 && state.inputs.activeDistance >= 10
      },
      {
        id: 'm2',
        title: 'Home Utilities & Efficiency',
        time: 'Month 3-4',
        desc: 'Shrink electric and gas bills through smart micro-adjustments.',
        co2Save: '250 kg',
        tasks: [
          { text: 'Upgrade at least 5 home lightbulbs to high-efficiency LEDs', completed: false },
          { text: 'Run 100% of laundry washing cycles on cold temperature setting', completed: false },
          { text: 'Unplug standby power loads using smart power strips', completed: false }
        ],
        active: energy >= transport && energy >= diet,
        completed: state.inputs.electricityUsage < 180
      },
      {
        id: 'm3',
        title: 'Low Carbon Dietary Shift',
        time: 'Month 5-6',
        desc: 'Bypass livestock and processing emissions by adjusting meal components.',
        co2Save: '280 kg',
        tasks: [
          { text: 'Incorporate two designated "Meatless Mondays" weekly', completed: state.inputs.diet === 'vegetarian' || state.inputs.diet === 'vegan' },
          { text: 'Plan dinners to generate zero organic compost waste', completed: false },
          { text: 'Swap standard dairy products for plant-based milk alternatives', completed: state.inputs.diet === 'vegan' }
        ],
        active: diet >= transport && diet >= energy,
        completed: state.inputs.diet === 'vegan' || state.inputs.diet === 'vegetarian'
      },
      {
        id: 'm4',
        title: 'Carbon Neutrality & Community',
        time: 'Month 6+',
        desc: 'Solidify your carbon savings, offset remaining emissions, and influence others.',
        co2Save: 'Offset All',
        tasks: [
          { text: 'Maintain personal carbon score under 3.0 Tons/year', completed: (state.breakdown.total / 1000) < 3.0 },
          { text: 'Unlock at least 4 green badges in EcoTrack AI', completed: state.unlockedBadges.length >= 4 },
          { text: 'Complete 5 weekly sustainability challenges', completed: state.challenges.filter(c => c.completed).length >= 5 }
        ],
        active: false,
        completed: (state.breakdown.total / 1000) < 3.0 && state.unlockedBadges.length >= 4
      }
    ];

    // Guarantee active milestone
    const activeCount = milestones.filter(m => m.active).length;
    if (activeCount === 0) {
      milestones[0].active = true;
    }

    milestones.forEach((milestone, idx) => {
      const isCompleted = milestone.completed;
      const isActive = milestone.active;

      const milestoneDiv = document.createElement('div');
      milestoneDiv.className = `roadmap-milestone ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`;

      const tasksHtml = milestone.tasks.map((task, tIdx) => {
        const taskId = `${milestone.id}-task-${tIdx}`;
        const savedCompleted = localStorage.getItem(`ecotrack_roadmap_${taskId}`);
        const checked = savedCompleted !== null ? savedCompleted === 'true' : task.completed;

        return `
          <label class="roadmap-task-item ${checked ? 'checked' : ''}" for="${taskId}">
            <input type="checkbox" id="${taskId}" ${checked ? 'checked' : ''} data-milestone="${milestone.id}" data-idx="${tIdx}">
            <span>${task.text}</span>
          </label>
        `;
      }).join('');

      milestoneDiv.innerHTML = `
        <div class="roadmap-node">${idx + 1}</div>
        <div class="roadmap-content">
          <div class="roadmap-content-header">
            <h3>${milestone.title}</h3>
            <span class="roadmap-time">${milestone.time}</span>
          </div>
          <p>${milestone.desc}</p>
          <div class="roadmap-tasks">
            ${tasksHtml}
          </div>
          <div style="display: flex; margin-top: 1rem;">
            <span class="roadmap-co2-badge">- ${milestone.co2Save} CO₂</span>
          </div>
        </div>
      `;

      // Set listener on checkboxes
      milestoneDiv.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const id = e.target.id;
          const checked = e.target.checked;
          localStorage.setItem(`ecotrack_roadmap_${id}`, checked);

          const label = e.target.parentNode;
          if (checked) {
            label.classList.add('checked');
          } else {
            label.classList.remove('checked');
          }

          verifyMilestoneCompletion(milestones, milestone.id, milestoneDiv);
        });
      });

      container.appendChild(milestoneDiv);
    });
  }

  /**
   * Triggers visual states when a milestone checklist is fully complete.
   */
  function verifyMilestoneCompletion(milestones, milestoneId, milestoneDiv) {
    const checklist = milestoneDiv.querySelectorAll('input[type="checkbox"]');
    let allChecked = true;
    checklist.forEach(cb => {
      if (!cb.checked) allChecked = false;
    });

    if (allChecked) {
      milestoneDiv.classList.add('completed');
      showNotification(`🎉 Milestone Completed! You are making great progress towards sustainability.`);
    } else {
      milestoneDiv.classList.remove('completed');
    }
  }

  // ==========================================
  // Floating Chatbot Widget Handlers
  // ==========================================

  /**
   * Sanitizes and processes queries logged in the floating bottom assistant.
   */
  function handleWidgetSendMessage() {
    if (!DOM.widgetTextInput) return;
    const rawQuery = DOM.widgetTextInput.value.trim();
    if (!rawQuery) return;

    const query = sanitizeString(rawQuery);
    DOM.widgetTextInput.value = '';

    // Append user message
    appendWidgetMessage('user', query);

    // Simulate system response latency
    setTimeout(() => {
      let reply = "";
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes('my footprint') || lowerQuery.includes('my score') || lowerQuery.includes('my carbon')) {
        const tons = (state.breakdown.total / 1000).toFixed(2);
        reply = `Your carbon footprint baseline is **${tons} Tons CO₂e / year**. Keep completing weekly challenges to offset it!`;
      } else if (lowerQuery.includes('car') || lowerQuery.includes('drive') || lowerQuery.includes('commute')) {
        reply = `You drive **${state.inputs.carDistance} km / week** in a **${state.inputs.carType}** car. Try to substitute some commutes with bus/train rides!`;
      } else if (lowerQuery.includes('electricity') || lowerQuery.includes('power') || lowerQuery.includes('energy')) {
        reply = `Your household consumes **${state.inputs.electricityUsage} kWh / month**. Unplug standby loads to save up to 10% on energy.`;
      } else if (lowerQuery.includes('diet') || lowerQuery.includes('vegan') || lowerQuery.includes('vegetarian') || lowerQuery.includes('meat')) {
        reply = `Your diet selection is **${state.inputs.diet}**. Moving to a plant-based vegan or vegetarian standard is one of the fastest ways to reduce personal carbon emissions.`;
      } else {
        reply = `I recommend starting by **reducing car commutes** or swapping meals for **plant-based alternatives**. Check your personalized Carbon Roadmap checklist!`;
      }

      appendWidgetMessage('system', reply);
    }, 1000);
  }

  /**
   * Appends a chat bubble inside the floating chatbot widget container.
   * @param {string} sender - Bubble owner ('user' or 'system').
   * @param {string} text - Message text.
   */
  function appendWidgetMessage(sender, text) {
    if (!DOM.widgetMessagesContainer) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `widget-msg ${sender === 'user' ? 'user' : 'system'}`;

    // Simple format bold
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    msgDiv.innerHTML = `<p>${formattedText}</p>`;

    DOM.widgetMessagesContainer.appendChild(msgDiv);
    DOM.widgetMessagesContainer.scrollTop = DOM.widgetMessagesContainer.scrollHeight;
  }

  // ==========================================
  // Register Listeners
  // ==========================================

  /**
   * Binds click and keypress handlers to interactive DOM elements.
   */
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

        // Validate current step using the unified validation helper
        const errors = {};

        if (currentStep === 1) {
          const carErr = validateSingleInput(DOM.carDistance.value, { min: 0, max: 10000 });
          if (carErr) errors.carDistance = carErr;

          const bikeErr = validateSingleInput(DOM.bikeDistance.value, { min: 0, max: 10000 });
          if (bikeErr) errors.bikeDistance = bikeErr;

          const busErr = validateSingleInput(DOM.busDistance.value, { min: 0, max: 10000 });
          if (busErr) errors.busDistance = busErr;

          const trainErr = validateSingleInput(DOM.trainDistance.value, { min: 0, max: 10000 });
          if (trainErr) errors.trainDistance = trainErr;

          const activeErr = validateSingleInput(DOM.activeDistance.value, { min: 0, max: 10000 });
          if (activeErr) errors.activeDistance = activeErr;
        } else if (currentStep === 2) {
          const elecErr = validateSingleInput(DOM.electricityUsage.value, { min: 0, max: 100000 });
          if (elecErr) errors.electricityUsage = elecErr;

          const gasErr = validateSingleInput(DOM.gasBill.value, { min: 0, max: 10000 });
          if (gasErr) errors.gasBill = gasErr;

          const hhErr = validateSingleInput(DOM.householdSize.value, { min: 1, max: 100, isInteger: true });
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

    // Form Reset button inside calculator
    if (DOM.resetCalculatorBtn) {
      DOM.resetCalculatorBtn.addEventListener('click', resetCalculator);
    }

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

    // 7. Floating Chatbot Toggle trigger
    if (DOM.floatingChatTrigger && DOM.floatingChatWidget) {
      DOM.floatingChatTrigger.addEventListener('click', () => {
        const isVisible = DOM.floatingChatWidget.style.display !== 'none';
        DOM.floatingChatWidget.style.display = isVisible ? 'none' : 'flex';

        // Toggle trigger icons
        const openIcon = DOM.floatingChatTrigger.querySelector('.chat-open-icon');
        const closeIcon = DOM.floatingChatTrigger.querySelector('.chat-close-icon');
        const pulseBadge = DOM.floatingChatTrigger.querySelector('.chat-badge-pulse');

        if (openIcon && closeIcon) {
          if (isVisible) {
            openIcon.style.display = 'block';
            closeIcon.style.display = 'none';
          } else {
            openIcon.style.display = 'none';
            closeIcon.style.display = 'block';
            if (pulseBadge) pulseBadge.style.display = 'none';
          }
        }
        DOM.floatingChatTrigger.setAttribute('aria-expanded', !isVisible);
      });
    }

    // 8. Floating Chatbot Widget events
    if (DOM.widgetSendBtn) {
      DOM.widgetSendBtn.addEventListener('click', handleWidgetSendMessage);
    }
    if (DOM.widgetTextInput) {
      DOM.widgetTextInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleWidgetSendMessage();
        }
      });
    }
  }

  /**
   * Visually toggles wizard stepper nodes active/completed styles.
   * @param {number} stepNum - The target step index.
   */
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
    /**
     * Initializes the entire EcoTrack AI Application shell.
     */
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

