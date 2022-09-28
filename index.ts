import express from "express";
import cors from 'cors'
import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())
const port = 5000
const SECRET = 'Psssst'

const prisma = new PrismaClient({ log: ['warn', 'error', 'info', 'query'] })

function getToken(id: number) {
    return jwt.sign({ id: id }, SECRET, { expiresIn: '1 day' })
}

async function keepUser(token: string) {
    const dataInCode = jwt.verify(token, SECRET)
    //@ts-ignore
    const userON = await prisma.user.findUnique({ where: { id: dataInCode.id } })

    return userON
}

app.get('/users', async (req, res) => {
    const getUser = await prisma.user.findMany()
    res.send(getUser)
})

app.post('/sign-up', async (req, res) => {

    try {
        const match = await prisma.user.findUnique({
            where: { email: req.body.email }
        })
        if (match) {
            res.status(400).send({ error: "This Email is already in use" })
        } else {
            const newUser = await prisma.user.create({
                data: {
                    email: req.body.email,
                    password: bcrypt.hashSync(req.body.password)
                }
            })
            res.send({ newUser: newUser, token: getToken(newUser.id) })
        }
    } catch (error) {
        res.status(404).send(error)
    }

})

app.post('/log-in', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { email: req.body.email }
    })
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
        res.send({ user: user, token: getToken(user.id) })
    } else {
        res.status(400).send({ error: "Incorrect Email or password. Try again!" })
    }
})

app.get('/validation', async (req, res) => {
    try {
        if (req.headers.authorization) {
            const user = await keepUser(req.headers.authorization)
            // @ts-ignore
            res.send({ user, token: getToken(user?.id) })
        }

    } catch (error) {
        // @ts-ignore
        res.status(400).send({ error: error.message })
    }

})
app.get('/user', async (req, res) => {
    const user = await prisma.user.findMany({ include: { tweets: true, comment: true } })
    res.send(user)
})

app.get('/user/:id', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: Number(req.params.id) },
        include: { tweets: true, comment: true }
    })
    if (user) {
        res.send(user)
    } else {
        res.status(404).send({ error: "User not found" })
    }
})

app.get('/tweets', async (req, res) => {
    const tweets = await prisma.tweets.findMany({
        include: { User: true, like: true, comment: true }
    })
    res.send(tweets)
})

app.get('/tweets/:id', async (req, res) => {
    const tweets = await prisma.tweets.findUnique({
        where: { id: Number(req.params.id) },
        include: { User: true, like: true, comment: true }
    })
    if (tweets) {
        res.send(tweets)
    } else {
        res.status(404).send({ error: "Tweet not found" })
    }
})

app.post('/tweet', async (req, res) => {
    await prisma.tweets.create({ data: req.body, include: { like: true, comment: true } })
    const newTweet = await prisma.tweets.findMany({
        include: { User: true, like: true, comment: true }
    })
    res.send(newTweet)
})


app.listen(port, () => {
    console.log(`App is running in http://localhost:${port}`)
})