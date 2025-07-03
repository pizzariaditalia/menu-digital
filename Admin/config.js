// Arquivo: config.js
// VERSÃO COM SUPORTE A CUPOM DE ENTREGA GRÁTIS

let settingsSectionInitialized = false;

function initializeSettingsSection() {
  if (settingsSectionInitialized) {
    return;
  }
  settingsSectionInitialized = true;
  console.log("Módulo Config.js: Inicializando PELA PRIMEIRA VEZ...");

  // --- SELETORES DE ELEMENTOS DO DOM ---
  const operatingHoursForm = document.getElementById('operating-hours-form');
  const operatingHoursFieldsContainer = document.getElementById('operating-hours-fields-container');
  const deliveryFeesAdminContainer = document.getElementById('delivery-fees-admin-container');
  const neighborhoodForm = document.getElementById('neighborhood-form');
  const neighborhoodFormTitle = document.getElementById('neighborhood-form-title');
  const neighborhoodNameInput = document.getElementById('neighborhood-name');
  const neighborhoodFeeInput = document.getElementById('neighborhood-fee');
  const neighborhoodIdHidden = document.getElementById('neighborhood-id-hidden');
  const cancelEditBtn = document.getElementById('cancel-edit-neighborhood-btn');
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

  // Seletores para Cupons
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

  const daysOfWeekOrder = ["Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo"];

  // --- LÓGICA DO ACORDEÃO (SEÇÕES RECOLHÍVEIS) ---
  function initializeAccordion() {
    const accordionHeaders = document.querySelectorAll('#settings-content .settings-group > h3');
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const clickedGroup = header.parentElement;
        const wasActive = clickedGroup.classList.contains('active');
        document.querySelectorAll('#settings-content .settings-group').forEach(group => {
          group.classList.remove('active');
        });
        if (!wasActive) {
          clickedGroup.classList.add('active');
        }
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
      let [startTime, endTime] = isClosed ? ["18:30", "23:00"]: currentSetting.split(' - ').map(t => t.trim());
      const rowHTML = `<div class="day-schedule-row"><span class="day-label">${day}:</span><div class="time-inputs"><input type="time" id="start-${day}" value="${startTime}" ${isClosed ? 'disabled': ''}><span>até</span><input type="time" id="end-${day}" value="${endTime}" ${isClosed ? 'disabled': ''}></div><label class="closed-checkbox-label"><input type="checkbox" class="closed-checkbox" data-day="${day}" ${isClosed ? 'checked': ''}> Fechado</label></div>`;
      operatingHoursFieldsContainer.insertAdjacentHTML('beforeend', rowHTML);
    });
    operatingHoursFieldsContainer.querySelectorAll('.closed-checkbox').forEach(cb => {
      cb.addEventListener('change', function() {
        const day = this.dataset.day; document.getElementById(`start-${day}`).disabled = this.checked; document.getElementById(`end-${day}`).disabled = this.checked;
      });
    });
  }
  if (operatingHoursForm) {
    operatingHoursForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newOperatingHours = {};
      daysOfWeekOrder.forEach(day => {
        const isChecked = document.querySelector(`.closed-checkbox[data-day="${day}"]`).checked; if (isChecked) {
          newOperatingHours[day] = "Fechado";
        } else {
          const start = document.getElementById(`start-${day}`).value; const end = document.getElementById(`end-${day}`).value; newOperatingHours[day] = `${start} - ${end}`;
        }
      });
      try {
        const {
          doc, setDoc
        } = window.firebaseFirestore; const settingsDocRef = doc(window.db,
          "configuracoes",
          "mainSettings"); await setDoc(settingsDocRef,
          {
            operatingHours: newOperatingHours
          },
          {
            merge: true
          }); window.appSettings.operatingHours = newOperatingHours; window.showToast("Horário de funcionamento salvo!");
      } catch (err) {
        window.showToast("Erro ao salvar horário.",
          "error");
      }
    });
  }

  // --- LÓGICA DE TAXAS DE ENTREGA ---
  async function fetchNeighborhoods() {
    if (!window.db || !window.firebaseFirestore) return [];
    const {
      collection,
      getDocs
    } = window.firebaseFirestore;
    try {
      const querySnapshot = await getDocs(collection(window.db, "delivery_fees"));
      return querySnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Erro ao buscar bairros:", error); return [];
    }
  }
  async function saveNeighborhood(id, data) {
    const {
      doc,
      setDoc
    } = window.firebaseFirestore;
    try {
      await setDoc(doc(window.db, "delivery_fees", id), data); return true;
    } catch (error) {
      window.showToast("Falha ao salvar o bairro.", "error"); return false;
    }
  }
  async function deleteNeighborhood(id) {
    if (!confirm(`Tem certeza que deseja apagar o bairro "${id}"?`)) return false;
    const {
      doc,
      deleteDoc
    } = window.firebaseFirestore;
    try {
      await deleteDoc(doc(window.db, "delivery_fees", id)); return true;
    } catch (error) {
      window.showToast("Falha ao apagar o bairro.", "error"); return false;
    }
  }
  function renderDeliveryFeesAdmin(neighborhoods) {
    if (!deliveryFeesAdminContainer) return;
    const tableHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Bairro</th><th>Taxa (R$)</th><th>Ações</th></tr></thead><tbody>` +
    (neighborhoods.length > 0 ? neighborhoods.map(hood => `
      <tr>
      <td>${hood.name}</td>
      <td>R$ ${hood.fee.toFixed(2).replace('.', ',')}</td>
      <td class="table-actions">
      <button class="btn-icon edit-btn" data-id="${hood.id}" title="Editar"><i class="fas fa-edit"></i></button>
      <button class="btn-icon delete-btn" data-id="${hood.id}" title="Apagar"><i class="fas fa-trash-alt"></i></button>
      </td>
      </tr>`).join(''): `<tr><td colspan="3" style="text-align:center;">Nenhum bairro cadastrado.</td></tr>`) +
    `</tbody></table></div>`;
    deliveryFeesAdminContainer.innerHTML = tableHTML;
    addNeighborhoodActionListeners(neighborhoods);
  }
  function addNeighborhoodActionListeners(neighborhoods) {
    deliveryFeesAdminContainer.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', () => {
        const neighborhoodId = button.dataset.id;
        const hoodData = neighborhoods.find(n => n.id === neighborhoodId);
        if (hoodData) {
          neighborhoodFormTitle.textContent = "Editar Bairro";
          neighborhoodNameInput.value = hoodData.name;
          neighborhoodFeeInput.value = hoodData.fee;
          neighborhoodIdHidden.value = neighborhoodId;
          cancelEditBtn.classList.remove('hidden');
          neighborhoodNameInput.focus();
        }
      });
    });
    deliveryFeesAdminContainer.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click',
        async () => {
          if (await deleteNeighborhood(button.dataset.id)) {
            await main();
          }
        });
    });
  }
  if (neighborhoodForm) {
    neighborhoodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = neighborhoodNameInput.value.trim();
      const fee = parseFloat(neighborhoodFeeInput.value);
      const id = document.getElementById('neighborhood-id-hidden').value || name;
      if (!name || isNaN(fee) || fee < 0) {
        window.showToast("Por favor, preencha nome e taxa corretamente.", "warning"); return;
      }
      if (await saveNeighborhood(id, {
        name, fee
      })) {
        cancelEditBtn.click();
        await main();
      }
    });
  }
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      neighborhoodForm.reset();
      neighborhoodIdHidden.value = '';
      neighborhoodFormTitle.textContent = "Adicionar Novo Bairro";
      cancelEditBtn.classList.add('hidden');
    });
  }

  // --- LÓGICA DE ENTREGADORES ---
  async function fetchDeliveryPeople() {
    if (!window.db || !window.firebaseFirestore) return [];
    const {
      collection,
      getDocs,
      query
    } = window.firebaseFirestore;
    try {
      const q = query(collection(window.db, "delivery_people"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar entregadores:", error);
      window.showToast("Não foi possível carregar os entregadores.", "error");
      return [];
    }
  }
  async function saveDeliveryPerson(id, data) {
    const {
      doc,
      setDoc
    } = window.firebaseFirestore;
    try {
      await setDoc(doc(window.db, "delivery_people", id), data);
      return true;
    } catch (error) {
      console.error("Erro ao salvar entregador:", error);
      window.showToast("Falha ao salvar o entregador.", "error");
      return false;
    }
  }
  async function deleteDeliveryPerson(id) {
    if (!confirm(`Tem certeza que deseja apagar o entregador?`)) return false;
    const {
      doc,
      deleteDoc
    } = window.firebaseFirestore;
    try {
      await deleteDoc(doc(window.db, "delivery_people", id)); return true;
    } catch (error) {
      console.error("Erro ao apagar entregador:", error); window.showToast("Falha ao apagar o entregador.", "error"); return false;
    }
  }
  function renderDeliveryPeopleAdmin(people) {
    if (!deliveryPeopleAdminContainer) return;
    const tableHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Nome Completo</th><th>WhatsApp</th><th>Ações</th></tr></thead><tbody>` +
    (people.length > 0 ? people.map(person => `
      <tr>
      <td>${person.firstName} ${person.lastName}</td>
      <td>${person.whatsapp}</td>
      <td class="table-actions">
      <button class="btn-icon edit-delivery-person-btn" data-id="${person.id}" title="Editar"><i class="fas fa-edit"></i></button>
      <button class="btn-icon delete-delivery-person-btn" data-id="${person.id}" title="Apagar"><i class="fas fa-trash-alt"></i></button>
      </td>
      </tr>`).join(''): `<tr><td colspan="3" style="text-align:center;">Nenhum entregador cadastrado.</td></tr>`) +
    `</tbody></table></div>`;
    deliveryPeopleAdminContainer.innerHTML = tableHTML;
    addDeliveryPeopleActionListeners(people);
  }
  function addDeliveryPeopleActionListeners(people) {
    deliveryPeopleAdminContainer.querySelectorAll('.edit-delivery-person-btn').forEach(button => {
      button.addEventListener('click', () => {
        const personId = button.dataset.id;
        const personData = people.find(p => p.id === personId);
        if (personData) {
          deliveryPersonFormTitle.textContent = "Editar Entregador";
          deliveryPersonFirstNameInput.value = personData.firstName;
          deliveryPersonLastNameInput.value = personData.lastName;
          deliveryPersonWhatsappInput.value = personData.whatsapp;
          deliveryPersonIdHidden.value = personId;
          deliveryPersonWhatsappInput.readOnly = true;
          deliveryPersonWhatsappInput.style.backgroundColor = '#e9ecef';
          cancelEditDeliveryPersonBtn.classList.remove('hidden');
          deliveryPersonFirstNameInput.focus();
        }
      });
    });
    deliveryPeopleAdminContainer.querySelectorAll('.delete-delivery-person-btn').forEach(button => {
      button.addEventListener('click',
        async () => {
          if (await deleteDeliveryPerson(button.dataset.id)) {
            await main();
          }
        });
    });
  }
  if (deliveryPersonForm) {
    deliveryPersonForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const whatsapp = deliveryPersonWhatsappInput.value.trim().replace(/\D/g, '');
      const id = deliveryPersonIdHidden.value || whatsapp;

      if (!whatsapp || !deliveryPersonFirstNameInput.value.trim() || !deliveryPersonLastNameInput.value.trim()) {
        window.showToast("Por favor, preencha todos os campos do entregador.", "warning");
        return;
      }

const data = {
  firstName: deliveryPersonFirstNameInput.value.trim(),
  lastName: deliveryPersonLastNameInput.value.trim(),
  whatsapp: whatsapp,
  email: document.getElementById('delivery-person-email').value.trim()
};
      if (await saveDeliveryPerson(id, data)) {
        cancelEditDeliveryPersonBtn.click();
        await main();
      }
    });
  }
  if (cancelEditDeliveryPersonBtn) {
    cancelEditDeliveryPersonBtn.addEventListener('click', () => {
      deliveryPersonForm.reset();
      deliveryPersonIdHidden.value = '';
      deliveryPersonFormTitle.textContent = "Adicionar Novo Entregador";
      deliveryPersonWhatsappInput.readOnly = false;
      deliveryPersonWhatsappInput.style.backgroundColor = '';
      cancelEditDeliveryPersonBtn.classList.add('hidden');
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
        window.showToast("Pedido mínimo inválido.", "warning"); return;
      }
      try {
        const {
          doc,
          updateDoc
        } = window.firebaseFirestore; const settingsDocRef = doc(window.db, "configuracoes", "mainSettings"); await updateDoc(settingsDocRef, {
            "storeInfo.minOrderValue": newMinOrder
          }); if (window.appSettings && window.appSettings.storeInfo) {
          window.appSettings.storeInfo.minOrderValue = newMinOrder;
        } window.showToast("Dados da loja salvos!");
      } catch (err) {
        window.showToast("Erro ao salvar dados da loja.", "error");
      }
    });
  }

  // --- LÓGICA DE CUPONS DE DESCONTO ---
  async function fetchCoupons() {
    if (!window.db || !window.firebaseFirestore) return [];
    const {
      collection,
      getDocs,
      orderBy,
      query
    } = window.firebaseFirestore;
    try {
      const q = query(collection(window.db, "coupons"), orderBy("code"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar cupons:", error);
      return [];
    }
  }

  async function saveCoupon(id, data) {
    const {
      doc,
      setDoc
    } = window.firebaseFirestore;
    try {
      await setDoc(doc(window.db, "coupons", id), data, {
        merge: true
      });
      return true;
    } catch (error) {
      window.showToast("Falha ao salvar o cupom.", "error");
      return false;
    }
  }

  async function deleteCoupon(id) {
    if (!confirm(`Tem certeza que deseja apagar o cupom "${id}"?`)) return false;
    const {
      doc,
      deleteDoc
    } = window.firebaseFirestore;
    try {
      await deleteDoc(doc(window.db, "coupons", id));
      return true;
    } catch (error) {
      window.showToast("Falha ao apagar o cupom.", "error");
      return false;
    }
  }

  function renderCouponsAdmin(coupons) {
    if (!couponsAdminContainer) return;
    const tableHTML = `<div class="table-responsive"><table class="admin-table"><thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Pedido Mínimo</th><th>Uso Único</th><th>Status</th><th>Ações</th></tr></thead><tbody>` +
    (coupons.length > 0 ? coupons.map(coupon => {
      let typeLabel = 'Percentual';
      let valueLabel = `${coupon.value}%`;
      if (coupon.type === 'fixed') {
        typeLabel = 'Valor Fixo';
        valueLabel = `R$ ${coupon.value.toFixed(2).replace('.', ',')}`;
      } else if (coupon.type === 'free_delivery') {
        typeLabel = 'Entrega Grátis';
        valueLabel = 'N/A';
      }
      return `
      <tr>
      <td><strong>${coupon.code}</strong></td>
      <td>${coupon.description}</td>
      <td>${typeLabel}</td>
      <td>${valueLabel}</td>
      <td>${(coupon.minOrderValue > 0) ? `R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')}`: 'N/A'}</td>
      <td><span class="tag ${coupon.oneTimeUsePerCustomer ? 'tag-payment-unpaid': 'tag-payment-delivery'}">${coupon.oneTimeUsePerCustomer ? 'Sim': 'Não'}</span></td>
      <td><span class="tag ${coupon.active ? 'tag-payment-paid': 'tag-payment-unpaid'}">${coupon.active ? 'Ativo': 'Inativo'}</span></td>
      <td class="table-actions">
      <button class="btn-icon edit-coupon-btn" data-id="${coupon.id}" title="Editar"><i class="fas fa-edit"></i></button>
      <button class="btn-icon delete-coupon-btn" data-id="${coupon.id}" title="Apagar"><i class="fas fa-trash-alt"></i></button>
      </td>
      </tr>`;
    }).join(''): `<tr><td colspan="8" style="text-align:center;">Nenhum cupom cadastrado.</td></tr>`) +
    `</tbody></table></div>`;
    couponsAdminContainer.innerHTML = tableHTML;
    addCouponActionListeners(coupons);
  }

  function addCouponActionListeners(coupons) {
    couponsAdminContainer.querySelectorAll('.edit-coupon-btn').forEach(button => {
      button.addEventListener('click',
        () => {
          const couponId = button.dataset.id;
          const couponData = coupons.find(c => c.id === couponId);
          if (couponData) {
            couponFormTitle.textContent = "Editar Cupom";
            couponIdHidden.value = couponData.id;
            couponCodeInput.value = couponData.code;
            couponCodeInput.readOnly = true;
            couponDescriptionInput.value = couponData.description;
            couponTypeSelect.value = couponData.type;
            couponValueInput.value = couponData.value;
            couponMinOrderValueInput.value = couponData.minOrderValue || '';
            couponOneTimeUseCheckbox.checked = couponData.oneTimeUsePerCustomer || false;
            couponActiveCheckbox.checked = couponData.active;
            cancelEditCouponBtn.classList.remove('hidden');
            couponDescriptionInput.focus();
            // ALTERAÇÃO: Garante que o campo de valor apareça/desapareça corretamente ao editar
            couponTypeSelect.dispatchEvent(new Event('change'));
          }
        });
    });

    couponsAdminContainer.querySelectorAll('.delete-coupon-btn').forEach(button => {
      button.addEventListener('click',
        async () => {
          if (await deleteCoupon(button.dataset.id)) {
            await main();
          }
        });
    });
  }

  if (couponForm) {
    couponForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = couponCodeInput.value.trim().toUpperCase();
      const id = couponIdHidden.value || code;
      if (!code || !couponDescriptionInput.value.trim()) {
        window.showToast("Por favor, preencha código e descrição.", "warning");
        return;
      }

      const couponType = couponTypeSelect.value;
      const value = couponType === 'free_delivery' ? 0: parseFloat(couponValueInput.value);

      if (couponType !== 'free_delivery' && (isNaN(value) || value < 0)) {
        window.showToast("Por favor, insira um valor válido para o desconto.", "warning");
        return;
      }

      const data = {
        code: code,
        description: couponDescriptionInput.value.trim(),
        type: couponType,
        value: value,
        active: couponActiveCheckbox.checked,
        minOrderValue: parseFloat(couponMinOrderValueInput.value) || 0,
        oneTimeUsePerCustomer: couponOneTimeUseCheckbox.checked
      };

      if (!couponIdHidden.value) {
        // Se for um cupom novo, inicia o array 'usedBy'
        data.usedBy = [];
      }

      if (await saveCoupon(id, data)) {
        cancelEditCouponBtn.click();
        await main();
      }
    });
  }

  if (cancelEditCouponBtn) {
    cancelEditCouponBtn.addEventListener('click', () => {
      couponForm.reset();
      couponIdHidden.value = '';
      couponCodeInput.readOnly = false;
      couponFormTitle.textContent = "Adicionar Novo Cupom";
      cancelEditCouponBtn.classList.add('hidden');
      couponTypeSelect.dispatchEvent(new Event('change')); // Reseta a visibilidade do campo de valor
    });
  }

  // --- FUNÇÃO PRINCIPAL DE EXECUÇÃO ---
  async function main() {
    renderOperatingHoursForm();
    loadStoreInfoForm();

    if (deliveryFeesAdminContainer) {
      deliveryFeesAdminContainer.innerHTML = "<p>Carregando taxas...</p>";
      const neighborhoods = await fetchNeighborhoods();
      renderDeliveryFeesAdmin(neighborhoods);
    }

    if (deliveryPeopleAdminContainer) {
      deliveryPeopleAdminContainer.innerHTML = "<p>Carregando entregadores...</p>";
      const people = await fetchDeliveryPeople();
      renderDeliveryPeopleAdmin(people);
    }

    if (couponsAdminContainer) {
      couponsAdminContainer.innerHTML = "<p>Carregando cupons...</p>";
      const coupons = await fetchCoupons();
      renderCouponsAdmin(coupons);
    }

    initializeAccordion();
  }

  main();
}

window.initializeSettingsSection = initializeSettingsSection;