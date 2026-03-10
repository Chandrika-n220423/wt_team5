// Chart.js analytics for the user dashboard.
// Uses NOVABANK_STATS injected by dashboard.php.

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Chart === 'undefined') {
        return;
    }

    var stats = window.NOVABANK_STATS || [];
    if (!Array.isArray(stats) || stats.length === 0) {
        return;
    }

    var labels = stats.map(function (row) { return row.month; });
    var deposits = stats.map(function (row) { return Number(row.deposits) || 0; });
    var withdrawals = stats.map(function (row) { return Number(row.withdrawals) || 0; });
    var transactions = stats.map(function (row) { return Number(row.total_transactions) || 0; });

    var ctx1 = document.getElementById('depositsWithdrawalsChart');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Deposits',
                        data: deposits,
                        backgroundColor: 'rgba(37, 99, 235, 0.8)'
                    },
                    {
                        label: 'Withdrawals',
                        data: withdrawals,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        });
    }

    var ctx2 = document.getElementById('transactionsChart');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Transactions',
                        data: transactions,
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, precision: 0 }
                }
            }
        });
    }
});

