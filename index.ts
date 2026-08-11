import express from "express";
import router from "./src/routes";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express();

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5500",
  credentials: true
}));
app.use(cookieParser());
app.use(router);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
