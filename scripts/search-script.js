
const heart = document.querySelectorAll('.heart-icon');

heart.forEach((icon) => {
    icon.addEventListener('click', ()=>{
        // console.log('clicked');
        if (icon.classList.contains('ph-thin')) {
            icon.classList.remove('ph-thin');
        icon.classList.add('ph-fill');
        icon.style.color = 'red';
        } else {
        icon.classList.remove('ph-fill');
        icon.classList.add('ph-thin');

        }
    })
})



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