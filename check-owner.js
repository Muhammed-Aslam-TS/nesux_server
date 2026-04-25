import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import Owner from "./model/OwnerModels.js";

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  const owner = await Owner.findOne({ username: "owner" });
  if (owner) {
    console.log("Owner found:");
    console.log("Username:", owner.username);
    console.log("Primary Domain:", owner.primaryDomain);
    console.log("Store Domains:", owner.storeDomains);
  } else {
    console.log("Owner 'owner' not found");
  }
  await mongoose.disconnect();
}

check();
