/* ============================================
   Rondleiding App Landing Page - Interactivity
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const downloadBtn = document.getElementById('download-btn');
    const initialState = document.getElementById('initial-state');
    const finishedState = document.getElementById('finished-state');
    const installModal = document.getElementById('install-modal');
    const modalDecline = document.getElementById('modal-decline');
    const modalAccept = document.getElementById('modal-accept');

    // Show modal when download button is clicked
    downloadBtn.addEventListener('click', () => {
        installModal.classList.add('show');
    });

    // Close modal when decline button is clicked
    modalDecline.addEventListener('click', () => {
        installModal.classList.remove('show');
    });

    // Handle download after accepting
    modalAccept.addEventListener('click', () => {
        installModal.classList.remove('show');
        initialState.style.display = 'none';
        finishedState.style.display = 'block';
        downloadBtn.style.display = 'none';

        // Trigger file download
        const downloadLink = document.createElement('a');
        downloadLink.href = './downloads/app-release.apk';
        downloadLink.download = 'Rondleiding-App.apk';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
});
