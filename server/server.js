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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

module.exports = { client };
