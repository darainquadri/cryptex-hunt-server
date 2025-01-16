import jwt from "jsonwebtoken"
import { supabase } from "../models/supabase.js"
import axios from "axios"
import isEmail from "validator/lib/isEmail.js";

const fetchQuestion = async ({ current_question }) => {
    try {

        let { data: question, error } = await supabase
            .from('questions')
            .select('id, url, hint')
            .eq('id', current_question)
            .single()

        if (error) {
            throw new Error('Internal server error')
        }

        return question

    } catch (err) {
        throw new Error(err.message)
    }
}

const authenticate = async (email) => {
    try {
        if (!email || !isEmail(email)) throw new Error('A valid email is required')

        let { data: user } = await supabase
            .from('users')
            .select('id, email, current_question, is_banned')
            .eq('email', email)
            .single()

        if (user && user.is_banned) {
            throw new Error('User is banned')
        }
        else if (user) {
            if (parseInt(user.current_question) > parseInt(process.env.QUESTION_COUNT)) {
                return { message: 'A deed done and dusted\nYou are clearly the bravest to grace upon us\nYou have defeated the Cryptex', token }
            }
            const token = jwt.sign({ ...user }, process.env.JWT_SECRET, { expiresIn: '3d' })
            const question = await fetchQuestion({ ...user })
            return { ...user, ...question, token }
        }

        const { error } = await supabase
            .from('users')
            .insert([{ email }])

        if (error) {
            throw new Error('A valid email is required')
        }

        let { data: newUser } = await supabase
            .from('users')
            .select('id, email, current_question, is_banned')
            .eq('email', email)
            .single()

        if (newUser && newUser.is_banned) {
            throw new Error('User is banned')
        }
        else if (newUser) {
            const token = jwt.sign({ ...newUser }, process.env.JWT_SECRET, { expiresIn: '3d' })
            const question = await fetchQuestion({ ...newUser })
            return { ...newUser, ...question, token }
        }

    } catch (err) {
        console.error(err)
        throw new Error(err.message)
    }
}

const googleAuth = async (req, res) => {
    try {
        const googleToken = req.headers?.authorization?.split(" ")[1]
        const googleResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${googleToken}` },
        })
        const authResponse = await authenticate(googleResponse.data.email)
        res.status(201).json({ user: authResponse })
    } catch (err) {
        res.status(401).json({ message: err.message })
    }
}

const winner = (res, token) => {
    res.status(202).json({ user: { message: 'A deed done and dusted\nYou are clearly the bravest to grace upon us\nYou have defeated the Cryptex', token } })
}

const submitAnswer = async (req, res) => {
    try {
        const user = req.user
        let answer = req.body.answer.toLowerCase().trim()

        if (!user) {
            throw new Error("Request has been manipulated")
        }

        if (parseInt(user.current_question) > parseInt(process.env.QUESTION_COUNT)) {
            const token = jwt.sign({ ...user }, process.env.JWT_SECRET)
            return winner(res, token)
        }

        const { error } = await supabase
            .from('logs')
            .insert([
                { question_id: user.current_question, email: user.email, input: answer },
            ])

        if (error) {
            console.error(error.message)
        }

        let { data: questionInfo, error: fault } = await supabase
            .from('questions')
            .select('answer')
            .eq('id', user.current_question)
            .single()

        if (fault) {
            console.error(fault)
        }

        if (`f${answer}` === `f${questionInfo.answer.toLowerCase().trim()}`) {
            if (parseInt(user.current_question) >= parseInt(process.env.QUESTION_COUNT)) {
                const { error: bug } = await supabase
                    .from('users')
                    .update({ current_question: user.current_question + 1 })
                    .eq('email', user.email)
                if (bug) {
                    throw new Error("Cannot verify user's identity")
                }
                const token = jwt.sign({ ...user, current_question: user.current_question + 1 }, process.env.JWT_SECRET)
                return winner(res, token)
            } else {
                const { error: bug } = await supabase
                    .from('users')
                    .update({ current_question: user.current_question + 1 })
                    .eq('email', user.email)
                if (bug) {
                    throw new Error("Cannot verify user's identity")
                }
                const token = jwt.sign({ ...user, current_question: user.current_question + 1 }, process.env.JWT_SECRET)
                const question = await fetchQuestion({ current_question: user.current_question + 1 })
                res.status(201).json({ user: { ...user, current_question: user.current_question + 1, ...question, token } })
            }
        } else {
            throw new Error('Incorrect Answer')
        }
    }
    catch (err) {
        res.status(401).json(err.message)
    }
}

const getLeaderboard = async (req, res) => {

    let { data: users, error } = await supabase
        .from('users')
        .select('email, current_question')
        .eq('is_banned', false)
        .order('current_question', { ascending: false })
        .order('updated_at', { ascending: true })

    return res.status(200).json({ leaderboard: users })

}

const protect = async (req, res) => {
    const user = req.user
    if (parseInt(user.current_question) > parseInt(process.env.QUESTION_COUNT)) {
        const token = jwt.sign({ ...user }, process.env.JWT_SECRET)
        return winner(res, token)
    }
    const token = jwt.sign({ ...user }, process.env.JWT_SECRET)
    const question = await fetchQuestion({ current_question: user.current_question })
    res.status(200).json({ user: { ...req.user, ...question, token } })
}

export { protect, googleAuth, submitAnswer, getLeaderboard }