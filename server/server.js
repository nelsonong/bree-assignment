const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const faunadb = require("faunadb");

// Get environment variables from .env
dotenv.config();

// This client does not have write privileges
const client = new faunadb.Client({ secret: process.env.FAUNDB_SECRET_KEY });

// FQL functions
const {
    Ref,
    Paginate,
    Documents,
    Get,
    Match,
    Select,
    Index,
    Create,
    Collection,
    Join,
    Map,
    Lambda,
} = faunadb.query;

const app = express();
app.use(cors());

app.get('/users', async (req, res) => {
    try {
        const docs = await client.query(
            Map(
                Paginate(Documents(Collection('Users'))),
                Lambda(x => Get(x))
            )
        );
        const users = docs.data.map(doc => doc.data);
        res.send(users);
    } catch (e) {
        res.send(e);
    }
});

app.get('/predictions/:email', async (req, res) => {
    try {
        const docs = await client.query(
            Map(
                Paginate(Match(Index('transactions_by_email'), req.params.email)),
                Lambda(x => Get(x))
            )
        );
        if (docs.data.length) {
            const { transactions } = docs.data[0].data;
            res.send(transactions);
        }
    } catch (e) {
        res.send(e);
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

module.exports = { client };
