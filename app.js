document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_PREFIX = 'yksStudentData_';
    let currentUser = null;
    let studentData = null; 

    const screenLogin = document.getElementById('screen-login');
    const screenWelcome = document.getElementById('screen-welcome');
    const screenProgram = document.getElementById('screen-program');
    const screenWeekly = document.getElementById('screen-weekly');
    const screenProgress = document.getElementById('screen-progress');
    const screenHistory = document.getElementById('screen-history');
    
    const bottomNav = document.getElementById('bottom-nav');
    const headerUserInfo = document.getElementById('header-user-info');
    const headerName = document.getElementById('header-name');
    const btnReset = document.getElementById('btn-reset');
    
    const btnEndDay = document.getElementById('btn-end-day');
    const btnAdvance = document.getElementById('btn-advance-task');

    // Forms
    const loginForm = document.getElementById('login-form');
    const onboardingForm = document.getElementById('onboarding-form');
    const step1 = document.getElementById('wizard-step-1');
    const step2 = document.getElementById('wizard-step-2');
    const step3 = document.getElementById('wizard-step-3');
    const ind1 = document.getElementById('step-1-indicator');
    const ind2 = document.getElementById('step-2-indicator');
    const ind3 = document.getElementById('step-3-indicator');

    // --- LOGIN LOGIC ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser = document.getElementById('login-username').value.trim();
        if (!currentUser) return;
        
        let data = localStorage.getItem(STORAGE_PREFIX + currentUser);
        if (data) {
            studentData = JSON.parse(data);
            if(!studentData.taskQueue) studentData.taskQueue = [];
            if(!studentData.topicProgress) studentData.topicProgress = {};
            
            headerUserInfo.classList.remove('hidden');
            headerName.textContent = studentData.name;
            bottomNav.classList.remove('hidden');
            
            processDailyShift(); 
            showTab('screen-program');
        } else {
            document.getElementById('student-name').value = currentUser;
            showScreen(screenWelcome);
        }
    });

    // --- NAVIGATION LOGIC ---
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showTab(btn.dataset.target);
        });
    });

    function showTab(tabId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const tabEl = document.getElementById(tabId);
        if(tabEl) tabEl.classList.remove('hidden');
        
        if(tabId === 'screen-program') renderToday();
        if(tabId === 'screen-weekly') renderWeeklyTab();
        if(tabId === 'screen-progress') renderProgressTab();
        if(tabId === 'screen-history') renderHistoryTab();
    }

    function showScreen(screenEl) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        screenEl.classList.remove('hidden');
        bottomNav.classList.add('hidden');
    }

    function saveData() {
        if(currentUser && studentData) {
            localStorage.setItem(STORAGE_PREFIX + currentUser, JSON.stringify(studentData));
        }
    }

    // --- WIZARD EVENTS ---
    document.getElementById('btn-next-1').addEventListener('click', () => {
        if(!document.getElementById('student-name').value || !document.getElementById('student-track').value) {
            alert('Lütfen tüm alanları doldurun.'); return;
        }
        step1.classList.add('hidden'); step2.classList.remove('hidden');
        ind1.classList.remove('active'); ind2.classList.add('active');
    });

    document.getElementById('btn-prev-2').addEventListener('click', () => {
        step2.classList.add('hidden'); step1.classList.remove('hidden');
        ind2.classList.remove('active'); ind1.classList.add('active');
    });

    document.getElementById('schedule-type').addEventListener('change', (e) => {
        const hourlyEls = document.querySelectorAll('.hourly-setting');
        const flexibleEls = document.querySelectorAll('.flexible-setting');
        if(e.target.value === 'flexible') {
            hourlyEls.forEach(el => el.classList.add('hidden'));
            flexibleEls.forEach(el => el.classList.remove('hidden'));
        } else {
            hourlyEls.forEach(el => el.classList.remove('hidden'));
            flexibleEls.forEach(el => el.classList.add('hidden'));
        }
    });

    document.getElementById('split-day').addEventListener('change', (e) => {
        const eveningGroup = document.getElementById('evening-start-group');
        if(e.target.value === 'yes') {
            eveningGroup.classList.remove('hidden');
        } else {
            eveningGroup.classList.add('hidden');
        }
    });

    document.getElementById('btn-next-2').addEventListener('click', () => {
        step2.classList.add('hidden'); step3.classList.remove('hidden');
        ind2.classList.remove('active'); ind3.classList.add('active');
        const track = document.getElementById('student-track').value;
        buildTopicAccordion(track, 'topic-selection-container', true);
        buildBranchExams(track);
    });

    document.getElementById('btn-prev-3').addEventListener('click', () => {
        step3.classList.add('hidden'); step2.classList.remove('hidden');
        ind3.classList.remove('active'); ind2.classList.add('active');
    });

    onboardingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const schedType = document.getElementById('schedule-type').value;
        const capacity = schedType === 'flexible' 
            ? parseInt(document.getElementById('capacity-subjects').value) 
            : parseInt(document.getElementById('capacity-hours').value);

        const settings = {
            track: document.getElementById('student-track').value,
            scheduleType: schedType,
            capacity: capacity,
            startTime: document.getElementById('start-time').value,
            splitDay: document.getElementById('split-day').value === 'yes',
            eveningStartTime: document.getElementById('evening-start-time').value,
            blockDur: parseInt(document.getElementById('block-duration').value),
            breakDur: parseInt(document.getElementById('break-duration').value),
            paraGoal: parseInt(document.getElementById('daily-paragraf').value) || 0,
            probGoal: parseInt(document.getElementById('daily-problem').value) || 0,
            paraDur: parseInt(document.getElementById('para-duration').value) || 30,
            probDur: parseInt(document.getElementById('prob-duration').value) || 30,
            routineTime: document.getElementById('routine-time').value,
            exams: {
                general: {
                    tyt: { freq: document.getElementById('exam-tyt-freq').value, day: parseInt(document.getElementById('exam-tyt-day').value) },
                    ayt: { freq: document.getElementById('exam-ayt-freq').value, day: parseInt(document.getElementById('exam-ayt-day').value) },
                    ydt: { freq: document.getElementById('exam-ydt-freq').value, day: parseInt(document.getElementById('exam-ydt-day').value) }
                },
                branches: []
            }
        };

        const gen = settings.exams.general;
        let overlapWarning = '';
        if (gen.tyt.freq !== 'none' && gen.ayt.freq !== 'none' && gen.tyt.day === gen.ayt.day) {
            overlapWarning = "TYT ve AYT genel denemelerini aynı güne seçtiniz.\nBu durum bazı haftalarda iki ağır denemenin aynı güne (üst üste) denk gelmesine yol açacaktır.\n\nYine de bu şekilde devam etmek istiyor musunuz?";
        } else if (gen.tyt.freq !== 'none' && gen.ydt.freq !== 'none' && gen.tyt.day === gen.ydt.day) {
            overlapWarning = "TYT ve YDT genel denemelerini aynı güne seçtiniz.\nBu durum bazı haftalarda iki denemenin aynı güne (üst üste) denk gelmesine yol açacaktır.\n\nYine de bu şekilde devam etmek istiyor musunuz?";
        }

        if (overlapWarning !== '') {
            if (!confirm(overlapWarning)) {
                return; // Kullanıcı iptal etti
            }
        }

        document.querySelectorAll('.branch-freq-select').forEach(sel => {
            if (sel.value !== 'none') {
                const branchName = sel.getAttribute('data-branch');
                const safeId = branchName.replace(/[\s\W]+/g, '-').toLowerCase();
                const durInput = document.getElementById(`branch-dur-${safeId}`);
                let dur = parseInt(durInput.value) || 0; // 0 means use default block duration
                settings.exams.branches.push({ name: branchName, freq: parseInt(sel.value), dur: dur });
            }
        });

        const customPool = extractSelectedTopics('topic-selection-container');
        let isUpdate = studentData && studentData.name;
        let newProgressIdx = isUpdate ? studentData.progressIdx : {};
        
        for(let cat in customPool) {
            if(!newProgressIdx[cat]) newProgressIdx[cat] = {};
            for(let sub in customPool[cat]) {
                if(newProgressIdx[cat][sub] === undefined) {
                    newProgressIdx[cat][sub] = 0;
                }
            }
        }

        function isTaskInPool(taskText, pool) {
            if(taskText.includes('Paragraf') || taskText.includes('Problem') || taskText.includes('Tekrar Testi')) return true;
            let cleanText = taskText.replace(' (Soru Çözümü)', '');
            const parts = cleanText.split(': ');
            if(parts.length !== 2) return true;
            const sub = parts[0];
            const topic = parts[1];
            
            for(let cat in pool) {
                if(pool[cat][sub] && pool[cat][sub].includes(topic)) {
                    return true;
                }
            }
            return false;
        }

        let updatedTodayTasks = isUpdate ? studentData.todayTasks.filter(t => isTaskInPool(t.text, customPool)) : [];
        let updatedTaskQueue = isUpdate ? studentData.taskQueue.filter(t => isTaskInPool(t.text, customPool)) : [];

        studentData = {
            name: document.getElementById('student-name').value,
            track: settings.track,
            settings: settings,
            customPool: customPool,
            progressIdx: newProgressIdx,
            todayTasks: updatedTodayTasks,
            taskQueue: updatedTaskQueue,
            history: isUpdate ? studentData.history : [],
            completedTopics: isUpdate ? studentData.completedTopics : {}, 
            spacedRepetitionDone: isUpdate ? studentData.spacedRepetitionDone : {},
            topicProgress: isUpdate ? (studentData.topicProgress || {}) : {},
            lastLoginDate: isUpdate ? studentData.lastLoginDate : ''
        };
        
        saveData();
        
        headerUserInfo.classList.remove('hidden');
        headerName.textContent = studentData.name;
        bottomNav.classList.remove('hidden');
        
        processDailyShift(); 
        
        if(isUpdate && studentData.todayTasks.length > 0) {
            assignTimes(studentData.todayTasks, studentData.settings);
            saveData();
        }
        
        showTab('screen-program');
        if(isUpdate) renderToday();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        if(confirm('Mevcut oturumu kapatmak istediğinize emin misiniz?')) {
            studentData = null;
            currentUser = null;
            headerUserInfo.classList.add('hidden');
            bottomNav.classList.add('hidden');
            document.getElementById('login-username').value = '';
            showScreen(document.getElementById('screen-login'));
        }
    });

    document.getElementById('btn-sync-progress').addEventListener('click', () => {
        if(!studentData) return;
        
        let completed = Object.keys(studentData.completedTopics);
        
        studentData.todayTasks = studentData.todayTasks.filter(t => {
            let cleanText = t.text.replace(' (Soru Çözümü)', '');
            return !completed.includes(cleanText);
        });
        
        studentData.taskQueue = studentData.taskQueue.filter(t => {
            let cleanText = t.text.replace(' (Soru Çözümü)', '');
            return !completed.includes(cleanText);
        });
        
        ensureTaskQueue();
        
        let s = studentData.settings;
        let capacity = s.capacity || 2;
        let mainSubjectsCount = studentData.todayTasks.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem') && !t.text.includes('Tekrar')).length;
        while(mainSubjectsCount < capacity && studentData.taskQueue.length > 0) {
            let nextTopic = studentData.taskQueue.shift();
            studentData.todayTasks.push({ id: Date.now()+Math.random(), text: nextTopic.text, tag: nextTopic.tag, done: false });
            mainSubjectsCount++;
        }
        
        assignTimes(studentData.todayTasks, s);
        saveData();
        
        alert('İlerlemeniz kaydedildi ve programınız başarıyla güncellendi!');
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        if(!studentData) return;
        showScreen(document.getElementById('screen-welcome'));
        
        document.getElementById('student-name').value = studentData.name || '';
        document.getElementById('student-track').value = studentData.track || 'sayisal';
        document.getElementById('schedule-type').value = studentData.settings.scheduleType || 'hourly';
        
        document.getElementById('capacity-hours').value = studentData.settings.capacity || 6;
        document.getElementById('capacity-subjects').value = studentData.settings.capacity || 3;
        
        document.getElementById('start-time').value = studentData.settings.startTime || '09:00';
        document.getElementById('split-day').value = studentData.settings.splitDay ? 'yes' : 'no';
        document.getElementById('evening-start-time').value = studentData.settings.eveningStartTime || '18:00';
        document.getElementById('block-duration').value = studentData.settings.blockDur || 40;
        document.getElementById('break-duration').value = studentData.settings.breakDur || 10;
        
        document.getElementById('daily-paragraf').value = studentData.settings.paraGoal || '';
        document.getElementById('daily-problem').value = studentData.settings.probGoal || '';
        document.getElementById('para-duration').value = studentData.settings.paraDur || 30;
        document.getElementById('prob-duration').value = studentData.settings.probDur || 30;
        document.getElementById('routine-time').value = studentData.settings.routineTime || 'morning';
        
        if (studentData.settings.exams && studentData.settings.exams.general) {
            const gen = studentData.settings.exams.general;
            if (gen.tyt) {
                document.getElementById('exam-tyt-freq').value = gen.tyt.freq || 'none';
                document.getElementById('exam-tyt-day').value = gen.tyt.day || '0';
            }
            if (gen.ayt) {
                document.getElementById('exam-ayt-freq').value = gen.ayt.freq || 'none';
                document.getElementById('exam-ayt-day').value = gen.ayt.day || '0';
            }
            if (gen.ydt) {
                document.getElementById('exam-ydt-freq').value = gen.ydt.freq || 'none';
                document.getElementById('exam-ydt-day').value = gen.ydt.day || '0';
            }
        }

        document.getElementById('schedule-type').dispatchEvent(new Event('change'));
        document.getElementById('split-day').dispatchEvent(new Event('change'));
        
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        step1.classList.remove('hidden');
        ind1.classList.add('active'); ind2.classList.remove('active'); ind3.classList.remove('active');
        
        buildTopicAccordion(studentData.track, 'topic-selection-container', true);
    });

    // --- ACCORDION ---
    function buildBranchExams(track) {
        const container = document.getElementById('branch-exams-container');
        if (!container) return;
        container.innerHTML = '';
        
        let branches = ['TYT Türkçe', 'TYT Matematik', 'TYT Sosyal', 'TYT Fen'];
        if (track === 'say') branches.push('AYT Matematik', 'AYT Fizik', 'AYT Kimya', 'AYT Biyoloji');
        if (track === 'ea') branches.push('AYT Türk Dili ve Edebiyatı', 'AYT Tarih-1', 'AYT Coğrafya-1', 'AYT Matematik');
        if (track === 'soz') branches.push('AYT Türk Dili ve Edebiyatı', 'AYT Tarih-1', 'AYT Coğrafya-1', 'AYT Tarih-2', 'AYT Coğrafya-2', 'AYT Felsefe', 'AYT Din Kültürü');
        if (track === 'dil') branches.push('YDT İngilizce');

        branches = [...new Set(branches)];

        branches.forEach(branch => {
            let safeId = branch.replace(/[\s\W]+/g, '-').toLowerCase();
            
            let freqVal = 'none';
            let durVal = '';
            if (window.studentData && window.studentData.settings && window.studentData.settings.exams && window.studentData.settings.exams.branches) {
                let existing = window.studentData.settings.exams.branches.find(b => b.name === branch);
                if (existing) {
                    freqVal = existing.freq.toString();
                    durVal = existing.dur > 0 ? existing.dur : '';
                }
            }

            let html = `
                <div class="input-group" style="background: rgba(0,0,0,0.03); padding: 0.5rem; border-radius: 8px;">
                    <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 0.25rem; display: block;">${branch}</label>
                    <select id="branch-freq-${safeId}" class="branch-freq-select" data-branch="${branch}" style="padding: 0.4rem; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        <option value="none" ${freqVal === 'none' ? 'selected' : ''}>Yok</option>
                        <option value="1" ${freqVal === '1' ? 'selected' : ''}>Her gün</option>
                        <option value="2" ${freqVal === '2' ? 'selected' : ''}>2 günde 1</option>
                        <option value="3" ${freqVal === '3' ? 'selected' : ''}>3 günde 1</option>
                        <option value="4" ${freqVal === '4' ? 'selected' : ''}>4 günde 1</option>
                        <option value="7" ${freqVal === '7' ? 'selected' : ''}>Haftada 1</option>
                    </select>
                    <input type="number" id="branch-dur-${safeId}" class="branch-dur-input" data-branch="${branch}" placeholder="Süre (dk) - Opsiyonel" value="${durVal}" style="padding: 0.4rem; font-size: 0.8rem;">
                </div>
            `;
            container.innerHTML += html;
        });
    }

    function buildTopicAccordion(track, containerId, forWizard) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        let cats = ['tyt'];
        if(track === 'say') cats.push('aytSayisal');
        else if(track === 'ea') cats.push('aytEa');
        else if(track === 'soz') cats.push('aytSozel');
        else if(track === 'dil') cats.push('ydt');

        cats.forEach(cat => {
            const catData = YKS_TOPICS[cat];
            for(let subject in catData) {
                const topics = catData[subject];
                
                const item = document.createElement('div');
                item.className = 'accordion-item';
                
                const header = document.createElement('div');
                header.className = 'accordion-header';
                
                if(forWizard) {
                    header.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" class="subject-master-cb" checked title="Bu dersi programa dahil et/çıkar" style="width: 20px; height: 20px;">
                            <span>${subject} (${cat.toUpperCase()})</span>
                        </div>
                        <span class="accordion-arrow">▼</span>
                    `;
                } else {
                    header.innerHTML = `<span>${subject} (${cat.toUpperCase()})</span><span class="accordion-arrow">▼</span>`;
                }
                
                const body = document.createElement('div');
                body.className = 'accordion-body';

                topics.forEach(topic => {
                    let isChecked = true;
                    let partialProg = 0;
                    if(!forWizard) {
                        const fullTopicName = `${subject}: ${topic}`;
                        isChecked = studentData.completedTopics[fullTopicName] !== undefined;
                        if (!isChecked && studentData.topicProgress && studentData.topicProgress[fullTopicName]) {
                            partialProg = studentData.topicProgress[fullTopicName];
                        }
                    }

                    const label = document.createElement('label');
                    label.className = 'topic-checkbox';
                    
                    let qCountText = '';
                    if(!forWizard && studentData.questionCounts) {
                        const fullTopicName = `${subject}: ${topic}`;
                        if(studentData.questionCounts[fullTopicName]) {
                            qCountText = ` <span style="font-size: 0.75rem; color: var(--primary-color); font-weight: bold; margin-left: auto;">(${studentData.questionCounts[fullTopicName]} Soru)</span>`;
                        }
                    }

                    let progHtml = '';
                    if (!forWizard && !isChecked && partialProg > 0) {
                        progHtml = `
                            <div style="width: 50px; height: 6px; background: #e2e8f0; border-radius: 3px; margin-left: 10px; overflow: hidden; display: inline-block; vertical-align: middle;">
                                <div style="width: ${partialProg}%; height: 100%; background: #3b82f6;"></div>
                            </div>
                            <span style="font-size: 0.7rem; color: #64748b; margin-left: 5px;">%${partialProg}</span>
                        `;
                    }

                    label.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} data-cat="${cat}" data-subject="${subject}" value="${topic}"> <span style="margin-left: 4px;">${topic}</span>${progHtml}${qCountText}`;
                    if(qCountText !== '' || progHtml !== '') {
                        label.style.display = 'flex';
                        label.style.alignItems = 'center';
                    }
                    
                    if(!forWizard) {
                        label.querySelector('input').addEventListener('change', (e) => {
                            const fullTopicName = `${subject}: ${topic}`;
                            if(e.target.checked) {
                                studentData.completedTopics[fullTopicName] = Date.now();
                                studentData.topicProgress[fullTopicName] = 100;
                                removeTopicFromQueueAndToday(fullTopicName);
                            } else {
                                delete studentData.completedTopics[fullTopicName];
                                if (studentData.topicProgress[fullTopicName] === 100) {
                                    studentData.topicProgress[fullTopicName] = 99;
                                }
                            }
                            saveData();
                            updateOverallProgress();
                            
                            // Re-render currently active tab if we checked off a topic
                            const activeNav = document.querySelector('.nav-item.active').dataset.target;
                            if(activeNav === 'screen-program') {
                                fillTodayTasks(); renderToday(); 
                            } else if (activeNav === 'screen-weekly') {
                                renderWeeklyTab();
                            }
                        });
                    }

                    body.appendChild(label);
                });

                if(forWizard) {
                    const masterCb = header.querySelector('.subject-master-cb');
                    masterCb.addEventListener('change', (e) => {
                        const childCbs = body.querySelectorAll('.topic-checkbox input');
                        childCbs.forEach(cb => cb.checked = e.target.checked);
                    });
                }

                header.addEventListener('click', (e) => {
                    if(e.target.tagName.toLowerCase() === 'input') return;
                    body.classList.toggle('open');
                    header.querySelector('.accordion-arrow').textContent = body.classList.contains('open') ? '▲' : '▼';
                });

                item.appendChild(header); item.appendChild(body); container.appendChild(item);
            }
        });
    }

    function extractSelectedTopics(containerId) {
        let pool = {};
        const checkboxes = document.querySelectorAll(`#${containerId} .topic-checkbox input`);
        checkboxes.forEach(cb => {
            if(cb.checked) {
                const cat = cb.getAttribute('data-cat');
                const sub = cb.getAttribute('data-subject');
                if(!pool[cat]) pool[cat] = {};
                if(!pool[cat][sub]) pool[cat][sub] = [];
                pool[cat][sub].push(cb.value);
            }
        });
        return pool;
    }

    // Remove topic from active queues when marked done in progress tab
    function removeTopicFromQueueAndToday(topicText) {
        if(studentData.todayTasks) {
            studentData.todayTasks = studentData.todayTasks.filter(t => t.text !== topicText);
        }
        if(studentData.taskQueue) {
            studentData.taskQueue = studentData.taskQueue.filter(t => t.text !== topicText);
        }
    }

    // --- QUEUE LOGIC ---
    function processDailyShift() {
        const todayStr = new Date().toISOString().split('T')[0];
        if (studentData.lastLoginDate !== todayStr) {
            endDayLogic(todayStr);
        }
    }

    function endDayLogic(newDateStr) {
        if (studentData.todayTasks && studentData.todayTasks.length > 0) {
            let historyTasks = [];
            
            studentData.todayTasks.forEach(t => {
                const isRoutine = t.text.includes('Paragraf') || t.text.includes('Problem') || t.text.includes('Tekrar Testi') || t.tag === 'deneme';
                const oldProgress = t.startProgress !== undefined ? t.startProgress : (studentData.topicProgress[t.text] || 0);
                const newProgress = t.progress !== undefined ? t.progress : oldProgress;
                
                if (t.done || t.progress === 100) {
                    // Task fully completed today
                    if (t.qCount > 0) {
                        let baseName = t.text.replace(' (Soru Çözümü)', '').replace('Tekrar Testi: ', '');
                        if(!studentData.questionCounts) studentData.questionCounts = {};
                        if(!studentData.questionCounts[baseName]) studentData.questionCounts[baseName] = 0;
                        studentData.questionCounts[baseName] += parseInt(t.qCount);
                    }
                    if (t.progress !== undefined && !isRoutine) {
                        studentData.topicProgress[t.text] = 100;
                    }
                    historyTasks.push({ ...t, progress: 100 });
                } else if (t.skipped) {
                    // Explicitly marked as skipped
                    historyTasks.push({ ...t, isSkipped: true });
                } else if (isRoutine) {
                    // Untouched/Unfinished Routine -> Mark as skipped, do not carry over
                    historyTasks.push({ ...t, isSkipped: true });
                } else {
                    // It's a Topic task. Check if progress was made *today*
                    if (newProgress > oldProgress) {
                        // Progress was made today
                        studentData.topicProgress[t.text] = newProgress;
                        historyTasks.push({ ...t, isPartial: true, progress: newProgress });
                    } else {
                        // No progress made today -> Log as skipped for today
                        historyTasks.push({ ...t, isSkipped: true });
                    }
                }
            });

            if (historyTasks.length > 0) {
                if(!studentData.history) studentData.history = [];
                studentData.history.push({
                    date: studentData.lastLoginDate || new Date().toISOString().split('T')[0],
                    tasks: historyTasks
                });
            }
            
            // Put unfinished TOPIC tasks back to the VERY FRONT of the queue so they aren't lost
            const unfinishedCore = studentData.todayTasks.filter(t => {
                const isRoutine = t.text.includes('Paragraf') || t.text.includes('Problem') || t.text.includes('Tekrar Testi') || t.tag === 'deneme';
                const isDone = t.done || t.progress === 100 || t.skipped;
                return !isDone && !isRoutine;
            });
            
            studentData.taskQueue = [...unfinishedCore, ...studentData.taskQueue];
            studentData.todayTasks = [];
        }
        
        fillTodayTasks();
        if(newDateStr) studentData.lastLoginDate = newDateStr;
        saveData();
    }

    btnEndDay.addEventListener('click', () => {
        if(confirm('Günü bitirip yapılamayan görevleri yarına (kuyruğun başına) aktarmak istediğine emin misin?')) {
            // Force a shift to history, and pull fresh tasks
            endDayLogic();
            renderToday();
            updateOverallProgress();
            alert('Gün başarıyla bitirildi. Yarının programı hazırlandı.');
        }
    });

    const btnAddExtraQ = document.getElementById('btn-add-extra-q');
    const modalExtraQ = document.getElementById('modal-extra-q');
    const btnCloseExtraQ = document.getElementById('btn-close-extra-q');
    const btnSaveExtraQ = document.getElementById('btn-save-extra-q');
    const extraQSubjectSelect = document.getElementById('extra-q-subject-select');
    const extraQTopicSelect = document.getElementById('extra-q-topic-select');
    const extraQCount = document.getElementById('extra-q-count');

    if (btnAddExtraQ) {
        btnAddExtraQ.addEventListener('click', () => {
            // Populate subjects
            extraQSubjectSelect.innerHTML = '<option value="">-- Ders Seçiniz --</option>';
            extraQTopicSelect.innerHTML = '<option value="">-- Önce Ders Seçiniz --</option>';
            extraQTopicSelect.disabled = true;
            
            let subjects = new Set();
            if (studentData.customPool) {
                Object.keys(studentData.customPool).forEach(cat => {
                    Object.keys(studentData.customPool[cat]).forEach(sub => {
                        subjects.add(sub);
                    });
                });
            }

            Array.from(subjects).sort().forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                extraQSubjectSelect.appendChild(opt);
            });
            
            extraQCount.value = 10; // default
            modalExtraQ.classList.remove('hidden');
        });
    }

    if (extraQSubjectSelect) {
        extraQSubjectSelect.addEventListener('change', (e) => {
            const subject = e.target.value;
            extraQTopicSelect.innerHTML = '<option value="">-- Konu Seçiniz --</option>';
            
            if (!subject) {
                extraQTopicSelect.disabled = true;
                return;
            }
            
            extraQTopicSelect.disabled = false;
            
            let topics = new Set();
            if (studentData.customPool) {
                Object.keys(studentData.customPool).forEach(cat => {
                    if (studentData.customPool[cat][subject]) {
                        studentData.customPool[cat][subject].forEach(topic => {
                            topics.add(topic);
                        });
                    }
                });
            }
            
            Array.from(topics).forEach(topic => {
                const opt = document.createElement('option');
                opt.value = topic;
                opt.textContent = topic;
                extraQTopicSelect.appendChild(opt);
            });
        });
    }

    if (btnCloseExtraQ) {
        btnCloseExtraQ.addEventListener('click', () => {
            modalExtraQ.classList.add('hidden');
        });
    }

    if (btnSaveExtraQ) {
        btnSaveExtraQ.addEventListener('click', () => {
            const subject = extraQSubjectSelect.value;
            const topicBase = extraQTopicSelect.value;
            const count = parseInt(extraQCount.value);
            
            if (subject && topicBase && count > 0) {
                const fullTopicName = `${subject}: ${topicBase}`;
                if (!studentData.questionCounts) studentData.questionCounts = {};
                if (!studentData.questionCounts[fullTopicName]) studentData.questionCounts[fullTopicName] = 0;
                
                studentData.questionCounts[fullTopicName] += count;
                saveData();
                updateOverallProgress();
                
                // Re-render the Progress Tab if active
                if (document.getElementById('screen-progress') && !document.getElementById('screen-progress').classList.contains('hidden')) {
                    document.getElementById('btn-progress').click(); 
                }
                
                alert(`Tebrikler! ${fullTopicName} konusundan ${count} soru başarıyla eklendi.`);
                modalExtraQ.classList.add('hidden');
            } else {
                alert('Lütfen ders, konu ve geçerli bir soru adedi seçtiğinizden emin olun.');
            }
        });
    }

    btnAdvance.addEventListener('click', () => {
        ensureTaskQueue();
        if(studentData.taskQueue.length > 0) {
            let next = studentData.taskQueue.shift();
            studentData.todayTasks.push({ id: Date.now()+Math.random(), text: next.text, tag: next.tag, done: false });
            assignTimes(studentData.todayTasks, studentData.settings);
            ensureTaskQueue();
            saveData();
            renderToday();
        } else {
            alert('Havuzda ve kuyrukta başka konu kalmadı!');
        }
    });

    function getRootSubject(subName) {
        return subName.replace(/[0-9]/g, '');
    }

    function pullFromPool() {
        const pool = studentData.customPool;
        const progress = studentData.progressIdx;
        const cats = Object.keys(pool);
        if(cats.length === 0) return null;

        let availableSubjects = [];
        cats.forEach(cat => {
            Object.keys(pool[cat]).forEach(sub => {
                let currentIdx = progress[cat][sub];
                let list = pool[cat][sub];
                if(currentIdx < list.length) {
                    availableSubjects.push({cat, sub, topic: list[currentIdx]});
                }
            });
        });

        if(availableSubjects.length === 0) return null;

        let lastRoot = null;
        if(studentData.taskQueue && studentData.taskQueue.length > 0) {
            let lastTask = studentData.taskQueue[studentData.taskQueue.length - 1];
            let cleanText = lastTask.text.replace(' (Soru Çözümü)', '');
            let parts = cleanText.split(':');
            if(parts.length > 0) {
                lastRoot = getRootSubject(parts[0].trim());
            }
        }

        let filtered = availableSubjects;
        if(lastRoot) {
            filtered = availableSubjects.filter(s => getRootSubject(s.sub) !== lastRoot);
            if(filtered.length === 0) {
                filtered = availableSubjects;
            }
        }

        const picked = filtered[Math.floor(Math.random() * filtered.length)];
        studentData.progressIdx[picked.cat][picked.sub]++;
        
        return {
            text: `${picked.sub}: ${picked.topic}`,
            tag: picked.cat.includes('ayt') ? 'ayt' : 'tyt'
        };
    }

    function ensureTaskQueue() {
        if(!studentData.taskQueue) studentData.taskQueue = [];
        let capacity = studentData.settings.capacity || 2;
        let targetLength = 7 * capacity; // keep a full 7-day buffer
        
        while(studentData.taskQueue.length < targetLength) {
            let nextTopic = pullFromPool();
            if(nextTopic) {
                studentData.taskQueue.push({ text: nextTopic.text, tag: nextTopic.tag });
                if(studentData.settings.scheduleType !== 'flexible') {
                    studentData.taskQueue.push({ text: `${nextTopic.text} (Soru Çözümü)`, tag: nextTopic.tag });
                }
            } else {
                break; 
            }
        }
        saveData();
    }

    function getExamsForDate(date) {
        let examsToReturn = [];
        if (!studentData.settings || !studentData.settings.exams) return examsToReturn;
        const examsObj = studentData.settings.exams;
        const dayOfWeek = date.getDay();
        const msPerDay = 1000*60*60*24;
        
        if (!studentData.startDate) studentData.startDate = Date.now();
        
        // Use timezone offset to ensure accurate day differences
        const startDay = Math.floor((new Date(studentData.startDate).getTime() - new Date(studentData.startDate).getTimezoneOffset() * 60000) / msPerDay);
        const currentDay = Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / msPerDay);
        const daysElapsed = currentDay - startDay;
        const weeksElapsed = Math.floor(daysElapsed / 7);
        
        const gen = examsObj.general;
        if (gen) {
            if (gen.tyt.freq === 'weekly' && gen.tyt.day === dayOfWeek) {
                examsToReturn.push({ text: 'TYT Genel Denemesi', dur: 165, isGeneral: true, tag: 'deneme' });
            } else if (gen.tyt.freq === 'biweekly' && gen.tyt.day === dayOfWeek && weeksElapsed % 2 === 0) {
                examsToReturn.push({ text: 'TYT Genel Denemesi', dur: 165, isGeneral: true, tag: 'deneme' });
            }
            
            if (gen.ayt.freq === 'weekly' && gen.ayt.day === dayOfWeek) {
                examsToReturn.push({ text: 'AYT Genel Denemesi', dur: 180, isGeneral: true, tag: 'deneme' });
            } else if (gen.ayt.freq === 'biweekly' && gen.ayt.day === dayOfWeek && weeksElapsed % 2 === 0) {
                examsToReturn.push({ text: 'AYT Genel Denemesi', dur: 180, isGeneral: true, tag: 'deneme' });
            }
            
            if (gen.ydt.freq === 'weekly' && gen.ydt.day === dayOfWeek) {
                examsToReturn.push({ text: 'YDT Denemesi', dur: 120, isGeneral: true, tag: 'deneme' });
            } else if (gen.ydt.freq === 'biweekly' && gen.ydt.day === dayOfWeek && weeksElapsed % 2 === 0) {
                examsToReturn.push({ text: 'YDT Denemesi', dur: 120, isGeneral: true, tag: 'deneme' });
            }
        }

        const hasGeneralExam = examsToReturn.some(e => e.isGeneral);

        if (examsObj.branches && !hasGeneralExam) {
            const sozelDersler = ['türkçe', 'sosyal', 'tarih', 'coğrafya', 'felsefe', 'din', 'edebiyat'];
            const sayisalDersler = ['matematik', 'geometri', 'fizik', 'kimya', 'biyoloji', 'fen'];

            let sIdx=0, syIdx=0, dIdx=0;
            let branchDefs = examsObj.branches.map(b => {
                const lowerName = b.name.toLowerCase();
                let category = 'diger';
                let offset = 0;
                if (sozelDersler.some(d => lowerName.includes(d))) { category = 'sozel'; offset = sIdx++; }
                else if (sayisalDersler.some(d => lowerName.includes(d))) { category = 'sayisal'; offset = syIdx++; }
                else { category = 'diger'; offset = dIdx++; }
                
                return { name: b.name, freq: b.freq, dur: b.dur || studentData.settings.blockDur, category: category, offset: offset };
            });

            // If we are looking at a date before the start date, don't schedule branch exams
            if (daysElapsed >= 0) {
                let pendingExams = [];
                let pickedForTarget = [];

                // Simulate schedule up to target day
                for (let d = 0; d <= daysElapsed; d++) {
                    // 1. Add exams naturally due on day d
                    branchDefs.forEach(b => {
                        let isDue = false;
                        if (b.freq === 1) isDue = true;
                        else if (b.freq === 7 && (d + b.offset) % 7 === 0) isDue = true;
                        else if (b.freq > 1 && (d + b.offset) % b.freq === 0) isDue = true;
                        
                        if (isDue) pendingExams.push({ exam: b, waitDays: 0 });
                    });

                    // 2. Increment wait times
                    pendingExams.forEach(p => p.waitDays++);

                    // 3. Sort by priority (waitDays DESC)
                    pendingExams.sort((a, b) => b.waitDays - a.waitDays);

                    let dayPicks = [];
                    let nextPending = [];

                    function canAddExam(exam) {
                        const text = exam.name.toLowerCase();
                        const hasTurkce = dayPicks.some(p => p.name.toLowerCase().includes('türkçe'));
                        const hasMat = dayPicks.some(p => p.name.toLowerCase().includes('matematik'));
                        if (text.includes('türkçe') && hasMat) return false;
                        if (text.includes('matematik') && hasTurkce) return false;
                        return true;
                    }

                    // 4. Pick up to 2 exams without heavy overlap
                    for (let i = 0; i < pendingExams.length; i++) {
                        let candidate = pendingExams[i].exam;
                        if (dayPicks.length < 2 && canAddExam(candidate)) {
                            // To perfectly balance Sozel/Sayisal:
                            // If we already picked a Sozel, and candidate is another Sozel, 
                            // check if there's a Sayisal with EXACTLY the SAME waitDays that we can pick instead.
                            const hasSameCategory = dayPicks.some(p => p.category === candidate.category);
                            const existsBetterAlternative = pendingExams.slice(i+1).some(other => 
                                other.waitDays === pendingExams[i].waitDays && 
                                other.exam.category !== candidate.category && 
                                !dayPicks.some(p => p.category === other.exam.category) &&
                                canAddExam(other.exam)
                            );

                            if (hasSameCategory && existsBetterAlternative) {
                                nextPending.push(pendingExams[i]); // skip for now
                            } else {
                                dayPicks.push(candidate);
                            }
                        } else {
                            nextPending.push(pendingExams[i]);
                        }
                    }

                    pendingExams = nextPending;
                    
                    if (d === daysElapsed) {
                        pickedForTarget = dayPicks;
                    }
                }

                pickedForTarget.forEach(b => {
                    examsToReturn.push({ text: `${b.name} Branş Denemesi`, dur: b.dur, isBranch: true, tag: 'deneme' });
                });
            }
        }
        
        return examsToReturn;
    }

    function fillTodayTasks() {
        let tasks = studentData.todayTasks || [];
        let s = studentData.settings;
        let capacity = s.capacity || 2;
        
        ensureTaskQueue();
        
        const hasPara = tasks.some(t => t.tag === 'tyt' && t.text.includes('Paragraf'));
        const hasProb = tasks.some(t => t.tag === 'tyt' && t.text.includes('Problem'));
        
        let queue = [];

        // Check for exams today
        const todaysExams = getExamsForDate(new Date());
        let hasGeneralExam = false;
        let hasTurkceDeneme = false;
        todaysExams.forEach((exam, i) => {
            if (exam.text.toLowerCase().includes('türkçe') && exam.isBranch) hasTurkceDeneme = true;
            
            const alreadyAdded = tasks.some(t => t.text === exam.text) || queue.some(q => q.text === exam.text);
            if (!alreadyAdded) {
                queue.push({ id: Date.now()+'ex'+i, text: exam.text, tag: exam.tag, done: false, dur: exam.dur });
                if (exam.isGeneral) {
                    hasGeneralExam = true;
                    queue.push({ id: Date.now()+'exd'+i, text: 'Deneme Değerlendirmesi', tag: 'deneme', done: false, dur: 30 });
                }
            } else if (exam.isGeneral) {
                hasGeneralExam = true;
            }
        });

        // If today is a general exam day, push any non-exam tasks back to the queue
        if (hasGeneralExam) {
            const nonExams = tasks.filter(t => !t.text.includes('Deneme') && !t.isGeneral);
            studentData.taskQueue = [...nonExams, ...studentData.taskQueue];
            tasks = tasks.filter(t => t.text.includes('Deneme') || t.isGeneral);
        }

        // Add routines if no general exam (don't overburden on exam days)
        if (!hasGeneralExam) {
            if (s.paraGoal > 0 && !hasPara && !hasTurkceDeneme) queue.push({ id: Date.now()+'p1', text: `${s.paraGoal} Paragraf Sorusu`, tag: 'tyt', done: false });
            if (s.probGoal > 0 && !hasProb) queue.push({ id: Date.now()+'p2', text: `${s.probGoal} Problem Sorusu`, tag: 'tyt', done: false });
        }

        // Spaced Repetition Logic (+7 days)
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (!hasGeneralExam) {
            Object.keys(studentData.completedTopics || {}).forEach(topicName => {
                let ts = studentData.completedTopics[topicName];
                if (now - ts > sevenDays && !studentData.spacedRepetitionDone[topicName]) {
                    queue.push({ id: Date.now()+'sr'+Math.random(), text: `Tekrar Testi: ${topicName}`, tag: 'deneme', done: false });
                    studentData.spacedRepetitionDone[topicName] = true;
                }
            });
        }

        let mainSubjectsCount = tasks.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem') && !t.text.includes('Tekrar') && !t.text.includes('Deneme')).length;
        
        // If there's a general exam, block new topics
        if (hasGeneralExam) {
            mainSubjectsCount = capacity; 
        }

        while(mainSubjectsCount < capacity) {
            if(studentData.taskQueue.length > 0) {
                let nextTopic = studentData.taskQueue.shift();
                queue.push({ id: Date.now()+Math.random(), text: nextTopic.text, tag: nextTopic.tag, done: false });
                mainSubjectsCount++;
            } else {
                break; 
            }
        }
        
        ensureTaskQueue(); // top up queue after shifting

        let combined = tasks.concat(queue);

        if(s.routineTime === 'evening') {
            const routines = combined.filter(t => t.text.includes('Paragraf') || t.text.includes('Problem'));
            const others = combined.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem'));
            combined = others.concat(routines);
        } else {
            const routines = combined.filter(t => t.text.includes('Paragraf') || t.text.includes('Problem'));
            const others = combined.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem'));
            combined = routines.concat(others);
        }

        assignTimes(combined, s);
        studentData.todayTasks = combined;
    }

    function assignTimes(tasks, s) {
        if(s.scheduleType === 'flexible') {
            tasks.forEach(t => t.timeStr = '');
            return;
        }
        
        let currentTime = parseTime(s.startTime);
        
        if (s.splitDay && tasks.length > 1) {
            let splitIndex = Math.ceil(tasks.length / 2);
            let eveningTime = parseTime(s.eveningStartTime);
            
            tasks.forEach((t, i) => {
                if(i === splitIndex) {
                    currentTime = eveningTime; // Atla akşam vaktine
                }
                let duration = t.dur || s.blockDur;
                if(t.text.includes('Paragraf')) duration = s.paraDur || 30;
                else if(t.text.includes('Problem')) duration = s.probDur || 30;
                let endTime = currentTime + duration;
                t.timeStr = `${formatTime(currentTime)} - ${formatTime(endTime)}`;
                currentTime = endTime + s.breakDur;
            });
        } else {
            tasks.forEach((t, i) => {
                let duration = t.dur || s.blockDur;
                if(t.text.includes('Paragraf')) duration = s.paraDur || 30;
                else if(t.text.includes('Problem')) duration = s.probDur || 30;
                let endTime = currentTime + duration;
                t.timeStr = `${formatTime(currentTime)} - ${formatTime(endTime)}`;
                currentTime = endTime + s.breakDur;
            });
        }
    }

    function parseTime(timeStr) {
        if(!timeStr) return 540; 
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    function formatTime(minutes) {
        let h = Math.floor(minutes / 60) % 24;
        let m = minutes % 60;
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    }

    // --- RENDERERS ---
    function renderToday() {
        const TARGET_DATE = new Date('2027-06-19T00:00:00'); // YKS 2027 Estimate
        const daysLeft = Math.max(0, Math.ceil((TARGET_DATE - new Date()) / (1000 * 60 * 60 * 24)));
        document.getElementById('days-left').textContent = daysLeft;

        const container = document.getElementById('program-container');
        container.innerHTML = '';

        if(!studentData.todayTasks || studentData.todayTasks.length === 0) {
            container.innerHTML = '<p class="text-center">Bugün için planlanmış bir görev kalmadı. Harikasın!</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'task-list';

        studentData.todayTasks.forEach((task) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.done ? 'completed' : ''} ${task.skipped ? 'skipped' : ''}`;
            
            let timeBadgeHtml = task.timeStr ? `<div class="time-badge">${task.timeStr}</div>` : '';
            
            let showQInput = task.text.includes('Soru Çözümü') || task.text.includes('Paragraf') || task.text.includes('Problem') || task.text.includes('Tekrar');
            
            let showSlider = !showQInput && task.text.includes(': ') && !task.text.includes('Denemesi') && !task.text.includes('Tekrar');
            let isRoutineTask = task.text.includes('Paragraf') || task.text.includes('Problem') || task.text.includes('Tekrar Testi') || task.tag === 'deneme';
            let progressVal = task.progress !== undefined ? task.progress : (!isRoutineTask && studentData.topicProgress[task.text] ? studentData.topicProgress[task.text] : 0);
            if (task.done) progressVal = 100;
            task.progress = progressVal;
            
            if (task.startProgress === undefined) {
                task.startProgress = studentData.topicProgress[task.text] || 0;
            }

            let qInputHtml = '';
            if (showQInput) {
                qInputHtml = `
                <div class="q-count-container" style="margin-left: 10px; flex-shrink: 0;">
                    <input type="number" class="q-count-input" placeholder="Soru Adedi" value="${task.qCount || ''}" min="0" style="width: 75px; padding: 0.3rem; font-size: 0.8rem; border-radius: 6px; border: 1px solid #ccc; text-align: center;">
                </div>`;
            }

            let sliderHtml = '';
            if (showSlider) {
                sliderHtml = `
                <div class="task-progress-container" style="width: 100%; margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                    <input type="range" class="task-progress-slider" min="0" max="100" value="${progressVal}" style="flex-grow: 1; accent-color: #3b82f6;">
                    <span class="task-progress-label" style="font-size: 0.8rem; font-weight: bold; color: #64748b; width: 40px; text-align: right;">%${progressVal}</span>
                </div>`;
            }

            let textStyle = task.skipped ? 'text-decoration: line-through; color: #ef4444;' : '';
            li.innerHTML = `
                <div class="drag-handle">☰</div>
                <div class="task-checkbox"></div>
                <div style="flex-grow: 1; display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center;">
                        ${timeBadgeHtml}
                        <div class="task-text" style="${textStyle}">${task.text}</div>
                        <span class="tag tag-${task.tag}">${task.tag.toUpperCase()}</span>
                    </div>
                    ${sliderHtml}
                </div>
                ${qInputHtml}
                ${!showSlider ? `<div class="task-skip-btn" style="cursor: pointer; color: #ef4444; margin-left: 10px; font-size: 1.2rem;" title="Yapılamadı / Atla">✖</div>` : ''}
            `;

            if (showQInput) {
                const qInput = li.querySelector('.q-count-input');
                qInput.addEventListener('change', (e) => {
                    task.qCount = parseInt(e.target.value) || 0;
                    if (task.qCount > 0 && !task.done) {
                        li.querySelector('.task-checkbox').click(); // Auto-check
                    } else if (task.qCount === 0 && task.done) {
                        li.querySelector('.task-checkbox').click(); // Auto-uncheck
                    } else {
                        saveData();
                    }
                });
            }

            if (showSlider) {
                const slider = li.querySelector('.task-progress-slider');
                const label = li.querySelector('.task-progress-label');
                slider.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value);
                    label.textContent = '%' + val;
                    task.progress = val;
                    
                    if (val === 100 && !task.done) {
                        li.querySelector('.task-checkbox').click(); // Auto-check if 100%
                    } else if (val < 100 && task.done) {
                        li.querySelector('.task-checkbox').click(); // Auto-uncheck if < 100%
                    } else {
                        saveData();
                    }
                });
            }

            li.querySelector('.task-checkbox').addEventListener('click', () => {
                if (task.skipped) return; // Prevent checking if skipped
                task.done = !task.done;
                li.classList.toggle('completed');
                
                if (showSlider) {
                    const slider = li.querySelector('.task-progress-slider');
                    const label = li.querySelector('.task-progress-label');
                    if (task.done) {
                        task.progress = 100;
                        slider.value = 100;
                        label.textContent = '%100';
                        studentData.topicProgress[task.text] = 100;
                    } else if (task.progress === 100) {
                        task.progress = 99;
                        slider.value = 99;
                        label.textContent = '%99';
                        studentData.topicProgress[task.text] = 99;
                    }
                }

                if (task.done && showQInput) {
                    const qInput = li.querySelector('.q-count-input');
                    if (!qInput.value || parseInt(qInput.value) === 0) {
                        // Extract number from task text if it exists (e.g. "20 Paragraf Sorusu" -> 20)
                        let match = task.text.match(/^(\d+)/);
                        if (match) {
                            qInput.value = match[1];
                            task.qCount = parseInt(match[1]);
                        }
                    }
                }
                
                if(task.done && task.text.includes(': ') && !task.text.includes('Tekrar')) {
                    studentData.completedTopics[task.text] = Date.now();
                } else if (!task.done && task.text.includes(': ') && !task.text.includes('Tekrar')) {
                    delete studentData.completedTopics[task.text];
                }

                saveData();
            });
            
            const skipBtn = li.querySelector('.task-skip-btn');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    task.skipped = !task.skipped;
                    li.classList.toggle('skipped');
                    
                    const taskTextEl = li.querySelector('.task-text');
                    if (task.skipped) {
                        task.done = false;
                        li.classList.remove('completed');
                        taskTextEl.style.textDecoration = 'line-through';
                        taskTextEl.style.color = '#ef4444';
                        
                        if (task.text.includes(': ') && !task.text.includes('Tekrar')) {
                            delete studentData.completedTopics[task.text];
                        }
                        
                        // clear progress
                        if (task.progress) {
                            task.progress = 0;
                            studentData.topicProgress[task.text] = 0;
                        }
                        if (showSlider) {
                            li.querySelector('.task-progress-slider').value = 0;
                            li.querySelector('.task-progress-label').textContent = '%0';
                        }
                    } else {
                        taskTextEl.style.textDecoration = 'none';
                        taskTextEl.style.color = 'inherit';
                    }
                    saveData();
                });
            }

            ul.appendChild(li);
        });

        container.appendChild(ul);

        new Sortable(ul, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function(evt) {
                const movedItem = studentData.todayTasks.splice(evt.oldIndex, 1)[0];
                studentData.todayTasks.splice(evt.newIndex, 0, movedItem);
                saveData();
            }
        });
    }

    function renderWeeklyTab() {
        const container = document.getElementById('weekly-container');
        container.innerHTML = '';
        let s = studentData.settings || {};
        
        ensureTaskQueue(); 
        
        const printHeaderHtml = `
            <div class="print-page-header hidden-in-web">
                <h2>ERTUĞRUL KURDOĞLU ANADOLU LİSESİ</h2>
                <h3>YKS Çalışma Programı - ${s.name || 'Öğrenci'}</h3>
            </div>
        `;
        const printFooterHtml = `
            <div class="print-page-footer hidden-in-web">
                <div style="text-align: left; font-weight: bold;">Fatih AVCI<br>Psikolojik Danışman</div>
                <div style="text-align: right; font-weight: bold;">EKAL REHBERLİK SERVİSİ</div>
            </div>
        `;
        
        // --- 1. BUGÜNÜN HEDEFLERİ (Aktif Görevler) ---
        const todayCard = document.createElement('div');
        todayCard.className = 'day-card';
        todayCard.innerHTML = printHeaderHtml + `<div class="day-header" style="background-color: var(--primary-color);"><h3 style="color: white;">Aktif Konular</h3></div>`;
        const todayUl = document.createElement('ul');
        todayUl.className = 'task-list';
        
        let activeTopics = [];
        if (studentData.todayTasks && studentData.todayTasks.length > 0) {
            activeTopics = studentData.todayTasks.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem') && !t.text.includes('Tekrar Testi') && t.tag !== 'deneme');
        }
        
        if (activeTopics.length > 0) {
            activeTopics.forEach(task => {
                const li = document.createElement('li');
                li.className = 'task-item';
                
                let progressVal = task.progress !== undefined ? task.progress : (studentData.topicProgress[task.text] || 0);
                if (task.done) progressVal = 100;
                
                let timeBadgeHtml = task.timeStr ? `<div class="time-badge">${task.timeStr}</div>` : '';
                let progressBadgeHtml = task.text.includes(': ') && !task.text.includes('Tekrar') && !task.text.includes('Denemesi') 
                    ? `<span style="font-size: 0.8rem; font-weight: bold; color: #3b82f6; margin-left: 5px;">(%${progressVal})</span>`
                    : '';
                    
                li.innerHTML = `
                    <div style="flex-grow: 1;">
                        ${timeBadgeHtml}
                        <div class="task-text">${task.text} ${progressBadgeHtml}</div>
                        <span class="tag tag-${task.tag}">${task.tag.toUpperCase()}</span>
                    </div>
                `;
                todayUl.appendChild(li);
            });
        } else {
            todayUl.innerHTML = '<li style="color: #64748b; font-size: 0.9rem; text-align: center; border:none; padding:1rem;">Bugün için planlanmış aktif görev yok.</li>';
        }
        todayCard.appendChild(todayUl);
        todayCard.insertAdjacentHTML('beforeend', printFooterHtml);
        container.appendChild(todayCard);

        // --- 2. SIRADAKİ KONULAR (Hedef Kuyruğu) ---
        const queueCard = document.createElement('div');
        queueCard.className = 'day-card';
        queueCard.innerHTML = printHeaderHtml + `<div class="day-header" style="background-color: #f59e0b;"><h3 style="color: white;">Gelecek (Kuyruktaki) Konular</h3></div>`;
        const queueUl = document.createElement('ul');
        queueUl.className = 'task-list';
        
        // Filter out generic routines from the queue to just show upcoming topics
        const upcomingTopics = studentData.taskQueue.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem') && !t.text.includes('Soru Çözümü'));
        
        if (upcomingTopics.length > 0) {
            upcomingTopics.slice(0, 10).forEach((task, index) => {
                const li = document.createElement('li');
                li.className = 'task-item';
                li.innerHTML = `
                    <div style="flex-grow: 1; display: flex; align-items: center;">
                        <span style="font-weight: bold; color: #f59e0b; margin-right: 10px;">${index + 1}.</span>
                        <div class="task-text">${task.text}</div>
                        <span class="tag tag-${task.tag}" style="margin-left: auto;">${task.tag.toUpperCase()}</span>
                    </div>
                `;
                queueUl.appendChild(li);
            });
            if (upcomingTopics.length > 10) {
                const li = document.createElement('li');
                li.innerHTML = `<div style="text-align: center; width: 100%; color: #64748b; font-size: 0.85rem;">+ ${upcomingTopics.length - 10} konu daha var...</div>`;
                queueUl.appendChild(li);
            }
        } else {
            queueUl.innerHTML = '<li style="color: #64748b; font-size: 0.9rem; text-align: center; border:none; padding:1rem;">Kuyrukta konu kalmadı.</li>';
        }
        queueCard.appendChild(queueUl);
        queueCard.insertAdjacentHTML('beforeend', printFooterHtml);
        container.appendChild(queueCard);

        // --- 3. HAFTALIK SABİTLER (Günlük Rutinler Takvimi) ---
        const routineCard = document.createElement('div');
        routineCard.className = 'day-card';
        routineCard.innerHTML = printHeaderHtml + `<div class="day-header" style="background-color: #10b981;"><h3 style="color: white;">Günlük Rutinler</h3></div>`;
        
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';
        
        for(let dayOffset=0; dayOffset<7; dayOffset++) {
            const dayDate = new Date();
            dayDate.setDate(dayDate.getDate() + dayOffset); 
            const dateStr = dayDate.toLocaleDateString('tr-TR', { weekday: 'long' });
            
            const col = document.createElement('div');
            col.className = 'calendar-col';
            col.innerHTML = `<div class="calendar-col-header">${dateStr}</div>`;
            
            const ul = document.createElement('ul');
            ul.className = 'task-list';
            
            const futureExams = getExamsForDate(dayDate);
            const hasGeneral = futureExams.some(e => e.isGeneral);
            const hasTurkce = futureExams.some(e => e.text.toLowerCase().includes('türkçe'));

            if (!hasGeneral) {
                if (s.paraGoal > 0 && !hasTurkce) ul.innerHTML += `<li class="task-item"><div class="task-text">${s.paraGoal} Paragraf</div><span class="tag tag-tyt" style="margin-left:auto;">TYT</span></li>`;
                if (s.probGoal > 0) ul.innerHTML += `<li class="task-item"><div class="task-text">${s.probGoal} Problem</div><span class="tag tag-tyt" style="margin-left:auto;">TYT</span></li>`;
            }
            
            futureExams.forEach(exam => {
                ul.innerHTML += `<li class="task-item">
                    <div style="flex-grow: 1;">
                        <span class="task-text" style="font-size:0.8rem;">${exam.text}</span>
                    </div>
                    <span class="tag tag-${exam.tag}" style="margin-left:auto; font-size:0.7rem;">${exam.tag.toUpperCase()}</span>
                </li>`;
                if (exam.isGeneral) {
                    ul.innerHTML += `<li class="task-item">
                        <div style="flex-grow: 1;">
                            <span class="task-text" style="font-size:0.8rem;">Deneme Değerlendirmesi</span>
                        </div>
                        <span class="tag tag-deneme" style="margin-left:auto; font-size:0.7rem;">DENEME</span>
                    </li>`;
                }
            });
            
            if (ul.innerHTML === '') {
                ul.innerHTML = '<li style="color: #64748b; font-size: 0.8rem; text-align: center; border:none; padding:0.5rem;">Görev yok</li>';
            }
            
            col.appendChild(ul);
            calendarGrid.appendChild(col);
        }
        
        routineCard.appendChild(calendarGrid);
        routineCard.insertAdjacentHTML('beforeend', printFooterHtml);
        container.appendChild(routineCard);

        const dateRangeEl = document.getElementById('pdf-date-range');
        if(dateRangeEl) {
            const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            dateRangeEl.textContent = `Güncelleme: ${todayStr}`;
        }
    }

    function renderProgressTab() {
        buildTopicAccordion(studentData.track, 'progress-accordion-container', false);
        updateOverallProgress();
    }

    function updateOverallProgress() {
        const total = document.querySelectorAll('#progress-accordion-container .topic-checkbox').length;
        const checked = Object.keys(studentData.completedTopics).length;
        const pct = total === 0 ? 0 : (checked / total) * 100;
        document.getElementById('overall-progress').style.width = `${pct}%`;
    }

    function renderHistoryTab() {
        const container = document.getElementById('history-container');
        container.innerHTML = '';
        if(!studentData.history || studentData.history.length === 0) {
            container.innerHTML = '<p class="text-center text-secondary">Henüz geçmiş günün yok.</p>'; return;
        }
        [...studentData.history].reverse().forEach(record => {
            const dateObj = new Date(record.date);
            const dateStr = dateObj.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
            const card = document.createElement('div');
            card.className = 'day-card'; card.style.marginBottom = '1rem';
            card.innerHTML = `
                <div class="day-header" style="margin-bottom:0.5rem; padding-bottom: 0;">
                    <h3>${dateStr}</h3><span class="tag tag-deneme">${record.tasks.length} Görev</span>
                </div>
                <ul style="list-style: none; padding-left: 0; font-size: 0.9rem; color: #475569;">
                    ${record.tasks.map(t => {
                        let qText = (t.qCount && parseInt(t.qCount) > 0) ? ` <b style="color:var(--primary-color);">(${t.qCount} Soru)</b>` : '';
                        let icon = '✓';
                        let progText = '';
                        let textStyle = '';
                        if (t.isSkipped) {
                            icon = '✖';
                            progText = ` <span style="font-size: 0.8rem; color: #ef4444; font-weight: bold;">(Yapılamadı)</span>`;
                            qText = '';
                            textStyle = 'text-decoration: line-through; color: #ef4444;';
                        } else if (t.isPartial) {
                            icon = '⏳';
                            progText = ` <span style="font-size: 0.8rem; color: #f59e0b; font-weight: bold;">(%${t.progress} çalışıldı)</span>`;
                        } else if (t.progress === 100) {
                            progText = ` <span style="font-size: 0.8rem; color: #22c55e; font-weight: bold;">(Tamamlandı)</span>`;
                        }
                        return `<li style="margin-bottom:0.25rem;"><span style="${textStyle}">${icon} ${t.text}</span>${progText}${qText}</li>`;
                    }).join('')}
                </ul>
            `;
            container.appendChild(card);
        });
    }

    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    if(btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', () => {
            // Populate the header fields for printing
            document.getElementById('pdf-student-name').textContent = studentData.name;
            const tracks = { tyt: 'TYT', say: 'Sayısal', ea: 'Eşit Ağırlık', soz: 'Sözel', dil: 'Yabancı Dil' };
            document.getElementById('pdf-student-track').textContent = tracks[studentData.track];
            document.getElementById('pdf-student-level').textContent = studentData.level;
            
            // Trigger native browser print dialog (guarantees flawless PDF generation)
            window.print();
        });
    }
    
    // --- EXAM RESULTS (DENEME SONUÇLARI) ---
    const EXAM_SUBJECTS = {
        'TYT': ['Türkçe', 'Sosyal', 'Matematik', 'Fen'],
        'AYT': ['Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe', 'Din', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
        'YDT': ['İngilizce']
    };

    function renderDynamicInputs() {
        const type = document.getElementById('exam-result-type').value;
        const container = document.getElementById('dynamic-net-inputs');
        if(!container) return;
        container.innerHTML = '';
        document.getElementById('exam-result-score').value = '';

        const renderSubjectInput = (subLabel) => {
            return `
                <div class="exam-subject-block" style="flex: 1; min-width: 130px; background: rgba(255,255,255,0.7); padding: 0.75rem; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <label style="font-weight: bold; margin-bottom: 0.5rem; display: block; color: #1e293b; text-align: center;">${subLabel}</label>
                    <div style="display: flex; gap: 5px;">
                        <input type="number" class="sub-d-input" data-subject="${subLabel}" placeholder="Doğru" min="0" style="width: 100%; padding: 0.25rem; border-radius: 4px; border: 1px solid #22c55e; text-align: center;" title="Doğru Sayısı">
                        <input type="number" class="sub-y-input" data-subject="${subLabel}" placeholder="Yanlış" min="0" style="width: 100%; padding: 0.25rem; border-radius: 4px; border: 1px solid #ef4444; text-align: center;" title="Yanlış Sayısı">
                    </div>
                    <div style="text-align: center; margin-top: 8px; font-size: 0.85rem; font-weight: bold; color: var(--primary-color);">Net: <span class="sub-net-display" data-subject="${subLabel}">0.00</span></div>
                </div>
            `;
        };

        if(type === 'Branş') {
            container.innerHTML = renderSubjectInput('Branş');
        } else {
            let subjects = EXAM_SUBJECTS[type];
            subjects.forEach(sub => {
                container.innerHTML += renderSubjectInput(sub);
            });
        }

        const calculateNets = () => {
            let totalNet = 0;
            const blocks = container.querySelectorAll('.exam-subject-block');
            blocks.forEach(block => {
                const dInput = block.querySelector('.sub-d-input');
                const yInput = block.querySelector('.sub-y-input');
                const netDisplay = block.querySelector('.sub-net-display');
                
                const d = parseInt(dInput.value) || 0;
                const y = parseInt(yInput.value) || 0;
                const net = d - (y / 4);
                
                // Show 0 if net is negative, or actual net.
                let displayNet = net > 0 ? net : 0;
                netDisplay.textContent = displayNet.toFixed(2);
                totalNet += displayNet;
            });
            document.getElementById('exam-result-score').value = totalNet.toFixed(2);
        };

        container.querySelectorAll('input[type="number"]').forEach(inp => {
            inp.addEventListener('input', calculateNets);
        });
    }

    document.getElementById('exam-result-type').addEventListener('change', (e) => {
        const type = e.target.value;
        const branchGroup = document.getElementById('exam-result-branch-group');
        if(type === 'Branş') {
            branchGroup.classList.remove('hidden');
        } else {
            branchGroup.classList.add('hidden');
        }
        renderDynamicInputs();
    });

    document.getElementById('btn-save-exam-result').addEventListener('click', () => {
        const type = document.getElementById('exam-result-type').value;
        const branch = document.getElementById('exam-result-branch-name').value;
        const score = document.getElementById('exam-result-score').value;

        if(!score) return;
        if(type === 'Branş' && !branch) return;

        const subScores = {};
        document.querySelectorAll('.exam-subject-block').forEach(block => {
            const dInput = block.querySelector('.sub-d-input');
            const sub = dInput.getAttribute('data-subject');
            const netDisplay = block.querySelector('.sub-net-display');
            const net = parseFloat(netDisplay.textContent) || 0;
            
            // Only save if they entered something
            if(dInput.value || block.querySelector('.sub-y-input').value) {
                subScores[sub] = net;
            }
        });

        if(!studentData.examResults) studentData.examResults = [];
        
        studentData.examResults.push({
            date: Date.now(),
            type: type,
            branch: type === 'Branş' ? branch : null,
            score: parseFloat(score),
            subScores: subScores
        });
        
        saveData();
        renderExamResults();
        
        document.getElementById('exam-result-score').value = '';
        document.getElementById('exam-result-branch-name').value = '';
        document.querySelectorAll('.sub-d-input, .sub-y-input').forEach(i => i.value = '');
        document.querySelectorAll('.sub-net-display').forEach(d => d.textContent = '0.00');
        alert('Deneme sonucun kaydedildi!');
    });

    function renderExamResults() {
        const container = document.getElementById('exam-results-container');
        if(!container) return;
        container.innerHTML = '';
        
        if(!studentData.examResults || studentData.examResults.length === 0) {
            container.innerHTML = '<p class="text-center text-secondary">Henüz bir deneme sonucu girmedin.</p>';
            return;
        }

        [...studentData.examResults].reverse().forEach(record => {
            const dateObj = new Date(record.date);
            const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const title = record.type === 'Branş' ? `${record.branch} Denemesi` : `${record.type} Genel Denemesi`;
            
            let subScoreHtml = '';
            if(record.subScores && Object.keys(record.subScores).length > 0 && record.type !== 'Branş') {
                subScoreHtml = `<div style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">
                    ${Object.entries(record.subScores).map(([sub, val]) => `<span><b>${sub}:</b> ${val}</span>`).join(' | ')}
                </div>`;
            }

            const div = document.createElement('div');
            div.className = 'exam-result-item';
            div.innerHTML = `
                <div class="exam-result-info">
                    <span class="exam-result-title">${title}</span>
                    <span class="exam-result-date">${dateStr}</span>
                    ${subScoreHtml}
                </div>
                <div class="exam-result-score">${record.score} Net</div>
            `;
            container.appendChild(div);
        });
    }

    // Ekstra olarak renderExamResults() çağrısını init() veya showScreen içine de ekleyelim
    // For now, we attach it to the button that opens the tab:
    document.querySelector('[data-target="screen-exams"]').addEventListener('click', () => {
        renderDynamicInputs();
        renderExamResults();
    });
    
});
