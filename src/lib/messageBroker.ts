import amqplib from 'amqplib';

let connection: any = null;
let channel: any = null;
let isConnected = false;
let isConnecting = false;

// Configurable constants for the connectQueue Exponential Backoff
const INITIAL_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30000;
let registeredQueues: string[] = [];

export function isBrokerOnline(): boolean {
    return isConnected && channel !== null;
}

/**
 * Core entry point for initialising the message broker framework
 * This is called async during startup and won't block the web server boot
 */
export async function connectQueue(targetQueues: string[]) {
    // Cache the queue structural names so the auto-reconnector can use them if the link breaks later
    if (targetQueues.length > 0) {
        registeredQueues = targetQueues;
    }

    if (isConnecting || isConnected) return;
    isConnecting = true;

    void attemptConnection(INITIAL_RETRY_DELAY_MS);
}

/**
 * Asynchronous recursive loop handling the connection handshake and exponential fallback metrics
 */
async function attemptConnection(currentDelayMs: number) {
    try {
        const amqpUrl = process.env.CLOUDAMQP_URL;
        if (!amqpUrl) {
            console.error("Message Broker Config Error: CLOUDAMQP_URL is not set in .env file");
            isConnecting = false;
            return;
        }

        console.log('Attempting background connection handshake to Message Broker...');

        connection = await amqplib.connect(amqpUrl);
        channel = await connection.createChannel();

        // assert all required channels concurrently
        await Promise.all(
            registeredQueues.map(async (queueName) => {
                // use durable queue so tasks survive broker restarts
                await channel.assertQueue(queueName, { durable: true });
                console.log(`Queue confirmed active: '${queueName}'`);
            })
        );

        isConnected = true;
        isConnecting = false;
        console.log('Successfully initialised all Message Broker connections');

        // Wire up event lifecycle monitors to catch sudden drops in production
        connection.on('error', (err: any) => {
            console.error('Message Broker socket error caught:', err?.message || err);
            handleConnectionFailure();
        });

        connection.on('close', () => {
            console.warn('Message Broker network connection severed.');
            handleConnectionFailure();
        });

    } catch (error: any) {
        console.error(`Connection failed. Broker is offline. Retrying in ${currentDelayMs / 1000}s... Reason:`, error?.message || error);

        isConnected = false;
        channel = null;
        connection = null;

        // Calculate the next step in our exponential curve, capping at the maximum delay limit
        const nextDelayMs = Math.min(currentDelayMs * 2, MAX_RETRY_DELAY_MS);

        setTimeout(() => {
            attemptConnection(nextDelayMs);
        }, currentDelayMs);
    }
}

/**
 * Switches the subsystem state metrics to offline and triggers the recovery loops.
 */
function handleConnectionFailure() {
    if (isConnecting) return;

    isConnected = false;
    channel = null;
    connection = null;

    console.log('Triggering self-healing reconnector sequences...');
    isConnecting = true;
    void attemptConnection(INITIAL_RETRY_DELAY_MS);
}

export function publishToQueue(queue: string, payload: object): boolean {
    if (!isBrokerOnline()) {
        throw new Error('Cannot publish message transaction: AMQP connection not initialised.');
    }

    const messageBuffer = Buffer.from(JSON.stringify(payload));
    return channel.sendToQueue(queue, messageBuffer, { persistent: true });
}
