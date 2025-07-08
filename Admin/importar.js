// Arquivo: importar.js

let importSectionInitialized = false;
let customersToImport = []; // Armazena os clientes lidos do CSV

async function initializeImportSection() {
    if (importSectionInitialized) return;
    importSectionInitialized = true;
    console.log("Módulo Importar.js: Inicializando...");

    const fileInput = document.getElementById('csv-file-input');
    const processBtn = document.getElementById('process-csv-btn');
    const previewContainer = document.getElementById('csv-preview-container');
    const previewArea = document.getElementById('csv-preview-area');
    const confirmBtn = document.getElementById('confirm-import-btn');

    processBtn.addEventListener('click', () => {
        if (fileInput.files.length === 0) {
            window.showToast("Por favor, selecione um arquivo CSV primeiro.", "warning");
            return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = function(event) {
            const csvData = event.target.result;
            try {
                customersToImport = parseCSV(csvData);
                renderPreview(customersToImport);
                previewContainer.classList.remove('hidden');
            } catch (e) {
                window.showToast("Erro ao ler o arquivo. Verifique se o formato está correto.", "error");
                console.error(e);
            }
        };
        reader.readAsText(file, 'UTF-8'); // Especifica o encoding para evitar problemas com acentos
    });

    confirmBtn.addEventListener('click', async () => {
        if (customersToImport.length === 0) {
            window.showToast("Nenhum cliente para importar.", "warning");
            return;
        }
        if (!confirm(`Você tem certeza que deseja importar ${customersToImport.length} clientes?`)) {
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';

        try {
            const { doc, writeBatch } = window.firebaseFirestore;
            const db = window.db;
            const batch = writeBatch(db);

            customersToImport.forEach(customer => {
                const whatsapp = customer.whatsapp.replace(/\D/g, '');
                if (whatsapp) { // Só importa se tiver whatsapp, que será o ID
                    const customerDocRef = doc(db, "customer", whatsapp);
                    const customerData = {
                        firstName: customer.nome || "",
                        lastName: customer.sobrenome || "",
                        whatsapp: whatsapp,
                        email: "", // Opcional, pode ser adicionado depois
                        points: 0,
                        address: {
                            street: customer.endereco || "",
                            number: "",
                            neighborhood: "",
                            complement: "",
                            reference: ""
                        },
                        lastUpdatedAt: new Date()
                    };
                    batch.set(customerDocRef, customerData, { merge: true });
                }
            });

            await batch.commit();
            window.showToast(`${customersToImport.length} clientes importados com sucesso!`, "success");
        } catch (error) {
            console.error("Erro ao salvar clientes no Firestore:", error);
            window.showToast("Ocorreu um erro durante a importação.", "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar e Importar Clientes';
        }
    });
}

function parseCSV(text) {
    const lines = text.split(/\r\n|\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = values[index];
        });
        data.push(entry);
    }
    return data;
}

function renderPreview(data) {
    const previewArea = document.getElementById('csv-preview-area');
    if (data.length === 0) {
        previewArea.innerHTML = "<p>Nenhum dado encontrado no arquivo.</p>";
        return;
    }
    const headers = Object.keys(data[0]);
    const table = `
        <table class="admin-table">
            <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${data.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>
    `;
    previewArea.innerHTML = table;
}

window.initializeImportSection = initializeImportSection;