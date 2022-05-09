const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const faunadb = require("faunadb");

// Get environment variables from .env
dotenv.config();

// This client does not have write privileges
const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET_KEY });

// FQL functions
const {
    Paginate,
    Documents,
    Get,
    Match,
    Index,
    Collection,
    Map,
    Lambda,
} = faunadb.query;

const app = express();
app.use(cors());

// Return the list of users
app.get('/users', async (req, res) => {
    const docs = await client.query(
        Map(
            Paginate(Documents(Collection('Users'))),
            Lambda(x => Get(x))
        )
    );
    const users = docs.data.map(doc => doc.data);
    res.send(users);
});

// Process transactions from an email into useful display info on client
const processIncomeTransactions = async (transactions) => {
    // The window of days to consider a date to still be "recurring"
    const bufferDays = Number(process.env.BUFFER_DAYS) || 5;

    // Create map of source to transactions
    let transactionsBySource = {};
    transactions.forEach(transaction => {
        const {name, date, amount} = transaction;
        if (amount > 0) {
            const source = name.toLowerCase();
            if (transactionsBySource[source] === undefined) {
                transactionsBySource[source] = [];
            }
            transactionsBySource[source].push({date, amount});
        }
    });

    // Generate a list of recurring source objects to return
    let recurringSources = [];
    for (const source in transactionsBySource) {
        // Sort transactions by date
        const sortedTransactionsByDate = transactionsBySource[source].sort((transaction1, transaction2) => new Date(transaction1.date) - new Date(transaction2.date));

        // Keep track of total amount to calculate average later
        let totalPayment = 0;

        // Calculate and store days between transactions
        let processedTransactions = [];
        sortedTransactionsByDate.forEach(transaction => {
            const {date, amount} = transaction;

            totalPayment += amount;

            let daysFromLastPayment = -1;
            
            if (processedTransactions.length > 0) {
                const [previousTransaction] = processedTransactions.slice(-1);
                
                // If 2 income sources come on the same day, treat them as 1
                if (previousTransaction.date === date) {
                    processedTransactions[processedTransactions.length - 1].amount += amount;
                    return;
                }
                
                const differenceMs = new Date(date).getTime() - new Date(previousTransaction.date).getTime();
                daysFromLastPayment = differenceMs / (1000 * 3600 * 24);
            }

            processedTransactions.push({date, amount, daysFromLastPayment});
        });

        // Must have at least 3 transactions on unique dates
        if (processedTransactions.length < 3) continue;
        
        // Determine if days between transactions are consistent enough to be considered "recurring"
        let recurring = true;
        let estDaysBetweenPayments = -1;
        processedTransactions.forEach(transaction => {
            const { daysFromLastPayment } = transaction;
            // Use first found days between payments as estimate for benchmark
            if (estDaysBetweenPayments === -1 && daysFromLastPayment !== -1) {
                estDaysBetweenPayments = daysFromLastPayment;
                return;
            }
            
            // Give payment days a buffer window (optional)
            const upperDaysAmount = estDaysBetweenPayments + bufferDays;
            const lowerDaysAmount = estDaysBetweenPayments - bufferDays;
            if (daysFromLastPayment > upperDaysAmount || daysFromLastPayment < lowerDaysAmount) {
                recurring = false;
                return;
            }
        });

        // If source is recurring, calculate and add useful info to display on client
        if (recurring) {
            const averagePayment = totalPayment / processedTransactions.length;
            const [mostRecentTransaction] = processedTransactions.slice(-1);
            const mostRecentPaymentDate = new Date(mostRecentTransaction.date);
            mostRecentPaymentDate.setDate(mostRecentPaymentDate.getDate() + estDaysBetweenPayments);
            recurringSources.push({
                source,
                transactions: processedTransactions.length,
                averagePayment: averagePayment.toFixed(2),
                mostRecentPayment: mostRecentTransaction.amount.toFixed(2),
                estimatedPayDate: mostRecentPaymentDate.toLocaleDateString()
            })
        }
    }

    const recurringSourcesByNextPayDate = recurringSources.sort((source1, source2) => new Date(source1.estimatedPayDate) - new Date(source2.estimatedPayDate));
    return recurringSourcesByNextPayDate;
}

// Return user recurring income, given email
app.get('/predictions/:email', async (req, res) => {
    const docs = await client.query(
        Map(
            Paginate(Match(Index('transactions_by_email'), req.params.email)),
            Lambda(x => Get(x))
        )
    );
    if (docs.data.length) {
        const { transactions } = docs.data[0].data;
        const processed = await processIncomeTransactions(transactions);
        res.send(processed);
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

module.exports = { client };
