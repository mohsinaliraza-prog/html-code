/**
 * Aegis Health - Hospital Frontend Application & Diagnostics Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Diagnostic Engine
  const engine = new DiagnosticEngine(MEDICAL_DATABASE);

  // State
  const state = {
    selectedRegion: 'chest',
    selectedSymptoms: new Set(['chest_pain', 'shortness_of_breath']),
    severity: 5,
    duration: 'days',
    ageGroup: 'adult',
    sex: 'female',
    comorbidities: new Set(),
    activeTab: 'interactive',
    currentEvaluation: null
  };

  // DOM Elements
  const regionSelectorGrid = document.getElementById('region-selector-grid');
  const regionSymptomsList = document.getElementById('region-symptoms-list');
  const trayChipsContainer = document.getElementById('tray-chips-container');
  const severitySlider = document.getElementById('severity-slider');
  const severityDisplay = document.getElementById('severity-display');
  const selectAge = document.getElementById('select-age');
  const selectSex = document.getElementById('select-sex');
  const selectDuration = document.getElementById('select-duration');
  const comorbidityInputs = document.querySelectorAll('input[name="comorbidity"]');
  
  // Output Elements
  const emergencyAlertBox = document.getElementById('emergency-alert-box');
  const emergencyAlertTitle = document.getElementById('emergency-alert-title');
  const emergencyAlertDesc = document.getElementById('emergency-alert-desc');
  const triageTierCard = document.getElementById('triage-tier-card');
  const triageStatusBadge = document.getElementById('triage-status-badge');
  const triageWaitEstimate = document.getElementById('triage-wait-estimate');
  const triageRecommendationTitle = document.getElementById('triage-recommendation-title');
  const triageRecommendationText = document.getElementById('triage-recommendation-text');
  const differentialMatchesList = document.getElementById('differential-matches-list');
  
  // Specialist elements
  const recomDocAvatar = document.getElementById('recom-doc-avatar');
  const recomDocName = document.getElementById('recom-doc-name');
  const recomDocSpecialty = document.getElementById('recom-doc-specialty');
  const btnRecomBook = document.getElementById('btn-recom-book');
  
  // Hero & Search elements
  const quickSymptomInput = document.getElementById('quick-symptom-input');
  const quickTagCloud = document.getElementById('quick-tag-cloud');
  const btnResetDiagnostics = document.getElementById('btn-reset-diagnostics');
  const btnPrintReport = document.getElementById('btn-print-report');
  
  // Doctor directory grid
  const doctorsGridContainer = document.getElementById('doctors-grid-container');

  // Modals
  const appointmentModal = document.getElementById('appointment-modal');
  const modalCloseBooking = document.getElementById('modal-close-booking');
  const btnCancelBooking = document.getElementById('btn-cancel-booking');
  const bookingForm = document.getElementById('booking-form');
  const modalSelectDept = document.getElementById('modal-select-dept');
  const modalSelectDoc = document.getElementById('modal-select-doc');
  const patientSymptomNote = document.getElementById('patient-symptom-note');
  const bookingSuccessBox = document.getElementById('booking-success-box');
  const bookingConfirmationDetails = document.getElementById('booking-confirmation-details');
  const btnCloseSuccess = document.getElementById('btn-close-success');
  const btnQuickBook = document.getElementById('btn-quick-book');

  // Report Modal
  const reportModal = document.getElementById('report-modal');
  const modalCloseReport = document.getElementById('modal-close-report');
  const btnModalCloseReportFooter = document.getElementById('btn-modal-close-report-footer');
  const printableReportContent = document.getElementById('printable-report-content');

  // Tabs
  const tabInteractive = document.getElementById('tab-interactive');
  const tabEmergencyGuidelines = document.getElementById('tab-emergency-guidelines');

  /**
   * Render Symptoms list for current selected region
   */
  function renderRegionSymptoms() {
    if (!regionSymptomsList) return;
    regionSymptomsList.innerHTML = '';

    const currentRegionObj = MEDICAL_DATABASE.bodyRegions.find(r => r.id === state.selectedRegion);
    if (!currentRegionObj) return;

    currentRegionObj.commonSymptoms.forEach(symKey => {
      const symObj = MEDICAL_DATABASE.symptoms[symKey];
      if (!symObj) return;

      const isSelected = state.selectedSymptoms.has(symKey);
      const isEmergency = symObj.isEmergency;

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `symptom-toggle-chip ${isSelected ? 'selected' : ''} ${isEmergency ? 'emergency' : ''}`;
      chip.innerHTML = `
        ${isEmergency ? '<span style="color:#ef4444; font-weight:800;">!</span>' : ''}
        ${symObj.name}
        <span style="font-size:0.75rem; opacity:0.8;">${isSelected ? '&#10003;' : '+'}</span>
      `;

      chip.addEventListener('click', () => {
        toggleSymptom(symKey);
      });

      regionSymptomsList.appendChild(chip);
    });
  }

  /**
   * Toggle symptom in state
   */
  function toggleSymptom(symKey) {
    if (state.selectedSymptoms.has(symKey)) {
      state.selectedSymptoms.delete(symKey);
    } else {
      state.selectedSymptoms.add(symKey);
    }
    renderRegionSymptoms();
    renderTrayChips();
    runClinicalEvaluation();
  }

  /**
   * Render Selected Symptoms Tray
   */
  function renderTrayChips() {
    if (!trayChipsContainer) return;
    trayChipsContainer.innerHTML = '';

    if (state.selectedSymptoms.size === 0) {
      trayChipsContainer.innerHTML = `<span style="font-size:0.82rem; color:#94a3b8; font-style:italic;">No symptoms selected. Click options above to assess.</span>`;
      return;
    }

    state.selectedSymptoms.forEach(symKey => {
      const symObj = MEDICAL_DATABASE.symptoms[symKey];
      const name = symObj ? symObj.name : symKey;

      const chip = document.createElement('span');
      chip.className = 'tray-chip';
      chip.innerHTML = `
        ${name}
        <span class="tray-remove" title="Remove">&times;</span>
      `;

      chip.querySelector('.tray-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSymptom(symKey);
      });

      trayChipsContainer.appendChild(chip);
    });
  }

  /**
   * Run Real-Time Clinical Analysis
   */
  function runClinicalEvaluation() {
    const patientData = {
      ageGroup: state.ageGroup,
      sex: state.sex,
      symptoms: Array.from(state.selectedSymptoms),
      severity: state.severity,
      duration: state.duration,
      conditions: Array.from(state.comorbidities)
    };

    const evaluation = engine.evaluate(patientData);
    state.currentEvaluation = evaluation;

    // 1. Emergency Red-Flag Banner
    if (evaluation.isEmergency && evaluation.emergencyProtocols.length > 0) {
      const primaryProtocol = evaluation.emergencyProtocols[0];
      emergencyAlertTitle.textContent = primaryProtocol.name || 'CRITICAL EMERGENCY ALERT';
      emergencyAlertDesc.textContent = `${primaryProtocol.guidance} -> Action: ${primaryProtocol.action}`;
      emergencyAlertBox.style.display = 'block';
    } else if (state.severity >= 9) {
      emergencyAlertTitle.textContent = 'HIGH SEVERITY PAIN PROTOCOL (9-10/10)';
      emergencyAlertDesc.textContent = 'Reported discomfort is severe/incapacitating. Rapid in-person emergency triage is strongly recommended.';
      emergencyAlertBox.style.display = 'block';
    } else {
      emergencyAlertBox.style.display = 'none';
    }

    // 2. Triage Tier Card
    const triage = evaluation.triageTier;
    triageStatusBadge.textContent = triage.title;
    triageStatusBadge.className = `triage-status-badge ${triage.badgeClass}`;
    triageWaitEstimate.textContent = triage.waitEstimate;

    if (evaluation.primaryImpression) {
      triageRecommendationTitle.textContent = `Triage Recommendation: ${triage.title}`;
      triageRecommendationText.textContent = triage.recommendation;
    } else {
      triageRecommendationTitle.textContent = 'Awaiting Clinical Symptoms';
      triageRecommendationText.textContent = 'Please choose active symptoms from the anatomical selector on the left to compute real-time triage.';
    }

    // 3. Differential Matches List
    if (!differentialMatchesList) return;
    differentialMatchesList.innerHTML = '';

    if (evaluation.differentialMatches.length === 0) {
      differentialMatchesList.innerHTML = `
        <p style="font-size:0.85rem; color:#94a3b8; font-style:italic; padding:10px 0;">
          No matching diagnostic profiles found for selected criteria. Add or search symptoms to compute probability.
        </p>
      `;
    } else {
      evaluation.differentialMatches.forEach(item => {
        const matchEl = document.createElement('div');
        matchEl.className = 'match-item';
        matchEl.innerHTML = `
          <div class="match-head">
            <span class="match-name">${item.name}</span>
            <span class="match-pct" style="color:${item.color}">${item.confidencePercentage}% Match</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${item.confidencePercentage}%; background:${item.color};"></div>
          </div>
          <p class="match-desc">${item.description}</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="match-dept-pill">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"></path></svg>
              ${item.department}
            </span>
            <span style="font-size:0.75rem; font-weight:700; color:${item.color}; text-transform:uppercase;">${item.urgencyLabel}</span>
          </div>
        `;
        differentialMatchesList.appendChild(matchEl);
      });
    }

    // 4. Update Recommended Specialist Card
    const doc = evaluation.recommendedDoctors[0] || MEDICAL_DATABASE.doctors[0];
    if (doc) {
      recomDocName.textContent = doc.name;
      recomDocSpecialty.textContent = `${doc.title} &bull; ${doc.department}`;
      recomDocAvatar.textContent = doc.name.split(' ')[1]?.substring(0, 2) || 'MD';
      recomDocAvatar.style.background = doc.avatarColor || '#0284c7';
      btnRecomBook.onclick = () => openBookingModal(doc.department, doc.name);
    }
  }

  /**
   * Render Doctors Directory
   */
  function renderDoctorsDirectory() {
    if (!doctorsGridContainer) return;
    doctorsGridContainer.innerHTML = '';

    MEDICAL_DATABASE.doctors.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'doc-card';
      const initials = doc.name.replace('Dr. ', '').split(' ').slice(0, 2).map(n => n[0]).join('');

      card.innerHTML = `
        <div class="doc-card-body">
          <div class="doc-header">
            <div class="doc-avatar-large" style="background:${doc.avatarColor};">${initials}</div>
            <div>
              <h3 style="font-size:1.1rem; line-height:1.2;">${doc.name}</h3>
              <p style="font-size:0.85rem; color:#0284c7; font-weight:600; margin-top:2px;">${doc.title}</p>
              <div class="doc-rating-chip">&#9733; ${doc.rating} (${doc.reviewsCount} reviews)</div>
            </div>
          </div>
          <div class="doc-meta">
            <div><strong>Department:</strong> ${doc.department}</div>
            <div><strong>Credentials:</strong> ${doc.education}</div>
            <div><strong>Experience:</strong> ${doc.experience}</div>
          </div>
          <div class="doc-slot-badge">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Next Opening: ${doc.nextSlot}
          </div>
        </div>
        <div class="doc-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="viewDoctorProfile('${doc.id}')">Credentials</button>
          <button class="btn btn-primary btn-sm" onclick="openBookingModal('${doc.department}', '${doc.name}')">Book Appointment</button>
        </div>
      `;
      doctorsGridContainer.appendChild(card);
    });
  }

  /**
   * Populate Doctors Dropdown in Booking Modal
   */
  function populateModalDoctors(selectedDept) {
    if (!modalSelectDoc) return;
    modalSelectDoc.innerHTML = '';

    const filteredDocs = MEDICAL_DATABASE.doctors.filter(d => d.department === selectedDept);
    const docsToUse = filteredDocs.length > 0 ? filteredDocs : MEDICAL_DATABASE.doctors;

    docsToUse.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.name;
      opt.textContent = `${doc.name} (${doc.title.split('&')[0]})`;
      modalSelectDoc.appendChild(opt);
    });
  }

  /**
   * Open Booking Modal with Context
   */
  window.openBookingModal = function(department, doctorName) {
    if (department && modalSelectDept) {
      modalSelectDept.value = department;
    }
    populateModalDoctors(modalSelectDept.value);
    if (doctorName && modalSelectDoc) {
      modalSelectDoc.value = doctorName;
    }

    // Auto-fill active symptoms note
    if (patientSymptomNote) {
      const symptomsList = Array.from(state.selectedSymptoms)
        .map(s => MEDICAL_DATABASE.symptoms[s]?.name || s)
        .join(', ');
      patientSymptomNote.value = symptomsList ? `Home Diagnosis Triage: Patient reported [${symptomsList}] with Severity ${state.severity}/10.` : '';
    }

    // Default to tomorrow's date
    const bookingDateInput = document.getElementById('booking-date');
    if (bookingDateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      bookingDateInput.value = tomorrow.toISOString().split('T')[0];
    }

    bookingForm.style.display = 'block';
    bookingSuccessBox.style.display = 'none';
    appointmentModal.classList.add('active');
  };

  /**
   * Close Booking Modal
   */
  function closeBookingModal() {
    appointmentModal.classList.remove('active');
  }

  /**
   * Open Report Modal
   */
  function openReportModal() {
    if (!state.currentEvaluation) return;
    const evalData = state.currentEvaluation;
    const symptomsStr = evalData.patientSummary.selectedSymptoms.join(', ') || 'None reported';
    const comorbiditiesStr = evalData.patientSummary.comorbidities.join(', ') || 'None reported';

    let diffHtml = '';
    evalData.differentialMatches.forEach((m, idx) => {
      diffHtml += `
        <li style="margin-bottom:8px;">
          <strong>#${idx + 1} ${m.name} (${m.confidencePercentage}% Match)</strong> - ${m.urgencyLabel}
          <div style="font-size:0.85rem; color:#475569;">${m.recommendedAction}</div>
        </li>
      `;
    });

    printableReportContent.innerHTML = `
      <div style="border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <h2 style="font-size:1.4rem; color:#0f172a;">AEGIS HEALTH ACADEMIC MEDICAL CENTER</h2>
          <div style="font-size:0.85rem; color:#475569;">Clinical Triage & Differential Assessment Summary</div>
        </div>
        <div style="text-align:right; font-size:0.8rem; color:#64748b;">
          <div>Generated: ${new Date().toLocaleString()}</div>
          <div>Report ID: #AGY-${Math.floor(100000 + Math.random() * 900000)}</div>
        </div>
      </div>

      <div style="background:#f8fafc; padding:12px 16px; border-radius:8px; margin-bottom:16px;">
        <h4 style="font-size:0.9rem; margin-bottom:6px; color:#0f172a;">Patient Parameters</h4>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); font-size:0.85rem; gap:8px;">
          <div><strong>Age Bracket:</strong> ${state.ageGroup.toUpperCase()}</div>
          <div><strong>Biological Sex:</strong> ${state.sex.toUpperCase()}</div>
          <div><strong>Reported Severity:</strong> ${state.severity} / 10</div>
          <div><strong>Duration:</strong> ${state.duration}</div>
          <div style="grid-column: span 2;"><strong>Comorbidities:</strong> ${comorbiditiesStr}</div>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:0.9rem; margin-bottom:6px; color:#0f172a;">Presenting Chief Symptoms</h4>
        <div style="font-size:0.88rem; padding:8px 12px; background:#eff6ff; border-left:4px solid #0284c7; border-radius:4px;">
          ${symptomsStr}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:0.9rem; margin-bottom:6px; color:#0f172a;">Calculated Triage Stratification</h4>
        <div style="padding:10px 14px; border-radius:6px; background:${evalData.isEmergency ? '#fee2e2' : '#f0fdf4'}; border:1px solid ${evalData.isEmergency ? '#f87171' : '#86efac'};">
          <strong style="color:${evalData.isEmergency ? '#b91c1c' : '#166534'};">${evalData.triageTier.title}</strong>
          <p style="font-size:0.85rem; margin-top:4px;">${evalData.triageTier.recommendation}</p>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:0.9rem; margin-bottom:6px; color:#0f172a;">Algorithmic Differential Diagnostic Probabilities</h4>
        <ol style="padding-left:20px; font-size:0.88rem;">
          ${diffHtml || '<li>No specific differential reached.</li>'}
        </ol>
      </div>

      <div style="font-size:0.75rem; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:10px; margin-top:20px;">
        <em>Notice for Medical Personnel: This report was prepared by the patient using Aegis Health Home Triage decision-support software. It does not replace a clinical examination, labs, or diagnostic imaging.</em>
      </div>
    `;

    reportModal.classList.add('active');
  }

  window.viewDoctorProfile = function(docId) {
    const doc = MEDICAL_DATABASE.doctors.find(d => d.id === docId);
    if (!doc) return;
    alert(`${doc.name}\n\nTitle: ${doc.title}\nDepartment: ${doc.department}\nEducation: ${doc.education}\nExperience: ${doc.experience}\nPatient Rating: ${doc.rating}/5.0\nNext Opening: ${doc.nextSlot}`);
  };

  window.openDirections = function(address) {
    alert(`GPS Route initiated to Aegis Health Facility:\n${address}\n\nLive navigation sent to mobile.`);
  };

  // Event Listeners for Region Buttons
  if (regionSelectorGrid) {
    const regionButtons = regionSelectorGrid.querySelectorAll('.region-btn');
    regionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        regionButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedRegion = btn.dataset.region;
        renderRegionSymptoms();
      });
    });
  }

  // Severity Slider
  if (severitySlider) {
    severitySlider.addEventListener('input', (e) => {
      state.severity = parseInt(e.target.value, 10);
      let descriptor = 'Mild';
      if (state.severity >= 4 && state.severity <= 6) descriptor = 'Moderate';
      else if (state.severity >= 7 && state.severity <= 8) descriptor = 'Severe';
      else if (state.severity >= 9) descriptor = 'Critical / Emergency';

      severityDisplay.textContent = `${state.severity} / 10 (${descriptor})`;
      severityDisplay.style.color = state.severity >= 8 ? '#dc2626' : (state.severity >= 5 ? '#0284c7' : '#059669');
      runClinicalEvaluation();
    });
  }

  // Age & Sex Selectors
  if (selectAge) {
    selectAge.addEventListener('change', (e) => {
      state.ageGroup = e.target.value;
      runClinicalEvaluation();
    });
  }

  if (selectSex) {
    selectSex.addEventListener('change', (e) => {
      state.sex = e.target.value;
      runClinicalEvaluation();
    });
  }

  if (selectDuration) {
    selectDuration.addEventListener('change', (e) => {
      state.duration = e.target.value;
      runClinicalEvaluation();
    });
  }

  // Comorbidities
  comorbidityInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.comorbidities.add(e.target.value);
      } else {
        state.comorbidities.delete(e.target.value);
      }
      runClinicalEvaluation();
    });
  });

  // Hero Quick Tag Chips
  if (quickTagCloud) {
    quickTagCloud.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sym = chip.dataset.symptom;
        if (sym) {
          state.selectedSymptoms.add(sym);
          // Auto switch to that region
          const cat = MEDICAL_DATABASE.symptoms[sym]?.category;
          if (cat) {
            state.selectedRegion = cat;
            const regionBtns = regionSelectorGrid.querySelectorAll('.region-btn');
            regionBtns.forEach(b => b.classList.toggle('active', b.dataset.region === cat));
          }
          renderRegionSymptoms();
          renderTrayChips();
          runClinicalEvaluation();
          // Scroll down to diagnostics engine
          document.getElementById('diagnostics-engine')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Quick Hero Search Bar (Auto-complete / search)
  if (quickSymptomInput) {
    quickSymptomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = quickSymptomInput.value.toLowerCase().trim();
        if (!query) return;

        // Find matching symptom
        const matchedKey = Object.keys(MEDICAL_DATABASE.symptoms).find(k => {
          return k.toLowerCase().includes(query) || MEDICAL_DATABASE.symptoms[k].name.toLowerCase().includes(query);
        });

        if (matchedKey) {
          state.selectedSymptoms.add(matchedKey);
          const cat = MEDICAL_DATABASE.symptoms[matchedKey]?.category;
          if (cat) {
            state.selectedRegion = cat;
            const regionBtns = regionSelectorGrid.querySelectorAll('.region-btn');
            regionBtns.forEach(b => b.classList.toggle('active', b.dataset.region === cat));
          }
          renderRegionSymptoms();
          renderTrayChips();
          runClinicalEvaluation();
          document.getElementById('diagnostics-engine')?.scrollIntoView({ behavior: 'smooth' });
          quickSymptomInput.value = '';
        } else {
          alert(`No exact match found for "${query}". Please select from the anatomical categories in our Clinical Diagnostic Studio below.`);
          document.getElementById('diagnostics-engine')?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  // Reset Button
  if (btnResetDiagnostics) {
    btnResetDiagnostics.addEventListener('click', () => {
      state.selectedSymptoms.clear();
      state.severity = 5;
      if (severitySlider) severitySlider.value = 5;
      if (severityDisplay) severityDisplay.textContent = '5 / 10 (Moderate)';
      renderRegionSymptoms();
      renderTrayChips();
      runClinicalEvaluation();
    });
  }

  // Report Modal triggers
  if (btnPrintReport) btnPrintReport.addEventListener('click', openReportModal);
  if (modalCloseReport) modalCloseReport.addEventListener('click', () => reportModal.classList.remove('active'));
  if (btnModalCloseReportFooter) btnModalCloseReportFooter.addEventListener('click', () => reportModal.classList.remove('active'));

  // Booking Modal triggers
  if (modalCloseBooking) modalCloseBooking.addEventListener('click', closeBookingModal);
  if (btnCancelBooking) btnCancelBooking.addEventListener('click', closeBookingModal);
  if (btnQuickBook) btnQuickBook.addEventListener('click', () => openBookingModal('Cardiology & Heart Institute', 'Dr. Evelyn Reed, MD, FACC'));

  if (modalSelectDept) {
    modalSelectDept.addEventListener('change', (e) => {
      populateModalDoctors(e.target.value);
    });
  }

  // Booking Form Submission
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const patientName = document.getElementById('patient-name')?.value || 'Patient';
      const patientPhone = document.getElementById('patient-phone')?.value || '';
      const doctor = modalSelectDoc?.value || 'Specialist';
      const date = document.getElementById('booking-date')?.value || 'Tomorrow';
      const time = document.getElementById('booking-time')?.value || '02:30 PM';

      bookingForm.style.display = 'none';
      bookingSuccessBox.style.display = 'block';
      bookingConfirmationDetails.innerHTML = `
        <strong>Patient:</strong> ${patientName}<br>
        <strong>Consultation with:</strong> ${doctor}<br>
        <strong>Date & Time:</strong> ${date} at ${time}<br>
        <strong>Confirmation Code:</strong> #AGY-${Math.floor(100000 + Math.random() * 900000)}<br>
        <span style="display:inline-block; margin-top:8px; font-size:0.85rem; color:#0369a1;">A confirmation SMS has been sent to ${patientPhone}.</span>
      `;
    });
  }

  if (btnCloseSuccess) {
    btnCloseSuccess.addEventListener('click', closeBookingModal);
  }

  // Emergency Guidelines tab switch
  if (tabEmergencyGuidelines && tabInteractive) {
    tabEmergencyGuidelines.addEventListener('click', () => {
      tabEmergencyGuidelines.classList.add('active');
      tabInteractive.classList.remove('active');
      alert("Emergency Red-Flag Criteria:\n\n1. Crushing chest pressure with arm/jaw radiation (Heart Attack)\n2. Sudden facial droop, arm weakness, or slurred speech (FAST Stroke)\n3. Throat swelling or acute respiratory stridor (Anaphylaxis)\n4. Stiff neck with sudden high fever and confusion (Meningitis)\n5. Sudden worst headache of life ('Thunderclap')\n\nIf any of these are present, bypass online scheduling and dial 911 immediately.");
    });

    tabInteractive.addEventListener('click', () => {
      tabInteractive.classList.add('active');
      tabEmergencyGuidelines.classList.remove('active');
    });
  }

  // Live Wait Time Fluctuation simulation (every 15s)
  setInterval(() => {
    const erWait = document.getElementById('er-wait-time');
    const locMain = document.getElementById('loc-wait-main');
    if (erWait && locMain) {
      const waitMins = Math.floor(10 + Math.random() * 6);
      erWait.textContent = `${waitMins} mins`;
      locMain.textContent = `${waitMins} mins`;
    }
  }, 15000);

  // Initial Boot
  renderRegionSymptoms();
  renderTrayChips();
  renderDoctorsDirectory();
  runClinicalEvaluation();
});
