const faqBtn = document.querySelectorAll('.faqs-btn');

faqBtn.forEach((btn) => {
    btn.addEventListener('click', () => {
        faqBtn.forEach((btn) => {
            btn.classList.remove('active');
        })        
        if(btn.classList.contains('host-btn')){
            console.log('host btn clicked');
            btn.classList.add('active');
            document.querySelector('.seeker-faq-box-container').style.display = 'none';
            document.querySelector('.general-faq-box-container').style.display = 'none';
            document.querySelector('.host-faq-box-container').style.display = 'flex';

        } else if(btn.classList.contains('general-btn')){
            console.log('general btn clicked');
            btn.classList.add('active');
            document.querySelector('.seeker-faq-box-container').style.display = 'none';
            document.querySelector('.host-faq-box-container').style.display = 'none';
            document.querySelector('.general-faq-box-container').style.display = 'flex';
        } else{
            console.log('seeker btn clicked');
            btn.classList.add('active');
            document.querySelector('.host-faq-box-container').style.display = 'none';
            document.querySelector('.general-faq-box-container').style.display = 'none';
            document.querySelector('.seeker-faq-box-container').style.display = 'flex';
        }
    })
})