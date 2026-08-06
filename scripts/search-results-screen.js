
// const heart = document.querySelectorAll('.heart-icon');

// heart.forEach((icon) => {
//     icon.addEventListener('click', ()=>{
//         // console.log('clicked');
//         if (icon.classList.contains('ph-thin')) {
//             icon.classList.remove('ph-thin');
//         icon.classList.add('ph-fill');
//         icon.style.color = 'red';
//         } else {
//         icon.classList.remove('ph-fill');
//         icon.classList.add('ph-thin');
//         icon.style.color = '#2862bc';
//         }
//     })
// })



const API = 'PLACEHOLDER_URL_HERE'; // swap this once confirmed with your lead

async function getSpaces() {
  try {
    const response = await fetch(`${API}/workspaces`, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    return null;
  }
}

// Adding to Favorites and Removing from Favorites with Toast Notification
let favorites = [];

const heartIcons = document.querySelectorAll('.heart-icon');
const toast = document.querySelector('.favorite-toast');
const toastMessage = document.querySelector('.toast-message');
const toastUndoBtn = document.querySelector('.toast-undo-btn');
const toastCheckmark = document.querySelector('.toast-checkmark');

let toastTimeout;
let lastRemovedTitle = null;
let lastRemovedIcon = null;

heartIcons.forEach((icon) => {
  icon.addEventListener('click', () => {
    const card = icon.closest('.workspace-card');
    const title = card.querySelector('.workspace-title h4').textContent;

    if (icon.classList.contains('ph-thin')) {
      addToFavorites(icon, title);
      showToast('Added to Favourites', false);

    } else {
      removeFromFavorites(icon, title);
      showToast('Removed from Favourites', true);
    }

    console.log(favorites);
  });
});

function addToFavorites(icon, title) {
  icon.classList.remove('ph-thin');
  icon.classList.add('ph-fill');
  icon.style.color = 'red';
  favorites.push(title);
}

function removeFromFavorites(icon, title) {
  icon.classList.remove('ph-fill');
  icon.classList.add('ph-thin');
  icon.style.color = '';
  toastCheckmark.style.display = 'none'; // Hide the checkmark when removing
  favorites = favorites.filter(item => item !== title);

  // remember what was just removed, in case of undo
  lastRemovedTitle = title;
  lastRemovedIcon = icon;
}

function showToast(message, showUndo) {
  clearTimeout(toastTimeout);

  toastMessage.textContent = message;
  toastUndoBtn.style.display = showUndo ? 'block' : 'none';
  toast.style.display = 'flex';

  toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

toastUndoBtn.addEventListener('click', () => {
  if (lastRemovedIcon && lastRemovedTitle) {
    addToFavorites(lastRemovedIcon, lastRemovedTitle);
    clearTimeout(toastTimeout);
    toast.style.display = 'none'; 

    lastRemovedTitle = null;
    lastRemovedIcon = null;
  }
});


// async function loadWorkspaces() {
//   const data = await getSpaces();

//   const cardsContainer = document.querySelector('.workspace-cards-container');
//   const emptyState = document.querySelector('.empty-state'); // adjust to your actual class name

//   if (!data || data.length === 0) {
//     cardsContainer.style.display = 'none';
//     emptyState.style.display = 'flex'; // or whatever display value matches its CSS
//   } else {
//     emptyState.style.display = 'none';
//     cardsContainer.style.display = 'flex'; // match whatever your container's real display value is
//     // card-rendering logic goes here once we know the response field names
//   }
// }
// loadWorkspaces();



// const API = 'https://spaceshare-backend-cor9.onrender.com'

// async function getSpaces() {

//     try {
//         const response = await fetch (`${API}/api/workspaces`, {
//             method: "GET"
//         })
//         if(!response.ok){
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         return response.json();
//     } catch (error) {
//         console.error(error)
//     }
// }




// (async () => {
//     const users = await getSpaces();
//     console.log(users);
// })();