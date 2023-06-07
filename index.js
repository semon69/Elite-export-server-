const express = require('express');
const app = express();
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.port || 5000;

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('La Masia is running')
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kyulyzl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const usersCollection = client.db('sportsDB').collection('users')
        const classCollection = client.db('sportsDB').collection('classes')
        const instructorCollection = client.db('sportsDB').collection('instructor')
        const myClassCollection = client.db('sportsDB').collection('myClass')

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })

        app.get('/instructor', async (req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }

            const existingUser = await usersCollection.findOne(query)
            console.log('existing user', existingUser);
            
            if (existingUser) {
                return res.send({ message: 'user already exist' })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        app.get('/myClass', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await myClassCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/myClass', async (req, res) => {
            const newClass = req.body
            const result = await myClassCollection.insertOne(newClass)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`La Masia in running on port: ${port}`);
})