// QR code generation for NovaBank QR payments.
// Uses the global NOVABANK_USER_EMAIL injected by qr_payment.php.

document.addEventListener('DOMContentLoaded', function () {
    if (typeof QRious === 'undefined') {
        return;
    }

    var email = window.NOVABANK_USER_EMAIL;
    var canvas = document.getElementById('userQrCanvas');
    if (!email || !canvas) {
        return;
    }

    // Encode as: novabank|email@example.com
    var payload = 'novabank|' + email;

    new QRious({
        element: canvas,
        value: payload,
        size: 180,
        level: 'H'
    });
});

