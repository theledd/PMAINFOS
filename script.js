        // --- Variáveis Globais e Estado da Aplicação ---
        // REMOVIDO: users, serviceOrders, loggedInUser, currentReportData, confirmActionCallback

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
        // REMOVIDO: saveData, loadData e toda lógica de manipulação local

        // --- Funções de Navegação ---
        const showScreen = (screenId) => {
            ['login-screen', 'register-screen', 'user-dashboard', 'technician-dashboard', 'admin-panel'].forEach(id => hide(id));
            show(screenId);
        };

        const navigateToDashboard = (user) => {
            if (!user) {
                showScreen('login-screen');
                return;
            }
            // Aqui você pode diferenciar dashboards por perfil, se quiser
            showScreen('user-dashboard'); // Exemplo: sempre mostra o dashboard do usuário
        };

        // --- Funções de Autenticação ---
        const handleLogin = async (event) => {
            event.preventDefault();
            const identity = getElement('login-identity').value.trim();
            const password = getElement('login-password').value;
            const loginError = getElement('login-error');
            hide(loginError.id);

            if (!identity || !password) {
                loginError.textContent = 'Por favor, preencha o campo de login e senha.';
                show(loginError.id);
                return;
            }

            try {
                // Usa signIn do firebase-config.js
                const user = await signIn(identity, password);
                // Salva usuário logado em memória (opcional: window.currentUser = user)
                // Redireciona para dashboard
                navigateToDashboard(user);
                getElement('login-form').reset();
            } catch (error) {
                loginError.textContent = 'Usuário ou senha inválidos.';
                show(loginError.id);
            }
        };

        const handleRegister = async (event) => {
            event.preventDefault();
            const name = getElement('register-name').value.trim();
            const department = getElement('register-department').value.trim();
            const whatsapp = getElement('register-whatsapp').value.trim();
            const email = getElement('register-email').value.trim().toLowerCase();
            const password = getElement('register-password').value;
            const registerMessage = getElement('register-message');
            hide(registerMessage.id);

            if (!name || !department || !whatsapp || !email || !password) {
                registerMessage.textContent = 'Por favor, preencha todos os campos.';
                registerMessage.className = 'error-message';
                show(registerMessage.id);
                return;
            }
            if (!/\S+@\S+\.\S+/.test(email)) {
                registerMessage.textContent = 'Por favor, insira um e-mail válido.';
                registerMessage.className = 'error-message';
                show(registerMessage.id);
                return;
            }
            try {
                // Usa signUp do firebase-config.js
                await signUp(email, password);
                registerMessage.textContent = 'Cadastro realizado com sucesso! Faça login para continuar.';
                registerMessage.className = 'success-message';
                show(registerMessage.id);
                getElement('register-form').reset();
                setTimeout(() => {
                    hide(registerMessage.id);
                    showScreen('login-screen');
                }, 3000);
            } catch (error) {
                registerMessage.textContent = 'Erro ao cadastrar: ' + (error.message || 'Verifique os dados.');
                registerMessage.className = 'error-message';
                show(registerMessage.id);
            }
        };

        const handleLogout = async () => {
            await signOut();
            showScreen('login-screen');
        };

        // --- Funções da Tela do Usuário ---
        const displayUserDashboard = async () => {
            // Pega o usuário autenticado do Firebase
            const user = firebase.auth().currentUser;
            if (!user) return;
            getElement('user-welcome-name').textContent = user.displayName || user.email;
            hide('new-os-form');
            hide('edit-profile-form');
            show('user-actions');
            await displayUserOSList();
            // Preencher formulário de edição com dados atuais (opcional, se quiser usar dados extras do Firestore)
        };

        const displayUserOSList = async () => {
            const osListContainer = getElement('user-os-list');
            const user = firebase.auth().currentUser;
            if (!user) return;
            // Busca as OS do usuário logado no Firestore
            const allOS = await loadData('ordensDeServico');
            const userOS = (allOS && allOS.ordens) ? allOS.ordens.filter(os => os.userId === user.uid) : [];
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
                    <button class="button button-secondary button-small" onclick="viewOsDetails('${os.id}', false)">Ver Detalhes</button>
                </div>
            `).join('');
        };

        const handleNewOSSubmit = async (event) => {
            event.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Usuário não autenticado!');
                return;
            }
            const problemType = getElement('os-problem-type').value;
            const priority = getElement('os-priority').value;
            const description = getElement('os-description').value.trim();
            if (!problemType || !priority || !description) {
                alert("Por favor, preencha todos os campos da Ordem de Serviço.");
                return;
            }
            const newOS = {
                id: generateId(),
                userId: user.uid,
                userName: user.displayName || user.email,
                problemType: problemType,
                description: description,
                priority: priority,
                status: 'Aberta',
                createdDate: new Date().toISOString(),
            };
            // Salva a nova OS no Firestore
            let allOS = await loadData('ordensDeServico');
            if (!allOS || !allOS.ordens) allOS = { ordens: [] };
            allOS.ordens.push(newOS);
            await saveData('ordensDeServico', allOS);
            getElement('new-os-form').reset();
            hide('new-os-form');
            show('user-actions');
            await displayUserOSList();
            alert('Ordem de Serviço aberta com sucesso!');
        };

        const handleEditProfileSubmit = async (event) => {
            event.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) return;
            const name = getElement('edit-profile-name').value.trim();
            const department = getElement('edit-profile-department').value.trim();
            const whatsapp = getElement('edit-profile-whatsapp').value.trim();
            if (!name || !department || !whatsapp) {
                alert("Por favor, preencha todos os seus dados.");
                return;
            }
            // Atualiza no Firestore
            let allUsers = await loadData('usuarios');
            if (!allUsers || !allUsers.lista) return;
            const userIndex = allUsers.lista.findIndex(u => u.id === user.uid);
            if (userIndex > -1) {
                allUsers.lista[userIndex].name = name;
                allUsers.lista[userIndex].department = department;
                allUsers.lista[userIndex].whatsapp = whatsapp;
                await saveData('usuarios', allUsers);
                alert('Dados atualizados com sucesso!');
                hide('edit-profile-form');
                show('user-actions');
                await displayUserDashboard();
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


        // --- Funções da Tela do Técnico/Admin ---
        const displayTechnicianDashboard = async () => {
            const user = firebase.auth().currentUser;
            if (!user) return;
            getElement('tech-welcome-name').textContent = user.displayName || user.email;
            await resetFilters();
        };

        const displayTechnicianOSList = async (filters = {}) => {
            const osListContainer = getElement('technician-os-list');
            // Busca todas as OS do Firestore
            const allOS = await loadData('ordensDeServico');
            let filteredOS = (allOS && allOS.ordens) ? allOS.ordens : [];
            // Aplica filtros (tipo, depto, status, prioridade, datas)
            if (filters.type) filteredOS = filteredOS.filter(os => os.problemType === filters.type);
            if (filters.department) filteredOS = filteredOS.filter(os => (os.userDepartment || '').toLowerCase().includes(filters.department));
            if (filters.status) filteredOS = filteredOS.filter(os => os.status === filters.status);
            if (filters.priority) filteredOS = filteredOS.filter(os => os.priority === filters.priority);
            if (filters.dateStart) filteredOS = filteredOS.filter(os => new Date(os.createdDate) >= new Date(filters.dateStart + 'T00:00:00'));
            if (filters.dateEnd) filteredOS = filteredOS.filter(os => new Date(os.createdDate) <= new Date(filters.dateEnd + 'T23:59:59'));
            filteredOS.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
            if (filteredOS.length === 0) {
                osListContainer.innerHTML = '<p>Nenhuma Ordem de Serviço encontrada com os filtros aplicados.</p>';
                return;
            }
            osListContainer.innerHTML = filteredOS.map(os => `
                <div class="os-card priority-${os.priority?.toLowerCase() || 'media'}">
                    <h4>OS #${os.id.substring(3, 8)} - ${os.problemType}</h4>
                    <p><strong>Solicitante:</strong> ${os.userName || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="os-status-${os.status?.toLowerCase().replace(' ', '-') || 'aberta'}">${os.status}</span></p>
                    <p><strong>Prioridade:</strong> ${os.priority || 'Média'}</p>
                    <p><strong>Data Abertura:</strong> ${formatDate(os.createdDate)}</p>
                    <p><strong>Descrição:</strong> ${os.description?.length > 100 ? os.description.substring(0, 100) + '...' : os.description}</p>
                    <button class="button button-primary button-small" onclick="viewOsDetails('${os.id}', true)">Gerenciar OS</button>
                </div>
            `).join('');
        };

        const handleUpdateOS = async () => {
            const osId = getElement('os-details-id').value;
            const newStatus = getElement('os-details-status').value;
            const notes = getElement('os-details-notes').value.trim();
            // (Atribuição de técnico pode ser implementada aqui se desejar)
            // Busca todas as OS
            let allOS = await loadData('ordensDeServico');
            if (!allOS || !allOS.ordens) return;
            const osIndex = allOS.ordens.findIndex(o => o.id === osId);
            if (osIndex === -1) {
                alert('Erro: OS não encontrada.');
                return;
            }
            // Atualiza status e histórico
            allOS.ordens[osIndex].status = newStatus;
            if (!allOS.ordens[osIndex].updates) allOS.ordens[osIndex].updates = [];
            allOS.ordens[osIndex].updates.push({
                timestamp: new Date().toISOString(),
                status: newStatus,
                notes: notes,
                changedBy: firebase.auth().currentUser.displayName || firebase.auth().currentUser.email
            });
            await saveData('ordensDeServico', allOS);
            closeModal('os-details-modal');
            await displayTechnicianOSList();
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

        const displayPendingUsers = async () => {
            const pendingList = getElement('pending-users-list');
            const allUsers = await loadData('usuarios');
            const pending = (allUsers && allUsers.lista) ? allUsers.lista.filter(u => !u.approved) : [];
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

        const approveUser = async (userId) => {
            let allUsers = await loadData('usuarios');
            if (!allUsers || !allUsers.lista) return;
            const userIndex = allUsers.lista.findIndex(u => u.id === userId);
            if (userIndex > -1) {
                allUsers.lista[userIndex].approved = true;
                await saveData('usuarios', allUsers);
                await displayPendingUsers();
                alert(`Usuário aprovado com sucesso.`);
            }
        };

        const rejectUser = async (userId) => {
            let allUsers = await loadData('usuarios');
            if (!allUsers || !allUsers.lista) return;
            allUsers.lista = allUsers.lista.filter(u => u.id !== userId);
            await saveData('usuarios', allUsers);
            await displayPendingUsers();
            alert('Usuário rejeitado e removido com sucesso.');
        };

         const displayAllUsers = async () => {
            const allUsersList = getElement('all-users-list');
            const allUsers = await loadData('usuarios');
            const sortedUsers = (allUsers && allUsers.lista) ? [...allUsers.lista].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })) : [];
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
                            <tr>
                                <td>${user.name || 'N/A'}</td>
                                <td>${user.department || 'N/A'}</td>
                                <td>${user.email || 'N/A'}</td>
                                <td>${(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}</td>
                                <td><span class="${user.approved ? 'os-status-concluida' : 'os-status-pendente'}">${user.approved ? 'Aprovado' : 'Pendente'}</span></td>
                                <td class="hide-mobile">${user.whatsapp || 'N/A'}</td>
                                <td>
                                    <button class="button button-warning button-small" onclick="showEditUserForm('${user.id}')">Editar</button>
                                    <button class="button button-danger button-small" onclick="deleteUser('${user.id}')">Excluir</button>
                                    ${!user.approved ? `<button class="button button-success button-small" onclick="approveUser('${user.id}')" style="margin-left: 5px;">Aprovar</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            `;
         };

         const showEditUserForm = async (userId) => {
            const allUsers = await loadData('usuarios');
            if (!allUsers || !allUsers.lista) return;
            const user = allUsers.lista.find(u => u.id === userId);
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
            getElement('admin-user-password').required = false;
            show('admin-add-edit-user-form');
            getElement('admin-user-name').focus();
        };

        const handleAdminUserFormSubmit = async (event) => {
            event.preventDefault();
            const userId = getElement('admin-edit-user-id').value;
            const name = getElement('admin-user-name').value.trim();
            const department = getElement('admin-user-department').value.trim();
            const whatsapp = getElement('admin-user-whatsapp').value.trim();
            const email = getElement('admin-user-email').value.trim().toLowerCase();
            const password = getElement('admin-user-password').value;
            const role = getElement('admin-user-role').value;
            const approved = getElement('admin-user-approved').value === 'true';
            if (!name || !department || !whatsapp || !email || !role) {
                alert('Erro: Preencha todos os campos obrigatórios (Nome, Depto, WhatsApp, Email, Perfil).');
                return;
            }
            let allUsers = await loadData('usuarios');
            if (!allUsers || !allUsers.lista) allUsers = { lista: [] };
            if (userId) {
                // Editando usuário existente
                const userIndex = allUsers.lista.findIndex(u => u.id === userId);
                if (userIndex > -1) {
                    allUsers.lista[userIndex] = {
                        ...allUsers.lista[userIndex],
                        name, department, whatsapp, email, role, approved,
                        password: password ? password : allUsers.lista[userIndex].password
                    };
                    alert('Usuário atualizado com sucesso!');
                } else {
                    alert('Erro: Usuário não encontrado para edição.');
                    return;
                }
            } else {
                // Adicionando novo usuário
                allUsers.lista.push({
                    id: generateId(),
                    name, department, whatsapp, email, password, role, approved
                });
                alert('Usuário adicionado com sucesso!');
            }
            await saveData('usuarios', allUsers);
            hide('admin-add-edit-user-form');
            await displayAllUsers();
            await displayPendingUsers();
        };

        const deleteUser = async (userId) => {
            let allUsers = await loadData('usuarios');
            if (!allUsers || !allUsers.lista) return;
            allUsers.lista = allUsers.lista.filter(u => u.id !== userId);
            await saveData('usuarios', allUsers);
            await displayAllUsers();
            await displayPendingUsers();
            alert('Usuário excluído com sucesso.');
        };

        // --- Funções de Relatório e Exportação ---
        const generateReport = async () => {
            const reportType = getElement('report-type').value;
            const dateStart = getElement('report-date-start').value;
            const dateEnd = getElement('report-date-end').value;
            const statusFilter = getElement('report-status-filter').value;
            const reportOutput = getElement('report-output');
            reportOutput.innerHTML = '<p>Gerando relatório...</p>';
            hide('export-buttons');
            let dataToReport = [];
            let reportTitle = '';
            let tableHeaders = [];
            let tableRowsHTML = '';
            if (!reportType) {
                reportOutput.innerHTML = '<p class="error-message">Por favor, selecione um tipo de relatório.</p>';
                return;
            }
            if (reportType === 'all_os' || reportType === 'technician' || reportType === 'department' || reportType === 'problem_type') {
                const allOS = await loadData('ordensDeServico');
                const osList = (allOS && allOS.ordens) ? allOS.ordens : [];
                // (restante da lógica de filtragem e geração de relatório permanece igual, usando osList)
                // ...
            } else if (reportType === 'all_users') {
                const allUsers = await loadData('usuarios');
                const usersList = (allUsers && allUsers.lista) ? allUsers.lista : [];
                // (restante da lógica de geração de relatório de usuários permanece igual, usando usersList)
                // ...
            }
            // (restante da função permanece igual)
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
           // Adiciona listener de autenticação do Firebase
           firebase.auth().onAuthStateChanged((user) => {
               if (user) {
                   navigateToDashboard(user);
               } else {
                   showScreen('login-screen');
               }
           });

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

   
