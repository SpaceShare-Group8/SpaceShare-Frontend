// Interactive alert for the Check Availability CTA button
document.getElementById('checkAvailabilityBtn').addEventListener('click', function() {
    alert('Redirecting to date & time selection for Hub One Workspace...');
});

// Navigation active switching demo
const navItems = document.querySelectorAll('.bottom-nav .nav-item');
navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
    });
});