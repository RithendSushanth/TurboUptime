import { xAddBulk, xAdd } from "redstream/client";
import { prismaClient } from "db/client";

async function main() {
    let websites = await prismaClient.website.findMany({
        select: {
            url: true,
            id: true
        }
    })


    await xAddBulk(websites.map(website => ({
        url: website.url, id: website.id
    })
    ))
}

setInterval(() => {
    main()
}, 3 * 1000 * 60);

main();