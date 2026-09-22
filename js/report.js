/**
 * CardioAI — Clinical PDF Medical Report Exporter
 * Formats risk evaluation, patient parameters, SHAP factors, and recommendations for print/export.
 */

window.ReportEngine = (function () {
  'use strict';

  function downloadPDFReport(assessment, patientData) {
    // Simply invoke native browser print dialog, which renders formatted print stylesheet
    window.print();
  }

  function renderReportModal(assessment, patientData) {
    const reportHtml = `
      <div style="padding: 20px; font-family: 'DM Sans', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0b1e3d; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h2 style="color: #0b1e3d; margin: 0; font-family: 'DM Serif Display', serif;">CardioAI Clinical Risk Assessment</h2>
            <span style="font-size: 0.85rem; color: #64748b;">Generated: ${new Date().toLocaleDateString()} ${assessment.timestamp}</span>
          </div>
          <div style="text-align: right;">
            <span style="font-weight: 700; color: #c0001a; font-size: 1.2rem;">Model: ${assessment.algorithmUsed}</span>
            <div style="font-size: 0.8rem; color: #64748b;">Confidence: ${assessment.confidence}%</div>
          </div>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; color: #0b1e3d;">Patient Summary</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 0.9rem;">
            <div><strong>Age:</strong> ${patientData.age} years</div>
            <div><strong>Gender:</strong> ${patientData.gender.toUpperCase()}</div>
            <div><strong>Systolic BP:</strong> ${patientData.bp} mmHg</div>
            <div><strong>Cholesterol:</strong> ${patientData.chol} mg/dL</div>
            <div><strong>Max Heart Rate:</strong> ${patientData.hr} bpm</div>
            <div><strong>Fasting Sugar:</strong> ${patientData.sugar} mg/dL</div>
            <div><strong>Diabetes:</strong> ${patientData.diabetes.toUpperCase()}</div>
            <div><strong>Smoking:</strong> ${patientData.smoking.toUpperCase()}</div>
            <div><strong>Exercise Angina:</strong> ${patientData.exang.toUpperCase()}</div>
          </div>
        </div>

        <div style="margin-bottom: 20px; text-align: center; background: ${assessment.riskPercentage > 65 ? '#fee2e2' : (assessment.riskPercentage > 35 ? '#fef3c7' : '#dcfce7')}; padding: 20px; border-radius: 12px;">
          <div style="font-size: 2.5rem; font-weight: 800; color: #0b1e3d;">${assessment.riskPercentage}%</div>
          <div style="font-size: 1.2rem; font-weight: 700; text-transform: uppercase;">${assessment.category}</div>
          <p style="margin-bottom: 0; font-size: 0.9rem; color: #475569;">${assessment.subtitle}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="color: #0b1e3d;">Key Risk Contributors (SHAP Explainability)</h4>
          <ul style="padding-left: 20px;">
            ${assessment.shapFactors.map(f => `<li><strong>${f.label}:</strong> Contribution +${f.val}%</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    return reportHtml;
  }

  return {
    downloadPDFReport,
    renderReportModal
  };
})();
