import express from "express"
import cors from "cors"
import { configDotenv } from "dotenv"
import { userRouter } from "./routes/userRoute.js"

configDotenv()

const app = express()
const PORT = process.env.PORT || 3000
const eventEndDate = new Date(2025, 0, 15, 23, 59, 59);

const corsOptions = {
    origin: process.env.CLIENT_URL,
    methods: "GET, POST",
}

const checkEvent = (req, res, next) => {
    if (new Date() > eventEndDate) {
        res.status(307).json({ message: 'Cryptex has concluded' })
    } else {
        next()
    }
}

app.use(cors(corsOptions));
app.use(express.json())

app.use(checkEvent)

app.use('/api/user', userRouter)

app.listen(PORT, () => console.log(`Server started at PORT ${PORT}`))