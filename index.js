const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000

// middleware 
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: Stripe } = require('stripe');
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.6wm6qxp.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classesCollection = client.db('sportsAcademy').collection('classes')
    const usersCollection = client.db('sportsAcademy').collection('users')
    const instructorsCollection = client.db('sportsAcademy').collection('instructors')
    const myClassCollection = client.db('sportsAcademy').collection('myClass')
    const addClassCollection = client.db('sportsAcademy').collection('addClass')
    const paymentCollection = client.db('sportsAcademy').collection('payments')

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    // users related apis
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

   
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    // make admin 
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    // make instructor 
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      try {
        const { email } = req.params;
    
        if (req.decoded.email !== email) {
          return res.send({ instructor: false });
        }
    
        const query = { email };
        const user = await usersCollection.findOne(query);
        const result = { instructor: user?.role === 'instructor' };
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'An error occurred while retrieving instructor information.' });
      }
    });
    
    app.patch('/users/instructor/:id', async (req, res) => {
      try {
        const { id } = req.params;
    
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'instructor',
          },
        };
    
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'An error occurred while updating user role.' });
      }
    });

    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result)
    })
    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.findOne(query)
      res.send(result)
    })
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray()
      res.send(result)
    })

    // my selected class ----------- 
    app.get('/myclass', async (req, res) => {
      const cursor = myClassCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/myclass/:email', async (req, res) => {
      const result = await myClassCollection.find({
        user: req.params.email
      }).toArray()
      res.send(result)
    })

    // add class -------
    app.post('/addclass', async(req, res) =>{
      const addClass = req.body;
      const result = await addClassCollection.insertOne(addClass)
      res.send(result)
    })
    app.get('/addclass', async(req, res) =>{
      const cursor = addClassCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    // my class -------------
    app.get('/myclass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await myClassCollection.findOne(query)
      res.send(result)
    })

    app.post('/myclass', async (req, res) => {
      const addClass = req.body;
      // console.log(addClass);
      const result = await myClassCollection.insertOne(addClass)
      res.send(result)
    })
    app.delete('/myclass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await myClassCollection.deleteOne(query)
      res.send(result)
    })

    // create payment intent ------------
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
    // payment related api ---
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment)
      const query = { _id: { $in: payment.myClass.map(id => new ObjectId(id)) } }
      const deleteResult = await myClassCollection.deleteMany(query)
      res.send({ insertResult, deleteResult })
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



app.get('/', (req, res) => {
  res.send('sports academy is running')
})
app.listen(port, () => {
  console.log(`running on port is ${port}`);
})