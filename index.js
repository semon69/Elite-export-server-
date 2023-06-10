const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.port || 5000;

// const corsConfig = {
//     origin: '',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE']
// }
// app.use(cors(corsConfig))
// app.options("", cors(corsConfig))
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    console.log(process.env.PAYMENT_SECRET_KEY);
    res.send('La Masia is running')
})


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
    })
}



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
        const paymentClassCollection = client.db('sportsDB').collection('payment')
        const enrolledCollection = client.db('sportsDB').collection('enrolledClass')

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })

        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass)
            res.send(result)
        })

        app.patch('/classes/:id', async (req, res) => {
            const status = req.body
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: status.status
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.patch('/classes/feedback/:id', async (req, res) => {
            const feedback = req.body
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    feedback: feedback.feedback
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.get('/popularClass', async(req, res)=> {
            const result = await classCollection.find().sort({enrolStudent: -1}).limit(6).toArray()
            res.send(result)
        })

        app.get('/instructor', async (req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result)
        })

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.get('/user/instructor', async (req, res) => {
            const query = { role: 'instructor' }
            const result = await usersCollection.find(query).toArray()
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

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ instructor: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const result = { instructor: user?.role === 'instructor' }
            res.send(result)
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instructor'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.get('/myClass', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await myClassCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/myEnrollClass', verifyJWT, async(req, res)=> {
            const email = req.query.email;
            const query = {email: email}
            const result = await enrolledCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/paymentHistory',verifyJWT, async(req, res)=> {
            const email = req.query.email;
            const query = {email: email}
            const result = await paymentClassCollection.find(query).sort({date:-1}).toArray()
            res.send(result)
        })

        app.get('/instructorClass', verifyJWT, verifyInstructor, async (req, res) => {
            const email = req.query.instructorEmail;
            const query = { instructorEmail: email }
            const result = await classCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/myClass', async (req, res) => {
            const newClass = req.body
            const result = await myClassCollection.insertOne(newClass)
            res.send(result)
        })

        app.delete('/myClass/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await myClassCollection.deleteOne(query)
            res.send(result)
        })

        // Payment System
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentClassCollection.insertOne(payment);

            const query = { _id: { $in: payment.classes.map(id => new ObjectId(id)) } }
            const deleteResult = await myClassCollection.deleteMany(query)
          

            const classId = payment.classId;

            const enrolledClasses = await classCollection.find({ _id: { $in: classId.map((id) => new ObjectId(id)) } }).toArray()
            const enrolledClassesWithEmail = enrolledClasses.map((enrolledClass) => {
                return { ...enrolledClass, email: payment.email, classId: enrolledClass._id, _id: undefined };
            });

            const enrolledResult = await enrolledCollection.insertMany(enrolledClassesWithEmail);

           
            
            const updateClassesResult = await classCollection.updateMany(
                { _id: { $in: classId.map((id) => new ObjectId(id)) } },
                { $inc: {availableSeats: -1, enrolStudent: 1 } }
            );

            res.send({ insertResult, deleteResult, enrolledResult, updateClassesResult  });
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