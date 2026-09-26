/**
 * Book a Free Demo Modal for Presently
 */
export const initDemoModal = () => {
  const modalHTML = `
    <div id="demo-modal" class="modal-overlay">
      <div class="modal-content">
        <button class="modal-close" id="close-demo-modal">&times;</button>
        <div style="text-align: center; margin-bottom: 24px;">
          <h3 style="font-size: 1.6rem; color: #0F172A; margin-bottom: 8px;">Book an Institutional Demo</h3>
          <p style="font-size: 0.92rem; color: #64748B;">Experience Presently customized for your college or university</p>
        </div>

        <form id="demo-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #334155;">Full Name / Designation</label>
            <input type="text" required placeholder="e.g. Prof. Rajesh Sharma / Dr. Pooja Verma" style="width: 100%; padding: 11px 14px; border: 1px solid #CBD5E1; border-radius: 10px; font-size: 0.92rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #334155;">College / University / Institute Name</label>
            <input type="text" required placeholder="e.g. LIET / IIT Delhi / Delhi University / BITS" style="width: 100%; padding: 11px 14px; border: 1px solid #CBD5E1; border-radius: 10px; font-size: 0.92rem;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #334155;">Institutional Email</label>
              <input type="email" required placeholder="rajesh.sharma@liet.in" style="width: 100%; padding: 11px 14px; border: 1px solid #CBD5E1; border-radius: 10px; font-size: 0.92rem;">
            </div>
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #334155;">Total Student Strength</label>
              <select style="width: 100%; padding: 11px 14px; border: 1px solid #CBD5E1; border-radius: 10px; font-size: 0.92rem; background: #fff;">
                <option>100 - 500 Students</option>
                <option>500 - 2,000 Students</option>
                <option>2,000 - 5,000 Students</option>
                <option>5,000+ Students</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px; border-radius: 12px;">Schedule 15-Min Live Demo</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('demo-modal');
  const closeBtn = document.getElementById('close-demo-modal');
  const form = document.getElementById('demo-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you! Our education specialist will reach out within 24 hours to schedule your personalized demo.');
    modal.classList.remove('active');
    form.reset();
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  return {
    open: () => modal.classList.add('active'),
    close: () => modal.classList.remove('active')
  };
};
