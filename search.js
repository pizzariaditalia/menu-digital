// Arquivo: search.js

function initializeSearch() {
    const searchBar = document.getElementById('search-bar');

    // Seleciona todos os itens de menu visíveis na página
    const menuItems = document.querySelectorAll('.menu-item');

    if (!searchBar) return;

    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        menuItems.forEach(itemCard => {
            // Pega o nome e a descrição do item a partir do HTML
            const itemName = itemCard.querySelector('h4').textContent.toLowerCase();
            const itemDescriptionElement = itemCard.querySelector('.item-description');
            const itemDescription = itemDescriptionElement ? itemDescriptionElement.textContent.toLowerCase() : '';

            // Verifica se o termo de busca está no nome ou na descrição
            const isVisible = itemName.includes(searchTerm) || itemDescription.includes(searchTerm);

            // Mostra ou esconde o card do item
            // Usamos .parentElement para pegar o container da categoria se necessário, 
            // mas aqui vamos esconder o próprio card.
            itemCard.style.display = isVisible ? 'flex' : 'none';
        });
    });
}