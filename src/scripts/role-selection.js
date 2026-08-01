(function() {
    const findCard = document.getElementById('findCard');
    const listCard = document.getElementById('listCard');

    function clearSelection() {
        findCard.classList.remove('selected');
        listCard.classList.remove('selected');
    }

    function handleCardClick(e) {
        const card = e.currentTarget;

        if (card.classList.contains('selected')) {
            clearSelection();
            return;
        }

        clearSelection();
        card.classList.add('selected');
    }

    findCard.addEventListener('click', handleCardClick);
    listCard.addEventListener('click', handleCardClick);

    findCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            findCard.click();
        }
    });

    listCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            listCard.click();
        }
    });
})();