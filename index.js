const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qwmoe1d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const usersCollection = client.db("bistroDB").collection("users");
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("carts");

    //users related api
    app.get('/users' , async(req,res) =>{
      const result = await usersCollection.find().toArray();
      res.send(result)
    })
    app.post('/users', async (req ,res) => {
      const user = req.body;
      // insert email if user doesn't exists:
      // you can do this many ways(1.email unique,2.upsert 3. simple checking)
      const query = {email:user.email}
      const exitingUser = await usersCollection.findOne(query);
      if(exitingUser){
        return res.send({message: 'user already exists', insertedId: null})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id',async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter,updateDoc)
      res.send(result)
    })


    app.delete('/users/:id', async(req,res) =>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)}
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    //menu related apis
    // Insert a document into the collection
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })
    
    // cart collection
    app.get('/carts', async(req,res) => {
      const email = req.query.email;
      const query = {email: email }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    // Delete a document from the collection
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({
      ping: 1
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Boss is Running');
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})

/**
 * ----------------------------------------------
 *        Naming Convention
 * 
 * -----------------------------------------------
 * app.get('/user')
 * app.get('/user/:id')
 * app.post('/user')
 * app.put('/users/:id')
 * app.patch('/users/:id')
 * app.delete('/users/:id')
 * 
 */