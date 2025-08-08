import { createClient } from "redis";

const client = await createClient()
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();

type WebsiteEvent = {
    url: string,
    id: string
}

type MessageType = {
    id: string,
    message: {
        url: string,
        id: string
    }
}


const STREAM_NAME = 'turbouptime:website';

export async function xAdd({ url, id }: WebsiteEvent) {
    await client.xAdd(
        STREAM_NAME, '*', {
        url,
        id
    }
    );
}


export async function xAddBulk(websites: WebsiteEvent[]) {
    for (let i = 0; i < websites.length; i++) {
        await xAdd(
            {
                url: websites[i].url,
                id: websites[i].id
            }
        )
    }
}

export async function xReadGroup(consumerGroup: string, workerId: string): Promise<MessageType[] | undefined> {
    const result = await client.xReadGroup(
        consumerGroup,
        workerId, {
        key: STREAM_NAME,
        id: '>'
    }, {
        'COUNT': 5
    }
    )

    //@ts-ignore
    let messages: MessageType[] = result?.[0]?.messages;
    return messages;
}


export async function xAck(streamId: string, consumerGroup: string) {
    await client.xAck(STREAM_NAME, consumerGroup, streamId);

}


// export async function xAckBulk(streamIds: string[], consumerGroup: string) {
//     streamIds.map(streamId => xAck(streamId, consumerGroup));
// }

export async function xAckBulk(consumerGroup: string, streamIds: string[]) {
    await Promise.all(streamIds.map(streamId => xAck(streamId, consumerGroup)));
}






