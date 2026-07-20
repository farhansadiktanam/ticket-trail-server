const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dontenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    credentials: true,
    origin: [process.env.CLIENT_URL],
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("ticketTrail");
    const vendorCollection = db.collection("vendor");
    const ticketCollection = db.collection("tickets");
    const userCollections = db.collection("user");
    const bookingCollection = db.collection("bookings");
    const paymentCollection = db.collection("payments");

    app.get("/tickets", async (req, res) => {
      const result = await ticketCollection.find().toArray();
      res.send(result);
    });

    app.get("/single-ticket/:ticketId", async (req, res) => {
      const { ticketId } = req.params;
      const result = await ticketCollection.findOne({
        _id: new ObjectId(ticketId),
      });
      res.send(result);
    });

    app.post("/tickets", async (req, res) => {
      try {
        const ticket = {
          ...req.body,
          verificationStatus: "pending",
          isAdvertised: false,
          createdAt: new Date(),
        };
        const result = await ticketCollection.insertOne(ticket);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // POST create a booking (user)
    app.post("/api/bookings", async (req, res) => {
      try {
        const { ticketId, userEmail, quantity } = req.body;

        const ticket = await ticketCollection.findOne({
          _id: new ObjectId(ticketId),
        });
        if (!ticket) return res.status(404).send({ error: "Ticket not found" });
        if (ticket.quantity < quantity) {
          return res.status(400).send({ error: "Not enough seats available." });
        }

        const booking = {
          ticketId,
          ticketTitle: ticket.title,
          ticketImage: ticket.image,
          from: ticket.from,
          to: ticket.to,
          departureDate: ticket.departureDate,
          unitPrice: ticket.price,
          quantity,
          totalPrice: ticket.price * quantity,
          userEmail,
          vendorEmail: ticket.vendorEmail,
          status: "pending",
          createdAt: new Date(),
        };

        const result = await bookingCollection.insertOne(booking);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.post("/api/vendor", async (req, res) => {});

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
