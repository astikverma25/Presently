import { initAuthModal } from './components/landing/AuthModal.js';
import { initDemoModal } from './components/landing/DemoModal.js';
import { initTutorialModal } from './components/landing/TutorialModal.js';
import { AuthService } from './services/authService.js';

const initApp = () => {
  // Auto-redirect if user already has an active authenticated session
  const activeSession = AuthService.getCurrentSession();
  if (activeSession && activeSession.user && activeSession.role) {
    const isNativeApp = typeof window !== 'undefined' && (
      Boolean(window.AndroidKeystore) || 
      Boolean(window.Capacitor?.isNativePlatform && window.Capacitor.isNativePlatform())
    );

    const targetUrl = AuthService.getRedirectUrl(activeSession.role);
    // In native app or if user isn't deliberately navigating to anchor #about/#features/#how-it-works
    if (targetUrl && (isNativeApp || !window.location.hash)) {
      window.location.replace(targetUrl);
      return;
    }
  }
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
