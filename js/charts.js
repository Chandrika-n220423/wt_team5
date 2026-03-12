// Chart.js analytics

function buildMonthlyStatsForUser(email) {
    const txs = getStore('bank_transactions', []);
    const userTx = txs.filter(tx => tx.from === email || tx.to === email);

    const months = Array.from({ length: 12 }, (_, i) => i);
    const debitTotals = months.map(() => 0);
    const creditTotals = months.map(() => 0);

    userTx.forEach(tx => {
        const d = new Date(tx.createdAt);
        const m = d.getMonth();
        const amt = Number(tx.amount || 0);
        if (tx.type === 'debit') debitTotals[m] += amt;
        else creditTotals[m] += amt;
    });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const totalDebits = debitTotals.reduce((a, b) => a + b, 0);
    const totalCredits = creditTotals.reduce((a, b) => a + b, 0);

    return { monthLabels, debitTotals, creditTotals, totalDebits, totalCredits };
}

window.initChartsForUser = function (email) {
    const { monthLabels, debitTotals, creditTotals, totalDebits, totalCredits } =
        buildMonthlyStatsForUser(email);

    const txCtx = document.getElementById('transactionsChart');
    const balanceCtx = document.getElementById('balanceChart');
    if (!txCtx || !balanceCtx || !window.Chart) return;

    // Monthly bar chart
    new Chart(txCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Debits (₹)',
                    data: debitTotals,
                    backgroundColor: 'rgba(220, 38, 38, 0.6)',
                    borderRadius: 6
                },
                {
                    label: 'Credits (₹)',
                    data: creditTotals,
                    backgroundColor: 'rgba(22, 163, 74, 0.6)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { boxWidth: 14, font: { size: 10 } }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: { size: 9 }
                    }
                },
                y: {
                    ticks: {
                        callback: value => `₹${value}`,
                        font: { size: 9 }
                    }
                }
            }
        }
    });

    // Credits vs Debits doughnut
    new Chart(balanceCtx, {
        type: 'doughnut',
        data: {
            labels: ['Total Debits', 'Total Credits'],
            datasets: [{
                data: [totalDebits, totalCredits],
                backgroundColor: [
                    'rgba(220, 38, 38, 0.8)',
                    'rgba(22, 163, 74, 0.8)'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 10 } }
                }
            },
            cutout: '65%'
        }
    });
};