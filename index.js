const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware 
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const instructorsCollection = client.db('sportsAcademy').collection('instructors')
    const myClassCollection = client.db('sportsAcademy').collection('myClass')

    app.get('/classes', async(req, res) => {
        const result = await classesCollection.find().toArray()
        res.send(result)
    })
    app.get('/classes/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await classesCollection.findOne(query)
      res.send(result)
    })
    app.get('/instructors', async(req, res) =>{
        const result = await instructorsCollection.find().toArray()
        res.send(result)
    })

    // my selected class ----------- 
    app.get('/myclass', async(req, res) =>{
      const cursor = myClassCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/myclass/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await myClassCollection.findOne(query)
      res.send(result)
    })

    app.post('/myclass', async(req, res) =>{
      const addClass = req.body;
      console.log(addClass);
      const result = await myClassCollection.insertOne(addClass)
      res.send(result)
    })
    app.delete('/myclass/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await myClassCollection.deleteOne(query)
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



app.get('/', (req, res) => {
    res.send('sports academy is running')
})
app.listen(port, () =>{
    console.log(`running on port is ${port}`);
})