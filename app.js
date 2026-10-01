
const STORAGE_KEY = 'hydraulic_tracker_data_v1';


const defaultClientData = {
    "Frontier": {
        dailyHours: 20,
        equipment: {
            "VE-01": {
                totalHoses: 163,
                phases: [
                    { 
                        id: 1, eqNo: "VE-01", phase: "1", arrival: "2026-03-04", departure: "2026-03-09", hoses: 64, 
                        m1Days: 90, m1Hrs: 1800, m1Fail: 2, 
                        m2Days: "", m2Hrs: "", m2Fail: 0, 
                        m3Days: "", m3Hrs: "", m3Fail: 0, 
                        m4Days: "", m4Hrs: "", m4Fail: 0
                    },
                    { 
                        id: 2, eqNo: "VE-01", phase: "2", arrival: "2026-04-19", departure: "2026-05-22", hoses: 99, 
                        m1Days: "", m1Hrs: "", m1Fail: 0,
                        m2Days: 120, m2Hrs: 2400, m2Fail: 4, 
                        m3Days: "", m3Hrs: "", m3Fail: 0, 
                        m4Days: "", m4Hrs: "", m4Fail: 0
                    }
                ],
                failures: [
                    { date: "2026-03-25", size: "1/2\"", prodDate: "2025-11-10", qty: 1, daysOp: 10, hoursOp: 200, voePn: "VOE-12345", hosePn: "4MXT-XTP", location: "Boom Lift Line", oal: "1200mm", hl: "1100mm", end1: "SF-08", end2: "SFS-08", warranty: "Valid", reportNo: "REP-001" }
                ]
            }
        }
    }
};

let clientData = {};
let currentClientKey = "";
let currentEquipmentKey = "";
let editingPhaseIndex = null;
let editingFailureIndex = null;
let customPromptCallback = null;


document.addEventListener("DOMContentLoaded", () => {
    loadAppDataLocally();
});

function loadAppDataLocally() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            clientData = JSON.parse(saved);
        } else {
            clientData = defaultClientData;
            saveDataLocally();
        }
    } catch (err) {
        console.error("Error loading local data, using default:", err);
        clientData = defaultClientData;
    }

    validateKeys();
    initClientAndEquipmentSelectors();
    renderDashboard();
}

function validateKeys() {
    const clientKeys = Object.keys(clientData);
    if (clientKeys.length === 0) {
        clientData = defaultClientData;
    }
    if (!clientData[currentClientKey]) {
        currentClientKey = Object.keys(clientData)[0];
    }
    const clientObj = clientData[currentClientKey];
    if (!clientObj.equipment[currentEquipmentKey]) {
        currentEquipmentKey = Object.keys(clientObj.equipment)[0] || "";
    }
}

function saveDataLocally() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clientData));
    } catch (err) {
        console.error("Failed to save to localStorage:", err);
    }
}


function showCustomPrompt(title, message, defaultValue = "", callback) {
    const modal = document.getElementById("customPromptModal");
    const titleEl = document.getElementById("promptModalTitle");
    const msgEl = document.getElementById("promptModalMessage");
    const inputEl = document.getElementById("promptModalInput");
    const submitBtn = document.getElementById("promptModalSubmitBtn");

    if (!modal) {
        const val = prompt(message, defaultValue);
        if (val !== null) callback(val);
        return;
    }

    titleEl.innerText = title;
    msgEl.innerText = message;
    inputEl.value = defaultValue;
    modal.classList.remove("hidden");
    inputEl.focus();
    inputEl.select();

    customPromptCallback = callback;

    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            submitCustomPrompt();
        }
    };

    submitBtn.onclick = submitCustomPrompt;
}

function closeCustomPrompt() {
    document.getElementById("customPromptModal")?.classList.add("hidden");
    customPromptCallback = null;
}

function submitCustomPrompt() {
    const inputEl = document.getElementById("promptModalInput");
    const val = inputEl.value.trim();
    const cb = customPromptCallback;
    closeCustomPrompt();
    if (cb && val) cb(val);
}

function initClientAndEquipmentSelectors() {
    const clientSelect = document.getElementById("clientSelect");
    const equipmentSelect = document.getElementById("equipmentSelect");
    if (!clientSelect || !equipmentSelect) return;

    clientSelect.innerHTML = "";
    Object.keys(clientData).forEach(client => {
        const opt = document.createElement("option");
        opt.value = client;
        opt.innerText = client;
        if (client === currentClientKey) opt.selected = true;
        clientSelect.appendChild(opt);
    });

    const clientObj = clientData[currentClientKey];
    equipmentSelect.innerHTML = "";
    if (clientObj && clientObj.equipment) {
        Object.keys(clientObj.equipment).forEach(eq => {
            const opt = document.createElement("option");
            opt.value = eq;
            opt.innerText = eq;
            if (eq === currentEquipmentKey) opt.selected = true;
            equipmentSelect.appendChild(opt);
        });
        document.getElementById("globalDailyHours").value = clientObj.dailyHours || 20;
    }
}

function switchClient(clientName) {
    currentClientKey = clientName;
    const clientObj = clientData[currentClientKey];
    currentEquipmentKey = clientObj && clientObj.equipment ? Object.keys(clientObj.equipment)[0] || "" : "";
    initClientAndEquipmentSelectors();
    renderDashboard();
}

function switchEquipment(eqName) {
    currentEquipmentKey = eqName;
    renderDashboard();
}

function updateDailyHours(val) {
    const clientObj = clientData[currentClientKey];
    if (!clientObj) return;
    clientObj.dailyHours = parseInt(val) || 20;
    saveDataLocally();
    renderDashboard();
}

function renderDashboard() {
    const clientObj = clientData[currentClientKey];
    if (!clientObj || !currentEquipmentKey || !clientObj.equipment[currentEquipmentKey]) return;

    const data = clientObj.equipment[currentEquipmentKey];

    document.getElementById("currentClientBadge").innerText = `Client: ${currentClientKey}`;
    document.getElementById("currentEquipmentTitle").innerText = currentEquipmentKey;
    document.getElementById("totalHosesDisplay").innerText = data.totalHoses;

    let totalPhaseFailures = 0;
    data.phases.forEach(p => {
        totalPhaseFailures += Number(p.m1Fail || 0) + Number(p.m2Fail || 0) + Number(p.m3Fail || 0) + Number(p.m4Fail || 0);
    });

    const totalHosesInstalled = data.phases.reduce((acc, p) => acc + Number(p.hoses || 0), 0);
    const cumulativeFailurePct = totalHosesInstalled > 0 ? ((totalPhaseFailures / totalHosesInstalled) * 100).toFixed(2) : "0.00";
    const performancePct = totalHosesInstalled > 0 ? (((totalHosesInstalled - totalPhaseFailures) / totalHosesInstalled) * 100).toFixed(2) : "100.00";

    document.getElementById("statFailures").innerText = totalPhaseFailures;
    document.getElementById("statCumulativeFailurePct").innerText = `${cumulativeFailurePct}%`;
    document.getElementById("statPerformance").innerText = `${performancePct}%`;

    renderPhaseTable(data.phases, totalHosesInstalled);
    renderFailureTable(data.failures);
}

function renderPhaseTable(phases, totalHosesInstalled) {
    const tbody = document.getElementById("phaseTableBody");
    const tfoot = document.getElementById("phaseTableFoot");
    if (!tbody || !tfoot) return;
    
    tbody.innerHTML = "";
    tfoot.innerHTML = "";

    if (phases.length === 0) {
        tbody.innerHTML = `<tr><td colspan="19" class="p-6 text-center text-slate-500">No phase records found. Click 'Add Phase Entry' to begin.</td></tr>`;
        tfoot.innerHTML = `<tr><td colspan="19" class="p-4 text-center text-slate-500">No cumulative data.</td></tr>`;
        return;
    }

    let sumHosesInstalled = 0;
    let sumM1Fail = 0, sumM2Fail = 0, sumM3Fail = 0, sumM4Fail = 0;

    phases.forEach((p, idx) => {
        const hoses = Number(p.hoses) || 0;
        sumHosesInstalled += hoses;

        const m1F = Number(p.m1Fail) || 0;
        const m2F = Number(p.m2Fail) || 0;
        const m3F = Number(p.m3Fail) || 0;
        const m4F = Number(p.m4Fail) || 0;

        sumM1Fail += m1F;
        sumM2Fail += m2F;
        sumM3Fail += m3F;
        sumM4Fail += m4F;

        const phaseTotalFailures = m1F + m2F + m3F + m4F;

        const row = document.createElement("tr");
        row.className = "hover:bg-slate-900/40 transition-colors border-b border-slate-800/80";
        row.innerHTML = `
            <td class="p-3 border-r border-slate-800 font-bold">${idx + 1}</td>
            <td class="p-3 border-r border-slate-800 text-slate-200 font-medium">${p.eqNo}</td>
            <td class="p-3 border-r border-slate-800 text-indigo-400 font-semibold">${p.phase}</td>
            <td class="p-3 border-r border-slate-800 text-slate-300">${p.arrival}</td>
            <td class="p-3 border-r border-slate-800 text-slate-300">${p.departure}</td>
            <td class="p-3 border-r border-slate-800 font-bold text-white">${hoses}</td>
            <td class="p-3 border-r border-slate-800 bg-emerald-950/10">${p.m1Days !== "" ? p.m1Days : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-emerald-950/10">${p.m1Hrs !== "" ? p.m1Hrs : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-emerald-950/10 font-bold text-rose-400">${m1F !== 0 ? m1F : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-blue-950/10">${p.m2Days !== "" ? p.m2Days : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-blue-950/10">${p.m2Hrs !== "" ? p.m2Hrs : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-blue-950/10 font-bold text-rose-400">${m2F !== 0 ? m2F : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-purple-950/10">${p.m3Days !== "" ? p.m3Days : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-purple-950/10">${p.m3Hrs !== "" ? p.m3Hrs : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-purple-950/10 font-bold text-rose-400">${m3F !== 0 ? m3F : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-amber-950/10">${p.m4Days !== "" ? p.m4Days : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-amber-950/10">${p.m4Hrs !== "" ? p.m4Hrs : ""}</td>
            <td class="p-3 border-r border-slate-800 bg-amber-950/10 font-bold text-rose-400">${m4F !== 0 ? m4F : ""}</td>
            <td class="p-3 border-r border-slate-800 font-extrabold text-rose-400 bg-slate-900">${phaseTotalFailures}</td>
            <td class="p-3 space-x-2">
                <button onclick="editPhase(${idx})" class="text-indigo-400 hover:text-indigo-300 p-1" title="Edit Phase & Milestones"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deletePhase(${idx})" class="text-slate-500 hover:text-rose-400 p-1" title="Delete Phase"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });

    const m1FailureRate = totalHosesInstalled > 0 ? ((sumM1Fail / totalHosesInstalled) * 100).toFixed(2) : "0.00";
    const m2FailureRate = totalHosesInstalled > 0 ? ((sumM2Fail / totalHosesInstalled) * 100).toFixed(2) : "0.00";
    const m3FailureRate = totalHosesInstalled > 0 ? ((sumM3Fail / totalHosesInstalled) * 100).toFixed(2) : "0.00";
    const m4FailureRate = totalHosesInstalled > 0 ? ((sumM4Fail / totalHosesInstalled) * 100).toFixed(2) : "0.00";
    const totalFailuresSum = sumM1Fail + sumM2Fail + sumM3Fail + sumM4Fail;
    const overallFailureRate = totalHosesInstalled > 0 ? ((totalFailuresSum / totalHosesInstalled) * 100).toFixed(2) : "0.00";

    tfoot.innerHTML = `
        <tr class="border-b border-slate-800">
            <td colspan="5" class="p-3 text-right text-slate-300 uppercase font-semibold">Totals:</td>
            <td class="p-3 text-white font-bold">${sumHosesInstalled}</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-rose-400 font-bold">${sumM1Fail}</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-rose-400 font-bold">${sumM2Fail}</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-rose-400 font-bold">${sumM3Fail}</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-rose-400 font-bold">${sumM4Fail}</td>
            <td class="p-3 text-rose-400 font-extrabold text-sm">${totalFailuresSum}</td>
            <td></td>
        </tr>
        <tr class="bg-slate-900/60 font-semibold">
            <td colspan="5" class="p-3 text-right text-indigo-300 uppercase">Milestone Failure Rate (%):</td>
            <td class="p-3 text-slate-400">-</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-indigo-400 font-bold">${m1FailureRate}%</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-indigo-400 font-bold">${m2FailureRate}%</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-indigo-400 font-bold">${m3FailureRate}%</td>
            <td colspan="2" class="p-3 text-slate-400"></td>
            <td class="p-3 text-indigo-400 font-bold">${m4FailureRate}%</td>
            <td class="p-3 text-indigo-300 font-extrabold">${overallFailureRate}%</td>
            <td></td>
        </tr>
    `;
}

function renderFailureTable(failures) {
    const tbody = document.getElementById("failureTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (failures.length === 0) {
        tbody.innerHTML = `<tr><td colspan="16" class="p-6 text-center text-slate-500">No failure events logged for this equipment. Click 'Log Failure Event' to add one.</td></tr>`;
        return;
    }

    failures.forEach((f, idx) => {
        const row = document.createElement("tr");
        row.className = "hover:bg-slate-900/40 transition-colors border-b border-slate-800/80";
        row.innerHTML = `
            <td class="p-3 text-slate-300">${f.date}</td>
            <td class="p-3 text-slate-200 font-medium">${f.size}</td>
            <td class="p-3 text-slate-400">${f.prodDate}</td>
            <td class="p-3 font-bold text-white">${f.qty}</td>
            <td class="p-3 text-indigo-300 font-mono">${f.daysOp || 0}</td>
            <td class="p-3 text-purple-300 font-mono">${f.hoursOp || 0}</td>
            <td class="p-3 text-slate-300 font-mono">${f.voePn}</td>
            <td class="p-3 text-slate-200 font-mono">${f.hosePn}</td>
            <td class="p-3 text-slate-300">${f.location}</td>
            <td class="p-3 text-slate-400">${f.oal}</td>
            <td class="p-3 text-slate-400">${f.hl}</td>
            <td class="p-3 text-slate-300">${f.end1}</td>
            <td class="p-3 text-slate-300">${f.end2}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${f.warranty}</span></td>
            <td class="p-3 font-mono text-indigo-400">${f.reportNo}</td>
            <td class="p-3 text-right space-x-2">
                <button onclick="editFailure(${idx})" class="text-indigo-400 hover:text-indigo-300 p-1" title="Edit Failure Record"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteFailure(${idx})" class="text-slate-500 hover:text-rose-400 p-1" title="Delete Failure"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openNewClientModal() {
    showCustomPrompt("Add New Client", "Enter Client Name (e.g., Frontier, Dangote Cement):", "", (clientName) => {
        if (clientData[clientName]) {
            alert("Client already exists!");
            return;
        }

        showCustomPrompt("Add Initial Equipment", `Enter first Equipment/Machinery Name for ${clientName}:`, "Komatsu HD785", (firstEq) => {
            showCustomPrompt("Design Capacity", `Enter total design hoses for ${firstEq}:`, "120", (totalH) => {
                clientData[clientName] = {
                    dailyHours: 20,
                    equipment: {
                        [firstEq]: { totalHoses: parseInt(totalH) || 100, phases: [], failures: [] }
                    }
                };

                currentClientKey = clientName;
                currentEquipmentKey = firstEq;
                saveDataLocally();
                initClientAndEquipmentSelectors();
                renderDashboard();
            });
        });
    });
}

function openEditClientModal() {
    const input = document.getElementById("editClientInput");
    if (input) input.value = currentClientKey;
    document.getElementById("editClientModal")?.classList.remove("hidden");
    if (input) { input.focus(); input.select(); }
}

function closeEditClientModal() {
    document.getElementById("editClientModal")?.classList.add("hidden");
}

function confirmEditClient() {
    const input = document.getElementById("editClientInput");
    if (!input) return;
    const newName = input.value.trim();
    if (!newName || newName === currentClientKey) { closeEditClientModal(); return; }
    if (clientData[newName]) { alert("A client with this name already exists!"); return; }

    clientData[newName] = clientData[currentClientKey];
    delete clientData[currentClientKey];
    currentClientKey = newName;

    saveDataLocally();
    initClientAndEquipmentSelectors();
    renderDashboard();
    closeEditClientModal();
}

function deleteCurrentClient() {
    if (Object.keys(clientData).length <= 1) { alert("You cannot delete the last remaining client."); return; }
    if (!confirm(`Are you sure you want to delete client '${currentClientKey}'?`)) return;

    delete clientData[currentClientKey];
    currentClientKey = Object.keys(clientData)[0];
    currentEquipmentKey = Object.keys(clientData[currentClientKey].equipment)[0] || "";

    saveDataLocally();
    initClientAndEquipmentSelectors();
    renderDashboard();
}

function openNewEquipmentModal() {
    const clientObj = clientData[currentClientKey];
    showCustomPrompt("Add Equipment", `Enter Equipment Name for client '${currentClientKey}':`, "", (eqName) => {
        if (clientObj.equipment[eqName]) { alert("Equipment already exists!"); return; }

        showCustomPrompt("Design Capacity", `Enter total design hoses for ${eqName}:`, "120", (totalH) => {
            clientObj.equipment[eqName] = { totalHoses: parseInt(totalH) || 100, phases: [], failures: [] };
            currentEquipmentKey = eqName;

            saveDataLocally();
            initClientAndEquipmentSelectors();
            renderDashboard();
        });
    });
}

function openEditEquipmentModal() {
    const input = document.getElementById("editEquipmentInput");
    if (input) input.value = currentEquipmentKey;
    document.getElementById("editEquipmentModal")?.classList.remove("hidden");
    if (input) { input.focus(); input.select(); }
}

function closeEditEquipmentModal() {
    document.getElementById("editEquipmentModal")?.classList.add("hidden");
}

function confirmEditEquipment() {
    const input = document.getElementById("editEquipmentInput");
    if (!input) return;
    const newName = input.value.trim();
    if (!newName || newName === currentEquipmentKey) { closeEditEquipmentModal(); return; }

    const clientObj = clientData[currentClientKey];
    if (clientObj.equipment[newName]) { alert("Equipment already exists!"); return; }

    clientObj.equipment[newName] = clientObj.equipment[currentEquipmentKey];
    delete clientObj.equipment[currentEquipmentKey];
    clientObj.equipment[newName].phases.forEach(p => p.eqNo = newName);
    currentEquipmentKey = newName;

    saveDataLocally();
    initClientAndEquipmentSelectors();
    renderDashboard();
    closeEditEquipmentModal();
}

function openAddPhaseModal() {
    const data = clientData[currentClientKey].equipment[currentEquipmentKey];
    
    showCustomPrompt("Add Phase Entry", "Enter Phase Number:", `${data.phases.length + 1}`, (phaseName) => {
        showCustomPrompt("Arrival Date", "Enter Arrival Date (YYYY-MM-DD):", "2026-04-19", (arrival) => {
            showCustomPrompt("Departure Date", "Enter Departure Date (YYYY-MM-DD):", "2026-05-22", (departure) => {
                showCustomPrompt("Hoses Replaced", "Enter Number of Hoses Replaced:", "99", (hosesCount) => {
                    data.phases.push({
                        id: data.phases.length + 1,
                        eqNo: currentEquipmentKey,
                        phase: phaseName,
                        arrival, departure,
                        hoses: parseInt(hosesCount) || 0,
                        m1Days: "", m1Hrs: "", m1Fail: 0,
                        m2Days: "", m2Hrs: "", m2Fail: 0,
                        m3Days: "", m3Hrs: "", m3Fail: 0,
                        m4Days: "", m4Hrs: "", m4Fail: 0
                    });

                    saveDataLocally();
                    renderDashboard();
                });
            });
        });
    });
}

function editPhase(index) {
    editingPhaseIndex = index;
    const p = clientData[currentClientKey].equipment[currentEquipmentKey].phases[index];

    document.getElementById("editPhaseNo").value = p.phase;
    document.getElementById("editPhaseHoses").value = p.hoses;
    document.getElementById("editPhaseArrival").value = p.arrival;
    document.getElementById("editPhaseDeparture").value = p.departure;

    document.getElementById("editM1Days").value = p.m1Days;
    document.getElementById("editM1Fail").value = p.m1Fail;
    document.getElementById("editM2Days").value = p.m2Days;
    document.getElementById("editM2Fail").value = p.m2Fail;
    document.getElementById("editM3Days").value = p.m3Days;
    document.getElementById("editM3Fail").value = p.m3Fail;
    document.getElementById("editM4Days").value = p.m4Days;
    document.getElementById("editM4Fail").value = p.m4Fail;

    document.getElementById("editPhaseModal").classList.remove("hidden");
}

function closeEditPhaseModal() {
    document.getElementById("editPhaseModal").classList.add("hidden");
    editingPhaseIndex = null;
}

function confirmEditPhase() {
    if (editingPhaseIndex === null) return;
    const clientObj = clientData[currentClientKey];
    const p = clientObj.equipment[currentEquipmentKey].phases[editingPhaseIndex];
    const dailyRate = clientObj.dailyHours || 20;

    p.phase = document.getElementById("editPhaseNo").value.trim() || p.phase;
    p.hoses = parseInt(document.getElementById("editPhaseHoses").value) || 0;
    p.arrival = document.getElementById("editPhaseArrival").value;
    p.departure = document.getElementById("editPhaseDeparture").value;

    ['m1', 'm2', 'm3', 'm4'].forEach(m => {
        const dVal = document.getElementById(`edit${m.toUpperCase()}Days`).value;
        p[`${m}Days`] = dVal !== "" ? parseInt(dVal) || 0 : "";
        p[`${m}Hrs`] = p[`${m}Days`] !== "" ? p[`${m}Days`] * dailyRate : "";
        p[`${m}Fail`] = parseInt(document.getElementById(`edit${m.toUpperCase()}Fail`).value) || 0;
    });

    saveDataLocally();
    renderDashboard();
    closeEditPhaseModal();
}

function deletePhase(index) {
    clientData[currentClientKey].equipment[currentEquipmentKey].phases.splice(index, 1);
    saveDataLocally();
    renderDashboard();
}

function openAddFailureModal() {
    const data = clientData[currentClientKey].equipment[currentEquipmentKey];
    showCustomPrompt("Log Failure Event", "Enter Failure Report No:", "REP-004", (reportNo) => {
        data.failures.push({
            date: new Date().toISOString().split('T')[0],
            size: "1/2\"", prodDate: "2025-08-01", qty: 1, daysOp: 30, hoursOp: 600,
            voePn: "VOE-99999", hosePn: "4MXT-XTP", location: "Main Line",
            oal: "1100mm", hl: "1000mm", end1: "SF-08", end2: "SFS-08",
            warranty: "Valid", reportNo
        });

        saveDataLocally();
        renderDashboard();
    });
}

function editFailure(index) {
    editingFailureIndex = index;
    const f = clientData[currentClientKey].equipment[currentEquipmentKey].failures[index];

    document.getElementById("editFailReportNo").value = f.reportNo;
    document.getElementById("editFailDate").value = f.date;
    document.getElementById("editFailSize").value = f.size;
    document.getElementById("editFailProdDate").value = f.prodDate;
    document.getElementById("editFailQty").value = f.qty;
    document.getElementById("editFailDaysOp").value = f.daysOp;
    document.getElementById("editFailVoePn").value = f.voePn;
    document.getElementById("editFailHosePn").value = f.hosePn;
    document.getElementById("editFailLocation").value = f.location;
    document.getElementById("editFailOal").value = f.oal;
    document.getElementById("editFailHl").value = f.hl;
    document.getElementById("editFailEnd1").value = f.end1;
    document.getElementById("editFailEnd2").value = f.end2;
    document.getElementById("editFailWarranty").value = f.warranty;

    document.getElementById("editFailureModal").classList.remove("hidden");
}

function closeEditFailureModal() {
    document.getElementById("editFailureModal").classList.add("hidden");
    editingFailureIndex = null;
}

function confirmEditFailure() {
    if (editingFailureIndex === null) return;
    const clientObj = clientData[currentClientKey];
    const f = clientObj.equipment[currentEquipmentKey].failures[editingFailureIndex];
    const dailyRate = clientObj.dailyHours || 20;

    f.reportNo = document.getElementById("editFailReportNo").value;
    f.date = document.getElementById("editFailDate").value;
    f.size = document.getElementById("editFailSize").value;
    f.prodDate = document.getElementById("editFailProdDate").value;
    f.qty = parseInt(document.getElementById("editFailQty").value) || 1;
    const days = parseInt(document.getElementById("editFailDaysOp").value) || 0;
    f.daysOp = days;
    f.hoursOp = days * dailyRate;

    f.voePn = document.getElementById("editFailVoePn").value;
    f.hosePn = document.getElementById("editFailHosePn").value;
    f.location = document.getElementById("editFailLocation").value;
    f.oal = document.getElementById("editFailOal").value;
    f.hl = document.getElementById("editFailHl").value;
    f.end1 = document.getElementById("editFailEnd1").value;
    f.end2 = document.getElementById("editFailEnd2").value;
    f.warranty = document.getElementById("editFailWarranty").value;

    saveDataLocally();
    renderDashboard();
    closeEditFailureModal();
}

function deleteFailure(index) {
    clientData[currentClientKey].equipment[currentEquipmentKey].failures.splice(index, 1);
    saveDataLocally();
    renderDashboard();
}
