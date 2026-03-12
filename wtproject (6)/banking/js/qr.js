// QR code generation and scanning (frontend only)

window.initQrForUser = function (user) {
    const canvas = document.getElementById('userQrCanvas');
    if (canvas && window.QRious) {
        new QRious({
            element: canvas,
            value: user.qrId || user.email,
            size: 180,
            level: 'H'
        });
    }

    const qrScannerContainer = document.getElementById('qrScanner');
    if (!qrScannerContainer || !window.Html5Qrcode) return;

    const html5QrCode = new Html5Qrcode('qrScanner');

    const config = { fps: 10, qrbox: { width: 190, height: 190 } };

    function onScanSuccess(decodedText) {
        // For this demo, QR content is just an email (QR ID)
        const qrIdInput = document.getElementById('qrIdInput');
        if (qrIdInput) qrIdInput.value = decodedText;
        alert(`QR code scanned: ${decodedText}`);
        html5QrCode.stop().catch(() => {});
    }

    function onScanError() {
        // Ignore continuous scan errors
    }

    Html5Qrcode.getCameras().then((devices) => {
        if (!devices || devices.length === 0) {
            qrScannerContainer.innerHTML = '<div style="padding:8px;font-size:0.8rem;color:#6b7280;">Camera not available. Use the QR ID field instead.</div>';
            return;
        }
        html5QrCode.start({ facingMode: 'environment' }, config, onScanSuccess, onScanError)
            .catch(() => {
                qrScannerContainer.innerHTML = '<div style="padding:8px;font-size:0.8rem;color:#6b7280;">Unable to access camera. Use the QR ID field instead.</div>';
            });
    }).catch(() => {
        qrScannerContainer.innerHTML = '<div style="padding:8px;font-size:0.8rem;color:#6b7280;">Camera not available. Use the QR ID field instead.</div>';
    });
};