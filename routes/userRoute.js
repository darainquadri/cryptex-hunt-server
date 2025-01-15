import { Router } from "express"
import { getLeaderboard, googleAuth, submitAnswer, protect } from "../controllers/userController.js"
import { verifyToken } from "../middlewares/authMiddleware.js"

const userRouter = Router()

userRouter
    .post('/google-auth', googleAuth)
    .post('/submit-answer', verifyToken, submitAnswer)
    .get('/getleaderboard', verifyToken, getLeaderboard)
    .get('/protected', verifyToken, protect)

export { userRouter }