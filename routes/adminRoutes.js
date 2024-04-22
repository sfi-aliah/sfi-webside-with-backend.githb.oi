import express from "express";
import passport from "passport";
import sqlite3 from "sqlite3";
import { about_data } from "../index.js";
import User from "../models/usersModel.js";
import Home from "../models/homeDataModel.js";
import Gallery from '../models/galleryModel.js'
import nenModel from "../models/nenModel.js";
import isAuthenticated from "../midelwire/authMiddleware.js";
import { compressImageToTargetSize } from "../userdefineFuntion.js";
import { Buffer } from "buffer";
import multer from "multer";

const router = express.Router();
const db = new sqlite3.Database("sfi-dataBase.db");
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage

router.get("/admin", isAuthenticated, async (req, res) => {
  // Check if the user is an admin
  if (req.user.position !== "Admin") {
    const message = "Sorry, you don't have permission to see the admin route!";
    return res.redirect(`/login?message=${encodeURIComponent(message)}`);
  }

  try {
    // Fetch data from the database
    const [userRows, homeRows,nenRows,galleryRows] = await Promise.all([User.find(), Home.find(),nenModel.find({type:'Notification'}),Gallery.find()]);

    // Render the admin.ejs template with the fetched data
    res.render("admin.ejs", {
      users: userRows,
      home: homeRows,
      Notifications:nenRows,
      gallery: galleryRows,
      about_data: about_data,
    });
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/admin/user-data/update/:id", isAuthenticated, (req, res) => {
  const userId = req.params.id;
  User.findById(userId)
    .then((userData) => {
      // Check if user data is found
      if (userData.length === 0) {
        // If user data is not found, send an appropriate response
        return res.status(404).json({ message: "User not found" });
      }
      // If user data is found, send it back to the client
      res.render("update-user.ejs", { user: userData });
    })
    .catch((error) => {
      // Handle error
      console.error(error);
      // Send an error response
      res.status(500).json({ message: "Internal server error" });
    });
});

// Route to handle updating user data
router.post("/admin/user-data/update", isAuthenticated, async (req, res) => {
  // Extract user data from the request body
  try {
    const { id, username, email, phone, position } = req.body;
    // Update the user data
    const response = await User.findByIdAndUpdate(
      id,
      { name: username, email, phoneno: phone, position },
      { new: true }
    );
    // Check if user data is found and updated
    if (!response) {
      return res.status(500).send("Internal Server Error");
    }
    // Redirect to '/admin' after successful update
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(400).send("Internal server error");
  }
});
// Router to delete user
router.post("/admin/user-data/delete", isAuthenticated, (req, res) => {
  // Extract the user ID from the request parameters
  const userId = req.body.id;

  User.findByIdAndDelete(userId)
    .then((deletedUser) => {
      // Check if user was found and deleted
      if (!deletedUser) {
        // If user was not found, send a 404 response
        return res.status(404).json({ message: "User not found" });
      }
      // Redirect to '/admin' after successful deletion
      res.redirect("/admin");
    })
    .catch((error) => {
      // Handle error
      console.error(error);
      // Send an error response
      res.status(500).json({ message: "Internal server error" });
    });
});

//
router.get("/admin/add-home-data", isAuthenticated, (req, res) => {
  res.render("add-home-data.ejs");
});

router.post(
  "/admin/add-home-data",
  isAuthenticated,
  upload.single("image"),
  async (req, res) => {
    try {
      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Compress the image using the provided function
      const compressedImageBuffer = await compressImageToTargetSize(
        req.file.buffer,
        100
      ); 

      // Convert the compressed image buffer to Base64 format
      const base64Image = compressedImageBuffer.toString("base64");
      const base64ImageUri = `data:image/jpeg;base64,${base64Image}`;
      const { name, content } = req.body;

      // Store the data in your database (not shown in the code)
      const home = await Home.create({ name, content, image: base64ImageUri });
      if (!home) {
        res.status(400).json({ message: "Data Not added to the Data Base" });
      }
      res.redirect("/admin");
      // Respond with a success message and the Base64 image URI
    } catch (error) {
      console.error("Error handling form submission:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get("/admin/home-data/update/:id", async (req, res) => {
  const id = req.params.id;

  try {
    // Fetch the home data by ID
    const home = await Home.findById(id);
    // Check if home data was found
    if (!home) {
      return res.status(404).send("Home data not found");
    }

    // Render the update-home-data.ejs template and pass the home data
    res.render("update-home-data.ejs", { home });
  } catch (error) {
    console.error("Error fetching home data:", error);
    res.status(500).send("Internal server error");
  }
});
router.post(
  "/admin/home-data/update",
  isAuthenticated,
  upload.single("image"),
  async (req, res) => {
    const { id, name, content } = req.body;
    try {
      if (!req.file) {
        const update = await Home.findByIdAndUpdate(
          id,
          { name, content },
          { new: true }
        );
        if (!update) {
          res.status(404).send("Home data Not update");
        }
        res.redirect("/admin");
      }
      if (req.file) {

      // Compress the image using the provided function
      const compressedImageBuffer = await compressImageToTargetSize(
        req.file.buffer,
        100
      );

      // Convert the compressed image buffer to Base64 format
      const base64Image = compressedImageBuffer.toString("base64");
      const base64ImageUri = `data:image/jpeg;base64,${base64Image}`;

      // Store the data in your database (not shown in the code)
      const home = await Home.findByIdAndUpdate(id,{ name, content, image: base64ImageUri },{new:true});
      if (!home) {
        res.status(400).json({ message: "Data Not added to the Data Base" });
      }
      res.redirect("/admin");
      // Respond with a success message and the Base64 image URI
      }
    } catch (error) {
      console.error(error);
      res.status(400).send("Internal server error");
    }
  }
);
router.post('/admin/home-data/delete',isAuthenticated,(req,res)=>{
    const {id}=req.body;
    Home.findByIdAndDelete(id)
    .then((deleteHome) => {
      // Check if user was found and deleted
      if (!deleteHome) {
        // If user was not found, send a 404 response
        return res.status(404).json({ message: "Home Data not found" });
      }
      // Redirect to '/admin' after successful deletion
      res.redirect("/admin");
    })
    .catch((error) => {
      // Handle error
      console.error(error);
      // Send an error response
      res.status(500).json({ message: "Internal server error" });
    });
});

router.get('/admin/add-notification',(req,res)=>{
  res.render('addnotification.ejs');
})

router.post('/admin/add-Notification',upload.single("notificationImage"),async(req,res)=>{
  console.log(req.body)
 try {
   if(!req.file){
     res.status(400).send({message:"Image Not Found"});
   }
     // Compress the image using the provided function
     const compressedImageBuffer = await compressImageToTargetSize(
      req.file.buffer,
      100
    );

    // Convert the compressed image buffer to Base64 format
    const base64Image = compressedImageBuffer.toString("base64");
    const base64ImageUri = `data:image/jpeg;base64,${base64Image}`;

   const {title,content,type}=req.body;
   if(!title,!content,!type){
     res.status(400).send({message:"Plz Fill The fields "});
   }

const response=await nenModel.create({title,content,type,thumbnail:base64ImageUri});
if (!response) {
  res.status(400).json({ message: "Data Not added to the Data Base" });

}
res.redirect('/admin')
 } catch (error) {
  console.error("Error handling form submission:", error);
  res.status(500).json({ error: "Internal server error" });
 }
});

router.post('/admin/nen-data/update/:id',isAuthenticated,async(req,res)=>{
  const id=req.params;
  console.log(id)
});

router.get('/admin/add-gallery-image',isAuthenticated,(req,res)=>{
  res.render('add-galery-image.ejs')
})

router.post('/admin/add-gallery-image',isAuthenticated,upload.single('gallary_image'),async(req,res)=>{
  console.log(req.body);
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Compress the image using the provided function
    const compressedImageBuffer = await compressImageToTargetSize(
      req.file.buffer,
      100
    ); 

    // Convert the compressed image buffer to Base64 format
    const base64Image = compressedImageBuffer.toString("base64");
    const base64ImageUri = `data:image/jpeg;base64,${base64Image}`;
    const { title, banner } = req.body;
if(!banner=='yes'){
banner=null;
}
    // Store the data in your database (not shown in the code)
    const home = await Gallery.create({ title, image: base64ImageUri ,banner});
    if (!home) {
      res.status(400).json({ message: "Data Not added to the Data Base" });
    }
    res.redirect("/admin");
    // Respond with a success message and the Base64 image URI
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post('/admin/gallery/delete',isAuthenticated,async(req,res)=>{
  const {id}=req.body;
  // console.log(id);
  try {
    const gallery=await Gallery.findByIdAndDelete(id);
    if (!gallery) {
      res.status(400).json({error:"Can't delete the image now "})
    }
    res.redirect('/admin')
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
  
})

export default router;
