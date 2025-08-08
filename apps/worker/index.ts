import axios from "axios";
import { xAckBulk, xReadGroup } from "redstream/client";
import { prismaClient } from "db/client";

const REGION_ID = process.env.REGION_ID!;
const WORKER_ID = process.env.WORKER_ID!;

// Validate environment variables early
if (!REGION_ID) throw new Error("Region not provided");
if (!WORKER_ID) throw new Error("Worker ID not provided");

/**
 * Main worker loop
 * - Continuously reads jobs from a Redis Stream group
 * - Processes each job in parallel
 * - Acknowledges completed jobs back to Redis
 */
async function main() {
    while (1) {
        // 1. Read available jobs from Redis stream for this region/worker
        const response = await xReadGroup(REGION_ID, WORKER_ID);

        // 2. If no jobs found, wait a bit before polling again
        if (!response || response.length === 0) {
            await new Promise(r => setTimeout(r, 200)); // avoid hammering Redis
            continue;
        }

        // 3. Process all jobs in parallel
        await Promise.all(
            response.map(({ message }: any) => fetchWebsite(message.url, message.id))
        );

        // 4. Log number of jobs processed in this iteration
        console.log(`Processed ${response.length} jobs`);

        // 5. Acknowledge all processed job IDs back to Redis so they won't be reprocessed
        xAckBulk(REGION_ID, response.map(({ id }) => id ));
    }
}

/**
 * Fetches a website and stores the result in the DB.
 *
 * @param url        Website URL to check
 * @param websiteId  Database ID of the website
 */
async function fetchWebsite(url: string, websiteId: string) {
    const startTime = Date.now(); // Record start time for response measurement

    try {
        // Attempt to fetch the website
        await axios.get(url);

        // If successful, store "Up" status
        const endTime = Date.now();
        await prismaClient.website_tick.create({
            data: {
                response_time_ms: endTime - startTime,
                status: "Up",
                region_id: REGION_ID,
                website_id: websiteId
            }
        });
    } catch {
        // If request fails, store "Down" status
        const endTime = Date.now();
        await prismaClient.website_tick.create({
            data: {
                response_time_ms: endTime - startTime,
                status: "Down",
                region_id: REGION_ID,
                website_id: websiteId
            }
        });
    }
}

// Start the worker loop
main();
