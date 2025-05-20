        // --- Variáveis Globais e Estado da Aplicação ---
        let users = [];
        let serviceOrders = [];
        let loggedInUser = null;
        let currentReportData = []; // Para armazenar dados do último relatório gerado
        let confirmActionCallback = null; // Callback para modal de confirmação

        // --- Constantes ---
        const USER_ROLES = {
            USER: 'user',
            TECHNICIAN: 'technician',
            ADMIN: 'admin'
        };
        const OS_STATUS = {
            ABERTA: 'Aberta',
            EM_ANDAMENTO: 'Em andamento',
            CONCLUIDA: 'Concluida'
        };
        const OS_PRIORITY = {
            BAIXA: 'Baixa',
            MEDIA: 'Media',
            ALTA: 'Alta',
            CRITICA: 'Critica'
        };
        const PROBLEM_TYPES = [
            "Problema de internet",
            "Problema com Computador",
            "Problema com Sistema",
            "Problema com Impressoras",
            "Problema com Ramal Telefônico",
            "Problema com Rede de dados",
            "Outros"
        ];
        // MODIFICADO: Adicionada constante para o e-mail do admin especial
        const SPECIAL_ADMIN_EMAIL = 'admin@sistema.local';

        // --- Funções de Utilidade ---
        const getElement = (id) => document.getElementById(id);
        const hide = (elementId) => getElement(elementId)?.classList.add('hidden');
        const show = (elementId) => getElement(elementId)?.classList.remove('hidden');
        const toggle = (elementId) => getElement(elementId)?.classList.toggle('hidden');
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            try {
                const date = new Date(dateString);
                 // Correção de fuso horário manual para exibição (simples)
                const offset = date.getTimezoneOffset();
                // Correção: usar getTime() que retorna milissegundos
                const correctedDate = new Date(date.getTime() - (offset * 60 * 1000));

                // Formatar a data corrigida
                const day = String(correctedDate.getDate()).padStart(2, '0');
                const month = String(correctedDate.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
                const year = correctedDate.getFullYear();
                const hours = String(correctedDate.getHours()).padStart(2, '0');
                const minutes = String(correctedDate.getMinutes()).padStart(2, '0');
                // Verifica se a data resultante é válida antes de formatar
                if (isNaN(correctedDate.getTime())) {
                    // Se inválido, talvez retornar o original ou um erro
                    // console.warn("Data inválida após correção de fuso:", dateString);
                    // Tentativa de formatar sem correção se falhar
                    const originalDate = new Date(dateString);
                     if(isNaN(originalDate.getTime())) return 'Data Inválida';
                     return `${String(originalDate.getDate()).padStart(2, '0')}/${String(originalDate.getMonth() + 1).padStart(2, '0')}/${originalDate.getFullYear()} ${String(originalDate.getHours()).padStart(2, '0')}:${String(originalDate.getMinutes()).padStart(2, '0')}`;
                }
                return `${day}/${month}/${year} ${hours}:${minutes}`;
             } catch (e) {
                 console.error("Erro ao formatar data:", dateString, e);
                 return 'Data Inválida';
             }
        };
        const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Função para normalizar telefone (remover não dígitos)
        const normalizePhone = (phone) => phone ? String(phone).replace(/\D/g, '') : '';

        // --- Funções de Persistência (localStorage) ---
        // REMOVIDO: saveData e loadData duplicados. Use as funções do firebase-config.js

        // --- Funções de Navegação ---
        const showScreen = (screenId) => {
            ['login-screen', 'register-screen', 'user-dashboard', 'technician-dashboard', 'admin-panel'].forEach(id => hide(id));
            show(screenId);
        };

        // --- Funções de Autenticação ---
        const handleLogin = (event) => {
            event.preventDefault();
            // MODIFICADO: Obtém do input 'login-identity'
            const identity = getElement('login-identity').value.trim();
            const password = getElement('login-password').value;
            const loginError = getElement('login-error');
            hide(loginError.id);

            if (!identity || !password) {
                 loginError.textContent = 'Por favor, preencha o campo de login e senha.';
                 show(loginError.id);
                 return;
            }

            // MODIFICADO: Lógica de busca do usuário
            const normalizedIdentity = identity.toLowerCase();
            const normalizedPhoneInput = normalizePhone(identity); // Remove não-dígitos da entrada

            const user = users.find(u => {
                // 1. Verifica pelo e-mail (case-insensitive)
                if (u.email.toLowerCase() === normalizedIdentity) return true;
                // 2. Verifica pelo telefone (comparando apenas dígitos)
                if (u.whatsapp && normalizePhone(u.whatsapp) === normalizedPhoneInput && normalizedPhoneInput !== '') return true;
                 // 3. Verifica pelo login especial "Admin" (case-insensitive) associado ao email do admin especial
                 if (normalizedIdentity === 'admin' && u.email === SPECIAL_ADMIN_EMAIL) return true;
                 // 4. Opcional: Permitir login pelo nome exato? (Descomente se desejar)
                 // if (u.name === identity) return true;

                return false;
            });
            // Fim da Modificação na busca

            if (user) {
                if (!user.approved) {
                    loginError.textContent = 'Seu cadastro está pendente de aprovação.';
                    show(loginError.id);
                } else if (user.password === password) { // Comparação simples - NÃO SEGURO
                    loggedInUser = user;
                    saveData();
                    navigateToDashboard();
                    getElement('login-form').reset(); // Limpa o formulário
                } else {
                    loginError.textContent = 'Senha incorreta.';
                    show(loginError.id);
                }
            } else {
                loginError.textContent = 'Usuário não encontrado ou credenciais inválidas.';
                show(loginError.id);
            }
        };

        const handleRegister = (event) => {
            event.preventDefault();
            const name = getElement('register-name').value.trim();
            const department = getElement('register-department').value.trim();
            const whatsapp = getElement('register-whatsapp').value.trim();
            const email = getElement('register-email').value.trim().toLowerCase();
            const password = getElement('register-password').value;
            const registerMessage = getElement('register-message');
            hide(registerMessage.id);

            // Validação básica
            if (!name || !department || !whatsapp || !email || !password) {
                registerMessage.textContent = 'Por favor, preencha todos os campos.';
                registerMessage.className = 'error-message';
                show(registerMessage.id);
                return;
            }
             // Validação de email simples
            if (!/\S+@\S+\.\S+/.test(email)) {
                 registerMessage.textContent = 'Por favor, insira um e-mail válido.';
                 registerMessage.className = 'error-message';
                 show(registerMessage.id);
                 return;
             }

             // Verifica duplicidade de email ou telefone (normalizado)
            const normalizedNewPhone = normalizePhone(whatsapp);
            if (users.some(u => u.email === email || (u.whatsapp && normalizePhone(u.whatsapp) === normalizedNewPhone && normalizedNewPhone !== ''))) {
                registerMessage.textContent = 'Este e-mail ou telefone já está cadastrado.';
                registerMessage.className = 'error-message';
                show(registerMessage.id);
                return;
            }
            // Verifica se o email é o reservado do admin especial
            if (email === SPECIAL_ADMIN_EMAIL) {
                 registerMessage.textContent = 'Este e-mail é reservado para administração.';
                 registerMessage.className = 'error-message';
                 show(registerMessage.id);
                 return;
            }


            const newUser = {
                id: generateId(),
                name: name,
                department: department,
                whatsapp: whatsapp,
                email: email,
                password: password, // Armazenar senha em texto plano (NÃO SEGURO)
                role: USER_ROLES.USER,
                approved: false // Novo usuário precisa de aprovação
            };

            users.push(newUser);
            saveData();

            registerMessage.textContent = 'Cadastro realizado com sucesso! Aguarde aprovação do administrador.';
            registerMessage.className = 'success-message'; // Adicionar estilo se necessário
            show(registerMessage.id);
            getElement('register-form').reset();
            // Opcional: Redirecionar para login após alguns segundos
            setTimeout(() => {
                 hide(registerMessage.id);
                 showScreen('login-screen');
            }, 3000);
        };

        const handleLogout = () => {
            loggedInUser = null;
            saveData();
            showScreen('login-screen');
        };

        const navigateToDashboard = () => {
            if (!loggedInUser) {
                showScreen('login-screen');
                return;
            }
            switch (loggedInUser.role) {
                case USER_ROLES.USER:
                    showScreen('user-dashboard');
                    displayUserDashboard();
                    break;
                case USER_ROLES.TECHNICIAN:
                    showScreen('technician-dashboard');
                    displayTechnicianDashboard();
                    break;
                case USER_ROLES.ADMIN:
                    showScreen('admin-panel');
                    displayAdminPanel();
                    break;
                default:
                    console.warn("Papel de usuário desconhecido:", loggedInUser.role);
                    handleLogout(); // Desloga se o papel for inválido
            }
        };

        // --- Funções da Tela do Usuário ---
        const displayUserDashboard = () => {
            getElement('user-welcome-name').textContent = loggedInUser.name;
            hide('new-os-form');
            hide('edit-profile-form');
            show('user-actions');
            displayUserOSList();
            // Preencher formulário de edição com dados atuais
            getElement('edit-profile-name').value = loggedInUser.name;
            getElement('edit-profile-department').value = loggedInUser.department;
            getElement('edit-profile-whatsapp').value = loggedInUser.whatsapp;
            getElement('edit-profile-email').value = loggedInUser.email; // Email não editável
        };

        const displayUserOSList = () => {
            const osListContainer = getElement('user-os-list');
            const userOS = serviceOrders.filter(os => os.userId === loggedInUser.id)
                                      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)); // Mais recentes primeiro

            if (userOS.length === 0) {
                osListContainer.innerHTML = '<p>Você ainda não abriu nenhuma Ordem de Serviço.</p>';
                return;
            }

            osListContainer.innerHTML = userOS.map(os => `
                <div class="os-card priority-${os.priority?.toLowerCase() || 'media'}">
                    <h4>OS #${os.id.substring(3, 8)} - ${os.problemType}</h4>
                    <p><strong>Status:</strong> <span class="os-status-${os.status?.toLowerCase().replace(' ', '-') || 'aberta'}">${os.status}</span></p>
                    <p><strong>Prioridade:</strong> ${os.priority || 'Média'}</p>
                    <p><strong>Data Abertura:</strong> ${formatDate(os.createdDate)}</p>
                    <p><strong>Descrição:</strong> ${os.description?.length > 100 ? os.description.substring(0, 100) + '...' : os.description}</p>
                     <p><strong>Técnico:</strong> ${os.technicianName || 'Não atribuído'}</p>
                    ${os.status === OS_STATUS.CONCLUIDA && !os.feedback ?
                        `<button class="button button-info button-small" onclick="showFeedbackModal('${os.id}')">Dar Feedback</button>`
                        : ''
                    }
                     ${os.status === OS_STATUS.CONCLUIDA && os.feedback ?
                        `<p style="margin-top:5px; font-style: italic;"><strong>Seu Feedback:</strong> ${os.feedback}</p>`
                        : ''
                    }
                     <button class="button button-secondary button-small" onclick="viewOsDetails('${os.id}', false)">Ver Detalhes</button>
                     ${os.updates && os.updates.length > 1 ? `<button class="button-link button-small" onclick="viewOsDetails('${os.id}', false)">Ver Histórico (${os.updates.length-1} atualizações)</button>` : ''}
                </div>
            `).join('');
        };

        const handleNewOSSubmit = (event) => {
            event.preventDefault();
             const problemType = getElement('os-problem-type').value;
             const priority = getElement('os-priority').value;
             const description = getElement('os-description').value.trim();

             if (!problemType || !priority || !description) {
                 alert("Por favor, preencha todos os campos da Ordem de Serviço.");
                 return;
             }

            const newOS = {
                id: generateId(),
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                userDepartment: loggedInUser.department,
                problemType: problemType,
                description: description,
                priority: priority,
                status: OS_STATUS.ABERTA,
                createdDate: new Date().toISOString(),
                technicianId: null, // Nenhum técnico atribuído inicialmente
                technicianName: 'Não atribuído',
                updates: [{
                    timestamp: new Date().toISOString(),
                    status: OS_STATUS.ABERTA,
                    notes: 'Ordem de Serviço criada pelo usuário.',
                    changedBy: loggedInUser.name
                }],
                feedback: null
            };
            serviceOrders.push(newOS);
            saveData();
            getElement('new-os-form').reset();
            hide('new-os-form');
            show('user-actions');
            displayUserOSList(); // Atualiza a lista
             alert('Ordem de Serviço aberta com sucesso!');
        };

        const handleEditProfileSubmit = (event) => {
            event.preventDefault();
            const userIndex = users.findIndex(u => u.id === loggedInUser.id);

            const name = getElement('edit-profile-name').value.trim();
            const department = getElement('edit-profile-department').value.trim();
            const whatsapp = getElement('edit-profile-whatsapp').value.trim();

            if (!name || !department || !whatsapp) {
                 alert("Por favor, preencha todos os seus dados.");
                 return;
            }

            // Verifica se o whatsapp mudou e se já existe (normalizado)
            const normalizedNewPhone = normalizePhone(whatsapp);
            if (whatsapp !== loggedInUser.whatsapp && users.some(u => u.id !== loggedInUser.id && u.whatsapp && normalizePhone(u.whatsapp) === normalizedNewPhone && normalizedNewPhone !== '')) {
                alert('Erro: Este número de WhatsApp já está sendo usado por outro usuário.');
                return;
            }

            if (userIndex > -1) {
                users[userIndex].name = name;
                users[userIndex].department = department;
                users[userIndex].whatsapp = whatsapp;

                // Atualiza também as OSs abertas pelo usuário com o novo nome/departamento?
                // Decisão: Sim, para consistência nos relatórios futuros.
                serviceOrders = serviceOrders.map(os => {
                    if (os.userId === loggedInUser.id) {
                        return { ...os, userName: users[userIndex].name, userDepartment: users[userIndex].department };
                    }
                    return os;
                });

                loggedInUser = users[userIndex]; // Atualiza o usuário logado na sessão
                saveData();
                alert('Dados atualizados com sucesso!');
                hide('edit-profile-form');
                show('user-actions');
                displayUserDashboard(); // Atualiza a tela
            } else {
                alert('Erro ao encontrar usuário para atualizar.');
            }
        };

        const showFeedbackModal = (osId) => {
            const os = serviceOrders.find(o => o.id === osId);
            if (!os) return;
            getElement('os-feedback-id').value = osId;
            getElement('os-feedback-title').textContent = `Feedback da OS #${os.id.substring(3, 8)}`;
            getElement('os-feedback-comment').value = ''; // Limpa campo
            showModal('os-feedback-modal');
        };

        const handleFeedbackSubmit = () => {
            const osId = getElement('os-feedback-id').value;
            const feedback = getElement('os-feedback-comment').value.trim();
            const osIndex = serviceOrders.findIndex(o => o.id === osId);

            if (osIndex > -1 && feedback) {
                serviceOrders[osIndex].feedback = feedback;
                saveData();
                closeModal('os-feedback-modal');
                displayUserOSList(); // Atualiza a lista para mostrar o feedback
                 alert('Feedback enviado com sucesso!');
            } else if (!feedback) {
                alert('Por favor, digite seu feedback.');
            }
        };


        // --- Funções da Tela do Técnico ---
        const displayTechnicianDashboard = () => {
            getElement('tech-welcome-name').textContent = loggedInUser.name;
            populateTechnicianDropdown('os-details-technician'); // Popula dropdown no modal
            resetFilters(); // Exibe todas as OSs inicialmente e limpa filtros
        };

        const applyFilters = () => {
            const filters = {
                type: getElement('filter-type').value,
                department: getElement('filter-department').value.trim().toLowerCase(),
                status: getElement('filter-status').value,
                priority: getElement('filter-priority').value,
                dateStart: getElement('filter-date-start').value,
                dateEnd: getElement('filter-date-end').value,
            };
            displayTechnicianOSList(filters);
        };

         const resetFilters = () => {
            getElement('filter-type').value = "";
            getElement('filter-department').value = "";
            getElement('filter-status').value = "";
            getElement('filter-priority').value = "";
            getElement('filter-date-start').value = "";
            getElement('filter-date-end').value = "";
            applyFilters(); // Aplica para mostrar tudo
        };

        const displayTechnicianOSList = (filters = {}) => {
            const osListContainer = getElement('technician-os-list');

            let filteredOS = serviceOrders.filter(os => {
                let match = true;
                if (filters.type && os.problemType !== filters.type) match = false;
                if (filters.department && !(os.userDepartment || '').toLowerCase().includes(filters.department)) match = false;
                if (filters.status && os.status !== filters.status) match = false;
                if (filters.priority && os.priority !== filters.priority) match = false;
                if (filters.dateStart) {
                    try {
                        const startDate = new Date(filters.dateStart + "T00:00:00");
                        if (new Date(os.createdDate) < startDate) match = false;
                    } catch (e) { console.warn("Data inicial inválida no filtro"); }
                }
                if (filters.dateEnd) {
                    try {
                         const endDate = new Date(filters.dateEnd + "T23:59:59");
                         if (new Date(os.createdDate) > endDate) match = false;
                     } catch (e) { console.warn("Data final inválida no filtro"); }
                }
                return match;
            });

             filteredOS.sort((a, b) => {
                // Ordenar por status (Aberta/Andamento > Concluida), depois Prioridade, depois Data
                const statusOrder = { [OS_STATUS.ABERTA]: 3, [OS_STATUS.EM_ANDAMENTO]: 2, [OS_STATUS.CONCLUIDA]: 1 };
                const statusA = statusOrder[a.status] || 0;
                const statusB = statusOrder[b.status] || 0;
                 if (statusB !== statusA) {
                     return statusB - statusA;
                 }

                 // Se status for igual, ordenar por prioridade
                const priorityOrder = { [OS_PRIORITY.CRITICA]: 4, [OS_PRIORITY.ALTA]: 3, [OS_PRIORITY.MEDIA]: 2, [OS_PRIORITY.BAIXA]: 1 };
                const priorityA = priorityOrder[a.priority] || 0;
                const priorityB = priorityOrder[b.priority] || 0;
                if (priorityB !== priorityA) {
                    return priorityB - priorityA;
                }

                // Se prioridade igual, ordenar por data (mais recentes primeiro)
                return new Date(b.createdDate) - new Date(a.createdDate);
            });


            if (filteredOS.length === 0) {
                osListContainer.innerHTML = '<p>Nenhuma Ordem de Serviço encontrada com os filtros aplicados.</p>';
                return;
            }

             osListContainer.innerHTML = filteredOS.map(os => `
                <div class="os-card priority-${os.priority?.toLowerCase() || 'media'}">
                    <h4>OS #${os.id.substring(3, 8)} - ${os.problemType}</h4>
                     <p><strong>Solicitante:</strong> ${os.userName || 'N/A'} (${os.userDepartment || 'N/A'})</p>
                    <p><strong>Status:</strong> <span class="os-status-${os.status?.toLowerCase().replace(' ', '-') || 'aberta'}">${os.status}</span></p>
                    <p><strong>Prioridade:</strong> ${os.priority || 'Média'}</p>
                    <p><strong>Data Abertura:</strong> ${formatDate(os.createdDate)}</p>
                     <p><strong>Técnico:</strong> ${os.technicianName || 'Não atribuído'}</p>
                    <p><strong>Descrição:</strong> ${os.description?.length > 100 ? os.description.substring(0, 100) + '...' : os.description}</p>
                     <button class="button button-primary button-small" onclick="viewOsDetails('${os.id}', true)">Gerenciar OS</button>
                      ${os.feedback ? `<p style="margin-top:10px; padding: 5px; background: #e0f7fa; border-left: 3px solid #00acc1; font-style: italic;"><strong>Feedback do Usuário:</strong> ${os.feedback}</p>` : ''}
                </div>
            `).join('');
        };

        const viewOsDetails = (osId, isTechnicianView) => {
            const os = serviceOrders.find(o => o.id === osId);
            if (!os) {
                alert("Ordem de serviço não encontrada.");
                return;
            }

            getElement('os-details-id').value = osId;
            getElement('os-details-title').textContent = `Detalhes da OS #${os.id.substring(3, 8)} (${os.problemType})`;

            const detailsContent = getElement('os-details-content');
            detailsContent.innerHTML = `
                <p><strong>Solicitante:</strong> ${os.userName || 'N/A'}</p>
                <p><strong>Departamento:</strong> ${os.userDepartment || 'N/A'}</p>
                <p><strong>Data Abertura:</strong> ${formatDate(os.createdDate)}</p>
                <p><strong>Status Atual:</strong> <span class="os-status-${os.status?.toLowerCase().replace(' ', '-') || 'aberta'}">${os.status}</span></p>
                 <p><strong>Prioridade:</strong> ${os.priority || 'Média'}</p>
                 <p><strong>Técnico Atribuído:</strong> ${os.technicianName || 'Não atribuído'}</p>
                <p><strong>Descrição do Problema:</strong></p>
                <p style="white-space: pre-wrap; background: #f9f9f9; padding: 10px; border-radius: 3px; border: 1px solid #eee; max-height: 150px; overflow-y: auto;">${os.description || '(Sem descrição)'}</p>
                ${os.feedback ? `<p style="margin-top:10px; font-style: italic;"><strong>Feedback do Usuário:</strong> ${os.feedback}</p>` : ''}
            `;

             // Popula dropdown de técnicos ANTES de setar o valor
             populateTechnicianDropdown('os-details-technician');

            // Preencher campos de atualização
            getElement('os-details-status').value = os.status;
            getElement('os-details-notes').value = ''; // Limpar notas
            getElement('os-details-technician').value = os.technicianId || ''; // Seleciona técnico atual ou vazio

            // Mostrar/ocultar controles de técnico/admin
            const updateSection = getElement('os-details-modal').querySelector('hr').nextElementSibling; // Pega a div/form após o primeiro hr
            const updateButton = getElement('os-details-update-btn');
             const closeButton = updateButton.nextElementSibling; // Pega o botão fechar
             if (isTechnicianView || loggedInUser?.role === USER_ROLES.ADMIN) {
                updateSection.style.display = '';
                updateButton.style.display = '';
                 closeButton.textContent = 'Fechar'; // Texto padrão se pode editar
             } else {
                 updateSection.style.display = 'none';
                 updateButton.style.display = 'none';
                 closeButton.textContent = 'OK'; // Muda texto se só visualiza
             }


            // Exibir histórico
            const historyContainer = getElement('os-details-history');
            const updates = os.updates || [];
            if (updates.length > 0) {
                historyContainer.innerHTML = updates
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Mais recente primeiro
                    .map(update => `
                    <div style="border-bottom: 1px dotted #ccc; margin-bottom: 8px; padding-bottom: 8px;">
                        <p style="margin-bottom: 3px;"><strong>${formatDate(update.timestamp)}:</strong> Status: <strong>${update.status || 'N/A'}</strong></p>
                        <p style="margin-bottom: 3px;"><strong>Por:</strong> ${update.changedBy || 'Sistema'}</p>
                        ${update.technicianName ? `<p style="margin-bottom: 3px;"><strong>Técnico:</strong> ${update.technicianName}</p>` : ''}
                        ${update.notes ? `<p style="margin-bottom: 0; font-size: 0.9em;"><em>Obs: ${update.notes}</em></p>` : ''}
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = '<p>Nenhum histórico de mudanças registrado.</p>';
            }

            showModal('os-details-modal');
        };

        const handleUpdateOS = () => {
            const osId = getElement('os-details-id').value;
            const newStatus = getElement('os-details-status').value;
            const notes = getElement('os-details-notes').value.trim();
            const technicianId = getElement('os-details-technician').value;
            const technicianSelect = getElement('os-details-technician');
            // Garante que pega o texto correto mesmo se a opção não for encontrada (improvável)
            const selectedOption = technicianSelect.options[technicianSelect.selectedIndex];
            const technicianName = technicianId && selectedOption ? selectedOption.text : 'Não atribuído';

            const osIndex = serviceOrders.findIndex(o => o.id === osId);
            if (osIndex === -1) {
                alert('Erro: OS não encontrada.');
                return;
            }

            const currentOS = serviceOrders[osIndex];
            let changed = false;
            let updateNotes = [];

            // Verifica o que mudou para incluir no histórico
             if (currentOS.status !== newStatus) {
                 updateNotes.push(`Status alterado de "${currentOS.status}" para "${newStatus}".`);
                 changed = true;
             }
             if (currentOS.technicianId !== (technicianId || null)) {
                 updateNotes.push(`Técnico alterado de "${currentOS.technicianName || 'N/A'}" para "${technicianName}".`);
                 changed = true;
             }
             if (notes) {
                 updateNotes.push(`Adicionada observação.`);
                 changed = true;
             }

             if (!changed) {
                 alert("Nenhuma alteração detectada (Status, Técnico ou Observações).");
                 // closeModal('os-details-modal'); // Fecha mesmo se não mudou? Ou deixa aberto? Deixar aberto.
                 return;
             }

            const updateEntry = {
                timestamp: new Date().toISOString(),
                status: newStatus,
                notes: notes, // Nota digitada pelo técnico/admin
                changedBy: loggedInUser.name, // Quem fez a alteração
                technicianName: technicianName // Registra o nome do técnico no momento da atualização
                // details: updateNotes.join(' ') // Opcional: descrição automática das mudanças
            };

            // Garante que os.updates exista
            if (!serviceOrders[osIndex].updates) {
                serviceOrders[osIndex].updates = [];
            }

            serviceOrders[osIndex].updates.push(updateEntry);
            serviceOrders[osIndex].status = newStatus;
            serviceOrders[osIndex].technicianId = technicianId || null;
            serviceOrders[osIndex].technicianName = technicianName;


            saveData();
            closeModal('os-details-modal');

            // Atualiza a lista relevante
            if (loggedInUser.role === USER_ROLES.TECHNICIAN) {
                 applyFilters();
             } else if (loggedInUser.role === USER_ROLES.ADMIN) {
                 // Se o admin estiver na tela de técnico (improvável aqui) ou painel admin, atualiza
                 // A melhor abordagem seria atualizar a view atual, mas para simplificar:
                 if (getElement('technician-dashboard').checkVisibility()) {
                     applyFilters();
                 } else if (getElement('admin-panel').checkVisibility()){
                      // Atualizar alguma view no admin panel se necessário (ex: dashboard)
                      displayAdminDashboardSummary();
                 }
             } else if (loggedInUser.role === USER_ROLES.USER) {
                displayUserOSList();
            }
             alert('Ordem de Serviço atualizada com sucesso!');

        };

        // --- Funções do Painel Administrativo ---
        const displayAdminPanel = () => {
            getElement('admin-welcome-name').textContent = loggedInUser.name;
            showAdminSection('admin-dashboard'); // Começa pelo dashboard
        };

        const showAdminSection = (sectionId) => {
            ['admin-dashboard', 'admin-approve-users', 'admin-manage-users', 'admin-reports'].forEach(id => hide(id));
             // Esconder formulário de add/edit usuário por padrão
             hide('admin-add-edit-user-form');
             getElement('admin-add-edit-user-form').reset(); // Reset form
             getElement('admin-edit-user-id').value = ''; // Clear edit ID

             show(sectionId);
             // Carrega dados específicos da seção
             if (sectionId === 'admin-dashboard') displayAdminDashboardSummary();
             if (sectionId === 'admin-approve-users') displayPendingUsers();
             if (sectionId === 'admin-manage-users') displayAllUsers();
             if (sectionId === 'admin-reports') {
                 getElement('report-output').innerHTML = ''; // Limpa output anterior
                 hide('export-buttons');
             }
        };

         const displayAdminDashboardSummary = () => {
            const summaryContainer = getElement('admin-summary');
            const totalOS = serviceOrders.length;
            const openOS = serviceOrders.filter(os => os.status === OS_STATUS.ABERTA).length;
            const progressOS = serviceOrders.filter(os => os.status === OS_STATUS.EM_ANDAMENTO).length;
            const closedOS = serviceOrders.filter(os => os.status === OS_STATUS.CONCLUIDA).length;
            const pendingUsersCount = users.filter(u => !u.approved).length;
            const totalUsers = users.length;
            const technicianCount = users.filter(u => u.role === USER_ROLES.TECHNICIAN && u.approved).length;

            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h4>Ordens de Serviço</h4>
                    <p>Total: ${totalOS}</p>
                    <p>Abertas: <span style="color: var(--info-color); font-weight: bold;">${openOS}</span></p>
                    <p>Em Andamento: <span style="color: var(--warning-color); font-weight: bold;">${progressOS}</span></p>
                    <p>Concluídas: <span style="color: var(--success-color); font-weight: bold;">${closedOS}</span></p>
                </div>
                <div class="summary-card">
                    <h4>Usuários</h4>
                     <p>Total Cadastrados: ${totalUsers}</p>
                    <p>Técnicos Ativos: ${technicianCount}</p>
                    <p>Usuários Pendentes: <span style="color: var(--danger-color); font-weight: bold;">${pendingUsersCount}</span></p>
                </div>
                 <div class="summary-card">
                     <h4>OS por Prioridade (Abertas/Andamento)</h4>
                     <p>Crítica: ${serviceOrders.filter(os => os.priority === OS_PRIORITY.CRITICA && os.status !== OS_STATUS.CONCLUIDA).length}</p>
                     <p>Alta: ${serviceOrders.filter(os => os.priority === OS_PRIORITY.ALTA && os.status !== OS_STATUS.CONCLUIDA).length}</p>
                     <p>Média: ${serviceOrders.filter(os => os.priority === OS_PRIORITY.MEDIA && os.status !== OS_STATUS.CONCLUIDA).length}</p>
                     <p>Baixa: ${serviceOrders.filter(os => os.priority === OS_PRIORITY.BAIXA && os.status !== OS_STATUS.CONCLUIDA).length}</p>
                 </div>
            `;
         };

        const displayPendingUsers = () => {
            const pendingList = getElement('pending-users-list');
            const pending = users.filter(u => !u.approved);

            if (pending.length === 0) {
                pendingList.innerHTML = '<p>Nenhum usuário aguardando aprovação.</p>';
                return;
            }

            pendingList.innerHTML = `
                <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Departamento</th>
                            <th>Email</th>
                            <th>WhatsApp</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pending.map(user => `
                            <tr>
                                <td>${user.name}</td>
                                <td>${user.department}</td>
                                <td>${user.email}</td>
                                <td>${user.whatsapp}</td>
                                <td>
                                    <button class="button button-success button-small" onclick="approveUser('${user.id}')">Aprovar</button>
                                    <button class="button button-danger button-small" onclick="rejectUser('${user.id}')">Rejeitar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            `;
        };

        const approveUser = (userId) => {
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex > -1) {
                users[userIndex].approved = true;
                saveData();
                displayPendingUsers(); // Atualiza a lista de pendentes
                 displayAllUsers(); // Atualiza a lista geral também (se estiver visível)
                 displayAdminDashboardSummary(); // Atualiza contagem no dashboard
                 alert(`Usuário ${users[userIndex].name} aprovado com sucesso.`);
            }
        };

         const rejectUser = (userId) => {
              const user = users.find(u => u.id === userId);
              if (!user) return;
             showConfirmationModal(
                 `Tem certeza que deseja REJEITAR e EXCLUIR o cadastro pendente de "${user.name}" (${user.email})? Esta ação não pode ser desfeita.`,
                 () => {
                     users = users.filter(u => u.id !== userId);
                     saveData();
                     displayPendingUsers();
                     displayAllUsers(); // Atualiza a lista geral também
                     displayAdminDashboardSummary(); // Atualiza contagem no dashboard
                     alert('Usuário rejeitado e removido com sucesso.');
                 }
             );
         };

         const displayAllUsers = () => {
            const allUsersList = getElement('all-users-list');
             // Ordena por nome, case-insensitive
             const sortedUsers = [...users].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

            if (sortedUsers.length === 0) {
                 allUsersList.innerHTML = '<p>Nenhum usuário cadastrado.</p>';
                 return;
             }

             allUsersList.innerHTML = `
                <h4>Todos os Usuários (${sortedUsers.length})</h4>
                 <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Departamento</th>
                            <th>Email</th>
                            <th>Perfil</th>
                            <th>Status</th>
                             <th class="hide-mobile">WhatsApp</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedUsers.map(user => `
                            <tr class="${user.id === loggedInUser.id ? 'logged-in-user-row' : ''}" style="${user.id === loggedInUser.id ? 'font-weight: bold; background-color: #eef;' : ''}">
                                <td>${user.name || 'N/A'} ${user.id === loggedInUser.id ? '(Você)' : ''}</td>
                                <td>${user.department || 'N/A'}</td>
                                <td>${user.email || 'N/A'}</td>
                                <td>${(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}</td>
                                <td><span class="${user.approved ? 'os-status-concluida' : 'os-status-pendente'}">${user.approved ? 'Aprovado' : 'Pendente'}</span></td>
                                <td class="hide-mobile">${user.whatsapp || 'N/A'}</td>
                                <td>
                                    <button class="button button-warning button-small" onclick="showEditUserForm('${user.id}')">Editar</button>
                                    ${user.id !== loggedInUser.id ? // Não permite excluir a si mesmo
                                     `<button class="button button-danger button-small" onclick="deleteUser('${user.id}')">Excluir</button>`
                                     : ''}
                                      ${!user.approved ? // Botão extra para aprovar aqui também
                                     `<button class="button button-success button-small" onclick="approveUser('${user.id}')" style="margin-left: 5px;">Aprovar</button>`
                                     : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            `;
         };

         const showAddUserForm = () => {
             getElement('admin-add-edit-user-form').reset();
             getElement('admin-edit-user-id').value = ''; // Garante que não está editando
             getElement('admin-user-form-title').textContent = 'Adicionar Novo Usuário/Técnico';
             getElement('admin-user-password').placeholder = 'Senha (obrigatória para novo usuário)';
              getElement('admin-password-hint').textContent = 'Senha é obrigatória para novo usuário.';
             getElement('admin-user-password').required = true; // Senha obrigatória ao adicionar
              getElement('admin-user-email').disabled = false; // Email pode ser editado ao adicionar
             show('admin-add-edit-user-form');
             getElement('admin-user-name').focus(); // Foca no nome
         };

          const showEditUserForm = (userId) => {
             const user = users.find(u => u.id === userId);
             if (!user) return;

             getElement('admin-add-edit-user-form').reset();
             getElement('admin-edit-user-id').value = user.id;
             getElement('admin-user-form-title').textContent = `Editar Usuário: ${user.name}`;
             getElement('admin-user-name').value = user.name || '';
             getElement('admin-user-department').value = user.department || '';
             getElement('admin-user-whatsapp').value = user.whatsapp || '';
             getElement('admin-user-email').value = user.email || '';
             getElement('admin-user-role').value = user.role || 'user';
             getElement('admin-user-approved').value = user.approved ? 'true' : 'false';
             getElement('admin-user-password').placeholder = 'Deixe em branco para não alterar a senha';
             getElement('admin-password-hint').textContent = 'Deixe em branco para não alterar a senha.';
             getElement('admin-user-password').required = false; // Senha não obrigatória ao editar

              // Não permitir editar o email do admin especial para evitar problemas de login
              if (user.email === SPECIAL_ADMIN_EMAIL) {
                  getElement('admin-user-email').disabled = true;
              } else {
                  getElement('admin-user-email').disabled = false;
              }


             show('admin-add-edit-user-form');
             getElement('admin-user-name').focus(); // Foca no nome
         };

         const handleAdminUserFormSubmit = (event) => {
             event.preventDefault();
             const userId = getElement('admin-edit-user-id').value;
             const name = getElement('admin-user-name').value.trim();
             const department = getElement('admin-user-department').value.trim();
             const whatsapp = getElement('admin-user-whatsapp').value.trim();
             const emailInput = getElement('admin-user-email');
             const email = emailInput.value.trim().toLowerCase();
             const password = getElement('admin-user-password').value; // Não trim(), senha pode ter espaços
             const role = getElement('admin-user-role').value;
             const approved = getElement('admin-user-approved').value === 'true';

             // Validações básicas
             if (!name || !department || !whatsapp || !email || !role) {
                 alert('Erro: Preencha todos os campos obrigatórios (Nome, Depto, WhatsApp, Email, Perfil).');
                 return;
             }
             if (!userId && !password) { // Senha obrigatória só ao adicionar
                 alert('Erro: A senha é obrigatória para novos usuários.');
                  getElement('admin-user-password').focus();
                 return;
             }
              if (!/\S+@\S+\.\S+/.test(email)) {
                 alert('Erro: Formato de e-mail inválido.');
                 getElement('admin-user-email').focus();
                 return;
             }

             // Validação de e-mail e telefone duplicados (exceto se for o próprio usuário sendo editado)
            const normalizedNewPhone = normalizePhone(whatsapp);
            const isDuplicate = users.some(u => u.id !== userId &&
                 (u.email === email || (u.whatsapp && normalizePhone(u.whatsapp) === normalizedNewPhone && normalizedNewPhone !== ''))
             );
             if (isDuplicate) {
                 alert('Erro: Este e-mail ou telefone já está sendo usado por outro usuário.');
                 return;
             }
             // Impede usar o email reservado do admin, exceto ao editar o próprio admin
              if (email === SPECIAL_ADMIN_EMAIL && (!userId || users.find(u => u.id === userId)?.email !== SPECIAL_ADMIN_EMAIL)) {
                  alert(`Erro: O e-mail "${SPECIAL_ADMIN_EMAIL}" é reservado para o administrador principal.`);
                  return;
              }


             if (userId) { // Editando usuário existente
                 const userIndex = users.findIndex(u => u.id === userId);
                 if (userIndex > -1) {
                     const oldUser = users[userIndex];
                     // Atualiza o nome/depto nas OSs se mudou
                     if (oldUser.name !== name || oldUser.department !== department) {
                         serviceOrders = serviceOrders.map(os => {
                            if (os.userId === userId) {
                                return { ...os, userName: name, userDepartment: department };
                            }
                            return os;
                        });
                     }
                     // Atualiza nome do técnico nas OSs se era técnico e mudou nome
                      if (oldUser.role === USER_ROLES.TECHNICIAN && oldUser.name !== name) {
                           serviceOrders = serviceOrders.map(os => {
                            if (os.technicianId === userId) {
                                return { ...os, technicianName: name };
                            }
                            return os;
                        });
                      }


                     users[userIndex] = {
                         ...users[userIndex], // Mantém o ID
                         name,
                         department,
                         whatsapp,
                         email: emailInput.disabled ? oldUser.email : email, // Usa email antigo se estava desabilitado
                         role,
                         approved,
                         password: password ? password : users[userIndex].password // Atualiza senha apenas se fornecida
                     };
                     alert('Usuário atualizado com sucesso!');

                      // Atualiza dados do usuário logado se ele mesmo foi editado
                      if (loggedInUser && loggedInUser.id === userId) {
                         loggedInUser = users[userIndex];
                     }

                 } else {
                     alert('Erro: Usuário não encontrado para edição.');
                     return;
                 }
             } else { // Adicionando novo usuário
                 const newUser = {
                     id: generateId(),
                     name, department, whatsapp, email, password, role, approved
                 };
                 users.push(newUser);
                 alert('Usuário adicionado com sucesso!');
             }

             saveData();
             hide('admin-add-edit-user-form');
             displayAllUsers(); // Atualiza a lista
             displayPendingUsers(); // Atualiza pendentes caso status mude
             displayAdminDashboardSummary(); // Atualiza contagens
             populateTechnicianDropdown('os-details-technician'); // Atualiza dropdown de técnicos se houver mudança
         };


         const deleteUser = (userId) => {
             const user = users.find(u => u.id === userId);
             if (!user) return;
             if (user.id === loggedInUser.id) {
                 alert("Você não pode excluir seu próprio usuário.");
                 return;
             }
             // Impede excluir o admin especial
             if (user.email === SPECIAL_ADMIN_EMAIL) {
                  alert("Não é possível excluir o administrador principal do sistema.");
                  return;
             }

             // Verifica se há OS associadas ao usuário (como solicitante)
             const userHasOS = serviceOrders.some(os => os.userId === userId);
             // Verifica se o usuário é um técnico com OS associadas (não concluídas)
             const techHasOpenOS = user.role === USER_ROLES.TECHNICIAN && serviceOrders.some(os => os.technicianId === userId && os.status !== OS_STATUS.CONCLUIDA);

             let confirmationMessage = `Tem certeza que deseja excluir o usuário "${user.name}" (${user.email})?`;
             if (userHasOS) {
                 confirmationMessage += `\n\nAVISO: Este usuário possui Ordens de Serviço registradas. As OSs permanecerão no sistema, mas podem ficar sem referência direta ao solicitante excluído.`;
             }
              if (techHasOpenOS) {
                 confirmationMessage += `\n\nAVISO IMPORTANTE: Este técnico possui Ordens de Serviço ABERTAS ou EM ANDAMENTO atribuídas a ele. Ao excluir, estas OSs ficarão SEM TÉCNICO atribuído.`;
             } else if (user.role === USER_ROLES.TECHNICIAN && serviceOrders.some(os => os.technicianId === userId)) {
                  confirmationMessage += `\n\nAVISO: Este técnico possui OSs CONCLUÍDAS associadas. A exclusão manterá o nome dele no histórico dessas OSs.`;
             }
             confirmationMessage += `\n\nEsta ação não pode ser desfeita.`;

             showConfirmationModal(
                 confirmationMessage,
                 () => {
                      // Desassociar técnico das OSs ABERTAS/EM ANDAMENTO antes de excluir
                      if (user.role === USER_ROLES.TECHNICIAN) {
                          serviceOrders = serviceOrders.map(os => {
                             if (os.technicianId === userId && os.status !== OS_STATUS.CONCLUIDA) {
                                  console.log(`Desassociando técnico ${user.name} da OS ${os.id}`);
                                 return { ...os, technicianId: null, technicianName: 'Não atribuído' };
                             }
                             // Para OS concluídas, mantém o nome do técnico original para histórico
                             return os;
                          });
                      }

                     users = users.filter(u => u.id !== userId);

                     saveData();
                     displayAllUsers();
                     displayPendingUsers(); // Atualiza caso fosse pendente
                     displayAdminDashboardSummary(); // Atualiza contagens
                     populateTechnicianDropdown('os-details-technician'); // Atualiza dropdown de técnicos
                     alert('Usuário excluído com sucesso.');
                 }
             );
         };

         // --- Funções de Relatório e Exportação ---
         const generateReport = () => {
             const reportType = getElement('report-type').value;
             const dateStart = getElement('report-date-start').value;
             const dateEnd = getElement('report-date-end').value;
             const statusFilter = getElement('report-status-filter').value;
             const reportOutput = getElement('report-output');
             reportOutput.innerHTML = '<p>Gerando relatório...</p>';
             hide('export-buttons');
             currentReportData = []; // Limpa dados anteriores

             if (!reportType) {
                 reportOutput.innerHTML = '<p class="error-message">Por favor, selecione um tipo de relatório.</p>';
                 return;
             }

             let dataToReport = [];
             let reportTitle = '';
             let tableHeaders = [];
             let tableRowsHTML = ''; // Usar para construir o HTML da tabela

             // Filtrar OS por data e status (se aplicável)
             let filteredOS = serviceOrders.filter(os => {
                 let match = true;
                 if (statusFilter && os.status !== statusFilter) match = false;
                 if (dateStart) {
                    try {
                        const startDate = new Date(dateStart + "T00:00:00");
                        if (new Date(os.createdDate) < startDate) match = false;
                    } catch(e){ console.warn("Data inicial inválida");}
                 }
                 if (dateEnd) {
                      try {
                         const endDate = new Date(dateEnd + "T23:59:59");
                         if (new Date(os.createdDate) > endDate) match = false;
                      } catch(e){ console.warn("Data final inválida");}
                 }
                 return match;
             });

             // Processamento e formatação dos dados para cada tipo de relatório
             switch (reportType) {
                case 'all_os':
                    reportTitle = `Relatório de Todas as OS ${buildDateFilterTitle(dateStart, dateEnd, statusFilter)}`;
                    tableHeaders = ['ID', 'Tipo', 'Solicitante', 'Depto.', 'Status', 'Prioridade', 'Técnico', 'Data Abertura', 'Feedback?'];
                    dataToReport = filteredOS.map(os => ({
                        ID: os.id.substring(3, 8),
                        Tipo: os.problemType || 'N/A',
                        Solicitante: os.userName || 'N/A',
                        Depto: os.userDepartment || 'N/A',
                        Status: os.status || 'N/A',
                        Prioridade: os.priority || 'N/A',
                        Tecnico: os.technicianName || 'N/A',
                        DataAbertura: formatDate(os.createdDate),
                        Feedback: os.feedback ? 'Sim' : 'Não'
                    }));
                    tableRowsHTML = dataToReport.map(row => `
                        <tr>
                            <td>${row.ID}</td>
                            <td>${row.Tipo}</td>
                            <td>${row.Solicitante}</td>
                            <td>${row.Depto}</td>
                            <td>${row.Status}</td>
                            <td>${row.Prioridade}</td>
                            <td>${row.Tecnico}</td>
                            <td>${row.DataAbertura}</td>
                            <td>${row.Feedback}</td>
                        </tr>`).join('');
                    break;

                 case 'technician':
                     reportTitle = `Relatório de OS por Técnico ${buildDateFilterTitle(dateStart, dateEnd, statusFilter)}`;
                     const technicians = users.filter(u => u.role === USER_ROLES.TECHNICIAN && u.approved);
                     let osByTechnician = {};
                     // Inclui técnicos mesmo sem OS no período e OS não atribuídas
                     technicians.forEach(t => osByTechnician[t.id] = { name: t.name, count: 0, os: [] });
                     osByTechnician['unassigned'] = { name: 'Não Atribuído', count: 0, os: [] };

                     filteredOS.forEach(os => {
                         const techId = os.technicianId || 'unassigned';
                         if (osByTechnician[techId]) { // Garante que o ID do técnico existe
                             osByTechnician[techId].count++;
                             osByTechnician[techId].os.push(os);
                         } else {
                              // Se uma OS tem um techId que não está mais nos usuários (excluído?)
                              osByTechnician[techId] = { name: os.technicianName || `ID: ${techId}`, count: 1, os: [os] };
                         }
                     });

                     tableHeaders = ['Técnico', 'Total OS Atribuídas', 'Detalhes (ID / Solicitante / Status)'];
                      // Transforma em array, ordena por nome do técnico
                     dataToReport = Object.values(osByTechnician).sort((a,b) => a.name.localeCompare(b.name));
                     tableRowsHTML = dataToReport.map(techData => `
                         <tr>
                             <td>${techData.name}</td>
                             <td>${techData.count}</td>
                             <td style="font-size: 0.85em;">${techData.os.length > 0 ? techData.os.map(os => `#${os.id.substring(3,8)} (${os.userName} - ${os.status})`).join('<br>') : 'Nenhuma OS no período/filtro'}</td>
                         </tr>`).join('');
                     // Prepara dados para CSV (sem HTML)
                     dataToReport = dataToReport.map(techData => ({
                         Tecnico: techData.name,
                         TotalOS: techData.count,
                         // Opcional: Listar IDs para CSV? Pode ficar muito longo.
                         // OS_IDs: techData.os.map(os => os.id.substring(3,8)).join('; ')
                     }));
                     break;

                 case 'department':
                     reportTitle = `Relatório de OS por Departamento ${buildDateFilterTitle(dateStart, dateEnd, statusFilter)}`;
                     let osByDepartment = {};
                     filteredOS.forEach(os => {
                         const dept = os.userDepartment || 'Desconhecido';
                         if (!osByDepartment[dept]) {
                             osByDepartment[dept] = { count: 0, os: [] };
                         }
                         osByDepartment[dept].count++;
                         osByDepartment[dept].os.push(os);
                     });
                     tableHeaders = ['Departamento', 'Total OS', 'Detalhes (ID / Tipo / Status)'];
                     dataToReport = Object.entries(osByDepartment)
                                         .map(([name, data]) => ({ name, ...data }))
                                         .sort((a,b) => a.name.localeCompare(b.name)); // Ordena por nome do depto
                     tableRowsHTML = dataToReport.map(deptData => `
                         <tr>
                             <td>${deptData.name}</td>
                             <td>${deptData.count}</td>
                              <td style="font-size: 0.85em;">${deptData.os.map(os => `#${os.id.substring(3,8)} (${os.problemType} - ${os.status})`).join('<br>')}</td>
                         </tr>`).join('');
                      // Prepara dados para CSV
                     dataToReport = dataToReport.map(deptData => ({
                          Departamento: deptData.name,
                          TotalOS: deptData.count,
                     }));
                     break;

                 case 'problem_type':
                     reportTitle = `Relatório de OS por Tipo de Problema ${buildDateFilterTitle(dateStart, dateEnd, statusFilter)}`;
                     let osByProblemType = {};
                     filteredOS.forEach(os => {
                         const type = os.problemType || 'Outros';
                         if (!osByProblemType[type]) {
                             osByProblemType[type] = { count: 0, os: [] };
                         }
                         osByProblemType[type].count++;
                         osByProblemType[type].os.push(os);
                     });
                     tableHeaders = ['Tipo de Problema', 'Total OS', 'Detalhes (ID / Solicitante / Status)'];
                      dataToReport = Object.entries(osByProblemType)
                                         .map(([name, data]) => ({ name, ...data }))
                                         .sort((a,b) => a.name.localeCompare(b.name)); // Ordena por tipo
                     tableRowsHTML = dataToReport.map(typeData => `
                         <tr>
                             <td>${typeData.name}</td>
                             <td>${typeData.count}</td>
                              <td style="font-size: 0.85em;">${typeData.os.map(os => `#${os.id.substring(3,8)} (${os.userName} - ${os.status})`).join('<br>')}</td>
                         </tr>`).join('');
                      // Prepara dados para CSV
                      dataToReport = dataToReport.map(typeData => ({
                          TipoProblema: typeData.name,
                          TotalOS: typeData.count,
                      }));
                     break;

                 case 'all_users':
                     reportTitle = 'Relatório de Todos os Usuários';
                     tableHeaders = ['ID', 'Nome', 'Departamento', 'Email', 'Perfil', 'Status', 'WhatsApp'];
                     // Usa a lista de usuários diretamente, ordenada por nome
                     dataToReport = [...users]
                         .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                         .map(u => ({
                             ID: u.id.substring(3, 8),
                             Nome: u.name || 'N/A',
                             Departamento: u.department || 'N/A',
                             Email: u.email || 'N/A',
                             Perfil: (u.role || 'user').charAt(0).toUpperCase() + (u.role || 'user').slice(1),
                             Status: u.approved ? 'Aprovado' : 'Pendente',
                             WhatsApp: u.whatsapp || 'N/A'
                     }));
                      tableRowsHTML = dataToReport.map(row => `
                        <tr>
                            <td>${row.ID}</td>
                            <td>${row.Nome}</td>
                            <td>${row.Departamento}</td>
                            <td>${row.Email}</td>
                            <td>${row.Perfil}</td>
                            <td>${row.Status}</td>
                             <td>${row.WhatsApp}</td>
                        </tr>`).join('');
                     break;

                 default:
                     reportOutput.innerHTML = '<p class="error-message">Tipo de relatório inválido.</p>';
                     return;
             }

             // Exibe o relatório na tela
             const totalRegistros = dataToReport.length; // Usa o array preparado para CSV/exportação
             if (totalRegistros > 0) {
                 reportOutput.innerHTML = `
                    <h3>${reportTitle}</h3>
                    <p>Total de registros: ${totalRegistros}</p>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead><tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                            <tbody>${tableRowsHTML}</tbody>
                        </table>
                    </div>
                 `;
                 currentReportData = dataToReport; // Armazena dados formatados para exportação
                 show('export-buttons');
             } else {
                 reportOutput.innerHTML = `<h3>${reportTitle}</h3><p>Nenhum dado encontrado para este relatório com os filtros aplicados.</p>`;
                 hide('export-buttons');
             }
         };


         const buildDateFilterTitle = (start, end, status) => {
            let titleParts = [];
            if (start || end) {
                 const startDateFormatted = start ? formatDate(start+'T00:00:00').split(' ')[0] : 'Início';
                 const endDateFormatted = end ? formatDate(end+'T23:59:59').split(' ')[0] : 'Fim';
                 titleParts.push(`Período: ${startDateFormatted} a ${endDateFormatted}`);
            }
            if (status) {
                 titleParts.push(`Status: ${status}`);
            }
             return titleParts.length > 0 ? `(${titleParts.join(', ')})` : '';
        }

         const exportReportData = (format) => {
            if (!currentReportData || currentReportData.length === 0) {
                alert("Nenhum dado de relatório gerado para exportar. Por favor, gere um relatório primeiro.");
                return;
            }

            const reportType = getElement('report-type').value || 'dados';
             const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
             const filenameBase = `relatorio_${reportType}_${timestamp}`;

             if (format === 'csv') {
                 exportToCSV(currentReportData, `${filenameBase}.csv`);
             } else if (format === 'excel') {
                 alert("Exportação para Excel (.xlsx) não está implementada nesta versão (requer biblioteca externa como SheetJS). Use CSV.");
             } else if (format === 'pdf') {
                 alert("Exportação para PDF não está implementada nesta versão (requer biblioteca externa como jsPDF). Use CSV ou a função de impressão do navegador (Ctrl+P).");
             }
         };

         const exportToCSV = (data, filename) => {
             if (!data || data.length === 0) return;

             const headers = Object.keys(data[0]);
             const csvRows = [];

             // Adiciona cabeçalho - Excel prefere delimitador ; em PT-BR
             csvRows.push(headers.join(';'));

             // Adiciona linhas de dados
             for (const row of data) {
                 const values = headers.map(header => {
                     // Trata valores nulos/undefined e converte para string
                     let cellValue = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                     // Escapa aspas duplas existentes
                     cellValue = cellValue.replace(/"/g, '""');
                     // Envolve em aspas duplas se contiver ; , " ou quebra de linha
                     if (cellValue.includes(';') || cellValue.includes('"') || cellValue.includes('\n')) {
                         cellValue = `"${cellValue}"`;
                     }
                     return cellValue;
                 });
                 csvRows.push(values.join(';')); // Usa ; como delimitador
             }

             const csvString = csvRows.join('\n');
             // Adiciona BOM para UTF-8 ser reconhecido corretamente pelo Excel
             const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });

             // Cria link para download
             const link = document.createElement("a");
             if (link.download !== undefined) { // Verifica suporte a download
                 const url = URL.createObjectURL(blob);
                 link.setAttribute("href", url);
                 link.setAttribute("download", filename);
                 link.style.visibility = 'hidden';
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
                 URL.revokeObjectURL(url); // Libera memória
             } else {
                  // Fallback para navegadores que não suportam download direto
                  alert("Seu navegador não suporta download direto. O conteúdo CSV será aberto em uma nova aba (copie e cole se necessário).");
                  const encodedUri = encodeURI(`data:text/csv;charset=utf-8,\uFEFF${csvString}`);
                  window.open(encodedUri);
             }
         };


        // --- Funções de Modal ---
        const showModal = (modalId) => {
            const modal = getElement(modalId);
            if (modal) modal.style.display = 'block';
        };

        const closeModal = (modalId) => {
             const modal = getElement(modalId);
            if (modal) modal.style.display = 'none';
             // Limpa callback de confirmação ao fechar
             if (modalId === 'confirmation-modal') {
                 confirmActionCallback = null;
                 getElement('confirm-action-btn').onclick = null; // Remove listener antigo
             }
        };

        const showConfirmationModal = (message, onConfirm) => {
             getElement('confirmation-message').textContent = message;
             confirmActionCallback = onConfirm; // Armazena a função a ser executada
             // Garante que o botão de confirmação executa a callback correta
             const confirmBtn = getElement('confirm-action-btn');
              // Remove listener antigo para evitar múltiplas execuções
             confirmBtn.onclick = null;
              confirmBtn.onclick = () => {
                 if (typeof confirmActionCallback === 'function') {
                     confirmActionCallback();
                 }
                 closeModal('confirmation-modal');
             };
             showModal('confirmation-modal');
        };

        // --- Funções Auxiliares ---
        const populateTechnicianDropdown = (selectId) => {
            const select = getElement(selectId);
            if (!select) return;
            const currentVal = select.value; // Salva valor atual se houver
            select.innerHTML = '<option value="">-- Não Atribuído --</option>'; // Opção padrão
            const technicians = users.filter(u => u.role === USER_ROLES.TECHNICIAN && u.approved)
                                     .sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
            technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = tech.name || 'Técnico sem nome';
                select.appendChild(option);
            });
             // Restaura valor se possível e se a opção ainda existir
             if (select.querySelector(`option[value="${currentVal}"]`)) {
                select.value = currentVal;
             } else {
                 select.value = ""; // Volta para não atribuído se o técnico anterior não existe mais
             }
        };

        // --- Inicialização e Event Listeners ---
        const initApp = () => {
            console.log("Inicializando aplicação de OS PMA...");
            loadData();

            // --- Event Listeners ---

            // Login/Register Navigation
            getElement('login-form')?.addEventListener('submit', handleLogin);
            getElement('register-form')?.addEventListener('submit', handleRegister);
            getElement('show-register-btn')?.addEventListener('click', () => showScreen('register-screen'));
            getElement('show-login-btn')?.addEventListener('click', () => showScreen('login-screen'));

            // Logout Buttons
            getElement('logout-btn-user')?.addEventListener('click', handleLogout);
            getElement('logout-btn-tech')?.addEventListener('click', handleLogout);
            getElement('logout-btn-admin')?.addEventListener('click', handleLogout);

            // User Dashboard Actions
            getElement('show-new-os-form-btn')?.addEventListener('click', () => { toggle('new-os-form'); hide('edit-profile-form'); hide('user-actions'); });
            getElement('cancel-new-os-btn')?.addEventListener('click', () => { hide('new-os-form'); show('user-actions'); getElement('new-os-form').reset(); });
            getElement('new-os-form')?.addEventListener('submit', handleNewOSSubmit);
            getElement('show-edit-profile-form-btn')?.addEventListener('click', () => { toggle('edit-profile-form'); hide('new-os-form'); hide('user-actions'); });
             getElement('cancel-edit-profile-btn')?.addEventListener('click', () => { hide('edit-profile-form'); show('user-actions'); getElement('edit-profile-form').reset(); });
             getElement('edit-profile-form')?.addEventListener('submit', handleEditProfileSubmit);
             getElement('submit-feedback-btn')?.addEventListener('click', handleFeedbackSubmit);

            // Technician Dashboard Actions
            getElement('apply-filters-btn')?.addEventListener('click', applyFilters);
            getElement('reset-filters-btn')?.addEventListener('click', resetFilters);
             getElement('os-details-update-btn')?.addEventListener('click', handleUpdateOS);

            // Admin Panel Actions
            getElement('show-add-user-form-btn')?.addEventListener('click', showAddUserForm);
            getElement('admin-cancel-user-form-btn')?.addEventListener('click', () => hide('admin-add-edit-user-form'));
            getElement('admin-add-edit-user-form')?.addEventListener('submit', handleAdminUserFormSubmit);
            getElement('generate-report-btn')?.addEventListener('click', generateReport);
            getElement('export-csv-btn')?.addEventListener('click', () => exportReportData('csv'));
            getElement('export-excel-btn')?.addEventListener('click', () => exportReportData('excel'));
            getElement('export-pdf-btn')?.addEventListener('click', () => exportReportData('pdf'));

            // Modal Global Close Listeners (X button handled in HTML onclick)
            // Fechar modal clicando fora da área de conteúdo
             window.addEventListener('click', (event) => {
                const modals = document.querySelectorAll('.modal');
                 modals.forEach(modal => {
                     if (event.target == modal) { // Verifica se o clique foi no fundo do modal
                         closeModal(modal.id);
                     }
                 })
            });
             // Fechar modal com a tecla Esc
             window.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    const modals = document.querySelectorAll('.modal');
                    modals.forEach(modal => {
                         if (modal.style.display === 'block') {
                             closeModal(modal.id);
                         }
                     })
                }
             });


            // --- Inicialização da Tela ---
            // Verifica se já está logado ao carregar a página
            navigateToDashboard();
            console.log("Aplicação inicializada.");
        };

        // --- Inicia a aplicação quando o DOM estiver pronto ---
        document.addEventListener('DOMContentLoaded', initApp);

    
