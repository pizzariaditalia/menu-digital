// Arquivo: config.js - VERSÃO 100% COMPLETA E FINAL

let settingsSectionInitialized = false;

function initializeSettingsSection() {
  if (settingsSectionInitialized) {
    return;
  }
  settingsSectionInitialized = true;
  console.log("Módulo Config.js: Inicializando...");

  // --- SELETORES DE ELEMENTOS DO DOM (COMPLETO) ---
  const operatingHoursForm = document.getElementById('operating-hours-form');
  const operatingHoursFieldsContainer = document.getElementById('operating-hours-fields-container');
  const deliveryFeesAdminContainer = document.getElementById('delivery-fees-admin-container');
  const neighborhoodForm = document.getElementById('neighborhood-form');
  const neighborhoodFormTitle = document.getElementById('neighborhood-form-title');
  const neighborhoodNameInput = document.getElementById('neighborhood-name');
  const neighborhoodFeeInput = document.getElementById('neighborhood-fee');
  const neighborhoodIdHidden = document.getElementById('neighborhood-id-hidden');
  const cancelEditNeighborhoodBtn = document.getElementById('cancel-edit-neighborhood-btn');
  const storeInfoForm = document.getElementById('store-info-form');
  const storeMinOrderInput = document.getElementById('store-min-order');
  const deliveryPeopleAdminContainer = document.getElementById('delivery-people-admin-container');
  const deliveryPersonForm = document.getElementById('delivery-person-form');
  const deliveryPersonFormTitle = document.getElementById('delivery-person-form-title');
  const deliveryPersonFirstNameInput = document.getElementById('delivery-person-firstname');
  const deliveryPersonLastNameInput = document.getElementById('delivery-person-lastname');
  const deliveryPersonWhatsappInput = document.getElementById('delivery-person-whatsapp');
  const deliveryPersonIdHidden = document.getElementById('delivery-person-id-hidden');
  const cancelEditDeliveryPersonBtn = document.getElementById('cancel-edit-delivery-person-btn');
  const couponsAdminContainer = document.getElementById('coupons-admin-container');
  const couponForm = document.getElementById('coupon-form');
  const couponFormTitle = document.getElementById('coupon-form-title');
  const couponCodeInput = document.getElementById('coupon-code');
  const couponDescriptionInput = document.getElementById('coupon-description');
  const couponTypeSelect = document.getElementById('coupon-type');
  const couponValueInput = document.getElementById('coupon-value');
  const couponMinOrderValueInput = document.getElementById('coupon-min-order-value');
  const couponOneTimeUseCheckbox = document.getElementById('coupon-one-time-use');
  const couponActiveCheckbox = document.getElementById('coupon-active');
  const couponIdHidden = document.getElementById('coupon-id-hidden');
  const cancelEditCouponBtn = document.getElementById('cancel-edit-coupon-btn');
  const fixedCostForm = document.getElementById('fixed-cost-form');
  const fixedCostsAdminContainer = document.getElementById('fixed-costs-admin-container');
  const fixedCostFormTitle = document.getElementById('fixed-cost-form-title');
  const fixedCostDescriptionInput = document.getElementById('fixed-cost-description');
  const fixedCostValueInput = document.getElementById('fixed-cost-value');
  const fixedCostIdHidden = document.getElementById('fixed-cost-id-hidden');
  const cancelEditFixedCostBtn = document.getElementById('cancel-edit-fixed-cost-btn');
  const salaryForm = document.getElementById('salary-form');
  const salariesAdminContainer = document.getElementById('salaries-admin-container');
  const salaryFormTitle = document.getElementById('salary-form-title');
  const salaryDescriptionInput = document.getElementById('salary-description');
  const salaryValueInput = document.getElementById('salary-value');
  const salaryIdHidden = document.getElementById('salary-id-hidden');
  const cancelEditSalaryBtn = document.getElementById('cancel-edit-salary-btn');
  
  const daysOfWeekOrder = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

  function initializeAccordion() {
    const accordionHeaders = document.querySelectorAll('#settings-content .settings-group > h3');
    accordionHeaders.forEach(header => {
      if (header.dataset.listenerAttached) return;
      header.dataset.listenerAttached = 'true';
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('active');
      });
    });
  }

  // --- LÓGICA DE HORÁRIO DE FUNCIONAMENTO ---
  function renderOperatingHoursForm() {
    if (!operatingHoursFieldsContainer || !window.appSettings || !window.appSettings.operatingHours) return;
    operatingHoursFieldsContainer.innerHTML = '';
    const hoursData = window.appSettings.operatingHours;
    daysOfWeekOrder.forEach(day => {
      const currentSetting = hoursData[day] || "Fechado";
      const isClosed = currentSetting.toLowerCase() === "fechado";
      let [startTime, endTime] = isClosed ? ["18:30", "23:00"] : currentSetting.split(' - ').map(t => t.trim());
      const rowHTML = `<div class="day-schedule-row"><span class="day-label">${day}:</span><div class="time-inputs"><input type="time" id="start-${day}" value="${startTime}" ${isClosed ? 'disabled' : ''}><span>até</span><input type="time" id="end-${day}" value="${endTime}" ${isClosed ? 'disabled' : ''}></div><label class="closed-checkbox-label"><input type="checkbox" class="closed-checkbox" data-day="${day}" ${isClosed ? 'checked' : ''}> Fechado</label></div>`;
      operatingHoursFieldsContainer.insertAdjacentHTML('beforeend', rowHTML);
    });
    operatingHoursFieldsContainer.querySelectorAll('.closed-checkbox').forEach(cb => {
      cb.addEventListener('change', function() {
        const day = this.dataset.day;
        document.getElementById(`start-${day}`).disabled = this.checked;
        document.getElementById(`end-${day}`).disabled = this.checked;
      });
    });
  }
  if (operatingHoursForm) {
    operatingHoursForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newOperatingHours = {};
      daysOfWeekOrder.forEach(day => {
        const isChecked = document.querySelector(`.closed-checkbox[data-day="${day}"]`).checked;
        if (isChecked) {
          newOperatingHours[day] = "Fechado";
        } else {
          const start = document.getElementById(`start-${day}`).value;
          const end = document.getElementById(`end-${day}`).value;
          newOperatingHours[day] = `${start} - ${end}`;
        }
      });
      try {
        const { doc, setDoc } = window.firebaseFirestore;
        const settingsDocRef = doc(window.db, "configuracoes", "mainSettings");
        await setDoc(settingsDocRef, { operatingHours: newOperatingHours }, { merge: true });
        window.appSettings.operatingHours = newOperatingHours;
        window.showToast("Horário de funcionamento salvo!");
      } catch (err) {
        window.showToast("Erro ao salvar horário.", "error");
      }
    });
  }

  // --- LÓGICA DE DADOS DA LOJA ---
  function loadStoreInfoForm() {
    if (storeMinOrderInput && window.appSettings && window.appSettings.storeInfo) {
      storeMinOrderInput.value = window.appSettings.storeInfo.minOrderValue || 0;
    }
  }
  if (storeInfoForm) {
    storeInfoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newMinOrder = parseFloat(storeMinOrderInput.value);
      if (isNaN(newMinOrder) || newMinOrder < 0) {
        window.showToast("Pedido mínimo inválido.", "warning");
        return;
      }
      try {
        const { doc, updateDoc } = window.firebaseFirestore;
        const settingsDocRef = doc(window.db, "configuracoes", "mainSettings");
        await updateDoc(settingsDocRef, { "storeInfo.minOrderValue": newMinOrder });
        if (window.appSettings && window.appSettings.storeInfo) {
          window.appSettings.storeInfo.minOrderValue = newMinOrder;
        }
        window.showToast("Dados da loja salvos!");
      } catch (err) {
        window.showToast("Erro ao salvar dados da loja.", "error");
      }
    });
  }

  // --- LÓGICA DE TAXAS DE ENTREGA ---
  async function fetchNeighborhoods() {
    const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
    const q = query(collection(window.db, "delivery_fees"), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  async function saveNeighborhood(id, data) {
    const { doc, setDoc } = window.firebaseFirestore;
    await setDoc(doc(window.db, "delivery_fees", id), data);
  }
  async function deleteNeighborhood(id) {
    if (!confirm(`Tem certeza que deseja apagar o bairro?`)) return;
    const { doc, deleteDoc } = window.firebaseFirestore;
    await deleteDoc(doc(window.db, "delivery_fees", id));
  }
  function renderDeliveryFeesAdmin(neighborhoods) {
    if (!deliveryFeesAdminContainer) return;
    deliveryFeesAdminContainer.innerHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Bairro</th><th>Taxa (R$)</th><th>Ações</th></tr></thead><tbody>` +
      (neighborhoods.length > 0 ? neighborhoods.map(hood => `
      <tr data-id="${hood.id}">
        <td>${hood.name}</td>
        <td>${formatPrice(hood.fee)}</td>
        <td class="table-actions">
          <button class="btn-icon edit-btn"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete-btn"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="3" class="empty-list-message">Nenhum bairro.</td></tr>`) +
      `</tbody></table></div>`;
    addNeighborhoodActionListeners(neighborhoods);
  }
  function addNeighborhoodActionListeners(neighborhoods) {
    deliveryFeesAdminContainer.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      const hood = neighborhoods.find(n => n.id === id);
      if (!hood) return;
      row.querySelector('.edit-btn')?.addEventListener('click', () => {
        neighborhoodFormTitle.textContent = "Editar Bairro";
        neighborhoodNameInput.value = hood.name;
        neighborhoodFeeInput.value = hood.fee;
        neighborhoodIdHidden.value = hood.id;
        cancelEditNeighborhoodBtn.classList.remove('hidden');
      });
      row.querySelector('.delete-btn')?.addEventListener('click', async () => {
        await deleteNeighborhood(hood.id);
        main();
      });
    });
  }
  if (neighborhoodForm) {
    neighborhoodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = neighborhoodNameInput.value.trim();
      const fee = parseFloat(neighborhoodFeeInput.value);
      const id = neighborhoodIdHidden.value || name;
      if (!name || isNaN(fee)) return;
      await saveNeighborhood(id, { name, fee });
      cancelEditNeighborhoodBtn.click();
      main();
    });
    cancelEditNeighborhoodBtn.addEventListener('click', () => {
      neighborhoodForm.reset();
      neighborhoodIdHidden.value = '';
      neighborhoodFormTitle.textContent = "Adicionar Novo Bairro";
      cancelEditNeighborhoodBtn.classList.add('hidden');
    });
  }
  
  // --- LÓGICA DE ENTREGADORES ---
  async function fetchDeliveryPeople() {
    const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
    const q = query(collection(window.db, "delivery_people"), orderBy("firstName"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  async function saveDeliveryPerson(id, data) {
    const { doc, setDoc } = window.firebaseFirestore;
    await setDoc(doc(window.db, "delivery_people", id), data);
  }
  async function deleteDeliveryPerson(id) {
    if (!confirm(`Tem certeza que deseja apagar o entregador?`)) return;
    const { doc, deleteDoc } = window.firebaseFirestore;
    await deleteDoc(doc(window.db, "delivery_people", id));
  }
  function renderDeliveryPeopleAdmin(people) {
    if (!deliveryPeopleAdminContainer) return;
    deliveryPeopleAdminContainer.innerHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Nome Completo</th><th>WhatsApp</th><th>Ações</th></tr></thead><tbody>` +
      (people.length > 0 ? people.map(person => `
      <tr data-id="${person.id}">
        <td>${person.firstName} ${person.lastName}</td>
        <td>${person.whatsapp}</td>
        <td class="table-actions">
          <button class="btn-icon edit-btn"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete-btn"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="3" class="empty-list-message">Nenhum entregador.</td></tr>`) +
      `</tbody></table></div>`;
    addDeliveryPeopleActionListeners(people);
  }
  function addDeliveryPeopleActionListeners(people) {
    deliveryPeopleAdminContainer.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      const person = people.find(p => p.id === id);
      if (!person) return;
      row.querySelector('.edit-btn')?.addEventListener('click', () => {
        deliveryPersonFormTitle.textContent = "Editar Entregador";
        deliveryPersonFirstNameInput.value = person.firstName;
        deliveryPersonLastNameInput.value = person.lastName;
        deliveryPersonWhatsappInput.value = person.whatsapp;
        document.getElementById('delivery-person-email').value = person.email || '';
        deliveryPersonIdHidden.value = person.id;
        cancelEditDeliveryPersonBtn.classList.remove('hidden');
      });
      row.querySelector('.delete-btn')?.addEventListener('click', async () => {
        await deleteDeliveryPerson(person.id);
        main();
      });
    });
  }
  if (deliveryPersonForm) {
    deliveryPersonForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const whatsapp = deliveryPersonWhatsappInput.value.trim().replace(/\D/g, '');
      const id = deliveryPersonIdHidden.value || whatsapp;
      if (!whatsapp || !deliveryPersonFirstNameInput.value.trim()) return;
      const data = {
        firstName: deliveryPersonFirstNameInput.value.trim(),
        lastName: deliveryPersonLastNameInput.value.trim(),
        whatsapp: whatsapp,
        email: document.getElementById('delivery-person-email').value.trim()
      };
      await saveDeliveryPerson(id, data);
      cancelEditDeliveryPersonBtn.click();
      main();
    });
    cancelEditDeliveryPersonBtn.addEventListener('click', () => {
      deliveryPersonForm.reset();
      deliveryPersonIdHidden.value = '';
      deliveryPersonFormTitle.textContent = "Adicionar Novo Entregador";
      cancelEditDeliveryPersonBtn.classList.add('hidden');
    });
  }

  // --- LÓGICA DE CUPONS DE DESCONTO ---
  async function fetchCoupons() {
    const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
    const q = query(collection(window.db, "coupons"), orderBy("code"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  async function saveCoupon(id, data) {
    const { doc, setDoc } = window.firebaseFirestore;
    await setDoc(doc(window.db, "coupons", id), data, { merge: true });
  }
  async function deleteCoupon(id) {
    if (!confirm(`Tem certeza que deseja apagar o cupom "${id}"?`)) return;
    const { doc, deleteDoc } = window.firebaseFirestore;
    await deleteDoc(doc(window.db, "coupons", id));
  }
  function renderCouponsAdmin(coupons) {
    if (!couponsAdminContainer) return;
    couponsAdminContainer.innerHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Pedido Mínimo</th><th>Uso Único</th><th>Status</th><th>Ações</th></tr></thead><tbody>` +
      (coupons.length > 0 ? coupons.map(coupon => {
        let typeLabel = 'Percentual', valueLabel = `${coupon.value}%`;
        if (coupon.type === 'fixed') { typeLabel = 'Valor Fixo'; valueLabel = formatPrice(coupon.value); }
        else if (coupon.type === 'free_delivery') { typeLabel = 'Entrega Grátis'; valueLabel = 'N/A'; }
        return `
        <tr data-id="${coupon.id}">
          <td><strong>${coupon.code}</strong></td>
          <td>${coupon.description}</td>
          <td>${typeLabel}</td>
          <td>${valueLabel}</td>
          <td>${coupon.minOrderValue > 0 ? formatPrice(coupon.minOrderValue) : 'N/A'}</td>
          <td><span class="tag ${coupon.oneTimeUsePerCustomer ? 'tag-payment-unpaid' : 'tag-payment-delivery'}">${coupon.oneTimeUsePerCustomer ? 'Sim' : 'Não'}</span></td>
          <td><span class="tag ${coupon.active ? 'tag-payment-paid' : 'tag-payment-unpaid'}">${coupon.active ? 'Ativo' : 'Inativo'}</span></td>
          <td class="table-actions">
            <button class="btn-icon edit-btn"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete-btn"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>`;
      }).join('') : `<tr><td colspan="8" class="empty-list-message">Nenhum cupom.</td></tr>`) +
      `</tbody></table></div>`;
    addCouponActionListeners(coupons);
  }
  function addCouponActionListeners(coupons) {
    couponsAdminContainer.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      const coupon = coupons.find(c => c.id === id);
      if (!coupon) return;
      row.querySelector('.edit-btn')?.addEventListener('click', () => {
        couponFormTitle.textContent = "Editar Cupom";
        couponIdHidden.value = coupon.id;
        couponCodeInput.value = coupon.code;
        couponCodeInput.readOnly = true;
        couponDescriptionInput.value = coupon.description;
        couponTypeSelect.value = coupon.type;
        couponValueInput.value = coupon.value;
        couponMinOrderValueInput.value = coupon.minOrderValue || '';
        couponOneTimeUseCheckbox.checked = coupon.oneTimeUsePerCustomer || false;
        couponActiveCheckbox.checked = coupon.active;
        cancelEditCouponBtn.classList.remove('hidden');
        couponTypeSelect.dispatchEvent(new Event('change'));
      });
      row.querySelector('.delete-btn')?.addEventListener('click', async () => {
        await deleteCoupon(coupon.id);
        main();
      });
    });
  }
  if (couponForm) {
    couponForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = couponCodeInput.value.trim().toUpperCase();
      const id = couponIdHidden.value || code;
      if (!code) return;
      const couponType = couponTypeSelect.value;
      const value = couponType === 'free_delivery' ? 0 : parseFloat(couponValueInput.value);
      if (couponType !== 'free_delivery' && (isNaN(value) || value < 0)) return;
      const data = {
        code,
        description: couponDescriptionInput.value.trim(),
        type: couponType,
        value,
        active: couponActiveCheckbox.checked,
        minOrderValue: parseFloat(couponMinOrderValueInput.value) || 0,
        oneTimeUsePerCustomer: couponOneTimeUseCheckbox.checked
      };
      if (!couponIdHidden.value) data.usedBy = [];
      await saveCoupon(id, data);
      cancelEditCouponBtn.click();
      main();
    });
    cancelEditCouponBtn.addEventListener('click', () => {
      couponForm.reset();
      couponIdHidden.value = '';
      couponCodeInput.readOnly = false;
      couponFormTitle.textContent = "Adicionar Novo Cupom";
      cancelEditCouponBtn.classList.add('hidden');
      couponTypeSelect.dispatchEvent(new Event('change'));
    });
  }
  
  // --- LÓGICA DE CUSTOS FIXOS (NOVO) ---
  async function fetchFixedCosts() {
    const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
    const q = query(collection(window.db, "fixed_costs"), orderBy("description"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  async function saveFixedCost(id, data) {
    const { doc, setDoc } = window.firebaseFirestore;
    await setDoc(doc(window.db, "fixed_costs", id), data);
  }
  async function deleteFixedCost(id) {
    if (!confirm(`Tem certeza que deseja apagar este custo?`)) return;
    const { doc, deleteDoc } = window.firebaseFirestore;
    await deleteDoc(doc(window.db, "fixed_costs", id));
  }
  function renderFixedCosts(costs) {
    if (!fixedCostsAdminContainer) return;
    fixedCostsAdminContainer.innerHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Descrição</th><th>Valor Mensal</th><th>Ações</th></tr></thead><tbody>` +
      (costs.length > 0 ? costs.map(cost => `
      <tr data-id="${cost.id}">
        <td>${cost.description}</td>
        <td>${formatPrice(cost.value)}</td>
        <td class="table-actions">
          <button class="btn-icon edit-btn"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete-btn"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="3" class="empty-list-message">Nenhum custo fixo.</td></tr>`) +
      `</tbody></table></div>`;
    addFixedCostsActionListeners(costs);
  }
  function addFixedCostsActionListeners(costs) {
    fixedCostsAdminContainer.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      const cost = costs.find(c => c.id === id);
      if (!cost) return;
      row.querySelector('.edit-btn')?.addEventListener('click', () => {
        fixedCostFormTitle.textContent = "Editar Custo Fixo";
        fixedCostDescriptionInput.value = cost.description;
        fixedCostValueInput.value = cost.value;
        fixedCostIdHidden.value = cost.id;
        cancelEditFixedCostBtn.classList.remove('hidden');
      });
      row.querySelector('.delete-btn')?.addEventListener('click', async () => {
        await deleteFixedCost(cost.id);
        main();
      });
    });
  }
  if (fixedCostForm) {
    fixedCostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const description = fixedCostDescriptionInput.value.trim();
      const value = parseFloat(fixedCostValueInput.value);
      const id = fixedCostIdHidden.value || Date.now().toString();
      if (!description || isNaN(value)) return;
      await saveFixedCost(id, { description, value });
      cancelEditFixedCostBtn.click();
      main();
    });
    cancelEditFixedCostBtn.addEventListener('click', () => {
      fixedCostForm.reset();
      fixedCostIdHidden.value = '';
      fixedCostFormTitle.textContent = "Adicionar Novo Custo Fixo";
      cancelEditFixedCostBtn.classList.add('hidden');
    });
  }

  // --- LÓGICA DE SALÁRIOS (NOVO) ---
  async function fetchSalaries() {
    const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
    const q = query(collection(window.db, "salaries"), orderBy("description"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  async function saveSalary(id, data) {
    const { doc, setDoc } = window.firebaseFirestore;
    await setDoc(doc(window.db, "salaries", id), data);
  }
  async function deleteSalary(id) {
    if (!confirm(`Tem certeza que deseja apagar este salário?`)) return;
    const { doc, deleteDoc } = window.firebaseFirestore;
    await deleteDoc(doc(window.db, "salaries", id));
  }
  function renderSalaries(salaries) {
    if (!salariesAdminContainer) return;
    salariesAdminContainer.innerHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Descrição</th><th>Valor Mensal</th><th>Ações</th></tr></thead><tbody>` +
      (salaries.length > 0 ? salaries.map(s => `
      <tr data-id="${s.id}">
        <td>${s.description}</td>
        <td>${formatPrice(s.value)}</td>
        <td class="table-actions">
          <button class="btn-icon edit-btn"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete-btn"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="3" class="empty-list-message">Nenhum salário.</td></tr>`) +
      `</tbody></table></div>`;
    addSalariesActionListeners(salaries);
  }
  function addSalariesActionListeners(salaries) {
    salariesAdminContainer.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      const salary = salaries.find(s => s.id === id);
      if (!salary) return;
      row.querySelector('.edit-btn')?.addEventListener('click', () => {
        salaryFormTitle.textContent = "Editar Salário";
        salaryDescriptionInput.value = salary.description;
        salaryValueInput.value = salary.value;
        salaryIdHidden.value = salary.id;
        cancelEditSalaryBtn.classList.remove('hidden');
      });
      row.querySelector('.delete-btn')?.addEventListener('click', async () => {
        await deleteSalary(salary.id);
        main();
      });
    });
  }
  if (salaryForm) {
    salaryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const description = salaryDescriptionInput.value.trim();
      const value = parseFloat(salaryValueInput.value);
      const id = salaryIdHidden.value || Date.now().toString();
      if (!description || isNaN(value)) return;
      await saveSalary(id, { description, value });
      cancelEditSalaryBtn.click();
      main();
    });
    cancelEditSalaryBtn.addEventListener('click', () => {
      salaryForm.reset();
      salaryIdHidden.value = '';
      salaryFormTitle.textContent = "Adicionar Salário";
      cancelEditSalaryBtn.classList.add('hidden');
    });
  }

  // --- FUNÇÃO PRINCIPAL DE EXECUÇÃO ---
  async function main() {
    renderOperatingHoursForm();
    loadStoreInfoForm();

    const [neighborhoods, deliveryPeople, coupons, fixedCosts, salaries] = await Promise.all([
      fetchNeighborhoods(),
      fetchDeliveryPeople(),
      fetchCoupons(),
      fetchFixedCosts(),
      fetchSalaries()
    ]);
    
    renderDeliveryFeesAdmin(neighborhoods);
    renderDeliveryPeopleAdmin(deliveryPeople);
    renderCouponsAdmin(coupons);
    renderFixedCosts(fixedCosts);
    renderSalaries(salaries);

    initializeAccordion();
  }

  main();
}

window.initializeSettingsSection = initializeSettingsSection;