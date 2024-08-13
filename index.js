const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: 'api', 
  key: process.env.MAIL_GUN_API_KEY
});


const port = process.env.PORT || 5000;



// middleware
app.use(cors());

app.use(cors({
  origin: ['http://localhost:5173' , 'https://bistro-boss-da37b.web.app']
}));


app.use(express.json());


const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
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
    // await client.connect();

    const usersCollection = client.db("bistroDB").collection("users");
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("carts");
    const paymentCollection = client.db("bistroDB").collection("payments");


    //jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({
        token
      })
    })

    //middlewares
    const verifyToken = (req, res, next) => {
      console.log('Inside Verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({
          message: 'UnAuthorized access'
        })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({
            message: 'UnAuthorized access'
          })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after VerifyToken
    const verifyAdmin = async (req , res , next) =>{
      const email = req.decoded.email;
      const query = { email:email }
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'});
      }
      next();
    }


    //users related api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.header)
      const result = await usersCollection.find().toArray();
      res.send(result)
    });

    app.get('/users/admin/:email', verifyToken,async(req,res) => {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message:"forbidden access"})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({admin})
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesn't exists:
      // you can do this many ways(1.email unique,2.upsert 3. simple checking)
      const query = {
        email: user.email
      }
      const exitingUser = await usersCollection.findOne(query);
      if (exitingUser) {
        return res.send({
          message: 'user already exists',
          insertedId: null
        })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: new ObjectId(id)
      };
      const updateDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    app.delete('/users/:id',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    //menu related apis
    // Insert a document into the collection`
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    app.get('/menu/:id', async (req , res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
    })

    app.post('/menu', verifyToken, verifyAdmin, async (req,res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    app.patch('/menu/:id' , async (req,res) => {
      const item = req.body;
      console.log(item)
      const id = req.params.id;
      // console.log(id)
      const filter = { _id : new ObjectId(id) }
      console.log(filter)
      const updateDoc = {
        $set:{
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updateDoc)
      res.send(result);
    })

    app.delete('/menu/:id', verifyToken,verifyAdmin, async (req,res) =>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id) }
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    // cart collection
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email
      }
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
      const query = {
        _id: new ObjectId(id)
      }
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    //payment intent
    app.post('/create-payment-intent' , async(req,res) => {
      const { price} = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })

    app.get('/payments/:email', verifyToken, async(req , res) => {
      const query = { email: req.params.email }
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/payments' , async (req , res) =>{
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      // carefully delete each item from the cart
      console.log('payment info' , payment);
      const query = { _id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }}
      const deleteResult = await cartCollection.deleteMany(query);

      //send user email about payment confirmation
      
      mg.messages.create(process.env.MAIL_SENDING_DOMAIN, {
        from: "Excited User <mailgun@sandbox2fe48daa6c374add824dff49665a381f.mailgun.org>",
        to: ["zaheenrakib0@gmail.com"],
        subject: "Bistro Boss Order Confirmation",
        text: "Testing some Mailgun awesomness!",
        html: `<div>
        <h2>Thanks you for your Order</h2>
        <h4>Your Transaction Id: <strogn>
        ${payment.transactionId}
        </strogn> </h4>
        <p>We Would like to get your feedback about the food</p>
        </div>`
      })
      .then(msg => console.log(msg)) // logs response data
      .catch(err => console.error(err)); // logs any error


            res.send({paymentResult , deleteResult});
          })



    // stats or analytics
    app.get('/admin-stats', verifyToken,verifyAdmin, async(req,res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const menuItems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // this is not the best way
      // const payments = await paymentCollection.find().toArray();
      // const revenue = payments.reduce((total,payment) => total + payment.price,0);

      const result = await paymentCollection.aggregate([
        {
          $group:{
            _id: null,
            totalRevenue:{
              $sum: '$price'
            }
          } 
        }
      ]).toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItems,
        orders,
        revenue
      })
    });

    //oders status
    /**
     * --------------------------------
     *             NON-Efficient Way
     * --------------------------------
     * 1.load all payments
     * 2. For every menuItemsIds (Whice is an array), go find the item from menu collection
     * 3. for every item in the menu callection that you found from a payment entry (document)    
     */

    //useing aggregate pipeline
    app.get('/order-stats', verifyToken,verifyAdmin, async (req , res) => {
      const result = await paymentCollection.aggregate([
        {
          $addFields: {
              // Convert each menuItemId in the array to ObjectId
              menuItemIds: {
                  $map: {
                      input: '$menuItemIds',
                      as: 'menuItemId',
                      in: { $toObjectId: '$$menuItemId' }
                  }
              }
          }
      },
      {
          $unwind: '$menuItemIds' // Unwind the converted ObjectIds
      },
      {
          $lookup: {
              from: 'menu',
              localField: 'menuItemIds',  // Field in paymentCollection to match (now ObjectId)
              foreignField: '_id',        // ObjectId field in menu collection to match
              as: 'menuItems'
          }
      },
      {
        $unwind: '$menuItems'
      },
      {
        $group: {
          _id: '$menuItems.category',
          quantity: { $sum: 1 },
          revenue: { $sum: "$menuItems.price"}
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          quantity: '$quantity',
          revenue: '$revenue'
        }
      }

      ]).toArray()

      res.send(result);

    })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ping: 1});
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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