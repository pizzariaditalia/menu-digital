// Arquivo: equipe.js - VERSÃO COM CHAMADA DA CLOUD FUNCTION CORRIGIDA

let equipeSectionInitialized = false;
const USERS_COLLECTION = "panel_users";

async function initializeEquipeSection() {
    if (equipeSectionInitialized) return;
    equipeSectionInitialized = true;
    console.log("Módulo Equipe.js: Inicializando...");

    // Seletores do DOM
    const form = document.getElementById('panel-user-form');
    const formTitle = document.getElementById('panel-user-form-title');
    const nameInput = document.getElementById('panel-user-name');
    const emailInput = document.getElementById('panel-user-email');
    const roleInput = document.getElementById('panel-user-role');
    const passwordInput = document.getElementById('panel-user-password');
    const passwordContainer = document.getElementById('password-fields-container');
    const idHiddenInput = document.getElementById('panel-user-id-hidden');
    const cancelBtn = document.getElementById('cancel-edit-panel-user-btn');
    const listContainer = document.getElementById('panel-users-list-container');
    
    // Funções de Dados
    async function fetchPanelUsers() {
        const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
        const q = query(collection(window.db, USERS_COLLECTION), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function savePanelUserRole(uid, data) {
        const { doc, setDoc } = window.firebaseFirestore;
        await setDoc(doc(window.db, USERS_COLLECTION, uid), data, { merge: true });
    }

    // Funções de UI
    function renderPanelUsers(users) {
        const tableHTML = `
            <div class="table-responsive">
                <table class="admin-table">
                    <thead> <tr> <th>Nome</th> <th>E-mail</th> <th>Cargo</th> <th>Ações</th> </tr> </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr data-id="${user.id}">
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td><span class="tag tag-payment-delivery">${user.role}</span></td>
                                <td class="table-actions"> <button class="btn-icon edit-user-btn"><i class="fas fa-edit"></i></button> </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        listContainer.innerHTML = tableHTML;
        addTableActionListeners(users);
    }
    
    function setFormMode(mode, user = null) {
        form.reset();
        if (mode === 'edit') {
            formTitle.textContent = "Editar Usuário";
            idHiddenInput.value = user.id;
            nameInput.value = user.name;
            emailInput.value = user.email;
            roleInput.value = user.role;
            emailInput.readOnly = true;
            passwordContainer.classList.add('hidden');
            passwordInput.required = false;
        } else { // 'add' mode
            formTitle.textContent = "Adicionar Novo Usuário";
            idHiddenInput.value = '';
            emailInput.readOnly = false;
            passwordContainer.classList.remove('hidden');
            passwordInput.required = true;
        }
    }

    function addTableActionListeners(users) {
        listContainer.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.closest('tr').dataset.id;
                const user = users.find(u => u.id === id);
                if (user) setFormMode('edit', user);
            });
        });
    }

    // Eventos de Formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uid = idHiddenInput.value;
        
        // CORREÇÃO: Chamando a função da forma correta
        const createPanelUser = window.httpsCallable(window.functions, 'createPanelUser');

        if (uid) { // MODO EDIÇÃO
            const dataToUpdate = {
                name: nameInput.value.trim(),
                role: roleInput.value
            };
            await savePanelUserRole(uid, dataToUpdate);
            window.showToast("Cargo do usuário atualizado!");
        } else { // MODO CRIAÇÃO
            const dataToCreate = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value,
                role: roleInput.value
            };
            
            try {
                const result = await createPanelUser(dataToCreate);
                window.showToast(result.data.message, "success");
            } catch (error) {
                console.error("Erro ao criar usuário:", error);
                window.showToast(error.message, "error");
            }
        }
        
        setFormMode('add');
        main();
    });

    cancelBtn.addEventListener('click', () => {
        setFormMode('add');
    });

    // Função Principal
    async function main() {
        try {
            const users = await fetchPanelUsers();
            renderPanelUsers(users);
        } catch (error) {
            console.error("Erro ao carregar lista de usuários:", error);
            listContainer.innerHTML = `<p class="empty-list-message" style="color:red;">Falha ao carregar usuários. Verifique as regras de segurança.</p>`;
        }
    }

    main();
}

window.initializeEquipeSection = initializeEquipeSection;