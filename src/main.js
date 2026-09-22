import { initAuthModal } from './components/landing/AuthModal.js';
import { initDemoModal } from './components/landing/DemoModal.js';
import { initTutorialModal } from './components/landing/TutorialModal.js';

const initApp = () => {
  // Initialize Modals
  const authModal = initAuthModal();
  const demoModal = initDemoModal();
  const tutorialModal = initTutorialModal();

  // Attach Modal Triggers via direct bindings and document click delegation
  const handleTriggerClick = (e) => {
    const target = e.target.closest('.trigger-login, .trigger-signup, .btn-nav-login, .btn-nav-signup, .trigger-demo, .trigger-tutorial');
    if (!target) return;

    e.preventDefault();
    if (target.matches('.trigger-login, .btn-nav-login, .btn-mobile-header-login')) {
      authModal.open('student');
    } else if (target.matches('.trigger-signup, .btn-nav-signup, .btn-mobile-nav-signup')) {
      authModal.open('student');
    } else if (target.matches('.trigger-demo')) {
      demoModal.open();
    } else if (target.matches('.trigger-tutorial')) {
      tutorialModal.open();
    }
  };

  document.addEventListener('click', handleTriggerClick);

  // Testimonials Navigation Switching
  const testimonials = [
    {
      text: "Fast and convenient. My go-to attendance app!",
      name: "Aarav Sharma",
      role: "Director, Academic Affairs",
      initials: "AS"
    },
    {
      text: "Friendly interface and easy student verification process.",
      name: "Pooja Verma",
      role: "Faculty Head",
      initials: "PV"
    },
    {
      text: "Reduced proxy attendance to zero in our department within the first week.",
      name: "Prof. Rajesh Kulkarni",
      role: "Dean of Engineering",
      initials: "RK"
    },
    {
      text: "Automated monthly CSV reports saved our administrative team hours of paperwork.",
      name: "Sunita Iyer",
      role: "Campus Registrar",
      initials: "SI"
    }
  ];

  let currentIdx = 0;
  const prevBtn = document.getElementById('btn-prev-testi');
  const nextBtn = document.getElementById('btn-next-testi');
  const card1 = document.getElementById('testi-card-1');
  const card2 = document.getElementById('testi-card-2');

  const updateTestimonials = () => {
    if (!card1 || !card2) return;
    const t1 = testimonials[currentIdx % testimonials.length];
    const t2 = testimonials[(currentIdx + 1) % testimonials.length];

    card1.querySelector('.testi-text').textContent = `"${t1.text}"`;
    card1.querySelector('.author-name').textContent = t1.name;
    card1.querySelector('.author-role').textContent = t1.role;
    card1.querySelector('.author-avatar').textContent = t1.initials;

    card2.querySelector('.testi-text').textContent = `"${t2.text}"`;
    card2.querySelector('.author-name').textContent = t2.name;
    card2.querySelector('.author-role').textContent = t2.role;
    card2.querySelector('.author-avatar').textContent = t2.initials;
  };

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      currentIdx = (currentIdx - 1 + testimonials.length) % testimonials.length;
      updateTestimonials();
    });
    nextBtn.addEventListener('click', () => {
      currentIdx = (currentIdx + 1) % testimonials.length;
      updateTestimonials();
    });
  }

  // Mobile navigation drawer toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('main-nav-links') || document.querySelector('.nav-links');
  const hamburgerIcon = mobileToggle?.querySelector('.hamburger-icon');
  const closeIcon = mobileToggle?.querySelector('.close-icon');

  const closeMobileMenu = () => {
    if (navLinks) navLinks.classList.remove('active');
    if (hamburgerIcon) hamburgerIcon.style.display = 'block';
    if (closeIcon) closeIcon.style.display = 'none';
  };

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = navLinks.classList.toggle('active');
      if (hamburgerIcon && closeIcon) {
        hamburgerIcon.style.display = isActive ? 'none' : 'block';
        closeIcon.style.display = isActive ? 'block' : 'none';
      }
    });

    // Close when clicking any nav link or action inside the drawer
    navLinks.querySelectorAll('a, button').forEach(item => {
      item.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Close if clicked outside
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target)) {
        closeMobileMenu();
      }
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
