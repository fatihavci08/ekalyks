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
            let html = `
                <div class="input-group" style="background: rgba(0,0,0,0.03); padding: 0.5rem; border-radius: 8px;">
                    <label style="font-size: 0.8rem; font-weight: bold; margin-bottom: 0.25rem; display: block;">${branch}</label>
                    <select id="branch-freq-${safeId}" class="branch-freq-select" data-branch="${branch}" style="padding: 0.4rem; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        <option value="none">Yok</option>
                        <option value="1">Her gün</option>
                        <option value="2">2 günde 1</option>
                        <option value="3">3 günde 1</option>
                        <option value="4">4 günde 1</option>
                        <option value="7">Haftada 1</option>
                    </select>
                    <input type="number" id="branch-dur-${safeId}" class="branch-dur-input" data-branch="${branch}" placeholder="Süre (dk) - Opsiyonel" style="padding: 0.4rem; font-size: 0.8rem;">
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
        else if(track === 'soz') cats.push('aytEa', 'aytSozel');
        else if(track === 'dil') cats.push('ydt');

        cats.forEach(cat => {
            const catData = YKS_TOPICS[cat];
            for(let subject in catData) {
                if(track === 'soz' && cat === 'aytEa' && subject !== 'Edebiyat') continue;
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
                    if(!forWizard) {
                        isChecked = studentData.completedTopics[`${subject}: ${topic}`] !== undefined;
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

                    label.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} data-cat="${cat}" data-subject="${subject}" value="${topic}"> ${topic}${qCountText}`;
                    if(qCountText !== '') {
                        label.style.display = 'flex';
                        label.style.alignItems = 'center';
                    }
                    
                    if(!forWizard) {
                        label.querySelector('input').addEventListener('change', (e) => {
                            const fullTopicName = `${subject}: ${topic}`;
                            if(e.target.checked) {
                                studentData.completedTopics[fullTopicName] = Date.now();
                                removeTopicFromQueueAndToday(fullTopicName);
                            } else {
                                delete studentData.completedTopics[fullTopicName];
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
            const completed = studentData.todayTasks.filter(t => t.done);
            const unfinished = studentData.todayTasks.filter(t => !t.done);
            
            if (completed.length > 0) {
                if(!studentData.questionCounts) studentData.questionCounts = {};
                completed.forEach(t => {
                    if (t.qCount > 0) {
                        let baseName = t.text.replace(' (Soru Çözümü)', '').replace('Tekrar Testi: ', '');
                        if(!studentData.questionCounts[baseName]) studentData.questionCounts[baseName] = 0;
                        studentData.questionCounts[baseName] += parseInt(t.qCount);
                    }
                });

                studentData.history.push({
                    date: studentData.lastLoginDate || new Date().toISOString().split('T')[0],
                    tasks: completed
                });
            }
            
            // Put unfinished tasks back to the VERY FRONT of the queue so they aren't lost
            // BUT discard uncompleted routines (Paragraf/Problem/Tekrar) so they don't pile up.
            const unfinishedCore = unfinished.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem') && !t.text.includes('Tekrar Testi'));
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
            alert('Gün başarıyla bitirildi! Harika bir iş çıkardın.');
        }
    });

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

        if (examsObj.branches) {
            let branchOffset = 0;
            examsObj.branches.forEach(b => {
                const freq = b.freq;
                if (freq === 1) { 
                    examsToReturn.push({ text: `${b.name} Branş Denemesi`, dur: b.dur || studentData.settings.blockDur, isBranch: true, tag: 'deneme' });
                } else if (freq === 7) { 
                    if ((daysElapsed + branchOffset) % 7 === 0) {
                        examsToReturn.push({ text: `${b.name} Branş Denemesi`, dur: b.dur || studentData.settings.blockDur, isBranch: true, tag: 'deneme' });
                    }
                    branchOffset++;
                } else if (freq > 1) { 
                    if ((daysElapsed + branchOffset) % freq === 0) {
                        examsToReturn.push({ text: `${b.name} Branş Denemesi`, dur: b.dur || studentData.settings.blockDur, isBranch: true, tag: 'deneme' });
                    }
                    branchOffset++;
                }
            });
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
        todaysExams.forEach((exam, i) => {
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

        // Add routines if no general exam (don't overburden on exam days)
        if (!hasGeneralExam) {
            if (s.paraGoal > 0 && !hasPara) queue.push({ id: Date.now()+'p1', text: `${s.paraGoal} Paragraf Sorusu`, tag: 'tyt', done: false });
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
            li.className = `task-item ${task.done ? 'completed' : ''}`;
            
            let timeBadgeHtml = task.timeStr ? `<div class="time-badge">${task.timeStr}</div>` : '';
            
            let showQInput = task.text.includes('Soru Çözümü') || task.text.includes('Paragraf') || task.text.includes('Problem') || task.text.includes('Tekrar');
            
            let qInputHtml = '';
            if (showQInput) {
                qInputHtml = `
                <div class="q-count-container" style="margin-left: 10px; flex-shrink: 0;">
                    <input type="number" class="q-count-input" placeholder="Soru Adedi" value="${task.qCount || ''}" min="0" style="width: 75px; padding: 0.3rem; font-size: 0.8rem; border-radius: 6px; border: 1px solid #ccc; text-align: center;">
                </div>`;
            }

            li.innerHTML = `
                <div class="drag-handle">☰</div>
                <div class="task-checkbox"></div>
                <div style="flex-grow: 1;">
                    ${timeBadgeHtml}
                    <div class="task-text">${task.text}</div>
                    <span class="tag tag-${task.tag}">${task.tag.toUpperCase()}</span>
                </div>
                ${qInputHtml}
            `;

            if (showQInput) {
                const qInput = li.querySelector('.q-count-input');
                qInput.addEventListener('change', (e) => {
                    task.qCount = parseInt(e.target.value) || 0;
                    saveData();
                });
            }

            li.querySelector('.task-checkbox').addEventListener('click', () => {
                task.done = !task.done;
                li.classList.toggle('completed');
                
                if(task.done && task.text.includes(': ') && !task.text.includes('Tekrar')) {
                    studentData.completedTopics[task.text] = Date.now();
                } else if (!task.done && task.text.includes(': ') && !task.text.includes('Tekrar')) {
                    delete studentData.completedTopics[task.text];
                }

                saveData();
            });

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
        let s = studentData.settings;
        let capacity = s.capacity || 2;

        ensureTaskQueue(); 

        let firstDateStr = null;
        let lastDateStr = null;
        let queuedTopicsConsumed = 0;

        for(let dayOffset=1; dayOffset<=7; dayOffset++) {
            const dayDate = new Date();
            dayDate.setDate(dayDate.getDate() + dayOffset - 1); 
            const dateStr = dayDate.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
            const fullDateStr = dayDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            if(dayOffset === 1) firstDateStr = fullDateStr;
            if(dayOffset === 7) lastDateStr = fullDateStr;

            let dayTasks = [];
            
            if(dayOffset === 1) {
                const todayMain = (studentData.todayTasks || []).filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem'));
                todayMain.forEach(t => dayTasks.push({text: t.text, tag: t.tag, dur: t.dur}));
                
                // Add routines if they were in todayTasks (might be blocked by general exam)
                const hasPara = (studentData.todayTasks || []).some(t => t.text.includes('Paragraf'));
                const hasProb = (studentData.todayTasks || []).some(t => t.text.includes('Problem'));
                if (hasPara) dayTasks.push({ text: `${s.paraGoal} Paragraf Sorusu`, tag: 'tyt' });
                if (hasProb) dayTasks.push({ text: `${s.probGoal} Problem Sorusu`, tag: 'tyt' });
            } else {
                let hasGeneralExam = false;
                const futureExams = getExamsForDate(dayDate);
                futureExams.forEach(exam => {
                    dayTasks.push({ text: exam.text, tag: exam.tag, dur: exam.dur });
                    if (exam.isGeneral) {
                        hasGeneralExam = true;
                        dayTasks.push({ text: 'Deneme Değerlendirmesi', tag: 'deneme', dur: 30 });
                    }
                });

                if (!hasGeneralExam) {
                    if(s.paraGoal > 0) dayTasks.push({ text: `${s.paraGoal} Paragraf Sorusu`, tag: 'tyt' });
                    if(s.probGoal > 0) dayTasks.push({ text: `${s.probGoal} Problem Sorusu`, tag: 'tyt' });
                    
                    let topicsAdded = 0;
                    while (topicsAdded < capacity) {
                        if (studentData.taskQueue[queuedTopicsConsumed]) {
                            let task = studentData.taskQueue[queuedTopicsConsumed];
                            dayTasks.push({ text: task.text, tag: task.tag });
                            queuedTopicsConsumed++;
                            topicsAdded++;
                        } else {
                            break;
                        }
                    }
                }
            }

            if(s.routineTime === 'evening') {
                const routines = dayTasks.filter(t => t.text.includes('Paragraf') || t.text.includes('Problem'));
                const others = dayTasks.filter(t => !t.text.includes('Paragraf') && !t.text.includes('Problem'));
                dayTasks = others.concat(routines);
            }

            assignTimes(dayTasks, s);

            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.innerHTML = `<div class="day-header"><h3>${dateStr}</h3></div>`;
            
            const ul = document.createElement('ul');
            ul.className = 'task-list';
            dayTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = 'task-item';
                let timeBadgeHtml = task.timeStr ? `<div class="time-badge">${task.timeStr}</div>` : '';
                li.innerHTML = `
                    <div style="flex-grow: 1;">
                        ${timeBadgeHtml}
                        <div class="task-text">${task.text}</div>
                        <span class="tag tag-${task.tag}">${task.tag.toUpperCase()}</span>
                    </div>
                `;
                ul.appendChild(li);
            });
            dayCard.appendChild(ul);
            container.appendChild(dayCard);
        }

        const dateRangeEl = document.getElementById('pdf-date-range');
        if(dateRangeEl) {
            dateRangeEl.textContent = `${firstDateStr} -- ${lastDateStr}`;
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
                        return `<li style="margin-bottom:0.25rem;">✓ ${t.text}${qText}</li>`;
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
