import express from "express";
import { prismaClient } from "db/client";
import { AuthInput } from "./types";
import { password } from "bun";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware";

const app = express();
app.use(express.json());

app.post("/website", authMiddleware, async (req, res) => {
    if (!req.body.url) {
        res.status(400).send("Missing url");
        return;
    }
    const website = await prismaClient.website.create({
        //@ts-ignore
        data: {
            url: req.body.url,
            time_added: new Date(),
        },

    })

    res.json({
        id: website.id
    })
})

app.get("/status/:websiteId", authMiddleware, (req, res) => {
    const website = prismaClient.website.findFirst({
        where: {
            user_id: req.userId!,
            id: req.params.websiteId
        }, include: {
            ticks: {
                orderBy: [{
                    createdAt: "desc"
                }],
                take: 1
            }
        }
    })

    if(!website) {
        res.status(404).send("Website not found");
        return;
    }

    res.json({website});

});

app.post("/user/signup", async (req, res) => {
    const data = AuthInput.safeParse(req.body);
    if (!data.success) {
        console.log(data.error.toString());
        res.status(403).send("");
        return;
    }

    try {
        let user = await prismaClient.user.create({
            data: {
                username: data.data.username,
                password: data.data.password
            }
        })
        res.json({
            id: user.id
        })
    } catch (e) {
        console.log(e);
        res.status(403).send("");
    }
})

app.post("/user/signin", async (req, res) => {
    const data = AuthInput.safeParse(req.body);
    if (!data.success) {
        res.status(403).send("");
        return;
    }

    let user = await prismaClient.user.findFirst({
        where: {
            username: data.data.username
        }
    })

    if (user?.password !== data.data.password) {
        res.status(403).send("");
        return;
    }

    let token = jwt.sign({
        sub: user.id
    }, process.env.JWT_SECRET!)


    res.json({
        jwt: token
    })
})
app.listen(process.env.PORT || 3000, () => {
    console.log(`App listening on port 3000`);
});




