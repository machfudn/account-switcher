const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalInput = document.getElementById('modal-input');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalConfirmBtn = document.getElementById('modal-confirm');

let modalResolve = null;
let modalMode = 'confirm';

function openModal({ title, message = '', input = false, value = '', placeholder = '', confirmText = 'OK', cancelText = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    modalResolve = resolve;
    modalMode = input ? 'prompt' : 'confirm';
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalMessage.classList.toggle('hidden', !message);
    if (input) {
      modalInput.classList.remove('hidden');
      modalInput.value = value;
      modalInput.placeholder = placeholder;
    } else {
      modalInput.classList.add('hidden');
    }
    modalConfirmBtn.textContent = confirmText;
    modalConfirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    modalCancelBtn.textContent = cancelText;
    modalOverlay.classList.add('visible');
    if (input) { modalInput.focus(); modalInput.select(); }
  });
}

function closeModal(result) {
  modalOverlay.classList.remove('visible');
  if (modalResolve) { modalResolve(result); modalResolve = null; }
}

function acceptModal() {
  if (modalMode === 'prompt') {
    const v = modalInput.value.trim();
    if (!v) return;
    closeModal(v);
  } else {
    closeModal(true);
  }
}

modalConfirmBtn.addEventListener('click', acceptModal);
modalCancelBtn.addEventListener('click', () => closeModal(modalMode === 'prompt' ? null : false));
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal(modalMode === 'prompt' ? null : false);
});
document.addEventListener('keydown', e => {
  if (!modalOverlay.classList.contains('visible')) return;
  if (e.key === 'Escape') closeModal(modalMode === 'prompt' ? null : false);
  if (e.key === 'Enter') acceptModal();
});
